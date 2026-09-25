import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, openSync, closeSync, readFileSync, readdirSync, lstatSync,
  chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

function materializeTree(sha, destination) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha)
    || !lstatSync(destination).isDirectory() || readdirSync(destination).length) throw new Error('snapshot input');
  const git = (args, options = {}) => {
    const result = spawnSync('git', args, { env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' },
      stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 128 * 1024 * 1024, ...options });
    if (result.error || result.signal || result.status !== 0) throw new Error('Git object');
    return result.stdout;
  };
  const entries = git(['ls-tree', '-rz', '--full-tree', sha]);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const seen = new Set();
  let offset = 0;
  while (offset < entries.length) {
    const end = entries.indexOf(0, offset);
    if (end < 0) throw new Error('tree entry');
    const entry = entries.subarray(offset, end);
    offset = end + 1;
    const tab = entry.indexOf(9);
    if (tab < 0) throw new Error('tree entry');
    const header = entry.subarray(0, tab).toString('ascii');
    const match = /^(100644|100755) blob ([a-f0-9]{40}|[a-f0-9]{64})$/.exec(header);
    if (!match) throw new Error('unsupported tree entry');
    const path = decoder.decode(entry.subarray(tab + 1));
    const parts = path.split('/');
    if (!path || parts.some(part => !part || part === '.' || part === '..' || part === '.git')
      || seen.has(path)) throw new Error('unsafe tree path');
    seen.add(path);
    const target = join(destination, ...parts);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    const file = openSync(target, 'wx', 0o600);
    try { git(['cat-file', 'blob', match[2]], { stdio: ['ignore', file, 'ignore'] }); }
    finally { closeSync(file); }
    chmodSync(target, match[1] === '100755' ? 0o755 : 0o644);
  }
}

