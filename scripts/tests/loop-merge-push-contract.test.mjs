import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Independent test-only module loader; no production CLI/environment bypass.
const checkout = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const suppliedEnginePath = process.argv[2] ? resolve(process.argv[2]) : resolve(checkout, 'scripts/loop-merge-push.mjs');
const evidence = realpathSync(mkdtempSync(join(tmpdir(), 'lai-merge-all-independent-tests-')));
// Freeze this single builtin-module implementation for all imported/child CLI
// calls; the implementation worker may continue editing its source in parallel.
const enginePath = join(evidence, 'engine-under-test.mjs');
const engineBytes = existsSync(suppliedEnginePath) ? readFileSync(suppliedEnginePath) : null;
if (engineBytes) writeFileSync(enginePath, engineBytes);
const engineDigest = engineBytes ? createHash('sha256').update(engineBytes).digest('hex') : null;
const suiteBytes = readFileSync(fileURLToPath(import.meta.url));
const testDigest = createHash('sha256').update(suiteBytes).digest('hex');
writeFileSync(join(evidence, 'suite-source-snapshot.mjs'), suiteBytes);
const originalEnv = { ...process.env };
// No shared Git configuration or real credential helper is ever loaded in fixtures.
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.GIT_CONFIG_GLOBAL = '/dev/null';
process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = 'Independent Merge Fixture';
process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = 'fixture@example.invalid';
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_CONFIG', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'SECURITY_COMMIT_AGENT_REVIEW', 'SECURITY_COMMIT_AUTO_FIX', 'MOBILE_AUDIT_ROUTES']) delete process.env[key];
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GIT_OPTIONAL_LOCKS = '0';

const calls18 = ['security:review', 'lint', 'release:check', 'release:self-test',
  'test:scheduled-release', 'content:check-assets', 'security:test', 'test:loop-push',
  'test:update-site', 'test:content', 'test:model-watch', 'test:space-background',
  'test:newsletter', 'test:mobile-contract', 'test:flows-contract', 'test:tools-matrix',
  'build', 'test:mobile'];
const outcomes = [];
function command(cwd, program, args, extra = {}) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', env: process.env, timeout: 60_000, ...extra });
  if (result.error) throw result.error;
  return { status: result.status, signal: result.signal, stdout: result.stdout || '', stderr: result.stderr || '' };
}
function git(cwd, ...args) {
  const r = command(cwd, 'git', args);
  assert.equal(r.status, 0, `git ${JSON.stringify(args)}: ${r.stderr}`);
  return r.stdout.trim();
}
function executable(path, body) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, body); chmodSync(path, 0o755); }
function file(cwd, path, content) { mkdirSync(dirname(join(cwd, path)), { recursive: true }); writeFileSync(join(cwd, path), content); }
function commit(cwd, message, paths) { git(cwd, 'add', '--', ...paths); git(cwd, 'commit', '-qm', message); return git(cwd, 'rev-parse', 'HEAD'); }
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function snapshot(repo) {
  const index = git(repo, 'rev-parse', '--git-path', 'index');
  return {
    head: git(repo, 'rev-parse', 'HEAD'),
    status: git(repo, 'status', '--porcelain=v2', '-z', '--untracked-files=all'),
    index: existsSync(resolve(repo, index)) ? sha(readFileSync(resolve(repo, index))) : null,
    files: Object.fromEntries(git(repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean).sort().map(path => [path, existsSync(join(repo, path)) && statSync(join(repo, path)).isFile() ? sha(readFileSync(join(repo, path))) : null])),
  };
}
function refs(repo) { return git(repo, 'for-each-ref', '--format=%(refname) %(objectname) %(symref)'); }
function trace(f) { return existsSync(f.trace) ? readFileSync(f.trace, 'utf8').trim().split('\n').filter(Boolean) : []; }
function remoteMain(f) { const r = command(f.home, 'git', [`--git-dir=${f.origin}`, 'rev-parse', '--verify', 'refs/heads/main']); return r.status === 0 ? r.stdout.trim() : null; }
function ancestor(f, oid, target = remoteMain(f)) {
  assert.ok(target, 'remote main must exist');
  // Independent remote graph, not engine coverage flags or local tracking refs.
  const r = command(f.home, 'git', [`--git-dir=${f.origin}`, 'merge-base', '--is-ancestor', oid, target]);
  assert.equal(r.status, 0, `source ${oid} not ancestor of actual bare MAIN ${target}: ${r.stderr}`);
}
function remoteBlob(f, path) { return git(f.home, `--git-dir=${f.origin}`, 'show', `refs/heads/main:${path}`); }
function fixture(name) {
  const home = join(evidence, name); mkdirSync(home);
  const repo = join(home, 'source-main'); mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  const f = { home, repo, trace: join(home, 'trace'), origin: join(home, 'origin.git'), other: join(home, 'second.git'), sources: [], worktrees: [], base: null };
  // This script runs real Bash scheduling with fake npm only. It proves order,
  // never genuine scanner, browser or DB clearance. No test:loop-push recursion.
  file(repo, 'scripts/local-ci.sh', readFileSync(join(checkout, 'scripts/local-ci.sh')));
  file(repo, '.gitignore', 'node_modules/\ndist/\n');
  file(repo, 'feature.txt', 'base\n');
  executable(join(repo, 'scripts/security-commit-review.sh'), `#!/usr/bin/env bash\nset -euo pipefail\nprintf 'staged-scan|%s\\n' "$1" >> '${f.trace}'\n[[ ! -e '${join(home, 'fail-scanner')}' ]]\n`);
  f.base = commit(repo, 'fixture baseline', ['scripts/local-ci.sh', 'scripts/security-commit-review.sh', '.gitignore', 'feature.txt']);
  f.expectedContent = Object.fromEntries(git(repo, 'ls-files', '-z').split('\0').filter(Boolean).map(p => [p, readFileSync(join(repo, p))]));
  git(home, 'init', '--bare', '-q', f.origin);
  git(home, 'init', '--bare', '-q', f.other);
  git(repo, 'remote', 'add', 'origin', f.origin);
  git(repo, 'remote', 'add', 'second', f.other);
  git(repo, 'push', '-u', 'origin', 'main');
  git(repo, 'push', 'second', 'main');
  const common = git(repo, 'rev-parse', '--absolute-git-dir');
  const header = `#!/usr/bin/env bash\nset -euo pipefail\n`;
  executable(join(common, 'hooks/pre-commit'), `${header}printf 'pre-commit|%s\\n' "$(git rev-parse HEAD)" >> '${f.trace}'\n[[ ! -e '${join(home, 'fail-precommit')}' ]]\n`);
  executable(join(common, 'hooks/pre-push'), `${header}while read -r lr lo rr ro; do\n  printf 'pre-push|%s|%s|%s|%s\\n' "$lr" "$lo" "$rr" "$ro" >> '${f.trace}'\n  [[ "$lr" == refs/* || "$lr" == HEAD ]] || { printf 'unrecognized-local-ref|%s\\n' "$lr" >> '${f.trace}'; exit 88; }\ndone\n[[ ! -e '${join(home, 'fail-prepush')}' ]]\n`);
  const bin = join(home, 'bin'); mkdirSync(bin);
  executable(join(bin, 'npm'), `${header}[[ "$#" == 2 && "$1" == run ]]\nprintf 'ci|%s|%s|%s\\n' "$2" "\${MOBILE_AUDIT_HEADED-unset}" "\${MOBILE_AUDIT_ROUTES-unset}" >> '${f.trace}'\n[[ ! -e '${join(home, 'fail-gate')}' || "$(< '${join(home, 'fail-gate')}')" != "$2" ]]\n`);
  executable(join(bin, 'codex'), `${header}printf 'FORBIDDEN-CODEX\\n' >> '${f.trace}'\nexit 99\n`);
  f.bin = bin;
  return f;
}
function branch(f, name, files, base = f.base, workspaceName) {
  const path = join(f.home, workspaceName || `worktree-${name.replaceAll('/', '-')}`);
  git(f.repo, 'worktree', 'add', '-q', '-b', name, path, base);
  for (const [p, body] of Object.entries(files)) { file(path, p, body); f.expectedContent[p] = Buffer.from(body); }
  const oid = commit(path, `fixture ${name}`, Object.keys(files));
  f.sources.push({ name, oid, path, before: snapshot(path) }); f.worktrees.push(path);
  return f.sources.at(-1);
}
function retireFixtureBranch(f, source) {
  git(source.path, 'checkout', '--detach', '-q', source.oid);
  git(source.path, 'branch', '-d', source.name);
  git(f.repo, 'worktree', 'remove', source.path);
  f.worktrees = f.worktrees.filter(p => p !== source.path);
}
function assertOriginals(f) { for (const source of f.sources) if (existsSync(source.path)) assert.deepEqual(snapshot(source.path), source.before, `original changed ${source.name}`); }
function assertNoCleanup(f) { for (const path of f.worktrees) assert.ok(existsSync(path), `prematurely removed ${path}`); }
function assert18(f) {
  const lines = trace(f); const ci = lines.filter(s => s.startsWith('ci|'));
  assert.deepEqual(ci.map(s => s.split('|')[1]), calls18, 'exact 18 ordered calls');
  assert.match(ci.at(-1), /^ci\|test:mobile\|0\|unset$/);
  const lastCommit = lines.findLastIndex(s => s.startsWith('pre-commit|'));
  const firstCI = lines.findIndex(s => s.startsWith('ci|'));
  const push = lines.findIndex(s => s.includes('|refs/heads/main|'));
  assert.ok(lastCommit >= 0 && firstCI > lastCommit && push > firstCI + 17, 'normal hooks → all18 → exact MAIN push');
  for (const line of lines.filter(s => s.startsWith('pre-push|'))) assert.match(line.split('|')[1], /^(?:refs\/|HEAD$)/, 'ordinary hook rejects raw-SHA local_ref');
  const mainStream = lines.findLast(s => s.startsWith('pre-push|') && s.split('|')[3] === 'refs/heads/main');
  assert.ok(mainStream); assert.equal(mainStream.split('|')[2], remoteMain(f), 'outgoing local_oid exact accepted MAIN candidate');
}
async function scenario(name, targets, body) {
  console.log(`START ${name}`);
  try { await body(); outcomes.push({ name, targets, passed: true }); }
  catch (error) { outcomes.push({ name, targets, passed: false, error: error.stack || String(error) }); }
  writeFileSync(join(evidence, 'results.json'), JSON.stringify({ suppliedEnginePath, enginePath, engineDigest, testDigest, evidence, outcomes }, null, 2));
  console.log(`${outcomes.at(-1).passed ? 'PASS' : 'FAIL'} ${name}`);
}

