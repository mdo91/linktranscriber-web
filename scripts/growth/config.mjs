import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const config = JSON.parse(readFileSync(resolve(root, 'growth.config.json'), 'utf8'));
if (config.siteUrl !== 'https://linktranscriber.com/' || config.profiles.searchConsole !== 'damas-searchconsole' || config.profiles.keywords !== 'damas-keywords') throw new Error('Unexpected Damas property/profile configuration');
export const markets = Object.freeze(config.markets);
export function marketFor(locale) {
  const market = markets.find((entry) => entry.locale === locale);
  if (!market) throw new Error('Unsupported locale: ' + locale);
  return market;
}
export function keywordTargetingFor(locale) {
  const market = marketFor(locale);
  return {
    geography: 'WORLDWIDE', language: locale, googleLanguageCode: market.googleLanguageCode,
    network: 'GOOGLE_SEARCH', geoTargetConstants: [], languageConstant: `languageConstants/${market.languageId}`,
  };
}
export function keywordPlan(locale) {
  const market = marketFor(locale);
  return { locale, seedFingerprint: createHash('sha256').update(JSON.stringify({locale, seeds: market.seeds})).digest('hex'), operations: ['generateKeywordIdeas', 'generateKeywordHistoricalMetrics'], targeting: keywordTargetingFor(locale), seeds: market.seeds, seedUrl: new URL(`${market.locale === 'en' ? '' : market.locale + '/'}guides/`, config.siteUrl).href, profile: config.profiles.keywords, cacheDays: config.keywordCacheDays };
}
