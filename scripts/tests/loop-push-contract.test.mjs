import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
assert.match(loopScript, /SECURITY_COMMIT_AGENT_REVIEW=1 git commit --file "\$message_file"/);
assert.match(loopScript, /bash scripts\/local-ci\.sh/);
assert.doesNotMatch(loopScript, /npm run security:push/);
assert.match(loopScript, /SECURITY_COMMIT_AGENT_REVIEW=1 git push/);
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
call_count=0
[[ ! -f "$FAKE_CODEX_CALLS" ]] || call_count="$(wc -l < "$FAKE_CODEX_CALLS" | tr -d ' ')"
printf 'call\\n' >> "$FAKE_CODEX_CALLS"
if [[ "$call_count" -eq 0 ]]; then
  [[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" != "1" ]]
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
[[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == "1" ]]
[[ ! -e "$FAKE_CODEX_MARKER" ]]
codex exec --ephemeral --sandbox read-only 'security review'
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
  assert.equal(readFileSync(reviews, 'utf8'), 'review\n');
  assert.equal(execFileSync('git', ['log', '-1', '--pretty=%s'], { cwd: repository, encoding: 'utf8' }).trim(), 'test: commit prepared batch');
  assert.equal(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), '2');

  const remote = join(repository, '.git', 'loop-push-remote.git');
  const pushLog = join(repository, '.git', 'pre-push.log');
  execFileSync('git', ['init', '--bare', '-q', remote], { cwd: repository });
  execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: repository });
  const prePushHook = join(repository, '.git', 'hooks', 'pre-push');
  writeFileSync(prePushHook, `#!/usr/bin/env bash
set -euo pipefail
[[ "\${SECURITY_COMMIT_AGENT_REVIEW:-0}" == "1" ]]
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

console.log('loop-push contract: PASS');
