import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const handlerSource = await readFile(new URL('../../api/model-watch.mjs', import.meta.url), 'utf8');
const deployedBytes = await readFile(new URL('../../src/data/modelWatch.generated.json', import.meta.url), 'utf8');
const deployed = JSON.parse(deployedBytes);
const valid = { checkedAt: '2020-02-29T12:34:56.789Z', successfulSources: 1, totalSources: 2, detectedModels: ['GPT-6 Astra'] };
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE', 'CONNECT', 'get', null];

// Every fixture starts a fresh Node module graph, containing only the exact
// handler source and its packaged JSON. No registry/producer is available.
// Trap fetch and filesystem mutation BEFORE importing the endpoint, including
// cold-start activity; parent fixture setup/cleanup is outside these traps.
const child = `
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
let fetches = 0;
let writes = 0;
globalThis.fetch = () => { fetches++; throw new Error('Forbidden upstream fetch'); };
const mutations = ['writeFile', 'appendFile', 'mkdir', 'mkdtemp', 'rename', 'rm', 'rmdir', 'unlink', 'copyFile', 'cp', 'truncate', 'chmod', 'chown', 'link', 'symlink', 'utimes', 'write', 'writev', 'createWriteStream'];
for (const name of mutations) {
  for (const target of [fs, fsp]) {
    if (typeof target[name] === 'function') target[name] = () => { writes++; throw new Error('Forbidden file mutation'); };
  }
  if (typeof fs[name + 'Sync'] === 'function') fs[name + 'Sync'] = () => { writes++; throw new Error('Forbidden file mutation'); };
}
// Node's module loader opens files for reading. Permit only read-only opens;
// write/create/truncate flags must still trip the cold-start mutation counter.
for (const [target, name] of [[fs, 'open'], [fs, 'openSync'], [fsp, 'open']]) {
  const original = target[name];
  target[name] = (filename, flags, ...args) => {
    const writable = typeof flags === 'number'
      ? Boolean(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND))
      : !['r', 'rs'].includes(flags);
    if (writable) { writes++; throw new Error('Forbidden writable open'); }
    return original.call(target, filename, flags, ...args);
  };
}
syncBuiltinESMExports();
const { default: handler } = await import(pathToFileURL(process.cwd() + '/api/model-watch.mjs'));
const responses = [];
for (const method of ${JSON.stringify(methods)}) {
  const request = method === null ? {} : { method };
  Object.defineProperty(request, 'url', { get() { throw new Error('Query must not be read or trigger refresh'); } });
  Object.defineProperty(request, 'body', { get() { throw new Error('Body must not be read'); } });
  const result = { method, headers: {}, status: null, body: null, calls: 0, ended: false };
  const response = {
    setHeader(key, value) { result.headers[key.toLowerCase()] = value; },
    status(code) { result.status = code; return this; },
    json(value) { result.body = value; result.serialized = JSON.stringify(value); result.calls++; result.ended = true; return this; },
    end() { result.ended = true; return this; },
  };
  await handler(request, response);
  responses.push(result);
}
process.stdout.write(JSON.stringify({ fetches, writes, responses }));
`;

async function coldStart(bytes) {
  const root = await mkdtemp(path.join(tmpdir(), 'lai-model-watch-api-'));
  try {
    await mkdir(path.join(root, 'api'), { recursive: true });
    await mkdir(path.join(root, 'src/data'), { recursive: true });
    await writeFile(path.join(root, 'api/model-watch.mjs'), handlerSource);
    const snapshotPath = path.join(root, 'src/data/modelWatch.generated.json');
    if (bytes !== null) await writeFile(snapshotPath, bytes);
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      cwd: root, input: child, encoding: 'utf8', timeout: 15_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    const actual = JSON.parse(result.stdout);
    assert.equal(actual.fetches, 0, 'including cold start and unsupported methods');
    assert.equal(actual.writes, 0, 'no producer or filesystem mutation');
    assert.equal(await readFile(path.join(root, 'api/model-watch.mjs'), 'utf8'), handlerSource);
    assert.deepEqual(await readdir(root), ['api', 'src']);
    if (bytes !== null) assert.equal(await readFile(snapshotPath, 'utf8'), bytes);
    else assert.deepEqual(await readdir(path.dirname(snapshotPath)), []);
    return actual.responses;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function assertUnsupported(result) {
  assert.equal(result.status, 405);
  assert.equal(result.calls, 1);
  assert.equal(result.ended, true);
  assert.deepEqual(result.headers, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    allow: 'GET, HEAD',
  });
  assert.deepEqual(result.body, { ok: false, error: 'method_not_allowed' });
}

function assertSuccess(responses, expected) {
  assert.deepEqual(responses.map(({ method }) => method), methods);
  for (const result of responses) {
    if (!['GET', 'HEAD'].includes(result.method)) { assertUnsupported(result); continue; }
    assert.equal(result.status, 200);
    assert.equal(result.ended, true);
    assert.deepEqual(result.headers, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    });
    if (result.method === 'HEAD') {
      assert.equal(result.calls, 0);
      assert.equal(result.body, null);
      assert.equal(result.serialized, undefined);
    } else {
      assert.equal(result.calls, 1);
      assert.deepEqual(result.body, expected);
      assert.equal(result.serialized, JSON.stringify(expected), 'exact public JSON semantics/order, without fresh fields');
    }
  }
}

