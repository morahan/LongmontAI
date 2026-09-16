import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createNewsletterSubscribeHandler } from '../../scripts/lib/newsletter/subscribe-handler.mjs';
import { createNewsletterGenerateHandler } from '../../scripts/lib/newsletter/generate-handler.mjs';
import { modelWatchSources } from '../model-watch-sources.mjs';
import { collectWebsiteSignals, createCuratedNewsletterDraft, deterministicDraftFromSignals } from '../../scripts/lib/newsletter/curation.mjs';
import { createListmonkCampaign, createNewsletterIssue, sendResendNotification, isValidEmail, readJsonBody } from '../../scripts/lib/newsletter/shared.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function responseHarness() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function request(body, headers = {}) {
  return {
    method: 'POST',
    headers,
    body,
  };
}

function bodyRepresentations(body) {
  const json = JSON.stringify(body);
  return [
    ['object', () => request(body)],
    ['string', () => request(json)],
    ['Buffer', () => request(Buffer.from(json))],
    ['stream', () => ({
      method: 'POST', headers: {},
      async *[Symbol.asyncIterator]() {
        // Single-byte chunks also exercise split UTF-8 sequences.
        for (const byte of Buffer.from(json)) yield Buffer.from([byte]);
      },
    })],
  ];
}

async function assertRejectedBeforeProvider(req, status, error) {
  let calls = 0;
  const handler = createNewsletterSubscribeHandler({
    env: {},
    fetchImpl: async () => { calls += 1; throw new Error('network forbidden'); },
  });
  const response = responseHarness();
  await handler(req, response);
  assert.equal(response.statusCode, status);
  const messages = {
    body_too_large: 'Request body is too large.',
    invalid_json: 'Request body must be a valid JSON object.',
    invalid_email: 'Enter a valid email address.',
  };
  assert.deepEqual(response.body, { ok: false, error, message: messages[error] });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(calls, 0);
}

test('A-01 body limit counts UTF-8 bytes at the exact boundary for every representation', async () => {
  for (const multibyte of [false, true]) {
    for (const size of [4095, 4096, 4097]) {
      const body = { email: 'test@example.com', name: '' };
      const remaining = size - Buffer.byteLength(JSON.stringify(body));
      body.name = multibyte ? 'é'.repeat(Math.floor(remaining / 2)) + 'x'.repeat(remaining % 2) : 'x'.repeat(remaining);
      assert.equal(Buffer.byteLength(JSON.stringify(body)), size);
      for (const [format, makeRequest] of bodyRepresentations(body)) {
        if (size <= 4096) {
          assert.deepEqual(await readJsonBody(makeRequest()), body, `${format}: ${size} bytes`);
        } else {
          await assert.rejects(readJsonBody(makeRequest()), { status: 413, code: 'body_too_large' });
          await assertRejectedBeforeProvider(makeRequest(), 413, 'body_too_large');
        }
      }
    }
  }
});

test('A-01 oversized fields are rejected before normalization, honeypot or provider work', async () => {
  for (const field of ['email', 'name', 'company']) {
    const body = { email: 'test@example.com', [field]: 'a@' + 'a.'.repeat(8192) + '<' };
    for (const [, makeRequest] of bodyRepresentations(body)) {
      await assertRejectedBeforeProvider(makeRequest(), 413, 'body_too_large');
    }
  }
});

test('A-01 rejects invalid parsed-body shapes consistently before provider work', async () => {
  for (const body of [null, [], ['test@example.com'], 123, true, 'test@example.com']) {
    // A raw string is a JSON wire body; test scalar strings through encoded JSON.
    for (const [format, makeRequest] of bodyRepresentations(body)) {
      if (format === 'object' && typeof body === 'string') continue;
      await assertRejectedBeforeProvider(makeRequest(), 400, 'invalid_json');
    }
  }
  const cyclic = {};
  cyclic.self = cyclic;
  for (const body of [cyclic, new Date(0), new Uint8Array([1]), { count: 1n }]) {
    await assertRejectedBeforeProvider(request(body), 400, 'invalid_json');
  }
  await assertRejectedBeforeProvider(request('{broken'), 400, 'invalid_json');
  assert.deepEqual(await readJsonBody(request('')), {});
  assert.deepEqual(await readJsonBody(request({})), {});
});

test('A-01 email length guard precedes regex evaluation without truncation', (t) => {
  const asciiBoundary = 'a'.repeat(242) + '@example.com';
  const utf8Boundary = 'é'.repeat(121) + '@example.com';
  assert.equal(Buffer.byteLength(asciiBoundary), 254);
  assert.equal(Buffer.byteLength(utf8Boundary), 254);
  assert.equal(isValidEmail(asciiBoundary), true);
  assert.equal(isValidEmail(utf8Boundary), true);
  const regex = t.mock.method(RegExp.prototype, 'test', () => {
    throw new Error('oversized email must not reach regex');
  });
  try {
    for (const email of [asciiBoundary + 'a', utf8Boundary + 'a', 'a@' + 'a.'.repeat(16384) + '<', null, {}]) {
      assert.equal(isValidEmail(email), false);
    }
    assert.equal(regex.mock.callCount(), 0);
  } finally {
    regex.mock.restore();
  }
});

test('A-01 bounded malformed domains and overlong emails never reach a provider', async () => {
  for (const email of ['a@' + 'a.'.repeat(120) + '<', 'a@' + 'a.'.repeat(500) + '<', 'a'.repeat(243) + '@example.com', 'é'.repeat(122) + '@example.com']) {
    for (const [, makeRequest] of bodyRepresentations({ email })) {
      await assertRejectedBeforeProvider(makeRequest(), 400, 'invalid_email');
    }
  }
});

