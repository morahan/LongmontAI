import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { assertSiteRepository } from '../update-site-preflight.mjs';
import scheduledRelease from '../../src/generated/scheduled-release/server.mjs';

const execFileAsync = promisify(execFile);
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'longmont-preflight identity-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
try {
  const canonical = path.join(fixtureRoot, 'canonical');
  const linked = path.join(fixtureRoot, 'linked');
  const unrelated = path.join(fixtureRoot, 'unrelated');
  const plain = path.join(fixtureRoot, 'plain');
  const alias = path.join(fixtureRoot, 'canonical-alias');
  await execFileAsync('git', ['init', '--quiet', canonical], { env });
  await execFileAsync('git', ['-C', canonical, 'worktree', 'add', '--orphan', '-b', 'fixture-linked', linked], { env });
  await execFileAsync('git', ['init', '--quiet', unrelated], { env });
  await mkdir(plain);
  await symlink(canonical, alias, 'dir');

  await assertSiteRepository(canonical, canonical);
  await assertSiteRepository(linked, canonical);
  await assertSiteRepository(alias, canonical);
  await assert.rejects(assertSiteRepository(unrelated, canonical), /site-specific/);
  await assert.rejects(assertSiteRepository(plain, canonical), /site-specific/);
  await assert.rejects(assertSiteRepository(linked, plain), /site-specific/);
  await mkdir(path.join(canonical, 'nested'));
  await assert.rejects(assertSiteRepository(path.join(canonical, 'nested'), canonical), /site-specific/);

  // Inherited Git routing must not make an unrelated checkout look trusted.
  const savedGitDir = process.env.GIT_DIR;
  const savedWorkTree = process.env.GIT_WORK_TREE;
  try {
    process.env.GIT_DIR = path.join(canonical, '.git');
    process.env.GIT_WORK_TREE = unrelated;
    await assert.rejects(assertSiteRepository(unrelated, canonical), /site-specific/);
    await assertSiteRepository(linked, canonical);
  } finally {
    if (savedGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = savedGitDir;
    if (savedWorkTree === undefined) delete process.env.GIT_WORK_TREE;
    else process.env.GIT_WORK_TREE = savedWorkTree;
  }

  // Exercise the actual CLI guard, before any release-data imports, in a copy.
  await mkdir(path.join(unrelated, 'scripts'));
  for (const name of ['update-site-preflight.mjs', 'model-watch-sources.mjs']) {
    await cp(path.join(sourceRoot, 'scripts', name), path.join(unrelated, 'scripts', name));
  }
  await assert.rejects(execFileAsync(process.execPath, [
    path.join(unrelated, 'scripts/update-site-preflight.mjs'), '--json',
  ], { cwd: sourceRoot, env }), (error) => {
    assert.match(error.stderr, /This command is site-specific/);
    assert.equal(error.stdout, '');
    return true;
  });
} finally {
  // All fixture repositories and their worktree metadata live under this root.
  await rm(fixtureRoot, { recursive: true, force: true });
}

// The default guard accepts the real site root and the current linked checkout.
await assertSiteRepository('/Users/msfm/Creations/Coding/LongmontAI');
await assertSiteRepository(sourceRoot);
const { stdout } = await execFileAsync(process.execPath, [
  fileURLToPath(new URL('../update-site-preflight.mjs', import.meta.url)),
  '--as-of',
  '2026-08-05',
  '--json',
], { cwd: tmpdir() });
const report = JSON.parse(stdout);
assert.equal(await realpath(report.repository.detectedRoot), await realpath(sourceRoot));
assert.equal(report.repository.expectedRoot, '/Users/msfm/Creations/Coding/LongmontAI');

assert.deepEqual(report.window, {
  timeZone: 'America/Denver',
  start: '2026-07-23',
  end: '2026-08-05',
  calendarDays: 14,
  inclusive: true,
});
assert.deepEqual(report.surfaces.map(({ route }) => route), [
  '/tools',
  '/model-watch',
  '/leaderboard',
  '/timeline',
  `/edition/${scheduledRelease.editionId}`,
]);
assert.deepEqual(report.surfaces.at(-1).owners, [
  'src/articles/scheduledEdition.ts',
  scheduledRelease.source.article,
]);
assert.ok(report.excluded.includes('new blog posts'));
assert.ok(report.sources.editorial.length >= 20);
assert.ok(report.sources.detector.some(({ company, required }) => company === 'Meta AI' && required));
assert.deepEqual(report.integrity.duplicateModelIds, []);
assert.deepEqual(report.integrity.duplicateTimelineIds, []);

console.log('update site preflight: PASS');
