import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { markets, keywordTargetingFor, keywordPlan, root } from '../scripts/growth/config.mjs';
import { makeKeywordCache, assessKeywordCache, normalizeKeywordResults, parseKeywordCsv, matchKeywordDemand } from '../scripts/growth/keyword-library.mjs';
import { collectKeywords, loadKeywordCache } from '../scripts/growth/keywords.mjs';
import { reportingWindows, localePageFilter, matchesLocalePage } from '../scripts/growth/library.mjs';
import { collectPeriod, collectGrowth } from '../scripts/growth/collect.mjs';
import { savePrivate, readPrivate, pruneReports, safeError } from '../scripts/growth/storage.mjs';
import { validateGumOperation } from '../scripts/growth/gum.mjs';

const now = new Date('2026-10-20T06:00:00.000Z');
const temp = (t) => { const directory = mkdtempSync(resolve(tmpdir(), 'damas-growth-test-')); t.after(() => rmSync(directory, { recursive: true, force: true })); return directory; };
const row = (text = 'video link to text', volume = '1300') => ({ text, closeVariants: ['video links to text'], keywordIdeaMetrics: { avgMonthlySearches: volume, competition: 'LOW', competitionIndex: '8', monthlySearchVolumes: [{ year: '2026', month: 'SEPTEMBER', monthlySearches: '1000' }] } });
const cache = (locale = 'en', generatedAt = now.toISOString()) => makeKeywordCache({ results: [row()], source: { kind: 'google-ads-api' }, generatedAt, targeting: keywordTargetingFor(locale) });
const metric = { clicks: 2, impressions: 100, ctr: .02, position: 8 };

test('all eleven language targets use verified constants and explicit worldwide Google Search', () => {
  const expected = { en: '1000', fr: '1002', de: '1001', ja: '1005', ko: '1012', ms: '1102', pt: '1014', ru: '1031', 'zh-hans': '1017', es: '1003', tr: '1037' };
  assert.equal(markets.length, 11);
  for (const [locale, id] of Object.entries(expected)) {
    const target = keywordTargetingFor(locale);
    assert.equal(target.languageConstant, `languageConstants/${id}`);
    assert.equal(target.geography, 'WORLDWIDE'); assert.equal(target.network, 'GOOGLE_SEARCH'); assert.deepEqual(target.geoTargetConstants, []);
    assert.ok(keywordPlan(locale).seeds.length >= 4);
  }
  assert.equal(keywordTargetingFor('zh-hans').googleLanguageCode, 'zh_CN');
  assert.throws(() => keywordTargetingFor('ar'), /Unsupported locale/);
});

test('keyword --plan has no private writes or API prerequisites', (t) => {
  const directory = temp(t);
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/growth/keywords.mjs'), '--plan'], { encoding: 'utf8', env: { ...process.env, DAMAS_GROWTH_DIR: directory, GUM_BINARY: '/nonexistent-gum' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).length, 11);
  assert.deepEqual(readdirSync(directory), []);
});

test('complete 28-day periods use Pacific dates through DST and reject invalid dates', () => {
  const periods = reportingWindows(now);
  assert.deepEqual(periods, { current: { startDate: '2026-09-19', endDate: '2026-10-16' }, previous: { startDate: '2026-08-22', endDate: '2026-09-18' } });
  for (const instant of ['2026-03-09T06:00:00Z', '2026-11-02T06:00:00Z']) {
    const windows = reportingWindows(new Date(instant));
    assert.equal((Date.parse(windows.current.endDate) - Date.parse(windows.current.startDate)) / 86400000 + 1, 28);
    assert.equal(Date.parse(windows.current.startDate) - Date.parse(windows.previous.endDate), 86400000);
  }
  assert.throws(() => reportingWindows(new Date('invalid')), /Invalid reporting date/);
});

