import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createNewsletterSubscribeHandler } from '../../scripts/lib/newsletter/subscribe-handler.mjs';
import { deterministicDraftFromSignals } from '../../scripts/lib/newsletter/curation.mjs';

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
  assert.equal(response.body.status, 'confirmation_pending');
  assert.ok(calls.some((call) => call.url === 'https://example.supabase.co/rest/v1/newsletter_subscribers?on_conflict=email'));
  assert.ok(calls.some((call) => call.url === 'https://listmonk.example.com/api/public/subscription'));
  const subscriberCall = calls.find((call) => call.url.includes('/rest/v1/newsletter_subscribers?on_conflict=email'));
  const subscriberBody = JSON.parse(subscriberCall.options.body);
  assert.equal(subscriberBody.email, 'test@example.com');
  assert.equal(subscriberBody.cadence, 'biweekly');
  const listmonkCall = calls.find((call) => call.url.includes('/api/public/subscription'));
  assert.deepEqual(JSON.parse(listmonkCall.options.body).list_uuids, ['22222222-2222-4222-8222-222222222222']);
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
