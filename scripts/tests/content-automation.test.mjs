import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, readdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { collectContent, completedPeriod, denverDate, draftPacket, parseSource, reviewMatrix, ROUTES, MAX_BYTES, TIMEOUT_MS } from '../lib/content/collector.mjs';
import { runUpdate, TRUSTED_PATHS } from '../update-content.mjs';
import { contentSources } from '../model-watch-sources.mjs';

const model = { id: 'official-model', company: 'Official Model', url: 'https://models.example/news', category: 'model', format: 'text', required: true, patterns: [/GPT[-\s]\d+/gi, /\bAstra\b/gi] };
const rss = { ...model, format: 'rss' };
const tool = { id: 'official-tool', company: 'Official Tool', url: 'https://api.github.com/repos/official/tool/releases?per_page=20', evidencePrefix: 'https://github.com/official/tool/releases/', category: 'tool', format: 'github' };
const now = new Date('2026-06-10T06:00:00Z');
const initial = { checkedAt: '2026-05-27T06:00:00.000Z', successfulSources: 0, totalSources: 1, detectedModels: ['GPT-5'] };
const feed = (name = 'GPT-6 Astra', date = 'Wed, 03 Jun 2026 12:00:00 GMT') => `<rss version="2.0"><channel><item><title>${name}</title><link>https://models.example/release</link><pubDate>${date}</pubDate></item></channel></rss>`;
const release = (extra = {}) => ({ name: 'v1.0', tag_name: 'v1.0', html_url: 'https://github.com/official/tool/releases/tag/v1.0', published_at: '2026-06-02T12:00:00Z', draft: false, prerelease: false, ...extra });
const response = (text, options) => new Response(text, options);
const run = (options = {}) => collectContent({ sources: [model], snapshot: initial, now, fetchImpl: async () => response('GPT-6 Astra', { headers: { etag: '"one"' } }), ...options });

async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lai-content-fixture-'));
  try {
    await mkdir(path.join(root, 'src/data'), { recursive: true });
    await writeFile(path.join(root, TRUSTED_PATHS[0]), `${JSON.stringify(initial)}\n`);
    await fn(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function filesUnder(root, directory = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(root, relative));
    else result.push(relative);
  }
  return result.sort();
}

async function trustedBytes(root) {
  const files = (await filesUnder(root)).filter((name) => !name.startsWith('output/'));
  return Object.fromEntries(await Promise.all(files.map(async (name) => [name, await readFile(path.join(root, name), 'utf8')])));
}

test('VAL-CONTENT-01 fixed registry, limits, GPT-6 and Astra, separate model and tool counts', async () => {
  assert.equal(MAX_BYTES, 2097152);
  assert.equal(TIMEOUT_MS, 15000);
  assert.equal(contentSources.filter(({ category }) => category === 'tool').length, 2);
  assert.ok(contentSources.find(({ company }) => company === 'OpenAI').required);
  assert.ok(contentSources.find(({ company }) => company === 'Meta AI').required);
  assert.ok(contentSources.find(({ company }) => company === 'Moonshot AI / Kimi').required);
  const openai = contentSources.find(({ company }) => company === 'OpenAI');
  const actualRss = feed('GPT-6 Astra: A new generation of intelligence').replaceAll('https://models.example/release', 'https://openai.com/index/release/');
  assert.deepEqual(parseSource(actualRss, openai).map(({ name }) => name), ['GPT-6 Astra']);
  const result = await run({ sources: [model, tool], fetchImpl: async (url) => response(url === model.url ? 'gpt-6 GPT 6 Astra' : JSON.stringify([release()])) });
  assert.equal(result.snapshot.totalSources, 1);
  assert.equal(result.snapshot.successfulSources, 1);
  assert.deepEqual(result.snapshot.detectedModels, ['Astra', 'GPT-5', 'GPT-6']);
  assert.equal(result.latest.sources[0].records.length, 2);
  assert.equal(result.latest.sources[0].records[0].kind, 'undated-detection');
  assert.equal(result.latest.sources[1].records[0].kind, 'dated-official-entry');
});