test('locale page filters isolate every language from English and each other', () => {
  for (const market of markets) {
    const url = `https://linktranscriber.com/${market.locale === 'en' ? '' : market.locale + '/'}guides/`;
    for (const check of markets) assert.equal(matchesLocalePage(url, check.locale), check.locale === market.locale);
    const filter = localePageFilter(market.locale), regex = new RegExp(filter.expression);
    assert.equal(regex.test(url), market.locale !== 'en');
    assert.equal(filter.operator, market.locale === 'en' ? 'excludingRegex' : 'includingRegex');
  }
  assert.equal(matchesLocalePage('https://attacker.example/guides/', 'en'), false);
  assert.equal(matchesLocalePage('malformed', 'en'), false);
});

test('cache preserves estimates, missing values, variants, ranges and history without summing', () => {
  const values = normalizeKeywordResults([row(), row()]);
  assert.equal(values.length, 1); assert.equal(values[0].averageMonthlySearches, 1300); assert.deepEqual(values[0].closeVariants, ['video links to text']);
  assert.equal(values[0].monthlySearchVolumes[0].monthlySearches, 1000); assert.equal(values[0].advertiserCompetition, 'LOW');
  const missing = normalizeKeywordResults([{ text: 'rare phrase', keywordIdeaMetrics: {} }])[0];
  assert.equal(missing.averageMonthlySearches, null); assert.equal(missing.advertiserCompetitionIndex, null);
  const csv = parseKeywordCsv(Buffer.from('Keyword,Avg. monthly searches,Competition\n"video, text",1K – 10K,Low\nrare phrase,--,--\n'));
  assert.deepEqual(csv[0].searchVolumeRange, { min: 1000, max: 10000 });
  assert.equal(csv[0].keywordIdeaMetrics.avgMonthlySearches, null); assert.equal(csv[1].keywordIdeaMetrics.avgMonthlySearches, null);
  const ready = assessKeywordCache(cache(), now);
  assert.equal(matchKeywordDemand('video links to text', ready).averageMonthlySearches, 1300);
  assert.equal(matchKeywordDemand('unavailable phrase', ready), null);
  assert.throws(() => normalizeKeywordResults([row('same', 5), row('same', 6)]), /Conflicting/);
});

test('cache rejects malformed, future dates and wrong targeting; stale demand stays unavailable', () => {
  for (const observedAt of ['2026-02-30', 'not-a-date', '2026-10-21T00:00:00Z']) assert.equal(assessKeywordCache({ ...cache(), observedAt }, now).status, 'invalid');
  assert.equal(assessKeywordCache({ ...cache(), generatedAt: '2026-10-21T00:00:00Z' }, now).status, 'invalid');
  assert.equal(assessKeywordCache({ ...cache(), targeting: { ...keywordTargetingFor('en'), geoTargetConstants: ['geoTargetConstants/2840'] } }, now).status, 'invalid');
  const stale = assessKeywordCache(cache('en', '2026-09-20T06:00:00.000Z'), now);
  assert.equal(stale.status, 'stale'); assert.equal(matchKeywordDemand('video link to text', stale), null);
  const scrubbed = assessKeywordCache({ ...cache(), source: { kind: 'google-ads-api', customerId: '1234567890', oauthSecret: 'private' } }, now);
  assert.deepEqual(scrubbed.source, { kind: 'google-ads-api' });
});

test('fresh caches avoid API calls; failed refresh retains prior locale cache', async (t) => {
  const directory = temp(t);
  savePrivate('keyword-cache-en.json', cache(), directory);
  let calls = 0;
  const call = () => { calls++; throw new Error('Token expired for private@example.com account 1234567890'); };
  const reused = await collectKeywords('en', { now, directory, call, settings: {} });
  assert.equal(reused.reusedCache, true); assert.equal(calls, 0);
  const before = readFileSync(resolve(directory, 'keyword-cache-en.json'), 'utf8');
  const failure = await collectKeywords('en', { now, directory, call, refresh: true, settings: { customerId: '1234567890', accessStatus: 'ready' } });
  assert.equal(failure.status, 'action-required'); assert.equal(failure.previousCacheRetained, true); assert.equal(calls, 1);
  assert.equal(readFileSync(resolve(directory, 'keyword-cache-en.json'), 'utf8'), before);
  assert.doesNotMatch(JSON.stringify(failure), /private@example|1234567890/);
});

