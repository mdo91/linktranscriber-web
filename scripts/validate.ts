import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'cheerio';
import { locales, origin, texts } from '../src/site';
import { loadPosts } from '../src/posts';
import product from '../src/content/product-facts.json';
import { validateGuideDiscovery } from './guide-discovery';

const root = resolve(process.argv[2] || 'dist');
if (!existsSync(root)) throw new Error('Build the website before validating its output.');
const publishedGuides = loadPosts();
const manifest = JSON.parse(readFileSync('.generated/manifest.json', 'utf8')) as { urls: { path: string; lastmod?: string; group: string }[]; posts: number };
const pages = new Map(manifest.urls.map(u => [u.path, u]));
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
const failures: string[] = [];
const titles = new Set<string>();
const descriptions = new Set<string>();
const check = (condition: unknown, message: string) => { if (!condition) failures.push(message); };
const fileFor = (path: string) => resolve(root, '.' + path + (path.endsWith('/') ? 'index.html' : ''));
const sitemap = load(readFileSync(resolve(root, 'sitemap.xml'), 'utf8'), { xml: true });
const sitemapUrls = new Map(sitemap('url').toArray().map(el => [sitemap(el).find('loc').text(), el]));
failures.push(...validateGuideDiscovery({
  publishedGuides, locales, origin, basePath: process.env.BASE_PATH || '/', manifestUrls: manifest.urls,
  sitemapXml: readFileSync(resolve(root, 'sitemap.xml'), 'utf8'),
  readPage: route => existsSync(fileFor(route)) ? readFileSync(fileFor(route), 'utf8') : undefined,
}));
check(sitemapUrls.size === pages.size, 'Sitemap page count differs from publication manifest');
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]);
check(walk(root).filter(f => f.endsWith('.html')).length === pages.size + 2, 'Unexpected or missing HTML artifacts');