test('VAL-CONTENT-02 200 -> conditional 304 and unchanged 200 are semantic no-ops', async () => {
  const first = await run();
  const next = await run({ previous: first.latest, cache: first.cache, snapshot: first.snapshot, now: new Date('2026-06-11T06:00:00Z'), fetchImpl: async (url, options) => {
    assert.equal(url, model.url);
    assert.equal(options.headers['If-None-Match'], '"one"');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Authorization, undefined);
    return response(null, { status: 304 });
  } });
  assert.deepEqual(next.latest, first.latest);
  assert.deepEqual(next.snapshot, first.snapshot);
  assert.equal(next.packet, first.packet);
  assert.notEqual(next.health.checkedAt, first.health.checkedAt);
  const again = await run({ previous: first.latest, snapshot: first.snapshot, cache: first.cache });
  assert.deepEqual(again.latest, first.latest);
  assert.deepEqual(again.snapshot, first.snapshot);
});

test('VAL-CONTENT-02 304 missing/corrupt cache recovers once, then fails closed', async () => {
  for (const cache of [{}, { [model.id]: { records: [{ name: 'invented' }], url: model.url, etag: '"bad"' } }]) {
    let calls = 0;
    const result = await run({ cache, fetchImpl: async (_, { headers }) => {
      assert.equal(headers['If-None-Match'], undefined);
      return ++calls === 1 ? response(null, { status: 304 }) : response('GPT-6');
    } });
    assert.equal(calls, 2);
    assert.equal(result.ok, true);
  }
  let calls = 0;
  const failed = await run({ fetchImpl: async () => { calls++; return response(null, { status: 304 }); } });
  assert.equal(calls, 2);
  assert.equal(failed.ok, false);
});

