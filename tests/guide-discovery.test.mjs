import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';

const { validateGuideDiscovery } = await tsImport('../scripts/guide-discovery.ts', import.meta.url);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://linktranscriber.com';
const published = { locale: 'en', slug: 'test-published-guide', translationKey: 'test-published-guide', updatedAt: '2026-10-20' };
const guide = '/guides/test-published-guide/';
const document = (route, body, robots = 'index,follow') => `<!doctype html><html><head><link rel="canonical" href="${origin}${route}"><meta name="robots" content="${robots}"></head><body>${body}</body></html>`;

function fixture(base = '/') {
  const prefix = base.replace(/\/$/, '');
  const pages = new Map([
    ['/', document('/', `<a href="${prefix}/guides/">All guides</a>`)],
    ['/guides/', document('/guides/', `<a href="${prefix}${guide}">Published guide</a>`)],
    [guide, document(guide, 'A useful published guide.')],
  ]);
  return {
    pages,
    input: {
      publishedGuides: [published], locales: ['en'], origin, basePath: base,
      manifestUrls: [{ path: '/', group: 'home' }, { path: '/guides/', group: 'guides' }, { path: guide, group: `post:${published.translationKey}`, lastmod: published.updatedAt }],
      sitemapXml: `<urlset><url><loc>${origin}${guide}</loc></url></urlset>`,
      readPage: route => pages.get(route),
    },
  };
}

test('published source drives discovery checks at the root and repository deployment base', () => {
  for (const base of ['/', '/linktranscriber-web/']) assert.deepEqual(validateGuideDiscovery(fixture(base).input), []);
});

test('a published guide cannot be orphaned from its index or hidden behind nofollow', () => {
  for (const link of ['', `<a rel="nofollow" href="${guide}">Read guide</a>`, `<a download href="${guide}">Read guide</a>`, `<link rel="alternate" href="${guide}">`]) {
    const { pages, input } = fixture();
    pages.set('/guides/', document('/guides/', link));
    const errors = validateGuideDiscovery(input);
    assert.ok(errors.some(error => error.includes('no visible followed link to published guide')), link);
    assert.ok(errors.some(error => error.includes('not reachable within two followed links')), link);
  }
});

test('every homepage must link to its guide index even when an article is featured directly', () => {
  for (const link of ['', '<a rel="NOFOLLOW external" href="/guides/">All guides</a>', '<link rel="alternate" href="/guides/">']) {
    const { pages, input } = fixture();
    pages.set('/', document('/', `${link}<a href="${guide}">Featured guide</a>`));
    const errors = validateGuideDiscovery(input);
    assert.ok(errors.some(error => error.includes('no visible followed link to locale guide index')), link);
    assert.ok(!errors.some(error => error.includes('not reachable within two followed links')), link);
  }
});

test('hidden, inert, empty and closed-details links do not establish static discovery', () => {
  const anchor = `<a href="${guide}">Read guide</a>`;
  for (const link of [
    `<div hidden>${anchor}</div>`, `<div inert>${anchor}</div>`, `<div aria-hidden="true">${anchor}</div>`,
    `<div style="display: none !important">${anchor}</div>`, `<div style="visibility:hidden">${anchor}</div>`,
    `<template>${anchor}</template>`, `<details><summary>More</summary>${anchor}</details>`,
    `<a href="${guide}"><span hidden>Read guide</span></a>`,
  ]) {
    const { pages, input } = fixture();
    pages.set('/guides/', document('/guides/', link));
    assert.ok(validateGuideDiscovery(input).some(error => error.includes('no visible followed link to published guide')), link);
  }
  const { pages, input } = fixture();
  pages.set('/guides/', document('/guides/', anchor, 'index,nofollow'));
  assert.ok(validateGuideDiscovery(input).some(error => error.includes('no visible followed link to published guide')));
});