for (const [path, entry] of pages) {
  check(existsSync(fileFor(path)), `${path}: missing HTML`);
  if (!existsSync(fileFor(path))) continue;
  const $ = load(readFileSync(fileFor(path), 'utf8'));
  const locale = locales.find(l => l !== 'en' && path.startsWith(`/${l}/`)) || 'en';
  const title = $('title').text().trim(), description = $('meta[name="description"]').attr('content') || '';
  check(title.length > 10 && !titles.has(title), `${path}: missing or duplicate title`); titles.add(title);
  check(description.length > 10 && !descriptions.has(description), `${path}: missing or duplicate description`); descriptions.add(description);
  check($('html').attr('lang') === texts[locale].htmlLang, `${path}: incorrect HTML language`);
  check($('h1').length === 1 && $('main').text().trim().length > 100, `${path}: missing rendered content or unique heading`);
  check($('link[rel="canonical"]').attr('href') === origin + path, `${path}: incorrect canonical`);
  check($('meta[property="og:url"]').attr('content') === origin + path, `${path}: incorrect social URL`);
  check(!!$('meta[property="og:image"]').attr('content') && !!$('meta[name="twitter:card"]').attr('content'), `${path}: missing social preview`);
  check($('meta[name="robots"]').attr('content') === 'index,follow', `${path}: page unexpectedly excluded`);
  check($('script:not([type="application/ld+json"])').length === 0, `${path}: important content requires no JavaScript`);
  const schema = $('script[type="application/ld+json"]').toArray().flatMap(el => JSON.parse($(el).text())['@graph']);
  check(schema.some(s => s['@type'] === 'Organization'), `${path}: missing organization schema`);
  if (entry.group.startsWith('post:')) check(schema.some(s => s['@type'] === 'BlogPosting' && s.dateModified === entry.lastmod && s.mainEntityOfPage === origin + path), `${path}: article schema/date mismatch`);
  if (entry.group === 'home') check(schema.some(s => s['@type'] === 'MobileApplication' && JSON.stringify(s.operatingSystem) === JSON.stringify(product.operatingSystems) && !s.aggregateRating && !s.offers), `${path}: inaccurate app schema`);
  const equivalents = manifest.urls.filter(u => u.group === entry.group);
  check($('link[rel="alternate"][hreflang]').length === equivalents.length + (equivalents.some(u => !/^\/(fr|de|ja|ko|ms|pt|ru|zh-hans|es|tr)\//.test(u.path)) ? 1 : 0), `${path}: alternate count mismatch`);
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const href = $(el).attr('href') || '', language = $(el).attr('hreflang');
    const otherPath = href.startsWith(origin) ? href.slice(origin.length) : '';
    check(pages.has(otherPath), `${path}: alternate points to unpublished page ${href}`);
    if (existsSync(fileFor(otherPath))) {
      const other = load(readFileSync(fileFor(otherPath), 'utf8'));
      check(other('link[rel="alternate"]').toArray().some(e => other(e).attr('href') === origin + path && other(e).attr('hreflang') === texts[locale].htmlLang), `${path}: alternate not reciprocal (${language})`);
    }
  });
  const xml = sitemapUrls.get(origin + path);
  check(!!xml, `${path}: missing sitemap entry`);
  if (xml) check(sitemap(xml).find('lastmod').text() === (entry.lastmod || ''), `${path}: incorrect sitemap date`);
  $('.languages a').each((_, el) => check(!!$(el).text() && !!$(el).attr('lang'), `${path}: invalid visible language link`));
  check($('.languages a').length === locales.length, `${path}: missing visible locale navigation`);
  $('a[href],img[src],video[src],video[poster],source[src],link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href') || $(el).attr('src') || $(el).attr('poster') || '';
    check(!/^(javascript|data):/i.test(href), `${path}: unsafe URL`);
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const url = new URL(href, origin + path);
    if (url.origin !== origin) return;
    let target = decodeURIComponent(url.pathname);
    if (base && target.startsWith(base + '/')) target = target.slice(base.length);
    check(existsSync(fileFor(target)), `${path}: broken local resource ${href}`);
    if (url.hash && existsSync(fileFor(target)) && (target.endsWith('/') || target.endsWith('.html'))) {
      const other = load(readFileSync(fileFor(target), 'utf8'));
      check(other('[id]').toArray().some(e => other(e).attr('id') === decodeURIComponent(url.hash.slice(1))), `${path}: broken fragment ${href}`);
    }
  });
  $('img').each((_, el) => check($(el).attr('alt') !== undefined && !!$(el).attr('width') && !!$(el).attr('height'), `${path}: image lacks alt text or dimensions`));
  $('a[data-download]').each((_, el) => check(new URL($(el).attr('href')!).hostname === 'apps.apple.com' && $(el).attr('href')!.includes('id6766233794'), `${path}: incorrect app download`));
  const isLegal = ['privacy-policy.html', 'terms-of-use.html', 'support.html'].includes(entry.group);
  check(!/Replace Delaware|submitted for review|release pending|100% accurate/i.test($('body').text()) && (isLegal || !/free trial/i.test($('body').text())), `${path}: outdated or unsupported copy`);
}
const notFound = load(readFileSync(fileFor('/404.html'), 'utf8'));
check(notFound('meta[name="robots"]').attr('content')?.startsWith('noindex'), '404 must be noindex');
check(!sitemapUrls.has(origin + '/404.html'), '404 must be excluded from sitemap');
check(readFileSync(resolve(root, 'robots.txt'), 'utf8').includes(`${origin}/sitemap.xml`), 'Robots must reference canonical sitemap');
check(existsSync(fileFor('/squatvision-privacy-policy.html')), 'Existing Squat League policy missing');
check(manifest.posts === publishedGuides.length, 'Published article count mismatch');
if (failures.length) throw new Error(`Publication validation failed:\n${[...new Set(failures)].join('\n')}`);
console.log(`Validated ${pages.size} published pages, ${manifest.posts} guides, ${locales.length} locales, links, metadata, schema and sitemap (${base || '/'}).`);
