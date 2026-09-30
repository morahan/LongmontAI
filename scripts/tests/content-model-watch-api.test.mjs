import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getEventListeners } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createModelWatchHandler, MODEL_WATCH_SOURCE_TIMEOUT_MS, MODEL_WATCH_SOURCE_MAX_BYTES } from '../../api/model-watch.mjs';
import { modelWatchSources, seedModels } from '../model-watch-sources.mjs';

const secret = 'fixture-only-cron-value';
const source = { url: 'https://fixture.invalid/feed', patterns: [/GPT[-\s]\d+/gi] };
const checkedAt = '2026-09-25T12:00:00.000Z';
const request = { method: 'GET', headers: { authorization: `Bearer ${secret}` } };
function handler(options = {}) {
  return createModelWatchHandler({ env: { CRON_SECRET: secret }, watchSources: [source], now: () => new Date(checkedAt), ...options });
}
async function invoke(run, req = request) {
  const result = { headers: {}, calls: 0 };
  await run(req, {
    setHeader(key, value) { result.headers[key.toLowerCase()] = value; },
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; result.calls++; return this; },
  });
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.calls, 1);
  assert.ok(!JSON.stringify(result).includes(secret), 'credential must never appear in response');
  return result;
}
function bodyReader(read) {
  const state = { reads: 0, cancels: 0, releases: 0 };
  return { state, response: { ok: true, body: { getReader: () => ({
    read() { state.reads++; return read(state.reads); },
    async cancel() { state.cancels++; },
    releaseLock() { state.releases++; },
  }) } } };
}
const chunk = (text) => ({ done: false, value: new TextEncoder().encode(text) });

test('live endpoint rejects every non-GET method before auth or upstream work', async () => {
  const run = handler({ fetchImpl: () => assert.fail('unexpected fetch') });
  for (const method of ['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE', 'CONNECT', 'get', undefined]) {
    const result = await invoke(run, { method });
    assert.equal(result.status, 405);
    assert.equal(result.headers.allow, 'GET');
    assert.deepEqual(result.body, { ok: false, error: 'method_not_allowed' });
  }
});

test('auth fails closed for missing configuration and malformed credentials; Headers works', async () => {
  for (const env of [{}, { CRON_SECRET: '' }, { CRON_SECRET: 123 }, { CRON_SECRET: secret }]) {
    for (const authorization of [undefined, '', 'Bearer wrong', `bearer ${secret}`, `Bearer ${secret} `]) {
      const result = await invoke(handler({ env, fetchImpl: () => assert.fail('unauthorized fetch') }), { method: 'GET', headers: { authorization } });
      assert.equal(result.status, 401);
      assert.deepEqual(result.body, { ok: false, error: 'unauthorized' });
    }
  }
  for (const env of [{}, { CRON_SECRET: '' }, { CRON_SECRET: 123 }]) {
    const result = await invoke(handler({ env, fetchImpl: () => assert.fail('unconfigured fetch') }));
    assert.equal(result.status, 401);
  }
  const result = await invoke(handler({ fetchImpl: async () => new Response('GPT 99') }), { method: 'GET', headers: new Headers(request.headers) });
  assert.equal(result.status, 200);
  assert.ok(result.body.detectedModels.includes('GPT-99'));
});

test('live sources produce fresh sorted deduplicated public shape without forwarding credentials or request URLs', async () => {
  const seen = [];
  const result = await invoke(handler({ watchSources: modelWatchSources, fetchImpl: async (url, options) => {
    seen.push(url);
    assert.deepEqual(Object.keys(options), ['signal']);
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(`GPT 99 GPT-99 private upstream text ${secret}`);
  } }), { ...request, url: '/api/model-watch?url=https://untrusted.invalid', body: { url: 'https://untrusted.invalid' } });
  assert.deepEqual(seen, modelWatchSources.map(({ url }) => url));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    checkedAt, successfulSources: modelWatchSources.length, totalSources: modelWatchSources.length,
    detectedModels: [...new Set([...seedModels, 'GPT-99'])].sort((a, b) => a.localeCompare(b)),
  });
});

test('upstream errors remain private and unsuccessful responses cancel their bodies', async () => {
  let cancels = 0;
  let calls = 0;
  const result = await invoke(handler({ watchSources: [source, source, source], fetchImpl: async () => {
    calls++;
    if (calls === 1) throw new Error(`private ${secret}`);
    if (calls === 2) return { ok: false, body: { async cancel() { cancels++; } } };
    return new Response('GPT 99');
  } }));
  assert.equal(calls, 3);
  assert.equal(cancels, 1);
  assert.equal(result.body.successfulSources, 1);
  assert.equal(result.body.totalSources, 3);
  assert.ok(!JSON.stringify(result).includes('private'));
});

test('source byte limit accepts exact UTF-8 boundary, rejects overflow, and cleans up readers', async () => {
  assert.equal(MODEL_WATCH_SOURCE_MAX_BYTES, 512 * 1024);
  assert.equal(MODEL_WATCH_SOURCE_TIMEOUT_MS, 12_000);
  for (const limit of [8, 7]) {
    const fixture = bodyReader((i) => Promise.resolve(i === 1 ? chunk('GPT 99é') : { done: true }));
    const result = await invoke(handler({ sourceMaxBytes: limit, fetchImpl: async () => fixture.response }));
    assert.equal(result.body.successfulSources, limit === 8 ? 1 : 0);
    assert.equal(fixture.state.cancels, limit === 8 ? 0 : 1);
    assert.equal(fixture.state.releases, 1);
  }
});

test('already-expired source signal prevents any read and cancels/releases reader', async () => {
  const fixture = bodyReader(() => Promise.resolve({ done: true }));
  const result = await invoke(handler({ sourceTimeoutMs: 1, fetchImpl: async (_url, { signal }) => {
    await delay(20);
    assert.equal(signal.aborted, true);
    return fixture.response;
  } }));
  assert.equal(result.body.successfulSources, 0);
  assert.deepEqual(fixture.state, { reads: 0, cancels: 1, releases: 1 });
});

test('timeout interrupts pending read, cancels/releases it, and removes abort listener', { timeout: 2000 }, async () => {
  let signal;
  const fixture = bodyReader(() => new Promise(() => {}));
  // AbortSignal.timeout is unref'ed; keep the test process alive, not the handler.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const result = await invoke(handler({ sourceTimeoutMs: 10, fetchImpl: async (_url, options) => {
      signal = options.signal;
      return fixture.response;
    } }));
    assert.equal(result.body.successfulSources, 0);
    assert.deepEqual(fixture.state, { reads: 1, cancels: 1, releases: 1 });
    assert.equal(getEventListeners(signal, 'abort').length, 0);
  } finally { clearInterval(keepAlive); }
});

test('successful and rejected reads release locks and leave no accumulated abort listeners', async () => {
  for (const reject of [false, true]) {
    let signal;
    const fixture = bodyReader((i) => {
      assert.ok(getEventListeners(signal, 'abort').length <= 1, 'listeners must not accumulate between chunks');
      if (reject) return Promise.reject(new Error(`private ${secret}`));
      return Promise.resolve(i <= 20 ? chunk('GPT 99 ') : { done: true });
    });
    const result = await invoke(handler({ fetchImpl: async (_url, options) => {
      signal = options.signal;
      return fixture.response;
    } }));
    assert.equal(result.body.successfulSources, reject ? 0 : 1);
    assert.equal(fixture.state.releases, 1);
    assert.equal(getEventListeners(signal, 'abort').length, 0);
  }
});