test('expanded seeds refresh a legacy API cache once, then reuse the new fingerprint', async (t) => {
  const directory = temp(t), legacy = cache('ms');
  delete legacy.seedFingerprint;
  savePrivate('keyword-cache-ms.json', legacy, directory);
  let calls = 0;
  const call = (operation) => {
    calls++;
    return { results: operation.endsWith('generateKeywordHistoricalMetrics')
      ? [{ text: 'ringkasan video', keywordMetrics: { avgMonthlySearches: '170' } }]
      : [row('transkripsi video iphone')] };
  };
  const options = { now, directory, call, settings: { customerId: '1234567890', accessStatus: 'ready' } };
  assert.equal((await collectKeywords('ms', options)).reusedCache, undefined);
  assert.equal(calls, 2);
  assert.equal(loadKeywordCache('ms', now, directory).seedFingerprint, keywordPlan('ms').seedFingerprint);
  assert.equal((await collectKeywords('ms', options)).reusedCache, true);
  assert.equal(calls, 2);
  const csv = makeKeywordCache({ results: [row()], source: { kind: 'keyword-planner-csv', exportedAt: now.toISOString() }, targeting: keywordTargetingFor('ms'), generatedAt: now.toISOString() });
  savePrivate('keyword-cache-ms.json', csv, directory);
  assert.equal((await collectKeywords('ms', options)).reusedCache, true);
  assert.equal(calls, 2);
});

test('real-request fixture paginates and sends exact target to ideas and historical only', async (t) => {
  const directory = temp(t), calls = [];
  const call = (operation, args) => {
    calls.push({ operation, args });
    assert.deepEqual(args.geoTargetConstants, []); assert.equal(args.language, 'languageConstants/1102'); assert.equal(args.keywordPlanNetwork, 'GOOGLE_SEARCH');
    if (operation.endsWith('generateKeywordHistoricalMetrics')) return { results: [{ text: 'transkripsi video', keywordMetrics: { avgMonthlySearches: '50' } }] };
    return args.pageToken ? { results: [row('second page')] } : { results: [row('first page')], nextPageToken: 'next' };
  };
  const result = await collectKeywords('ms', { now, directory, call, settings: { customerId: '1234567890', accessStatus: 'ready' } });
  assert.equal(result.status, 'ready'); assert.equal(calls.length, 3); assert.equal(loadKeywordCache('ms', now, directory).keywords.length, 3);
  assert.equal(statSync(resolve(directory, 'keyword-cache-ms.json')).mode & 0o777, 0o600);
  assert.doesNotMatch(readFileSync(resolve(directory, 'keyword-cache-ms.json'), 'utf8'), /1234567890/);
});

test('empty demand or repeated pagination token never replaces a cache', async (t) => {
  const directory = temp(t);
  for (const call of [() => ({ results: [] }), () => ({ results: [row()], nextPageToken: 'same' })]) {
    const result = await collectKeywords('tr', { now, directory, call, settings: { customerId: '1234567890', accessStatus: 'ready' } });
    assert.equal(result.status, 'action-required'); assert.equal(readPrivate('keyword-cache-tr.json', directory), null);
  }
});

test('CSV original observation age and explicit targeting are enforced', async (t) => {
  const directory = temp(t), csv = { bytes: Buffer.from('Keyword,Avg. monthly searches\nvideo to text,50\n'), language: 'de', geography: 'WORLDWIDE', network: 'GOOGLE_SEARCH', exportedAt: '2026-10-01' };
  assert.equal((await collectKeywords('de', { now, directory, csv })).status, 'ready');
  const before = readFileSync(resolve(directory, 'keyword-cache-de.json'), 'utf8');
  for (const invalid of [{ ...csv, exportedAt: '2026-08-01' }, { ...csv, geography: 'US' }, { ...csv, language: 'en' }, { ...csv, exportedAt: '2026-02-30' }]) assert.equal((await collectKeywords('de', { now, directory, csv: invalid })).status, 'action-required');
  assert.equal(readFileSync(resolve(directory, 'keyword-cache-de.json'), 'utf8'), before);
});

