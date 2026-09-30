import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, writeFileSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { appJWT, report, REQUIRED_GATES, CHECK_NAME, readPrivateFile, githubClient,
  localAdapters } from '../report-local-required-gate.mjs';

const sha = 'a'.repeat(40);
const now = 1_800_000_000_000;
const metadata = { app_id: 42, installation_id: 43, slug: 'local-gate' };
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const permissions = { checks: 'write', contents: 'read', metadata: 'read' };
const evidence = () => ({ schema: 'local-required-gate/v1', sha, status: 'pass', remoteReported: false,
  gates: REQUIRED_GATES.map(name => ({ name, status: 'pass' })) });
function fixture(override = {}) {
  const calls = [];
  let snapshots = 0;
  let gates = 0;
  const options = {
    sha, env: {}, now: () => now, credentials: () => ({ metadata, pem }),
    snapshot: actual => { assert.equal(actual, sha); snapshots++; },
    gate: actual => { assert.equal(actual, sha); gates++; return { status: 0, stdout: JSON.stringify(evidence()) }; },
    api: async (method, path, auth, body) => {
      calls.push({ method, path, body }); // Never retain authorization material in test diagnostics.
      assert.equal(typeof auth, 'string');
      let value;
      if (path === '/app/installations/43') value = { id: 43, app_id: 42, app_slug: 'local-gate',
        account: { login: 'morahan' }, repository_selection: 'selected', suspended_at: null, permissions };
      else if (path.endsWith('/access_tokens')) value = { token: 'mock-installation-token',
        expires_at: new Date(now + 3600_000).toISOString(), repository_selection: 'selected', permissions };
      else if (path.startsWith('/installation/repositories')) value = { total_count: 1,
        repositories: [{ id: 44, full_name: 'morahan/LongmontAI', name: 'LongmontAI', owner: { login: 'morahan' } }] };
      else if (path.includes('/check-runs?')) value = { total_count: 0, check_runs: [] };
      else value = { id: 45, name: CHECK_NAME, head_sha: sha, app: { id: 42, slug: 'local-gate' },
        status: body.status, conclusion: body.conclusion ?? null };
      return override.response ? override.response(value, { method, path, body }) : value;
    },
    ...override.options,
  };
  return { options, calls, counts: () => ({ snapshots, gates }) };
}
const conclusions = calls => calls.filter(call => call.method === 'PATCH').map(call => call.body.conclusion);

test('JWT is RSA signed with short-lived exact claims', () => {
  const jwt = appJWT(metadata, pem, now);
  const [header, payload, signature] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url')), { iat: now / 1000 - 60,
    exp: now / 1000 + 300, iss: '42' });
  assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey,
    Buffer.from(signature, 'base64url')), true);
});

test('success is app-authored, exact SHA, ordered, and scope is rechecked', async () => {
  const f = fixture();
  assert.deepEqual(await report(f.options), { status: 'pass', remoteReported: true });
  assert.deepEqual(conclusions(f.calls), ['success']);
  const creation = f.calls.find(call => call.path.endsWith('/check-runs'));
  assert.deepEqual(creation.body, { name: CHECK_NAME, head_sha: sha, status: 'in_progress' });
  assert.equal(f.calls.filter(call => call.path === '/app/installations/43').length, 2);
  assert.deepEqual(f.counts(), { snapshots: 4, gates: 1 });
});

test('verification-only issues token but never posts checks or runs gates', async () => {
  const f = fixture({ options: { verifyOnly: true } });
  assert.deepEqual(await report(f.options), { status: 'scope-verified', remoteReported: false });
  assert.equal(f.calls.some(call => call.path.includes('/check-runs')), false);
  assert.equal(f.counts().gates, 0);
  // A narrowed request could conceal excess installation scope.
  assert.deepEqual(f.calls.find(call => call.path.endsWith('/access_tokens')).body, {});
  assert.equal(f.calls.at(-1).path, '/installation/repositories?per_page=100');
});

