import { constants, openSync, fstatSync, readFileSync, closeSync, lstatSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPrivateKey, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const CHECK_NAME = 'LongmontAI Local Required Gate';
export const REQUIRED_GATES = Object.freeze(['arguments', 'exact-clean-attached-tree', 'required-tools',
  'immutable-snapshot', 'repository-security-review', 'actions-security', 'linux-node22', 'linux-node24',
  'codeql-security-extended', 'final-exact-clean-attached-tree']);
const REPO = 'morahan/LongmontAI';
const API = 'https://api.github.com';
const failure = () => { throw new Error('Local required gate reporter refused operation'); };
const id = value => Number.isSafeInteger(value) && value > 0;
const shaPattern = /^[a-f0-9]{40}$/;
const permissionsOK = permissions => permissions && typeof permissions === 'object'
  && !Array.isArray(permissions) && permissions.checks === 'write'
  && permissions.contents === 'read' && permissions.metadata === 'read'
  && Object.keys(permissions).sort().join(',') === 'checks,contents,metadata';

export function rejectBypass(env) {
  // Reject presence, even a false-looking value. Child processes receive an allowlist separately.
  for (const key of Object.keys(env)) {
    if (/^(?:SECURITY_|GIT_|GH_|GITHUB_|NODE_|SSL_CERT_|OPENSSL_|LD_|DYLD_|BASH_ENV$|ENV$|HUSKY$)/.test(key)
      || /(?:BYPASS|BREAK_GLASS|SKIP)/i.test(key)) failure();
  }
}

export function readPrivateFile(path, uid = process.getuid()) {
  const before = lstatSync(path);
  if (!before.isFile() || before.uid !== uid || (before.mode & 0o7777) !== 0o600 || before.nlink !== 1) failure();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const after = fstatSync(fd);
    if (!after.isFile() || after.uid !== uid || (after.mode & 0o7777) !== 0o600
      || after.nlink !== 1 || after.ino !== before.ino || after.dev !== before.dev || after.size > 64 * 1024) failure();
    return readFileSync(fd);
  } finally { closeSync(fd); }
}

export function validateMetadata(metadata) {
  if (!metadata || Object.keys(metadata).sort().join(',') !== 'app_id,installation_id,slug'
    || !id(metadata.app_id) || !id(metadata.installation_id)
    || typeof metadata.slug !== 'string' || !/^[a-z0-9-]+$/.test(metadata.slug)) failure();
  return metadata;
}

export function appJWT(metadata, pem, now = Date.now()) {
  validateMetadata(metadata);
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) failure();
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const seconds = Math.floor(now / 1000);
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: seconds - 60, exp: seconds + 300, iss: String(metadata.app_id) })}`;
  return `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url')}`;
}

export function validEvidence(text, sha) {
  const evidence = JSON.parse(text);
  if (!evidence || Object.keys(evidence).sort().join(',') !== 'gates,remoteReported,schema,sha,status'
    || evidence.schema !== 'local-required-gate/v1' || evidence.sha !== sha || evidence.status !== 'pass'
    || evidence.remoteReported !== false || !Array.isArray(evidence.gates)
    || evidence.gates.length !== REQUIRED_GATES.length) failure();
  evidence.gates.forEach((gate, index) => {
    if (!gate || Object.keys(gate).sort().join(',') !== 'name,status'
      || gate.name !== REQUIRED_GATES[index] || gate.status !== 'pass') failure();
  });
}

// Responses, credentials and exception details never cross the public result boundary.
export function githubClient(fetchImpl = globalThis.fetch) {
  return async (method, path, auth, body) => {
    const response = await fetchImpl(`${API}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${auth}`,
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status !== (method === 'POST' ? 201 : 200)) failure();
    // Bound response size without printing or persisting it.
    const reader = response.body.getReader();
    let size = 0;
    const chunks = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1024 * 1024) failure();
        chunks.push(Buffer.from(value));
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } finally { await reader.cancel(); }
  };
}

async function scope(api, metadata, jwt, now) {
  const installation = await api('GET', `/app/installations/${metadata.installation_id}`, jwt);
  if (installation.id !== metadata.installation_id || installation.app_id !== metadata.app_id
    || installation.app_slug !== metadata.slug || installation.account?.login !== 'morahan'
    || installation.repository_selection !== 'selected' || installation.suspended_at !== null
    || !permissionsOK(installation.permissions)) failure();
  // Deliberately request the installation's full scope, not a narrowed token that could hide excess access.
  const token = await api('POST', `/app/installations/${metadata.installation_id}/access_tokens`, jwt, {});
  const expiration = Date.parse(token.expires_at);
  if (typeof token.token !== 'string' || !token.token || /\s/.test(token.token)
    || !Number.isFinite(expiration) || expiration <= now() || expiration > now() + 65 * 60_000
    || token.repository_selection !== 'selected' || !permissionsOK(token.permissions)) failure();
  const repos = await api('GET', '/installation/repositories?per_page=100', token.token);
  if (repos.total_count !== 1 || !Array.isArray(repos.repositories) || repos.repositories.length !== 1) failure();
  const repo = repos.repositories[0];
  if (!id(repo.id) || repo.full_name !== REPO || repo.name !== 'LongmontAI' || repo.owner?.login !== 'morahan') failure();
  return token.token;
}

function checkResponse(check, metadata, sha, status, conclusion, checkId) {
  if (!check || !id(check.id) || (checkId !== undefined && check.id !== checkId)
    || check.name !== CHECK_NAME || check.head_sha !== sha || check.app?.id !== metadata.app_id
    || check.app?.slug !== metadata.slug || check.status !== status || check.conclusion !== conclusion) failure();
}

