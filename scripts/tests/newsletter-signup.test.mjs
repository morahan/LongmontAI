import assert from 'node:assert/strict';
import test from 'node:test';

import { createNewsletterSubscribeHandler } from '../lib/newsletter/subscribe-handler.mjs';
import { syncSubscriberToListmonk, verifyTurnstileToken } from '../lib/newsletter/shared.mjs';

const BASE_URL = 'https://listmonk.example.test';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function listmonkEnv(overrides = {}) {
  return {
    LISTMONK_BASE_URL: BASE_URL,
    LISTMONK_API_USERNAME: 'api',
    LISTMONK_API_TOKEN: 'token',
    LISTMONK_WEEKLY_LIST_ID: '3',
    LISTMONK_BIWEEKLY_LIST_ID: '4',
    ...overrides,
  };
}

// A Listmonk that already holds some subscribers, as a server shared with
// another site does. Creating an email it knows answers 409 like the real one.
function fakeListmonk(existing = []) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const { pathname, searchParams } = new URL(url);
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ method, pathname, search: searchParams.get('search'), body });
    if (method === 'POST' && pathname === '/api/subscribers') {
      if (existing.some((sub) => sub.email === body.email)) {
        return Response.json({ message: 'E-mail already exists.' }, { status: 409 });
      }
      return Response.json({ data: { id: 900, email: body.email } });
    }
    if (method === 'GET' && pathname === '/api/subscribers') {
      const needle = searchParams.get('search').toLowerCase();
      return Response.json({ data: { results: existing.filter((sub) => sub.email.includes(needle)) } });
    }
    if (method === 'PUT' && pathname === '/api/subscribers/lists') return Response.json({ data: true });
    if (method === 'POST' && /^\/api\/subscribers\/\d+\/optin$/.test(pathname)) return Response.json({ data: true });
    return Response.json({ message: 'not found' }, { status: 404 });
  };
  return { fetchImpl, calls, writes: () => calls.filter((call) => call.method !== 'GET') };
}

const sync = (listmonk, subscriber, env = listmonkEnv()) => syncSubscriberToListmonk(
  env,
  { email: 'reader@example.com', name: 'Reader', cadence: 'weekly', ...subscriber },
  listmonk.fetchImpl,
);

test('a new reader is created on the private list without bypassing double opt-in', async () => {
  const listmonk = fakeListmonk();
  assert.deepEqual(await sync(listmonk, {}), { ok: true, status: 'submitted' });
  assert.deepEqual(listmonk.calls, [{
    method: 'POST',
    pathname: '/api/subscribers',
    search: null,
    body: { email: 'reader@example.com', name: 'Reader', status: 'enabled', lists: [3], preconfirm_subscriptions: false },
  }]);
});

test('someone already on another list is added to this one and sent a confirmation', async () => {
  const listmonk = fakeListmonk([
    { id: 11, email: 'ader@example.com', status: 'enabled', lists: [] },
    { id: 12, email: 'reader@example.com', status: 'enabled', lists: [{ id: 1, subscription_status: 'confirmed' }] },
  ]);
  assert.deepEqual(await sync(listmonk, { cadence: 'biweekly' }), { ok: true, status: 'submitted' });
  assert.equal(listmonk.calls[1].search, 'reader@example.com');
  assert.deepEqual(listmonk.writes().slice(1).map((call) => [call.method, call.pathname, call.body]), [
    ['PUT', '/api/subscribers/lists', { ids: [12], action: 'add', target_list_ids: [4], status: 'unconfirmed' }],
    ['POST', '/api/subscribers/12/optin', undefined],
  ]);
});

test('a reader who left the list can rejoin through a fresh confirmation', async () => {
  const listmonk = fakeListmonk([
    { id: 12, email: 'reader@example.com', status: 'enabled', lists: [{ id: 3, subscription_status: 'unsubscribed' }] },
  ]);
  assert.deepEqual(await sync(listmonk, {}), { ok: true, status: 'submitted' });
  assert.deepEqual(listmonk.writes().map((call) => call.pathname), [
    '/api/subscribers', '/api/subscribers/lists', '/api/subscribers/12/optin',
  ]);
});

test('confirmed and blocklisted subscribers are left untouched', async () => {
  for (const subscriber of [
    { id: 12, email: 'reader@example.com', status: 'enabled', lists: [{ id: 3, subscription_status: 'confirmed' }] },
    { id: 12, email: 'reader@example.com', status: 'blocklisted', lists: [] },
  ]) {
    const listmonk = fakeListmonk([subscriber]);
    assert.deepEqual(await sync(listmonk, {}), { ok: true, status: 'already-subscribed' });
    assert.deepEqual(listmonk.writes().map((call) => call.pathname), ['/api/subscribers']);
  }
});