for (const endpoint of ['/app/installations/43', '/app/installations/43/access_tokens']) {
  const invalidPermissions = [
    ['null', null], ['array', []], ['empty', {}],
    ...Object.keys(permissions).flatMap(key => [
      [`missing ${key}`, Object.fromEntries(Object.entries(permissions).filter(([name]) => name !== key))],
      [`wrong ${key} level`, { ...permissions, [key]: permissions[key] === 'read' ? 'write' : 'read' }],
    ]),
    ...['issues', 'actions', 'administration', 'unknown'].map(key =>
      [`additional ${key}`, { ...permissions, [key]: 'read' }]),
  ];
  for (const [name, invalid] of invalidPermissions) {
    test(`${endpoint} refuses permissions: ${name}`, async () => {
      const f = fixture({ options: { verifyOnly: true }, response: (value, call) =>
        call.path === endpoint ? { ...value, permissions: invalid } : value });
      assert.deepEqual(await report(f.options), { status: 'fail', remoteReported: false });
      assert.equal(f.calls.at(-1).path, endpoint);
      assert.equal(f.counts().gates, 0);
    });
  }
  test(`${endpoint} permission broadening during gate prevents success`, async () => {
    let responses = 0;
    const f = fixture({ response: (value, call) => call.path === endpoint && ++responses === 2
      ? { ...value, permissions: { ...permissions, issues: 'read' } } : value });
    assert.deepEqual(await report(f.options), { status: 'fail', remoteReported: true });
    assert.deepEqual(conclusions(f.calls), ['failure']);
  });
}

