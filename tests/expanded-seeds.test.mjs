import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { markets, keywordPlan } from '../scripts/growth/config.mjs';
import { keywordKey } from '../scripts/growth/keyword-library.mjs';
import { collectKeywords, loadKeywordCache } from '../scripts/growth/keywords.mjs';

const platforms = {
  YouTube: /youtube|유튜브/iu,
  Instagram: /instagram|インスタ|인스타/iu,
  X: /\b(?:x|twitter)\b|트위터|推特/iu,
};
const capabilities = {
  en: [/transcri|speech to text/iu, /translat/iu, /summari|summary/iu],
  fr: [/transcri/iu, /tradui|traduc/iu, /résum/iu],
  de: [/transkrib|transkript/iu, /übersetz/iu, /zusammenfass/iu],
  ja: [/文字起こし/u, /翻訳/u, /要約/u],
  ko: [/받아쓰기|텍스트/u, /번역/u, /요약/u],
  ms: [/transkripsi|kepada teks/iu, /terjemah/iu, /ringkas/iu],
  pt: [/transcri|transcrev/iu, /traduz|tradutor/iu, /resum/iu],
  ru: [/транскрибац|расшифров/iu, /перевести|перевод/iu, /кратк|конспект/iu],
  'zh-hans': [/转文字|转写/u, /翻译/u, /总结/u],
  es: [/transcri/iu, /traduc/iu, /resum/iu],
  tr: [/metne çevir|yazıya çevir|döküm|transkripsiyon/iu, /çeviri|videosunu çevirme|konuşmayı çevirme/iu, /özet/iu],
};

test('each language researches all three supported tasks on each public platform within two seed batches', () => {
  assert.equal(markets.length, 11);
  for (const { locale, seeds } of markets) {
    assert.ok(seeds.length > 20 && seeds.length <= 40, `${locale}: two seed batches`);
    assert.equal(new Set(seeds.map(keywordKey)).size, seeds.length, `${locale}: distinct seeds`);
    for (const [platform, source] of Object.entries(platforms)) {
      for (const [index, capability] of capabilities[locale].entries()) {
        assert.ok(seeds.some((seed) => source.test(seed) && capability.test(seed)), `${locale}: ${platform} task ${index + 1}`);
      }
    }
    assert.ok(seeds.some((seed) => /70/u.test(seed)), `${locale}: verified translation-language count`);
    assert.ok(seeds.some((seed) => /90/u.test(seed)), `${locale}: supported lecture length`);
  }
});

test('all seven outstanding reader questions remain available for same-language research', () => {
  const questions = [
    ['en', 'summarize webinar questions and answers'],
    ['en', 'how to share checked video notes with source passages'],
    ['ms', 'susun tema dan percanggahan daripada temu bual video'],
    ['pt', 'organizar temas e contradições de uma entrevista em vídeo'],
    ['ru', 'сгруппировать темы и противоречия видеоинтервью'],
    ['zh-hans', '网络研讨会整理行动事项'],
    ['zh-hans', '总结网络研讨会问答并标记未回答的问题'],
  ];
  for (const [locale, question] of questions) assert.ok(keywordPlan(locale).seeds.includes(question), `${locale}: ${question}`);
});

test('expanded plans send every seed once per operation with matching worldwide targeting, then reuse the cache', async (t) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'damas-expanded-seeds-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const now = new Date('2026-10-29T05:00:00Z');
  for (const { locale } of markets) {
    const plan = keywordPlan(locale), calls = [];
    const call = (operation, args) => {
      calls.push({ operation, args });
      assert.deepEqual(args.geoTargetConstants, []);
      assert.equal(args.language, plan.targeting.languageConstant);
      assert.equal(args.keywordPlanNetwork, 'GOOGLE_SEARCH');
      assert.ok(args.keywords.length > 0 && args.keywords.length <= 20);
      assert.equal(args.pageToken, undefined);
      return { results: [{ text: args.keywords[0], keywordIdeaMetrics: { avgMonthlySearches: '10' } }] };
    };
    const options = { now, directory, call, settings: { customerId: '1234567890', accessStatus: 'ready' } };
    assert.equal((await collectKeywords(locale, options)).status, 'ready');
    assert.equal(calls.length, 4, `${locale}: two idea and two historical fixture requests`);
    for (const suffix of ['generateKeywordIdeas', 'generateKeywordHistoricalMetrics']) {
      const supplied = calls.filter(({ operation }) => operation.endsWith(suffix)).flatMap(({ args }) => args.keywords);
      assert.deepEqual(supplied, plan.seeds, `${locale}: complete ${suffix} seed coverage`);
    }
    assert.equal(loadKeywordCache(locale, now, directory).seedFingerprint, plan.seedFingerprint);
    assert.equal((await collectKeywords(locale, options)).reusedCache, true);
    assert.equal(calls.length, 4, `${locale}: unchanged fingerprint makes no further request`);
  }
});
