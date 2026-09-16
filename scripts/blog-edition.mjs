#!/usr/bin/env node
// Dry-run by default. Explicit staging uses the existing guarded release machinery.
import { readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createScheduledReleaseTools } from './lib/scheduled-release.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export function publicationTime(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T18:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Meeting date must be a real YYYY-MM-DD date');
  }
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver', timeZoneName: 'shortOffset',
  }).formatToParts(new Date(`${date}T18:00:00Z`)).find(({ type }) => type === 'timeZoneName').value;
  if (!/^GMT-[67]$/.test(offset)) throw new Error('Unexpected Denver offset');
  return `${date}T11:50:00-0${offset.slice(-1)}:00`;
}

async function exists(file) {
  try { await lstat(file); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function newDraft(root, date, slug, write = false) {
  const publishAt = publicationTime(date);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Topic must be lowercase kebab case');
  const canonicalRoot = await realpath(root);
  const directory = path.join(canonicalRoot, 'src/articles/drafts');
  if (await realpath(directory) !== directory) throw new Error('Draft directory must not be symlinked');
  const stem = `${date.replaceAll('-', '.')}-${slug}`;
  const article = path.join(directory, `${stem}.md`);
  // Refuse either existing file, including symlinks; never truncate user work.
  if (await exists(article) || await exists(path.join(directory, `${stem}.release.json`))) {
    throw new Error('Draft or release manifest already exists; use blog-update to inspect it');
  }
  const template = await readFile(path.join(directory, 'edition-template.md'), 'utf8');
  const markdown = template.replaceAll('edition-yyyy-mm-dd-topic', `edition-${date}-${slug}`)
    .replace('yyyy-mm-ddT11:50:00-06:00', publishAt).replaceAll('yyyy-mm-dd', date);
  if (write) await writeFile(article, markdown, { flag: 'wx' });
  return { mode: write ? 'created' : 'dry-run', article: path.relative(canonicalRoot, article), publishAt, published: false };
}

export async function inspectDraft(root, manifestPath) {
  if (!/^src\/articles\/drafts\/\d{4}\.\d{2}\.\d{2}-[a-z0-9-]+\.release\.json$/.test(manifestPath)) {
    throw new Error('Use a dated release manifest inside src/articles/drafts');
  }
  const tools = createScheduledReleaseTools({ root });
  // Historical packages may be inspected, but this is never permission to stage them.
  const spec = await tools.specFromManifest(manifestPath, { requireFuture: false });
  const manifest = JSON.parse(await readFile(path.join(root, manifestPath), 'utf8'));
  const date = manifest.assetFolder.replaceAll('.', '-');
  if (manifest.publishAt !== publicationTime(date)) throw new Error('publishAt must be 11:50 America/Denver on the meeting date');
  const text = spec.article.bytes.toString('utf8');
  if (/\]\(assets\//.test(text)) throw new Error('Relative assets/ URLs are not packaged; use dated /weekly-screenshots/ or /documents/ URLs');
  const active = await tools.verifyGeneratedRelease();
  const blockers = [];
  if (!spec.media.some(({ path: name }) => /\.(pdf|pptx)$/.test(name))) blockers.push('Downloadable deck missing from article media');
  if (active.editionId !== spec.editionId) {
    blockers.push(`Staging not attempted: active pointer is ${active.editionId}; reviewed promotion/rollover is required before replacing it`);
  }
  return {
    mode: 'dry-run', preparation: 'validated', edition: spec.editionId, publishAt: spec.publishAt,
    media: spec.media.map(({ path: name }) => name), blockers,
    siteUpdate: 'not performed', published: false,
    next: 'Review primary sources, preview and gates; parent owns reviewed release:stage and publication. Never bypass rollover.',
  };
}

export async function updateDraft(root, manifestPath, stage = false) {
  const report = await inspectDraft(root, manifestPath);
  if (!stage) return report;
  if (report.blockers.some((blocker) => blocker.startsWith('Downloadable'))) throw new Error('Downloadable deck required before staging');
  // Never hand-write generated files or bypass the active-edition rollover guard.
  const staged = await createScheduledReleaseTools({ root }).stageRelease(manifestPath);
  return { ...report, mode: 'staged', blockers: [], siteUpdate: 'scheduled package staged; not deployed', releaseRevision: staged.releaseRevision };
}

export async function main(args) {
  const [command, first, second, ...rest] = args;
  if (command === 'new' && first && second && rest.length <= 1 && (!rest.length || ['--write', '--dry-run'].includes(rest[0]))) {
    console.log(JSON.stringify(await newDraft(repositoryRoot, first, second, rest[0] === '--write'), null, 2));
  } else if (command === 'update' && first && rest.length === 0 && (second === undefined || ['--dry-run', '--stage'].includes(second))) {
    const inspected = await inspectDraft(repositoryRoot, first);
    const preflight = execFileSync(process.execPath, [path.join(repositoryRoot, 'scripts/update-site-preflight.mjs'), '--as-of', inspected.publishAt.slice(0, 10), '--json'], { encoding: 'utf8' });
    const report = second === '--stage' ? await updateDraft(repositoryRoot, first, true) : inspected;
    console.log(JSON.stringify({ ...report, sitePreflight: JSON.parse(preflight) }, null, 2));
    if (report.blockers.length) process.exitCode = 2;
  } else {
    throw new Error('Usage: blog-edition.mjs new YYYY-MM-DD topic [--dry-run|--write] | update src/articles/drafts/DATE-topic.release.json [--dry-run|--stage]');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