function assertUnavailable(responses) {
  for (const result of responses) {
    if (!['GET', 'HEAD'].includes(result.method)) { assertUnsupported(result); continue; }
    assert.equal(result.status, 503);
    assert.equal(result.ended, true);
    assert.deepEqual(result.headers, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    if (result.method === 'HEAD') {
      assert.equal(result.calls, 0);
      assert.equal(result.body, null);
      assert.equal(result.serialized, undefined);
    } else {
      assert.equal(result.calls, 1);
      assert.deepEqual(result.body, { ok: false, error: 'snapshot_unavailable' });
      assert.equal(result.serialized, '{"ok":false,"error":"snapshot_unavailable"}');
    }
  }
}

test('deployed snapshot GET is exact; HEAD is bodyless; other methods narrow to 405 without I/O', async () => {
  assertSuccess(await coldStart(deployedBytes), deployed);
  assert.equal(await readFile(new URL('../../src/data/modelWatch.generated.json', import.meta.url), 'utf8'), deployedBytes);
});

test('old valid capture time and zero/partial counts are retained without invented current health', async () => {
  for (const data of [valid, { ...valid, successfulSources: 0, totalSources: 0, detectedModels: [] }]) {
    assertSuccess(await coldStart(JSON.stringify(data)), data);
  }
});

test('missing or syntactically malformed packaged snapshot returns only generic uncached unavailable response', async () => {
  for (const bytes of [null, '', '{broken-json', '{"checkedAt":']) assertUnavailable(await coldStart(bytes));
});

test('invalid snapshot schema fails closed in isolated cold starts', async () => {
  for (const data of [null, [], 'snapshot', 7, {}, { ...valid, extra: 'private-internal-value' }, { ...valid, detectedModels: undefined }]) {
    assertUnavailable(await coldStart(JSON.stringify(data)));
  }
});

test('invalid or ambiguous timestamps fail closed instead of normalizing into fabricated dates', async () => {
  for (const checkedAt of [null, 42, '', 'not-a-date', '2026-02-30T00:00:00.000Z', '2026-09-06', '2026-09-06T12:00:00.000', '2026-09-06T24:00:00.000Z']) {
    assertUnavailable(await coldStart(JSON.stringify({ ...valid, checkedAt })));
  }
});

test('invalid counts fail closed rather than exposing transient or nonsensical health', async () => {
  for (const counts of [
    { successfulSources: -1 }, { totalSources: -1 }, { successfulSources: 3 },
    { successfulSources: 0.5 }, { totalSources: 1.5 }, { successfulSources: '1' },
    { totalSources: null }, { totalSources: Number.MAX_SAFE_INTEGER + 1 },
  ]) assertUnavailable(await coldStart(JSON.stringify({ ...valid, ...counts })));
});

test('invalid model names fail closed without leaking snapshot content', async () => {
  for (const detectedModels of ['GPT-6 Astra', null, [null], [1], [{}], [''], ['  '], [' GPT-6'], ['GPT-6\nAstra'], ['x'.repeat(201)]]) {
    assertUnavailable(await coldStart(JSON.stringify({ ...valid, detectedModels })));
  }
});

test('endpoint dependency surface is only the packaged artifact, never env, producer or explicit file operations', () => {
  assert.deepEqual([...handlerSource.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]), ['../src/data/modelWatch.generated.json']);
  assert.doesNotMatch(handlerSource, /\bfrom\s*['"]|\bfetch\s*\(|process\s*(?:\.|\[)|\b(?:readFile|writeFile|runUpdate|collectContent)\s*\(/);
});
