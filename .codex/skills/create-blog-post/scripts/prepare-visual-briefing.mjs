#!/usr/bin/env node
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node prepare-visual-briefing.mjs --images DIR --date YYYY-MM-DD --slug kebab-case-slug [--output DIR]');
  process.exit(1);
}

function readArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value || values.has(key)) usage('Invalid or duplicate argument.');
    values.set(key, value);
  }
  return values;
}

async function imageFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await imageFiles(root, fullPath));
    if (entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(relative(root, fullPath));
    }
  }
  return files;
}

const args = readArgs(process.argv.slice(2));
const imageDirectory = args.get('--images');
const date = args.get('--date');
const slug = args.get('--slug');
const outputRoot = args.get('--output') ?? 'outputs';

if (!imageDirectory || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '')) {
  usage('Use a valid image directory, ISO date, and lowercase kebab-case slug.');
}

const source = resolve(imageDirectory);
let sourceInfo;
try {
  sourceInfo = await stat(source);
} catch (error) {
  if (error?.code === 'ENOENT') usage(`Image directory does not exist: ${source}`);
  throw error;
}
if (!sourceInfo.isDirectory()) usage('--images must name a directory.');

const output = resolve(outputRoot, date.replaceAll('-', '.'), slug);
try {
  await stat(output);
  usage(`Refusing to overwrite existing work folder: ${output}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const images = await imageFiles(source);
await mkdir(output, { recursive: true });
await writeFile(join(output, 'image-manifest.json'), `${JSON.stringify({
  sourceDirectory: basename(source),
  createdAt: new Date().toISOString(),
  images,
}, null, 2)}\n`);
await writeFile(join(output, 'source-ledger.md'), '| Claim | Event date | Primary source | Corroboration | Confidence | Caveat |\n| --- | --- | --- | --- | --- | --- |\n');
await writeFile(join(output, 'slide-plan.md'), '# Slide Plan\n\nReview each supplied image before assigning it to a slide. Use one claim and one visual focus per 16:9 slide.\n');

console.log(`Created review work folder: ${output}`);
console.log(`Catalogued ${images.length} image file${images.length === 1 ? '' : 's'}. No source images were copied or published.`);
