import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const justfile = readFileSync(resolve(root, 'justfile'), 'utf8');
const script = resolve(root, 'scripts/loop-push.sh');

assert.match(justfile, /^loop-push minutes="2":/m);
assert.match(justfile, /^loop-merge-push minutes="2": \(loop-push-merge minutes\)/m);
const loopScript = readFileSync(script, 'utf8');
assert.match(loopScript, /commit_dirty_work\(\)/);
assert.match(loopScript, /SECURITY_COMMIT_AGENT_REVIEW=1 codex exec/);
assert.match(loopScript, /approval_policy="never"/);
assert.match(loopScript, /--sandbox workspace-write[\s\S]+--add-dir "\$ROOT\/\.git"/);
assert.match(loopScript, /return only after creating that one reviewed commit/);
assert.match(loopScript, /outer loop immediately repeats until the working tree is clean and the branch is synced/);
assert.match(loopScript, /bash scripts\/local-ci\.sh/);
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
  execFileSync('git', ['add', 'README.md'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'initial commit'], { cwd: repository });

  const cleanRun = execFileSync('bash', [script, '0'], { cwd: repository, encoding: 'utf8' });
  assert.match(cleanRun, /Empty check 3\/3: clean and synced\./);
  assert.match(cleanRun, /loop-push complete\./);
} finally {
  rmSync(repository, { recursive: true, force: true });
}

console.log('loop-push contract: PASS');
