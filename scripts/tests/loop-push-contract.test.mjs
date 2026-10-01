import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fixture Git must never inherit real/shared hook or identity configuration.
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.GIT_CONFIG_GLOBAL = '/dev/null';
delete process.env.SECURITY_COMMIT_AGENT_REVIEW;
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const justfile = readFileSync(resolve(root, 'justfile'), 'utf8');
const script = resolve(root, 'scripts/loop-push.sh');

function gitStatus(cwd) {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd, encoding: 'utf8' }).trim();
}

assert.match(justfile, /^loop-push minutes="2":/m);
assert.match(justfile, /^loop-merge-push minutes="2": \(loop-push-merge minutes\)/m);
const loopScript = readFileSync(script, 'utf8');
assert.match(loopScript, /commit_dirty_work\(\)/);
assert.match(loopScript, /refresh_upstream\(\)/);
assert.match(loopScript, /git fetch --quiet "\$remote"/);
assert.match(loopScript, /restore_generated_buildinfo_only\(\)/);
assert.match(loopScript, /git restore --source=HEAD --staged --worktree --[\s\\]+tsconfig\.tsbuildinfo tsconfig\.node\.tsbuildinfo/);
assert.match(loopScript, /Never stage tsconfig\.tsbuildinfo or tsconfig\.node\.tsbuildinfo/);
assert.doesNotMatch(loopScript, /SECURITY_COMMIT_AGENT_REVIEW=1 codex exec/);
assert.match(loopScript, /approval_policy="never"/);
assert.match(loopScript, /git rev-parse --absolute-git-dir/);
assert.match(loopScript, /--sandbox workspace-write[\s\S]+--add-dir "\$git_dir"/);
assert.match(loopScript, /--output-last-message "\$message_file"/);
assert.match(loopScript, /Do not commit, push, deploy/);
assert.match(loopScript, /COMMIT_MESSAGE: <concise Git commit subject>/);
assert.match(loopScript, /outer loop immediately repeats until the working tree is clean and the branch is synced/);
assert.match(loopScript, /git commit --file "\$message_file"/);
assert.doesNotMatch(loopScript, /SECURITY_COMMIT_AGENT_REVIEW=/);
assert.match(loopScript, /bash scripts\/local-ci\.sh/);
assert.doesNotMatch(loopScript, /npm run security:push/);
assert.match(loopScript, /git push/);
assert.match(loopScript, /git push -u origin/);

const dryRun = execFileSync('bash', [script, '10', '--merge-prune', '--dry-run'], {
  cwd: root,
  encoding: 'utf8',
});
assert.match(dryRun, /delay=10m local-verify=0 merge-prune=1 empty-stop=3/);

assert.throws(
  () => execFileSync('bash', [script, 'nope', '--dry-run'], { cwd: root, stdio: 'pipe' }),
  /Command failed/,
);

