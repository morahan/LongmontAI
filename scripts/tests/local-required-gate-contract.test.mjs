import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const secret = 'PRIVATE_SCANNER_OUTPUT_DO_NOT_PERSIST';
function fixture(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'required-gate-test-'));
  const work = join(dir, 'repo');
  const bin = join(dir, 'bin');
  const log = join(dir, 'calls.jsonl');
  mkdirSync(work); mkdirSync(bin);
  function git(...args) {
    const result = spawnSync('git', args, { cwd: work, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git('init', '-q');
  cpSync(join(repo, 'scripts/lib/local-required-gate'), join(work, 'scripts/lib/local-required-gate'), { recursive: true });
  cpSync(join(repo, 'scripts/local-required-gate.sh'), join(work, 'scripts/local-required-gate.sh'));
  writeFileSync(join(work, 'scripts/security-commit-review.sh'), `#!/bin/bash\n[[ "$CI" == true && "$SECURITY_COMMIT_AUTO_FIX" == 0 && -z "\${SECURITY_COMMIT_BREAK_GLASS:-}" ]] || exit 7\necho ${secret}\nexit ${options.securityFail ? 1 : 0}\n`);
  git('add', '.');
  git('-c', 'user.name=Gate Test', '-c', 'user.email=gate@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture');
  const sha = git('rev-parse', 'HEAD');
  for (const tool of ['git', 'bash', 'tar']) {
    const found = spawnSync('/bin/sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
    symlinkSync(found, join(bin, tool));
  }
  symlinkSync(process.execPath, join(bin, 'node'));
  for (const tool of ['docker', 'codeql', 'gitleaks', 'osv-scanner', 'rg', 'zizmor']) {
    if (options.missing === tool) continue;
    writeFileSync(join(bin, tool), `#!${process.execPath}
import { appendFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(log)}, JSON.stringify({ tool: ${JSON.stringify(tool)}, args }) + '\\n');
console.log(${JSON.stringify(secret)});
if (${JSON.stringify(tool)} === 'codeql' && args[0] === 'database' && args[1] === 'analyze') {
  const output = args.find(arg => arg.startsWith('--output=')).slice(9);
  writeFileSync(output, ${JSON.stringify(options.malformedSarif ? '{}' : JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { name: 'CodeQL' } }, results: options.finding ? [{ message: { text: secret } }] : [], invocations: [{ executionSuccessful: true }] }] }))});
}
if (${JSON.stringify(options.failTool ?? '')} === ${JSON.stringify(tool)} && (args[0] === 'run' || args[0] === 'database')) process.exit(9);
`, { mode: 0o755 });
  }
  // Extensionless Node mock executables must use ESM independently of the checkout.
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  function invoke(args = ['--sha', sha]) {
    const result = spawnSync(join(bin, 'bash'), [join(work, 'scripts/local-required-gate.sh'), ...args], {
      cwd: work, encoding: 'utf8', env: { PATH: bin, HOME: dir, SECURITY_COMMIT_BREAK_GLASS: '1', SECURITY_COMMIT_AUTO_FIX: '1' },
      timeout: 60_000,
    });
    assert.equal(result.stderr, '');
    assert.ok(!result.stdout.includes(secret));
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.remoteReported, false);
    assert.deepEqual(Object.keys(evidence), ['schema', 'sha', 'status', 'gates', 'remoteReported']);
    assert.ok(!result.stdout.includes(dir));
    return { ...result, evidence };
  }
  return { work, git, sha, invoke, calls: () => readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse),
    cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
function scenario(name, options, check) {
  test(name, () => { const f = fixture(options); try { check(f); } finally { f.cleanup(); } });
}
function blocked(result, gate) {
  assert.equal(result.status, 1);
  assert.equal(result.evidence.status, 'fail');
  assert.deepEqual(result.evidence.gates.at(-1), { name: gate, status: 'fail' });
}
scenario('success: exact snapshot, both Linux lanes, scanners and CodeQL; metadata only', {}, f => {
  const result = f.invoke();
  assert.equal(result.status, 0);
  assert.equal(result.evidence.sha, f.sha);
  assert.equal(result.evidence.status, 'pass');
  const calls = f.calls();
  const containers = calls.filter(call => call.tool === 'docker' && call.args[0] === 'run');
  assert.equal(containers.length, 2);
  for (const image of ['node:22.20.0-bookworm', 'node:24-bookworm']) assert.ok(containers.some(call => call.args.includes(image)));
  for (const call of containers) {
    assert.ok(call.args.includes('--rm'));
    assert.ok(call.args.includes('--platform=linux/amd64'));
    assert.ok(!call.args.includes('-v'));
  }
  assert.ok(calls.some(call => call.tool === 'codeql' && call.args.includes('javascript-security-extended.qls')));
});
scenario('wrong SHA', {}, f => blocked(f.invoke(['--sha', '0'.repeat(40)]), 'exact-clean-attached-tree'));
for (const kind of ['tracked', 'untracked', 'staged', 'detached']) {
  scenario(`reject ${kind} tree`, {}, f => {
    if (kind === 'detached') f.git('checkout', '--detach', '-q');
    else {
      writeFileSync(join(f.work, kind === 'untracked' ? 'extra' : 'scripts/lib/local-required-gate/container.sh'), 'dirty');
      if (kind === 'staged') f.git('add', '.');
    }
    blocked(f.invoke(), 'exact-clean-attached-tree');
  });
}
for (const missing of ['docker', 'codeql', 'gitleaks', 'osv-scanner', 'rg', 'zizmor']) {
  scenario(`missing required ${missing}`, { missing }, f => blocked(f.invoke(), 'required-tools'));
}
scenario('container failure', { failTool: 'docker' }, f => blocked(f.invoke(), 'linux-node22'));
scenario('scanner failure is not bypassed by inherited environment', { securityFail: true }, f => blocked(f.invoke(), 'repository-security-review'));
scenario('CodeQL command failure', { failTool: 'codeql' }, f => blocked(f.invoke(), 'codeql-security-extended'));
scenario('CodeQL findings despite zero exit are blocking and redacted', { finding: true }, f => blocked(f.invoke(), 'codeql-security-extended'));
scenario('malformed SARIF', { malformedSarif: true }, f => blocked(f.invoke(), 'codeql-security-extended'));
for (const args of [[], ['--sha'], ['--sha', 'HEAD'], ['--sha', 'a'.repeat(40), '--skip'], ['--sha', secret], ['--help']]) {
  scenario(`malformed arguments ${JSON.stringify(args)}`, {}, f => {
    const result = f.invoke(args);
    blocked(result, 'arguments');
    assert.equal(result.evidence.sha, null);
  });
}
test('container lane retains required npm and local CI checks', () => {
  const script = readFileSync(join(repo, 'scripts/lib/local-required-gate/container.sh'), 'utf8');
  for (const command of ['npm ci --ignore-scripts', 'npm@10.9.3', 'npm run lint', 'npm run build',
    'npm run test:model-watch', 'npm run test:space-background', 'npm run security:test', 'npm run test:local-required-gate']) assert.ok(script.includes(command));
});