test('a search that only finds look-alike emails fails instead of touching the wrong subscriber', async () => {
  const listmonk = fakeListmonk([
    { id: 11, email: 'otherreader@example.com', status: 'enabled', lists: [] },
    { id: 12, email: 'READER@example.com.evil', status: 'enabled', lists: [] },
  ]);
  const conflictOnCreate = async (url, options) => (options?.method === 'POST' && new URL(url).pathname === '/api/subscribers'
    ? Response.json({ message: 'E-mail already exists.' }, { status: 409 })
    : listmonk.fetchImpl(url, options));
  await assert.rejects(
    syncSubscriberToListmonk(listmonkEnv(), { email: 'reader@example.com', cadence: 'weekly' }, conflictOnCreate),
    (error) => error.code === 'listmonk_request_failed',
  );
  assert.equal(listmonk.writes().length, 0);
});

test('without list IDs and API credentials the sync is skipped', async () => {
  const listmonk = fakeListmonk();
  for (const env of [
    listmonkEnv({ LISTMONK_WEEKLY_LIST_ID: '' }),
    listmonkEnv({ LISTMONK_API_TOKEN: '' }),
  ]) {
    assert.deepEqual(await sync(listmonk, {}, env), { ok: false, skipped: true, reason: 'listmonk_list_not_configured' });
  }
  assert.equal(listmonk.calls.length, 0);
});

function siteverify(answer) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (answer instanceof Error) throw answer;
    return Response.json(answer);
  };
  return { fetchImpl, calls };
}

test('Turnstile tokens are checked with Cloudflare, and anything but success is refused', async () => {
  const env = { TURNSTILE_SECRET_KEY: 'secret' };
  const passing = siteverify({ success: true });
  await verifyTurnstileToken(env, { token: 'token' }, passing.fetchImpl);
  assert.deepEqual(passing.calls, [{ url: SITEVERIFY, body: { secret: 'secret', response: 'token' } }]);

  for (const token of [undefined, '', 'x'.repeat(2049)]) {
    const unused = siteverify({ success: true });
    await assert.rejects(verifyTurnstileToken(env, { token }, unused.fetchImpl), (error) => error.status === 400);
    assert.equal(unused.calls.length, 0);
  }
  await assert.rejects(
    verifyTurnstileToken(env, { token: 'token' }, siteverify({ success: false, 'error-codes': ['invalid-input-response'] }).fetchImpl),
    (error) => error.status === 400 && error.code === 'verification_failed',
  );
  await assert.rejects(
    verifyTurnstileToken(env, { token: 'token' }, siteverify(new Error('offline')).fetchImpl),
    (error) => error.status === 503 && error.code === 'turnstile_unavailable',
  );
  await assert.rejects(
    verifyTurnstileToken({}, { token: 'token' }, siteverify({ success: true }).fetchImpl),
    (error) => error.status === 503 && error.code === 'turnstile_not_configured',
  );
});

test('the signup endpoint rate limits first, then refuses a bot before storing anything', async () => {
  const calls = [];
  const handler = createNewsletterSubscribeHandler({
    env: {
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      NEWSLETTER_ALLOWED_ORIGINS: 'https://longmontai.com',
      NEWSLETTER_RATE_LIMIT_SECRET: 'test-only-newsletter-rate-limit-secret-with-32-bytes',
      TURNSTILE_SECRET_KEY: 'secret',
      ...listmonkEnv(),
    },
    fetchImpl: async (url) => {
      calls.push(new URL(url).pathname);
      if (url.endsWith('/rpc/newsletter_enforce_signup_rate_limit')) return Response.json([{ allowed: true }]);
      if (url === SITEVERIFY) return Response.json({ success: false });
      throw new Error(`unexpected fetch ${url}`);
    },
  });
  const result = {};
  await handler({
    method: 'POST',
    headers: { origin: 'https://longmontai.com', 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.10' },
    body: { email: 'reader@example.com', turnstileToken: 'forged' },
  }, {
    setHeader() {},
    status(code) { result.status = code; return this; },
    json(payload) { result.body = payload; return this; },
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'verification_failed');
  assert.deepEqual(calls, ['/rest/v1/rpc/newsletter_enforce_signup_rate_limit', '/turnstile/v0/siteverify']);
});