const repository = mkdtempSync(join(tmpdir(), 'longmont-loop-push-'));
try {
  execFileSync('git', ['init', '-q'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'tests@example.com'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'Loop Push Test'], { cwd: repository });
  writeFileSync(join(repository, 'README.md'), '# Loop Push Test\n');
  writeFileSync(join(repository, 'tsconfig.tsbuildinfo'), 'app cache baseline\n');
  writeFileSync(join(repository, 'tsconfig.node.tsbuildinfo'), 'node cache baseline\n');
  execFileSync('git', ['add', 'README.md', 'tsconfig.tsbuildinfo', 'tsconfig.node.tsbuildinfo'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'initial commit'], { cwd: repository });

  const cleanRun = execFileSync('bash', [script, '0'], { cwd: repository, encoding: 'utf8' });
  assert.match(cleanRun, /Empty check 3\/3: clean and synced\./);
  assert.match(cleanRun, /loop-push complete\./);

  writeFileSync(join(repository, 'tsconfig.tsbuildinfo'), 'regenerated app cache\n');
  writeFileSync(join(repository, 'tsconfig.node.tsbuildinfo'), 'regenerated node cache\n');
  execFileSync('git', ['add', 'tsconfig.tsbuildinfo'], { cwd: repository });
  const metadataRun = execFileSync('bash', [script, '0'], { cwd: repository, encoding: 'utf8' });
  assert.match(metadataRun, /restoring generated TypeScript build metadata to HEAD/);
  assert.equal(readFileSync(join(repository, 'tsconfig.tsbuildinfo'), 'utf8'), 'app cache baseline\n');
  assert.equal(readFileSync(join(repository, 'tsconfig.node.tsbuildinfo'), 'utf8'), 'node cache baseline\n');
  assert.equal(gitStatus(repository), '');
  assert.equal(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), '1');

  const fakeBin = join(repository, '.git', 'fake-bin');
  const marker = join(repository, '.git', 'codex-preparation-active');
  const calls = join(repository, '.git', 'codex-calls');
  const reviews = join(repository, '.git', 'agent-reviews');
  mkdirSync(fakeBin);
  const fakeCodex = join(fakeBin, 'codex');
  writeFileSync(fakeCodex, `#!/usr/bin/env bash
set -euo pipefail
[[ ! -e "$FAKE_CODEX_MARKER" ]]
printf 'call\\n' >> "$FAKE_CODEX_CALLS"
if [[ " $* " == *' --output-last-message '* ]]; then
  touch "$FAKE_CODEX_MARKER"
  trap 'rm -f "$FAKE_CODEX_MARKER"' EXIT
  output=''
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "--output-last-message" ]]; then
      output="$2"
      shift 2
      continue
    fi
    shift
  done
  [[ -n "$output" ]]
  git add README.md
  printf 'COMMIT_MESSAGE: test: commit prepared batch\\n' > "$output"
else
  [[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == "1" ]]
  [[ ! -e "$FAKE_CODEX_MARKER" ]]
  printf 'review\\n' >> "$FAKE_AGENT_REVIEWS"
fi
`);
  chmodSync(fakeCodex, 0o755);

  const hook = join(repository, '.git', 'hooks', 'pre-commit');
  writeFileSync(hook, `#!/usr/bin/env bash
set -euo pipefail
[[ ! -e "$FAKE_CODEX_MARKER" ]]
if [[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == "1" ]]; then
  codex exec --ephemeral --sandbox read-only 'security review'
fi
`);
  chmodSync(hook, 0o755);

  const testEnv = {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH}`,
    FAKE_CODEX_MARKER: marker,
    FAKE_CODEX_CALLS: calls,
    FAKE_AGENT_REVIEWS: reviews,
  };
  delete testEnv.SECURITY_COMMIT_AGENT_REVIEW;
  writeFileSync(marker, 'active\n');
  assert.throws(
    () => execFileSync(hook, {
      cwd: repository,
      env: { ...testEnv, SECURITY_COMMIT_AGENT_REVIEW: '1' },
      stdio: 'pipe',
    }),
    /Command failed/,
  );
  rmSync(marker, { force: true });
  rmSync(calls, { force: true });
  rmSync(reviews, { force: true });

  writeFileSync(join(repository, 'README.md'), '# Prepared Batch\n');
  const preparedRun = execFileSync('bash', [script, '0'], {
    cwd: repository,
    encoding: 'utf8',
    env: testEnv,
  });
  assert.match(preparedRun, /loop-push complete\./);
  assert.throws(() => readFileSync(reviews, 'utf8'), { code: 'ENOENT' });
  assert.equal(execFileSync('git', ['log', '-1', '--pretty=%s'], { cwd: repository, encoding: 'utf8' }).trim(), 'test: commit prepared batch');
  assert.equal(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), '2');

  const remote = join(repository, '.git', 'loop-push-remote.git');
  const pushLog = join(repository, '.git', 'pre-push.log');
  execFileSync('git', ['init', '--bare', '-q', remote], { cwd: repository });
  execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: repository });
  const prePushHook = join(repository, '.git', 'hooks', 'pre-push');
  writeFileSync(prePushHook, `#!/usr/bin/env bash