test('Search Console collection paginates final data and requests totals separately worldwide', async () => {
  const calls = [], call = (operation, args) => {
    calls.push(args);
    assert.equal(operation, 'searchconsole.searchanalytics.query'); assert.equal(args.body.dataState, 'final');
    assert.ok(!args.body.dimensionFilterGroups[0].filters.some((filter) => filter.dimension === 'country'));
    if (!args.body.dimensions.length) return { rows: [metric] };
    return args.body.startRow ? { rows: [] } : { rows: [{ ...metric, keys: ['動画 文字起こし', 'https://linktranscriber.com/ja/guides/', 'MOBILE', 'jpn'] }] };
  };
  const result = await collectPeriod('ja', reportingWindows(now).current, call, { pageSize: 1, maxRows: 10 });
  assert.equal(calls.length, 3); assert.equal(result.rows[0].country, 'jpn'); assert.equal(result.totals.impressions, 100);
  await assert.rejects(() => collectPeriod('ja', reportingWindows(now).current, () => ({ rows: [metric] }), { pageSize: 1, maxRows: 1 }), /pagination limit/);
});

test('keyword errors and locale errors do not hide other data; no-data totals are null', async (t) => {
  const directory = temp(t);
  const report = await collectGrowth({ now, directory, refreshKeywords: () => { throw new Error('Ads needs consent'); }, call: (operation, args) => {
    const filter = args.body.dimensionFilterGroups[0].filters[0].expression;
    if (filter.endsWith('fr/')) throw new Error('French fixture error');
    if (filter.endsWith('ja/')) return {};
    return args.body.dimensions.length ? { rows: [{ ...metric, keys: ['video to text', 'https://linktranscriber.com/guides/', 'MOBILE', 'usa'] }] } : { rows: [metric] };
  } });
  assert.equal(report.status, 'partial'); assert.equal(report.markets.en.status, 'ready'); assert.equal(report.markets.fr.status, 'action-required');
  assert.equal(report.markets.ja.status, 'no-data-yet'); assert.equal(report.markets.ja.current.totals, null); assert.equal(report.markets.ja.comparison.status, 'unavailable');
  assert.equal(report.markets.en.keywordRefresh.status, 'action-required'); assert.equal(report.requiresAction, true);
  assert.equal(Object.keys(report.markets).length, 11); assert.equal(statSync(resolve(directory, 'latest.json')).mode & 0o777, 0o600);
});

test('private report retention keeps fresh reports, caches and ledger untouched', (t) => {
  const directory = temp(t);
  for (const name of ['report-2026-01-01.json', 'report-2026-10-20.json', 'keyword-cache-en.json', 'history.json']) savePrivate(name, {}, directory);
  pruneReports(now, directory);
  assert.deepEqual(readdirSync(directory).sort(), ['history.json', 'keyword-cache-en.json', 'report-2026-10-20.json']);
  assert.equal(statSync(directory).mode & 0o777, 0o700);
  assert.throws(() => savePrivate('../unsafe.json', {}, directory), /Invalid/);
  assert.doesNotMatch(safeError(new Error('Bearer abc GOCSPX-secret private@example.com 1234567890')), /abc|GOCSPX|private@example|1234567890/);
});

test('Gum operation/property allowlists protect unrelated accounts and sites', () => {
  assert.equal(validateGumOperation('searchconsole.searchanalytics.query', { siteUrl: 'https://linktranscriber.com/' }), 'damas-searchconsole');
  assert.throws(() => validateGumOperation('searchconsole.searchanalytics.query', { siteUrl: 'https://scansignature.app/' }), /outside/);
  assert.throws(() => validateGumOperation('googleads.campaigns.mutate', {}), /outside/);
  assert.throws(() => validateGumOperation('googleads.keywordPlanIdeas.generateKeywordIdeas', { geoTargetConstants: ['geoTargetConstants/2840'], keywordPlanNetwork: 'GOOGLE_SEARCH', language: 'languageConstants/1000' }), /worldwide/);
  assert.throws(() => validateGumOperation('searchconsole.urlInspection.index.inspect', { body: { siteUrl: 'https://linktranscriber.com/', inspectionUrl: 'https://attacker.example/' } }), /Damas origin/);
});