test('VAL-CONTENT-02 malformed/empty/oversize/timeout sources fail without release fabrication', async () => {
  for (const options of [
    { sources: [rss], fetchImpl: async () => response('<rss>broken GPT-6') },
    { fetchImpl: async () => response('') },
    { maxBytes: 8, fetchImpl: async () => response('GPT-6'.repeat(100)) },
    { fetchImpl: async () => response('GPT-6', { status: 503 }) },
    { fetchImpl: async () => response('No supported models here') },
    { sources: [{ ...tool, required: true }], fetchImpl: async () => response('{untrusted input') },
    { timeoutMs: 5, fetchImpl: async (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Source timeout')), { once: true })) },
    { timeoutMs: 5, fetchImpl: async () => response(new ReadableStream({ start() {} })) },
  ]) {
    const result = await run(options);
    assert.equal(result.ok, false);
    assert.equal(result.health.sources[0].stale, true);
    assert.equal(result.latest.sources[0].records.length, 0);
  }
});

test('VAL-CONTENT-02 one same-origin redirect; reject other origin, credentials, second redirect', async () => {
  let calls = 0;
  const accepted = await run({ fetchImpl: async (url) => {
    calls++;
    if (calls === 1) return response(null, { status: 302, headers: { location: '/official-news' } });
    assert.equal(url, 'https://models.example/official-news');
    return response('GPT-6');
  } });
  assert.equal(accepted.ok, true);
  for (const location of ['https://evil.example/', 'http://models.example/', 'https://user:pass@models.example/', '/repeat']) {
    calls = 0;
    const result = await run({ fetchImpl: async () => { calls++; return response(null, { status: 302, headers: { location } }); } });
    assert.equal(result.ok, false);
    assert.equal(calls, location === '/repeat' ? 2 : 1);
  }
  await assert.rejects(run({ sources: [{ ...model, url: 'http://models.example/' }] }), /Unsafe/);
});

test('VAL-CONTENT-03 optional stale retains attributed records with transient health only', async () => {
  const first = await run({ sources: [model, tool], fetchImpl: async (url) => response(url === model.url ? 'GPT-6' : JSON.stringify([release()])) });
  const second = await run({ sources: [model, tool], previous: first.latest, snapshot: first.snapshot, cache: first.cache, fetchImpl: async (url) => url === model.url ? response('GPT-6') : response('', { status: 502 }) });
  assert.equal(second.ok, true);
  assert.deepEqual(second.latest, first.latest);
  assert.deepEqual(second.snapshot, first.snapshot);
  assert.equal(second.health.sources[1].stale, true);
  assert.equal(second.latest.sources[1].records[0].sourceId, tool.id);
});

test('VAL-CONTENT-02 empty text cache cannot turn 304 into a valid capture', async () => {
  const first = await run();
  const corrupt = { ...first.cache, [model.id]: { ...first.cache[model.id], records: [], recordsHash: createHash('sha256').update('[]').digest('hex') } };
  let calls = 0;
  const result = await run({ cache: corrupt, fetchImpl: async (_, { headers }) => {
    assert.equal(headers['If-None-Match'], undefined);
    return ++calls === 1 ? response(null, { status: 304 }) : response('GPT-6');
  } });
  assert.equal(calls, 2);
  assert.equal(result.ok, true);
});

test('VAL-CONTENT-02 retained captures, not transient optional health, determine snapshot count', async () => {
  const optional = { ...model, id: 'optional', url: 'https://optional.example/news', required: false };
  const sources = [model, optional];
  const first = await run({ sources, fetchImpl: async (url) => response(url === model.url ? 'GPT-6' : 'GPT-5') });
  const secondOptions = { sources, previous: first.latest, snapshot: first.snapshot, now: new Date('2026-06-11T12:00:00Z') };
  const second = await run({ ...secondOptions, fetchImpl: async (url) => url === model.url ? response('GPT-7') : response('', { status: 503 }) });
  const healthy = await run({ ...secondOptions, fetchImpl: async (url) => response(url === model.url ? 'GPT-7' : 'GPT-5') });
  const third = await run({ sources, previous: second.latest, snapshot: second.snapshot, now: new Date('2026-06-12T12:00:00Z'), fetchImpl: async (url) => response(url === model.url ? 'GPT-7' : 'GPT-5') });
  assert.deepEqual([first.snapshot.successfulSources, second.snapshot.successfulSources, third.snapshot.successfulSources], [2, 2, 2]);
  assert.deepEqual(second.snapshot, healthy.snapshot);
  assert.deepEqual(second.latest, healthy.latest);
  assert.deepEqual(third.snapshot, second.snapshot);
  assert.equal(second.health.sources[1].stale, true);
  assert.equal(third.health.sources[1].stale, false);
});

test('VAL-CONTENT-02 cached unmerged candidate retains sliding-feed evidence and snapshot timestamp', async () => {
  const first = await run();
  const second = await run({ cache: first.cache, now: new Date('2026-06-11T12:00:00Z'), fetchImpl: async () => response('GPT-6') });
  assert.deepEqual(second.snapshot, first.snapshot);
  assert.deepEqual(second.latest, first.latest);
  assert.equal(second.latest.sources[0].records.some(({ name }) => name === 'Astra'), true);
});

test('VAL-CONTENT-03 matrix routes observations, no benchmark invention or editorial verification', async () => {
  const result = await run();
  assert.deepEqual(result.latest.review.map(({ route }) => route), ROUTES);
  assert.equal(result.latest.review.find(({ route }) => route === '/leaderboard').status, 'unsupported');
  assert.equal(result.latest.review.find(({ route }) => route === '/tools').status, 'review-required');
  assert.doesNotMatch(JSON.stringify(result.latest), /"(?:score|benchmarks|verified)"/);
  const empty = await run({ sources: [tool], fetchImpl: async () => response('[]') });
  assert.equal(empty.latest.review.find(({ route }) => route === '/tools').status, 'no-observed-change');
});

test('VAL-CONTENT-03 Star Text review points to the existing main phrase source and retains pending evidence', async () => {
  const target = 'src/components/spaceBackgroundModel.ts';
  assert.deepEqual(ROUTES.filter((route) => !route.startsWith('/')), [target]);
  const modelSource = await readFile(new URL(`../../${target}`, import.meta.url), 'utf8');
  assert.match(modelSource, /export const CONSTELLATION_PHRASES = \[/);
  assert.match(modelSource, /export const EASTER_EGG_PHRASES = CONSTELLATION_PHRASES\.slice\(1\)/);
  const guide = await readFile(new URL('../../docs/content-automation.md', import.meta.url), 'utf8');
  assert.ok(guide.includes(target));
  assert.ok(guide.includes('CONSTELLATION_PHRASES'));
  const ledger = JSON.parse(await readFile(new URL('../../content/review/latest.json', import.meta.url), 'utf8'));
  const entries = ledger.review.filter((entry) => !entry.route.startsWith('/'));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].route, target);
  assert.equal(entries[0].status, 'review-required');
  assert.equal(entries[0].observation, 'detected');
  const modelEvidence = [...new Set(ledger.sources.filter(({ category }) => category === 'model')
    .flatMap(({ records }) => records.map(({ id }) => id)))].sort();
  assert.ok(modelEvidence.length > 0);
  const pendingIds = new Set(entries[0].evidenceIds);
  assert.ok(modelEvidence.every((id) => pendingIds.has(id)), 'all current model evidence remains pending');
  const retained = reviewMatrix([], [], ledger.review).find(({ route }) => route === target);
  assert.deepEqual(retained, entries[0], 'pending evidence/status survive even without new observations');
  const historicalId = 'historical-unresolved-evidence-no-longer-in-source-sample';
  const historicalPending = {
    ...entries[0],
    evidenceIds: [...new Set([...entries[0].evidenceIds, historicalId])].sort(),
  };
  const retainedHistory = reviewMatrix([], [], [historicalPending]).find(({ route }) => route === target);
  assert.deepEqual(retainedHistory, historicalPending, 'historical pending IDs outlive bounded source records');
});

test('VAL-CONTENT-03 unresolved pending evidence survives subsequent new detections', async () => {
  const first = await run({ fetchImpl: async () => response('GPT-6') });
  const second = await run({ previous: first.latest, snapshot: first.snapshot, fetchImpl: async () => response('GPT-7') });
  const pending = second.latest.review.find(({ route }) => route === '/model-watch').evidenceIds;
  assert.equal(pending.length, 2);
  assert.ok(pending.includes(first.latest.sources[0].records[0].id));
});

test('VAL-CONTENT-04 anchor, half-open window, DST, late run uses most recent complete period', () => {
  assert.equal(completedPeriod(new Date('2026-05-27T05:59:59Z')), null);
  assert.deepEqual(completedPeriod(new Date('2026-05-27T06:00:00Z')), { id: '2026-05-27', start: '2026-05-13', end: '2026-05-27', timeZone: 'America/Denver', interval: '[start,end)' });
  assert.equal(completedPeriod(new Date('2026-06-10T05:59:59Z')).id, '2026-05-27');
  assert.equal(completedPeriod(now).id, '2026-06-10');
  assert.equal(completedPeriod(new Date('2026-06-22T12:00:00Z')).id, '2026-06-10');
  assert.equal(completedPeriod(new Date('2026-11-11T06:59:59Z')).id, '2026-10-28');
  assert.equal(completedPeriod(new Date('2026-11-11T07:00:00Z')).id, '2026-11-11');
  assert.equal(denverDate(new Date('2026-11-01T06:30:00Z')), '2026-11-01');
  const period = completedPeriod(now);
  const dated = (date, name) => parseSource(JSON.stringify([release({ name, published_at: date })]), tool)[0];
  const packet = draftPacket(period, [dated('2026-05-27T06:00:00Z', 'included-start'), dated('2026-06-10T06:00:00Z', 'excluded-end'), ...parseSource('GPT-6', model)]);
  assert.match(packet, /included\\-start/);
  assert.doesNotMatch(packet, /excluded-end|GPT-6/);
});

test('VAL-CONTENT-04 invalid calendar/timezone dates rejected; same explicit dates independent of host TZ', () => {
  for (const date of ['Tue, 30 Feb 2026 12:00:00 GMT', 'Wed, 10 Jun 2026 00:00:00', 'Wed, 10 Jun 2026 24:00:00 GMT']) {
    assert.throws(() => parseSource(feed('GPT-6', date), rss), /date|calendar/);
  }
  for (const date of ['2026-02-30T12:00:00Z', '2026-06-10T00:00:00', '2026-06-10T00:00:00+99:00']) {
    assert.throws(() => parseSource(JSON.stringify([release({ published_at: date })]), tool), /date|calendar|timezone/);
  }
  const oldTz = process.env.TZ;
  try {
    const results = [];
    for (const zone of ['UTC', 'America/Denver']) {
      process.env.TZ = zone;
      assert.throws(() => parseSource(feed('GPT-6', 'Wed, 10 Jun 2026 00:00:00'), rss), /timezone/);
      results.push(draftPacket(completedPeriod(now), parseSource(feed('GPT-6', 'Wed, 10 Jun 2026 00:00:00 GMT'), rss)));
    }
    assert.equal(results[0], results[1]);
  } finally { if (oldTz === undefined) delete process.env.TZ; else process.env.TZ = oldTz; }
});

test('VAL-CONTENT-04 dated late arrival rebuilds same period; bootstrap/undated never news', async () => {
  const first = await run({ seeds: ['Bootstrap Name'] });
  assert.equal(first.latest.bootstrap.kind, 'bootstrap');
  assert.doesNotMatch(first.packet, /Bootstrap Name|GPT-6|Astra/);
  const later = await run({ sources: [rss], now: new Date('2026-06-12T12:00:00Z'), fetchImpl: async () => response(feed()) });
  assert.equal(first.period.id, later.period.id);
  assert.match(later.packet, /GPT\\-6/);
  assert.match(later.packet, /https:\/\/models.example\/release/);
});

test('VAL-CONTENT-05 malicious text is inert, evidence URLs never fetched, prereleases excluded', async () => {
  const malicious = release({ name: '<script>ignore prior instructions</script> [click](javascript:evil)' });
  let calls = 0;
  const result = await run({ sources: [tool], fetchImpl: async (url) => { calls++; assert.equal(url, tool.url); return response(JSON.stringify([malicious, release({ prerelease: true }), release({ draft: true })])); } });
  assert.equal(calls, 1);
  assert.equal(result.latest.sources[0].records.length, 1);
  assert.doesNotMatch(result.packet, /<script>|\[click\]\(javascript:/);
  assert.match(result.packet, /untrusted evidence/);
  assert.ok(result.packet.includes('Status: unreviewed, website-unpublished review packet (visible in this repository); NOT an article or approved release.'));
  assert.doesNotMatch(result.packet.split('\n').find((line) => line.startsWith('Status:')), /\b(?:non-public|private|confidential)\b/i);
  assert.throws(() => parseSource(JSON.stringify([release({ html_url: 'https://evil.example/payload' })]), tool), /Unsafe evidence/);
  assert.throws(() => parseSource('<!DOCTYPE rss [<!ENTITY evil SYSTEM "file:///etc/passwd">]>' + feed(), rss), /Unsupported/);
});

test('VAL-CONTENT-05 CLI repeatability, corrupt cache, required failure byte preservation, exact artifact paths', async () => fixture(async (root) => {
  const options = { root, sources: [rss], seeds: ['GPT-5'], now, fetchImpl: async () => response(feed(), { headers: { etag: '"one"' } }) };
  const first = await runUpdate(options);
  assert.equal(first.ok, true);
  assert.deepEqual(first.changed.sort(), [...TRUSTED_PATHS, 'content/review/biweekly/2026-06-10.md'].sort());
  const before = await trustedBytes(root);
  const second = await runUpdate({ ...options, now: new Date('2026-06-11T12:00:00Z') });
  assert.deepEqual(second.changed, []);
  assert.deepEqual(await trustedBytes(root), before);
  await writeFile(path.join(root, 'output/content-automation/cache.json'), '{broken');
  let calls = 0;
  const recovered = await runUpdate({ ...options, fetchImpl: async () => ++calls === 1 ? response(null, { status: 304 }) : response(feed()) });
  assert.equal(recovered.ok, true);
  assert.equal(calls, 2);
  const failed = await runUpdate({ ...options, fetchImpl: async () => response('', { status: 503 }) });
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.changed, []);
  assert.deepEqual(await trustedBytes(root), before);
  assert.deepEqual(await filesUnder(root), ['content/review/biweekly/2026-06-10.md', 'content/review/latest.json', 'output/content-automation/cache.json', 'output/content-automation/health.json', 'src/data/modelWatch.generated.json']);
  assert.ok(Object.keys(before).every((name) => !/src\/articles|public\/|api\/|scheduled-release/.test(name)));
}));

test('VAL-CONTENT-05 later staging/rename failure restores every trusted byte', async () => fixture(async (root) => {
  const options = { root, sources: [rss], seeds: [], now, fetchImpl: async () => response(feed()) };
  await runUpdate(options);
  const before = await trustedBytes(root);
  for (const phase of ['stageWrite', 'promoteRename']) {
    let calls = 0;
    await assert.rejects(runUpdate({ ...options, fetchImpl: async () => response(feed('GPT-7')), transactionOperations: {
      [phase]: async (...args) => { if (++calls === 2) throw new Error('Injected later filesystem failure'); return (phase === 'stageWrite' ? writeFile : rename)(...args); },
    } }), /Injected later filesystem failure/);
    assert.ok(calls >= 2);
    assert.deepEqual(await trustedBytes(root), before);
    assert.equal((await filesUnder(root)).some((name) => name.includes('transaction')), false);
  }
}));

test('VAL-CONTENT-05 unresolved crash journal blocks a new producer run', async () => fixture(async (root) => {
  await mkdir(path.join(root, 'output/content-automation'), { recursive: true });
  await writeFile(path.join(root, 'output/content-automation/transaction.json'), '{}');
  await assert.rejects(runUpdate({ root }), /Unresolved content transaction/);
}));

test('VAL-CONTENT-06 workflow exact artifacts, isolated writer, no-op checks and test registration', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/model-watch.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cron: "17 13 \* \* \*"/);
  assert.match(workflow, /push:\n    branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /'!src\/data\/modelWatch.generated.json'/);
  const pushPaths = workflow.split('    paths:')[1].split('  workflow_dispatch:')[0];
  assert.doesNotMatch(pushPaths, /content\/review|scripts\/test-suite\.mjs/);
  assert.ok(pushPaths.includes("'scripts/tests/content-*.test.mjs'"));
  assert.ok(pushPaths.includes("'scripts/local-ci.sh'"));
  assert.match(workflow, /permissions: \{\}/);
  const generator = workflow.split('  generate:')[1].split('  propose:')[0];
  const writer = workflow.split('  propose:')[1];
  assert.match(generator, /contents: read/);
  assert.doesNotMatch(generator, /contents: write|pull-requests: write/);
  assert.match(writer, /needs: generate/);
  assert.match(writer, /if: needs.generate.outputs.changed == 'true'/);
  assert.equal((workflow.match(/contents: write/g) ?? []).length, 1);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 2);
  const prohibitedWorkflow = /persist-credentials:\s*true|pull_request_target|auto-merge:\s*true/;
  assert.doesNotMatch(workflow, prohibitedWorkflow);
  for (const whitespace of [' ', '   ', '\t', '']) {
    assert.match(['persist-credentials:', `${whitespace}true`].join(''), prohibitedWorkflow);
  }
  for (const prohibited of ['pull_request_target', ['auto-merge:', 'true'].join(' ')]) {
    assert.match(prohibited, prohibitedWorkflow);
  }
  for (const step of workflow.matchAll(/uses: ([^\n]+)/g)) assert.match(step[1], /^[^@]+@[a-f0-9]{40}(?: #.*)?$/);
  const expected = ['src/data/modelWatch.generated.json', 'content/review/latest.json', 'content/review/biweekly/*.md'];
  const paths = workflow.match(/add-paths: \|\n((?: {12}[^\n]+\n?)+)/)[1].trim().split('\n').map((line) => line.trim());
  assert.deepEqual(paths, expected);
  const proposalUpload = generator.split('name: model-watch-snapshot')[1].split('if-no-files-found:')[0];
  assert.deepEqual(proposalUpload.split('path: |')[1].trim().split('\n').map((line) => line.trim()), expected);
  const allowed = /^(?:src\/data\/modelWatch\.generated\.json|content\/review\/latest\.json|content\/review\/biweekly\/\d{4}-\d{2}-\d{2}\.md)$/;
  assert.ok(writer.includes(`const allowed = ${allowed};`));
  for (const name of ['public/leak.md', 'src/articles/new.md', 'content/review/biweekly/notes.md', 'content/review/biweekly/../../leak.md', 'scripts/payload.mjs']) assert.equal(allowed.test(name), false);
  assert.match(writer, /stat.isSymbolicLink\(\)/);
  assert.match(writer, /Unexpected artifact path/);
  assert.match(generator, /run: npm run test:content/);
  assert.match(generator, /Verify changed content and site build\n        if: steps.changes.outputs.changed == 'true'/);
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.scripts['test:content'], 'node --experimental-strip-types --test scripts/tests/content-*.test.mjs');
  // Main uses local-ci, not the separate audit branch's test-suite runner.
  const localCi = await readFile(new URL('../local-ci.sh', import.meta.url), 'utf8');
  assert.equal((localCi.match(/^npm run test:content$/gm) ?? []).length, 1);
  assert.equal((localCi.match(/^npm run test:model-watch$/gm) ?? []).length, 1);
  assert.doesNotMatch(localCi, /^npm run test:(?:content-gpt6|model-watch-api)$/m);
  assert.doesNotMatch(localCi, /test-suite\.mjs/);
  await assert.rejects(readFile(new URL('../test-suite.mjs', import.meta.url)), { code: 'ENOENT' });
  const contentFiles = (await readdir(new URL('./', import.meta.url)))
    .filter((filename) => /^content-.*\.test\.mjs$/.test(filename));
  for (const filename of ['content-automation.test.mjs', 'content-gpt6.test.mjs', 'content-model-watch-api.test.mjs']) {
    assert.ok(contentFiles.includes(filename), `wildcard must cover ${filename}`);
  }
  assert.equal(new Set(contentFiles).size, contentFiles.length);
  assert.equal(manifest.scripts['test:content-gpt6'], 'node --experimental-strip-types --test scripts/tests/content-gpt6.test.mjs');
  assert.equal(manifest.scripts['test:model-watch-api'], 'node --test scripts/tests/content-model-watch-api.test.mjs');
  assert.equal(manifest.scripts['test:space-background'], 'node --experimental-strip-types --test scripts/tests/space-background.test.mjs scripts/tests/space-nebula.test.mjs');
});

