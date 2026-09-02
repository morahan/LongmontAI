import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { inspect } from 'node:util';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createNewsletterGenerateHandler } from '../../scripts/lib/newsletter/generate-handler.mjs';
import { createNewsletterSubscribeHandler } from '../../scripts/lib/newsletter/subscribe-handler.mjs';
import {
  collectWebsiteSignals,
  createCuratedNewsletterDraft,
  deterministicDraftFromSignals,
  sanitizeNewsletterDraft,
  validatedNewsletterUrl,
} from '../../scripts/lib/newsletter/curation.mjs';
import {
  NEWSLETTER_OUTBOUND_LIMITS,
  cancelNewsletterBody,
  enforceNewsletterSignupRateLimit,
  newsletterFetch,
  normalizeEmail,
  readBoundedResponseJson,
  readBoundedResponseText,
  recordNewsletterEvent,
  sendResendNotification,
  supabaseRest,
  syncSubscriberToListmonk,
} from '../../scripts/lib/newsletter/shared.mjs';

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

async function expectPostgresFailure(sql, pattern) {
  const result = await runLocalPostgres(sql);
  assert.notEqual(result.code, 0, 'database operation unexpectedly succeeded');
  assert.match(result.stderr, pattern);
}

function keyedIdentity(scope, value) {
  return createHmac('sha256', rateLimitSecret).update(`${scope}\0${value}`).digest('hex');
}

async function callGenerationClaim({
  cadence = 'weekly',
  periodStart = '2026-08-19',
  periodEnd = '2026-08-25',
  now = '2026-08-25T12:00:00.000Z',
} = {}) {
  const output = await postgresSql(`
    set role service_role;
    select outcome, issue_id, coalesce(owner_token::text, ''), deterministic_campaign_identity
    from public.newsletter_claim_generation(
      '${cadence}', '${periodStart}'::date, '${periodEnd}'::date, '${now}'::timestamptz, 900
    );
  `);
  const [outcome, issueId, ownerToken, campaignIdentity] = output.split('|');
  return { outcome, issueId, ownerToken, campaignIdentity };
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

test('outbound helper composes caller cancellation while preserving request payloads', async () => {
  const caller = new AbortController();
  let observed;
  const outbound = await newsletterFetch(async (_url, options) => {
    observed = options;
    return new Response('{}');
  }, 'https://provider.example.test/resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Contract': 'preserved' },
    body: JSON.stringify({ compatible: true }),
    signal: caller.signal,
  }, { timeoutMs: 1000 });

  assert.equal(observed.method, 'POST');
  assert.equal(observed.headers['X-Contract'], 'preserved');
  assert.deepEqual(JSON.parse(observed.body), { compatible: true });
  assert.notEqual(observed.signal, caller.signal);
  caller.abort(new Error('caller cancelled'));
  assert.equal(observed.signal.aborted, true);
  await outbound.response.body.cancel();
});

test('outbound helper terminates stalled requests with stable internal errors', async () => {
  let observedSignal;
  const keepEventLoopAlive = setTimeout(() => undefined, 50);
  try {
    await assert.rejects(
      newsletterFetch(async (_url, options) => {
        observedSignal = options.signal;
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('SECRET_PROVIDER_TIMEOUT_BODY')), { once: true });
        });
      }, 'https://provider.example.test/stall', {}, { timeoutMs: 5 }),
      (error) => {
        assert.equal(error.code, 'newsletter_outbound_aborted');
        assert.equal(error.message, 'Newsletter outbound request was aborted.');
        assert.doesNotMatch(error.message, /SECRET|provider\.example/i);
        return true;
      },
    );
  } finally {
    clearTimeout(keepEventLoopAlive);
  }
  assert.equal(observedSignal.aborted, true);
});

test('caller abort cancels a stalled streamed response after headers', async () => {
  const caller = new AbortController();
  let cancellations = 0;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('partial'));
    },
    cancel() {
      cancellations += 1;
    },
  });
  const outbound = await newsletterFetch(
    async () => new Response(stream),
    'https://provider.example.test/stream',
    { signal: caller.signal },
    { timeoutMs: 1000 },
  );
  const reading = readBoundedResponseText(outbound.response, { maxBytes: 100, signal: outbound.signal });
  setTimeout(() => caller.abort(new Error('caller abort')), 0);
  await assert.rejects(reading, (error) => {
    assert.equal(error.code, 'newsletter_outbound_aborted');
    assert.doesNotMatch(error.message, /partial|provider\.example/i);
    return true;
  });
  assert.equal(cancellations, 1);
});

test('bounded response cleanup never waits for a provider cancel promise', async () => {
  let cancellations = 0;
  const response = {
    body: {
      getReader() {
        return {
          read: async () => ({ done: false, value: new Uint8Array(6) }),
          cancel() {
            cancellations += 1;
            return new Promise(() => {});
          },
          releaseLock() {},
        };
      },
    },
  };
  const result = await Promise.race([
    assert.rejects(
      readBoundedResponseText(response, { maxBytes: 5 }),
      (error) => error.code === 'newsletter_response_too_large',
    ).then(() => 'settled'),
    new Promise((resolve) => setTimeout(() => resolve('timed_out'), 100)),
  ]);
  assert.equal(result, 'settled');
  assert.equal(cancellations, 1);

  let timeoutCancellations = 0;
  const timeoutResult = await Promise.race([
    assert.rejects(
      readBoundedResponseText({
        body: {
          getReader: () => ({
            read: () => new Promise(() => {}),
            cancel() {
              timeoutCancellations += 1;
              return new Promise(() => {});
            },
            releaseLock() {},
          }),
        },
      }, { maxBytes: 5, signal: AbortSignal.timeout(5) }),
      (error) => error.code === 'newsletter_outbound_aborted',
    ).then(() => 'settled'),
    new Promise((resolve) => setTimeout(() => resolve('timed_out'), 100)),
  ]);
  assert.equal(timeoutResult, 'settled');
  assert.equal(timeoutCancellations, 1);

  let bodyCancellations = 0;
  const start = Date.now();
  cancelNewsletterBody({
    cancel() {
      bodyCancellations += 1;
      return new Promise(() => {});
    },
  });
  assert.equal(bodyCancellations, 1);
  assert.ok(Date.now() - start < 100);
});

test('bounded response reader accepts null bodies as empty text and JSON but rejects malformed bodies', async () => {
  assert.equal(await readBoundedResponseText({ body: null }, { maxBytes: 5 }), '');
  assert.equal(await readBoundedResponseJson({ body: null }, { maxBytes: 5 }), null);
  await assert.rejects(
    readBoundedResponseText({ body: {} }, { maxBytes: 5 }),
    (error) => error.code === 'newsletter_response_invalid',
  );
});

test('provider failure sentinels never appear in newsletter errors or serialized curation data', async () => {
  const sentinel = 'PROVIDER_BODY=https://provider.invalid/private?auth=credential-secret';
  let failure;
  await assert.rejects(
    newsletterFetch(async () => { throw new Error(sentinel); }, 'https://provider.invalid/', {}, { timeoutMs: 1000 }),
    (error) => {
      failure = error;
      return error.code === 'newsletter_outbound_failed';
    },
  );
  let readFailure;
  await assert.rejects(
    readBoundedResponseText({
      body: {
        getReader: () => ({
          read: async () => { throw new Error(sentinel); },
          releaseLock() {},
        }),
      },
    }, { maxBytes: 5 }),
    (error) => {
      readFailure = error;
      return error.code === 'newsletter_response_invalid';
    },
  );
  let rateLimitFailure;
  await assert.rejects(
    enforceNewsletterSignupRateLimit(env(), {
      ip: '203.0.113.1',
      email: 'sentinel@example.com',
      now: new Date('2026-08-25T12:00:00Z'),
    }, async () => { throw new Error(sentinel); }),
    (error) => {
      rateLimitFailure = error;
      return error.code === 'rate_limit_unavailable';
    },
  );
  const observable = [failure, readFailure, rateLimitFailure].flatMap((error) => [
    error.message,
    String(error),
    JSON.stringify(error),
    JSON.stringify({ error }),
    inspect(error),
    ...Object.getOwnPropertyNames(error).map((name) => String(error[name])),
  ]).join('\n');
  assert.doesNotMatch(observable, /PROVIDER_BODY|provider\.invalid|credential-secret/i);

  const signals = await collectWebsiteSignals({
    root,
    now: new Date('2026-08-25T12:00:00Z'),
    fetchImpl: async () => { throw new Error(sentinel); },
  });
  assert.doesNotMatch(JSON.stringify(signals), /PROVIDER_BODY|provider\.invalid|credential-secret/i);
  assert.ok(signals.sourceHighlights.every((source) => source.error === 'Newsletter live source was unavailable.'));
});