export async function report({ sha, verifyOnly = false, env = process.env, credentials, snapshot,
  gate, api = githubClient(), now = Date.now }) {
  let checkId;
  let token;
  let metadata;
  try {
    rejectBypass(env);
    if (!shaPattern.test(sha ?? '')) failure();
    snapshot(sha);
    const loaded = credentials();
    metadata = validateMetadata(loaded.metadata);
    token = await scope(api, metadata, appJWT(metadata, loaded.pem, now()), now);
    if (verifyOnly) {
      snapshot(sha);
      return { status: 'scope-verified', remoteReported: false };
    }
    // Resolve the commit through Checks endpoints; Contents read remains part of the exact App scope.
    // Paginate all checks (including superseded runs) to detect foreign successes.
    let seen = 0;
    let total;
    const checkIds = new Set();
    for (let page = 1; page <= 100; page++) {
      const checks = await api('GET', `/repos/${REPO}/commits/${sha}/check-runs?filter=all&per_page=100&page=${page}`, token);
      if (!Number.isSafeInteger(checks.total_count) || checks.total_count < 0
        || !Array.isArray(checks.check_runs) || checks.check_runs.length > 100
        || (total !== undefined && total !== checks.total_count)) failure();
      total = checks.total_count;
      for (const check of checks.check_runs) {
        if (!check || !id(check.id) || typeof check.name !== 'string' || check.head_sha !== sha
          || !id(check.app?.id) || !['queued', 'in_progress', 'completed', 'waiting', 'requested', 'pending'].includes(check.status)
          || (check.status === 'completed'
            ? !['success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out', 'action_required', 'stale', 'startup_failure'].includes(check.conclusion)
            : check.conclusion !== null) || checkIds.has(check.id)) failure();
        checkIds.add(check.id);
        if (check.name === CHECK_NAME && check.conclusion === 'success'
          && (check.app.id !== metadata.app_id || check.app.slug !== metadata.slug)) failure();
      }
      seen += checks.check_runs.length;
      if (seen === total) break;
      if (seen > total || checks.check_runs.length !== 100 || page === 100) failure();
    }
    snapshot(sha);
    const created = await api('POST', `/repos/${REPO}/check-runs`, token,
      { name: CHECK_NAME, head_sha: sha, status: 'in_progress' });
    // Retain only a positively identified check ID, never update an unverified response target.
    if (id(created?.id) && created.name === CHECK_NAME && created.head_sha === sha
      && created.app?.id === metadata.app_id && created.app?.slug === metadata.slug) checkId = created.id;
    checkResponse(created, metadata, sha, 'in_progress', null);
    const result = gate(sha);
    if (result.error || result.signal || result.status !== 0) failure();
    validEvidence(result.stdout, sha);
    snapshot(sha);
    // Detect scope changes during the potentially long gate before success.
    token = await scope(api, metadata, appJWT(metadata, loaded.pem, now()), now);
    snapshot(sha);
    const completed = await api('PATCH', `/repos/${REPO}/check-runs/${checkId}`, token,
      { status: 'completed', conclusion: 'success', output: { title: CHECK_NAME,
        summary: 'All required local gates passed for the exact commit.' } });
    checkResponse(completed, metadata, sha, 'completed', 'success', checkId);
    return { status: 'pass', remoteReported: true };
  } catch {
    if (checkId !== undefined && token) {
      try {
        const failed = await api('PATCH', `/repos/${REPO}/check-runs/${checkId}`, token,
          { status: 'completed', conclusion: 'failure', output: { title: CHECK_NAME,
            summary: 'Local required gate failed or could not be verified.' } });
        checkResponse(failed, metadata, sha, 'completed', 'failure', checkId);
        return { status: 'fail', remoteReported: true };
      } catch { /* Never relay transport errors, API bodies or child output. */ }
    }
    return { status: 'fail', remoteReported: false };
  }
}

export function localAdapters(env = process.env, cwd = process.cwd()) {
  const childEnv = { PATH: env.PATH, HOME: env.HOME, LANG: 'C.UTF-8', CI: 'true' };
  const git = args => {
    const result = spawnSync('git', args, { cwd, env: childEnv, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000, maxBuffer: 1024 * 1024 });
    if (result.error || result.signal || result.status !== 0) failure();
    return result.stdout.trim();
  };
  return {
    credentials: () => {
      const directory = join(homedir(), '.config/longmontai-gate');
      return { metadata: JSON.parse(readPrivateFile(join(directory, 'metadata.json'))),
        pem: readPrivateFile(join(directory, 'reporter.pem')) };
    },
    snapshot: sha => {
      if (git(['rev-parse', '--verify', 'HEAD^{commit}']) !== sha
        || !git(['symbolic-ref', '-q', 'HEAD'])
        || git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none'])
        || git(['ls-files', '--stage']).split('\n').some(line => line.startsWith('160000 '))
        || !['git@github.com:morahan/LongmontAI.git', 'https://github.com/morahan/LongmontAI.git']
          .includes(git(['remote', 'get-url', 'origin']))) failure();
      if (realpathSync(git(['rev-parse', '--show-toplevel'])) !== realpathSync(cwd)) failure();
    },
    gate: sha => spawnSync('bash', ['scripts/local-required-gate.sh', '--sha', sha], {
      cwd, env: childEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4 * 60 * 60_000, maxBuffer: 64 * 1024,
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let result = { status: 'fail', remoteReported: false };
  try {
    const args = process.argv.slice(2);
    const verifyOnly = args[0] === '--verify-installation';
    if (verifyOnly) args.shift();
    if (args.length !== 2 || args[0] !== '--sha') failure();
    result = await report({ sha: args[1], verifyOnly, ...localAdapters() });
  } catch { /* Fixed output only, including argument and credential failures. */ }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === 'fail' ? 1 : 0;
}
