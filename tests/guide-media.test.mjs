import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('all nine approved captures retain pinned provenance, complete proportions and unchanged existing derivatives', async () => {
  const bytes = await readFile('src/content/guide-media.json'), catalog = JSON.parse(bytes);
  assert.ok(bytes.length <= 24000);
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.source.repository, 'mdo91/voicey');
  assert.equal(catalog.source.path, 'docs/screenshots/insight-studio/2026-11-19');
  assert.match(catalog.source.commit, /^[a-f0-9]{40}$/);
  assert.equal(catalog.source.capturedAt, '2026-11-19');
  assert.equal(catalog.source.device, 'iPad Pro 11-inch (M4)');
  assert.equal(catalog.source.environment, 'Damas V3 Staging 1.6.1 (133)');
  assert.deepEqual(Object.keys(catalog.source.notices).sort(), ['en','fr','de','ja','ko','ms','pt','ru','zh-hans','es','tr'].sort());
  const expected = {
    'short-summary':'01-Short-summary.png', 'detailed-summary':'02-Detailed-summary.png', 'mind-map':'03-Mind-map.png',
    'mind-map-outline':'03b-Mind-map-outline.png', 'action-items':'04-Action-items.png', 'step-by-step':'05-Step-by-step-guide.png',
    'study-guide':'06-Study-guide.png', quiz:'07-Quiz-feedback.png', flashcards:'08-Flashcards-answer.png',
  };
  assert.equal(catalog.assets.length, 9);
  assert.deepEqual(catalog.assets.map(row => row.task).sort(), Object.keys(expected).sort());
  assert.equal(new Set(catalog.assets.map(row => row.file)).size, 9);
  const homepage = JSON.parse(await readFile('docs/ipad-showcase.json', 'utf8'));
  const facts = JSON.parse(await readFile('src/content/product-facts.json', 'utf8'));
  for (const record of catalog.assets) {
    assert.equal(record.sourceFile, expected[record.task]);
    assert.match(record.sourceBlob, /^[a-f0-9]{40}$/);
    assert.match(record.sourceSha256, /^[a-f0-9]{64}$/);
    assert.match(record.file, /^\/assets\/[a-z0-9-]+\.webp$/);
    assert.ok(record.description.length > 20 && record.limitations.length > 0);
    const image = await readFile('public' + record.file), dimensions = await sharp(image).metadata();
    assert.equal(dimensions.format, 'webp');
    assert.equal(dimensions.width, record.width);
    assert.equal(dimensions.height, record.height);
    assert.equal(record.width, 1440);
    assert.equal(record.height, Math.round(record.width * 1668 / 2420));
    assert.equal(image.length, record.bytes);
    assert.equal(hash(image), record.sha256);
    const existing = homepage.assets.find(row => row.file === 'public' + record.file) ||
      (record.task === 'study-guide' ? facts.insightStudio.screenshots.studyGuide : null);
    if (existing) assert.equal(record.sha256, existing.sha256, 'Existing six derivatives retain their original bytes');
  }
  assert.match(catalog.assets.find(row => row.task === 'detailed-summary').limitations.join(' '), /Raw source-reference markers/);
  assert.match(catalog.assets.find(row => row.task === 'mind-map').limitations.join(' '), /Only part of the map/);
});

test('first reviewed inline or reference image drives localized article, schema and social previews', () => {
  execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e', `
    import assert from 'node:assert/strict';
    import {readFileSync} from 'node:fs';
    import {load} from 'cheerio';
    import {loadPosts} from './src/posts.ts';
    import {article} from './src/render.ts';
    import {locales,origin,sitePath} from './src/site.ts';
    const catalog=JSON.parse(readFileSync('src/content/guide-media.json','utf8')),posts=loadPosts();
    const quiz=catalog.assets.find(row=>row.task==='quiz'),cards=catalog.assets.find(row=>row.task==='flashcards');
    for(const locale of locales){
      const post=posts.find(row=>row.locale===locale),caption=catalog.source.notices[locale]+' '+quiz.description;
      const body='A useful introduction.\\n\\n![Descriptive iPad quiz example][capture]\\n\\nAnother step.\\n\\n[capture]: '+quiz.file+' "'+caption+'"\\n\\n![Revealed flashcard]('+cards.file+')';
      const html=article({...post,body},posts),$=load(html),image=$('.prose img').first();
      assert.equal(image.attr('src'),sitePath(quiz.file));
      assert.equal(image.attr('width'),'1440');assert.equal(image.attr('height'),'993');
      assert.equal(image.attr('loading'),'lazy');assert.equal(image.attr('decoding'),'async');
      assert.equal($('.guide-figure figcaption').text(),caption);
      assert.equal($('.article-image').length,0);
      assert.doesNotMatch(html,/<p><figure/);
      const posting=JSON.parse($('script[type="application/ld+json"]').text())['@graph'].find(row=>row['@type']==='BlogPosting');
      assert.equal(posting.image,origin+quiz.file);
      assert.equal($('meta[property="og:image"]').attr('content'),posting.image);
      assert.equal($('meta[name="twitter:image"]').attr('content'),posting.image);
      assert.equal($('meta[property="og:image:alt"]').attr('content'),'Descriptive iPad quiz example');
    }
    // No language or English-slug heuristic supplies unrelated media.
    for(const locale of locales){
      const post=posts.find(row=>row.locale===locale),$=load(article({...post,slug:'summarize-anything',body:'A legacy guide without a relevant capture.'},posts));
      assert.equal($('.prose img,.article-image').length,0);
      assert.equal($('meta[property="og:image"],meta[name="twitter:image"]').length,0);
      assert.equal($('meta[name="twitter:card"]').attr('content'),'summary');
      const posting=JSON.parse($('script[type="application/ld+json"]').text())['@graph'].find(row=>row['@type']==='BlogPosting');
      assert.equal(posting.image,undefined);
    }
  `], {cwd:process.cwd(),stdio:'pipe'});
});

test('unknown, external, ambiguous and empty-alt image references cannot reach guide publication', () => {
  execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e', `
    import assert from 'node:assert/strict';
    import {readFileSync} from 'node:fs';
    import {load} from 'cheerio';
    import {loadPosts,parsePost} from './src/posts.ts';
    import {article} from './src/render.ts';
    const post=loadPosts()[0],source=readFileSync(post.file,'utf8');
    for(const route of ['/assets/unknown.webp','https://example.com/capture.webp','https://github.com/mdo91/voicey/blob/main/capture.png?token=private','/assets/../secret.webp','/assets/insight-studio-ipad-quiz-1440.webp?v=1']){
      const body='![Unreviewed capture][image]\\n\\n[image]: '+route;
      assert.throws(()=>article({...post,body},[post]),/reviewed screenshot/);
      assert.throws(()=>parsePost(source+'\\n\\n'+body,post.file),/reviewed screenshot/);
    }
    const route='/assets/insight-studio-ipad-quiz-1440.webp';
    assert.throws(()=>article({...post,body:'![]('+route+')'},[post]),/descriptive alt text/);
    const caption='<script>alert(1)</script> & "quoted"';
    const body='Intro with ![A quiz example]('+route+' \\''+caption+'\\') and a useful observation.';
    const html=article({...post,body},[post]),$=load(html);
    assert.equal($('.guide-figure figcaption').text(),caption);
    assert.equal($('.prose script').length,0);
    assert.equal($('.guide-illustrated-paragraph').length,1);
  `], {cwd:process.cwd(),stdio:'pipe'});
});