test('bounded response reader cancels streamed oversize bodies before full buffering', async () => {
  let pulls = 0;
  let cancellations = 0;
  const stream = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new TextEncoder().encode(pulls === 1 ? 'abcd' : 'SECRET_PROVIDER_BODY'));
    },
    cancel() {
      cancellations += 1;
    },
  }, { highWaterMark: 0 });
  await assert.rejects(
    readBoundedResponseText(new Response(stream), { maxBytes: 5 }),
    (error) => {
      assert.equal(error.code, 'newsletter_response_too_large');
      assert.equal(error.message, 'Newsletter provider response exceeded the size limit.');
      assert.doesNotMatch(error.message, /SECRET_PROVIDER_BODY/);
      return true;
    },
  );
  assert.equal(pulls, 2);
  assert.equal(cancellations, 1);
});

test('live-source collection enforces the streaming 80KB ceiling and cancels each source', async () => {
  let cancellations = 0;
  let requests = 0;
  const signals = await collectWebsiteSignals({
    root,
    now: new Date('2026-08-25T12:00:00Z'),
    fetchImpl: async (_url, options) => {
      requests += 1;
      assert.ok(options.signal instanceof AbortSignal);
      const stream = new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array(NEWSLETTER_OUTBOUND_LIMITS.liveSource.maxBytes + 1));
        },
        cancel() {
          cancellations += 1;
        },
      }, { highWaterMark: 0 });
      return new Response(stream, { status: 200 });
    },
  });
  assert.equal(requests, 8);
  assert.equal(cancellations, 8);
  assert.equal(signals.sourceHighlights.length, 8);
  assert.ok(signals.sourceHighlights.every((source) => source.ok === false));
  assert.ok(signals.sourceHighlights.every((source) => source.error === 'Newsletter live source was unavailable.'));
});

test('provider wrappers accept null success bodies and reject malformed non-null bodies', async () => {
  const noContent = async () => new Response(null, { status: 204 });
  assert.equal(await supabaseRest(env(), 'newsletter_subscribers?select=id', {}, noContent), null);

  const listmonk = await syncSubscriberToListmonk(env({
    LISTMONK_BASE_URL: 'https://listmonk.example.test',
    LISTMONK_WEEKLY_LIST_UUID: '11111111-1111-4111-8111-111111111111',
  }), {
    email: 'empty-response@example.com',
    cadence: 'weekly',
    source: 'contract-test',
  }, noContent);
  assert.deepEqual(listmonk, { ok: true, status: 'submitted' });

  const resend = await sendResendNotification(env({
    RESEND_API_KEY: 'resend-test-key',
    NEWSLETTER_FROM_EMAIL: 'news@example.com',
    NEWSLETTER_OWNER_EMAIL: 'owner@example.com',
  }), {
    subject: 'Empty response',
    html: '<p>Empty response</p>',
    text: 'Empty response',
  }, noContent);
  assert.deepEqual(resend, { ok: true, data: null });

  const malformed = async () => ({ ok: true, status: 200, body: {} });
  await assert.rejects(
    supabaseRest(env(), 'newsletter_subscribers?select=id', {}, malformed),
    (error) => error.code === 'newsletter_response_invalid',
  );
  await assert.rejects(
    syncSubscriberToListmonk(env({
      LISTMONK_BASE_URL: 'https://listmonk.example.test',
      LISTMONK_WEEKLY_LIST_UUID: '11111111-1111-4111-8111-111111111111',
    }), {
      email: 'malformed-response@example.com', cadence: 'weekly', source: 'contract-test',
    }, malformed),
    (error) => error.code === 'newsletter_response_invalid',
  );
  await assert.rejects(
    sendResendNotification(env({
      RESEND_API_KEY: 'resend-test-key',
      NEWSLETTER_FROM_EMAIL: 'news@example.com',
      NEWSLETTER_OWNER_EMAIL: 'owner@example.com',
    }), {
      subject: 'Malformed response', html: '<p>Malformed response</p>', text: 'Malformed response',
    }, malformed),
    (error) => error.code === 'newsletter_response_invalid',
  );
});

