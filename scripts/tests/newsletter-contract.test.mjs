import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createNewsletterSubscribeHandler } from '../../scripts/lib/newsletter/subscribe-handler.mjs';
import { deterministicDraftFromSignals } from '../../scripts/lib/newsletter/curation.mjs';
import { normalizeEmail } from '../../scripts/lib/newsletter/shared.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rateLimitSecret = 'test-only-newsletter-rate-limit-secret-with-32-bytes';
const localDatabaseContainer = 'supabase_db_LongmontAI';

function runLocalPostgres(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      [
        'exec', '--interactive', localDatabaseContainer,
        'psql', '--no-psqlrc', '--username', 'postgres', '--dbname', 'postgres',
        '--set', 'ON_ERROR_STOP=1', '--quiet', '--tuples-only', '--no-align',
      ],
      { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => reject(new Error(`Local Postgres test harness is unavailable: ${error.message}`)));
    child.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    child.stdin.end(`${sql}\n`);
  });
}

async function postgresSql(sql) {
  const result = await runLocalPostgres(sql);
  assert.equal(result.code, 0, `Local migrated-Postgres command failed: ${result.stderr}`);
  return result.stdout;
}

async function expectPostgresPermissionDenied(sql) {
  const result = await runLocalPostgres(sql);
  assert.notEqual(result.code, 0, 'restricted database operation unexpectedly succeeded');
  assert.match(result.stderr, /permission denied/i);
}

function keyedIdentity(scope, value) {
  return createHmac('sha256', rateLimitSecret).update(`${scope}\0${value}`).digest('hex');
}

async function callDatabaseLimiter({ ip, email, now = '2026-08-25T12:00:00.000Z' }) {
  const ipHash = keyedIdentity('ip', ip);
  const emailHash = keyedIdentity('email', normalizeEmail(email));
  const output = await postgresSql(`
    set role service_role;
    select allowed, retry_after_seconds
    from public.newsletter_enforce_signup_rate_limit(
      decode('${ipHash}', 'hex'),
      decode('${emailHash}', 'hex'),
      '${now}'::timestamptz
    );
  `);
  const [allowed, retryAfter] = output.split('|');
  assert.match(allowed, /^[tf]$/, `unexpected limiter output: ${output}`);
  return { allowed: allowed === 't', retryAfter: Number(retryAfter) };
}

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
    headers: {
      origin: 'https://longmontai.com',
      'content-type': 'application/json',
      'x-vercel-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body,
  };
}

function env(overrides = {}) {
  return {
    NODE_ENV: 'production',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    NEWSLETTER_ALLOWED_ORIGINS: 'https://longmontai.com',
    NEWSLETTER_RATE_LIMIT_SECRET: rateLimitSecret,
    ...overrides,
  };
}

function successfulFetch(calls = []) {
  return async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/rest/v1/rpc/newsletter_enforce_signup_rate_limit')) {
      return new Response(JSON.stringify([{ allowed: true, retry_after_seconds: 0 }]), { status: 200 });
    }
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

test('rate-limit migration uses atomic server-only hashed counters', async () => {
  const migration = await readFile(path.join(root, 'supabase/migrations/20260825090000_newsletter_signup_rate_limit.sql'), 'utf8');
  assert.match(migration, /key_hash bytea not null/);
  assert.match(migration, /primary key \(scope, key_hash, window_started_at\)/);
  assert.match(migration, /on conflict \(scope, key_hash, window_started_at\)[\s\S]*do update set request_count/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke all on table public\.newsletter_signup_rate_limits from service_role/);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /client_ip|inet\b|email text/i);
});

