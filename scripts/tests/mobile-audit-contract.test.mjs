import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectMobileAudit } from '../mobile-audit-selector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runnerPath = path.join(root, 'scripts/run-targeted-mobile-audit.mjs');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function commit(cwd, message) {
  execFileSync('git', ['-c', 'user.name=Contract Test', '-c', 'user.email=contract@example.invalid', 'commit', '-m', message], {
    cwd,
    stdio: 'ignore',
  });
  return git(cwd, ['rev-parse', 'HEAD']);
}

function runSelection(cwd, mode, input = '') {
  const result = spawnSync(process.execPath, [runnerPath, mode], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, MOBILE_AUDIT_DRY_RUN: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'longmont-mobile-contract-'));
  git(directory, ['init', '-q']);
  await mkdir(path.join(directory, 'src/pages'), { recursive: true });
  await writeFile(path.join(directory, 'README.md'), 'baseline\n');
  git(directory, ['add', '.']);
  const base = commit(directory, 'baseline');
  return { directory, base };
}

test('hook and exhaustive local-CI wiring preserve their distinct scopes', async () => {
  const [packageJson, localCi, preCommit, prePush, browserRunner, audit, editorGuide] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'scripts/local-ci.sh'), 'utf8'),
    readFile(path.join(root, '.githooks/pre-commit'), 'utf8'),
    readFile(path.join(root, '.githooks/pre-push'), 'utf8'),
    readFile(path.join(root, 'scripts/run-mobile-browser-audit.sh'), 'utf8'),
    readFile(path.join(root, 'scripts/mobile-playwright-audit.js'), 'utf8'),
    readFile(path.join(root, 'docs/blog-editor.md'), 'utf8'),
  ]);

  assert.equal(packageJson.scripts['test:mobile'], 'bash scripts/run-mobile-audit.sh');
  assert.match(localCi, /npm run test:mobile-contract/);
  assert.match(localCi, /npm run test:mobile/);
  assert.doesNotMatch(localCi, /test:mobile:staged/);
  assert.match(preCommit, /run-targeted-mobile-audit\.mjs staged/);
  assert.match(prePush, /run-targeted-mobile-audit\.mjs push/);
  assert.match(prePush, /cat >"\$PUSH_REFS"/);
  assert.equal(packageJson.scripts['audit:mobile'], 'bash scripts/run-mobile-browser-audit.sh');
  assert.match(browserRunner, /run-code --filename scripts\/mobile-playwright-audit\.js/);
  assert.match(audit, /MOBILE_AUDIT_ROUTES/);
  assert.match(audit, /mediaLayoutFailures/);
  assert.match(audit, /edition-2026-06-10-ai-landscape/);
  assert.match(editorGuide, /selects from the staged snapshot/);
});

test('selector targets page and edition routes, skips known non-web paths, and fails unknown paths closed', async () => {
  assert.deepEqual(await selectMobileAudit(['src/pages/Tools.tsx']), {
    action: 'routes', routes: ['/tools'], reason: 'src/pages/Tools.tsx',
  });
  assert.equal((await selectMobileAudit(['docs/operator.md', 'api/job.ts'])).action, 'skip');
  assert.equal((await selectMobileAudit(['src/App.css'])).action, 'full');
  assert.equal((await selectMobileAudit(['mystery/new-surface.xyz'])).action, 'full');

  const edition = await selectMobileAudit(['src/articles/2026.09.02.md'], {
    readSnapshot: async () => '---\nid: edition-2026-09-02-test\n---\nbody',
  });
  assert.deepEqual(edition.routes, ['/', '/edition/edition-2026-09-02-test']);
});

test('staged mode reads only the index snapshot, not unstaged worktree changes', async (t) => {
  const { directory } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(path.join(directory, 'src/pages/Tools.tsx'), 'staged\n');
  git(directory, ['add', 'src/pages/Tools.tsx']);
  await mkdir(path.join(directory, 'src'), { recursive: true });
  await writeFile(path.join(directory, 'src/App.css'), 'unstaged shared css\n');

  const selection = runSelection(directory, 'staged');
  assert.equal(selection.action, 'routes');
  assert.deepEqual(selection.routes, ['/tools']);
  assert.deepEqual(selection.paths, ['src/pages/Tools.tsx']);
});

test('push mode selects files from outgoing commits rather than the worktree', async (t) => {
  const { directory, base } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(path.join(directory, 'src/pages/ModelWatch.tsx'), 'outgoing\n');
  git(directory, ['add', '.']);
  const head = commit(directory, 'model watch');
  await writeFile(path.join(directory, 'src/App.css'), 'uncommitted shared css\n');

  const update = `refs/heads/topic ${head} refs/heads/topic ${base}\n`;
  const selection = runSelection(directory, 'push', update);
  assert.equal(selection.action, 'routes');
  assert.deepEqual(selection.routes, ['/model-watch']);
  assert.deepEqual(selection.paths, ['src/pages/ModelWatch.tsx']);
});

test('new branches and missing push ref data conservatively request a full audit', async (t) => {
  const { directory, base } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const zeros = '0'.repeat(40);
  const update = `refs/heads/new ${base} refs/heads/new ${zeros}\n`;
  assert.equal(runSelection(directory, 'push', update).action, 'full');
  assert.equal(runSelection(directory, 'push', '').action, 'full');
});