set -euo pipefail
read -r local_ref local_oid remote_ref remote_oid
[[ -n "$local_ref" && -n "$local_oid" && -n "$remote_ref" && -n "$remote_oid" ]]
printf '%s %s %s %s\\n' "$local_ref" "$local_oid" "$remote_ref" "$remote_oid" > "$LOOP_PUSH_TEST_PUSH_LOG"
`);
  chmodSync(prePushHook, 0o755);

  const pushRun = execFileSync('bash', [script, '0'], {
    cwd: repository,
    encoding: 'utf8',
    env: { ...testEnv, LOOP_PUSH_TEST_PUSH_LOG: pushLog },
  });
  assert.match(pushRun, /loop-push complete\./);
  assert.match(readFileSync(pushLog, 'utf8'), /^refs\/heads\/\S+ [0-9a-f]{40,64} refs\/heads\/\S+ [0-9a-f]{40,64}\n$/);
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repository, encoding: 'utf8' }).trim();
  assert.equal(
    execFileSync('git', [`--git-dir=${remote}`, 'rev-parse', `refs/heads/${branch}`], { encoding: 'utf8' }).trim(),
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
  );

  writeFileSync(join(repository, 'README.md'), '# Concurrently Published Batch\n');
  execFileSync('git', ['add', 'README.md'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'concurrent published batch'], {
    cwd: repository,
    env: { ...testEnv, SECURITY_COMMIT_AGENT_REVIEW: '1' },
  });
  const concurrentlyPublished = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
  execFileSync('git', [
    `--git-dir=${remote}`,
    'fetch',
    repository,
    `${concurrentlyPublished}:refs/heads/${branch}`,
  ]);
  assert.notEqual(
    execFileSync('git', ['rev-parse', '@{upstream}'], { cwd: repository, encoding: 'utf8' }).trim(),
    concurrentlyPublished,
  );
  rmSync(pushLog, { force: true });

  const concurrentRun = execFileSync('bash', [script, '0'], {
    cwd: repository,
    encoding: 'utf8',
    env: { ...testEnv, LOOP_PUSH_TEST_PUSH_LOG: pushLog },
  });
  assert.match(concurrentRun, /loop-push complete\./);
  assert.equal(execFileSync('git', ['rev-parse', '@{upstream}'], { cwd: repository, encoding: 'utf8' }).trim(), concurrentlyPublished);
  assert.throws(() => readFileSync(pushLog, 'utf8'), { code: 'ENOENT' });
} finally {
  rmSync(repository, { recursive: true, force: true });
}

// Real Bash local-ci scheduling fixtures: all 18 calls and each failure boundary.
const ciCalls = ['security:review', 'lint', 'release:check', 'release:self-test',
  'test:scheduled-release', 'content:check-assets', 'security:test', 'test:loop-push',
  'test:update-site', 'test:content', 'test:model-watch', 'test:space-background',
  'test:newsletter', 'test:mobile-contract', 'test:flows-contract', 'test:tools-matrix',
  'build', 'test:mobile'];
const ciScript = resolve(root, 'scripts/local-ci.sh');
const fixture = mkdtempSync(join(tmpdir(), 'longmont-scheduling-'));
function executable(path, contents) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}
function lines(path) {
  try { return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function runShell(path, cwd, env, args = []) {
  const result = spawnSync('bash', [path, ...args], { cwd, env, encoding: 'utf8', timeout: 30_000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
try {
  const bin = join(fixture, 'bin');
  mkdirSync(bin);
  // local-ci's Git root discovery falls back to cwd outside a Git repository.
  executable(join(bin, 'npm'), `#!/usr/bin/env bash