test('VAL-CONTENT-06 actual workflow writer rejects size/count/depth/symlinks before any copy', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/model-watch.yml', import.meta.url), 'utf8');
  const script = workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/)[1].split('\n').map((line) => line.slice(10)).join('\n');
  for (const mode of ['valid', 'file-size', 'file-count', 'total-size', 'depth', 'unexpected', 'symlink']) {
    await fixture(async (root) => {
      const proposal = path.join(root, 'proposal');
      const checkout = path.join(root, 'checkout');
      await mkdir(path.join(proposal, 'src/data'), { recursive: true });
      await mkdir(path.join(proposal, 'content/review/biweekly'), { recursive: true });
      await mkdir(checkout);
      await writeFile(path.join(proposal, 'src/data/modelWatch.generated.json'), '{}');
      await writeFile(path.join(proposal, 'content/review/latest.json'), '{}');
      if (mode === 'file-size') await writeFile(path.join(proposal, 'content/review/latest.json'), ' '.repeat(2 * 1024 * 1024 + 1));
      if (mode === 'depth') await mkdir(path.join(proposal, 'one/two/three/four'), { recursive: true });
      if (mode === 'unexpected') await writeFile(path.join(proposal, 'payload.mjs'), 'throw new Error("must never execute")');
      if (mode === 'symlink') {
        await writeFile(path.join(root, 'outside.md'), 'must not cross artifact boundary');
        await symlink(path.join(root, 'outside.md'), path.join(proposal, 'content/review/biweekly/2026-06-10.md'));
      }
      if (mode === 'file-count' || mode === 'total-size') {
        const count = mode === 'file-count' ? 65 : 33;
        for (let index = 0; index < count; index++) {
          const name = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
          await writeFile(path.join(proposal, `content/review/biweekly/${name}.md`), mode === 'total-size' ? ' '.repeat(256 * 1024) : 'brief');
        }
      }
      const result = spawnSync(process.execPath, ['--input-type=module'], { input: script, cwd: checkout, env: { PROPOSAL_ROOT: proposal }, encoding: 'utf8' });
      if (mode === 'valid') {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(await filesUnder(checkout), ['content/review/latest.json', 'src/data/modelWatch.generated.json']);
      } else {
        assert.notEqual(result.status, 0, mode);
        assert.deepEqual(await filesUnder(checkout), [], mode);
      }
    });
  }
});