test('migrated Postgres enforces limits, normalization, concurrency, and role isolation', async () => {
  await postgresSql('truncate table public.newsletter_signup_rate_limits;');

  const emailVariants = [
    ' Shared@Example.com ',
    'shared@example.com',
    'SHARED@EXAMPLE.COM',
    ' shared@example.com',
    'shared@example.com ',
    'ShArEd@ExAmPlE.CoM',
  ];
  const emailResults = [];
  for (const [index, email] of emailVariants.entries()) {
    emailResults.push(await callDatabaseLimiter({ ip: `203.0.113.${index + 1}`, email }));
  }
  assert.deepEqual(emailResults.map(({ allowed }) => allowed), [true, true, true, true, true, false]);
  assert.ok(emailResults[5].retryAfter >= 1 && emailResults[5].retryAfter <= 3600);

  await postgresSql('truncate table public.newsletter_signup_rate_limits;');
  const ipResults = [];
  for (let index = 0; index < 11; index += 1) {
    ipResults.push(await callDatabaseLimiter({
      ip: '198.51.100.20',
      email: `changing-email-${index}@example.com`,
    }));
  }
  assert.deepEqual(
    ipResults.map(({ allowed }) => allowed),
    [true, true, true, true, true, true, true, true, true, true, false],
  );
  assert.ok(ipResults[10].retryAfter >= 1 && ipResults[10].retryAfter <= 3600);

  await postgresSql('truncate table public.newsletter_signup_rate_limits;');
  const concurrentEmailResults = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    callDatabaseLimiter({
      ip: `192.0.2.${index + 1}`,
      email: index % 2 === 0 ? ' Concurrent@Example.com ' : 'concurrent@example.com',
    })));
  assert.equal(concurrentEmailResults.filter(({ allowed }) => allowed).length, 5);

  await postgresSql('truncate table public.newsletter_signup_rate_limits;');
  const concurrentIpResults = await Promise.all(Array.from({ length: 16 }, (_, index) =>
    callDatabaseLimiter({
      ip: '192.0.2.200',
      email: `concurrent-ip-${index}@example.com`,
    })));
  assert.equal(concurrentIpResults.filter(({ allowed }) => allowed).length, 10);

  const privileges = await postgresSql(`
    select
      has_function_privilege('anon', 'public.newsletter_enforce_signup_rate_limit(bytea,bytea,timestamptz)', 'execute'),
      has_function_privilege('authenticated', 'public.newsletter_enforce_signup_rate_limit(bytea,bytea,timestamptz)', 'execute'),
      has_function_privilege('service_role', 'public.newsletter_enforce_signup_rate_limit(bytea,bytea,timestamptz)', 'execute'),
      has_table_privilege('anon', 'public.newsletter_signup_rate_limits', 'select,insert,update,delete'),
      has_table_privilege('authenticated', 'public.newsletter_signup_rate_limits', 'select,insert,update,delete'),
      has_table_privilege('service_role', 'public.newsletter_signup_rate_limits', 'select,insert,update,delete');
  `);
  assert.equal(privileges, 'f|f|t|f|f|f');
  for (const role of ['anon', 'authenticated']) {
    await expectPostgresPermissionDenied(`set role ${role}; select * from public.newsletter_signup_rate_limits;`);
  }

  const serviceRpc = await callDatabaseLimiter({
    ip: '192.0.2.250',
    email: 'service-role-rpc@example.com',
    now: '2026-08-25T13:00:00.000Z',
  });
  assert.equal(serviceRpc.allowed, true);
  await expectPostgresPermissionDenied(`
    set role service_role;
    insert into public.newsletter_signup_rate_limits(scope, key_hash, window_started_at)
    values ('ip', decode('${keyedIdentity('ip', '192.0.2.251')}', 'hex'), '2026-08-25T13:00:00.000Z');
  `);
});

test('subscribe handler rate limits first, then captures to Supabase and preserves Listmonk double opt-in', async () => {
  const calls = [];
  const handler = createNewsletterSubscribeHandler({
    env: env({
      LISTMONK_BASE_URL: 'https://listmonk.example.com',
      LISTMONK_WEEKLY_LIST_UUID: '11111111-1111-4111-8111-111111111111',
      LISTMONK_BIWEEKLY_LIST_UUID: '22222222-2222-4222-8222-222222222222',
    }),
    fetchImpl: successfulFetch(calls),
    now: () => new Date('2026-08-24T12:00:00Z'),
  });
  const response = responseHarness();
  await handler(request({ email: ' Test@Example.com ', cadence: 'biweekly', page: '/newsletter' }), response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.status, 'confirmation_pending');
  assert.match(calls[0].url, /rpc\/newsletter_enforce_signup_rate_limit$/);
  const limiterBody = JSON.parse(calls[0].options.body);
  assert.match(limiterBody.p_ip_hash, /^\\x[0-9a-f]{64}$/);
  assert.match(limiterBody.p_email_hash, /^\\x[0-9a-f]{64}$/);
  assert.notEqual(limiterBody.p_ip_hash, limiterBody.p_email_hash);
  assert.doesNotMatch(calls[0].options.body, /203\.0\.113\.10|test@example\.com/i);
  const subscriberCall = calls.find((call) => call.url.includes('/rest/v1/newsletter_subscribers?on_conflict=email'));
  assert.equal(JSON.parse(subscriberCall.options.body).email, 'test@example.com');
  const listmonkCall = calls.find((call) => call.url.includes('/api/public/subscription'));
  assert.deepEqual(JSON.parse(listmonkCall.options.body).list_uuids, ['22222222-2222-4222-8222-222222222222']);
});

test('production rejects missing, null, malformed, and foreign origins before downstream calls', async () => {
  for (const origin of [undefined, 'null', 'not a url', 'https://longmontai.com/path', 'https://example.net']) {
    let called = false;
    const handler = createNewsletterSubscribeHandler({
      env: env(),
      fetchImpl: async () => { called = true; return new Response('{}'); },
    });
    const headers = { origin };
    const response = responseHarness();
    await handler(request({ email: 'test@example.com' }, headers), response);
    assert.equal(response.statusCode, 403, `origin ${String(origin)}`);
    assert.equal(response.body.error, 'origin_not_allowed');
    assert.equal(called, false);
  }
});

