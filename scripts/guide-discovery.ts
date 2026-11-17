import { load, type CheerioAPI } from 'cheerio';

type PublishedGuide = { locale: string; slug: string; translationKey: string; updatedAt: string };
type ManifestUrl = { path: string; group: string; lastmod?: string };
export type GuideDiscoveryInput = {
  publishedGuides: readonly PublishedGuide[];
  locales: readonly string[];
  origin: string;
  basePath?: string;
  manifestUrls: readonly ManifestUrl[];
  sitemapXml: string;
  readPage: (route: string) => string | undefined;
};

function hidden($: CheerioAPI, element: Parameters<CheerioAPI>[0]): boolean {
  const node = $(element);
  return node.is('[hidden], [inert], template, script, style') ||
    node.attr('aria-hidden')?.trim().toLowerCase() === 'true' ||
    /(?:^|;)\s*(?:display\s*:\s*none|(?:content-)?visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test(node.attr('style') || '');
}

// Count ordinary rendered body links, rather than head alternates, JS URLs,
// nofollow links or content explicitly hidden in static HTML. Stylesheet layout
// and visual accessibility are checked separately during design verification.
function followedLinks($: CheerioAPI, route: string, origin: string, base: string): Set<string> {
  const robots = $('meta[name="robots"]').toArray().flatMap(el => ($(el).attr('content') || '').toLowerCase().split(/[\s,]+/));
  if (robots.includes('nofollow') || robots.includes('none')) return new Set();
  const links = new Set<string>();
  $('body a[href]').each((_, element) => {
    const anchor = $(element);
    if ((anchor.attr('rel') || '').toLowerCase().split(/\s+/).includes('nofollow')) return;
    if (anchor.parents().addBack().toArray().some(ancestor => hidden($, ancestor))) return;
    for (const details of anchor.parents('details:not([open])').toArray()) {
      const summary = $(details).children('summary').first().get(0);
      if (!summary || !anchor.parents().addBack().toArray().includes(summary)) return;
    }
    const content = anchor.clone();
    content.find('*').each((_, descendant) => { if (hidden($, descendant)) $(descendant).remove(); });
    if (!content.text().trim() && !content.find('img, svg').length) return;
    try {
      const url = new URL(anchor.attr('href') || '', origin + base + route);
      if (url.origin !== origin) return;
      if (base && !url.pathname.startsWith(base + '/')) return;
      links.add(base ? url.pathname.slice(base.length) : url.pathname);
    } catch { /* Invalid URLs cannot establish discovery. */ }
  });
  return links;
}

export function validateGuideDiscovery(input: GuideDiscoveryInput): string[] {
  const { publishedGuides, locales, origin, manifestUrls, readPage } = input;
  const base = (input.basePath || '/').replace(/\/$/, '');
  const failures: string[] = [];
  const routeFor = (locale: string, suffix = '/') => `${locale === 'en' ? '' : `/${locale}`}${suffix}`;
  const sourceGuides = publishedGuides.map(post => ({ ...post, route: routeFor(post.locale, `/guides/${post.slug}/`) }));
  const xml = load(input.sitemapXml, { xml: true });
  const sitemapCounts = new Map<string, number>();
  xml('url > loc').each((_, element) => {
    const canonical = xml(element).text().trim();
    sitemapCounts.set(canonical, (sitemapCounts.get(canonical) || 0) + 1);
  });
  const pages = new Map<string, CheerioAPI | undefined>();
  const page = (route: string) => {
    if (!pages.has(route)) {
      const html = readPage(route);
      pages.set(route, html === undefined ? undefined : load(html));
    }
    return pages.get(route);
  };
  const graph = new Map<string, Set<string>>();
  const links = (route: string) => {
    if (!graph.has(route)) {
      const $ = page(route);
      graph.set(route, $ ? followedLinks($, route, origin, base) : new Set());
    }
    return graph.get(route)!;
  };
  const knownRoutes = new Set([...manifestUrls.map(entry => entry.path), ...sourceGuides.map(post => post.route), ...locales.flatMap(locale => [routeFor(locale), routeFor(locale, '/guides/')])]);

  // The expected inventory comes from published source, never the generated
  // manifest: a generator that omits the same guide everywhere must still fail.
  for (const post of sourceGuides) {
    const entries = manifestUrls.filter(entry => entry.path === post.route);
    if (entries.length !== 1 || entries[0].group !== `post:${post.translationKey}` || entries[0].lastmod !== post.updatedAt) failures.push(`${post.route}: published guide missing or incorrect in publication manifest`);
    const $ = page(post.route);
    if (!$) failures.push(`${post.route}: published guide missing HTML`);
    else {
      if ($('link[rel="canonical"]').length !== 1 || $('link[rel="canonical"]').attr('href') !== origin + post.route) failures.push(`${post.route}: published guide has incorrect canonical URL`);
      if (/\b(?:noindex|none)\b/i.test($('meta[name="robots"]').attr('content') || '')) failures.push(`${post.route}: published guide is excluded from indexing`);
    }
    if (sitemapCounts.get(origin + post.route) !== 1) failures.push(`${post.route}: published guide must occur exactly once at its canonical URL in sitemap`);
  }

  for (const locale of locales) {
    const home = routeFor(locale), index = routeFor(locale, '/guides/');
    if (!page(home)) failures.push(`${home}: guide discovery homepage missing HTML`);
    if (!page(index)) failures.push(`${index}: guide discovery index missing HTML`);
    if (!links(home).has(index)) failures.push(`${home}: no visible followed link to locale guide index ${index}`);
    const distances = new Map([[home, 0]]), queue = [home];
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i], distance = distances.get(current)!;
      if (distance >= 2) continue;
      for (const target of links(current)) {
        if (!knownRoutes.has(target) || distances.has(target)) continue;
        distances.set(target, distance + 1);
        queue.push(target);
      }
    }
    for (const post of sourceGuides.filter(post => post.locale === locale)) {
      if (!links(index).has(post.route)) failures.push(`${index}: no visible followed link to published guide ${post.route}`);
      if (!distances.has(post.route) || distances.get(post.route)! > 2) failures.push(`${post.route}: not reachable within two followed links from locale homepage ${home}`);
    }
  }
  return failures;
}