set -euo pipefail
[[ "$#" == 2 && "$1" == run ]]
printf '%s|%s|%s|%s\\n' "$2" "\${SECURITY_COMMIT_AGENT_REVIEW-unset}" "\${MOBILE_AUDIT_HEADED-unset}" "\${MOBILE_AUDIT_ROUTES-unset}" >> "$TRACE"
[[ "$2" != "\${FAIL_CALL:-}" ]]
if [[ "$2" == security:review && "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == 1 ]]; then
  [[ "\${FAIL_REVIEW:-0}" != 1 ]]
fi
`);
  for (const optIn of [false, true]) {
    const trace = join(fixture, `ci-${optIn}.log`);
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, TRACE: trace,
      MOBILE_AUDIT_HEADED: '1', MOBILE_AUDIT_ROUTES: '["/restricted"]' };
    delete env.SECURITY_COMMIT_AGENT_REVIEW;
    if (optIn) env.SECURITY_COMMIT_AGENT_REVIEW = '1';
    const expected = ciCalls.map(call => `${call}|${optIn ? '1' : 'unset'}|${call === 'test:mobile' ? '0|unset' : '1|["/restricted"]'}`);
    const success = runShell(ciScript, fixture, env);
    assert.equal(success.status, 0, success.stderr);
    assert.match(success.stdout, /optional caller-requested/);
    assert.match(success.stdout, /Local verification passed\./);
    assert.deepEqual(lines(trace), expected);
    for (let i = 0; i < ciCalls.length; i++) {
      rmSync(trace, { force: true });
      const failure = runShell(ciScript, fixture, { ...env, FAIL_CALL: ciCalls[i] });
      assert.notEqual(failure.status, 0);
      assert.doesNotMatch(failure.stdout, /Local verification passed/);
      assert.deepEqual(lines(trace), expected.slice(0, i + 1));
    }
    if (optIn) {
      rmSync(trace, { force: true });
      const failure = runShell(ciScript, fixture, { ...env, FAIL_REVIEW: '1' });
      assert.notEqual(failure.status, 0);
      assert.deepEqual(lines(trace), expected.slice(0, 1));
      assert.doesNotMatch(failure.stdout, /Local verification passed/);
    }
  }

  // Each case uses actual Git commits/pushes and executable hooks, never real Codex.
  for (const optIn of [false, true]) {
    for (const upstream of [false, true]) {
      for (const fail of ['', 'prepare', 'commit', 'ci', 'push']) {
        const repo = join(fixture, `git-${optIn}-${upstream}-${fail || 'pass'}`);
        mkdirSync(repo);
        const git = args => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' }).trim();
        git(['init', '-q', '-b', 'main']);
        git(['config', 'user.email', 'tests@example.com']);
        git(['config', 'user.name', 'Scheduling Test']);
        mkdirSync(join(repo, 'scripts'));
        // A fake local-ci boundary in loop fixtures; the real 18-command script is tested above.
        writeFileSync(join(repo, 'scripts/local-ci.sh'), `#!/usr/bin/env bash
set -euo pipefail
[[ ! -e "$MARKER" ]]
printf 'ci|%s\\n' "\${SECURITY_COMMIT_AGENT_REVIEW-unset}" >> "$TRACE"
[[ "$FAIL" != ci ]]
`);
        writeFileSync(join(repo, 'README.md'), '# Initial\n');
        git(['add', '.']);
        git(['commit', '-qm', 'initial']);
        const baseline = git(['rev-parse', 'HEAD']);
        const remote = join(repo, '.git', 'remote.git');
        git(['init', '--bare', '-q', remote]);
        git(['remote', 'add', 'origin', remote]);
        if (upstream) git(['push', '-u', 'origin', 'main']);
        const remoteHead = () => {
          const result = spawnSync('git', [`--git-dir=${remote}`, 'rev-parse', '--verify', 'refs/heads/main'], { encoding: 'utf8' });
          return result.status === 0 ? result.stdout.trim() : null;
        };
        const beforeRemote = remoteHead();
        const fakeBin = join(repo, '.git', 'bin');
        mkdirSync(fakeBin);
        executable(join(fakeBin, 'codex'), `#!/usr/bin/env bash
set -euo pipefail
[[ ! -e "$MARKER" ]]
output=''
while [[ $# -gt 0 ]]; do
  if [[ "$1" == --output-last-message ]]; then output="$2"; shift 2; else shift; fi
done
if [[ -n "$output" ]]; then
  printf 'prepare|%s\\n' "\${SECURITY_COMMIT_AGENT_REVIEW-unset}" >> "$TRACE"
  [[ "$FAIL" != prepare ]]
  touch "$MARKER"
  trap 'rm -f "$MARKER"' EXIT
  git add README.md
  printf 'COMMIT_MESSAGE: test: scheduled batch\\n' > "$output"
else
  [[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == 1 ]]
  printf 'review-%s|1\\n' "$PHASE" >> "$TRACE"
  [[ "$FAIL" != "$PHASE" ]]
fi
`);
        for (const phase of ['commit', 'push']) {
          executable(join(repo, '.git', 'hooks', `pre-${phase}`), `#!/usr/bin/env bash
set -euo pipefail
[[ ! -e "$MARKER" ]]
printf '${phase}|%s\\n' "\${SECURITY_COMMIT_AGENT_REVIEW-unset}" >> "$TRACE"
${phase === 'push' ? 'cat > "$REFS"\n[[ -s "$REFS" ]]' : ':'}
if [[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == 1 ]]; then
  PHASE=${phase} codex exec --ephemeral --sandbox read-only 'security review'
else
  [[ "$FAIL" != ${phase} ]]
fi
`);
        }
        writeFileSync(join(repo, 'README.md'), '# Prepared\n');
        const trace = join(repo, '.git', 'trace');
        const refs = join(repo, '.git', 'refs-input');
        const env = { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, TRACE: trace,
          REFS: refs, MARKER: join(repo, '.git', 'active'), FAIL: fail, LOOP_PUSH_EMPTY_CHECKS: '1' };
        delete env.SECURITY_COMMIT_AGENT_REVIEW;
        if (optIn) env.SECURITY_COMMIT_AGENT_REVIEW = '1';
        const result = runShell(script, repo, env, ['0', '--local-verify']);
        const value = optIn ? '1' : 'unset';
        const expected = [`prepare|${value}`, `commit|${value}`];
        if (optIn) expected.push('review-commit|1');
        expected.push(`ci|${value}`, `push|${value}`);
        if (optIn) expected.push('review-push|1');
        const stop = fail === 'prepare' ? 1 : fail === 'commit' ? (optIn ? 3 : 2)
          : fail === 'ci' ? (optIn ? 4 : 3) : expected.length;
        assert.deepEqual(lines(trace), expected.slice(0, stop));
        if (fail) {
          assert.notEqual(result.status, 0, `${optIn}/${upstream}/${fail}`);
          assert.doesNotMatch(result.stdout, /loop-push complete/);
          assert.equal(remoteHead(), beforeRemote, 'failed phase must not advance remote');
          if (fail === 'prepare' || fail === 'commit') assert.equal(git(['rev-parse', 'HEAD']), baseline);
          if (fail === 'prepare') assert.equal(git(['diff', '--cached', '--name-only']), '');
          if (fail === 'commit') assert.equal(git(['diff', '--cached', '--name-only']), 'README.md');
          if (fail === 'prepare' || fail === 'commit') assert.match(gitStatus(repo), /README\.md/);
        } else {
          assert.equal(result.status, 0, result.stderr);
          assert.match(result.stdout, /loop-push complete/);
          assert.equal(gitStatus(repo), '');
          assert.equal(git(['rev-list', '--count', 'HEAD']), '2');
          assert.equal(git(['log', '-1', '--pretty=%s']), 'test: scheduled batch');
          assert.equal(remoteHead(), git(['rev-parse', 'HEAD']));
          assert.equal(git(['rev-parse', '@{upstream}']), remoteHead());
        }
        if (!fail || fail === 'push') {
          assert.match(readFileSync(refs, 'utf8'), /^refs\/heads\/main [0-9a-f]{40,64} refs\/heads\/main [0-9a-f]{40,64}\n$/);
          const fields = readFileSync(refs, 'utf8').trim().split(' ');
          assert.equal(fields[1], git(['rev-parse', 'HEAD']));
          assert.equal(fields[3], upstream ? baseline : '0'.repeat(baseline.length));
        }
      }
    }
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
console.log('loop-push contract: PASS (18-call CI/default+opt-in failures; real Git scheduling matrix)');
