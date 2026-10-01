import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cached multi-platform OCI index: no mutable tag or runtime pull.
const image = 'public.ecr.aws/supabase/postgres@sha256:21ab971149317ea9cd12a8126fe4ebb34def08c8972956b0958cba0924409dab';

export function localRuntime(platform, home, architecture) {
  assert.ok(platform === 'darwin' || platform === 'linux', 'Fixture supports Darwin and Linux only.');
  assert.ok(architecture === 'arm64' || architecture === 'x64', 'Fixture requires arm64 or x64.');
  assert.ok(typeof home === 'string' && home.startsWith('/') && !/[\0\r\n]/.test(home), 'Expected an absolute local home path.');
  const socket = platform === 'darwin' ? path.posix.join(home, '.docker/run/docker.sock') : '/var/run/docker.sock';
  return { endpoint: `unix://${socket}`, architecture: architecture === 'x64' ? 'amd64' : 'arm64' };
}

export function assertLocalEndpoint(endpoint, platform, home, architecture) {
  assert.equal(endpoint, localRuntime(platform, home, architecture).endpoint);
}

export function assertCachedImage(metadata, architecture) {
  assert.match(metadata.id, /^sha256:[a-f0-9]{64}$/);
  assert.ok(metadata.digests.includes(image), 'Required pinned manifest is not cached.');
  assert.equal(metadata.os, 'linux');
  assert.equal(metadata.architecture, architecture, 'Cached image does not match the local runtime architecture.');
  return metadata.id;
}

const runtime = localRuntime(os.platform(), os.homedir(), os.arch());
const endpoint = runtime.endpoint;
const label = 'com.longmontai.fixture.owner';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const migrations = [
  '20260824085525_newsletter_infrastructure.sql',
  '20260825090000_newsletter_signup_rate_limit.sql',
  '20260825091000_newsletter_generation_idempotency.sql',
];

function command(args, input = '', timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    assertLocalEndpoint(endpoint, os.platform(), os.homedir(), os.arch());
    const env = { ...process.env };
    // Explicit local socket wins; ambient context/TCP/TLS routing is not a fixture input.
    for (const name of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[name];
    const child = spawn('docker', ['--host', endpoint, ...args], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Owned fixture Docker command timed out.')); }, timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdin.on('error', () => {});
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }); });
    child.stdin.end(input);
  });
}

async function checked(args, input) {
  const result = await command(args, input);
  assert.equal(result.code, 0, `Owned fixture command failed: ${result.stderr}`);
  return result.stdout;
}

// Only projected metadata is read: never container environment or full config.
const projection = '{"id":{{json .Id}},"image":{{json .Image}},"name":{{json .Name}},"owner":{{json (index .Config.Labels "com.longmontai.fixture.owner")}},"network":{{json .HostConfig.NetworkMode}},"ports":{{json .HostConfig.PortBindings}},"tmpfs":{{json .HostConfig.Tmpfs}},"mounts":[{{range $i,$m := .Mounts}}{{if $i}},{{end}}{"type":{{json $m.Type}},"destination":{{json $m.Destination}}}{{end}}]}';