for (const [name, mutation] of [
  ['all repositories', value => { value.repository_selection = 'all'; }],
  ['wrong app', value => { value.app_id = 99; }],
  ['wrong owner', value => { value.account.login = 'other'; }],
  ['extra permission', value => { value.permissions = { ...permissions, issues: 'read' }; }],
  ['suspended', value => { value.suspended_at = '2026-01-01'; }],
]) test(`refuses installation ${name}`, async () => {
  const f = fixture({ response: (value, call) => {
    if (call.path === '/app/installations/43') mutation(value);
    return value;
  } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.equal(f.calls.length, 1);
});

for (const [name, mutate] of [
  ['extra repository', v => { v.total_count = 2; }],
  ['wrong repository', v => { v.repositories[0].full_name = 'morahan/other'; }],
  ['missing repositories', v => { delete v.repositories; }],
]) test(`refuses scope ${name}`, async () => {
  const f = fixture({ response: (value, call) => {
    if (call.path.startsWith('/installation/repositories')) mutate(value);
    return value;
  } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.equal(f.calls.some(call => call.path.includes('/check-runs')), false);
});

test('refuses foreign same-name success including older paginated checks', async () => {
  const f = fixture({ response: (value, call) => {
    if (call.path.includes('/check-runs?')) return { total_count: 101,
      check_runs: call.path.endsWith('page=1') ? Array.from({ length: 100 }, (_, index) => ({ id: index + 1,
        name: 'Other', head_sha: sha, app: { id: 99 }, status: 'completed', conclusion: 'success' }))
        : [{ id: 102, name: CHECK_NAME, head_sha: sha, app: { id: 99 }, status: 'completed', conclusion: 'success' }] };
    return value;
  } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.equal(f.calls.some(call => call.method === 'POST' && call.path.endsWith('/check-runs')), false);
});

for (const [name, mutate] of [
  ['wrong SHA', v => { v.sha = 'b'.repeat(40); }],
  ['false status', v => { v.status = 'fail'; }],
  ['remote evidence', v => { v.remoteReported = true; }],
  ['missing gate', v => { v.gates.pop(); }],
  ['duplicate gate', v => { v.gates[1] = v.gates[0]; }],
  ['failed gate', v => { v.gates[0].status = 'fail'; }],
  ['extra property', v => { v.extra = 'secret-marker'; }],
]) test(`false evidence: ${name} posts only failure`, async () => {
  const value = evidence(); mutate(value);
  const f = fixture({ options: { gate: () => ({ status: 0, stdout: JSON.stringify(value) }) } });
  assert.deepEqual(await report(f.options), { status: 'fail', remoteReported: true });
  assert.deepEqual(conclusions(f.calls), ['failure']);
  assert.equal(JSON.stringify(f.calls).includes('secret-marker'), false);
});

for (const gateResult of [{ status: 1, stdout: JSON.stringify(evidence()) },
  { status: 0, signal: 'SIGTERM', stdout: JSON.stringify(evidence()) },
  { status: 0, stdout: 'secret-marker' }]) test('exit failure/timeout/malformed evidence cannot pass', async () => {
  const f = fixture({ options: { gate: () => gateResult } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.deepEqual(conclusions(f.calls), ['failure']);
});

for (const env of [{ SECURITY_COMMIT_SKIP: '0' }, { NODE_OPTIONS: '--require=evil' },
  { GIT_CONFIG_COUNT: '1' }, { SOME_BYPASS: '1' }, { BASH_ENV: '/tmp/evil' },
  { NODE_TLS_REJECT_UNAUTHORIZED: '0' }, { SSL_CERT_FILE: '/tmp/evil' }]) {
  test('inherited bypass/configuration rejected before credential access', async () => {
    const f = fixture({ options: { env, credentials: () => assert.fail('must not load') } });
    assert.equal((await report(f.options)).status, 'fail');
    assert.equal(f.calls.length, 0);
  });
}

test('bad SHA and dirty/detached/wrong snapshot fail before authentication', async () => {
  for (const options of [{ sha: 'HEAD' }, { sha: 'a'.repeat(64) },
    { snapshot: () => { throw new Error('secret-marker'); } }]) {
    const f = fixture({ options });
    assert.deepEqual(await report(f.options), { status: 'fail', remoteReported: false });
    assert.equal(f.calls.length, 0);
  }
});

test('changed final snapshot reports failure', async () => {
  let count = 0;
  const f = fixture({ options: { snapshot: () => { if (++count === 3) throw Error('changed'); } } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.deepEqual(conclusions(f.calls), ['failure']);
});

test('API failure at every stage is sanitized, never returns pass', async () => {
  for (let failAt = 1; failAt <= 9; failAt++) {
    let count = 0;
    const f = fixture({ response: value => { if (++count === failAt) throw Error('secret-marker'); return value; } });
    const result = await report(f.options);
    assert.equal(result.status, 'fail');
    assert.equal(JSON.stringify({ result, calls: f.calls }).includes('secret-marker'), false);
  }
});

test('malformed creation cannot trigger update of arbitrary check', async () => {
  const f = fixture({ response: (value, call) => call.path.endsWith('/check-runs')
    ? { ...value, app: { id: 999 }, head_sha: 'b'.repeat(40) } : value });
  assert.equal((await report(f.options)).status, 'fail');
  assert.deepEqual(conclusions(f.calls), []);
});

test('malformed metadata and key are refused before any API call', async () => {
  for (const loaded of [{ metadata: { ...metadata, app_id: '42' }, pem },
    { metadata: { ...metadata, installation_id: 0 }, pem },
    { metadata: { ...metadata, extra: true }, pem }, { metadata, pem: 'mock-invalid-key' }]) {
    const f = fixture({ options: { credentials: () => loaded } });
    assert.deepEqual(await report(f.options), { status: 'fail', remoteReported: false });
    assert.equal(f.calls.length, 0);
  }
});

for (const [name, change] of [
  ['expired', v => { v.expires_at = new Date(now - 1).toISOString(); }],
  ['long lived', v => { v.expires_at = new Date(now + 7200_000).toISOString(); }],
  ['missing token', v => { delete v.token; }],
  ['token whitespace', v => { v.token = 'mock bad'; }],
  ['excess permission', v => { v.permissions = { ...permissions, contents: 'write' }; }],
  ['all repositories', v => { v.repository_selection = 'all'; }],
]) test(`token response rejects ${name}`, async () => {
  const f = fixture({ response: (value, call) => {
    if (call.path.endsWith('/access_tokens')) change(value);
    return value;
  } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.equal(f.calls.length, 2);
});

test('wrong check SHA and malformed check inventory fail before posting', async () => {
  for (const response of [
    (v, c) => c.path.includes('/check-runs?') ? { total_count: 1, check_runs: [{ id: 7,
      name: CHECK_NAME, head_sha: 'b'.repeat(40), app: { id: 42, slug: 'local-gate' },
      status: 'completed', conclusion: 'success' }] } : v,
    (v, c) => c.path.includes('/check-runs?') ? { total_count: 1, check_runs: [] } : v,
    (v, c) => c.path.includes('/check-runs?') ? { total_count: 0 } : v,
    (v, c) => c.path.includes('/check-runs?') ? null : v,
  ]) {
    const f = fixture({ response });
    assert.equal((await report(f.options)).status, 'fail');
    assert.equal(f.calls.some(call => call.method === 'POST' && call.path.endsWith('/check-runs')), false);
  }
});

test('scope broadening during gate prevents success', async () => {
  let inventories = 0;
  const f = fixture({ response: (value, call) => {
    if (call.path.startsWith('/installation/repositories') && ++inventories === 2) value.total_count = 2;
    return value;
  } });
  assert.equal((await report(f.options)).status, 'fail');
  assert.deepEqual(conclusions(f.calls), ['failure']);
});

test('malformed completion triggers failure and unavailable failure update stays unreported', async () => {
  const f = fixture({ response: (value, call) => call.body?.conclusion === 'success'
    ? { ...value, head_sha: 'b'.repeat(40) } : value });
  assert.deepEqual(await report(f.options), { status: 'fail', remoteReported: true });
  assert.deepEqual(conclusions(f.calls), ['success', 'failure']);
  const blocked = fixture({ options: { gate: () => ({ status: 1 }) }, response: (value, call) => {
    if (call.method === 'PATCH') throw Error('secret-marker');
    return value;
  } });
  assert.deepEqual(await report(blocked.options), { status: 'fail', remoteReported: false });
});

test('CLI invalid input emits only fixed JSON with empty stderr, without authenticating', () => {
  const result = spawnSync(process.execPath, ['scripts/report-local-required-gate.mjs', '--sha', 'secret-marker'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '{"status":"fail","remoteReported":false}\n');
});

test('HTTP rejects errors, redirects, malformed and oversized responses', async () => {
  for (const response of [new Response('secret-marker', { status: 403 }),
    new Response('secret-marker', { status: 302 }), new Response('secret-marker', { status: 200 }),
    new Response('x'.repeat(1024 * 1024 + 1), { status: 200 })]) {
    const api = githubClient(async (_url, options) => { assert.equal(options.redirect, 'error'); return response; });
    await assert.rejects(api('GET', '/app', 'mock-token'));
  }
});

test('private file reader enforces regular owned 0600 non-linked files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'reporter-files-'));
  try {
    const path = join(dir, 'private');
    writeFileSync(path, 'mock-only', { mode: 0o600 });
    assert.equal(readPrivateFile(path).toString(), 'mock-only');
    assert.throws(() => readPrivateFile(path, process.getuid() + 1));
    chmodSync(path, 0o644);
    assert.throws(() => readPrivateFile(path));
    chmodSync(path, 0o600);
    symlinkSync(path, join(dir, 'link'));
    assert.throws(() => readPrivateFile(join(dir, 'link')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('real Git adapter rejects dirty, wrong SHA, wrong remote and detached snapshots', () => {
  const dir = mkdtempSync(join(tmpdir(), 'reporter-git-'));
  const git = args => {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    assert.equal(r.status, 0); return r.stdout.trim();
  };
  try {
    git(['init', '-b', 'test']);
    // Identity is invocation-local, never changes Git configuration or real hooks.
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-m', 'test']);
    git(['remote', 'add', 'origin', 'https://github.com/morahan/LongmontAI.git']);
    const actual = git(['rev-parse', 'HEAD']);
    const { snapshot } = localAdapters({ PATH: process.env.PATH, HOME: dir }, dir);
    snapshot(actual);
    assert.throws(() => snapshot(sha));
    writeFileSync(join(dir, 'dirty'), 'test');
    assert.throws(() => snapshot(actual));
    rmSync(join(dir, 'dirty'));
    git(['checkout', '--detach']);
    assert.throws(() => snapshot(actual));
    git(['checkout', 'test']);
    git(['remote', 'set-url', 'origin', 'https://github.com/other/repo.git']);
    assert.throws(() => snapshot(actual));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