test('C3 generated recap obeys embargo, strict data validation, promotion and package boundaries', async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'newsletter-c3-'));
  const generatedDir = path.join(fixture, 'src/generated/scheduled-release');
  const articleDir = path.join(fixture, 'src/articles');
  const publishAt = '2026-09-02T11:30:00-06:00';
  const instant = Date.parse(publishAt);
  const id = 'edition-2026-09-02-generated-sentinel';
  const url = `https://longmontai.com/edition/${id}`;
  const raw = `---\nid: ${id}\ndate: 2026-09-02\npublishAt: ${publishAt}\nstatus: scheduled\ntitle: Generated sentinel title\nsummary: Generated sentinel summary\n---\n## Generated sentinel heading\nhttps://example.invalid/generated-sentinel\n`;
  const descriptor = {
    schemaVersion: 1, editionId: id, publishAt, publishAtMs: instant,
    releaseRevision: 'private-revision-sentinel',
    source: { manifest: '../../private-manifest-sentinel', article: '../../private-article-sentinel', assetRoot: '../../private-media-sentinel' },
    article: { file: 'article.md', sha256: createHash('sha256').update(raw).digest('hex') },
    media: { hidden: { file: '../../private-media-sentinel' } },
  };
  const wrapper = (value) => `// Generated by scripts/stage-scheduled-release.mjs. Do not edit.\nconst release = Object.freeze(${JSON.stringify(value, null, 2)});\n\nexport default release;\n`;
  const writeGenerated = async (value = descriptor, article = raw) => {
    await mkdir(generatedDir, { recursive: true });
    await writeFile(path.join(generatedDir, 'server.mjs'), wrapper(value));
    await writeFile(path.join(generatedDir, 'article.md'), article);
  };
  const offline = { root: fixture, fetchLiveSources: false, fetchImpl: async () => { throw new Error('network forbidden'); } };
  const signalsAt = (time) => collectWebsiteSignals({ ...offline, now: new Date(time) });
  const assertExcluded = (value) => assert.doesNotMatch(JSON.stringify(value), /generated-sentinel|Generated sentinel|private-.*sentinel/);
  const assertMinimal = (value) => assert.doesNotMatch(JSON.stringify(value), /private-.*sentinel|scheduled-release|sha256|releaseRevision|assetRoot/);
  try {
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, '2026.08.19-old.md'), '---\nid: edition-old\ndate: 2026-08-19\ntitle: Older static\nsummary: Older summary\n---\nOld body\n');
    await writeGenerated();
    await t.test('T-1/T/T+1 and actual AI input have no pre-publication egress', async () => {
      for (const offset of [-1, 0, 1]) {
        const now = new Date(instant + offset);
        const signals = await signalsAt(now);
        const fallback = deterministicDraftFromSignals(signals, { now });
        let prompt;
        const draft = await createCuratedNewsletterDraft({
          ...offline, now, env: { OPENAI_API_KEY: 'test-only-placeholder' },
          fetchImpl: async (_url, options) => {
            prompt = JSON.parse(options.body).input;
            return Response.json({ output_text: JSON.stringify({
              subject: 'Candidate', preheader: 'Candidate', summary: 'Candidate',
              items: [{ category: 'breakthroughs', title: 'Candidate', synthesis: 'Candidate', sourceName: 'Edition', sourceUrl: url, score: 80 }],
            }) });
          },
        });
        if (offset < 0) {
          for (const value of [signals, fallback, draft, prompt]) assertExcluded(value);
          assert.equal(draft.usedAi, false, 'future URL cannot enter through model attribution');
          assert.equal(fallback.items[2].title, 'Older static');
        } else {
          assert.equal(signals.website.recentArticles.filter((article) => article.id === id).length, 1);
          assert.equal(fallback.items[2].title, 'Generated sentinel title');
          assert.equal(fallback.items[2].sourceUrl, url);
          assert.equal(draft.usedAi, true);
          assertMinimal(signals);
          assertMinimal(draft);
        }
      }
      await assert.rejects(signalsAt(NaN), /Invalid newsletter collection clock/);
    });

    await t.test('missing, malformed, mismatched and oversized generated inputs fail closed', async () => {
      const cases = [
        async () => rm(path.join(generatedDir, 'server.mjs')),
        async () => rm(path.join(generatedDir, 'article.md')),
        async () => writeFile(path.join(generatedDir, 'server.mjs'), 'throw new Error("must never execute");'),
        async () => writeFile(path.join(generatedDir, 'server.mjs'), wrapper(descriptor).replace('"schemaVersion": 1', '"schemaVersion":')),
        async () => writeGenerated({ ...descriptor, schemaVersion: 2 }),
        async () => writeGenerated({ ...descriptor, publishAt: 'invalid' }),
        async () => writeGenerated({ ...descriptor, publishAt: '2026-02-30T00:00:00Z', publishAtMs: Date.parse('2026-02-30T00:00:00Z') }),
        async () => writeGenerated({ ...descriptor, publishAtMs: null }),
        async () => writeGenerated({ ...descriptor, publishAtMs: instant + 1 }),
        async () => writeGenerated({ ...descriptor, article: { ...descriptor.article, file: '../../outside.md' } }),
        async () => writeGenerated({ ...descriptor, article: { ...descriptor.article, sha256: '0'.repeat(64) } }),
        async () => writeGenerated(descriptor, raw + 'tampered'),
        async () => writeFile(path.join(generatedDir, 'server.mjs'), 'x'.repeat(256 * 1024 + 1)),
        ...[
          raw.replace(id, 'edition-wrong'), raw.replace('status: scheduled', 'status: draft'),
          raw.replace(`publishAt: ${publishAt}`, 'publishAt: 2026-09-01T00:00:00Z'),
          raw.replace('id: ', 'id: duplicate\nid: '), 'missing frontmatter',
        ].map((article) => async () => writeGenerated({ ...descriptor, article: { file: 'article.md', sha256: createHash('sha256').update(article).digest('hex') } }, article)),
      ];
      for (const mutate of cases) {
        await writeGenerated();
        await mutate();
        const signals = await signalsAt(instant);
        assertExcluded(signals);
        assert.equal(signals.website.recentArticles[0].title, 'Older static');
        assertExcluded(await createCuratedNewsletterDraft({ ...offline, now: new Date(instant), env: {} }));
      }
      await writeGenerated();
    });

    await t.test('fixed paths ignore descriptor source/media selectors and reject symlink layouts', async () => {
      // Nonexistent traversal selectors in descriptor are never used, even after release.
      assert.equal((await signalsAt(instant)).website.recentArticles[0].id, id);
      const outside = path.join(fixture, 'outside.md');
      await writeFile(outside, raw);
      for (const name of ['article.md', 'server.mjs']) {
        await rm(path.join(generatedDir, name));
        await symlink(outside, path.join(generatedDir, name));
        assertExcluded(await signalsAt(instant));
        await rm(path.join(generatedDir, name));
        await writeGenerated();
      }
      await rm(generatedDir, { recursive: true });
      const outsideDir = path.join(fixture, 'outside-generated');
      await mkdir(outsideDir);
      await writeFile(path.join(outsideDir, 'server.mjs'), wrapper(descriptor));
      await writeFile(path.join(outsideDir, 'article.md'), raw);
      await symlink(outsideDir, generatedDir);
      assertExcluded(await signalsAt(instant));
      await rm(generatedDir);
      await writeGenerated();
    });

    await t.test('eligible promotion wins; future duplicate cannot suppress merge before six-item limit', async () => {
      const promoted = path.join(articleDir, '2026.09.02-promoted.md');
      await writeFile(promoted, raw.replace('Generated sentinel title', 'Static promotion title'));
      let articles = (await signalsAt(instant)).website.recentArticles;
      assert.equal(articles.filter((article) => article.id === id).length, 1);
      assert.equal(articles[0].title, 'Static promotion title');
      await writeFile(promoted, raw.replace(publishAt, '2027-01-01T00:00:00Z'));
      for (let day = 20; day < 28; day += 1) {
        await writeFile(path.join(articleDir, `2026.08.${day}.md`), `---\nid: edition-aug-${day}\ndate: 2026-08-${day}\ntitle: Older ${day}\nsummary: Older\n---\nOld\n`);
      }
      articles = (await signalsAt(instant)).website.recentArticles;
      assert.equal(articles.length, 6);
      assert.equal(articles[0].id, id);
      assert.equal(articles[0].title, 'Generated sentinel title');
      assert.equal(articles.filter((article) => article.id === id).length, 1);
    });

    await t.test('isolated package selected by newsletter includeFiles contains only approved generated inputs', async () => {
      const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
      const patterns = config.functions['api/newsletter/generate.mjs'].includeFiles.slice(1, -1).split(',');
      assert.deepEqual(patterns.filter((pattern) => pattern.startsWith('src/generated/')), [
        'src/generated/scheduled-release/server.mjs', 'src/generated/scheduled-release/article.md',
      ]);
      await mkdir(path.join(fixture, 'scripts/lib/newsletter'), { recursive: true });
      await copyFile(path.join(root, 'scripts/lib/newsletter/curation.mjs'), path.join(fixture, 'scripts/lib/newsletter/curation.mjs'));
      await copyFile(path.join(root, 'scripts/model-watch-sources.mjs'), path.join(fixture, 'scripts/model-watch-sources.mjs'));
      await mkdir(path.join(fixture, 'src/data'));
      await writeFile(path.join(fixture, 'src/data/modelWatch.generated.json'), '{"detectedModels":[],"successfulSources":0,"totalSources":0}');
      await mkdir(path.join(articleDir, 'drafts'));
      await writeFile(path.join(articleDir, 'drafts/private.md'), 'private-draft-sentinel');
      await mkdir(path.join(generatedDir, 'media'));
      await writeFile(path.join(generatedDir, 'media/private.png'), 'private-media-sentinel');
      const packaged = await mkdtemp(path.join(tmpdir(), 'newsletter-c3-package-'));
      try {
        for (const pattern of patterns) {
          let files;
          if (pattern.endsWith('/**')) {
            const directory = pattern.slice(0, -3);
            files = (await readdir(path.join(fixture, directory), { recursive: true })).map((name) => `${directory}/${name}`);
          } else if (pattern.endsWith('/*.md')) {
            const directory = pattern.slice(0, -5);
            files = (await readdir(path.join(fixture, directory))).filter((name) => name.endsWith('.md')).map((name) => `${directory}/${name}`);
          } else files = [pattern];
          for (const file of files) {
            if (!(await lstat(path.join(fixture, file))).isFile()) continue;
            await mkdir(path.dirname(path.join(packaged, file)), { recursive: true });
            await copyFile(path.join(fixture, file), path.join(packaged, file));
          }
        }
        const module = await import(pathToFileURL(path.join(packaged, 'scripts/lib/newsletter/curation.mjs')).href);
        const draft = await module.createCuratedNewsletterDraft({ ...offline, root: packaged, now: new Date(instant), env: {} });
        assert.equal(draft.items[2].title, 'Generated sentinel title');
        assert.equal(draft.items[2].sourceUrl, url);
        const before = await module.createCuratedNewsletterDraft({ ...offline, root: packaged, now: new Date(instant - 1), env: {} });
        assertExcluded(before);
        await assert.rejects(lstat(path.join(packaged, 'src/articles/drafts')), { code: 'ENOENT' });
        await assert.rejects(lstat(path.join(packaged, 'src/generated/scheduled-release/media')), { code: 'ENOENT' });
      } finally {
        await rm(packaged, { recursive: true, force: true });
      }
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('newsletter migration enables RLS and keeps browser roles without table grants', async () => {
  const migration = await readFile(path.join(root, 'supabase/migrations/20260824085525_newsletter_infrastructure.sql'), 'utf8');
  for (const table of ['newsletter_subscribers', 'newsletter_delivery_events', 'newsletter_sources', 'newsletter_issues', 'newsletter_issue_items']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security;`));
  }
  assert.match(migration, /revoke all on table[\s\S]*from anon, authenticated;/);
  assert.doesNotMatch(migration, /create policy/i);
  assert.doesNotMatch(migration, /security definer/i);
});

test('subscribe handler captures to Supabase and submits to public Listmonk list', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/rest/v1/newsletter_subscribers?on_conflict=email')) {
      return new Response(JSON.stringify([{ id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' }]), { status: 201 });
    }
    if (url.includes('/rest/v1/newsletter_delivery_events')) {
      return new Response(JSON.stringify([{ id: '00000000-0000-4000-8000-000000000002' }]), { status: 201 });
    }
    if (url.includes('/rest/v1/newsletter_subscribers?id=')) {
      return new Response(JSON.stringify([{ id: '00000000-0000-4000-8000-000000000001' }]), { status: 200 });
    }
    if (url.includes('/api/public/subscription')) {
      return new Response(JSON.stringify({ data: true }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  const handler = createNewsletterSubscribeHandler({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      LISTMONK_BASE_URL: 'https://listmonk.example.com',
      LISTMONK_WEEKLY_LIST_UUID: '11111111-1111-4111-8111-111111111111',
      LISTMONK_BIWEEKLY_LIST_UUID: '22222222-2222-4222-8222-222222222222',
    },
    fetchImpl,
    now: () => new Date('2026-08-24T12:00:00Z'),
  });
  const response = responseHarness();
  await handler(request({ email: ' Test@Example.com ', cadence: 'biweekly', page: '/newsletter' }), response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.ok, true);
  assert.deepEqual(response.body, { ok: true, status: 'accepted' });
  assert.equal(calls[0].options.method, 'POST');
  assert.ok(calls.every((call) => call.options.method !== 'GET'));
  assert.ok(calls.some((call) => call.url === 'https://example.supabase.co/rest/v1/newsletter_subscribers?on_conflict=email'));
  assert.ok(calls.some((call) => call.url === 'https://listmonk.example.com/api/public/subscription'));
  const subscriberCall = calls.find((call) => call.url.includes('/rest/v1/newsletter_subscribers?on_conflict=email'));
  assert.equal(subscriberCall.options.headers.Prefer, 'resolution=ignore-duplicates,return=representation');
  const subscriberBody = JSON.parse(subscriberCall.options.body);
  assert.equal(subscriberBody.email, 'test@example.com');
  assert.equal(subscriberBody.cadence, 'biweekly');
  const listmonkCall = calls.find((call) => call.url.includes('/api/public/subscription'));
  assert.deepEqual(JSON.parse(listmonkCall.options.body).list_uuids, ['22222222-2222-4222-8222-222222222222']);
});

// Offline PostgREST model: a synchronous unique-key insert precedes any await.
// This validates the request contract, not a live database's concurrency behavior.
function signupFixture({ existing = [], providerFailure = false, diagnosticFailure = false, configured = true, failures = [] } = {}) {
  const rows = new Map(existing.map((row) => [row.email.toLowerCase(), structuredClone(row)]));
  const calls = [];
  const handler = createNewsletterSubscribeHandler({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-placeholder',
      ...(configured ? {
        LISTMONK_BASE_URL: 'https://listmonk.example.com',
        LISTMONK_WEEKLY_LIST_UUID: 'weekly-public-uuid',
        LISTMONK_BIWEEKLY_LIST_UUID: 'biweekly-public-uuid',
      } : {}),
    },
    now: () => new Date('2026-08-24T12:00:00Z'),
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push({ url, ...options, body });
      assert.notEqual(options.method, 'GET', 'no read-before-write');
      if (url.endsWith('/newsletter_subscribers?on_conflict=email')) {
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=representation');
        if (failures.includes('insert')) return Response.json({}, { status: 503 });
        const key = body.email.toLowerCase();
        if (rows.has(key)) return Response.json([]);
        const row = { id: `subscriber-${rows.size + 1}`, ...body };
        rows.set(key, row);
        return Response.json([row], { status: 201 });
      }
      if (url.endsWith('/api/public/subscription')) {
        assert.equal(options.method, 'POST');
        assert.deepEqual(Object.keys(body).sort(), ['email', 'list_uuids', 'name']);
        if (failures.includes('provider')) throw new Error('simulated ambiguous timeout: do not persist raw cause');
        return Response.json({ data: !providerFailure }, { status: providerFailure ? 503 : 200 });
      }
      if (options.method === 'PATCH') {
        if (diagnosticFailure || failures.includes('patch')) return Response.json({}, { status: 503 });
        const row = [...rows.values()].find((row) => url.endsWith(`id=eq.${row.id}`));
        assert.ok(row);
        Object.assign(row, body);
        return Response.json([row]);
      }
      if (url.endsWith('/newsletter_delivery_events')) {
        assert.equal(options.method, 'POST');
        if ((diagnosticFailure && body.event_type === 'error') || failures.includes(body.event_type)) return Response.json({}, { status: 503 });
        return Response.json([{ id: 'event-id' }], { status: 201 });
      }
      assert.fail(`unexpected request ${url}`);
    },
  });
  return { rows, calls, async submit(body) {
    const response = responseHarness();
    await handler(request(body), response);
    return { status: response.statusCode, body: response.body, bytes: JSON.stringify(response.body) };
  } };
}

const accepted = { status: 202, body: { ok: true, status: 'accepted' }, bytes: '{"ok":true,"status":"accepted"}' };

test('VAL-A1.1/A1.4 concurrent equivalent emails insert once and submit one public double-opt-in for each cadence', async () => {
  for (const cadence of ['weekly', 'biweekly']) {
    const fixture = signupFixture();
    const results = await Promise.all([
      fixture.submit({ email: ' Test@Example.com ', cadence }),
      fixture.submit({ email: 'test@example.COM', cadence }),
    ]);
    assert.deepEqual(results, [accepted, accepted]);
    assert.equal(fixture.rows.size, 1);
    const inserts = fixture.calls.filter((call) => call.url.includes('on_conflict=email'));
    assert.equal(inserts.length, 2);
    assert.ok(inserts.every((call) => call.body.email === 'test@example.com'));
    assert.equal(fixture.calls[0], inserts[0]);
    const provider = fixture.calls.filter((call) => call.url.endsWith('/api/public/subscription'));
    assert.equal(provider.length, 1);
    assert.deepEqual(provider[0].body.list_uuids, [`${cadence}-public-uuid`]);
    const row = fixture.rows.get('test@example.com');
    assert.equal(row.cadence, cadence);
    assert.equal(row.status, 'pending');
    assert.equal(fixture.calls.filter((call) => call.method === 'PATCH').length, 1);
    assert.deepEqual(fixture.calls.filter((call) => call.url.endsWith('/newsletter_delivery_events')).map((call) => call.body.event_type), ['subscribe', 'listmonk_sync']);
    const count = fixture.calls.length;
    assert.deepEqual(await fixture.submit({ company: 'bot', email: 'ignored@example.com' }), accepted);
    assert.equal(fixture.calls.length, count);
  }
});

test('VAL-A1.2 suppressed duplicates preserve every stored field and make only the atomic insert attempt', async () => {
  for (const status of ['unsubscribed', 'bounced', 'complained']) {
    const existing = {
      id: 'suppressed-id', email: 'test@example.com', status, cadence: 'biweekly',
      name: 'Original', source: 'original', consented_at: '2020-01-01T00:00:00Z',
      metadata: { consent: 'original' }, sync_error: 'preserve this error',
      listmonk_subscription_status: status,
    };
    const fixture = signupFixture({ existing: [existing] });
    assert.deepEqual(await fixture.submit({ email: 'TEST@example.com', name: 'Replacement', cadence: 'weekly', source: 'replacement' }), accepted);
    assert.deepEqual(fixture.rows.get(existing.email), existing);
    assert.equal(fixture.calls.length, 1, 'zero delivery-event, patch, or provider requests');
    assert.ok(fixture.calls[0].url.endsWith('/newsletter_subscribers?on_conflict=email'));
  }
});

test('VAL-A1.3/A1.5 provider failure remains accepted; diagnostics are attempted and public retry cannot resync', async () => {
  for (const diagnosticFailure of [false, true]) {
    const fixture = signupFixture({ providerFailure: true, diagnosticFailure });
    assert.deepEqual(await fixture.submit({ email: 'test@example.com' }), accepted);
    const patches = fixture.calls.filter((call) => call.method === 'PATCH');
    assert.equal(patches.length, 1);
    assert.equal(patches[0].body.sync_error, 'listmonk_sync_failed');
    assert.ok(fixture.calls.some((call) => call.body.event_type === 'error'));
    if (!diagnosticFailure) assert.equal(fixture.rows.get('test@example.com').sync_error, 'listmonk_sync_failed');
    const beforeRetry = structuredClone(fixture.rows.get('test@example.com'));
    const count = fixture.calls.length;
    assert.deepEqual(await fixture.submit({ email: 'TEST@example.com', cadence: 'biweekly' }), accepted);
    assert.equal(fixture.calls.length, count + 1);
    assert.deepEqual(fixture.rows.get('test@example.com'), beforeRetry);
    assert.equal(fixture.calls.filter((call) => call.url.endsWith('/api/public/subscription')).length, 1);
  }
  const unconfigured = signupFixture({ configured: false });
  assert.deepEqual(await unconfigured.submit({ email: 'test@example.com' }), accepted);
  assert.ok(unconfigured.calls.every((call) => !call.url.includes('listmonk.example.com')));
});

test('refined VAL-A1.3–A1.9 failure matrix isolates authoritative capture, provider, and each telemetry boundary', async (t) => {
  const cases = [
    ['insert'], ['subscribe'], ['provider'], ['patch'], ['listmonk_sync'],
    ['provider', 'patch'], ['provider', 'error'],
    ['subscribe', 'patch', 'listmonk_sync'], ['subscribe', 'provider', 'patch', 'error'],
  ];
  for (const failures of cases) {
    await t.test(failures.join(' + '), async () => {
      const fixture = signupFixture({ failures });
      const result = await fixture.submit({ email: 'test@example.com' });
      if (failures.includes('insert')) {
        assert.equal(result.status, 503);
        assert.deepEqual(result.body, {
          ok: false, error: 'supabase_request_failed', message: 'Newsletter signup is temporarily unavailable.',
        });
        assert.equal(fixture.calls.length, 1);
        assert.equal(fixture.rows.size, 0);
        return;
      }
      assert.deepEqual(result, accepted);
      const operations = fixture.calls.map((call) => {
        if (call.url.includes('on_conflict=email')) return 'insert';
        if (call.url.endsWith('/api/public/subscription')) return 'provider';
        if (call.method === 'PATCH') return 'patch';
        return call.body.event_type;
      });
      assert.deepEqual(operations, ['insert', 'subscribe', 'provider', 'patch', failures.includes('provider') ? 'error' : 'listmonk_sync']);
      if (failures.includes('provider')) {
        assert.deepEqual(fixture.calls[3].body, { sync_error: 'listmonk_sync_failed' });
        assert.deepEqual(fixture.calls[4].body.payload, { message: 'listmonk_sync_failed' });
      } else {
        assert.equal(fixture.calls[3].body.listmonk_subscription_status, 'submitted');
        assert.equal(fixture.calls[3].body.sync_error, null);
      }
      const rowBeforeRetry = structuredClone(fixture.rows.get('test@example.com'));
      assert.deepEqual(await fixture.submit({ email: 'TEST@example.com', cadence: 'biweekly' }), accepted);
      assert.equal(fixture.calls.length, 6, 'retry only attempts the atomic insert');
      assert.deepEqual(fixture.rows.get('test@example.com'), rowBeforeRetry);
      assert.equal(fixture.calls.filter((call) => call.url.endsWith('/api/public/subscription')).length, 1);
    });
  }
});

test('subscribe handler rejects invalid email before provider calls', async () => {
  let called = false;
  const handler = createNewsletterSubscribeHandler({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
  });
  const response = responseHarness();
  await handler(request({ email: 'not-an-email' }), response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'invalid_email');
  assert.equal(called, false);
});

test('subscribe handler rejects foreign origins and non-json bodies', async () => {
  const handler = createNewsletterSubscribeHandler({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    fetchImpl: async () => new Response('{}', { status: 200 }),
  });

  const foreign = responseHarness();
  await handler(request({ email: 'test@example.com' }, { origin: 'https://example.net', 'content-type': 'application/json' }), foreign);
  assert.equal(foreign.statusCode, 403);
  assert.equal(foreign.body.error, 'origin_not_allowed');

  const wrongType = responseHarness();
  await handler(request('email=test@example.com', { origin: 'https://longmontai.com', 'content-type': 'application/x-www-form-urlencoded' }), wrongType);
  assert.equal(wrongType.statusCode, 415);
  assert.equal(wrongType.body.error, 'unsupported_content_type');
});

test('A3 curated draft rejects unsafe candidates wholly and confines all sink markup to fixed templates', async (t) => {
  const options = { now: new Date('2026-08-24T12:00:00Z'), fetchLiveSources: false };
  const fallback = await createCuratedNewsletterDraft({ ...options, env: {} });
  const candidate = {
    subject: 'AI <update> & "review"', preheader: "Today's <brief>", summary: 'Reviewed & sourced.',
    items: [{ category: 'models', title: '<script>alert(1)</script>', synthesis: '<img src=x onerror="alert(1)"> & useful',
      sourceName: 'Source "quoted" & trusted', sourceUrl: 'https://longmontai.com/model-watch', score: 88 }],
  };
  async function curate(value, responseFactory) {
    let calls = 0;
    const draft = await createCuratedNewsletterDraft({
      ...options, env: { OPENAI_API_KEY: 'test-only-placeholder', NEWSLETTER_CURATOR_MODEL: 'test-curator' },
      fetchImpl: async (url, request) => {
        calls += 1;
        assert.equal(url, 'https://api.openai.com/v1/responses');
        const input = JSON.parse(JSON.parse(request.body).input);
        assert.deepEqual(Object.keys(input.expectedShape).sort(), ['items', 'preheader', 'subject', 'summary']);
        return responseFactory ? responseFactory() : Response.json({ output_text: JSON.stringify(value) });
      },
    });
    assert.equal(calls, 1, 'no live-source or sink requests during curation');
    return draft;
  }
  const draft = await curate(candidate);
  assert.equal(draft.usedAi, true);
  assert.equal(draft.curatorModel, 'test-curator');
  assert.deepEqual(draft.items, [{ ...candidate.items[0], sortOrder: 0 }]);
  const expectedHtml = '<h1>AI &lt;update&gt; &amp; &quot;review&quot;</h1><p>Today&#39;s &lt;brief&gt;</p><p>Reviewed &amp; sourced.</p><ul><li><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong><br>&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; useful <a href="https://longmontai.com/model-watch">Source &quot;quoted&quot; &amp; trusted</a></li></ul><p>Read more at <a href="https://longmontai.com/">LongmontAI.com</a>.</p>';
  assert.equal(draft.html, expectedHtml);
  assert.equal(draft.text, `${candidate.subject}\n\n${candidate.preheader}\n\n${candidate.summary}\n\n- ${candidate.items[0].title}: ${candidate.items[0].synthesis} (${candidate.items[0].sourceName}: ${candidate.items[0].sourceUrl})\n\nRead more: https://longmontai.com/`);
  assert.doesNotMatch(draft.html, /<script|<img|<style/);
  const normalized = structuredClone(candidate);
  normalized.subject = '  Useful   summary  ';
  assert.equal((await curate(normalized)).subject, 'Useful summary');
  const edition = structuredClone(candidate);
  edition.items[0].sourceUrl = fallback.items[2].sourceUrl;
  assert.equal((await curate(edition)).usedAi, true, 'fallback edition URLs belong to exact allowlist');
  const ordered = structuredClone(candidate);
  ordered.items = Array.from({ length: 8 }, (_, index) => ({ ...candidate.items[0], title: `Item ${index}`, score: index }));
  assert.deepEqual((await curate(ordered)).items.map((entry) => [entry.title, entry.sortOrder]), ordered.items.map((entry, index) => [entry.title, index]));
  ordered.items[7].category = 'invalid';
  assert.deepEqual(await curate(ordered), fallback, 'one bad trailing item rejects the complete candidate');

  const invalid = [
    ['raw html', (c) => { c.html = '<script>evil()</script><img src="https://tracker.example/x"><style>body{display:none}</style>'; }],
    ['raw text', (c) => { c.text = 'untrusted text blob'; }],
    ['unknown field', (c) => { c.extra = true; }],
    ['missing field', (c) => { delete c.summary; }],
    ['oversized subject', (c) => { c.subject = 'x'.repeat(161); }],
    ['oversized preheader', (c) => { c.preheader = 'x'.repeat(181); }],
    ['oversized summary', (c) => { c.summary = 'x'.repeat(901); }],
    ['empty scalar', (c) => { c.subject = '   '; }],
    ['wrong scalar type', (c) => { c.subject = 123; }],
    ['control character', (c) => { c.subject = 'header\r\ninjection'; }],
    ['unpaired surrogate', (c) => { c.summary = '\ud800'; }],
    ['empty items', (c) => { c.items = []; }],
    ['too many items', (c) => { c.items = Array(9).fill(c.items[0]); }],
    ['non-object item', (c) => { c.items = [null]; }],
    ['unknown category', (c) => { c.items[0].category = 'unreviewed'; }],
    ['fractional score', (c) => { c.items[0].score = 12.5; }],
    ['high score', (c) => { c.items[0].score = 101; }],
    ['negative score', (c) => { c.items[0].score = -1; }],
    ['string score', (c) => { c.items[0].score = '88'; }],
    ['oversized title', (c) => { c.items[0].title = 'x'.repeat(181); }],
    ['oversized synthesis', (c) => { c.items[0].synthesis = 'x'.repeat(601); }],
    ['oversized source name', (c) => { c.items[0].sourceName = 'x'.repeat(141); }],
    ['item control character', (c) => { c.items[0].title = 'bad\u0000title'; }],
    ['unknown item key', (c) => { c.items[0].html = '<b>bad</b>'; }],
  ];
  for (const url of ['javascript:alert(1)', 'data:text/html,evil', 'http://longmontai.com/model-watch',
    'https://user:password@longmontai.com/model-watch', 'https://longmontai.com.evil.example/model-watch',
    'https://longmontai.com/unlisted', 'https://longmontai.com/model-watch?redirect=https://evil.example',
    'https://longmontai.com/model-watch#unlisted', 'not a URL', 'https://longmontai.com/" onclick="evil']) {
    invalid.push([`disallowed URL ${url}`, (c) => { c.items[0].sourceUrl = url; }]);
  }
  for (const [name, mutate] of invalid) {
    await t.test(name, async () => {
      const value = structuredClone(candidate);
      mutate(value);
      assert.deepEqual(await curate(value), fallback, 'no partial salvage, markup, or model attribution');
    });
  }
  for (const value of [null, [], 'not an object']) assert.deepEqual(await curate(value), fallback);
  assert.deepEqual(await curate(null, () => Response.json({ output_text: 'prefix {"subject":"x"} suffix' })), fallback);
  assert.deepEqual(await curate(null, () => new Response('not JSON')), fallback);
  assert.deepEqual(await curate(null, () => new Response(new Uint8Array([0xff, 0xfe]))), fallback);
  assert.deepEqual(await curate(null, () => new Response('{}', { headers: { 'Content-Length': 'invalid' } })), fallback);

  await t.test('declared oversize cancels without buffering', async () => {
    let cancelled = false;
    let reads = 0;
    const result = await curate(null, () => new Response(new ReadableStream({
      pull() { reads += 1; }, cancel() { cancelled = true; },
    }, { highWaterMark: 0 }), { headers: { 'Content-Length': '65537' } }));
    assert.deepEqual(result, fallback);
    assert.equal(reads, 0);
    assert.equal(cancelled, true);
  });
  await t.test('chunked multibyte oversize stops and cancels before unbounded buffering', async () => {
    let reads = 0;
    let cancelled = false;
    const result = await curate(null, () => new Response(new ReadableStream({
      pull(controller) {
        reads += 1;
        controller.enqueue(new TextEncoder().encode('é'.repeat(8192)));
      },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 })));
    assert.deepEqual(result, fallback);
    assert.equal(reads, 5, 'byte ceiling, not character ceiling');
    assert.equal(cancelled, true);
  });
  await t.test('valid bounded streamed Responses envelope', async () => {
    const result = await curate(null, () => Response.json({ output: [{ content: [{ text: JSON.stringify(candidate) }] }] }));
    assert.deepEqual(result, draft);
  });

  await t.test('actual generation wrapper keeps owner-notification HTML escaped and campaign draft-only', async () => {
    const value = structuredClone(candidate);
    value.subject = '<img src="https://tracker.example/pixel" onerror="alert(1)">';
    const safeDraft = await curate(value);
    assert.equal(safeDraft.usedAi, true);
    const calls = [];
    const env = {
      CRON_SECRET: 'test-only-placeholder', OPENAI_API_KEY: 'test-only-placeholder', NEWSLETTER_CURATOR_MODEL: 'test-curator',
      NEWSLETTER_NOTIFY_OWNER: '1', NEWSLETTER_CREATE_LISTMONK_CAMPAIGN: '1',
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-placeholder',
      LISTMONK_BASE_URL: 'https://listmonk.example.com', LISTMONK_WEEKLY_LIST_ID: '1',
      LISTMONK_API_USERNAME: 'fixture', LISTMONK_API_TOKEN: 'test-only-placeholder',
      RESEND_API_KEY: 'test-only-placeholder', NEWSLETTER_FROM_EMAIL: 'fixture@example.com', NEWSLETTER_OWNER_EMAIL: 'owner@example.com',
    };
    const handler = createNewsletterGenerateHandler({
      env, now: () => options.now,
      fetchImpl: async (url, requestOptions) => {
        if (modelWatchSources.some((source) => source.url === url)) return new Response('');
        const body = JSON.parse(requestOptions.body);
        calls.push({ url, body });
        if (url === 'https://api.openai.com/v1/responses') return Response.json({ output_text: JSON.stringify(value) });
        if (url === 'https://listmonk.example.com/api/campaigns') return Response.json({ data: { id: 1 } });
        if (url === 'https://example.supabase.co/rest/v1/newsletter_issues') return Response.json([{ id: 'issue-fixture' }]);
        if (url === 'https://example.supabase.co/rest/v1/newsletter_issue_items'
          || url === 'https://example.supabase.co/rest/v1/newsletter_delivery_events') return Response.json([]);
        if (url === 'https://api.resend.com/emails') return Response.json({ id: 'notification-fixture' });
        assert.fail(`unexpected generation request ${url}`);
      },
    });
    const response = responseHarness();
    await handler(request({}, { authorization: 'Bearer test-only-placeholder' }), response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.usedAi, true);
    assert.equal(response.body.campaign.status, 'draft');
    const notification = calls.find((call) => call.url === 'https://api.resend.com/emails');
    assert.ok(notification);
    assert.equal(notification.body.html, `<p>A LongmontAI newsletter draft is ready.</p>${safeDraft.html}`);
    assert.equal(notification.body.subject, `Draft ready: ${value.subject}`);
    assert.equal(notification.body.text, `A LongmontAI newsletter draft is ready.\n\n${value.subject}\n\n${safeDraft.text}`);
    assert.doesNotMatch(notification.body.html, /<img|<script|<style/);
    assert.ok(notification.body.html.includes('&lt;img src=&quot;https://tracker.example/pixel&quot; onerror=&quot;alert(1)&quot;&gt;'));
    const campaigns = calls.filter((call) => call.url.startsWith('https://listmonk.example.com/'));
    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0].url, 'https://listmonk.example.com/api/campaigns');
    assert.equal(campaigns[0].body.body, safeDraft.html);
    const issue = calls.find((call) => call.url.endsWith('/newsletter_issues'));
    assert.equal(issue.body.status, 'draft');
    assert.equal(issue.body.listmonk_campaign_status, 'draft');
  });

  await t.test('safe generated draft is preserved through Supabase, draft-only Listmonk, and optional Resend sinks', async () => {
    const calls = [];
    const sinkFetch = async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return Response.json(url.endsWith('/newsletter_issues') ? [{ id: 'issue-fixture' }] : { data: { id: 1 } });
    };
    const env = {
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-placeholder',
      LISTMONK_BASE_URL: 'https://listmonk.example.com', LISTMONK_WEEKLY_LIST_ID: '1',
      LISTMONK_API_USERNAME: 'fixture', LISTMONK_API_TOKEN: 'test-only-placeholder',
      RESEND_API_KEY: 'test-only-placeholder', NEWSLETTER_FROM_EMAIL: 'fixture@example.com', NEWSLETTER_OWNER_EMAIL: 'owner@example.com',
    };
    await createNewsletterIssue(env, draft, sinkFetch);
    const campaign = await createListmonkCampaign(env, draft, sinkFetch);
    await sendResendNotification(env, draft, sinkFetch);
    assert.equal(campaign.status, 'draft');
    assert.equal(calls.length, 4);
    assert.equal(calls[0].body.html_body, expectedHtml);
    assert.equal(calls[0].body.text_body, draft.text);
    assert.equal(calls[2].body.body, expectedHtml);
    assert.equal(calls[2].body.altbody, draft.text);
    assert.equal(calls[3].body.html, expectedHtml);
    assert.equal(calls[3].body.text, draft.text);
    assert.ok(calls.every((call) => !call.url.includes('/send') && !call.url.includes('/start')));
  });
});

test('deterministic newsletter draft includes the website as a first-class source', () => {
  const signals = {
    sourceUrls: ['https://longmontai.com/', 'https://longmontai.com/model-watch'],
    website: {
      recentArticles: [{ id: 'edition-test', title: 'A useful AI update', summary: 'A precise recap.' }],
    },
    modelWatchStatus: {
      successfulSources: 2,
      totalSources: 3,
      detectedModels: ['Model A', 'Model B'],
    },
    sourceHighlights: [{ company: 'Example AI', url: 'https://example.com', matches: ['Model B'], ok: true }],
  };
  const draft = deterministicDraftFromSignals(signals, {
    cadence: 'weekly',
    now: new Date('2026-08-24T12:00:00Z'),
  });

  assert.equal(draft.cadence, 'weekly');
  assert.ok(draft.sourceUrls.includes('https://longmontai.com/model-watch'));
  assert.ok(draft.html.includes('LongmontAI.com'));
  assert.ok(draft.items.some((item) => item.sourceUrl === 'https://longmontai.com/model-watch'));
});