test('source guides must retain HTML, canonical URLs, sitemap entries and manifest membership independently', () => {
  const mutations = [
    [({ pages }) => pages.delete(guide), 'published guide missing HTML'],
    [({ pages }) => pages.set(guide, document('/different/', 'Wrong canonical.')), 'incorrect canonical URL'],
    [({ pages }) => pages.set(guide, document(guide, 'Hidden from search.', 'noindex,follow')), 'excluded from indexing'],
    [({ input }) => { input.sitemapXml = '<urlset></urlset>'; }, 'exactly once at its canonical URL in sitemap'],
    [({ input }) => { input.sitemapXml = input.sitemapXml.replace('</urlset>', `<url><loc>${origin}${guide}</loc></url></urlset>`); }, 'exactly once at its canonical URL in sitemap'],
    [({ input }) => { input.manifestUrls = input.manifestUrls.filter(entry => entry.path !== guide); }, 'publication manifest'],
  ];
  for (const [mutate, expected] of mutations) {
    const current = fixture();
    mutate(current);
    assert.ok(validateGuideDiscovery(current.input).some(error => error.includes(expected)), expected);
  }
  // Simulate a generator that loses a guide from HTML, manifest, index and
  // sitemap together. The source inventory must still expose the omission.
  const { pages, input } = fixture();
  pages.delete(guide); pages.set('/guides/', document('/guides/', 'No articles here.'));
  input.manifestUrls = input.manifestUrls.filter(entry => entry.path !== guide);
  input.sitemapXml = '<urlset></urlset>';
  const failures = validateGuideDiscovery(input);
  for (const expected of ['missing HTML', 'publication manifest', 'canonical URL in sitemap', 'no visible followed link to published guide']) assert.ok(failures.some(error => error.includes(expected)), expected);
});

test('the actual generator automatically discovers a new published guide in all eleven locales while excluding drafts at both bases', t => {
  const directory = mkdtempSync(resolve(tmpdir(), 'damas-guide-discovery-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const entry of ['src', 'content', 'package.json', 'growth.config.json', 'tsconfig.json']) cpSync(resolve(repository, entry), resolve(directory, entry), { recursive: true });
  mkdirSync(resolve(directory, 'scripts'));
  cpSync(resolve(repository, 'scripts/generate.ts'), resolve(directory, 'scripts/generate.ts'));
  symlinkSync(resolve(repository, 'node_modules'), resolve(directory, 'node_modules'), 'dir');
  const { locales, origin: canonicalOrigin } = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {locales,origin} from './src/site.ts';console.log(JSON.stringify({locales,origin}));"], { cwd: directory, encoding: 'utf8' }));
  assert.equal(locales.length, 11);
  for (const locale of locales) {
    const source = readFileSync(resolve(directory, `content/guides/${locale}/transcribe-social-video-link-iphone.md`), 'utf8');
    for (const status of ['published', 'draft']) {
      const slug = `test-discovery-${status}`;
      const fixture = source
        .replace(/^title: .+$/m, `title: "${locale} discovery fixture ${status}"`)
        .replace(/^slug: .+$/m, `slug: "${slug}"`)
        .replace(/^translationKey: .+$/m, `translationKey: "${slug}"`)
        .replace(/^status: .+$/m, `status: "${status}"`);
      writeFileSync(resolve(directory, `content/guides/${locale}/${slug}.md`), fixture);
    }
  }
  for (const basePath of ['/', '/linktranscriber-web/']) {
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/generate.ts'], { cwd: directory, env: { ...process.env, BASE_PATH: basePath }, stdio: 'pipe' });
    const publishedGuides = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {loadPosts} from './src/posts.ts';console.log(JSON.stringify(loadPosts().map(({locale,slug,translationKey,updatedAt})=>({locale,slug,translationKey,updatedAt}))));"], { cwd: directory, encoding: 'utf8', env: { ...process.env, BASE_PATH: basePath } }));
    const manifest = JSON.parse(readFileSync(resolve(directory, '.generated/manifest.json'), 'utf8'));
    const fileFor = route => resolve(directory, '.generated', '.' + route, route.endsWith('/') ? 'index.html' : '');
    const input = {
      publishedGuides, locales, origin: canonicalOrigin, basePath, manifestUrls: manifest.urls,
      sitemapXml: readFileSync(resolve(directory, '.generated/sitemap.xml'), 'utf8'),
      readPage: route => existsSync(fileFor(route)) ? readFileSync(fileFor(route), 'utf8') : undefined,
    };
    assert.deepEqual(validateGuideDiscovery(input), [], basePath);
    for (const locale of locales) {
      const prefix = locale === 'en' ? '' : '/' + locale;
      const publishedPath = `${prefix}/guides/test-discovery-published/`, draftPath = `${prefix}/guides/test-discovery-draft/`;
      assert.ok(manifest.urls.some(entry => entry.path === publishedPath), `${locale}: new guide missing`);
      assert.ok(!manifest.urls.some(entry => entry.path === draftPath), `${locale}: draft entered manifest`);
      assert.ok(!existsSync(fileFor(draftPath)), `${locale}: draft rendered HTML`);
      assert.ok(!input.sitemapXml.includes(canonicalOrigin + draftPath), `${locale}: draft entered sitemap`);
      assert.ok(!input.readPage(prefix + '/guides/').includes('test-discovery-draft'), `${locale}: draft entered index`);
    }
  }
});
