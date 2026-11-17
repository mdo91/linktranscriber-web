import test from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import QRCode from 'qrcode';

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


test('official localized hero badges and static platform/device details preserve links at both bases and with provider attribution', () => {
  for (const basePath of ['/', '/linktranscriber-web/']) for (const provider of ['', '123456789']) {
    execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', String.raw`
      import assert from 'node:assert/strict';
      import {readFileSync,existsSync} from 'node:fs';
      import {createHash} from 'node:crypto';
      import {load} from 'cheerio';
      import {loadPosts} from './src/posts.ts';
      import {home,article,mediaKit} from './src/render.ts';
      import {locales,localPath,sitePath,origin,appUrl,texts} from './src/site.ts';
      const copy=JSON.parse(readFileSync('src/content/landing.json','utf8'));
      const assets=JSON.parse(readFileSync('src/content/platform-assets.json','utf8'));
      const posts=loadPosts(),provider=process.env.APP_STORE_PROVIDER_TOKEN||'';
      const universal=new URL(appUrl);
      assert.equal(universal.protocol,'https:');assert.equal(universal.hostname,'apps.apple.com');
      assert.match(universal.pathname,/[/]id6766233794[/]?$/);
      const normalize=value=>String(value).replace(/\s+/g,' ').trim();
      const expectedStore=placement=>locale=>{
        const url=new URL(appUrl);
        if(provider){url.searchParams.set('pt',provider);url.searchParams.set('ct','damas_'+locale+'_'+placement);url.searchParams.set('mt','8');}
        return url.href;
      };
      const fileForAsset=src=>{
        const url=new URL(src,origin),prefix=(process.env.BASE_PATH||'/').replace(/\/$/,'');
        assert.equal(url.origin,origin,'Marketing assets must remain local');
        assert.ok(!prefix||url.pathname.startsWith(prefix+'/'),'Asset lost the repository deployment base');
        return 'public'+url.pathname.slice(prefix.length);
      };
      const sourceNames={youtube:'YouTube',x:'X',instagram:'Instagram'};
      assert.deepEqual(Object.keys(assets.badges).sort(),[...locales].sort());
      for(const locale of locales){
        const l=copy[locale],localized=posts.filter(post=>post.locale===locale),$=load(home(locale,localized));
        const badge=$('a.store-badge'),badgeImage=badge.find('img');
        assert.equal($('.store-badge').length,1,locale+': one official badge per homepage');
        assert.equal(badgeImage.length,1);
        assert.equal(badge.attr('data-download'),'true');
        assert.equal(badge.attr('href'),expectedStore('hero')(locale),locale+': universal hero/campaign URL');
        const accessibleLabel=badge.attr('aria-label')||badgeImage.attr('alt')||badge.text();
        assert.equal(normalize(accessibleLabel),normalize(texts[locale].download),locale+': localized download label');
        const badgeFile=fileForAsset(badgeImage.attr('src'));
        assert.equal(badgeFile,'public/assets/app-store-badge-'+locale+'.svg');
        assert.ok(existsSync(badgeFile),locale+': local official badge missing');
        const bytes=readFileSync(badgeFile),svg=load(bytes.toString('utf8'),{xml:true}),root=svg('svg');
        assert.equal(root.length,1);assert.equal(svg('script').length,0);
        assert.equal(createHash('sha256').update(bytes).digest('hex'),assets.badges[locale].sha256,locale+': badge provenance bytes');
        const viewBox=String(root.attr('viewBox')||root.attr('viewbox')||'').trim().split(/\s+/).map(Number);
        const width=parseFloat(root.attr('width'))||viewBox[2],height=parseFloat(root.attr('height'))||viewBox[3];
        const renderedWidth=Number(badgeImage.attr('width')),renderedHeight=Number(badgeImage.attr('height'));
        assert.ok(width>0&&height>0&&renderedWidth>0&&renderedHeight>0,locale+': badge intrinsic dimensions');
        assert.equal(renderedWidth,Math.round(width),locale+': rounded badge width');
        assert.equal(renderedHeight,Math.round(height),locale+': rounded badge height');
        const qr=$('.hero-download a.app-store-qr');
        assert.equal(qr.length,1,locale+': QR alternative retained');
        assert.equal(qr.attr('href'),expectedStore('hero-qr')(locale));
        assert.equal(qr.attr('data-download'),'true');
        assert.ok(qr.find('img').attr('src').split('?')[0].endsWith('/app-store-qr-'+locale+'.svg'));
        assert.equal(qr.find('img').attr('width'),'144');assert.equal(qr.find('img').attr('height'),'144');
        const availability=$('.hero-copy .device-availability'),requirements=$('.hero-copy .device-requirements');
        for(const field of ['supportedLinksLabel','deviceAvailability','deviceRequirements'])assert.ok(typeof l[field]==='string'&&l[field].trim(),locale+': missing '+field);
        assert.equal(normalize(availability.text()),normalize(l.deviceAvailability));
        assert.equal(normalize(requirements.text()),normalize(l.deviceRequirements));
        const heroOrder=$('.hero-copy').find('.hero-download,.device-availability,.device-requirements').toArray();
        assert.equal(heroOrder.length,3,locale+': device details belong beside the primary download');
        assert.ok($(heroOrder[0]).hasClass('hero-download')&&$(heroOrder[1]).hasClass('device-availability')&&$(heroOrder[2]).hasClass('device-requirements'));
        for(const device of ['iPhone','iPad','Mac'])assert.ok(availability.text().includes(device),locale+': '+device+' availability');
        for(const requirement of ['iOS','iPadOS','macOS','18.6','15.6'])assert.ok(requirements.text().includes(requirement),locale+': '+requirement);
        assert.doesNotMatch(availability.text()+' '+requirements.text(),/native\s+Mac|Apple\s+silicon|\bM[1-9][0-9]*\b|\bIntel\b/i);
        const support=$('.platform-support');assert.equal(support.length,1);
        assert.equal(normalize(support.find('.platform-label').text()),normalize(l.supportedLinksLabel));
        const platformRows=support.find('.platforms [data-platform]');
        assert.deepEqual(platformRows.toArray().map(node=>$(node).attr('data-platform')).sort(),Object.keys(sourceNames).sort());
        const iconCss=[...readFileSync('public/assets/site.css','utf8').matchAll(/[^{}]*[.]platform-icon[^{}]*[{]([^{}]*)[}]/g)].map(match=>match[1]);
        const cssReservesIconSize=iconCss.some(rule=>{const w=Number(rule.match(/(?:^|;)\s*width\s*:\s*([0-9.]+)px/)?.[1]),h=Number(rule.match(/(?:^|;)\s*height\s*:\s*([0-9.]+)px/)?.[1]);return w>=20&&w<=24&&h>=20&&h<=24;});
        for(const row of platformRows.toArray()){
          const item=$(row),id=item.attr('data-platform'),text=item.clone();text.find('svg,img').remove();
          assert.equal(normalize(text.text()),sourceNames[id],locale+': source name stays readable');
          assert.equal(item.closest('[hidden],[aria-hidden="true"]').length,0);
          const icon=item.find('.platform-icon');assert.equal(icon.length,1);
          assert.equal(icon.attr('aria-hidden'),'true');
          const sizedAttributes=Number(icon.attr('width'))>=20&&Number(icon.attr('width'))<=24&&Number(icon.attr('height'))>=20&&Number(icon.attr('height'))<=24;
          assert.ok(sizedAttributes||cssReservesIconSize,locale+': 20–24px source mark');
          const mark=assets.platforms[id],servedFile=mark.file;assert.ok(existsSync(servedFile),id+': local served mark');
          const servedBytes=readFileSync(servedFile);
          assert.equal(createHash('sha256').update(servedBytes).digest('hex'),mark.sha256,id+': served asset bytes');
          if(mark.sourceFile||mark.sourceSha256){
            assert.ok(mark.sourceFile&&existsSync(mark.sourceFile),id+': retained official source');
            assert.equal(createHash('sha256').update(readFileSync(mark.sourceFile)).digest('hex'),mark.sourceSha256,id+': original official source bytes');
          }
          if(/[.]png$/i.test(servedFile)){
            assert.equal(servedBytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',id+': served PNG signature');
            const width=servedBytes.readUInt32BE(16),height=servedBytes.readUInt32BE(20);
            assert.ok(width>0&&width<=72&&height>0&&height<=72,id+': served PNG must fit the 72px retina budget');
            assert.equal(mark.width,width);assert.equal(mark.height,height);
          }
          if(icon.is('svg')){
            assert.equal(icon.attr('focusable'),'false');
            const expected=load(assets.platforms[id].inlineSvg,{xml:true});
            assert.deepEqual(icon.find('path').toArray().map(node=>$(node).attr('d')),expected('path').toArray().map(node=>expected(node).attr('d')),locale+': official '+id+' geometry');
          }else{
            assert.ok(icon.is('img'),'Platform mark must be an inline SVG or local official image');
            assert.equal(icon.attr('alt'),'');assert.equal(fileForAsset(icon.attr('src')),servedFile);
          }
        }
        assert.equal($('.closing .store-badge').length,0,'Closing download remains text');
        assert.equal(normalize($('.closing a[data-download]').text()),normalize(texts[locale].download));
        assert.equal($('.closing a[data-download]').attr('href'),expectedStore('footer')(locale));
        for(const html of [article(localized[0],posts),mediaKit(locale)]){
          const other=load(html);assert.equal(other('.store-badge').length,0,'Article/media downloads remain text');
          for(const node of other('a[data-download]').toArray())assert.equal(normalize(other(node).text()),normalize(texts[locale].download));
        }
        assert.equal($('script:not([type="application/ld+json"])').length,0);
        assert.equal($('link[rel="canonical"]').attr('href'),origin+localPath(locale));
        assert.equal($('link[rel="alternate"]').length,12);
        const guideLink=$('.all-guides a');assert.equal(guideLink.attr('href'),sitePath(localPath(locale,'/guides/')));
        assert.ok(!/nofollow/i.test(guideLink.attr('rel')||''),'Guide library stays crawlable');
      }
    `],{env:{...process.env,BASE_PATH:basePath,APP_STORE_PROVIDER_TOKEN:provider},stdio:'pipe'});
  }
});

test('generated QR assets encode the preserved universal campaign URL for every locale and both bases', t => {
  const repository=process.cwd(),directory=mkdtempSync(resolve(tmpdir(),'damas-download-qr-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  for(const entry of ['src','content','package.json','growth.config.json','tsconfig.json'])cpSync(resolve(repository,entry),resolve(directory,entry),{recursive:true});
  mkdirSync(resolve(directory,'scripts'));
  cpSync(resolve(repository,'scripts/generate.ts'),resolve(directory,'scripts/generate.ts'));
  symlinkSync(resolve(repository,'node_modules'),resolve(directory,'node_modules'),'dir');
  const {locales,appUrl}=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {locales,appUrl} from './src/site.ts';console.log(JSON.stringify({locales,appUrl}));"],{cwd:directory,encoding:'utf8'}));
  return (async()=>{
    for(const basePath of ['/','/linktranscriber-web/'])for(const provider of ['','123456789']){
      execFileSync(process.execPath,['--import','tsx','scripts/generate.ts'],{cwd:directory,env:{...process.env,BASE_PATH:basePath,APP_STORE_PROVIDER_TOKEN:provider},stdio:'pipe'});
      for(const locale of locales){
        const expected=new URL(appUrl);
        if(provider){expected.searchParams.set('pt',provider);expected.searchParams.set('ct','damas_'+locale+'_hero-qr');expected.searchParams.set('mt','8');}
        const svg=await QRCode.toString(expected.href,{type:'svg',errorCorrectionLevel:'M',margin:4,width:144});
        assert.equal(readFileSync(resolve(directory,'.generated/assets/app-store-qr-'+locale+'.svg'),'utf8'),svg,locale+': QR payload at '+basePath);
      }
    }
  })();
});