test('VAL-CONTENT-04 generated September 2 packet equals offline rendering and discloses repository visibility', async () => {
  const ledger = JSON.parse(await readFile(new URL('../../content/review/latest.json', import.meta.url), 'utf8'));
  const packet = await readFile(new URL('../../content/review/biweekly/2026-09-02.md', import.meta.url), 'utf8');
  const period = completedPeriod(new Date('2026-09-02T00:00:00-06:00'));
  assert.equal(period.id, '2026-09-02');
  assert.equal(packet, draftPacket(period, ledger.sources.flatMap(({ records }) => records)));
  assert.ok(packet.includes('Status: unreviewed, website-unpublished review packet (visible in this repository); NOT an article or approved release.'));
  assert.doesNotMatch(packet.split('\n').find((line) => line.startsWith('Status:')), /\b(?:non-public|private|confidential)\b/i);
});

test('VAL-CONTENT-01 generated rollout preserves full GPT-6 Astra, never the provisional bare suffix', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../../src/data/modelWatch.generated.json', import.meta.url), 'utf8'));
  const ledger = JSON.parse(await readFile(new URL('../../content/review/latest.json', import.meta.url), 'utf8'));
  assert.ok(snapshot.detectedModels.includes('GPT-6 Astra'));
  assert.ok(!snapshot.detectedModels.includes('Astra'));
  const openaiRecords = ledger.sources.find(({ id }) => id === 'openai').records;
  assert.ok(openaiRecords.some(({ name }) => name === 'GPT-6 Astra'));
  assert.ok(!openaiRecords.some(({ name }) => name === 'Astra'));
});

test('VAL-CONTENT-05 malformed trusted content fails before trusted writes', async () => fixture(async (root) => {
  await mkdir(path.join(root, 'content/review'), { recursive: true });
  await writeFile(path.join(root, 'content/review/latest.json'), '{malformed');
  const before = await trustedBytes(root);
  await assert.rejects(runUpdate({ root, sources: [model], now, fetchImpl: async () => response('GPT-6') }), /Invalid local JSON/);
  assert.deepEqual(await trustedBytes(root), before);
}));
