import copy from './content/locales.json';
import { createHash } from 'node:crypto';
export const siteName = 'Damas — Link Transcriber';
export const origin = 'https://linktranscriber.com';
export const appUrl = 'https://apps.apple.com/us/app/damas-video-link-transcriber/id6766233794';
export const locales = ['en', 'fr', 'de', 'ja', 'ko', 'ms', 'pt', 'ru', 'zh-hans', 'es', 'tr'] as const;
export type Locale = typeof locales[number];
export const texts = copy as Record<Locale, any>;
const requestedBase = process.env.BASE_PATH || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(requestedBase)) throw new Error('BASE_PATH must be a root-relative directory with a trailing slash');
export const base = requestedBase.replace(/\/$/, '');
export const localPath = (locale: Locale, path = '/') => `${locale === 'en' ? '' : `/${locale}`}${path}`;
export const sitePath = (path: string) => base && (path === base || path.startsWith(base + '/')) ? path : `${base}${path}`;
export const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function campaign(locale: Locale, placement: string, slug = '') {
  const provider = process.env.APP_STORE_PROVIDER_TOKEN || '';
  if (!provider) return appUrl;
  if (!/^\d+$/.test(provider)) throw new Error('Invalid App Store provider token');
  const url = new URL(appUrl);
  const suffix = slug ? `_${createHash('sha256').update(slug).digest('hex').slice(0, 8)}` : '';
  url.searchParams.set('pt', provider);
  url.searchParams.set('ct', `damas_${locale}_${placement}${suffix}`.slice(0, 40));
  url.searchParams.set('mt', '8');
  return url.href;
}
export function date(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(texts[locale].htmlLang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}
