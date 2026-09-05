import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import scheduledRelease from '../../src/generated/scheduled-release/server.mjs';

const execFileAsync = promisify(execFile);
const scheduledEditionRoute = `/edition/${scheduledRelease.editionId}`;
const scheduledEditionOwners = [
  'src/articles/scheduledEdition.ts',
  scheduledRelease.source.article,
];
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const portableRoot = await mkdtemp(path.join(tmpdir(), 'longmont-update-site-portable-'));

async function copy(relativePath) {
  const destination = path.join(portableRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(sourceRoot, relativePath), destination);
}

let report;
try {
  await Promise.all([
    copy('scripts/update-site-preflight.mjs'),
    copy('scripts/model-watch-sources.mjs'),
    copy('src/data/modelWatch.ts'),
    copy('src/data/timeline.ts'),
    copy('src/generated/scheduled-release/server.mjs'),
  ]);
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(portableRoot, 'scripts/update-site-preflight.mjs'),
    '--as-of',
    '2026-08-05',
    '--json',
  ]);
  report = JSON.parse(stdout);
} finally {
  await rm(portableRoot, { recursive: true, force: true });
}

assert.notEqual(report.repository.detectedRoot, sourceRoot);

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
