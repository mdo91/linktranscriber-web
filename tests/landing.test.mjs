import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('redesign preserves every published URL, article identity and original downloadable asset', () => {
  execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e', `
    import assert from 'node:assert/strict';
    import {readFileSync} from 'node:fs';
    import {createHash} from 'node:crypto';
    import {loadPosts} from './src/posts.ts';
    import {locales,localPath} from './src/site.ts';
    const legacy=JSON.parse(readFileSync('tests/fixtures/legacy-publication.json','utf8'));
    const posts=loadPosts();
    const current=new Map(posts.map(p=>[localPath(p.locale,'/guides/'+p.slug+'/'),p]));
    for(const old of legacy.guides){
      const post=current.get(old.path);
      assert.ok(post,'Lost indexed guide '+old.path);
      assert.equal(post.translationKey,old.translationKey,'Translation identity '+old.path);
      assert.equal(post.publishedAt,old.publishedAt,'Publication identity '+old.path);
    }
    const routes=new Set(locales.flatMap(l=>['/','/guides/','/media-kit/','/privacy-policy.html','/terms-of-use.html','/support.html'].map(p=>localPath(l,p))));
    for(const path of legacy.routes) assert.ok(routes.has(path),'Lost public route '+path);
    for(const asset of legacy.assets) assert.equal(createHash('sha256').update(readFileSync(asset.file)).digest('hex'),asset.sha256,'Changed original asset '+asset.file);
  `], {stdio:'pipe'});
});

test('all localized landing pages expose the complete feature story and navigation without JavaScript', () => {
  execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e', `
    import assert from 'node:assert/strict';
    import {readFileSync,existsSync} from 'node:fs';
    import {load} from 'cheerio';
    import {loadPosts} from './src/posts.ts';
    import {home} from './src/render.ts';
    import {locales,localPath,origin} from './src/site.ts';
    const copy=JSON.parse(readFileSync('src/content/landing.json','utf8'));
    const posts=loadPosts();
    for(const locale of locales){
      const l=copy[locale], $=load(home(locale,posts.filter(p=>p.locale===locale)));
      assert.ok(l.heroStart&&l.heroAccent&&l.heroDescription);
      assert.equal(l.outcomes.length,3);
      assert.equal(l.steps.length,3);
      assert.equal(l.controls.length,3);
      assert.ok(l.faqs.length>=6);
      assert.equal($('h1').length,1);
      assert.equal($('#features').length,1);
      assert.equal($('.outcome').length,3);
      assert.equal($('.app-screen').length,6);
      assert.ok($('.featured-guides .guide-card').length>=3&&$('.featured-guides .guide-card').length<=6);
      assert.equal($('.all-guides a').attr('href'),localPath(locale,'/guides/'));
      assert.equal($('video').length,0,'Outdated preview should remain download-only');
      assert.equal($('script:not([type="application/ld+json"])').length,0);
      assert.equal($('link[rel="canonical"]').attr('href'),origin+localPath(locale));
      assert.equal($('link[rel="alternate"]').length,12);
      assert.equal($('img[fetchpriority="high"]').attr('loading'),undefined);
      for(const image of $('img').toArray()){
        assert.ok($(image).attr('width')&&$(image).attr('height'));
        assert.ok(existsSync('public'+$(image).attr('src'))||$(image).attr('src').includes('app-store-qr'));
      }
      for(const section of l.outcomes) assert.ok($('main').text().includes(section.title));
      for(const block of l.usageBlocks) assert.ok($('main').text().includes(block.body));
    }
    const english=load(home('en',posts.filter(p=>p.locale==='en')))('main').text();
    for(const feature of ['70','90','Standard','Professional','Apple','Insight']) assert.ok(english.includes(feature),feature);
  `], {stdio:'pipe'});
});
