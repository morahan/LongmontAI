import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import scheduledRelease from '../../src/generated/scheduled-release/server.mjs';

const execFileAsync = promisify(execFile);
const scheduledEditionRoute = `/edition/${scheduledRelease.editionId}`;
const scheduledEditionOwners = [
  'src/articles/scheduledEdition.ts',
  scheduledRelease.source.article,
];
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
  scheduledEditionRoute,
]);
assert.deepEqual(report.surfaces.at(-1).owners, scheduledEditionOwners);
assert.ok(report.excluded.includes('new blog posts'));
assert.ok(report.sources.editorial.length >= 20);
assert.ok(report.sources.detector.some(({ company, required }) => company === 'Meta AI' && required));
assert.deepEqual(report.integrity.duplicateModelIds, []);
assert.deepEqual(report.integrity.duplicateTimelineIds, []);

console.log('update site preflight: PASS');