test('newsletter event allowlists reject unknown structure and strip every sentinel payload field', async () => {
  const subscriberId = '00000000-0000-4000-8000-000000000081';
  const issueId = '00000000-0000-4000-8000-000000000082';
  const providerEventId = '00000000-0000-4000-8000-000000000083';
  const sentinels = [
    'EVENT_CREDENTIAL_SENTINEL',
    'EVENT_PROVIDER_BODY_SENTINEL',
    'https://event-sentinel.invalid/private',
    'event-sentinel@example.com',
    '203.0.113.241',
    'EVENT_INTERNAL_METADATA_SENTINEL',
  ];
  const poison = Object.fromEntries(sentinels.map((value, index) => [`extra${index}`, value]));
  const captured = [];
  const fetchImpl = async (_url, options) => {
    captured.push(JSON.parse(options.body));
    return new Response(JSON.stringify([{ id: '00000000-0000-4000-8000-000000000084' }]));
  };
  const baseEnv = env();

  await recordNewsletterEvent(baseEnv, {
    subscriberId,
    eventType: 'subscribe',
    provider: 'website',
    providerEventId,
    payload: poison,
    ...poison,
  }, fetchImpl);
  await recordNewsletterEvent(baseEnv, {
    subscriberId,
    eventType: 'listmonk_sync',
    provider: 'listmonk',
    payload: { ok: true, status: 'submitted', skipped: false, reason: null, ...poison },
    ...poison,
  }, fetchImpl);
  await recordNewsletterEvent(baseEnv, {
    subscriberId,
    eventType: 'listmonk_sync',
    provider: 'listmonk',
    payload: { status: sentinels[0], reason: sentinels[1], ...poison },
  }, fetchImpl);
  await recordNewsletterEvent(baseEnv, {
    subscriberId,
    eventType: 'error',
    provider: 'listmonk',
    payload: { message: sentinels.join(' '), code: sentinels[0], ...poison },
  }, fetchImpl);
  await recordNewsletterEvent(baseEnv, {
    eventType: 'draft_generated',
    provider: 'openai',
    payload: { issueId, cadence: 'weekly', campaignId: 91, campaignStatus: 'draft', recovered: false, ...poison },
    ...poison,
  }, fetchImpl);

  assert.deepEqual(captured.map((event) => event.payload), [
    {},
    { ok: true, status: 'submitted', skipped: false, reason: null },
    { ok: false, status: null, skipped: false, reason: null },
    { code: 'newsletter_provider_operation_failed', message: 'Newsletter provider operation failed.' },
    { issueId, cadence: 'weekly', campaignId: 91, campaignStatus: 'draft', recovered: false },
  ]);
  assert.equal(captured[0].provider_event_id, providerEventId);
  assert.deepEqual(captured.map(({ event_type, provider }) => [event_type, provider]), [
    ['subscribe', 'website'],
    ['listmonk_sync', 'listmonk'],
    ['listmonk_sync', 'listmonk'],
    ['error', 'listmonk'],
    ['draft_generated', 'openai'],
  ]);
  for (const sentinel of sentinels) assert.doesNotMatch(JSON.stringify(captured), new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  const invalidEvents = [
    { subscriberId, eventType: sentinels[0], provider: 'website', payload: poison },
    { subscriberId, eventType: 'subscribe', provider: sentinels[0], payload: poison },
    { subscriberId, eventType: 'subscribe', provider: 'listmonk', payload: poison },
    { subscriberId: sentinels[3], eventType: 'subscribe', provider: 'website', payload: poison },
    { subscriberId, eventType: 'subscribe', provider: 'website', providerEventId: sentinels[2], payload: poison },
    { eventType: 'draft_generated', provider: 'deterministic', payload: { issueId: sentinels[4], cadence: 'weekly' } },
  ];
  const callsBeforeInvalid = captured.length;
  for (const event of invalidEvents) {
    await assert.rejects(recordNewsletterEvent(baseEnv, event, fetchImpl), (error) => {
      assert.equal(error.code, 'newsletter_event_invalid');
      assert.equal(error.message, 'Newsletter event was invalid.');
      const rendered = `${String(error)}\n${inspect(error)}\n${JSON.stringify(error)}`;
      for (const sentinel of sentinels) assert.doesNotMatch(rendered, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      return true;
    });
  }
  assert.equal(captured.length, callsBeforeInvalid);
});

test('Listmonk admin subscription sends only identity, required list, and double-opt-in fields', async () => {
  let captured;
  const result = await syncSubscriberToListmonk(env({
    LISTMONK_BASE_URL: 'https://listmonk.example.test',
    LISTMONK_WEEKLY_LIST_UUID: undefined,
    LISTMONK_NEWSLETTER_LIST_UUID: undefined,
    LISTMONK_WEEKLY_LIST_ID: '42',
    LISTMONK_API_USERNAME: 'api-user',
    LISTMONK_API_TOKEN: 'api-token',
  }), {
    email: 'minimal@example.com',
    name: 'Minimal Person',
    cadence: 'weekly',
    source: 'PRIVATE_SOURCE_METADATA',
    page: 'PRIVATE_PAGE_METADATA',
    ip: '203.0.113.99',
  }, async (_url, options) => {
    captured = JSON.parse(options.body);
    return new Response('{}');
  });

  assert.deepEqual(result, { ok: true, status: 'submitted' });
  assert.deepEqual(captured, {
    email: 'minimal@example.com',
    name: 'Minimal Person',
    status: 'enabled',
    lists: [42],
    preconfirm_subscriptions: false,
  });
  assert.doesNotMatch(JSON.stringify(captured), /PRIVATE_|203\.0\.113\.99|cadence|source|attribs/i);
});

test('setup-check subprocess sanitizes sentinels and does not await stuck body cancellation', async () => {
  const sentinels = {
    url: 'https://SETUP_SENTINEL_URL.invalid/private',
    auth: 'SETUP_SENTINEL_AUTH_CREDENTIAL',
    body: 'SETUP_SENTINEL_PROVIDER_BODY',
  };
  const childSource = `
    const output = [];
    console.log = (...values) => output.push(values.map(String).join(' '));
    const stuckBody = { cancel: () => new Promise(() => {}) };
    globalThis.fetch = async (url, options = {}) => {
      if (url === process.env.SUPABASE_URL + '/rest/v1/newsletter_subscribers?select=id&limit=1'
        && options.headers?.Authorization === 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { ok: true, status: 200, body: null };
      }
      if (url === process.env.LISTMONK_BASE_URL + '/api/public/lists') {
        return { ok: true, status: 200, body: stuckBody };
      }
      if (url === 'https://api.resend.com/domains'
        && options.headers?.Authorization === 'Bearer ' + process.env.RESEND_API_KEY) {
        return { ok: true, status: 200, body: stuckBody };
      }
      throw new Error(process.env.NEWSLETTER_TEST_PROVIDER_BODY);
    };
    await import('./scripts/newsletter-setup-check.mjs');
    process.stdout.write(JSON.stringify({ output }) + '\\n');
  `;
  const started = Date.now();
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', childSource], {
      cwd: root,
      env: {
        PATH: process.env.PATH ?? '',
        SUPABASE_URL: `${sentinels.url}/supabase`,
        SUPABASE_SERVICE_ROLE_KEY: sentinels.auth,
        LISTMONK_BASE_URL: `${sentinels.url}/listmonk`,
        LISTMONK_API_USERNAME: sentinels.auth,
        LISTMONK_API_TOKEN: sentinels.auth,
        RESEND_API_KEY: sentinels.auth,
        NEWSLETTER_TEST_PROVIDER_BODY: sentinels.body,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('newsletter setup-check subprocess did not terminate'));
    }, 1000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
  assert.equal(result.code, 0, result.stderr);
  assert.ok(Date.now() - started < 1000, 'newsletter setup-check subprocess did not terminate promptly');
  const serialized = JSON.stringify(JSON.parse(result.stdout));
  assert.match(serialized, /ok supabase:|ok listmonk:|ok resend:/);
  for (const sentinel of Object.values(sentinels)) {
    assert.doesNotMatch(result.stdout, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(result.stderr, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(serialized, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('outbound budgets are finite, provider-specific, and setup check terminates without environment', async () => {
  for (const budget of Object.values(NEWSLETTER_OUTBOUND_LIMITS)) {
    assert.ok(Number.isInteger(budget.timeoutMs) && budget.timeoutMs > 0);
    assert.ok(Number.isInteger(budget.maxBytes) && budget.maxBytes > 0);
  }
  assert.notEqual(NEWSLETTER_OUTBOUND_LIMITS.openai.timeoutMs, NEWSLETTER_OUTBOUND_LIMITS.liveSource.timeoutMs);

  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/newsletter-setup-check.mjs'], {
      cwd: root,
      env: { PATH: process.env.PATH ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('newsletter setup check did not terminate'));
    }, 2000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /missing supabase/);
  assert.match(result.stdout, /missing listmonk/);
  assert.match(result.stdout, /missing resend/);
});

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

test('Supabase local config disables unused Auth and seeding without missing seed paths', async () => {
  const config = await readFile(path.join(root, 'supabase/config.toml'), 'utf8');
  const section = (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return config.match(new RegExp(`^\\[${escaped}\\]\\n([\\s\\S]*?)(?=^\\[)`, 'm'))?.[1] ?? '';
  };
  const seed = section('db.seed');
  const auth = section('auth');
  const authEmail = section('auth.email');

  assert.match(seed, /^enabled = false$/m);
  assert.match(seed, /^sql_paths = \[\]$/m);
  assert.match(auth, /^enabled = false$/m);
  assert.match(auth, /^enable_signup = false$/m);
  assert.match(authEmail, /^enable_signup = false$/m);
  assert.doesNotMatch(auth, /^enabled = true$/m);
  assert.doesNotMatch(auth, /^enable_signup = true$/m);
  assert.doesNotMatch(authEmail, /^enable_signup = true$/m);

  const configuredSeedPaths = [...seed.matchAll(/["']([^"']+\.sql)["']/g)].map((match) => match[1]);
  assert.deepEqual(configuredSeedPaths, []);
  for (const seedPath of configuredSeedPaths) {
    await assert.doesNotReject(readFile(path.resolve(root, 'supabase', seedPath), 'utf8'));
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

test('generation migration declares database idempotency and transactional RPCs', async () => {
  const migration = await readFile(path.join(root, 'supabase/migrations/20260825091000_newsletter_generation_idempotency.sql'), 'utf8');
  assert.match(migration, /generation_idempotency_key text/);
  assert.match(migration, /create unique index newsletter_issues_generation_idempotency_idx/);
  assert.match(migration, /where generation_idempotency_key is not null/);
  assert.match(migration, /newsletter_claim_generation/);
  assert.match(migration, /on conflict \(generation_idempotency_key\)[\s\S]*do nothing/);
  assert.match(migration, /newsletter_prepare_generation/);
  assert.match(migration, /insert into public\.newsletter_issue_items/);
  assert.match(migration, /campaign_identity/);
  assert.doesNotMatch(migration, /create policy/i);
});

test('generation migration applies over preserved legacy cadence-period duplicates', async () => {
  const migration = await readFile(path.join(root, 'supabase/migrations/20260825091000_newsletter_generation_idempotency.sql'), 'utf8');
  await postgresSql(`
    drop function public.newsletter_claim_generation(text, date, date, timestamptz, integer);
    drop function public.newsletter_prepare_generation(uuid, uuid, jsonb, jsonb, timestamptz);
    drop function public.newsletter_mark_campaign_attempt(uuid, uuid, timestamptz);
    drop function public.newsletter_release_campaign_recovery(uuid, uuid, text, timestamptz);
    drop function public.newsletter_complete_generation(uuid, uuid, integer, text, timestamptz);
    drop function public.newsletter_create_issue_with_items(jsonb, jsonb);
    drop index public.newsletter_issues_generation_idempotency_idx;
    alter table public.newsletter_issues
      drop constraint newsletter_issues_generation_state_check,
      drop column generation_idempotency_key,
      drop column generation_state,
      drop column generation_owner,
      drop column generation_claim_expires_at,
      drop column generation_error,
      drop column campaign_identity,
      drop column campaign_attempted_at,
      drop column generation_completed_at;
    truncate table public.newsletter_issues cascade;
    insert into public.newsletter_issues (
      cadence, period_start, period_end, subject, summary, html_body, text_body
    ) values
      ('weekly', '2026-08-19', '2026-08-25', 'Legacy one', 'Legacy', '', ''),
      ('weekly', '2026-08-19', '2026-08-25', 'Legacy two', 'Legacy', '', '');
    ${migration}
  `);
  assert.equal(
    await postgresSql("select count(*), count(generation_idempotency_key) from public.newsletter_issues where cadence = 'weekly' and period_start = '2026-08-19' and period_end = '2026-08-25';"),
    '2|0',
  );
  const claims = await Promise.all(Array.from({ length: 32 }, () => callGenerationClaim()));
  assert.equal(claims.filter(({ outcome }) => outcome === 'claimed').length, 1);
  assert.equal(claims.filter(({ outcome }) => outcome === 'in_progress').length, 31);
  assert.equal(
    await postgresSql("select count(*), count(generation_idempotency_key) from public.newsletter_issues where cadence = 'weekly' and period_start = '2026-08-19' and period_end = '2026-08-25';"),
    '3|1',
  );
});

test('migrated Postgres repeatedly serializes high-concurrency claims', async () => {
  for (let round = 0; round < 4; round += 1) {
    await postgresSql('truncate table public.newsletter_issues cascade;');
    const claims = await Promise.all(Array.from({ length: 24 }, () => callGenerationClaim()));
    assert.equal(claims.filter(({ outcome }) => outcome === 'claimed').length, 1, `round ${round}`);
    assert.equal(claims.filter(({ outcome }) => outcome === 'in_progress').length, 23, `round ${round}`);
  }
});

test('migrated Postgres returns completed duplicates and rolls back issue plus items', async () => {
  await postgresSql('truncate table public.newsletter_issues cascade;');
  const claims = await Promise.all(Array.from({ length: 16 }, () => callGenerationClaim()));
  assert.equal(claims.filter(({ outcome }) => outcome === 'claimed').length, 1);
  assert.equal(claims.filter(({ outcome }) => outcome === 'in_progress').length, 15);
  const claim = claims.find(({ outcome }) => outcome === 'claimed');
  assert.ok(claim?.ownerToken);
  const initialLeaseSeconds = Number(await postgresSql(`select floor(extract(epoch from generation_claim_expires_at - clock_timestamp())) from public.newsletter_issues where id = '${claim.issueId}';`));
  assert.ok(initialLeaseSeconds >= 850 && initialLeaseSeconds <= 900, `initial lease ${initialLeaseSeconds}`);
  assert.equal(new Set(claims.map(({ issueId }) => issueId)).size, 1);
  assert.equal(new Set(claims.map(({ campaignIdentity }) => campaignIdentity)).size, 1);

  const validDraft = JSON.stringify({
    status: 'draft',
    subject: 'Transactional issue',
    preheader: 'Preheader',
    summary: 'Summary',
    html: '<p>Body</p>',
    text: 'Body',
    curatorModel: null,
    websiteSnapshot: {},
    sourceUrls: ['https://longmontai.com/'],
  });
  const invalidItems = JSON.stringify([
    { category: 'models', title: 'Valid', synthesis: 'Valid item', score: 50, sortOrder: 0 },
    { category: 'not-valid', title: 'Invalid', synthesis: 'Must roll back', score: 50, sortOrder: 1 },
  ]);
  await expectPostgresFailure(`
    set role service_role;
    select public.newsletter_prepare_generation(
      '${claim.issueId}', '${claim.ownerToken}', $draft$${validDraft}$draft$::jsonb,
      $items$${invalidItems}$items$::jsonb, '2026-08-25T12:01:00Z'::timestamptz
    );
  `, /newsletter_issue_items_category_check/);
  assert.equal(
    await postgresSql(`select subject, (select count(*) from public.newsletter_issue_items where issue_id = '${claim.issueId}') from public.newsletter_issues where id = '${claim.issueId}';`),
    'Generation in progress|0',
  );

  const validItems = JSON.stringify([
    { category: 'models', title: 'Valid', synthesis: 'Valid item', score: 50, sortOrder: 0 },
  ]);
  await postgresSql(`
    set role service_role;
    select public.newsletter_prepare_generation(
      '${claim.issueId}', '${claim.ownerToken}', $draft$${validDraft}$draft$::jsonb,
      $items$${validItems}$items$::jsonb, '2020-01-01T00:00:00Z'::timestamptz
    );
  `);
  const transitionLeaseSeconds = Number(await postgresSql(`select floor(extract(epoch from generation_claim_expires_at - clock_timestamp())) from public.newsletter_issues where id = '${claim.issueId}';`));
  assert.ok(transitionLeaseSeconds >= 850 && transitionLeaseSeconds <= 900, `transition lease ${transitionLeaseSeconds}`);
  await postgresSql(`
    set role service_role;
    select public.newsletter_mark_campaign_attempt(
      '${claim.issueId}', '${claim.ownerToken}', '2020-01-01T00:00:00Z'::timestamptz
    );
    select public.newsletter_complete_generation(
      '${claim.issueId}', '${claim.ownerToken}', 321, 'draft', '2020-01-01T00:00:00Z'::timestamptz
    );
  `);
  assert.equal(
    await postgresSql(`select generation_state, listmonk_campaign_id, listmonk_campaign_status, (select count(*) from public.newsletter_issue_items where issue_id = '${claim.issueId}') from public.newsletter_issues where id = '${claim.issueId}';`),
    'completed|321|draft|1',
  );
  const duplicate = await callGenerationClaim({ now: '2026-08-25T12:04:00Z' });
  assert.equal(duplicate.outcome, 'completed');
  assert.equal(duplicate.issueId, claim.issueId);
  assert.equal(duplicate.ownerToken, '');

  const recoveryClaim = await callGenerationClaim({
    cadence: 'biweekly',
    periodStart: '2026-08-12',
    periodEnd: '2026-08-25',
  });
  await postgresSql(`
    set role service_role;
    select public.newsletter_prepare_generation(
      '${recoveryClaim.issueId}', '${recoveryClaim.ownerToken}', $draft$${validDraft}$draft$::jsonb,
      $items$${validItems}$items$::jsonb, '2026-08-25T12:05:00Z'::timestamptz
    );
    select public.newsletter_mark_campaign_attempt(
      '${recoveryClaim.issueId}', '${recoveryClaim.ownerToken}', '2026-08-25T12:06:00Z'::timestamptz
    );
    select public.newsletter_release_campaign_recovery(
      '${recoveryClaim.issueId}', '${recoveryClaim.ownerToken}', 'provider timeout', '2026-08-25T12:07:00Z'::timestamptz
    );
  `);
  await expectPostgresFailure(`
    set role service_role;
    select public.newsletter_complete_generation(
      '${recoveryClaim.issueId}', '${recoveryClaim.ownerToken}', null, null, '2099-01-01T00:00:00Z'::timestamptz
    );
  `, /newsletter generation ownership lost/);
  const recovery = await callGenerationClaim({
    cadence: 'biweekly',
    periodStart: '2026-08-12',
    periodEnd: '2026-08-25',
    now: '2026-08-25T12:08:00Z',
  });
  assert.equal(recovery.outcome, 'recover_campaign');
  assert.equal(recovery.issueId, recoveryClaim.issueId);
  assert.equal(recovery.campaignIdentity, 'longmontai-biweekly-2026-08-12-2026-08-25');
  const recoveryConflict = await callGenerationClaim({
    cadence: 'biweekly',
    periodStart: '2026-08-12',
    periodEnd: '2026-08-25',
    now: '2026-08-25T12:08:01Z',
  });
  assert.equal(recoveryConflict.outcome, 'in_progress');
});

test('generation RPC and table privileges are restricted to intended service-role execution', async () => {
  const signatures = [
    'public.newsletter_claim_generation(text,date,date,timestamptz,integer)',
    'public.newsletter_prepare_generation(uuid,uuid,jsonb,jsonb,timestamptz)',
    'public.newsletter_mark_campaign_attempt(uuid,uuid,timestamptz)',
    'public.newsletter_release_campaign_recovery(uuid,uuid,text,timestamptz)',
    'public.newsletter_complete_generation(uuid,uuid,integer,text,timestamptz)',
    'public.newsletter_create_issue_with_items(jsonb,jsonb)',
  ];
  const expressions = [];
  for (const role of ['anon', 'authenticated', 'service_role']) {
    for (const signature of signatures) {
      expressions.push(`has_function_privilege('${role}', '${signature}', 'execute')`);
    }
  }
  expressions.push(
    "has_table_privilege('anon', 'public.newsletter_issues', 'select,insert,update,delete')",
    "has_table_privilege('authenticated', 'public.newsletter_issues', 'select,insert,update,delete')",
    "has_table_privilege('service_role', 'public.newsletter_issues', 'select,insert,update,delete')",
    "has_table_privilege('service_role', 'public.newsletter_issue_items', 'select,insert,update,delete')",
  );
  assert.equal(
    await postgresSql(`select ${expressions.join(', ')};`),
    `${Array(12).fill('f').join('|')}|${Array(6).fill('t').join('|')}|f|f|f|f`,
  );
  await expectPostgresPermissionDenied(`
    set role service_role;
    insert into public.newsletter_issues(cadence, period_start, period_end, subject, summary, html_body, text_body)
    values ('weekly', '2026-01-01', '2026-01-07', 'Denied', 'Denied', '', '');
  `);
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

test('newsletter HTML is constructed from normalized escaped plain text and validated URLs', () => {
  const draft = sanitizeNewsletterDraft({
    cadence: 'weekly',
    periodStart: '2026-08-19',
    periodEnd: '2026-08-25',
    name: 'Unsafe draft',
    subject: '<script>alert(1)</script>\u0000',
    preheader: '<style>body{display:none}</style>',
    summary: '<img src=x onerror=alert(1)>',
    html: '<svg onload=alert(1)><script>alert(1)</script></svg>',
    text: '<iframe src=javascript:alert(1)>',
    items: [
      {
        category: 'models',
        title: '<img src=x onerror=alert(1)>',
        synthesis: '<svg onload=alert(1)>signal</svg>',
        sourceName: '<script>source</script>',
        sourceUrl: 'javascript:alert(1)',
        score: 50,
      },
      {
        category: 'tools',
        title: 'Safe link',
        synthesis: 'Safe synthesis',
        sourceName: 'Safe source',
        sourceUrl: 'https://safe.example/path?q=1',
        score: 60,
      },
    ],
    sourceUrls: ['data:text/html,x', 'https://safe.example/source', '/model-watch'],
  });

  assert.doesNotMatch(draft.html, /<script|<style|<svg|<img|<iframe/i);
  assert.doesNotMatch(draft.html, /javascript:|data:text|file:/i);
  assert.doesNotMatch(draft.html, /<[^>]+\son(?:error|load)=/i);
  assert.match(draft.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal(draft.items[0].sourceUrl, 'https://longmontai.com/');
  assert.equal(draft.items[1].sourceUrl, 'https://safe.example/path?q=1');
  assert.deepEqual(draft.sourceUrls, ['https://safe.example/source', 'https://longmontai.com/model-watch']);
  assert.doesNotMatch(draft.html, /<svg onload=alert\(1\)>/i);
});

test('newsletter text normalization removes Unicode format controls before codepoint bounds', () => {
  const bounded = sanitizeNewsletterDraft({
    subject: `${'ﬃ'.repeat(100)}\u202E\u2066\u2067\u2068\u2069\u200B`,
    preheader: `safe\u202Ehidden\u2066isolated\u2069zero\u200Bwidth`,
    summary: 'summary',
    items: [{
      category: 'models',
      title: `title\u202E\u2066\u2069\u200B`,
      synthesis: `synthesis\u202E\u2067\u2068\u200B`,
      sourceName: 'source',
      sourceUrl: 'https://safe.example/',
    }],
    sourceUrls: [],
  });
  assert.equal(Array.from(bounded.subject).length, 160);
  assert.equal(bounded.subject, 'ffi'.repeat(100).slice(0, 160));
  assert.doesNotMatch(bounded.subject, /ﬃ/u);
  for (const value of [bounded.subject, bounded.preheader, bounded.items[0].title, bounded.items[0].synthesis]) {
    assert.doesNotMatch(value, /[\u202E\u2066-\u2069\u200B]/u);
  }
});

test('newsletter URL validation rejects dangerous, malformed, encoded, and protocol-relative values', () => {
  for (const unsafe of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '//evil.example/path',
    '%6a%61%76%61%73%63%72%69%70%74%3Aalert(1)',
    '%252f%252fevil.example/path',
    '%25256a%252561%252576%252561%252573%252563%252572%252569%252570%252574%25253Aalert(1)',
    'ｊａｖａｓｃｒｉｐｔ：alert(1)',
    '／／evil.example/path',
    'https://user:password@safe.example/path',
    'https://user%40evil.example@safe.example/path',
    'https://%2575ser:%2570ass@safe.example/path',
    '%20%20javascript%3Aalert(1)',
    'https://safe.example/%',
    'https://safe.example/path\u0000evil',
    '\\evil.example\\path',
    '/not-an-approved-first-party-path',
    '/model-watch?next=javascript:alert(1)',
  ]) {
    assert.equal(validatedNewsletterUrl(unsafe), null, unsafe);
  }
  assert.equal(validatedNewsletterUrl('https://safe.example/path?q=signal#section'), 'https://safe.example/path?q=signal#section');
  assert.equal(validatedNewsletterUrl('/model-watch'), 'https://longmontai.com/model-watch');
  assert.equal(validatedNewsletterUrl('/edition/edition-2026-08-19'), 'https://longmontai.com/edition/edition-2026-08-19');
});

test('OpenAI receives only the purpose-built newsletter curation projection', async () => {
  const credentialSentinel = 'OPENAI_SECRET_NOT_IN_BODY';
  const pathSentinel = 'src/articles/private-repository-path.md';
  const errorSentinel = 'INTERNAL_FETCH_ERROR_SENTINEL';
  const inventorySentinel = 'UNRELATED_MONITORED_INVENTORY_SENTINEL';
  let requestBody;
  await createCuratedNewsletterDraft({
    env: { OPENAI_API_KEY: credentialSentinel, NEWSLETTER_CURATOR_MODEL: 'test-model' },
    cadence: 'weekly',
    now: new Date('2026-08-25T12:00:00Z'),
    collectSignalsImpl: async () => ({
      collectedAt: 'internal-timestamp',
      website: {
        recentArticles: [{
          id: 'edition-2026-08-19',
          title: 'Relevant article',
          summary: 'Relevant summary',
          path: pathSentinel,
          headings: ['Internal heading inventory'],
          sourceUrls: ['https://research.example/relevant'],
          privateMetadata: 'PRIVATE_ARTICLE_METADATA',
        }],
      },
      modelWatchStatus: {
        checkedAt: 'internal-check-time',
        successfulSources: 2,
        totalSources: 3,
        detectedModels: ['Relevant Model'],
        internalMetadata: 'PRIVATE_MODEL_METADATA',
      },
      monitoredSources: [{ company: inventorySentinel, url: 'https://inventory.invalid' }],
      sourceHighlights: [
        { company: 'Relevant Company', url: 'https://company.example/release', matches: ['Relevant Model v2'], ok: true },
        { company: 'Failed Company', url: 'https://failed.invalid', matches: [], ok: false, error: errorSentinel },
      ],
      sourceUrls: ['https://research.example/relevant'],
      repositoryMetadata: 'PRIVATE_REPOSITORY_METADATA',
    }),
    fetchImpl: async (_url, options) => {
      requestBody = options.body;
      return new Response(JSON.stringify({
        output_text: JSON.stringify({ subject: 'Curated', preheader: 'Preview', summary: 'Summary' }),
      }), { status: 200 });
    },
  });

  const providerPayload = JSON.parse(requestBody);
  const input = JSON.parse(providerPayload.input);
  assert.deepEqual(Object.keys(input).sort(), ['context', 'expectedShape']);
  assert.deepEqual(Object.keys(input.context).sort(), [
    'cadence', 'modelWatch', 'periodEnd', 'periodStart', 'recentArticles', 'reviewSurfaces', 'sourceHighlights',
  ]);
  assert.deepEqual(input.context.recentArticles, [{
    title: 'Relevant article',
    summary: 'Relevant summary',
    publicUrl: 'https://longmontai.com/edition/edition-2026-08-19',
    sourceUrls: ['https://research.example/relevant'],
  }]);
  assert.deepEqual(input.context.sourceHighlights, [{
    company: 'Relevant Company',
    sourceUrl: 'https://company.example/release',
    matches: ['Relevant Model v2'],
  }]);
  for (const prohibited of [credentialSentinel, pathSentinel, errorSentinel, inventorySentinel, 'PRIVATE_', 'internal-timestamp', 'internal-check-time']) {
    assert.doesNotMatch(requestBody, new RegExp(prohibited, 'i'));
  }
});

test('public curator API sanitizes malformed OpenAI output errors without causes', async () => {
  const bodySentinel = 'MALFORMED_PROVIDER_BODY_SENTINEL';
  const urlSentinel = 'https://provider.invalid/private-output';
  const credentialSentinel = 'OPENAI_CREDENTIAL_SENTINEL';
  let failure;

  await assert.rejects(
    createCuratedNewsletterDraft({
      env: { OPENAI_API_KEY: credentialSentinel, NEWSLETTER_CURATOR_MODEL: 'test-model' },
      now: new Date('2026-08-25T12:00:00Z'),
      collectSignalsImpl: async () => ({
        sourceUrls: [],
        website: { recentArticles: [] },
        modelWatchStatus: { successfulSources: 0, totalSources: 0, detectedModels: [] },
        sourceHighlights: [],
      }),
      fetchImpl: async () => new Response(JSON.stringify({
        output_text: `prefix {"body":"${bodySentinel}", invalid} ${urlSentinel}`,
      }), { status: 200 }),
    }),
    (error) => {
      failure = error;
      assert.equal(error.message, 'Newsletter curator returned invalid JSON.');
      assert.equal(Object.hasOwn(error, 'cause'), false);
      return true;
    },
  );

  const rendered = [
    failure.message,
    failure.name,
    failure.stack,
    String(failure),
    JSON.stringify(failure),
    JSON.stringify({ error: failure }),
    inspect(failure),
    ...Object.getOwnPropertyNames(failure).map((name) => String(failure[name])),
  ].join('\n');
  for (const sentinel of [bodySentinel, urlSentinel, credentialSentinel]) {
    assert.doesNotMatch(rendered, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});

test('mocked OpenAI output cannot restore unsafe signal URLs or model HTML', async () => {
  const unsafeSignals = {
    sourceUrls: [
      'javascript:alert(1)',
      'data:text/html,unsafe',
      '%252f%252fevil.example/path',
      '/model-watch',
      'https://safe.example/source',
    ],
    website: { recentArticles: [] },
    modelWatchStatus: { successfulSources: 1, totalSources: 1, detectedModels: ['Safe Model'] },
    sourceHighlights: [{ company: 'Unsafe', url: 'javascript:alert(1)', matches: ['Safe Model'], ok: true }],
  };
  const draft = await createCuratedNewsletterDraft({
    env: { OPENAI_API_KEY: 'test-key', NEWSLETTER_CURATOR_MODEL: 'test-model' },
    now: new Date('2026-08-25T12:00:00Z'),
    collectSignalsImpl: async () => unsafeSignals,
    fetchImpl: async () => new Response(JSON.stringify({
      output_text: JSON.stringify({
        subject: 'AI <script>alert(1)</script>',
        preheader: '<style>unsafe</style>',
        summary: '<svg onload=alert(1)>',
        html: '<script>MODEL_HTML</script>',
        items: [{
          category: 'models',
          title: '<img src=x onerror=alert(1)>',
          synthesis: 'Signal',
          sourceName: 'Source',
          sourceUrl: 'data:text/html,unsafe',
          score: 50,
        }],
      }),
    }), { status: 200 }),
  });
  assert.deepEqual(draft.sourceUrls, ['https://longmontai.com/model-watch', 'https://safe.example/source']);
  assert.equal(draft.items[0].sourceUrl, 'https://longmontai.com/model-watch');
  assert.doesNotMatch(draft.html, /MODEL_HTML|<script|<style|<svg|<img/i);
  assert.match(draft.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

function generatedDraft() {
  return {
    cadence: 'weekly',
    periodStart: '2026-08-19',
    periodEnd: '2026-08-25',
    name: 'Weekly briefing',
    subject: 'Weekly briefing',
    preheader: 'Preheader',
    summary: 'Summary',
    html: '<p>Briefing</p>',
    text: 'Briefing',
    items: [{ category: 'models', title: 'Model', synthesis: 'Summary', score: 50, sortOrder: 0 }],
    sourceUrls: ['https://longmontai.com/'],
    websiteSnapshot: {},
    curatorModel: null,
    usedAi: false,
  };
}

function generationEnv(overrides = {}) {
  return {
    CRON_SECRET: 'cron-secret',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    LISTMONK_BASE_URL: 'https://listmonk.example.com',
    LISTMONK_WEEKLY_LIST_ID: '1',
    LISTMONK_API_USERNAME: 'api-user',
    LISTMONK_API_TOKEN: 'api-token',
    NEWSLETTER_FROM_EMAIL: 'news@example.com',
    ...overrides,
  };
}

function generationRequest(headers = { authorization: 'Bearer cron-secret' }) {
  return { method: 'POST', query: {}, headers };
}

test('campaign, event, and owner providers receive only their required newsletter projections', async () => {
  const identity = 'longmontai-weekly-2026-08-19-2026-08-25';
  let persistedDraft;
  let campaignPayload;
  let notificationPayload;
  let eventPayload;
  const handler = createNewsletterGenerateHandler({
    env: generationEnv({
      NEWSLETTER_NOTIFY_OWNER: '1',
      NEWSLETTER_OWNER_EMAIL: 'owner@example.com',
      RESEND_API_KEY: 'resend-test-key',
    }),
    now: () => new Date('2026-08-25T12:00:00Z'),
    draftImpl: async () => ({
      ...generatedDraft(),
      subject: '<img src=x onerror=alert(1)> Subject',
      preheader: '<style>unsafe</style>',
      summary: '<script>summary</script>',
      html: '<script>MODEL_RAW_HTML</script><svg onload=alert(1)>',
      text: 'MODEL_RAW_TEXT',
      items: [{
        category: 'models',
        title: '<script>Item</script>',
        synthesis: '<img src=x onerror=alert(1)>',
        sourceName: 'Unsafe source',
        sourceUrl: 'data:text/html,<script>alert(1)</script>',
        score: 50,
      }],
    }),
    fetchImpl: async (url, options) => {
      if (url.endsWith('/rpc/newsletter_claim_generation')) {
        return new Response(JSON.stringify([{ outcome: 'claimed', issue_id: '00000000-0000-4000-8000-000000000060', owner_token: '00000000-0000-4000-8000-000000000061', deterministic_campaign_identity: identity, issue: {} }]));
      }
      if (url.endsWith('/rpc/newsletter_prepare_generation')) {
        persistedDraft = JSON.parse(options.body).p_draft;
        return new Response('{}');
      }
      if (url.endsWith('/rpc/newsletter_mark_campaign_attempt')) return new Response('{}');
      if (url === 'https://listmonk.example.com/api/campaigns') {
        campaignPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ data: { id: 91 } }));
      }
      if (url.endsWith('/rpc/newsletter_complete_generation')) return new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000060' }));
      if (url.endsWith('/newsletter_delivery_events')) {
        eventPayload = JSON.parse(options.body);
        return new Response(JSON.stringify([{ id: 'event' }]));
      }
      if (url === 'https://api.resend.com/emails') {
        notificationPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ id: 'notification' }));
      }
      throw new Error(`unexpected sanitization fetch ${url}`);
    },
  });
  const response = responseHarness();
  await handler(generationRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(campaignPayload.body, persistedDraft.html);
  assert.equal(campaignPayload.altbody, persistedDraft.text);
  assert.deepEqual(eventPayload.payload, {
    issueId: '00000000-0000-4000-8000-000000000060',
    cadence: 'weekly',
    campaignId: 91,
    campaignStatus: 'draft',
    recovered: false,
  });
  assert.deepEqual(notificationPayload, {
    from: 'news@example.com',
    to: 'owner@example.com',
    subject: 'Newsletter draft ready: 00000000-0000-4000-8000-000000000060',
    html: '<p>Newsletter draft <strong>00000000-0000-4000-8000-000000000060</strong> is ready for review.</p><p>&lt;script&gt;summary&lt;/script&gt;</p><p><a href="https://longmontai.com/newsletter">Review the newsletter workflow</a></p>',
    text: 'Newsletter draft 00000000-0000-4000-8000-000000000060 is ready for review.\n\n<script>summary</script>\n\nReview: https://longmontai.com/newsletter',
    tags: [{ name: 'workflow', value: 'longmontai-newsletter' }],
  });
  const restrictedPayloads = `${JSON.stringify(eventPayload.payload)}\n${JSON.stringify(notificationPayload)}`;
  assert.doesNotMatch(restrictedPayloads, /MODEL_RAW_HTML|MODEL_RAW_TEXT|campaignIdentity|curatorModel|api-token|resend-test-key/i);
  assert.doesNotMatch(notificationPayload.html, /onerror|Item|Unsafe source|data:text|<script/i);
  for (const representation of [persistedDraft.html, campaignPayload.body]) {
    assert.doesNotMatch(representation, /MODEL_RAW_HTML|<script|<style|<svg|<img/i);
    assert.doesNotMatch(representation, /javascript:|data:text|file:/i);
  }
  assert.equal(persistedDraft.items[0].sourceUrl, 'https://longmontai.com/');
});

test('generation claims before work and concurrent invocation creates at most one campaign', async () => {
  const identity = 'longmontai-weekly-2026-08-19-2026-08-25';
  let claimed = false;
  let campaignPosts = 0;
  let draftCalls = 0;
  let releaseDraft;
  let signalDraftStarted;
  const draftStarted = new Promise((resolve) => { signalDraftStarted = resolve; });
  const draftGate = new Promise((resolve) => { releaseDraft = resolve; });
  const fetchCalls = [];
  const fetchImpl = async (url, options) => {
    fetchCalls.push(url);
    if (url.endsWith('/rpc/newsletter_claim_generation')) {
      if (claimed) {
        return new Response(JSON.stringify([{ outcome: 'in_progress', issue_id: '00000000-0000-4000-8000-000000000010', owner_token: null, deterministic_campaign_identity: identity, issue: null }]));
      }
      claimed = true;
      return new Response(JSON.stringify([{ outcome: 'claimed', issue_id: '00000000-0000-4000-8000-000000000010', owner_token: '00000000-0000-4000-8000-000000000011', deterministic_campaign_identity: identity, issue: {} }]));
    }
    if (url.endsWith('/rpc/newsletter_prepare_generation') || url.endsWith('/rpc/newsletter_mark_campaign_attempt')) {
      return new Response('{}');
    }
    if (url === 'https://listmonk.example.com/api/campaigns' && options.method === 'POST') {
      campaignPosts += 1;
      assert.equal(JSON.parse(options.body).name, identity);
      return new Response(JSON.stringify({ data: { id: 41 } }));
    }
    if (url.endsWith('/rpc/newsletter_complete_generation')) {
      return new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000010' }));
    }
    if (url.endsWith('/newsletter_delivery_events')) return new Response(JSON.stringify([{ id: 'event' }]));
    throw new Error(`unexpected generation fetch ${url}`);
  };
  const handler = createNewsletterGenerateHandler({
    env: generationEnv(),
    fetchImpl,
    now: () => new Date('2026-08-25T12:00:00Z'),
    draftImpl: async () => {
      draftCalls += 1;
      signalDraftStarted();
      await draftGate;
      return generatedDraft();
    },
  });

  const firstResponse = responseHarness();
  const first = handler(generationRequest(), firstResponse);
  await draftStarted;
  assert.match(fetchCalls[0], /rpc\/newsletter_claim_generation$/);
  const secondResponse = responseHarness();
  await handler(generationRequest(), secondResponse);
  releaseDraft();
  await first;

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 409);
  assert.equal(secondResponse.body.error, 'newsletter_generation_in_progress');
  assert.equal(draftCalls, 1);
  assert.equal(campaignPosts, 1);
});

test('completed and unexpired in-progress duplicates return deterministically without providers', async () => {
  for (const scenario of [
    {
      outcome: 'completed',
      expectedStatus: 200,
      issue: { id: 'issue', listmonk_campaign_id: 52, listmonk_campaign_status: 'draft', campaign_identity: 'identity' },
    },
    { outcome: 'in_progress', expectedStatus: 409, issue: null },
  ]) {
    let fetches = 0;
    let drafts = 0;
    const handler = createNewsletterGenerateHandler({
      env: generationEnv(),
      now: () => new Date('2026-08-25T12:00:00Z'),
      fetchImpl: async (url) => {
        fetches += 1;
        assert.match(url, /rpc\/newsletter_claim_generation$/);
        return new Response(JSON.stringify([{
          outcome: scenario.outcome,
          issue_id: '00000000-0000-4000-8000-000000000020',
          owner_token: null,
          deterministic_campaign_identity: 'longmontai-weekly-2026-08-19-2026-08-25',
          issue: scenario.issue,
        }]));
      },
      draftImpl: async () => { drafts += 1; return generatedDraft(); },
    });
    const response = responseHarness();
    await handler(generationRequest(), response);
    assert.equal(response.statusCode, scenario.expectedStatus);
    assert.equal(fetches, 1);
    assert.equal(drafts, 0);
  }
});

test('ambiguous campaign timeout recovers by deterministic identity without a blind POST retry', async () => {
  const identity = 'longmontai-weekly-2026-08-19-2026-08-25';
  let claimCalls = 0;
  let campaignPosts = 0;
  let recoveryGets = 0;
  let draftCalls = 0;
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/rpc/newsletter_claim_generation')) {
      claimCalls += 1;
      return new Response(JSON.stringify([claimCalls === 1
        ? { outcome: 'claimed', issue_id: '00000000-0000-4000-8000-000000000030', owner_token: '00000000-0000-4000-8000-000000000031', deterministic_campaign_identity: identity, issue: {} }
        : { outcome: 'recover_campaign', issue_id: '00000000-0000-4000-8000-000000000030', owner_token: '00000000-0000-4000-8000-000000000032', deterministic_campaign_identity: identity, issue: { subject: 'Weekly briefing', html_body: '<p>Briefing</p>', text_body: 'Briefing', curator_model: null } }]));
    }
    if (url.endsWith('/rpc/newsletter_prepare_generation') || url.endsWith('/rpc/newsletter_mark_campaign_attempt') || url.endsWith('/rpc/newsletter_release_campaign_recovery')) {
      return new Response('{}');
    }
    if (url === 'https://listmonk.example.com/api/campaigns' && options.method === 'POST') {
      campaignPosts += 1;
      throw new Error('provider response timeout');
    }
    if (url.startsWith('https://listmonk.example.com/api/campaigns?query=') && options.method === 'GET') {
      recoveryGets += 1;
      return new Response(JSON.stringify({ data: { results: [{ id: 73, name: identity, status: 'draft' }] } }));
    }
    if (url.endsWith('/rpc/newsletter_complete_generation')) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_campaign_id, 73);
      return new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000030' }));
    }
    if (url.endsWith('/newsletter_delivery_events')) return new Response(JSON.stringify([{ id: 'event' }]));
    throw new Error(`unexpected recovery fetch ${url}`);
  };
  const handler = createNewsletterGenerateHandler({
    env: generationEnv(),
    fetchImpl,
    now: () => new Date('2026-08-25T12:00:00Z'),
    draftImpl: async () => { draftCalls += 1; return generatedDraft(); },
  });

  const timedOut = responseHarness();
  await handler(generationRequest(), timedOut);
  assert.equal(timedOut.statusCode, 502);
  const recovered = responseHarness();
  await handler(generationRequest(), recovered);
  assert.equal(recovered.statusCode, 200);
  assert.equal(recovered.body.campaign.recovered, true);
  assert.equal(campaignPosts, 1);
  assert.equal(recoveryGets, 1);
  assert.equal(draftCalls, 1);
});

test('recovered campaigns never forward stored HTML or send owner notification', async () => {
  const identity = 'longmontai-weekly-2026-08-19-2026-08-25';
  let resendCalls = 0;
  const outboundBodies = [];
  const handler = createNewsletterGenerateHandler({
    env: generationEnv({
      NEWSLETTER_NOTIFY_OWNER: '1',
      NEWSLETTER_OWNER_EMAIL: 'owner@example.com',
      RESEND_API_KEY: 'resend-test-key',
    }),
    now: () => new Date('2026-08-25T12:00:00Z'),
    draftImpl: async () => { throw new Error('recovery must not regenerate'); },
    fetchImpl: async (url, options = {}) => {
      if (options.body) outboundBodies.push(String(options.body));
      if (url.endsWith('/rpc/newsletter_claim_generation')) {
        return new Response(JSON.stringify([{
          outcome: 'recover_campaign',
          issue_id: '00000000-0000-4000-8000-000000000070',
          owner_token: '00000000-0000-4000-8000-000000000071',
          deterministic_campaign_identity: identity,
          issue: {
            subject: '<script>Stored subject</script>',
            preheader: '<style>Stored</style>',
            summary: '<svg onload=alert(1)>',
            html_body: '<script>STORED_RAW_HTML</script>',
            text_body: 'STORED_RAW_TEXT',
            source_urls: ['javascript:alert(1)'],
          },
        }]));
      }
      if (url.startsWith('https://listmonk.example.com/api/campaigns?query=')) {
        return new Response(JSON.stringify({ data: { results: [{ id: 94, name: identity, status: 'draft' }] } }));
      }
      if (url.endsWith('/rpc/newsletter_complete_generation')) return new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000070' }));
      if (url.endsWith('/newsletter_delivery_events')) return new Response(JSON.stringify([{ id: 'event' }]));
      if (url === 'https://api.resend.com/emails') { resendCalls += 1; return new Response('{}'); }
      throw new Error(`unexpected recovered-notification fetch ${url}`);
    },
  });
  const response = responseHarness();
  await handler(generationRequest(), response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.notification.reason, 'campaign_recovered');
  assert.equal(resendCalls, 0);
  assert.doesNotMatch(outboundBodies.join('\n'), /STORED_RAW_HTML|STORED_RAW_TEXT/);
});

test('every accepted campaign response shape forwards its validated positive id to completion', async () => {
  const acceptedShapes = [
    { payload: { data: { id: 61 } }, expectedId: 61 },
    { payload: { id: 62 }, expectedId: 62 },
  ];
  for (const { payload, expectedId } of acceptedShapes) {
    const identity = `longmontai-weekly-2026-08-19-2026-08-25-${expectedId}`;
    let completionId;
    const handler = createNewsletterGenerateHandler({
      env: generationEnv(),
      now: () => new Date('2026-08-25T12:00:00Z'),
      draftImpl: async () => generatedDraft(),
      fetchImpl: async (url, options) => {
        if (url.endsWith('/rpc/newsletter_claim_generation')) {
          return new Response(JSON.stringify([{ outcome: 'claimed', issue_id: `00000000-0000-4000-8000-0000000000${expectedId}`, owner_token: `00000000-0000-4000-8000-0000000001${expectedId}`, deterministic_campaign_identity: identity, issue: {} }]));
        }
        if (url.endsWith('/rpc/newsletter_prepare_generation') || url.endsWith('/rpc/newsletter_mark_campaign_attempt')) return new Response('{}');
        if (url === 'https://listmonk.example.com/api/campaigns') return new Response(JSON.stringify(payload));
        if (url.endsWith('/rpc/newsletter_complete_generation')) {
          completionId = JSON.parse(options.body).p_campaign_id;
          return new Response(JSON.stringify({ id: `00000000-0000-4000-8000-0000000000${expectedId}` }));
        }
        if (url.endsWith('/newsletter_delivery_events')) return new Response(JSON.stringify([{ id: 'event' }]));
        throw new Error(`unexpected accepted-shape fetch ${url}`);
      },
    });
    const response = responseHarness();
    await handler(generationRequest(), response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.campaign.campaignId, expectedId);
    assert.equal(completionId, expectedId);
  }
});

test('malformed campaign creation is persisted for recovery and never completed', async () => {
  const identity = 'longmontai-weekly-2026-08-19-2026-08-25';
  let releases = 0;
  let completes = 0;
  const handler = createNewsletterGenerateHandler({
    env: generationEnv(),
    now: () => new Date('2026-08-25T12:00:00Z'),
    draftImpl: async () => generatedDraft(),
    fetchImpl: async (url) => {
      if (url.endsWith('/rpc/newsletter_claim_generation')) {
        return new Response(JSON.stringify([{ outcome: 'claimed', issue_id: '00000000-0000-4000-8000-000000000040', owner_token: '00000000-0000-4000-8000-000000000041', deterministic_campaign_identity: identity, issue: {} }]));
      }
      if (url.endsWith('/rpc/newsletter_prepare_generation') || url.endsWith('/rpc/newsletter_mark_campaign_attempt')) return new Response('{}');
      if (url === 'https://listmonk.example.com/api/campaigns') return new Response(JSON.stringify({ data: { id: 0 } }));
      if (url.endsWith('/rpc/newsletter_release_campaign_recovery')) { releases += 1; return new Response('{}'); }
      if (url.endsWith('/rpc/newsletter_complete_generation')) { completes += 1; return new Response('{}'); }
      throw new Error(`unexpected malformed-creation fetch ${url}`);
    },
  });
  const response = responseHarness();
  await handler(generationRequest(), response);
  assert.equal(response.statusCode, 502);
  assert.equal(response.body.error, 'listmonk_campaign_response_invalid');
  assert.equal(releases, 1);
  assert.equal(completes, 0);
});

test('recovery requires configured provider, exact identity, and a positive campaign id', async () => {
  const identity = 'longmontai-weekly-2026-08-19-2026-08-25';
  for (const scenario of [
    { env: generationEnv({ LISTMONK_API_TOKEN: undefined }), providerData: null },
    { env: generationEnv(), providerData: { data: { results: [{ id: 0, name: identity, status: 'draft' }] } } },
    { env: generationEnv(), providerData: { data: { results: [{ id: 82, name: `${identity}-other`, status: 'draft' }] } } },
  ]) {
    let releases = 0;
    let completes = 0;
    let recoveryGets = 0;
    const handler = createNewsletterGenerateHandler({
      env: scenario.env,
      now: () => new Date('2026-08-25T12:00:00Z'),
      draftImpl: async () => { throw new Error('recovery must not regenerate'); },
      fetchImpl: async (url) => {
        if (url.endsWith('/rpc/newsletter_claim_generation')) {
          return new Response(JSON.stringify([{ outcome: 'recover_campaign', issue_id: '00000000-0000-4000-8000-000000000050', owner_token: '00000000-0000-4000-8000-000000000051', deterministic_campaign_identity: identity, issue: { subject: 'Stored', html_body: '<p>Stored</p>', text_body: 'Stored' } }]));
        }
        if (url.startsWith('https://listmonk.example.com/api/campaigns?query=')) {
          recoveryGets += 1;
          return new Response(JSON.stringify(scenario.providerData));
        }
        if (url.endsWith('/rpc/newsletter_release_campaign_recovery')) { releases += 1; return new Response('{}'); }
        if (url.endsWith('/rpc/newsletter_complete_generation')) { completes += 1; return new Response('{}'); }
        throw new Error(`unexpected malformed-recovery fetch ${url}`);
      },
    });
    const response = responseHarness();
    await handler(generationRequest(), response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.error, 'newsletter_campaign_recovery_pending');
    assert.equal(releases, 1);
    assert.equal(completes, 0);
    assert.equal(recoveryGets, scenario.providerData ? 1 : 0);
  }
});

test('generation cron authorization remains required before claims or work', async () => {
  let fetches = 0;
  let drafts = 0;
  const handler = createNewsletterGenerateHandler({
    env: generationEnv(),
    fetchImpl: async () => { fetches += 1; return new Response('{}'); },
    draftImpl: async () => { drafts += 1; return generatedDraft(); },
  });
  const response = responseHarness();
  await handler(generationRequest({ authorization: 'Bearer wrong' }), response);
  assert.equal(response.statusCode, 401);
  assert.equal(fetches, 0);
  assert.equal(drafts, 0);
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
  assert.deepEqual(JSON.parse(listmonkCall.options.body), {
    email: 'test@example.com',
    name: '',
    list_uuids: ['22222222-2222-4222-8222-222222222222'],
  });
  const eventBodies = calls
    .filter((call) => call.url.includes('/rest/v1/newsletter_delivery_events'))
    .map((call) => JSON.parse(call.options.body));
  assert.equal(eventBodies.length, 2);
  assert.deepEqual(eventBodies[0].payload, {});
  assert.deepEqual(eventBodies[1].payload, {
    ok: true,
    status: 'submitted',
    skipped: false,
    reason: null,
  });
  assert.doesNotMatch(JSON.stringify(eventBodies.map((event) => event.payload)), /test@example|biweekly|newsletter|203\.0\.113\.10/i);
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
