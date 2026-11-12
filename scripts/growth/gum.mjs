import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config, root } from './config.mjs';

const allowed = new Map([
  ['searchconsole.searchanalytics.query', config.profiles.searchConsole],
  ['searchconsole.urlInspection.index.inspect', config.profiles.searchConsole],
  ['googleads.keywordPlanIdeas.generateKeywordIdeas', config.profiles.keywords],
  ['googleads.keywordPlanIdeas.generateKeywordHistoricalMetrics', config.profiles.keywords],
]);
export function validateGumOperation(operation, args) {
  if (!allowed.has(operation)) throw new Error('Operation outside the Damas read-only research allowlist');
  if (operation.startsWith('searchconsole.')) {
    const site = args.siteUrl || args.body?.siteUrl;
    if (site !== config.siteUrl) throw new Error('Search Console property is outside the Damas allowlist');
    const inspectionUrl = args.body?.inspectionUrl || args.inspectionUrl;
    if (operation === 'searchconsole.urlInspection.index.inspect' && (!inspectionUrl || new URL(inspectionUrl).origin !== new URL(config.siteUrl).origin)) throw new Error('URL inspection must stay on the Damas origin');
  } else {
    if (args.keywordPlanNetwork !== 'GOOGLE_SEARCH' || JSON.stringify(args.geoTargetConstants) !== '[]') throw new Error('Keyword research requires explicit worldwide Google Search targeting');
    if (!config.markets.some((market) => args.language === `languageConstants/${market.languageId}`)) throw new Error('Unsupported keyword language');
  }
  return allowed.get(operation);
}
const searchConsoleReads = new Set(['searchconsole.searchanalytics.query', 'searchconsole.urlInspection.index.inspect']);
const parseEnvelope = value => { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : null; } catch { return null; } };
function failureCodes(envelopes) {
  return envelopes.flatMap(value => [value?.error_code, value?.machine_envelope?.error_code, value?.error?.error_code, value?.error?.status, value?.error?.code]).filter(value => value !== undefined && value !== null && value !== '');
}
const authFailure = (codes, message) => codes.some(code => [401, 403, 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'UNAUTHORIZED', 'FORBIDDEN', 'INVALID_GRANT', 'AUTHENTICATION_FAILED', 'AUTH_REQUIRED', 'ACCESS_DENIED'].includes(code)) || /invalid[_ -]grant|\b(?:401|403)\b|unauthenticated|permission denied|access denied/i.test(message);
const explicitCancellation = message => /\b(?:user|caller|operator)[ -]?(?:abort|cancel)|\b(?:aborted|cancelled|canceled)\b[^\n]{0,25}\b(?:user|caller|operator)\b/i.test(message);

// Injectable execution keeps retry tests offline. The production reader retains
// the same profiles, operation allowlist, three-call cap and Ads pacing.
export function createGumReader({ execute = spawnSync, wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)), clock = Date.now } = {}) {
  let lastAdsRequest = 0;
  return async function read(operation, args, { signal } = {}) {
    const profile = validateGumOperation(operation, args);
    const binary = process.env.GUM_BINARY || resolve(root, '.tools/gum-keywords');
    const checkAbort = () => { if (signal?.aborted) throw signal.reason || new Error('Google research read cancelled by caller'); };
    for (let attempt = 0; attempt < 3; attempt++) {
      checkAbort();
      if (operation.startsWith('googleads.')) {
        const delay = Math.max(0, 1100 - (clock() - lastAdsRequest));
        if (delay) await wait(delay);
        checkAbort(); lastAdsRequest = clock();
      }
      let terminal = false, cancelledRead = false;
      try {
        let response;
        try { response = execute(binary, ['--profile', profile, 'read', operation, '--args', JSON.stringify(args), '--format', 'raw', '--max-items', 'all'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 90000 }); }
        catch (error) { terminal = true; throw error; }
        checkAbort();
        if (response.error || response.signal || [130, 137, 143].includes(response.status)) {
          terminal = true;
          throw new Error(response.error?.message || response.stderr?.trim() || 'Gum research process was interrupted');
        }
        const parsed = parseEnvelope(response.stdout), data = parsed?.data || parsed;
        const envelopes = [parseEnvelope(response.stderr), parsed, data].filter(Boolean);
        const codes = failureCodes(envelopes);
        const failure = response.status !== 0 || data?.error || parsed?.error || codes.length > 0;
        if (failure) {
          const message = response.status !== 0 ? response.stderr?.trim() || 'Gum research request failed' : data?.error?.message || parsed?.error?.message || data?.message || 'Google rejected the research request';
          terminal = authFailure(codes, message) || explicitCancellation(message);
          // Only structured provider cancellation on an allowlisted read is
          // transient. A process timeout, signal or caller abort never is.
          cancelledRead = searchConsoleReads.has(operation) && codes.length > 0 && codes.every(code => code === 'CANCELLED');
          throw new Error(message);
        }
        if (!parsed) { terminal = true; throw new Error('Gum research returned invalid JSON'); }
        return data;
      } catch (error) {
        checkAbort();
        if (terminal || attempt === 2 || !cancelledRead && !/RESOURCE_EXHAUSTED|\b429\b|UNAVAILABLE|\b50[0234]\b|temporarily unavailable/i.test(error.message)) throw error;
        await wait(2000 * (attempt + 1));
      }
    }
  };
}
export const callGum = createGumReader();
