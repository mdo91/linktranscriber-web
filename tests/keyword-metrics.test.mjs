import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {keywordPlan,keywordTargetingFor} from '../scripts/growth/config.mjs';
import {normalizeKeywordResults,mergeKeywordRows,makeKeywordCache,assessKeywordCache} from '../scripts/growth/keyword-library.mjs';
import {collectKeywords,loadKeywordCache} from '../scripts/growth/keywords.mjs';
import {savePrivate} from '../scripts/growth/storage.mjs';

const now=new Date('2026-10-20T06:00:00.000Z'),settings={customerId:'1234567890',loginCustomerId:'0987654321',accessStatus:'ready'};
const temp=t=>{const directory=mkdtempSync(resolve(tmpdir(),'damas-metrics-test-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));return directory;};
const month=(name,value)=>({year:'2026',month:name,monthlySearches:value});
const apiCache=(locale='en')=>makeKeywordCache({results:[{text:keywordPlan(locale).seeds[0],keywordMetrics:{avgMonthlySearches:'170'}}],source:{kind:'google-ads-api'},targeting:keywordTargetingFor(locale),generatedAt:now.toISOString(),seeds:keywordPlan(locale).seeds});

test('empty idea metrics cannot hide historical zero, monthly zero or competition zero',()=>{
 const [row]=normalizeKeywordResults([{text:'reported zero',keywordIdeaMetrics:{},keywordMetrics:{avgMonthlySearches:'0',competitionIndex:'0',monthlySearchVolumes:[month('SEPTEMBER','0')]}}]);
 assert.equal(row.averageMonthlySearches,0);assert.equal(row.advertiserCompetitionIndex,0);assert.deepEqual(row.monthlySearchVolumes,[{year:2026,month:'SEPTEMBER',monthlySearches:0}]);
});
test('historical metrics win per usable field while idea competition and other months survive',()=>{
 const [row]=normalizeKeywordResults([{text:'video notes',keywordIdeaMetrics:{avgMonthlySearches:'1300',competition:'LOW',competitionIndex:'8',monthlySearchVolumes:[month('AUGUST','100'),month('SEPTEMBER','200')]},keywordMetrics:{avgMonthlySearches:'170',competition:null,competitionIndex:0,monthlySearchVolumes:[month('SEPTEMBER',0),month('OCTOBER','12'),month('AUGUST',null)]}}]);
 assert.equal(row.averageMonthlySearches,170);assert.equal(row.advertiserCompetition,'LOW');assert.equal(row.advertiserCompetitionIndex,0);
 assert.deepEqual(row.monthlySearchVolumes,[{year:2026,month:'AUGUST',monthlySearches:100},{year:2026,month:'SEPTEMBER',monthlySearches:0},{year:2026,month:'OCTOBER',monthlySearches:12}]);
});
test('later empty metrics preserve useful fields, month entries and the union of variants without summing',()=>{
 const known={text:'video notes',closeVariants:['video note'],keywordIdeaMetrics:{avgMonthlySearches:100,competition:'HIGH',monthlySearchVolumes:[month('SEPTEMBER',20)]},keywordMetrics:{avgMonthlySearches:50,monthlySearchVolumes:[month('SEPTEMBER',0)]}};
 for(const empty of [{keywordIdeaMetrics:{},keywordMetrics:{}},{keywordIdeaMetrics:{avgMonthlySearches:null,monthlySearchVolumes:[]},keywordMetrics:{avgMonthlySearches:' ',monthlySearchVolumes:[]}},{keywordIdeaMetrics:{monthlySearchVolumes:[month('SEPTEMBER',null)]},keywordMetrics:null}]){
  const [row]=normalizeKeywordResults([mergeKeywordRows(known,{text:'video notes',closeVariants:['video note','notes from video'],...empty})]);
  assert.equal(row.averageMonthlySearches,50);assert.equal(row.advertiserCompetition,'HIGH');assert.deepEqual(row.closeVariants,['video note','notes from video']);assert.equal(row.monthlySearchVolumes[0].monthlySearches,0);
 }
 const [duplicate]=normalizeKeywordResults([{text:'same',keywordIdeaMetrics:{avgMonthlySearches:null}},{text:'same',keywordMetrics:{avgMonthlySearches:0}},{text:'same',keywordMetrics:{avgMonthlySearches:null}}]);assert.equal(duplicate.averageMonthlySearches,0);
});
test('private demand summaries count estimate kinds rather than adding overlapping search volumes',()=>{
 const cache=makeKeywordCache({results:[{text:'positive',closeVariants:['positive variant'],keywordMetrics:{avgMonthlySearches:100}},{text:'zero',keywordMetrics:{avgMonthlySearches:0}},{text:'range',searchVolumeRange:{min:10,max:100}},{text:'unknown',keywordMetrics:{}}],source:{kind:'google-ads-api'},generatedAt:now.toISOString(),seeds:['positive variant','zero','unreported',...Array(300).fill('positive')]});
 assert.deepEqual(cache.demandSummary,{positive:1,zero:1,range:1,unavailable:1});assert.equal(cache.seedAudit.length,200);assert.deepEqual(cache.seedAudit.slice(0,3),[{seed:'positive variant',matched:true,demand:'positive'},{seed:'zero',matched:true,demand:'zero'},{seed:'unreported',matched:false,demand:'unavailable'}]);
});
test('real-shaped paginated idea and historical responses preserve values across every seed batch',async t=>{
 const directory=temp(t),plan=keywordPlan('en'),seed=plan.seeds[0],calls=[];
 const call=(operation,args)=>{
  calls.push({operation,args});assert.deepEqual(args.geoTargetConstants,[]);assert.equal(args.language,plan.targeting.languageConstant);assert.equal(args.keywordPlanNetwork,'GOOGLE_SEARCH');assert.ok(args.keywords.length>0&&args.keywords.length<=20);
  if(operation==='googleads.keywordPlanIdeas.generateKeywordHistoricalMetrics'){
   assert.equal(args.url,undefined);assert.equal(args.pageToken,undefined);assert.equal(args.pageSize,undefined);
   return {results:[{text:seed,closeVariants:['historical variant'],keywordMetrics:{avgMonthlySearches:'170',competitionIndex:'0',monthlySearchVolumes:[month('SEPTEMBER','0')]}},{text:'reported zero',keywordIdeaMetrics:{},keywordMetrics:{avgMonthlySearches:'0'}}]};
  }
  assert.equal(operation,'googleads.keywordPlanIdeas.generateKeywordIdeas');assert.equal(args.url,plan.seedUrl);assert.equal(args.pageSize,10000);
  return args.pageToken?{results:[{text:seed,closeVariants:['later variant'],keywordIdeaMetrics:{avgMonthlySearches:null,monthlySearchVolumes:[]},keywordMetrics:{}}]}:{results:[{text:seed,closeVariants:['idea variant'],keywordIdeaMetrics:{avgMonthlySearches:'1300',competition:'LOW',monthlySearchVolumes:[month('AUGUST','100'),month('SEPTEMBER','200')]}},{text:'no reported estimate',keywordIdeaMetrics:{}}],nextPageToken:'next-page'};
 };
 const result=await collectKeywords('en',{now,directory,settings,call});assert.equal(result.status,'ready');assert.equal(calls.length,3*Math.ceil(plan.seeds.length/20));
 const cache=loadKeywordCache('en',now,directory),row=cache.keywords.find(row=>row.text===seed);assert.equal(cache.normalizationVersion,2);assert.equal(row.averageMonthlySearches,170);assert.equal(row.advertiserCompetition,'LOW');assert.equal(row.advertiserCompetitionIndex,0);assert.deepEqual(row.closeVariants,['idea variant','later variant','historical variant']);assert.deepEqual(row.monthlySearchVolumes,[{year:2026,month:'AUGUST',monthlySearches:100},{year:2026,month:'SEPTEMBER',monthlySearches:0}]);
 assert.deepEqual(result.demandSummary,{positive:1,zero:1,range:0,unavailable:1});assert.equal(cache.seedAudit.length,Math.min(plan.seeds.length,200));
 for(const file of readdirSync(directory)){assert.equal(statSync(resolve(directory,file)).mode&0o777,0o600);assert.doesNotMatch(readFileSync(resolve(directory,file),'utf8'),/1234567890|0987654321|customerId|loginCustomerId/);}
});
test('legacy API normalization is refreshed once and monthly reuse preserves original timestamps',async t=>{
 for(const version of [undefined,1]){
  const directory=temp(t),legacy=apiCache();if(version===undefined)delete legacy.normalizationVersion;else legacy.normalizationVersion=version;savePrivate('keyword-cache-en.json',legacy,directory);assert.equal(loadKeywordCache('en',now,directory).status,'invalid');
  let calls=0;const call=()=>{calls++;return {results:[{text:'video notes',keywordMetrics:{avgMonthlySearches:'0'}}]};};
  assert.equal((await collectKeywords('en',{now,directory,settings,call})).status,'ready');const expected=2*Math.ceil(keywordPlan('en').seeds.length/20);assert.equal(calls,expected);assert.equal(loadKeywordCache('en',now,directory).normalizationVersion,2);
  const filename=resolve(directory,'keyword-cache-en.json'),before=readFileSync(filename,'utf8');
  const reused=await collectKeywords('en',{now:new Date('2026-11-18T06:00:00.000Z'),directory,settings:{},call});assert.equal(reused.reusedCache,true);assert.equal(calls,expected);assert.equal(readFileSync(filename,'utf8'),before);assert.equal(reused.observedAt,now.toISOString());
 }
});
test('marker-free CSV caches keep their export date and 30-day freshness independently of API normalization',async t=>{
 const directory=temp(t),csv=makeKeywordCache({results:[{text:'video notes',keywordIdeaMetrics:{avgMonthlySearches:0}}],source:{kind:'keyword-planner-csv',exportedAt:'2026-10-01'},targeting:keywordTargetingFor('en'),generatedAt:now.toISOString()});
 assert.equal(csv.normalizationVersion,undefined);assert.equal(csv.observedAt,'2026-10-01');assert.equal(assessKeywordCache(csv,now).status,'ready');assert.equal(assessKeywordCache(csv,new Date('2026-10-31T00:00:00Z')).status,'stale');
 savePrivate('keyword-cache-en.json',csv,directory);const before=readFileSync(resolve(directory,'keyword-cache-en.json'),'utf8');const result=await collectKeywords('en',{now,directory,settings:{},call:()=>{throw Error('A fresh CSV must not call the API');}});assert.equal(result.reusedCache,true);assert.equal(result.observedAt,'2026-10-01');assert.equal(readFileSync(resolve(directory,'keyword-cache-en.json'),'utf8'),before);
});
test('a valid cache in the wrong locale filename cannot be reused and refreshing preserves target isolation',async t=>{
 const directory=temp(t);savePrivate('keyword-cache-en.json',apiCache('ms'),directory);assert.equal(loadKeywordCache('en',now,directory).status,'invalid');
 assert.equal((await collectKeywords('en',{now,directory,settings:{},call:()=>{throw Error('No account configured');}})).status,'setup-required');
 const result=await collectKeywords('en',{now,directory,settings,call:(_operation,args)=>{assert.equal(args.language,keywordTargetingFor('en').languageConstant);return {results:[{text:'video notes',keywordMetrics:{avgMonthlySearches:50}}]};}});assert.equal(result.status,'ready');assert.equal(loadKeywordCache('en',now,directory).targeting.language,'en');
});
test('a failed refresh after partial endpoint success retains all prior cache bytes',async t=>{
 const directory=temp(t);savePrivate('keyword-cache-en.json',apiCache(),directory);const filename=resolve(directory,'keyword-cache-en.json'),before=readFileSync(filename,'utf8');
 const result=await collectKeywords('en',{refresh:true,now,directory,settings,call:operation=>{if(operation.endsWith('generateKeywordHistoricalMetrics'))throw Error('Historical endpoint unavailable');return {results:[{text:'video notes',keywordIdeaMetrics:{avgMonthlySearches:0}}]};}});
 assert.equal(result.status,'action-required');assert.equal(result.previousCacheRetained,true);assert.equal(readFileSync(filename,'utf8'),before);
});
