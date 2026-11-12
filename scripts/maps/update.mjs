#!/usr/bin/env node
// Starts the new fortnight's snapshot folder when one is due, then reruns every
// scripts/maps/fetch-<name>.mjs into <name>.json in the newest snapshot folder.
//   node scripts/maps/update.mjs
//   node scripts/maps/update.mjs --due   # report whether a fortnight is due and change nothing
import { spawnSync } from 'node:child_process';
import { readdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DAY = 86400000;
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

// A late run still opens the folder a whole number of fortnights after the newest one, so the dates stay
// on the meetup Wednesdays and a fortnight that was missed entirely gets no folder.
export function dueFortnight(newest, today) {
  const fortnights = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${newest}T00:00:00Z`)) / (14 * DAY));
  return fortnights >= 1 ? addDays(newest, 14 * fortnights) : null;
}

function denverDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function main(argv) {
  if (argv.length > 1 || (argv.length === 1 && argv[0] !== '--due')) {
    console.error(`Unknown arguments: ${argv.join(' ')}. Usage: node scripts/maps/update.mjs [--due]`);
    process.exit(1);
  }

  const scripts = new URL('./', import.meta.url);
  const root = new URL('../../src/data/maps/snapshots/', import.meta.url);
  const dates = readdirSync(root).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
  const newest = dates[dates.length - 1];
  if (!newest) throw new Error('No snapshot to update.');

  const due = dueFortnight(newest, denverDate());
  if (argv[0] === '--due') {
    console.log(due ? `due ${due}` : `not due until ${addDays(newest, 14)}`);
    return;
  }
  if (due && spawnSync(process.execPath, [fileURLToPath(new URL('new-snapshot.mjs', scripts)), due], { stdio: 'inherit' }).status !== 0) {
    console.error(`scripts/maps/new-snapshot.mjs ${due} failed. No fetcher ran.`);
    process.exit(1);
  }
  const target = due ?? newest;

  // Some sources refuse a repeat download for hours, so a rerun on the same UTC day reuses that day's
  // downloads and the next day fetches fresh.
  const cacheDir = join(tmpdir(), `longmontai-maps-${new Date().toISOString().slice(0, 10)}`);

  const fetchers = readdirSync(scripts).filter((name) => /^fetch-[a-z0-9-]+\.mjs$/.test(name)).sort();
  const fileFor = (fetcher) => `${fetcher.slice('fetch-'.length, -'.mjs'.length)}.json`;

  const fetched = fetchers.map(fileFor);
  const unfetched = readdirSync(new URL(`${target}/`, root))
    .filter((name) => name.endsWith('.json') && !fetched.includes(name))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
  if (unfetched.length) console.log(`No fetcher, needs a hand review: ${unfetched.join(', ')}`);

  for (const fetcher of fetchers) {
    const output = `${target}/${fileFor(fetcher)}`;
    const args = [fileURLToPath(new URL(fetcher, scripts)), fileURLToPath(new URL(output, root)), cacheDir];
    if (spawnSync(process.execPath, args, { stdio: 'inherit' }).status !== 0) {
      console.error(`scripts/maps/${fetcher} failed. No later fetcher ran.`);
      process.exit(1);
    }
    console.log(`Refreshed src/data/maps/snapshots/${output}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2));
