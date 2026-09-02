import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createNewsletterGenerateHandler } from '../../scripts/lib/newsletter/generate-handler.mjs';
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
  assert.equal(timedOut.statusCode, 500);
  const recovered = responseHarness();
  await handler(generationRequest(), recovered);
  assert.equal(recovered.statusCode, 200);
  assert.equal(recovered.body.campaign.recovered, true);
  assert.equal(campaignPosts, 1);
  assert.equal(recoveryGets, 1);
  assert.equal(draftCalls, 1);
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
          return new Response(JSON.stringify({ id: 'completed-issue' }));
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
