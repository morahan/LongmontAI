import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createNewsletterSubscribeHandler } from '../../scripts/lib/newsletter/subscribe-handler.mjs';
import { createNewsletterGenerateHandler } from '../../scripts/lib/newsletter/generate-handler.mjs';
import { modelWatchSources } from '../model-watch-sources.mjs';
import { createCuratedNewsletterDraft, deterministicDraftFromSignals } from '../../scripts/lib/newsletter/curation.mjs';
import { createListmonkCampaign, createNewsletterIssue, sendResendNotification } from '../../scripts/lib/newsletter/shared.mjs';

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
