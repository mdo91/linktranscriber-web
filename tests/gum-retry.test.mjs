import test from 'node:test';
import assert from 'node:assert/strict';
import { createGumReader } from '../scripts/growth/gum.mjs';

const operation = 'searchconsole.searchanalytics.query';
const args = { siteUrl: 'https://linktranscriber.com/', body: { startDate: '2026-10-01', endDate: '2026-10-28' } };
const cancelled = () => ({ status: 1, signal: null, stdout: '', stderr: JSON.stringify({ error_code: 'CANCELLED', machine_envelope: { error_code: 'CANCELLED', message: 'operation cancelled' }, message: 'operation cancelled' }) });
const success = () => ({ status: 0, signal: null, stdout: JSON.stringify({ data: { rows: [{ clicks: 1 }] } }), stderr: '' });
function reader(responses, { onWait, onExecute } = {}) {
  const calls = [], waits = [];
  const read = createGumReader({ execute: (binary, argv, options) => { calls.push({ binary, argv, options }); onExecute?.(); return responses[Math.min(calls.length - 1, responses.length - 1)]; }, wait: async delay => { waits.push(delay); onWait?.(); }, clock: () => 10000 });
  return { read, calls, waits };
}
test('structured Search Console cancellation retries the identical read once and returns recovered data', async () => {
  const f = reader([cancelled(), success()]);
  assert.deepEqual(await f.read(operation, args), { rows: [{ clicks: 1 }] }); assert.equal(f.calls.length, 2); assert.deepEqual(f.waits, [2000]);
  assert.deepEqual(f.calls[0], f.calls[1]); assert.equal(f.calls[0].argv[2], 'read'); assert.equal(f.calls[0].options.timeout, 90000);
  assert.equal(f.calls[0].argv[1], 'damas-searchconsole'); assert.equal(f.calls[0].argv[3], operation);
});
test('permanent cancellation uses at most three attempts with the existing bounded backoff', async () => {
  const f = reader([cancelled()]); await assert.rejects(f.read(operation, args), /CANCELLED/);
  assert.equal(f.calls.length, 3); assert.deepEqual(f.waits, [2000, 4000]);
});
test('successful raw arrays and wrapped responses retain their original reader result', async () => {
  for (const payload of [[{ clicks: 1 }], { data: [{ clicks: 1 }] }, { rows: [] }]) {
    const f = reader([{ status: 0, signal: null, stderr: '', stdout: JSON.stringify(payload) }]);
    assert.deepEqual(await f.read(operation, args), payload.data || payload); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
  }
});
test('URL inspection is also an allowlisted read while writes and other properties never execute', async () => {
  const f = reader([cancelled(), success()]); await f.read('searchconsole.urlInspection.index.inspect', { body: { siteUrl: args.siteUrl, inspectionUrl: args.siteUrl + 'guides/' } }); assert.equal(f.calls.length, 2);
  for (const [name, input] of [['searchconsole.sitemaps.submit', args], ['googleads.campaigns.mutate', {}], [operation, { siteUrl: 'https://other.example/' }]]) {
    const stopped = reader([cancelled()]); await assert.rejects(stopped.read(name, input), /allowlist|outside/); assert.equal(stopped.calls.length, 0); assert.deepEqual(stopped.waits, []);
  }
});
test('cancellation is recognized from exact structured codes, not an arbitrary message or malformed envelope', async () => {
  for (const stderr of ['operation cancelled', 'CANCELLED', '{"error_code":"CANCELLED"', JSON.stringify({ message: 'CANCELLED' }), JSON.stringify({ error_code: 'cancelled' })]) {
    const f = reader([{ status: 1, signal: null, stderr, stdout: '' }]); await assert.rejects(f.read(operation, args)); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
  }
  const f = reader([{ status: 0, signal: null, stderr: '', stdout: JSON.stringify({ error: { error_code: 'CANCELLED', message: 'operation cancelled' } }) }, success()]);
  assert.deepEqual(await f.read(operation, args), { rows: [{ clicks: 1 }] }); assert.equal(f.calls.length, 2);
});
test('authentication or permission failures are not retried even when mixed with transient wording', async () => {
  for (const payload of [{ error_code: 'UNAUTHENTICATED', message: 'UNAVAILABLE: sign-in required' }, { error_code: 'PERMISSION_DENIED', message: 'temporarily unavailable' }, { error_code: 'CANCELLED', machine_envelope: { error_code: 'INVALID_GRANT' }, message: 'operation cancelled' }, { error_code: 'CANCELLED', message: 'HTTP 403 permission denied' }]) {
    const f = reader([{ status: 1, signal: null, stdout: '', stderr: JSON.stringify(payload) }]); await assert.rejects(f.read(operation, args)); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
  }
});
test('existing unavailable and exhausted retries remain bounded without enabling cancellation retries for Ads', async () => {
  const ads = 'googleads.keywordPlanIdeas.generateKeywordIdeas', targeting = { geoTargetConstants: [], keywordPlanNetwork: 'GOOGLE_SEARCH', language: 'languageConstants/1000' };
  for (const message of ['RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'HTTP 503', 'temporarily unavailable']) {
    const f = reader([{ status: 1, signal: null, stdout: '', stderr: message }]); await assert.rejects(f.read(ads, targeting)); assert.equal(f.calls.length, 3); assert.equal(f.waits.filter(delay => delay === 2000 || delay === 4000).length, 2);
  }
  const f = reader([cancelled()]); await assert.rejects(f.read(ads, targeting)); assert.equal(f.calls.length, 1);
});
test('signals, timeout, explicit user cancellation and caller abort never reissue the request', async () => {
  for (const extra of [{ signal: 'SIGTERM' }, { signal: 'SIGINT' }, { status: 130 }, { status: 137 }, { status: 143 }, { error: Object.assign(new Error('spawnSync ETIMEDOUT'), { code: 'ETIMEDOUT' }) }, { error: Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }) }, { stderr: JSON.stringify({ error_code: 'CANCELLED', message: 'Operation cancelled by user' }) }]) {
    const f = reader([{ ...cancelled(), ...extra }]); await assert.rejects(f.read(operation, args)); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
  }
  const before = new AbortController(); before.abort(); const stopped = reader([success()]); await assert.rejects(stopped.read(operation, args, { signal: before.signal }), { name: 'AbortError' }); assert.equal(stopped.calls.length, 0);
  const between = new AbortController(), retry = reader([cancelled(), success()], { onWait: () => between.abort() }); await assert.rejects(retry.read(operation, args, { signal: between.signal }), { name: 'AbortError' }); assert.equal(retry.calls.length, 1);
  const during = new AbortController(), running = reader([cancelled(), success()], { onExecute: () => during.abort() }); await assert.rejects(running.read(operation, args, { signal: during.signal }), { name: 'AbortError' }); assert.equal(running.calls.length, 1); assert.deepEqual(running.waits, []);
});