if (process.argv[2] === '--materialize') {
  try {
    if (process.argv.length !== 5) throw new Error('arguments');
    materializeTree(process.argv[3], process.argv[4]);
  } catch {
    process.exitCode = 1;
  }
} else {

// Only fixed labels and validated object IDs enter evidence. Child output is never evidence.
const evidence = { schema: 'local-required-gate/v1', sha: null, status: 'fail', gates: [], remoteReported: false };
const env = { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true', LANG: 'C.UTF-8',
  SECURITY_COMMIT_AUTO_FIX: '0', SECURITY_COMMIT_AGENT_REVIEW: '0', SECURITY_COMMIT_SKIP: '0' };
let root;
let scratch;
let container;
let active = 'arguments';
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env, timeout: 30 * 60 * 1000,
    stdio: 'ignore', ...options });
  if (result.error || result.signal || result.status !== 0) throw new Error('gate failed');
  return result.stdout;
}
function text(command, args) {
  return run(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 }).trim();
}
function gate(name, fn) {
  active = name;
  fn();
  evidence.gates.push({ name, status: 'pass' });
}
function verifyTree() {
  if (text('git', ['rev-parse', '--verify', 'HEAD^{commit}']) !== evidence.sha) throw new Error('SHA');
  run('git', ['symbolic-ref', '-q', 'HEAD']);
  if (text('git', ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none'])) throw new Error('dirty');
  // Archives do not include submodule contents: reject rather than silently omit them.
  if (text('git', ['ls-files', '--stage']).split('\n').some(line => line.startsWith('160000 '))) throw new Error('submodule');
}
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--sha' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(args[1])) throw new Error('arguments');
  evidence.sha = args[1];
  evidence.gates.push({ name: 'arguments', status: 'pass' });
  gate('exact-clean-attached-tree', () => {
    root = text('git', ['rev-parse', '--show-toplevel']);
    verifyTree();
  });
  gate('required-tools', () => {
    for (const [tool, args] of [
      ['docker', ['version']], ['codeql', ['version', '--format=json']],
      ['gitleaks', ['version']], ['osv-scanner', ['--version']], ['rg', ['--version']],
      ['zizmor', ['--version']], ['tar', ['--version']],
    ]) run(tool, args, { timeout: 60_000 });
  });
  scratch = mkdtempSync(join(tmpdir(), 'local-required-gate-'));
  env.TMPDIR = scratch;
  const source = join(scratch, 'source');
  const archive = join(scratch, 'source.tar');
  mkdirSync(source, { mode: 0o700 });
  gate('immutable-snapshot', () => {
    run(process.execPath, [join(root, 'scripts/lib/local-required-gate/run.mjs'), '--materialize', evidence.sha, source]);
    run('tar', ['-cf', archive, '-C', source, '.']);
  });
  gate('repository-security-review', () => {
    // Existing all-mode semantics: exact HEAD gitleaks + offline OSV + policy contracts.
    // No inherited bypass, agent, remediation or evidence-path environment variables.
    env.SECURITY_REVIEW_EVIDENCE_DIR = join(scratch, 'security-evidence');
    run('bash', [join(source, 'scripts/security-commit-review.sh'), 'all']);
    verifyTree();
  });
  gate('actions-security', () => run('zizmor', ['--offline', '--persona', 'pedantic',
    '--min-severity', 'medium', '--min-confidence', 'medium', '.github/workflows'], { cwd: source }));
  for (const image of ['node:22.20.0-bookworm', 'node:24-bookworm']) {
    gate(image.startsWith('node:22') ? 'linux-node22' : 'linux-node24', () => {
      container = `local-required-gate-${randomUUID()}`;
      const input = openSync(archive, 'r');
      try {
        run('docker', ['run', '--rm', '--pull=always', '--platform=linux/amd64', '--name', container,
          '--cap-drop=ALL', '--security-opt=no-new-privileges', '-i', image, 'bash', '-eu', '-o', 'pipefail', '-c',
          'mkdir /work; cd /work; tar -xf -; bash scripts/lib/local-required-gate/container.sh'],
        { stdio: [input, 'ignore', 'ignore'] });
      } finally {
        closeSync(input);
        // Also remove a container left behind by a failed/timed-out Docker client.
        spawnSync('docker', ['rm', '-f', container], { env, stdio: 'ignore', timeout: 60_000 });
        container = undefined;
      }
    });
  }
  gate('codeql-security-extended', () => {
    const database = join(scratch, 'codeql-db');
    const sarif = join(scratch, 'codeql.sarif');
    run('codeql', ['database', 'create', database, '--language=javascript-typescript',
      `--source-root=${source}`, '--build-mode=none'], { cwd: source });
    run('codeql', ['database', 'analyze', database,
      'javascript-security-extended.qls', '--format=sarif-latest', `--output=${sarif}`], { cwd: source });
    // CodeQL may exit zero when it finds vulnerabilities; inspect the report, fail closed.
    const report = JSON.parse(readFileSync(sarif, 'utf8'));
    if (report.version !== '2.1.0' || !Array.isArray(report.runs) || report.runs.length === 0) throw new Error('SARIF');
    for (const result of report.runs) {
      if (result.tool?.driver?.name !== 'CodeQL' || !Array.isArray(result.results) || result.results.length !== 0
        || !Array.isArray(result.invocations) || result.invocations.length === 0
        || result.invocations.some(invocation => invocation.executionSuccessful !== true
          || (invocation.toolExecutionNotifications ?? []).some(note => note.level === 'error'))) throw new Error('CodeQL findings');
    }
  });
  gate('final-exact-clean-attached-tree', verifyTree);
  evidence.status = 'pass';
} catch {
  evidence.gates.push({ name: active, status: 'fail' });
} finally {
  if (scratch) {
    try { rmSync(scratch, { recursive: true, force: true }); }
    catch { evidence.status = 'fail'; evidence.gates.push({ name: 'cleanup', status: 'fail' }); }
  }
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
  process.exitCode = evidence.status === 'pass' ? 0 : 1;
}
}
