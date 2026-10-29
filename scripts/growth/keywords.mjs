import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config, markets, keywordPlan } from './config.mjs';
import { makeKeywordCache, assessKeywordCache, parseKeywordCsv, keywordKey, mergeKeywordRows } from './keyword-library.mjs';
import { savePrivate, readPrivate, privateDirectory, safeError } from './storage.mjs';
import { callGum } from './gum.mjs';

export function loadKeywordCache(locale, now = new Date(), directory = privateDirectory()) {
  try {
    keywordPlan(locale);
    const cache = assessKeywordCache(readPrivate(`keyword-cache-${locale}.json`, directory), now);
    if (cache.targeting && cache.targeting.language !== locale) return { status: 'invalid', note: 'Keyword cache language does not match its requested locale' };
    return cache;
  }
  catch (error) { return { status: 'invalid', note: safeError(error) }; }
}
function keywordSettings(directory) {
  const settings = readPrivate('keyword-settings.json', directory) || {};
  return {
    customerId: process.env.DAMAS_ADS_CUSTOMER_ID || settings.customerId,
    loginCustomerId: process.env.DAMAS_ADS_LOGIN_CUSTOMER_ID || settings.loginCustomerId,
    accessStatus: process.env.DAMAS_ADS_ACCESS_STATUS || settings.accessStatus,
  };
}
export async function collectKeywords(locale, { refresh = false, now = new Date(), directory = privateDirectory(), call = callGum, settings = keywordSettings(directory), csv = null } = {}) {
  const plan = keywordPlan(locale), previous = loadKeywordCache(locale, now, directory);
  const finish = (status, extra = {}) => {
    const result = { checkedAt: now.toISOString(), locale, status, ...extra };
    savePrivate(`keyword-status-${locale}.json`, result, directory);
    return result;
  };
  try {
    if (!csv && previous.status === 'ready' && !refresh && (previous.source.kind === 'keyword-planner-csv' || previous.seedFingerprint === plan.seedFingerprint)) return finish('ready', { reusedCache: true, source: previous.source.kind, keywords: previous.keywords.length, observedAt: previous.observedAt, demandSummary: previous.demandSummary });
    let results, source;
    if (csv) {
      if (csv.geography !== 'WORLDWIDE' || csv.network !== 'GOOGLE_SEARCH' || csv.language !== locale || !csv.exportedAt) throw new Error('CSV import requires explicit worldwide, matching language, Google Search and original export date');
      results = parseKeywordCsv(csv.bytes);
      source = { kind: 'keyword-planner-csv', exportedAt: csv.exportedAt, targetingEvidence: 'Operator explicitly asserted worldwide, matching language and Google Search. CSV headers cannot prove targeting.' };
    } else {
      if (!settings.customerId) return finish('setup-required', { cacheStatus: previous.status, note: 'Configure a separate Damas Ads OAuth profile and approved account, or import a targeted CSV. No API access is assumed.' });
      if (settings.accessStatus !== 'ready' && !refresh) return finish('pending-approval', { cacheStatus: previous.status, note: 'Google Ads Basic access and Damas authorization need verification. CSV import remains available.' });
      if (!/^\d{10}$/.test(settings.customerId) || settings.loginCustomerId && !/^\d{10}$/.test(settings.loginCustomerId)) throw new Error('Ads account identifiers must contain ten digits');
      const target = { customerId: settings.customerId, ...(settings.loginCustomerId ? { loginCustomerId: settings.loginCustomerId } : {}), geoTargetConstants: [], language: plan.targeting.languageConstant, keywordPlanNetwork: 'GOOGLE_SEARCH' };
      const byText = new Map();
      const merge = (row) => {
        const key = keywordKey(row.text), old = byText.get(key);
        byText.set(key, mergeKeywordRows(old, row));
      };
      for (let offset = 0; offset < plan.seeds.length; offset += 20) {
        const keywords = plan.seeds.slice(offset, offset + 20), seen = new Set();
        let pageToken;
        do {
          const response = await call('googleads.keywordPlanIdeas.generateKeywordIdeas', { ...target, keywords, url: plan.seedUrl, pageSize: 10000, ...(pageToken ? { pageToken } : {}) });
          for (const row of response.results || []) merge(row);
          pageToken = response.nextPageToken;
          if (pageToken && (seen.has(pageToken) || seen.size >= 100)) throw new Error('Keyword pagination incomplete; prior cache retained');
          if (pageToken) seen.add(pageToken);
        } while (pageToken);
        const historical = await call('googleads.keywordPlanIdeas.generateKeywordHistoricalMetrics', { ...target, keywords });
        for (const row of historical.results || []) merge(row);
      }
      results = [...byText.values()];
      source = { kind: 'google-ads-api', operations: plan.operations, profile: config.profiles.keywords };
    }
    if (!results.length) throw new Error('No estimates returned; unavailable demand is not zero');
    const cache = makeKeywordCache({ results, source, targeting: plan.targeting, generatedAt: now.toISOString(), seeds: plan.seeds });
    if (assessKeywordCache(cache, now).status !== 'ready') throw new Error('Imported demand must be less than 30 days old');
    savePrivate(`keyword-cache-${locale}.json`, cache, directory);
    return finish('ready', { keywords: cache.keywords.length, observedAt: cache.observedAt, source: source.kind, targeting: plan.targeting, demandSummary: cache.demandSummary });
  } catch (error) {
    return finish('action-required', { note: safeError(error), previousCacheRetained: true, cacheStatus: previous.status });
  }
}
function parseOptions(args) {
  const flags = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (['--refresh', '--plan'].includes(key)) flags[key] = true;
    else if (['--language', '--import-csv', '--geography', '--network', '--exported-at'].includes(key)) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Missing option value: ' + key);
      flags[key] = args[++index];
    } else throw new Error('Unknown option: ' + key);
  }
  return flags;
}
export async function main(args = process.argv.slice(2)) {
  const flags = parseOptions(args), locales = flags['--language'] ? [flags['--language']] : markets.map((market) => market.locale);
  if (flags['--plan']) { console.log(JSON.stringify(locales.map(keywordPlan), null, 2)); return; }
  if (flags['--import-csv'] && locales.length !== 1) throw new Error('CSV import requires exactly one --language');
  const csv = flags['--import-csv'] ? { bytes: readFileSync(resolve(flags['--import-csv'])), language: flags['--language'], geography: flags['--geography'], network: flags['--network'], exportedAt: flags['--exported-at'] } : null;
  const results = [];
  for (const locale of locales) results.push(await collectKeywords(locale, { refresh: !!flags['--refresh'], csv }));
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => result.status === 'action-required')) process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(safeError(error)); process.exitCode = 2; });
