import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';

const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('the genuine Study Guide derivative matches its pinned source provenance and complete screenshot proportions',async()=>{
 const facts=await readJson('src/content/product-facts.json'),evidence=facts.insightStudio.screenshots.studyGuide;
 const bytes=await readFile(evidence.file),image=await sharp(bytes).metadata();
 assert.equal(image.format,'webp');assert.equal(image.width,evidence.width);assert.equal(image.height,evidence.height);
 assert.equal(bytes.length,evidence.bytes);assert.equal(digest(bytes),evidence.sha256);
 assert.equal(evidence.height,Math.round(evidence.width*evidence.sourceHeight/evidence.sourceWidth),'The full native screenshot aspect ratio must be retained');
 assert.match(evidence.sourceCommit,/^[a-f0-9]{40}$/);assert.match(evidence.sourceGitBlob,/^[a-f0-9]{40}$/);assert.notEqual(evidence.sourceCommit,evidence.sourceGitBlob,'A Git blob is not a source commit URL');
 assert.match(evidence.sourceSha256,/^[a-f0-9]{64}$/);
 const source=new URL(evidence.source);
 assert.equal(source.origin,'https://github.com');assert.equal(source.pathname,`/mdo91/voicey/blob/${evidence.sourceCommit}/docs/screenshots/insight-studio/${evidence.capturedAt}/06-Study-guide.png`);
 assert.equal(evidence.capturedAt,facts.insightStudio.screenshots.capturedAt);assert.equal(evidence.device,facts.insightStudio.screenshots.device);assert.equal(evidence.environment,facts.insightStudio.screenshots.environment);
 assert.match(evidence.environment,/Staging/);assert.match(evidence.scope,/does not show the creation controls/);
});

test('Insight Studio evidence retains every original homepage iPad output and the separately identified iPhone sample',async()=>{
 const {insightStudio}=await readJson('src/content/product-facts.json'),screens=insightStudio.screenshots;
 const ipad=await readJson(screens.manifest),iphone=await readJson(screens.iphoneTranscript.manifest);
 assert.deepEqual(screens.items.map(row=>row.kind).sort(),['checklist','flashcards','mind-map','quiz','summary']);
 assert.equal(screens.capturedAt,ipad.captured);assert.equal(screens.device,ipad.device);assert.equal(screens.environment,ipad.environment);
 for(const row of [...screens.items,screens.iphoneTranscript]){
  const manifest=row===screens.iphoneTranscript?iphone:ipad,pin=manifest.assets.find(item=>item.file===row.file);
  assert.ok(pin,`Missing original media evidence: ${row.file}`);
  const bytes=await readFile(row.file),metadata=await sharp(bytes).metadata();
  assert.equal(digest(bytes),pin.sha256);assert.equal(bytes.length,pin.bytes);
  assert.equal(metadata.width,pin.width);assert.equal(metadata.height,pin.height);
  assert.equal(row.width,pin.width);assert.equal(row.height,pin.height);
 }
 assert.match(screens.iphoneTranscript.scope,/offline sample/);assert.match(screens.iphoneTranscript.scope,/not a live backend/);
});
