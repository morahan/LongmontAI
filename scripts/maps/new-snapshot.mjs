#!/usr/bin/env node
// Starts the next fortnight by copying the newest snapshot into a new dated folder.
//   node scripts/maps/new-snapshot.mjs            # newest snapshot + 14 days
//   node scripts/maps/new-snapshot.mjs 2026-12-09
import { cpSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('../../src/data/maps/snapshots/', import.meta.url);
const dates = readdirSync(root).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
const newest = dates[dates.length - 1];
if (!newest) throw new Error('No snapshot to copy from.');

const fortnightLater = new Date(Date.parse(`${newest}T00:00:00Z`) + 14 * 86400000).toISOString().slice(0, 10);
const next = process.argv[2] ?? fortnightLater;
if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || Number.isNaN(Date.parse(next))) throw new Error(`Not a date: ${next}`);
if (next <= newest) throw new Error(`${next} is not after the newest snapshot ${newest}.`);
if (existsSync(new URL(`${next}/`, root))) throw new Error(`${next} already exists.`);

cpSync(new URL(`${newest}/`, root), new URL(`${next}/`, root), { recursive: true });
console.log(`Copied ${newest} to src/data/maps/snapshots/${next}. Edit the files, then run npm run test:maps.`);
