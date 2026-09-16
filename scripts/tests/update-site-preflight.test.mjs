import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import activeRelease from '../../src/generated/scheduled-release/server.mjs';

const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync(process.execPath, [
  new URL('../update-site-preflight.mjs', import.meta.url).pathname,
  '--as-of',
  '2026-08-05',
  '--json',
]);
const report = JSON.parse(stdout);

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
  `/edition/${activeRelease.editionId}`,
]);
assert.deepEqual(report.surfaces.at(-1).owners, [
  'src/articles/scheduledEdition.ts',
  activeRelease.source.article,
]);
assert.ok(report.excluded.includes('new blog posts'));
assert.ok(report.sources.editorial.length >= 20);
assert.ok(report.sources.detector.some(({ company, required }) => company === 'Meta AI' && required));
assert.deepEqual(report.integrity.duplicateModelIds, []);
assert.deepEqual(report.integrity.duplicateTimelineIds, []);

assert.equal(report.repository.detectedRoot, realpathSync(fileURLToPath(new URL('../../', import.meta.url))));
assert.equal(report.repository.expectedRoot, report.repository.detectedRoot);
const elsewhere = await execFileAsync(process.execPath, [
  fileURLToPath(new URL('../update-site-preflight.mjs', import.meta.url)),
  '--as-of', '2026-08-05', '--json',
], { cwd: tmpdir() });
assert.deepEqual(JSON.parse(elsewhere.stdout), report, 'caller cwd must not select a different checkout');
for (const args of [['--as-of', '2026-02-30'], ['--as-of'], ['--unknown']]) {
  await assert.rejects(execFileAsync(process.execPath, [
    fileURLToPath(new URL('../update-site-preflight.mjs', import.meta.url)), ...args,
  ]));
}
console.log('update site preflight: PASS (checkout/worktree and foreign cwd)');
