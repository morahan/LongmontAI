#!/usr/bin/env node
// Reruns every scripts/maps/fetch-<name>.mjs into <name>.json in the newest snapshot folder.
//   node scripts/maps/update.mjs
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = new URL('./', import.meta.url);
const root = new URL('../../src/data/maps/snapshots/', import.meta.url);
const dates = readdirSync(root).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
const newest = dates[dates.length - 1];
if (!newest) throw new Error('No snapshot to update.');

// Some sources refuse a repeat download for hours, so a rerun on the same UTC day reuses that day's
// downloads and the next day fetches fresh.
const cacheDir = join(tmpdir(), `longmontai-maps-${new Date().toISOString().slice(0, 10)}`);

const fetchers = readdirSync(scripts).filter((name) => /^fetch-[a-z0-9-]+\.mjs$/.test(name)).sort();
for (const fetcher of fetchers) {
  const output = `${newest}/${fetcher.slice('fetch-'.length, -'.mjs'.length)}.json`;
  const args = [fileURLToPath(new URL(fetcher, scripts)), fileURLToPath(new URL(output, root)), cacheDir];
  if (spawnSync(process.execPath, args, { stdio: 'inherit' }).status !== 0) {
    console.error(`scripts/maps/${fetcher} failed. No later fetcher ran.`);
    process.exit(1);
  }
  console.log(`Refreshed src/data/maps/snapshots/${output}`);
}