export function assertOwnedFixture(metadata, ownership) {
  assert.match(ownership.id, /^[a-f0-9]{64}$/);
  assert.match(ownership.owner, /^lai-newsletter-[a-f0-9-]{36}$/);
  assert.equal(ownership.name, ownership.owner);
  assert.equal(metadata.id, ownership.id);
  assert.equal(metadata.name, `/${ownership.name}`);
  assert.equal(metadata.owner, ownership.owner);
  assert.match(ownership.imageId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(metadata.image, ownership.imageId);
  assert.equal(metadata.network, 'none');
  assert.equal(Object.keys(metadata.ports ?? {}).length, 0);
  assert.deepEqual(metadata.mounts, []);
  assert.deepEqual(metadata.tmpfs, { '/fixture': 'rw,mode=1777' });
}

export function createNewsletterPostgresFixture() {
  const owner = `lai-newsletter-${randomUUID()}`;
  const ownership = { owner, name: owner, id: null, imageId: null };
  const evidencePath = path.join(os.tmpdir(), `${owner}.jsonl`);
  let ready = false;
  let bin;
  async function evidence(event, details = {}) {
    await appendFile(evidencePath, `${JSON.stringify({ at: new Date().toISOString(), event, ...details })}\n`, { mode: 0o600 });
  }
  async function verify() {
    assert.match(ownership.id ?? '', /^[a-f0-9]{64}$/, 'No valid recorded owned container ID.');
    const metadata = JSON.parse(await checked(['inspect', '--format', projection, ownership.id]));
    assertOwnedFixture(metadata, ownership);
    await evidence('ownership_verified', metadata);
  }
  function sqlCommand() {
    return ['exec', '--interactive', ownership.id, `${bin}/psql`, '--no-psqlrc', '--host', '/fixture/socket',
      '--username', 'postgres', '--dbname', 'postgres', '--set', 'ON_ERROR_STOP=1', '--quiet', '--tuples-only', '--no-align'];
  }
  async function stop() {
    ready = false;
    if (!ownership.id) return;
    const recordedId = ownership.id;
    try {
      await verify();
      // Evidence failure deliberately refuses removal; retain/report the recorded ID.
      await evidence('cleanup_authorized', { id: recordedId });
      await checked(['rm', '--force', recordedId]);
      ownership.id = null;
      await evidence('cleanup_completed', { id: recordedId });
    } catch (error) {
      console.error(`Owned fixture cleanup incomplete or unconfirmed: ID=${recordedId}; evidence=${evidencePath}`);
      throw error;
    }
  }
  return {
    evidencePath,
    async start() {
      console.error(`Newsletter isolated Postgres evidence: ${evidencePath}`);
      try {
        const server = await checked(['version', '--format', '{{.Server.Os}}|{{.Server.Arch}}']);
        assert.equal(server, `linux|${runtime.architecture}`, 'Local Docker daemon platform must match the runtime.');
        const cached = JSON.parse(await checked(['image', 'inspect', '--format',
          '{"id":{{json .Id}},"digests":{{json .RepoDigests}},"os":{{json .Os}},"architecture":{{json .Architecture}}}', image]));
        ownership.imageId = assertCachedImage(cached, runtime.architecture);
        await evidence('cached_image_verified', { image, endpoint, ...cached });
        ownership.id = await checked(['run', '--detach', '--pull=never', '--platform', `linux/${runtime.architecture}`, '--network=none', '--restart=no',
          '--name', owner, '--label', `${label}=${owner}`, '--user', 'postgres', '--tmpfs', '/fixture:rw,mode=1777',
          '--entrypoint', '/bin/sh', image, '-ec', 'exec sleep infinity']);
        // Keep the ID in memory and stderr even when evidence storage fails after creation.
        console.error(`Newsletter owned fixture created: ID=${ownership.id}; owner=${owner}`);
        await evidence('created', { ...ownership, image });
        await verify();
        const binaryPaths = (await checked(['exec', ownership.id, '/bin/sh', '-ec',
          'id postgres >/dev/null; for executable in initdb postgres psql pg_isready; do command -v "$executable"; done'])).split('\n');
        assert.equal(binaryPaths.length, 4);
        bin = path.posix.dirname(binaryPaths[0]);
        assert.match(bin, /^\/[a-zA-Z0-9_./-]+$/);
        assert.deepEqual(binaryPaths, ['initdb', 'postgres', 'psql', 'pg_isready'].map((name) => `${bin}/${name}`));
        await checked(['exec', ownership.id, '/bin/sh', '-ec', binaryPaths.map((filename) => `test -x ${filename}`).join('; ')]);
        await evidence('owned_binary_probe_passed', { binaryPaths });
        await checked(['exec', '--detach', ownership.id, '/bin/sh', '-ec',
          `umask 077; mkdir /fixture/data /fixture/socket; ${bin}/initdb -D /fixture/data --username=postgres --auth-local=trust --auth-host=reject >/fixture/init.log 2>&1; exec ${bin}/postgres -D /fixture/data -k /fixture/socket -c listen_addresses= -c max_connections=100 >/fixture/postgres.log 2>&1`]);
        let available = false;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const probe = await command(['exec', ownership.id, `${bin}/pg_isready`, '--host', '/fixture/socket', '--username', 'postgres', '--dbname', 'postgres'], '', 3000);
          if (probe.code === 0) { available = true; break; }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        assert.ok(available, 'New owned Postgres did not become ready within bounded probes.');
        await verify();
        await checked(sqlCommand(), 'create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema extensions; grant usage on schema public, extensions to anon, authenticated, service_role;\n');
        for (const filename of migrations) {
          const bytes = await readFile(path.join(root, 'supabase/migrations', filename));
          await checked(sqlCommand(), bytes);
          await evidence('migration_applied', { filename, sha256: createHash('sha256').update(bytes).digest('hex') });
        }
        const version = await checked(sqlCommand(), 'select version();\n');
        await evidence('ready', { version });
        ready = true;
      } catch (error) {
        let evidenceError;
        try { await evidence('setup_failed', { message: error.message, id: ownership.id }); }
        catch (failure) { evidenceError = failure; }
        try { await stop(); }
        catch (cleanupError) {
          throw new AggregateError([error, ...(evidenceError ? [evidenceError] : []), cleanupError],
            `Owned fixture setup failed; cleanup refused or unconfirmed. Recorded ID=${ownership.id}; evidence=${evidencePath}`);
        }
        if (evidenceError) throw new AggregateError([error, evidenceError], 'Owned fixture setup/evidence failed.');
        throw error;
      }
    },
    async run(sql) {
      assert.ok(ready && ownership.id, 'Owned newsletter fixture is not ready.');
      return command(sqlCommand(), `${sql}\n`);
    },
    stop,
  };
}

function selfTest() {
  const owner = 'lai-newsletter-00000000-0000-4000-8000-000000000000';
  assert.deepEqual(localRuntime('darwin', '/Users/developer', 'arm64'), { endpoint: 'unix:///Users/developer/.docker/run/docker.sock', architecture: 'arm64' });
  assert.deepEqual(localRuntime('linux', '/home/developer', 'x64'), { endpoint: 'unix:///var/run/docker.sock', architecture: 'amd64' });
  assert.throws(() => localRuntime('win32', '/home/developer', 'x64'));
  assert.throws(() => localRuntime('linux', '/home/developer', 'ia32'));
  assert.throws(() => localRuntime('darwin', 'tcp://remote:2375', 'arm64'));
  assert.throws(() => localRuntime('darwin', '/Users/bad\npath', 'arm64'));
  for (const wrong of ['tcp://remote:2375', 'ssh://remote', 'unix:///tmp/other.sock']) {
    assert.throws(() => assertLocalEndpoint(wrong, 'linux', '/home/developer', 'x64'));
  }
  const cached = { id: `sha256:${'b'.repeat(64)}`, digests: [image], os: 'linux', architecture: 'amd64' };
  assert.equal(assertCachedImage(cached, 'amd64'), cached.id);
  const armCached = { ...cached, id: `sha256:${'c'.repeat(64)}`, architecture: 'arm64' };
  assert.equal(assertCachedImage(armCached, 'arm64'), armCached.id);
  assert.throws(() => assertCachedImage(null, 'amd64'));
  assert.throws(() => assertLocalEndpoint('unix:///run/user/1000/docker.sock', 'linux', '/home/developer', 'x64'));
  for (const wrong of [{ digests: [] }, { digests: ['public.ecr.aws/supabase/postgres:17.6.1.106'] },
    { id: 'mutable-tag' }, { os: 'windows' }, { architecture: 'arm64' }]) {
    assert.throws(() => assertCachedImage({ ...cached, ...wrong }, 'amd64'));
  }
  const ownership = { owner, name: owner, id: 'a'.repeat(64), imageId: cached.id };
  const valid = { id: ownership.id, name: `/${owner}`, owner, image: cached.id, network: 'none', ports: {}, tmpfs: { '/fixture': 'rw,mode=1777' }, mounts: [] };
  assertOwnedFixture(valid, ownership);
  const refused = [
    { owner: 'another-owner' }, { id: 'b'.repeat(64) }, { name: '/supabase_db_LongmontAI' },
    { image: 'another-image' }, { network: 'bridge' }, { ports: { '5432/tcp': [] } },
    { mounts: [{ type: 'volume', destination: '/fixture' }] },
    { mounts: [...valid.mounts, { type: 'bind', destination: '/project' }] },
    { tmpfs: {} }, { tmpfs: { '/fixture': 'rw,mode=1777', '/other': 'rw' } },
  ];
  for (const mismatch of refused) assert.throws(() => assertOwnedFixture({ ...valid, ...mismatch }, ownership));
  console.log('Fixture guards passed: Darwin/Linux endpoints and architecture, cached manifest and recorded image ID, 10 ownership refusals; no Docker commands or SQL executed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--self-test', 'Only the non-mutating --self-test CLI is supported.');
  selfTest();
}
