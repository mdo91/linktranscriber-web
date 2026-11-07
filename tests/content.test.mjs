import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Run the actual TypeScript parser in one process; fixtures exercise publication
// boundaries rather than checking that a template contains its own literals.
test('article publication rejects unsafe or ambiguous content and broken coverage', () => {
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import {readFileSync} from 'node:fs';
    import {parsePost,loadPosts} from './src/posts.ts';
    const path='content/guides/en/transcribe-social-video-link-iphone.md';
    const source=readFileSync(path,'utf8');
    assert.equal(parsePost(source,path).status,'published');
    for (const invalid of [
      source.replace(/status: .+/, 'status: invalid'),
      source.replace(/publishedAt: .+/, 'publishedAt: 2099-01-01'),
      source.replace(/updatedAt: .+/, 'updatedAt: 2099-01-01'),
      source+'\\n<script>alert(1)</script>',
      source+'\\n[open](javascript:alert(1))',
      source+'\\n![x](data:image/svg+xml,x)',
      source+'\\n# second page title',
    ]) assert.throws(()=>parsePost(invalid,path));
    assert.equal(parsePost(source.replace(/status: .+/, 'status: draft'),path).status,'draft');
    const posts=loadPosts();
    assert.equal(new Set(posts.map(p=>p.locale)).size,11);
    assert.ok(posts.length>=33);
    for(const post of posts) assert.ok(post.related.every(slug=>posts.some(p=>p.locale===post.locale&&p.slug===slug)));
  `], { cwd: process.cwd(), stdio: 'pipe' });
  assert.ok(true);
});

test('all locale article dates follow the configured Istanbul midnight and still reject future or invalid dates', () => {
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import {readFileSync} from 'node:fs';
    import {parsePost,loadPosts} from './src/posts.ts';
    const config=JSON.parse(readFileSync('growth.config.json','utf8'));
    assert.equal(config.schedule.timeZone,'Europe/Istanbul');
    const before=new Date('2026-11-07T20:59:59.999Z');
    const midnight=new Date('2026-11-07T21:00:00.000Z');
    const posts=loadPosts();
    assert.equal(new Set(posts.map(post=>post.locale)).size,11);
    for(const locale of new Set(posts.map(post=>post.locale))){
      const post=posts.find(post=>post.locale===locale);
      const source=readFileSync(post.file,'utf8');
      const dated=(publishedAt,updatedAt=publishedAt)=>source
        .replace(/publishedAt: .+/, 'publishedAt: "'+publishedAt+'"')
        .replace(/updatedAt: .+/, 'updatedAt: "'+updatedAt+'"');
      assert.equal(parsePost(dated('2026-11-07'),post.file,before).publishedAt,'2026-11-07');
      assert.throws(()=>parsePost(dated('2026-11-08'),post.file,before),/future article date/);
      assert.throws(()=>parsePost(dated('2026-11-07','2026-11-08'),post.file,before),/future article date/);
      assert.equal(parsePost(dated('2026-11-08'),post.file,midnight).publishedAt,'2026-11-08');
      assert.equal(parsePost(dated('2026-11-07','2026-11-08'),post.file,midnight).updatedAt,'2026-11-08');
      assert.throws(()=>parsePost(dated('2026-11-09'),post.file,midnight),/future article date/);
      assert.throws(()=>parsePost(dated('2026-11-08','2026-11-09'),post.file,midnight),/future article date/);
      assert.throws(()=>parsePost(dated('2026-11-08','2026-11-07'),post.file,midnight),/updated before publication/);
      for(const invalid of ['2026-02-30','2026-13-01','2026-00-01','2026-11-8']){
        assert.throws(()=>parsePost(dated(invalid),post.file,midnight),/invalid publishedAt/);
        assert.throws(()=>parsePost(dated('2026-11-07',invalid),post.file,midnight),/invalid updatedAt/);
      }
    }
  `], { cwd: process.cwd(), stdio: 'pipe' });
});
