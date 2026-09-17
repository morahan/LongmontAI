#!/usr/bin/env node
// Dry-run by default. Explicit staging uses the existing guarded release machinery.
import { readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createScheduledReleaseTools, parseFrontmatter } from './lib/scheduled-release.mjs';

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
  return { mode: write ? 'created' : 'dry-run', article: path.relative(canonicalRoot, article), publishAt, production: 'unverified', published: false };
}

async function inspectCandidate(root, manifestPath) {
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
  return spec;
}

async function isRegisteredStatic(root, spec) {
  const directory = await realpath(path.join(root, 'src/articles'));
  const source = await readFile(path.join(directory, 'index.ts'), 'utf8');
  // Recognize the repository's literal registry convention, never execute JS.
  // Preserve quoted import paths while masking comments and template literals.
  const index = source.replace(/(['"`])(?:\\[\s\S]|(?!\1)[^\\])*?\1|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (token) => token.startsWith('/') || token.startsWith('`') ? token.replace(/[^\n]/g, ' ') : token);
  const registries = [...index.matchAll(/^export\s+const\s+editions(?:\s*:\s*Edition\[\])?\s*=\s*\[([\s\S]*?)\];?\s*$/gm)];
  if (registries.length !== 1) return false;
  const entries = registries[0][1].split(',').map((entry) => entry.trim()).filter(Boolean);
  const members = entries.map((entry) => /^parseMarkdownToEdition\(\s*([A-Za-z_$][\w$]*)\s*\)$/.exec(entry)?.[1]);
  if (members.some((member) => !member)) return false;
  const imports = [...index.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s+from\s+['"](\.\/[^'"\n]+\.md)\?raw['"];?\s*$/gm)];
  if (new Set(imports.map((item) => item[2])).size !== imports.length) return false;
  const matches = [];
  for (const member of members) {
    const imported = imports.filter((item) => item[1] === member);
    if (imported.length !== 1) return false;
    const file = await realpath(path.resolve(directory, imported[0][2]));
    if (!file.startsWith(`${directory}${path.sep}`)) throw new Error('Registered article escapes articles directory');
    const { data } = parseFrontmatter(await readFile(file, 'utf8'));
    if (data.id === spec.editionId) matches.push(data);
  }
  return matches.length === 1 && matches[0].status === 'published'
    && matches[0].publishAt === spec.publishAt && spec.publishAtMs <= Date.now();
}

async function reportPreparation(root, spec, active) {
  const registered = await isRegisteredStatic(root, spec);
  const selected = active.editionId === spec.editionId && active.publishAt === spec.publishAt
    && active.releaseRevision === spec.releaseRevision && active.source.manifest === spec.source.manifest;
  const due = spec.publishAtMs <= Date.now();
  const publication = registered ? 'registered-static' : due ? (selected ? 'active-release-due' : 'overdue') : 'future';
  const blockers = [];
  if (!spec.media.some(({ path: name }) => /\.(pdf|pptx)$/.test(name))) blockers.push('Downloadable deck missing from article media');
  if (publication === 'overdue') {
    blockers.push('Overdue: use reviewed static publication; future-only staging cannot publish this historical draft');
  } else if (!selected && !registered) {
    blockers.push(`Staging not attempted: active pointer is ${active.editionId}; candidate identity/time/revision/source does not match. Use guarded staging, with reviewed promotion/rollover for a different active edition`);
  }
  return {
    mode: 'dry-run', preparation: 'validated', edition: spec.editionId, publishAt: spec.publishAt,
    localState: registered ? 'registered-static' : selected ? 'locally-staged' : 'prepared',
    publication, activeEdition: active.editionId,
    media: spec.media.map(({ path: name }) => name), blockers,
    siteUpdate: 'not performed', production: 'unverified', published: false,
    next: publication === 'overdue'
      ? 'Use reviewed static publication with the original publishAt; do not bypass future-only staging.'
      : registered
        ? 'Local registration is not deployment evidence. Complete reviewed shipping and verify the production article and media; the scheduled pointer need not move to this historical edition.'
        : 'Local metadata is not deployment evidence. Complete reviewed shipping and verify the production locator and publishAt before calling scheduling complete.',
  };
}

export async function inspectDraft(root, manifestPath) {
  const spec = await inspectCandidate(root, manifestPath);
  const active = await createScheduledReleaseTools({ root }).verifyGeneratedRelease();
  return reportPreparation(root, spec, active);
}

export async function updateDraft(root, manifestPath, stage = false) {
  if (!stage) return inspectDraft(root, manifestPath);
  const spec = await inspectCandidate(root, manifestPath);
  const tools = createScheduledReleaseTools({ root });
  // Only explicit staging may defer the old package's static-duplicate scan.
  // Source/hash/inventory checks still run; core staging enforces old promotion.
  await tools.verifyGeneratedRelease({ checkStaticDuplicates: false });
  if (!spec.media.some(({ path: name }) => /\.(pdf|pptx)$/.test(name))) throw new Error('Downloadable deck required before staging');
  await tools.stageRelease(manifestPath);
  const staged = await tools.verifyGeneratedRelease();
  const report = await reportPreparation(root, spec, staged);
  return { ...report, mode: 'staged', siteUpdate: 'scheduled package locally staged; production unverified', releaseRevision: staged.releaseRevision };
}

export async function main(args) {
  const [command, first, second, ...rest] = args;
  if (command === 'new' && first && second && rest.length <= 1 && (!rest.length || ['--write', '--dry-run'].includes(rest[0]))) {
    console.log(JSON.stringify(await newDraft(repositoryRoot, first, second, rest[0] === '--write'), null, 2));
  } else if (command === 'update' && first && rest.length === 0 && (second === undefined || ['--dry-run', '--stage'].includes(second))) {
    const candidate = await inspectCandidate(repositoryRoot, first);
    const preflight = execFileSync(process.execPath, [path.join(repositoryRoot, 'scripts/update-site-preflight.mjs'), '--as-of', candidate.publishAt.slice(0, 10), '--json'], { encoding: 'utf8' });
    const report = await updateDraft(repositoryRoot, first, second === '--stage');
    console.log(JSON.stringify({ ...report, sitePreflight: JSON.parse(preflight) }, null, 2));
    if (report.blockers.length) process.exitCode = 2;
  } else {
    throw new Error('Usage: blog-edition.mjs new YYYY-MM-DD topic [--dry-run|--write] | update src/articles/drafts/DATE-topic.release.json [--dry-run|--stage]');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