test('missing-origin development escape hatch defaults off and cannot apply in production', async () => {
  for (const environment of [
    env({ NODE_ENV: 'development', NEWSLETTER_ALLOW_MISSING_ORIGIN: undefined }),
    env({ NODE_ENV: 'production', NEWSLETTER_ALLOW_MISSING_ORIGIN: '1' }),
  ]) {
    const handler = createNewsletterSubscribeHandler({ env: environment, fetchImpl: successfulFetch() });
    const response = responseHarness();
    await handler(request({ email: 'test@example.com' }, { origin: undefined }), response);
    assert.equal(response.statusCode, 403);
  }

  const handler = createNewsletterSubscribeHandler({
    env: env({ NODE_ENV: 'development', NEWSLETTER_ALLOW_MISSING_ORIGIN: '1' }),
    fetchImpl: successfulFetch(),
  });
  const response = responseHarness();
  await handler(request({ email: 'test@example.com' }, { origin: undefined }), response);
  assert.equal(response.statusCode, 202);
});

test('invalid email is rejected without a downstream call', async () => {
  let called = false;
  const handler = createNewsletterSubscribeHandler({
    env: env(),
    fetchImpl: async () => { called = true; return new Response('{}'); },
  });
  const response = responseHarness();
  await handler(request({ email: 'not-an-email' }), response);
  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('only the code-owned Vercel client-IP header is trusted', async () => {
  for (const untrustedHeaders of [
    { 'x-forwarded-for': '203.0.113.11' },
    { 'x-real-ip': '203.0.113.11' },
    { 'x-custom-client-ip': '203.0.113.11' },
  ]) {
    let called = false;
    const handler = createNewsletterSubscribeHandler({
      env: env({ NEWSLETTER_CLIENT_IP_HEADER: Object.keys(untrustedHeaders)[0] }),
      fetchImpl: async () => { called = true; return new Response('{}'); },
    });
    const response = responseHarness();
    await handler(request(
      { email: 'test@example.com' },
      { 'x-vercel-forwarded-for': undefined, ...untrustedHeaders },
    ), response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error, 'client_identity_unavailable');
    assert.equal(called, false);
  }
});

test('trusted client identity and limiter configuration failures fail closed before writes', async () => {
  for (const scenario of [
    { headers: { 'x-vercel-forwarded-for': undefined }, env: env() },
    { headers: { 'x-vercel-forwarded-for': '203.0.113.10, 198.51.100.1' }, env: env() },
    { headers: {}, env: env({ NEWSLETTER_RATE_LIMIT_SECRET: 'too-short' }) },
    { headers: {}, env: env({ SUPABASE_SERVICE_ROLE_KEY: undefined }) },
  ]) {
    let called = false;
    const handler = createNewsletterSubscribeHandler({
      env: scenario.env,
      fetchImpl: async () => { called = true; return new Response('{}'); },
    });
    const response = responseHarness();
    await handler(request({ email: 'test@example.com' }, scenario.headers), response);
    assert.equal(response.statusCode, 503);
    assert.equal(called, false);
  }
});

test('limiter denial returns no-store 429 with bounded Retry-After and no writes', async () => {
  const calls = [];
  const handler = createNewsletterSubscribeHandler({
    env: env(),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify([{ allowed: false, retry_after_seconds: 99999 }]), { status: 200 });
    },
  });
  const response = responseHarness();
  await handler(request({ email: 'test@example.com' }), response);
  assert.equal(response.statusCode, 429);
  assert.equal(response.body.error, 'rate_limit_exceeded');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['retry-after'], '3600');
  assert.equal(calls.length, 1);
});

test('limiter database errors and malformed results fail closed before writes or provider calls', async () => {
  for (const result of [new Response('{}', { status: 500 }), new Response('{}', { status: 200 })]) {
    let calls = 0;
    const handler = createNewsletterSubscribeHandler({
      env: env(),
      fetchImpl: async () => { calls += 1; return result.clone(); },
    });
    const response = responseHarness();
    await handler(request({ email: 'test@example.com' }), response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error, 'rate_limit_unavailable');
    assert.equal(calls, 1);
  }
});

test('subscribe handler rejects non-json bodies after origin validation', async () => {
  const handler = createNewsletterSubscribeHandler({ env: env(), fetchImpl: successfulFetch() });
  const response = responseHarness();
  await handler(request('email=test@example.com', { 'content-type': 'application/x-www-form-urlencoded' }), response);
  assert.equal(response.statusCode, 415);
});

test('deterministic newsletter draft includes the website as a first-class source', () => {
  const signals = {
    sourceUrls: ['https://longmontai.com/', 'https://longmontai.com/model-watch'],
    website: { recentArticles: [{ id: 'edition-test', title: 'A useful AI update', summary: 'A precise recap.' }] },
    modelWatchStatus: { successfulSources: 2, totalSources: 3, detectedModels: ['Model A', 'Model B'] },
    sourceHighlights: [{ company: 'Example AI', url: 'https://example.com', matches: ['Model B'], ok: true }],
  };
  const draft = deterministicDraftFromSignals(signals, { cadence: 'weekly', now: new Date('2026-08-24T12:00:00Z') });
  assert.equal(draft.cadence, 'weekly');
  assert.ok(draft.sourceUrls.includes('https://longmontai.com/model-watch'));
  assert.ok(draft.html.includes('LongmontAI.com'));
  assert.ok(draft.items.some((item) => item.sourceUrl === 'https://longmontai.com/model-watch'));
});