await scenario('oracle-selfcheck-real-Git-and-exact18-scheduling', [], async () => {
  const f = fixture('oracle-selfcheck');
  const a = branch(f, 'oracle-A', { 'a.txt': 'A\n' });
  const b = branch(f, 'oracle-B', { 'b.txt': 'B\n' });
  assertOriginals(f);
  git(f.repo, 'merge', '--no-ff', '-m', 'normal fixture integration', a.oid, b.oid);
  git(f.repo, 'push', 'origin', 'HEAD:refs/heads/main');
  ancestor(f, a.oid); ancestor(f, b.oid);
  assert.equal(remoteBlob(f, 'a.txt'), 'A'); assert.equal(remoteBlob(f, 'b.txt'), 'B');
  assertOriginals(f); assertNoCleanup(f);
  for (const failed of [null, ...calls18]) {
    writeFileSync(f.trace, '');
    const marker = join(f.home, 'fail-gate');
    if (failed) writeFileSync(marker, failed); else if (existsSync(marker)) rmSync(marker);
    const r = command(f.repo, 'bash', ['scripts/local-ci.sh'], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}`, MOBILE_AUDIT_HEADED: '1', MOBILE_AUDIT_ROUTES: '["/restricted"]' } });
    const expected = failed ? calls18.slice(0, calls18.indexOf(failed) + 1) : calls18;
    assert.deepEqual(trace(f).map(line => line.split('|')[1]), expected);
    if (failed) { assert.notEqual(r.status, 0); assert.doesNotMatch(r.stdout, /Local verification passed/); }
    else { assert.equal(r.status, 0, r.stderr); assert.match(trace(f).at(-1), /^ci\|test:mobile\|0\|unset$/); }
  }
  assert.equal(trace(f).includes('FORBIDDEN-CODEX'), false);
});

// Runner/adapter scenarios below use only the public contract. Selfcheck
// above validates the independent oracle, NOT any VAL-ALL implementation.

let module;
try { module = await import(pathToFileURL(enginePath).href); }
catch (error) {
  writeFileSync(join(evidence, 'results.json'), JSON.stringify({ suppliedEnginePath, enginePath, engineDigest, testDigest, evidence, blocked: 'engine module unavailable', error: String(error) }, null, 2));
  console.error(`Independent merge-all tests BLOCKED: engine unavailable ${enginePath}; evidence ${evidence}`);
  process.exitCode = 1;
}
const unprotected = () => ({ protected: false, allowsMergeCommits: true, canPush: true, strict: false,
  linearHistory: false, requiredChecks: [], requiredApprovals: 0,
  evidence: { protectionStatus: 404, branchRules: [], observedAt: new Date().toISOString(), actionsEnabled: false } });
function adapters(policy = unprotected) {
  return { github: { discoverPolicy: async context => policy(context),
    ensurePullRequest: async () => { throw new Error('unexpected PR on unprotected fixture'); },
    inspectPullRequest: async () => { throw new Error('unexpected PR inspection'); },
    mergePullRequest: async () => { throw new Error('unexpected protected merge'); } } };
}
async function run(f, options = {}, policy = unprotected, permitFixtureReview = true) {
  const oldPath = process.env.PATH;
  process.env.PATH = `${f.bin}:${oldPath}`;
  let result;
  const backend = options.adapters || adapters(policy);
  f.backendEvents ||= [];
  const observedBackend = { github: Object.fromEntries(Object.entries(backend.github).map(([name, fn]) => [name, async (...args) => {
    f.backendEvents.push({ name, args, at: new Date().toISOString() });
    writeFileSync(join(f.home, 'backend-events.json'), JSON.stringify(f.backendEvents, null, 2));
    return fn.apply(backend.github, args);
  }])) };
  try {
    result = await module.runMergeAll({ cwd: f.repo, minutes: 0, ...options, adapters: observedBackend });
    if (permitFixtureReview && result.blockers?.some(b => b.kind === 'content-review') && !existsSync(join(dirname(result.statePath), 'content-approval.json'))) {
      approveFixtureContent(f, result);
      result = await module.runMergeAll({ cwd: f.repo, minutes: 0, ...options, adapters: observedBackend, resume: result.runId, cleanup: undefined, status: undefined });
    }
  }
  finally { process.env.PATH = oldPath; }
  assert.ok(result && typeof result.code === 'number', 'public runner must return result.code');
  const number = readdirSync(f.home).filter(p => /^run-\d+\.json$/.test(p)).length;
  writeFileSync(join(f.home, `run-${number}.json`), JSON.stringify(result, null, 2));
  return result;
}
function incomplete(result) { assert.notEqual(result.code, 0, JSON.stringify(result)); assert.equal(result.complete, false); }
function state(result) { assert.ok(result.statePath, 'statePath required'); return JSON.parse(readFileSync(result.statePath, 'utf8')); }
function privateJSON(path, value) { writeFileSync(path, JSON.stringify(value)); chmodSync(path, 0o600); }
function resolutionBinding(worktree) {
  const entries = git(worktree, 'ls-files', '--stage', '-z').split('\0').filter(Boolean).map(e => {
    const tab = e.indexOf('\t'), [mode, oid, stage] = e.slice(0, tab).split(' ');
    return { path: e.slice(tab + 1), mode, oid, stage: Number(stage) };
  });
  assert.ok(entries.every(e => e.stage === 0));
  return { proposedTreeOid: git(worktree, 'write-tree'), resolutionIndexDigest: sha(JSON.stringify(entries)) };
}
function censusIds(result) {
  const rows = result.mainProof?.coverage || result.inventory?.sources;
  assert.ok(rows, 'public frozen coverage or inventory.sources required'); return new Map(rows.map(s => [s.id, s.oid]));
}
function reached(f, method) { assert.ok(f.backendEvents?.some(e => e.name === method), `injected backend boundary ${method} was never reached`); }
function prepare(f) {
  writeFileSync(f.trace, '');
  f.expectedSourceRefs ||= git(f.repo, 'for-each-ref', '--format=%(refname) %(objectname) %(objecttype) %(symref)', 'refs/heads', 'refs/remotes').split('\n').map(row => row.split(' ')).filter(([, , type, sym]) => type === 'commit' && !sym).map(([id, oid]) => ({ id, oid }));
}
function approveFixtureContent(f, result) {
  const dir = dirname(result.statePath), packet = JSON.parse(readFileSync(join(dir, 'content-packet.json'), 'utf8'));
  const head = git(result.integrationWorktree, 'rev-parse', 'HEAD');
  assert.equal(packet.candidateOid, head); assert.equal(packet.candidateTree, git(result.integrationWorktree, 'rev-parse', 'HEAD^{tree}'));
  const { packetDigest, ...bound } = packet; assert.equal(packetDigest, sha(JSON.stringify(bound)), 'packet binding independent hash');
  for (const expected of f.expectedSourceRefs || []) assert.ok(packet.contributions.some(c => c.id === expected.id && c.oid === expected.oid), `review cannot omit ${expected.id}`);
  for (const oid of [f.base, ...f.sources.map(s => s.oid), ...(f.recoveryOids || [])]) {
    assert.equal(command(f.repo, 'git', ['merge-base', '--is-ancestor', oid, head]).status, 0, `independent candidate ancestry ${oid}`);
    assert.ok(packet.contributions.some(c => c.oid === oid), `review source coverage ${oid}`);
  }
  for (const c of packet.contributions) {
    assert.equal(git(f.repo, 'rev-parse', `${c.oid}^{tree}`), c.tree);
    assert.equal(command(f.repo, 'git', ['merge-base', '--is-ancestor', c.oid, head]).status, 0);
    assert.equal(c.ancestor, true);
  }
  for (const [p, bytes] of Object.entries(f.expectedContent)) {
    const actual = spawnSync('git', ['show', `${head}:${p}`], { cwd: f.repo, env: process.env, timeout: 60_000, maxBuffer: 256 * 1024 * 1024 });
    assert.equal(actual.status, 0, `accepted content missing ${p}`); assert.deepEqual(actual.stdout, Buffer.from(bytes), `independent accepted bytes ${p}`);
  }
  const note = JSON.stringify({ fixtureOnly: true, candidateOid: head, candidateTree: packet.candidateTree,
    sourceAliases: packet.contributions.map(c => [c.id, c.oid]), expectedFiles: Object.entries(f.expectedContent).map(([p, bytes]) => [p, sha(bytes)]) });
  writeFileSync(join(dir, 'independent-content-evidence.json'), note); chmodSync(join(dir, 'independent-content-evidence.json'), 0o600);
  privateJSON(join(dir, 'content-approval.json'), { ...packet, decision: 'approve-all-reviewed-contributions', reviewer: { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' },
    evidenceFiles: [{ relativePath: 'independent-content-evidence.json', sha256: sha(note) }] });
}

if (module) {
  assert.equal(typeof module.runMergeAll, 'function', 'public runMergeAll export required');
  for (const collision of ['none', 'path', 'ref', 'source-drift']) await scenario(`D-CLI-initialization-review-resume-${collision}`, ['005', '008', '009', '012'], async () => {
    const f = fixture(`D-init-review-${collision}`);
    file(f.repo, 'caller.txt', 'caller ahead of origin\n');
    const caller = commit(f.repo, 'caller ahead of base', ['caller.txt']);
    const common = join(f.repo, '.git'), store = join(common, 'loop-merge-push');
    executable(join(common, 'hooks/post-checkout'), '#!/bin/sh\nexit 0\n');
    prepare(f);
    const invoke = (...args) => {
      const result = command(f.repo, process.execPath, [enginePath, '0', ...args], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}` }, timeout: 180_000 });
      assert.ok(result.stdout.trim(), result.stderr);
      return JSON.parse(result.stdout);
    };
    const approve = (dir, packet) => {
      mkdirSync(dir, { recursive: true, mode: 0o700 }); chmodSync(dir, 0o700);
      const note = 'Independent fixture review: fixed no-op post-checkout hook; exact packet only.\n';
      writeFileSync(join(dir, 'execution-evidence.txt'), note); chmodSync(join(dir, 'execution-evidence.txt'), 0o600);
      privateJSON(join(dir, 'base-execution-approval.json'), { ...packet, decision: 'approve-reviewed-git-execution', reviewer: { role: 'parent', provider: 'openai-codex', model: 'gpt-6.1-sol' }, evidenceFiles: [{ relativePath: 'execution-evidence.txt', sha256: sha(note) }] });
    };
    const globalReview = invoke('--dry-run');
    assert.equal(globalReview.blockers[0].kind, 'git-execution-review');
    approve(store, globalReview.reviewPacket);
    const first = invoke();
    assert.equal(first.blockers[0].kind, 'git-execution-review');
    assert.equal(first.reviewPacket.sourceOid, caller);
    assert.equal(existsSync(first.integrationWorktree), false);
    assert.equal(state(first).data.intent, null);
    const dir = dirname(first.statePath);
    approve(dir, first.reviewPacket);
    const second = invoke('--resume', first.runId);
    assert.equal(second.blockers[0].kind, 'git-execution-review', JSON.stringify(second));
    assert.equal(second.reviewPacket.sourceOid, f.base);
    assert.equal(existsSync(second.integrationWorktree), false);
    assert.ok(state(second).data.events.some(event => event.kind === 'all-remote-prefetch-and-refreshed-census'));
    approve(dir, second.reviewPacket);
    if (collision === 'path') { mkdirSync(second.integrationWorktree); file(second.integrationWorktree, 'preserve.txt', 'do not overwrite\n'); }
    if (collision === 'ref') git(f.repo, 'branch', second.integrationRef.slice('refs/heads/'.length), caller);
    if (collision === 'source-drift') file(f.repo, 'unreviewed.txt', 'do not adopt\n');
    const before = snapshot(f.repo), beforeRemote = remoteMain(f);
    const third = invoke('--resume', first.runId);
    assert.equal(remoteMain(f), beforeRemote);
    assert.deepEqual(snapshot(f.repo), before);
    if (collision === 'none') {
      assert.ok(existsSync(third.integrationWorktree), JSON.stringify(third));
      assert.equal(git(third.integrationWorktree, 'symbolic-ref', 'HEAD'), third.integrationRef);
      assert.ok(state(third).data.events.some(event => event.kind === 'isolated-integration-created'));
      assert.ok(!third.blockers.some(blocker => ['derived-resource-mismatch', 'integration-initialization-mismatch'].includes(blocker.kind)));
    } else {
      assert.ok(third.blockers.some(blocker => blocker.kind === (collision === 'source-drift' ? 'source-movement' : 'integration-create-incomplete')), JSON.stringify(third));
      if (collision === 'path') assert.equal(readFileSync(join(third.integrationWorktree, 'preserve.txt'), 'utf8'), 'do not overwrite\n');
      if (collision === 'ref') assert.equal(git(f.repo, 'rev-parse', third.integrationRef), caller);
      if (collision === 'source-drift') assert.equal(existsSync(third.integrationWorktree), false);
    }
  });
  await scenario('A-all-remotes-stale-divergent-detached-duplicate-ancestry-and-cleanup', ['002', '006', '009', '010', '011', '012', '013'], async () => {
    const f = fixture('A-all-source');
    const a = branch(f, 'local-A', { 'a.txt': 'local A\n' });
    const b = branch(f, 'origin-B', { 'b.txt': 'origin only B\n' });
    git(f.repo, 'push', 'origin', `refs/heads/${b.name}:refs/heads/remote-only-B`);
    retireFixtureBranch(f, b);
    const second = branch(f, 'second-source', { 'second.txt': 'second remote\n' });
    git(f.repo, 'push', 'second', `refs/heads/${second.name}:refs/heads/second-only`);
    retireFixtureBranch(f, second);
    const stale = branch(f, 'stale-source', { 'stale.txt': 'pre-fetch tip retained\n' });
    git(f.repo, 'push', 'second', `refs/heads/${stale.name}:refs/heads/disappeared`);
    git(f.repo, 'fetch', 'second');
    const deletionClient = join(f.home, 'independent-remote-deletion'); git(f.home, 'clone', '-q', '-b', 'main', f.other, deletionClient);
    git(deletionClient, 'push', 'origin', ':refs/heads/disappeared');
    assert.equal(git(f.repo, 'rev-parse', 'refs/remotes/second/disappeared'), stale.oid, 'stale prefetch tracking source retained');
    retireFixtureBranch(f, stale);
    const local = branch(f, 'same-name', { 'local-divergent.txt': 'local\n' });
    const remote = branch(f, 'remote-divergent', { 'remote-divergent.txt': 'remote\n' });
    git(f.repo, 'push', 'origin', `refs/heads/${remote.name}:refs/heads/same-name`);
    retireFixtureBranch(f, remote);
    git(f.repo, 'branch', 'duplicate-A', a.oid);
    const detached = branch(f, 'detached-source', { 'detached.txt': 'detached\n' }, f.base, 'detached workspace\nline');
    git(detached.path, 'checkout', '--detach', '-q', detached.oid); git(detached.path, 'branch', '-d', 'detached-source');
    prepare(f); const mainBefore = snapshot(f.repo); const r = await run(f);
    assert.equal(r.code, 0, JSON.stringify(r)); assert.equal(r.complete, true); assert.equal(r.phase, 'complete');
    for (const source of f.sources) ancestor(f, source.oid);
    const expected = { 'a.txt': 'local A', 'b.txt': 'origin only B', 'second.txt': 'second remote', 'stale.txt': 'pre-fetch tip retained', 'local-divergent.txt': 'local', 'remote-divergent.txt': 'remote', 'detached.txt': 'detached' };
    for (const [p, body] of Object.entries(expected)) assert.equal(remoteBlob(f, p), body);
    const ids = censusIds(r);
    assert.equal(ids.get('refs/remotes/second/second-only'), second.oid);
    assert.equal(ids.get('refs/remotes/second/disappeared'), stale.oid);
    assert.equal(ids.get('refs/remotes/origin/same-name'), remote.oid); assert.equal(ids.get('refs/heads/same-name'), local.oid);
    assert.equal(ids.get('refs/heads/duplicate-A'), a.oid);
    assert.equal(ids.get(`worktree:${detached.path}`), detached.oid);
    assert.deepEqual(snapshot(f.repo), mainBefore, 'caller original main/index/files unchanged');
    assert18(f);
    for (const path of f.worktrees) assert.equal(existsSync(path), false, `eligible source cleanup missing ${path}`);
    assert.ok(existsSync(r.integrationWorktree), 'integration retained anchor');
    assert.ok(existsSync(f.repo), 'caller/main retained anchor');
    const bareRefs = git(f.home, `--git-dir=${f.origin}`, 'for-each-ref', '--format=%(refname)');
    assert.match(bareRefs, /refs\/heads\/remote-only-B/); assert.match(bareRefs, /refs\/heads\/same-name/);
    const before = remoteMain(f); const again = await run(f, { resume: r.runId });
    assert.equal(again.code, 0, JSON.stringify(again)); assert.equal(remoteMain(f), before, 'idempotent resume');
  });

  await scenario('A-historical-source-no-live-ref-still-main-ancestry', ['002', '005', '006', '011'], async () => {
    const f = fixture('A-historical'); const source = branch(f, 'old-source', { 'historical.txt': 'prior input\n' }); retireFixtureBranch(f, source);
    const store = join(f.repo, '.git', 'loop-merge-push'); mkdirSync(store, { mode: 0o700 });
    privateJSON(join(store, 'historical-inputs.json'), { schema: 1, inputs: [{ id: 'historical:original-old-source', oid: source.oid, objectType: 'commit', provenance: 'independent prior fixture census' }] });
    prepare(f); const r = await run(f); assert.equal(r.code, 0, JSON.stringify(r)); ancestor(f, source.oid); assert.equal(remoteBlob(f, 'historical.txt'), 'prior input'); assert.equal(censusIds(r).get('historical:original-old-source'), source.oid);
  });
  await scenario('A-noncommit-checkpoint-classified-not-fake-merge', ['002', '003', '013'], async () => {
    const f = fixture('A-checkpoint'); branch(f, 'A', { 'a.txt': 'A\n' }); const tree = git(f.repo, 'rev-parse', 'HEAD^{tree}'); git(f.repo, 'update-ref', 'refs/checkpoints/original-tree', tree); prepare(f);
    const r = await run(f); incomplete(r); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
    assert.ok(r.inventory.noncommitInputs.some(i => i.id === 'refs/checkpoints/original-tree' && i.oid === tree && i.objectType === 'tree'));
    assert.equal(r.inventory.sources.some(s => s.oid === tree), false, 'tree never fabricated into commit ancestry');
  });

  await scenario('B-staged-v1-unstaged-v2-untracked-and-global-before-any-cleanup', ['003', '004', '005', '012', '013'], async () => {
    const f = fixture('B-dirty'); branch(f, 'clean-feature', { 'clean.txt': 'keep\n' });
    const dirty = branch(f, 'dirty-source', { 'dirty.txt': 'baseline\n' });
    file(dirty.path, 'dirty.txt', 'staged v1\n'); git(dirty.path, 'add', '--', 'dirty.txt');
    file(dirty.path, 'dirty.txt', 'unstaged v2\n'); file(dirty.path, 'untracked\nfile.txt', 'untracked\n');
    dirty.before = snapshot(dirty.path); const main = remoteMain(f); prepare(f);
    const r = await run(f); incomplete(r); assertOriginals(f); assertNoCleanup(f); assert.equal(remoteMain(f), main);
    const row = r.inventory.worktrees.find(w => w.path === dirty.path);
    assert.ok(row?.status, 'dirty source status recorded'); assert.ok(row.index.some(e => e.path === 'dirty.txt'));
    assert.ok(row.files.some(e => e.path === 'untracked\nfile.txt'));
    assert.equal(trace(f).includes('FORBIDDEN-CODEX'), false);
  });
  await scenario('B-reviewed-large-distinct-byte-recovery', ['003', '005', '008', '009', '011', '012'], async () => {
    const f = fixture('B-large-recovery'); const source = branch(f, 'source', { 'large.bin': 'original baseline\n' });
    const v1 = Buffer.alloc(66 * 1024 * 1024 + 31, 0x41); file(source.path, 'large.bin', v1); git(source.path, 'add', '--', 'large.bin');
    const originalIndexOid = git(source.path, 'rev-parse', ':large.bin'); const v2 = Buffer.from(v1); v2[v2.length - 1] = 0x42; file(source.path, 'large.bin', v2); file(source.path, 'untracked.txt', 'preserved untracked input\n'); source.before = snapshot(source.path); prepare(f);
    const original = await run(f, {}, unprotected, false); incomplete(original); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
    const sourceRow = original.inventory.worktrees.find(w => w.path === source.path), inputDigest = original.blockers.find(b => b.sourceId === `worktree:${source.path}`)?.inputDigest; assert.ok(inputDigest, 'public intake inputDigest for exact original versions');
    const bogus = command(f.repo, 'git', ['hash-object', '-w', '--stdin'], { input: 'replacement must not spoof original bytes\n' }); assert.equal(bogus.status, 0); git(f.repo, 'replace', originalIndexOid, bogus.stdout.trim());
    const replacement = await run(f, { resume: original.runId }, unprotected, false); incomplete(replacement); assert.ok(replacement.blockers.some(b => b.kind === 'uncertain-history')); assert.equal(remoteMain(f), f.base); git(f.repo, 'replace', '-d', originalIndexOid);
    const recovery = join(f.home, 'owned-recovery'); git(f.repo, 'worktree', 'add', '-q', '-b', 'reviewed-recovery', recovery, source.oid); f.worktrees.push(recovery);
    file(recovery, 'large.bin', v1); const c1 = commit(recovery, 'ordinary reviewed original index version', ['large.bin']);
    file(recovery, 'large.bin', v2); file(recovery, 'untracked.txt', 'preserved untracked input\n'); const c2 = commit(recovery, 'ordinary reviewed original working/untracked version', ['large.bin', 'untracked.txt']); f.recoveryOids = [c1, c2];
    const moved = await run(f, { resume: original.runId }, unprotected, false); incomplete(moved); const dir = dirname(original.statePath), movement = JSON.parse(readFileSync(join(dir, 'movement-packet.json'), 'utf8'));
    const note = 'Independent fixture verifies ordinary recovery versions and all original hashes; no original source cleanup authorized\n'; writeFileSync(join(dir, 'intake-evidence.txt'), note); chmodSync(join(dir, 'intake-evidence.txt'), 0o600); const proof = [{ relativePath: 'intake-evidence.txt', sha256: sha(note) }], reviewer = { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' };
    privateJSON(join(dir, 'source-transition-approval.json'), { schema: 1, runId: original.runId, beforeDigest: movement.beforeDigest, afterDigest: movement.afterDigest, decision: 'approve-reviewed-source-transition', reviewer, evidenceFiles: proof, recoveryOids: [c1, c2] });
    const versions = sourceRow.index.filter(e => e.stage === 0).map(e => ({ kind: 'index', path: e.path, oid: e.oid, mode: e.mode, commit: c1 }));
    for (const entry of sourceRow.files.filter(e => e.kind === 'file')) versions.push({ kind: 'worktree', path: entry.path, digest: entry.digest, mode: entry.mode & 0o111 ? '100755' : '100644', commit: c2 });
    assert.equal(git(recovery, 'rev-parse', `${c1}:large.bin`), originalIndexOid); assert.notEqual(git(recovery, 'rev-parse', `${c2}:large.bin`), originalIndexOid);
    privateJSON(join(dir, 'intake-approval.json'), { schema: 1, runId: original.runId, inventoryDigest: movement.afterDigest, decision: 'approve-reviewed-intake', reviewer, evidenceFiles: proof,
      resolutions: [{ sourceId: `worktree:${source.path}`, inputDigest, sourceFingerprint: sourceRow.fingerprint, recoveryOids: [c1, c2], versions }] });
    f.expectedContent['large.bin'] = v2; f.expectedContent['untracked.txt'] = Buffer.from('preserved untracked input\n');
    const landed = await run(f, { resume: original.runId }); incomplete(landed); // Original dirty non-anchor still blocks cleanup/completion.
    ancestor(f, source.oid); ancestor(f, c1); ancestor(f, c2); assert.ok(landed.mainProof, 'real MAIN proof before held cleanup');
    const finalBytes = spawnSync('git', [`--git-dir=${f.origin}`, 'show', 'refs/heads/main:large.bin'], { cwd: f.home, maxBuffer: 256 * 1024 * 1024 }); assert.equal(finalBytes.status, 0); assert.equal(sha(finalBytes.stdout), sha(v2));
    assertOriginals(f); assert.ok(existsSync(source.path)); assert.equal(snapshot(source.path).index, source.before.index); assert.equal(landed.complete, false);
  });

  await scenario('B-stash-three-part-intake-global-barrier', ['002', '003', '012', '013'], async () => {
    const f = fixture('B-stash'); branch(f, 'clean-A', { 'a.txt': 'A\n' });
    file(f.repo, 'feature.txt', 'stash staged\n'); git(f.repo, 'add', '--', 'feature.txt'); file(f.repo, 'feature.txt', 'stash worktree\n'); file(f.repo, 'untracked.txt', 'stash untracked\n');
    git(f.repo, 'stash', 'push', '-u', '-m', 'fixture stash'); const stashOid = git(f.repo, 'rev-parse', 'refs/stash'); const before = snapshot(f.repo); const main = remoteMain(f); prepare(f);
    const r = await run(f); incomplete(r); assert.equal(git(f.repo, 'rev-parse', 'refs/stash'), stashOid); assert.deepEqual(snapshot(f.repo), before); assertNoCleanup(f); assert.equal(remoteMain(f), main);
    assert.ok(r.inventory.stash.some(s => s.oid === stashOid && s.parents.length === 3));
  });
  for (const mode of ['locked', 'missing-index', 'unknown-ignored']) await scenario(`B-${mode}-held-not-success`, ['003', '004', '012', '013'], async () => {
    const f = fixture(`B-${mode}`); const source = branch(f, 'held-source', { 'held.txt': 'held\n' }); branch(f, 'clean-source', { 'clean.txt': 'clean\n' });
    if (mode === 'locked') git(f.repo, 'worktree', 'lock', '--reason', 'explicit fixture ownership hold', source.path);
    if (mode === 'missing-index') { file(source.path, 'held.txt', 'recoverable index bytes\n'); git(source.path, 'add', '--', 'held.txt'); source.before = snapshot(source.path); rmSync(source.path, { recursive: true }); }
    if (mode === 'unknown-ignored') { file(source.path, '.gitignore', '*.private\n'); commit(source.path, 'ignore fixture', ['.gitignore']); source.oid = git(source.path, 'rev-parse', 'HEAD'); file(source.path, 'unknown.private', 'do not publish\n'); source.before = snapshot(source.path); }
    const beforeRefs = refs(f.repo), main = remoteMain(f); prepare(f); const r = await run(f); incomplete(r); assert.equal(remoteMain(f), main);
    assert.ok(r.inventory.worktrees.some(w => w.path === source.path));
    if (mode === 'missing-index') {
      const row = r.inventory.worktrees.find(w => w.path === source.path); assert.equal(row.missing, true); assert.ok(row.index.some(e => e.path === 'held.txt'));
      assert.match(git(f.repo, 'worktree', 'list', '--porcelain'), /held-source/);
      assert.ok(refs(f.repo).includes('refs/heads/held-source'));
    } else { assertOriginals(f); assertNoCleanup(f); }
    assert.ok(beforeRefs.includes('refs/heads/held-source'));
  });

  await scenario('C-real-conflict-reviewed-resolution-resume-and-replay', ['006', '007', '008', '009', '011', '013'], async () => {
    const f = fixture('C-conflict'); const a = branch(f, 'conflict-A', { 'feature.txt': 'A version\n' }); const b = branch(f, 'conflict-B', { 'feature.txt': 'B version\n' }); prepare(f);
    const r = await run(f); assert.equal(r.code, 3, JSON.stringify(r)); assert.equal(r.phase, 'conflict'); assertOriginals(f); assertNoCleanup(f);
    const pending = r.pendingConflict; assert.ok(pending?.paths.includes('feature.txt')); assert.equal(git(r.integrationWorktree, 'rev-parse', 'MERGE_HEAD'), pending.sourceOid);
    assert.equal(git(r.integrationWorktree, 'rev-parse', 'HEAD'), pending.beforeOid);
    file(r.integrationWorktree, 'feature.txt', 'A version + B version\n'); f.expectedContent['feature.txt'] = Buffer.from('A version + B version\n'); git(r.integrationWorktree, 'add', '--', 'feature.txt');
    const runDir = dirname(r.statePath), evidenceBody = 'Independent fixture accepts both A and B\n';
    const note = join(runDir, 'resolution-evidence.txt'); writeFileSync(note, evidenceBody); chmodSync(note, 0o600);
    privateJSON(join(runDir, 'conflict-approval.json'), { schema: 1, runId: r.runId, packetDigest: pending.packetDigest, beforeOid: pending.beforeOid, sourceOid: pending.sourceOid, ...resolutionBinding(r.integrationWorktree),
      decisions: [{ path: 'feature.txt', decision: 'reconcile both fixture contributions', evidenceFiles: [{ relativePath: 'resolution-evidence.txt', sha256: sha(evidenceBody) }] }], reviewer: { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' } });
    const resolved = await run(f, { resume: r.runId }); assert.equal(resolved.code, 0, JSON.stringify(resolved));
    ancestor(f, a.oid); ancestor(f, b.oid); assert.equal(remoteBlob(f, 'feature.txt'), 'A version + B version');
    const head = remoteMain(f); const count = git(f.home, `--git-dir=${f.origin}`, 'rev-list', '--count', 'refs/heads/main');
    const again = await run(f, { resume: r.runId }); assert.equal(again.code, 0, JSON.stringify(again)); assert.equal(remoteMain(f), head); assert.equal(git(f.home, `--git-dir=${f.origin}`, 'rev-list', '--count', 'refs/heads/main'), count);
  });
  for (const type of ['add-add', 'delete-modify', 'rename-rename']) await scenario(`C-${type}-normal-conflict-resolution`, ['006', '007', '008', '011'], async () => {
    const f = fixture(`C-${type}`); let a, b, finalPath;
    if (type === 'add-add') { a = branch(f, 'A', { 'new.txt': 'A\n' }); b = branch(f, 'B', { 'new.txt': 'B\n' }); finalPath = 'new.txt'; }
    else {
      a = branch(f, 'A', type === 'rename-rename' ? { 'a.txt': 'A\n' } : { 'feature.txt': 'A\n' });
      b = branch(f, 'B', type === 'rename-rename' ? { 'b.txt': 'B\n' } : { 'feature.txt': 'B\n' });
      if (type === 'delete-modify') { git(b.path, 'rm', '--', 'feature.txt'); git(b.path, 'commit', '-qm', 'fixture deletion'); b.oid = git(b.path, 'rev-parse', 'HEAD'); finalPath = 'feature.txt'; }
      else {
        git(a.path, 'mv', 'feature.txt', 'nameA.txt'); git(a.path, 'commit', '-qm', 'fixture rename A'); a.oid = git(a.path, 'rev-parse', 'HEAD');
        git(b.path, 'mv', 'feature.txt', 'nameB.txt'); git(b.path, 'commit', '-qm', 'fixture rename B'); b.oid = git(b.path, 'rev-parse', 'HEAD'); finalPath = 'nameA.txt';
      }
      a.before = snapshot(a.path); b.before = snapshot(b.path);
    }
    prepare(f); const r = await run(f); assert.equal(r.code, 3, JSON.stringify(r)); assertOriginals(f); assertNoCleanup(f);
    const p = r.pendingConflict; assert.ok(p.paths.length); assert.equal(git(r.integrationWorktree, 'rev-parse', 'MERGE_HEAD'), p.sourceOid);
    for (const path of p.paths) if (existsSync(join(r.integrationWorktree, path))) rmSync(join(r.integrationWorktree, path));
    file(r.integrationWorktree, finalPath, `accepted A + B (${type})\n`);
    for (const path of p.paths) delete f.expectedContent[path];
    f.expectedContent[finalPath] = Buffer.from(`accepted A + B (${type})\n`);
    git(r.integrationWorktree, 'add', '--', ...new Set([...p.paths, finalPath]));
    const dir = dirname(r.statePath), note = `Independent fixture reconciles ${type} A and B\n`; writeFileSync(join(dir, 'resolution.txt'), note); chmodSync(join(dir, 'resolution.txt'), 0o600);
    privateJSON(join(dir, 'conflict-approval.json'), { schema: 1, runId: r.runId, packetDigest: p.packetDigest, beforeOid: p.beforeOid, sourceOid: p.sourceOid, ...resolutionBinding(r.integrationWorktree),
      decisions: p.paths.map(path => ({ path, decision: `reconcile ${type} originals`, evidenceFiles: [{ relativePath: 'resolution.txt', sha256: sha(note) }] })), reviewer: { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' } });
    const next = await run(f, { resume: r.runId }); assert.equal(next.code, 0, JSON.stringify(next)); ancestor(f, a.oid); ancestor(f, b.oid); assert.equal(remoteBlob(f, finalPath), `accepted A + B (${type})`);
  });
  await scenario('C-resolution-mutation-after-receipt-before-resume', ['007', '008', '009', '012'], async () => {
    const f = fixture('C-postreceipt-mutation'); branch(f, 'A', { 'feature.txt': 'A\n' }); branch(f, 'B', { 'feature.txt': 'B\n' }); prepare(f);
    const r = await run(f); assert.equal(r.code, 3, JSON.stringify(r)); const p = r.pendingConflict, dir = dirname(r.statePath);
    file(r.integrationWorktree, 'feature.txt', 'reviewed A+B resolution\n'); git(r.integrationWorktree, 'add', '--', 'feature.txt');
    const note = 'parent fixture reviews ONLY first exact resolution\n'; writeFileSync(join(dir, 'receipt.txt'), note); chmodSync(join(dir, 'receipt.txt'), 0o600);
    privateJSON(join(dir, 'conflict-approval.json'), { schema: 1, runId: r.runId, packetDigest: p.packetDigest, beforeOid: p.beforeOid, sourceOid: p.sourceOid, ...resolutionBinding(r.integrationWorktree),
      decisions: p.paths.map(path => ({ path, decision: 'accept exact first resolution only', evidenceFiles: [{ relativePath: 'receipt.txt', sha256: sha(note) }] })), reviewer: { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' } });
    file(r.integrationWorktree, 'feature.txt', 'UNREVIEWED replacement\n'); git(r.integrationWorktree, 'add', '--', 'feature.txt'); prepare(f);
    const next = await run(f, { resume: r.runId }, unprotected, false); incomplete(next);
    assert.equal(git(r.integrationWorktree, 'rev-parse', 'HEAD'), p.beforeOid, 'unreviewed tree cannot be committed even if later content gate blocks');
    assert.equal(git(r.integrationWorktree, 'rev-parse', 'MERGE_HEAD'), p.sourceOid); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
    assert.equal(trace(f).some(line => line.startsWith('pre-commit|') || line.startsWith('staged-scan|')), false);
  });
  await scenario('C-unrelated-resolution-no-approval-blocked', ['007', '008', '012'], async () => {
    const f = fixture('C-wrong'); branch(f, 'A', { 'feature.txt': 'A\n' }); branch(f, 'B', { 'feature.txt': 'B\n' }); const main = remoteMain(f); prepare(f);
    const r = await run(f); assert.equal(r.code, 3, JSON.stringify(r)); file(r.integrationWorktree, 'unrelated.txt', 'unapproved\n'); git(r.integrationWorktree, 'add', '--', 'unrelated.txt');
    const resumed = await run(f, { resume: r.runId }); incomplete(resumed); assert.equal(remoteMain(f), main); assertOriginals(f); assertNoCleanup(f);
  });

  await scenario('D-ledger-digest-tamper-blocks-resume', ['005', '008', '012', '013'], async () => {
    const f = fixture('D-tamper'); const source = branch(f, 'dirty', { 'd.txt': 'd\n' }); file(source.path, 'd.txt', 'dirty\n'); source.before = snapshot(source.path); prepare(f); const r = await run(f); incomplete(r);
    const envelope = state(r); envelope.digest = '0'.repeat(64); privateJSON(r.statePath, envelope);
    const next = await run(f, { resume: r.runId }); incomplete(next); assertOriginals(f); assertNoCleanup(f); assert.equal(remoteMain(f), f.base);
  });
  await scenario('D-policy-boundary-source-ref-race-blocks-push-cleanup', ['005', '010', '012'], async () => {
    const f = fixture('D-race'); const source = branch(f, 'racing', { 'r.txt': 'r\n' }); prepare(f);
    const r = await run(f, {}, () => { file(source.path, 'r.txt', 'writer changed\n'); return unprotected(); });
    incomplete(r); reached(f, 'discoverPolicy'); assert.equal(remoteMain(f), f.base); assertNoCleanup(f); assert.equal(readFileSync(join(source.path, 'r.txt'), 'utf8'), 'writer changed\n');
  });

  let ciFailureFixture, ciFailureRunId;
  for (const failure of ['scanner', 'precommit', 'prepush', ...calls18]) await scenario(`E-required-failure-${failure}`, ['009', '010', '012', '013'], async () => {
    const ciFailure = calls18.includes(failure);
    let f;
    if (ciFailure) {
      // Same exact immutable candidate, independently injected failure at each
      // command; reuse valid blocked state instead of rebuilding 18 Git graphs.
      if (!ciFailureFixture) { ciFailureFixture = fixture('E-ordered-CI-failures'); branch(ciFailureFixture, 'source-feature', { 'new.txt': 'feature\n' }); }
      f = ciFailureFixture;
    } else { f = fixture(`E-${failure}`); branch(f, 'source-feature', { 'new.txt': 'feature\n' }); }
    prepare(f);
    if (ciFailure) writeFileSync(join(f.home, 'fail-gate'), failure); else writeFileSync(join(f.home, `fail-${failure}`), 'fail\n');
    const r = await run(f, ciFailureRunId && ciFailure ? { resume: ciFailureRunId } : {});
    if (ciFailure) ciFailureRunId = r.runId;
    incomplete(r); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
    if (calls18.includes(failure)) assert.deepEqual(trace(f).filter(line => line.startsWith('ci|')).map(line => line.split('|')[1]), calls18.slice(0, calls18.indexOf(failure) + 1));
    if (failure === 'scanner') assert.ok(trace(f).some(line => line === 'staged-scan|staged'), 'injected scanner boundary actually exercised');
    if (failure === 'precommit') assert.ok(trace(f).some(line => line.startsWith('pre-commit|')), 'ordinary rejecting precommit actually exercised');
    if (failure === 'prepush') {
      const stream = trace(f).find(line => line.startsWith('pre-push|') && line.split('|')[3] === 'refs/heads/main'); assert.ok(stream, 'ordinary rejecting prepush actually exercised');
      assert.match(stream.split('|')[1], /^(?:refs\/|HEAD$)/, 'injected prepush rejection must not hide raw-SHA protocol bug');
      assert.equal(stream.split('|')[2], git(r.integrationWorktree, 'rev-parse', 'HEAD')); assert.equal(trace(f).filter(line => line.startsWith('ci|')).length, 18);
    }
    if (failure === 'scanner' || failure === 'precommit') assert.equal(trace(f).some(line => line.startsWith('ci|') || line.includes('|refs/heads/main|')), false);
    assert.equal(trace(f).includes('FORBIDDEN-CODEX'), false);
  });
  for (const mode of ['unknown-policy', 'linear-only', 'denied-push']) await scenario(`E-policy-${mode}`, ['010', '012', '013'], async () => {
    const f = fixture(`E-policy-${mode}`); branch(f, 'feature', { 'new.txt': 'feature\n' }); prepare(f);
    const policy = () => mode === 'unknown-policy' ? { protected: false } : { ...unprotected(), protected: mode === 'linear-only', linearHistory: mode === 'linear-only', canPush: mode !== 'denied-push' };
    const r = await run(f, {}, policy); incomplete(r); reached(f, 'discoverPolicy'); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
  });

  await scenario('F-independent-tree-identical-squash-is-not-source-ancestry', [], async () => {
    const f = fixture('F-squash-oracle'); const source = branch(f, 'source', { 's.txt': 'source\n' });
    git(f.repo, 'merge', '--squash', source.oid); commit(f.repo, 'tree equal squash', ['s.txt']); git(f.repo, 'push', 'origin', 'HEAD:refs/heads/main');
    assert.equal(git(f.repo, 'rev-parse', 'HEAD^{tree}'), git(f.repo, 'rev-parse', `${source.oid}^{tree}`));
    assert.throws(() => ancestor(f, source.oid), /not ancestor/); // Oracle integrity only, not engine PASS.
  });
  await scenario('F-forged-ledger-ack-never-substitutes-real-main', ['008', '011', '012', '013'], async () => {
    const f = fixture('F-forged'); branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f); const r = await run(f, {}, () => ({ protected: false })); incomplete(r); assert.equal(remoteMain(f), f.base);
    const envelope = state(r), candidate = git(r.integrationWorktree, 'rev-parse', 'HEAD');
    envelope.data.publication = { mode: 'ordinary-main-fast-forward', beforeOid: f.base, afterOid: candidate };
    envelope.data.mainProof = { oid: candidate, tree: git(r.integrationWorktree, 'rev-parse', 'HEAD^{tree}'), candidateOid: candidate, verified: true };
    envelope.digest = sha(JSON.stringify(envelope.data)); privateJSON(r.statePath, envelope);
    const next = await run(f, { cleanup: r.runId }); incomplete(next); assert.equal(remoteMain(f), f.base); assertNoCleanup(f); assertOriginals(f);
  });
  await scenario('F-missing-origin-main-never-local-success', ['002', '010', '011', '012', '013'], async () => {
    const f = fixture('F-missing-main'); branch(f, 'source', { 'source.txt': 'source\n' });
    const client = join(f.home, 'main-deletion-client'); git(f.home, 'clone', '-q', '-b', 'main', f.origin, client); git(client, 'push', 'origin', ':refs/heads/main'); prepare(f);
    const r = await run(f); incomplete(r); assert.equal(remoteMain(f), null); assertNoCleanup(f); assertOriginals(f);
  });
  await scenario('G-late-source-after-real-push-no-cleanup', ['005', '011', '012', '013'], async () => {
    const f = fixture('G-postpush-arrival'); const a = branch(f, 'A', { 'a.txt': 'A\n' }); const b = branch(f, 'B', { 'b.txt': 'B\n' }); prepare(f);
    const realGit = command(f.home, 'which', ['git']).stdout.trim();
    executable(join(f.bin, 'git'), `#!/usr/bin/env bash\nset -euo pipefail\n'${realGit}' "$@"\nif [[ " $* " == *" push origin "*":refs/heads/main "* ]]; then printf 'late actual source\\n' > '${join(a.path, 'late.txt')}'; fi\n`);
    const r = await run(f); incomplete(r); ancestor(f, a.oid); ancestor(f, b.oid); assertNoCleanup(f); assert.equal(readFileSync(join(a.path, 'late.txt'), 'utf8'), 'late actual source\n');
    assert.deepEqual(r.cleanupActions, [], 'postpush source drift blocks EVERY cleanup');
  });

  await scenario('G-dirty-untracked-at-publication-blocks-global-cleanup', ['005', '011', '012'], async () => {
    const f = fixture('G-arrival'); const source = branch(f, 'feature', { 'new.txt': 'feature\n' }); prepare(f);
    const r = await run(f, {}, () => { file(source.path, 'late-untracked.txt', 'late source\n'); return unprotected(); });
    incomplete(r); reached(f, 'discoverPolicy'); assertNoCleanup(f); assert.equal(remoteMain(f), f.base); assert.ok(existsSync(join(source.path, 'late-untracked.txt')));
  });

  await scenario('B-admin-unmerged-index-originals-preserved', ['003', '004', '012'], async () => {
    const f = fixture('B-unmerged'); const source = branch(f, 'one', { 'feature.txt': 'one\n' }); const other = branch(f, 'two', { 'feature.txt': 'two\n' });
    const conflict = command(source.path, 'git', ['merge', '--no-commit', other.oid]); assert.notEqual(conflict.status, 0);
    source.before = snapshot(source.path); const entries = git(source.path, 'ls-files', '--stage', '--', 'feature.txt'); assert.match(entries, / 1\tfeature.txt/); assert.match(entries, / 2\tfeature.txt/); assert.match(entries, / 3\tfeature.txt/);
    prepare(f); const r = await run(f); incomplete(r); assertOriginals(f); assertNoCleanup(f); assert.equal(remoteMain(f), f.base);
    const row = r.inventory.worktrees.find(w => w.path === source.path); assert.deepEqual(row.index.filter(e => e.path === 'feature.txt').map(e => e.stage), [1, 2, 3]);
  });
  await scenario('B-uninitialized-submodule-blocks', ['003', '004', '012'], async () => {
    const f = fixture('B-submodule'); const source = branch(f, 'submodule-source', { 'source.txt': 'source\n' });
    const sub = join(f.home, 'sub'); mkdirSync(sub); git(sub, 'init', '-q', '-b', 'main'); file(sub, 'nested.txt', 'nested\n'); const subOid = commit(sub, 'nested', ['nested.txt']);
    // Fixture-only gitlink creation; no submodule clone/protocol override/network.
    git(source.path, 'update-index', '--add', '--cacheinfo', `160000,${subOid},nested`); git(source.path, 'commit', '-qm', 'uninitialized gitlink'); source.oid = git(source.path, 'rev-parse', 'HEAD'); source.before = snapshot(source.path); prepare(f);
    const r = await run(f); incomplete(r); assertOriginals(f); assertNoCleanup(f); assert.equal(remoteMain(f), f.base);
    const row = r.inventory.worktrees.find(w => w.path === source.path);
    assert.ok(row.index.some(e => e.path === 'nested' && e.mode === '160000'));
    assert.ok(row.blockers.length, 'uninitialized gitlink produces source blocker; kind spelling is not the oracle');
  });
  await scenario('B-special-untracked-file-blocks-no-hang', ['003', '004', '012'], async () => {
    const f = fixture('B-special'); const source = branch(f, 'source', { 'source.txt': 'source\n' });
    const fifo = command(source.path, 'mkfifo', ['pipe']); assert.equal(fifo.status, 0, fifo.stderr); prepare(f);
    const r = await run(f); incomplete(r); assertNoCleanup(f); assert.equal(remoteMain(f), f.base); assert.ok(existsSync(join(source.path, 'pipe')));
    assert.ok(r.inventory.worktrees.find(w => w.path === source.path).blockers.length);
    assert.ok(r.blockers.some(b => b.kind === 'special-file' && b.sourceId === `worktree:${source.path}` && b.paths.includes('pipe')), 'exact FIFO blocker; unrelated early errors cannot pass');
  });
  await scenario('C-wrong-parent-and-stale-receipt-blocks', ['007', '008', '012'], async () => {
    const f = fixture('C-stale-parent'); branch(f, 'A', { 'feature.txt': 'A\n' }); branch(f, 'B', { 'feature.txt': 'B\n' }); prepare(f);
    const r = await run(f); assert.equal(r.code, 3, JSON.stringify(r)); const p = r.pendingConflict, dir = dirname(r.statePath);
    file(r.integrationWorktree, 'feature.txt', 'resolved\n'); git(r.integrationWorktree, 'add', '--', 'feature.txt');
    const note = 'fixture evidence\n'; writeFileSync(join(dir, 'receipt-evidence.txt'), note); chmodSync(join(dir, 'receipt-evidence.txt'), 0o600);
    privateJSON(join(dir, 'conflict-approval.json'), { schema: 1, runId: r.runId, packetDigest: '0'.repeat(64), beforeOid: p.beforeOid, sourceOid: p.sourceOid, ...resolutionBinding(r.integrationWorktree),
      decisions: [{ path: 'feature.txt', decision: 'fixture', evidenceFiles: [{ relativePath: 'receipt-evidence.txt', sha256: sha(note) }] }], reviewer: { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' } });
    const stale = await run(f, { resume: r.runId }); incomplete(stale); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
    const mergeHeadPath = resolve(r.integrationWorktree, git(r.integrationWorktree, 'rev-parse', '--git-path', 'MERGE_HEAD'));
    writeFileSync(mergeHeadPath, `${f.base}\n`); const wrong = await run(f, { resume: r.runId }); incomplete(wrong); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
  });
  for (const mode of ['new-ref', 'new-worktree', 'new-stash', 'staged-index']) await scenario(`D-policy-boundary-${mode}`, ['002', '003', '005', '012'], async () => {
    const f = fixture(`D-${mode}`); const source = branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f);
    const r = await run(f, {}, () => {
      if (mode === 'new-ref') git(f.repo, 'branch', 'new-source-after-freeze', f.base);
      if (mode === 'new-worktree') git(f.repo, 'worktree', 'add', '-q', '-b', 'late-worktree', join(f.home, 'late-worktree'), f.base);
      if (mode === 'new-stash') { file(source.path, 'source.txt', 'stash arrived\n'); git(source.path, 'stash', 'push', '-m', 'late stash'); }
      if (mode === 'staged-index') { file(source.path, 'source.txt', 'late stage\n'); git(source.path, 'add', '--', 'source.txt'); }
      return unprotected();
    }); incomplete(r); reached(f, 'discoverPolicy'); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
  });
  await scenario('D-process-crash-lock-owner-resolution-and-resume', ['005', '008', '012'], async () => {
    const f = fixture('D-crash'); const source = branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f);
    const review = await run(f, {}, unprotected, false); incomplete(review); approveFixtureContent(f, review);
    const runner = join(f.home, 'crash-runner.mjs');
    file(f.home, 'crash-runner.mjs', `import {runMergeAll} from ${JSON.stringify(pathToFileURL(enginePath).href)};\nconst r=await runMergeAll({cwd:${JSON.stringify(f.repo)},minutes:0,resume:${JSON.stringify(review.runId)},adapters:{github:{discoverPolicy:async()=>process.exit(91)}}});console.log(JSON.stringify(r));process.exitCode=r.code;\n`);
    const crashed = command(f.home, process.execPath, [runner], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}` } });
    writeFileSync(join(f.home, 'crash-command.json'), JSON.stringify(crashed, null, 2));
    assert.equal(crashed.status, 91, `${crashed.stdout} ${crashed.stderr}`);
    const store = join(f.repo, '.git', 'loop-merge-push'); const runDirs = readdirSync(store).filter(name => existsSync(join(store, name, 'state.json'))); assert.equal(runDirs.length, 1);
    const runId = runDirs[0]; const blocked = await run(f, { resume: runId }); incomplete(blocked); assertNoCleanup(f); assert.equal(remoteMain(f), f.base);
    // Explicit fixture OWNER handling only; engine may not silently remove a stale mutex.
    const lock = join(store, 'active.lock'); assert.ok(existsSync(lock), 'crash preserves owner mutex'); rmSync(lock);
    const before = git(f.repo, 'rev-list', '--count', '--all'); const resumed = await run(f, { resume: runId }); assert.equal(resumed.code, 0, JSON.stringify(resumed)); ancestor(f, source.oid);
    const after = git(f.repo, 'rev-list', '--count', '--all'); assert.equal(after, before, 'no duplicate merge commits on resume');
  });
  await scenario('E-content-review-required-invalid-stale-and-positive-bound-receipt', ['006', '009', '010', '011', '013'], async () => {
    const f = fixture('E-content-receipts'); const source = branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f);
    const first = await run(f, {}, unprotected, false); incomplete(first); assert.ok(first.blockers.some(b => b.kind === 'content-review')); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
    assert.equal(trace(f).some(line => line.startsWith('ci|') || line.includes('|refs/heads/main|')), false);
    const dir = dirname(first.statePath), packet = JSON.parse(readFileSync(join(dir, 'content-packet.json'), 'utf8'));
    const note = 'deliberately invalid fixture receipt\n'; writeFileSync(join(dir, 'invalid-review.txt'), note); chmodSync(join(dir, 'invalid-review.txt'), 0o600);
    const receipt = { ...packet, decision: 'approve-all-reviewed-contributions', reviewer: { provider: 'openai-codex', model: 'gpt-6.1-sol', role: 'parent' }, evidenceFiles: [{ relativePath: 'invalid-review.txt', sha256: sha(note) }] };
    privateJSON(join(dir, 'content-approval.json'), { ...receipt, contributions: [] });
    const invalid = await run(f, { resume: first.runId }, unprotected, false); incomplete(invalid); assert.equal(remoteMain(f), f.base);
    privateJSON(join(dir, 'content-approval.json'), { ...receipt, candidateOid: f.base });
    const stale = await run(f, { resume: first.runId }, unprotected, false); incomplete(stale); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
    approveFixtureContent(f, first); const accepted = await run(f, { resume: first.runId }, unprotected, false); assert.equal(accepted.code, 0, JSON.stringify(accepted)); ancestor(f, source.oid); assert18(f);
  });
  await scenario('E-content-receipt-bound-candidate-mutation', ['005', '008', '009', '012'], async () => {
    const f = fixture('E-content-mutation'); branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f); const r = await run(f, {}, unprotected, false); incomplete(r); approveFixtureContent(f, r);
    file(r.integrationWorktree, 'source.txt', 'unreviewed candidate changed\n'); commit(r.integrationWorktree, 'fixture unauthorized candidate mutation', ['source.txt']); prepare(f);
    const next = await run(f, { resume: r.runId }, unprotected, false); incomplete(next); assert.equal(remoteMain(f), f.base); assertNoCleanup(f); assertOriginals(f);
    assert.equal(trace(f).some(line => line.startsWith('ci|') || line.includes('|refs/heads/main|')), false);
  });
  await scenario('E-explicit-optional-review-not-unset-or-unmatched-launched', ['009', '013'], async () => {
    const f = fixture('E-explicit-review'); branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f);
    process.env.SECURITY_COMMIT_AGENT_REVIEW = '1';
    let r;
    try { r = await run(f); assert.equal(process.env.SECURITY_COMMIT_AGENT_REVIEW, '1'); }
    finally { delete process.env.SECURITY_COMMIT_AGENT_REVIEW; }
    incomplete(r); assert.ok(r.blockers.some(b => b.kind === 'optional-review-identity')); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f); assert.equal(trace(f).includes('FORBIDDEN-CODEX'), false);
  });
  await scenario('E-policy-critical-source-requires-review-not-auto-adoption', ['006', '009', '010', '012'], async () => {
    const f = fixture('E-policy-source'); const source = branch(f, 'weak-gate', { 'scripts/local-ci.sh': '#!/usr/bin/env bash\nexit 0\n' }); prepare(f);
    const r = await run(f); incomplete(r); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
    assert.equal(trace(f).some(line => line.startsWith('ci|') || line.includes('|refs/heads/main|')), false);
    assert.ok(existsSync(join(dirname(r.statePath), 'policy-packet.json')), 'review packet for policy-critical source');
    assert.ok(censusIds(r).get('refs/heads/weak-gate') === source.oid);
  });
  for (const mode of ['missing', 'failed', 'stale', 'wrong-app', 'billing-no-start', 'denied-merge']) await scenario(`E-protected-required-check-${mode}`, ['009', '010', '012', '013'], async () => {
    const f = fixture(`E-protected-${mode}`); branch(f, 'feature', { 'new.txt': 'feature\n' }); prepare(f);
    const requirements = ['Build and security review (Node 22.20.0)', 'Build and security review (Node 24.x)', 'CodeQL', 'GitHub Actions security'].map(context => ({ context, appId: 15368 }));
    let pr, mergeCalls = 0;
    const backend = { github: {
      discoverPolicy: async () => ({ ...unprotected(), protected: true, strict: true, requiredChecks: requirements }),
      ensurePullRequest: async ({ headOid, baseOid }) => { pr = { number: 7, headOid, baseOid, merged: false, mergeOid: null, approvals: 0, checks: requirements.map(q => ({ ...q, headOid, status: 'completed', conclusion: 'success' })) }; return pr; },
      inspectPullRequest: async () => { const q = { ...pr, checks: pr.checks.map(c => ({ ...c })) }; if (mode === 'missing') q.checks.pop(); if (mode === 'failed' || mode === 'billing-no-start') q.checks[0].conclusion = 'failure'; if (mode === 'stale') q.checks[0].headOid = f.base; if (mode === 'wrong-app') q.checks[0].appId = 999; return q; },
      mergePullRequest: async () => { mergeCalls++; throw new Error('fixture ordinary protected merge denied'); },
    } };
    const r = await run(f, { adapters: backend }); incomplete(r); reached(f, 'discoverPolicy'); reached(f, 'ensurePullRequest'); reached(f, 'inspectPullRequest'); assert.equal(remoteMain(f), f.base); assertNoCleanup(f);
    if (mode !== 'denied-merge') assert.equal(mergeCalls, 0, 'invalid checks cannot attempt protected merge');
    else assert.equal(mergeCalls, 1, 'denied merge boundary actually exercised');
  });
  await scenario('E-unprotected-policy-recheck-change-blocked', ['009', '010', '012', '013'], async () => {
    const f = fixture('E-policy-recheck'); branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f); let discoveries = 0;
    const r = await run(f, {}, () => { discoveries++; return discoveries === 1 ? unprotected() : { ...unprotected(), protected: true, linearHistory: true }; });
    incomplete(r); assert.ok(discoveries >= 2, 'unprotected push requires fresh second policy read'); assert.equal(remoteMain(f), f.base); assertNoCleanup(f); assertOriginals(f);
    assert.equal(trace(f).some(line => line.includes('|refs/heads/main|')), false);
  });
  await scenario('E-external-driver-blocked-before-preview', ['006', '009', '012', '013'], async () => {
    const f = fixture('E-external-driver'); file(f.repo, '.gitattributes', 'feature.txt merge=fixture\n'); commit(f.repo, 'fixture baseline attributes', ['.gitattributes']); git(f.repo, 'push', 'origin', 'main'); f.base = git(f.repo, 'rev-parse', 'HEAD');
    const a = branch(f, 'A', { 'feature.txt': 'A\n' }); const b = branch(f, 'B', { 'feature.txt': 'B\n' });
    const marker = join(f.home, 'driver-executed'); const driver = join(f.home, 'external-driver'); executable(driver, `#!/usr/bin/env bash\nprintf 'executed\\n' > '${marker}'\nexit 1\n`);
    git(f.repo, 'config', 'merge.fixture.driver', `${driver} %O %A %B`); // OWN fixture configuration only.
    prepare(f); const r = await run(f, {}, unprotected, false); incomplete(r); assert.ok(r.blockers.some(x => x.kind === 'git-execution-review')); assert.equal(existsSync(marker), false, 'review must precede Git preview/driver execution'); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
    // Prove the configured fixture driver is real/reachable, AFTER observing the
    // engine's nonexecution. This command is intentionally local fixture-only.
    command(f.repo, 'git', ['merge-tree', '--write-tree', a.oid, b.oid]); assert.ok(existsSync(marker), 'driver witness is executable by ordinary Git');
  });
  await scenario('E-fsmonitor-not-executed-by-unreviewed-dry-run', ['001', '006', '009', '013'], async () => {
    const f = fixture('E-fsmonitor'); branch(f, 'source', { 'source.txt': 'source\n' });
    const marker = join(f.home, 'fsmonitor-executed'), monitor = join(f.home, 'fixture-fsmonitor'); executable(monitor, `#!/usr/bin/env bash\nprintf 'executed\\n' > '${marker}'\nprintf 'fixture-token\\0'\n`);
    git(f.repo, 'config', 'core.fsmonitor', monitor); prepare(f); // OWN fixture config, no production/global settings.
    const r = await run(f, { dryRun: true }, unprotected, false); assert.equal(r.complete, false);
    assert.equal(existsSync(marker), false, 'metadata dry-run must not execute unreviewed configured fsmonitor via Git status');
    assert.equal(existsSync(join(f.repo, '.git/loop-merge-push')), false, 'dry-run no state'); assertNoCleanup(f); assert.equal(remoteMain(f), f.base);
  });
  await scenario('F-protected-history-preserving-real-main-publication', ['006', '009', '010', '011', '012', '013'], async () => {
    const f = fixture('F-protected-success'); const a = branch(f, 'A', { 'a.txt': 'A\n' }); const b = branch(f, 'B', { 'b.txt': 'B\n' }); prepare(f); let pr;
    const backend = { github: {
      discoverPolicy: async () => ({ ...unprotected(), protected: true, strict: true, requiredChecks: [{ context: 'fixture-authentic-check', appId: 15368 }] }),
      ensurePullRequest: async ({ headRef, headOid, baseOid }) => { pr = { number: 8, headRef, headOid, baseOid, merged: false, mergeOid: null, approvals: 0, checks: [{ context: 'fixture-authentic-check', appId: 15368, headOid, status: 'completed', conclusion: 'success' }] }; return pr; },
      inspectPullRequest: async () => pr,
      mergePullRequest: async ({ headOid }) => { assert.equal(git(f.repo, 'rev-parse', pr.headRef), headOid); git(f.repo, 'push', 'origin', `${pr.headRef}:refs/heads/main`); pr = { ...pr, merged: true, mergeOid: headOid }; return pr; },
    } };
    const r = await run(f, { adapters: backend }); assert.equal(r.code, 0, JSON.stringify(r)); ancestor(f, a.oid); ancestor(f, b.oid); assert.equal(remoteBlob(f, 'a.txt'), 'A'); assert.equal(remoteBlob(f, 'b.txt'), 'B'); assert18(f);
  });
  await scenario('F-actual-postreceive-main-tree-advance-blocks-cleanup', ['005', '008', '011', '012'], async () => {
    const f = fixture('F-main-advance'); branch(f, 'source', { 'source.txt': 'source\n' });
    const writer = join(f.home, 'remote-writer'); git(f.home, 'clone', '-q', '-b', 'main', f.origin, writer);
    const guard = join(f.home, 'postreceive-once');
    executable(join(f.origin, 'hooks/post-receive'), `#!/usr/bin/env bash\nset -euo pipefail\n[[ ! -e '${guard}' ]] || exit 0\ntouch '${guard}'\nunset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE\ngit -C '${writer}' fetch -q origin\ngit -C '${writer}' merge --ff-only origin/main\nprintf 'new remote main bytes\\n' > '${join(writer, 'late-main.txt')}'\ngit -C '${writer}' add -- late-main.txt\ngit -C '${writer}' commit -qm 'ordinary concurrent main advancement'\ngit -C '${writer}' push -q origin HEAD:refs/heads/main\n`);
    prepare(f); const r = await run(f); incomplete(r); assertNoCleanup(f); assert.ok(existsSync(guard)); assert.equal(remoteBlob(f, 'late-main.txt'), 'new remote main bytes'); assertOriginals(f);
    if (r.runId) { const next = await run(f, { cleanup: r.runId }); incomplete(next); assertNoCleanup(f); }
  });
  for (const boundary of ['pre-merge-intent', 'reached-merge', 'merge-commit', 'main-push', 'worktree-remove', 'branch-delete']) await scenario(`D-real-operation-crash-after-${boundary}-before-ledger`, ['005', '008', '011', '012'], async () => {
    const f = fixture(`D-operation-${boundary}`); const a = branch(f, 'A', { 'a.txt': 'A\n' }); const b = branch(f, 'B', { 'b.txt': 'B\n' }); prepare(f);
    let review;
    if (['main-push', 'worktree-remove', 'branch-delete'].includes(boundary)) { review = await run(f, {}, unprotected, false); incomplete(review); approveFixtureContent(f, review); }
    const realGit = command(f.home, 'which', ['git']).stdout.trim(); assert.ok(realGit.startsWith('/'));
    const once = join(f.home, 'crashed-once');
    const match = ['pre-merge-intent', 'reached-merge'].includes(boundary) ? '[[ " $* " == *" merge --no-ff --no-commit "* ]]' : boundary === 'merge-commit' ? '[[ " $* " == *" commit -m Merge frozen source "* ]]' : boundary === 'main-push' ? '[[ " $* " == *" push origin "*":refs/heads/main "* ]]' : boundary === 'branch-delete' ? '[[ " $* " == *" branch -d "* ]]' : '[[ " $* " == *" worktree remove "* ]]';
    const crash = `if [[ ! -e '${once}' ]] && ${match}; then touch '${once}'; kill -KILL "$PPID"; exit 97; fi\n`;
    executable(join(f.bin, 'git'), `#!/usr/bin/env bash\nset -euo pipefail\n${boundary === 'pre-merge-intent' ? crash : ''}'${realGit}' "$@"\n${boundary === 'pre-merge-intent' ? '' : crash}`);
    const helper = join(f.home, 'operation-crash.mjs');
    file(f.home, 'operation-crash.mjs', `import {runMergeAll} from ${JSON.stringify(pathToFileURL(enginePath).href)};\nconst result=await runMergeAll({cwd:${JSON.stringify(f.repo)},minutes:0,${review ? `resume:${JSON.stringify(review.runId)},` : ''}adapters:{github:{discoverPolicy:async()=>(${JSON.stringify(unprotected())})}}});console.log(JSON.stringify(result));process.exitCode=result.code;\n`);
    const crashed = command(f.home, process.execPath, [helper], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}` }, timeout: 180_000 });
    assert.equal(crashed.signal, 'SIGKILL', `${crashed.status}: ${crashed.stdout} ${crashed.stderr}`); assert.ok(existsSync(once));
    const store = join(f.repo, '.git', 'loop-merge-push'); const ids = readdirSync(store).filter(name => existsSync(join(store, name, 'state.json'))); assert.equal(ids.length, 1); const id = ids[0];
    const ledger = JSON.parse(readFileSync(join(store, id, 'state.json'), 'utf8')); assert.ok(ledger.data.intent, 'durable intent precedes real operation');
    const intent = ledger.data.intent, derived = ledger.data.integrationWorktree;
    if (boundary === 'pre-merge-intent') { assert.equal(intent.kind, 'normal-merge'); assert.notEqual(command(derived, 'git', ['rev-parse', '--verify', 'MERGE_HEAD']).status, 0); assert.equal(git(derived, 'rev-parse', 'HEAD'), intent.beforeOid); }
    if (boundary === 'reached-merge') { assert.equal(intent.kind, 'normal-merge'); assert.equal(git(derived, 'rev-parse', 'MERGE_HEAD'), intent.sourceOid); assert.equal(git(derived, 'rev-parse', 'HEAD'), intent.beforeOid); }
    if (boundary === 'merge-commit') { assert.equal(intent.kind, 'merge-commit'); const parents = git(derived, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ').slice(1); assert.deepEqual(parents, [intent.beforeOid, intent.sourceOid]); assert.equal(git(derived, 'rev-parse', 'HEAD^{tree}'), intent.treeOid); }
    if (boundary === 'main-push') { assert.equal(intent.kind, 'main-push'); assert.equal(remoteMain(f), intent.afterOid); }
    if (boundary === 'worktree-remove') { assert.equal(intent.kind, 'worktree-remove'); assert.equal(existsSync(intent.path), false); }
    if (boundary === 'branch-delete') { assert.equal(intent.kind, 'branch-delete'); assert.notEqual(command(f.repo, 'git', ['show-ref', '--verify', intent.ref]).status, 0); }
    if (['pre-merge-intent', 'reached-merge', 'merge-commit'].includes(boundary)) assert.equal(remoteMain(f), f.base); else { ancestor(f, a.oid); ancestor(f, b.oid); }
    const beforeCount = git(f.repo, 'rev-list', '--count', '--all');
    const blocked = await run(f, { resume: id }); incomplete(blocked); assert.ok(existsSync(join(store, 'active.lock')));
    rmSync(join(store, 'active.lock')); // Explicit fixture-owner stale-lock resolution.
    const resumed = await run(f, { resume: id }); assert.equal(resumed.code, 0, JSON.stringify(resumed)); ancestor(f, a.oid); ancestor(f, b.oid);
    if (['main-push', 'worktree-remove', 'branch-delete'].includes(boundary)) assert.equal(git(f.repo, 'rev-list', '--count', '--all'), beforeCount, 'publication/cleanup replay creates no commits');
    assert.equal(git(f.repo, 'log', '--all', '--format=%s').split('\n').filter(s => s.startsWith('Merge frozen source ')).length, 2, 'exactly two merge commits, no duplication');
    assert.equal(existsSync(a.path), false); assert.equal(existsSync(b.path), false);
  });
  await scenario('D-protected-merge-crash-before-ledger', ['008', '009', '010', '011', '012'], async () => {
    const f = fixture('D-protected-crash'); const source = branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f);
    const review = await run(f, {}, unprotected, false); incomplete(review); approveFixtureContent(f, review);
    const policy = { ...unprotected(), protected: true, strict: true }, marker = join(f.home, 'protected-merged');
    const helper = join(f.home, 'protected-crash.mjs');
    file(f.home, 'protected-crash.mjs', `import {runMergeAll} from ${JSON.stringify(pathToFileURL(enginePath).href)};import {spawnSync} from 'node:child_process';import {writeFileSync} from 'node:fs';\nconst cwd=${JSON.stringify(f.repo)},ref=${JSON.stringify(review.integrationRef)},base=${JSON.stringify(f.base)};const g=args=>{const r=spawnSync('git',args,{cwd,encoding:'utf8',env:process.env});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};\nconst pr=head=>({number:99,headOid:head,baseOid:base,merged:g(['ls-remote','origin','refs/heads/main']).split(/\\s+/)[0]===head,mergeOid:head,checks:[],approvals:0});\nconst result=await runMergeAll({cwd,minutes:0,resume:${JSON.stringify(review.runId)},adapters:{github:{discoverPolicy:async()=>(${JSON.stringify(policy)}),ensurePullRequest:async({headOid})=>pr(headOid),inspectPullRequest:async({headOid})=>pr(headOid),mergePullRequest:async({headOid})=>{if(g(['rev-parse',ref])!==headOid)throw Error('wrong named ref');g(['push','origin',ref+':refs/heads/main']);writeFileSync(${JSON.stringify(marker)},headOid);process.exit(92);}}}});console.log(JSON.stringify(result));process.exitCode=result.code;\n`);
    const crashed = command(f.home, process.execPath, [helper], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}` }, timeout: 180_000 }); writeFileSync(join(f.home, 'crash-command.json'), JSON.stringify(crashed, null, 2)); assert.equal(crashed.status, 92, `${crashed.stdout} ${crashed.stderr}`);
    assert.ok(existsSync(marker)); ancestor(f, source.oid); assertNoCleanup(f);
    const envelope = state(review); assert.equal(envelope.data.intent?.kind, 'pr-merge', 'PR merge has durable exact-head/base intent before remote operation');
    const lock = join(f.repo, '.git/loop-merge-push/active.lock'); assert.ok(existsSync(lock)); rmSync(lock); // fixture OWNER resolution.
    const backend = { github: { discoverPolicy: async () => policy, ensurePullRequest: async () => { throw Error('duplicate PR'); }, inspectPullRequest: async ({ headOid }) => ({ number: 99, headOid, baseOid: f.base, merged: remoteMain(f) === headOid, mergeOid: remoteMain(f), checks: [], approvals: 0 }), mergePullRequest: async () => { throw Error('duplicate already performed PR merge'); } } };
    const resumed = await run(f, { resume: review.runId, adapters: backend }); assert.equal(resumed.code, 0, JSON.stringify(resumed)); ancestor(f, source.oid); assert.equal(resumed.complete, true);
  });

  for (const mode of ['outdated', 'dismissed', 'current']) await scenario(`E-production-review-current-head-${mode}`, ['009', '010', '011', '012'], async () => {
    const f = fixture(`E-raw-reviews-${mode}`); const source = branch(f, 'source', { 'source.txt': 'source\n' }); prepare(f); const review = await run(f, {}, unprotected, false); incomplete(review); approveFixtureContent(f, review);
    const calls = join(f.home, 'gh-calls.jsonl');
    executable(join(f.bin, 'gh'), `#!/usr/bin/env node\nimport {appendFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';\nconst args=process.argv.slice(2),cwd=${JSON.stringify(f.repo)},ref=${JSON.stringify(review.integrationRef)},base=${JSON.stringify(f.base)},mode=${JSON.stringify(mode)};appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');\nconst g=a=>{const r=spawnSync('git',a,{cwd,encoding:'utf8',env:process.env});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};const head=g(['rev-parse',ref]),main=g(['ls-remote','origin','refs/heads/main']).split(/\\s+/)[0];let value;\nif(args[0]==='repo')value={nameWithOwner:'fixture/reviews'};\nelse if(args[0]==='pr'&&args[1]==='list')value=[{number:19,headRefOid:head}];\nelse if(args[0]==='pr'&&args[1]==='merge'){g(['push','origin',ref+':refs/heads/main']);value={};}\nelse if(args[0]==='api'){const ep=args[1].replace('repos/fixture/reviews/','');if(ep==='')value={allow_merge_commit:true,permissions:{push:true}};else if(ep==='branches/main/protection')value={required_linear_history:{enabled:false},required_status_checks:{strict:true,checks:[{context:'fixture-success',app_id:15368}]},required_pull_request_reviews:{required_approving_review_count:1}};else if(ep==='rules/branches/main')value=[];else if(ep==='pulls/19')value={head:{sha:head},base:{sha:base},merged:main===head,merge_commit_sha:main===head?head:null};else if(ep.includes('/check-runs?'))value={total_count:1,check_runs:[{name:'fixture-success',app:{id:15368},head_sha:head,status:'completed',conclusion:'success'}]};else if(ep.includes('/status?'))value={total_count:0,statuses:[]};else if(ep.includes('/reviews?'))value=mode==='outdated'?[{id:1,user:{id:1},state:'APPROVED',commit_id:base}]:mode==='dismissed'?[{id:1,user:{id:1},state:'APPROVED',commit_id:head},{id:2,user:{id:1},state:'DISMISSED',commit_id:head}]:[{id:1,user:{id:1},state:'APPROVED',commit_id:head}];else throw Error('unexpected readonly endpoint '+ep);}\nelse throw Error('unexpected gh operation '+JSON.stringify(args));console.log(JSON.stringify(value));\n`);
    const r = command(f.repo, process.execPath, [enginePath, '0', '--resume', review.runId], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}` }, timeout: 180_000 }); writeFileSync(join(f.home, 'cli-result.json'), JSON.stringify(r, null, 2));
    const ghCalls = readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse); assert.ok(ghCalls.some(a => a[0] === 'api' && a[1].includes('/reviews?')), 'production raw review computation really exercised');
    if (mode === 'current') { assert.equal(r.status, 0, `${r.stdout} ${r.stderr}`); ancestor(f, source.oid); assert18(f); }
    else { assert.notEqual(r.status, 0, r.stdout); assert.equal(remoteMain(f), f.base); assertNoCleanup(f); assert.equal(ghCalls.some(a => a[0] === 'pr' && a[1] === 'merge'), false, 'outdated/dismissed cannot authorize merge'); }
  });

  await scenario('G-mid-cleanup-command-failure-and-resume', ['008', '011', '012', '013'], async () => {
    const f = fixture('G-mid-cleanup'); const a = branch(f, 'A', { 'a.txt': 'A\n' }); const b = branch(f, 'B', { 'b.txt': 'B\n' }); prepare(f);
    const realGit = command(f.home, 'which', ['git']).stdout.trim(); const marker = join(f.home, 'fail-second-remove'); writeFileSync(marker, 'reject\n');
    executable(join(f.bin, 'git'), `#!/usr/bin/env bash\nset -euo pipefail\nif [[ -e '${marker}' && " $* " == *" worktree remove ${b.path} "* ]]; then exit 86; fi\nexec '${realGit}' "$@"\n`);
    const r = await run(f); incomplete(r); ancestor(f, a.oid); ancestor(f, b.oid); assert.equal(existsSync(a.path), false); assert.equal(existsSync(b.path), true);
    rmSync(marker); const next = await run(f, { resume: r.runId }); assert.equal(next.code, 0, JSON.stringify(next)); assert.equal(existsSync(b.path), false);
    const again = await run(f, { resume: r.runId }); assert.equal(again.code, 0, JSON.stringify(again));
  });
  await scenario('G-normal-branch-delete-refusal-never-force', ['011', '012', '013'], async () => {
    const f = fixture('G-refusal'); const source = branch(f, 'source', { 'source.txt': 'source\n' });
    git(f.repo, 'branch', '--set-upstream-to=second/main', source.name); prepare(f);
    const r = await run(f); incomplete(r); ancestor(f, source.oid); assert.ok(refs(f.repo).includes('refs/heads/source'), 'ordinary -d refusal retained branch');
  });
  await scenario('H-actual-just-aliases-legacy-and-ordinary-compatibility', ['001', '013'], async () => {
    const f = fixture('H-just'); const implementationRoot = dirname(dirname(suppliedEnginePath));
    for (const p of ['justfile', 'scripts/loop-merge-push.mjs', 'scripts/loop-push.sh']) file(f.repo, p, p === 'scripts/loop-merge-push.mjs' ? engineBytes : readFileSync(join(implementationRoot, p)));
    commit(f.repo, 'fixture accepted dispatcher', ['justfile', 'scripts/loop-merge-push.mjs', 'scripts/loop-push.sh']); git(f.repo, 'push', 'origin', 'main');
    const source = branch(f, 'side-source', { 'side.txt': 'side\n' }, git(f.repo, 'rev-parse', 'HEAD')); prepare(f); const before = snapshot(f.repo), beforeRefs = refs(f.repo);
    for (const recipe of ['loop-merge-push', 'loop-push-merge']) {
      const r = command(f.repo, 'just', [recipe, '0', '--dry-run']); assert.equal(r.status, 0, `${recipe}: ${r.stderr}`); assert.match(r.stdout, /dry-run/); assert.doesNotMatch(r.stdout, /"complete"\s*:\s*true/);
    }
    const legacy = command(f.repo, 'bash', ['scripts/loop-push.sh', '0', '--merge-prune', '--dry-run']); assert.equal(legacy.status, 0, legacy.stderr); assert.match(legacy.stdout, /dry-run/);
    assert.deepEqual(snapshot(f.repo), before); assert.equal(refs(f.repo), beforeRefs); assertOriginals(f); assertNoCleanup(f); assert.deepEqual(trace(f), []);
    git(f.repo, 'checkout', '-q', '-b', 'ordinary-caller'); file(f.repo, 'ordinary.txt', 'ordinary current branch\n'); const ordinary = commit(f.repo, 'ordinary caller work', ['ordinary.txt']); const mainBefore = remoteMain(f); prepare(f);
    const plain = command(f.repo, 'just', ['loop-push', '0'], { env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}`, LOOP_PUSH_EMPTY_CHECKS: '1' } });
    assert.equal(plain.status, 0, plain.stderr); assert.equal(remoteMain(f), mainBefore); assert.equal(git(f.home, `--git-dir=${f.origin}`, 'rev-parse', 'refs/heads/ordinary-caller'), ordinary);
    assert.equal(command(f.repo, 'git', ['merge-base', '--is-ancestor', source.oid, remoteMain(f)]).status, 1, 'plain loop does not sweep sources (source object is present locally, not necessarily in bare origin)'); assertNoCleanup(f);
  });

  await scenario('H-module-dry-run-no-writes-full-source-census', ['001', '002', '004', '013'], async () => {
    const f = fixture('H-dry-run'); branch(f, 'A', { 'a.txt': 'A\n' }); const before = snapshot(f.repo), beforeRefs = refs(f.repo), registration = git(f.repo, 'worktree', 'list', '--porcelain'); prepare(f);
    const r = await run(f, { dryRun: true }); assert.equal(r.code, 0, JSON.stringify(r)); assert.equal(r.phase, 'dry-run'); assert.equal(r.complete, false); assert.equal(r.statePath, null); assert.equal(r.runId, null);
    assert.deepEqual(snapshot(f.repo), before); assert.equal(refs(f.repo), beforeRefs); assert.equal(git(f.repo, 'worktree', 'list', '--porcelain'), registration); assertOriginals(f); assertNoCleanup(f); assert.deepEqual(trace(f), []);
    assert.equal(existsSync(join(f.repo, '.git', 'loop-merge-push')), false, 'dry-run no state/mutex');
    assert.ok(censusIds(r).has('refs/heads/A'));
  });
  await scenario('H-routing-overrides-and-unsafe-private-state-block', ['001', '004', '008', '013'], async () => {
    const f = fixture('H-environment'); branch(f, 'A', { 'a.txt': 'A\n' }); const before = snapshot(f.repo), beforeRefs = refs(f.repo); prepare(f);
    const overrides = { GIT_DIR: join(f.repo, '.git'), GIT_WORK_TREE: f.repo, GIT_INDEX_FILE: join(f.repo, '.git/index'), GIT_CONFIG_COUNT: '0', GIT_CONFIG_PARAMETERS: 'fixture.key=value', GIT_OBJECT_DIRECTORY: join(f.repo, '.git/objects') };
    for (const [key, value] of Object.entries(overrides)) {
      const r = command(f.repo, process.execPath, [enginePath, '0', '--dry-run'], { env: { ...process.env, [key]: value } }); assert.equal(r.status, 2, `${key}: ${r.stdout} ${r.stderr}`);
    }
    assert.deepEqual(snapshot(f.repo), before); assert.equal(refs(f.repo), beforeRefs); assertNoCleanup(f); assert.deepEqual(trace(f), []);
    const store = join(f.repo, '.git/loop-merge-push'); mkdirSync(store, { mode: 0o755 }); const r = await run(f); incomplete(r); assert.equal(remoteMain(f), f.base); assertOriginals(f); assertNoCleanup(f);
    assert.equal(existsSync(join(store, 'active.lock')), false, 'unsafe private directory rejected before lock');
  });
  await scenario('H-detached-caller-dry-run-includes-HEAD-no-writes', ['001', '002', '013'], async () => {
    const f = fixture('H-detached'); const source = branch(f, 'source', { 'source.txt': 'source\n' }); git(f.repo, 'checkout', '--detach', '-q', source.oid); const before = snapshot(f.repo), beforeRefs = refs(f.repo); prepare(f);
    const r = await run(f, { dryRun: true }); assert.equal(r.code, 0, JSON.stringify(r)); assert.equal(r.complete, false); assert.equal(censusIds(r).get(`worktree:${f.repo}`), source.oid); assert.deepEqual(snapshot(f.repo), before); assert.equal(refs(f.repo), beforeRefs); assertNoCleanup(f);
    const bare = command(f.origin, process.execPath, [enginePath, '0', '--dry-run']); assert.notEqual(bare.status, 0);
  });

  await scenario('H-actual-CLI-invalid-and-dry-run-context', ['001', '013'], async () => {
    const f = fixture('H-cli'); const before = snapshot(f.repo), beforeRefs = refs(f.repo); prepare(f);
    for (const args of [['nope'], ['0', '--unknown'], ['0', '--state-dir', '/tmp/unsafe'], ['1441'], ['0', '--resume', 'bad/id']]) {
      const r = command(f.repo, process.execPath, [enginePath, ...args]); assert.equal(r.status, 2, `${JSON.stringify(args)}: ${r.stdout} ${r.stderr}`);
    }
    const dry = command(f.repo, process.execPath, [enginePath, '0', '--dry-run']); assert.equal(dry.status, 0, dry.stderr); assert.doesNotMatch(dry.stdout, /"complete"\s*:\s*true/); assert.match(dry.stdout, /dry-run/);
    assert.deepEqual(snapshot(f.repo), before); assert.equal(refs(f.repo), beforeRefs); assert.deepEqual(trace(f), []);
    const nonrepo = command(f.home, process.execPath, [enginePath, '0', '--dry-run']); assert.notEqual(nonrepo.status, 0);
  });
}
const requiredTargets = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(3, '0'));
const coverage = Object.fromEntries(requiredTargets.map(target => [target, { scenarios: outcomes.filter(o => o.targets.includes(target)).map(o => ({ name: o.name, passed: o.passed })), passed: outcomes.some(o => o.targets.includes(target)) && outcomes.filter(o => o.targets.includes(target)).every(o => o.passed) }]));
// Concrete acceptance obligations, resolved only by an actual PASS outcome.
// No obsolete always-failing inventory of cases already implemented.
const requiredAdvancedScenarios = [
  ['B-reviewed-large-distinct-byte-recovery', ['003', '009', '011']],
  ['C-resolution-mutation-after-receipt-before-resume', ['007', '008', '009']],
  ['D-real-operation-crash-after-pre-merge-intent-before-ledger', ['008']],
  ['D-real-operation-crash-after-reached-merge-before-ledger', ['008']],
  ['D-real-operation-crash-after-merge-commit-before-ledger', ['008']],
  ['D-real-operation-crash-after-main-push-before-ledger', ['008', '011']],
  ['D-real-operation-crash-after-worktree-remove-before-ledger', ['008', '012']],
  ['D-real-operation-crash-after-branch-delete-before-ledger', ['008', '012']],
  ['D-protected-merge-crash-before-ledger', ['008', '010', '011']],
  ['E-production-review-current-head-outdated', ['010']],
  ['E-production-review-current-head-dismissed', ['010']],
  ['E-production-review-current-head-current', ['010', '011']],
  ['E-external-driver-blocked-before-preview', ['006', '009']],
  ['E-fsmonitor-not-executed-by-unreviewed-dry-run', ['001', '006', '009']],
  ['E-unprotected-policy-recheck-change-blocked', ['010']],
  ['H-actual-just-aliases-legacy-and-ordinary-compatibility', ['001', '013']],
];
const unresolvedCoverage = requiredAdvancedScenarios.filter(([name]) => !outcomes.some(o => o.name === name && o.passed)).map(([name, targets]) => ({ name, targets, reason: outcomes.some(o => o.name === name) ? 'required scenario failed; see actual outcome/evidence' : 'required scenario not exercised' }));
for (const gap of unresolvedCoverage) for (const target of gap.targets) { coverage[target].passed = false; (coverage[target].missingEvidence ||= []).push(gap.name); }
writeFileSync(join(evidence, 'results.json'), JSON.stringify({ suppliedEnginePath, enginePath, engineDigest, testDigest, evidence, outcomes, coverage, unresolvedCoverage, note: 'Fixture passes prove behavior only; listed unresolved coverage prevents full13 acceptance.' }, null, 2));
if (outcomes.some(o => !o.passed) || unresolvedCoverage.length || !module) process.exitCode = 1;
for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
Object.assign(process.env, originalEnv);
console.log(`Independent merge-all evidence: ${evidence}`);
console.log(`Scenarios: ${outcomes.filter(o => o.passed).length} passed, ${outcomes.filter(o => !o.passed).length} failed; ${unresolvedCoverage.length} unresolved acceptance scenarios`);
