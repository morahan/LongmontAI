#!/usr/bin/env node
import { readFile, writeFile, mkdir, mkdtemp, rename, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentSources, seedModels } from './model-watch-sources.mjs';
import { collectContent, publicationDate } from './lib/content/collector.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const TRUSTED_PATHS = ['src/data/modelWatch.generated.json', 'content/review/latest.json'];
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function optionalJson(filename, { corruptAsMissing = false } = {}) {
  try { return JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT' || (corruptAsMissing && error instanceof SyntaxError)) return null;
    throw new Error(`Invalid local JSON: ${path.basename(filename)}`);
  }
}

async function safeDestination(root, relative) {
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error('Output escapes root');
  let current = path.resolve(root);
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Output symlinks are not allowed'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return absolute;
}

async function replaceFile(root, relative, text) {
  const filename = await safeDestination(root, relative);
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, text, { flag: 'wx' });
    await rename(temporary, filename);
  } finally { await rm(temporary, { force: true }); }
}

// Stage every new byte and backup before promotion. Roll back caught promotion failures.
// A process/host crash cannot make several paths atomically visible; retain the journal
// for manual recovery and refuse another run until it has been reconciled.
async function publishTransaction(root, outputs, changed, operations = {}) {
  if (!changed.length) return;
  const base = await safeDestination(root, 'output/content-automation');
  await mkdir(base, { recursive: true });
  const journalPath = path.join(base, 'transaction.json');
  const directory = await mkdtemp(path.join(base, 'transaction-'));
  const entries = [];
  let journalWritten = false;
  const promoted = [];
  try {
    for (const [index, relative] of changed.entries()) {
      const destination = await safeDestination(root, relative);
      const staged = path.join(directory, `${index}.new`);
      const backup = path.join(directory, `${index}.old`);
      let original;
      try { original = await readFile(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await (operations.stageWrite ?? writeFile)(staged, outputs.get(relative), { flag: 'wx' });
      if (original !== undefined) await writeFile(backup, original, { flag: 'wx' });
      entries.push({ relative, staged, backup: original === undefined ? null : backup });
    }
    await writeFile(journalPath, json({ version: 1, entries }), { flag: 'wx' });
    journalWritten = true;
    for (const entry of entries) {
      const destination = await safeDestination(root, entry.relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await (operations.promoteRename ?? rename)(entry.staged, destination);
      promoted.push(entry);
    }
  } catch (error) {
    try {
      for (const entry of promoted.reverse()) {
        const destination = await safeDestination(root, entry.relative);
        if (entry.backup) await rename(entry.backup, destination);
        else await rm(destination, { force: true });
      }
    } catch {
      throw new Error('Content transaction rollback failed; preserve transaction.json and backup directory for manual recovery.');
    }
    if (journalWritten) await rm(journalPath);
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  await rm(journalPath);
  await rm(directory, { recursive: true, force: true });
}

export async function runUpdate({ root = ROOT, now = new Date(), sources = contentSources, seeds = seedModels, fetchImpl = fetch, timeoutMs, maxBytes, transactionOperations } = {}) {
  const journal = await safeDestination(root, 'output/content-automation/transaction.json');
  try { await lstat(journal); throw new Error('Unresolved content transaction; restore backups or verify outputs before manual journal cleanup.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const cachePath = 'output/content-automation/cache.json';
  const healthPath = 'output/content-automation/health.json';
  for (const relative of [...TRUSTED_PATHS, cachePath, healthPath]) await safeDestination(root, relative);
  const [previous, cache, snapshot] = await Promise.all([
    optionalJson(path.join(root, TRUSTED_PATHS[1])),
    optionalJson(path.join(root, cachePath), { corruptAsMissing: true }),
    optionalJson(path.join(root, TRUSTED_PATHS[0])),
  ]);
  if (snapshot && (!Number.isFinite(Date.parse(snapshot.checkedAt)) || !Array.isArray(snapshot.detectedModels) || snapshot.detectedModels.some((name) => typeof name !== 'string' || !name.trim() || name.length > 200) || !Number.isInteger(snapshot.successfulSources) || !Number.isInteger(snapshot.totalSources))) throw new Error('Invalid trusted Model Watch snapshot');
  const result = await collectContent({ sources, previous, cache: cache && typeof cache === 'object' ? cache : {}, snapshot, seeds, now, fetchImpl, timeoutMs, maxBytes });
  await replaceFile(root, healthPath, json(result.health));
  await replaceFile(root, cachePath, json(result.cache));
  if (!result.ok) {
    // Required Model Watch sources failed: leave every trusted artifact byte intact.
    return { ok: false, changed: [], health: result.health, error: 'Required Model Watch sources failed; trusted outputs preserved.' };
  }
  const outputs = new Map([[TRUSTED_PATHS[0], json(result.snapshot)], [TRUSTED_PATHS[1], json(result.latest)]]);
  if (result.period) outputs.set(`content/review/biweekly/${result.period.id}.md`, result.packet);
  const changed = [];
  // Validate every destination and candidate before the first trusted write.
  for (const [relative, text] of outputs) {
    await safeDestination(root, relative);
    if (typeof text !== 'string' || !text.endsWith('\n')) throw new Error('Invalid generated artifact');
    let old;
    try { old = await readFile(path.join(root, relative), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (old !== text) changed.push(relative);
  }
  await publishTransaction(root, outputs, changed, transactionOperations);
  return { ok: true, changed, health: result.health };
}

export async function main(args = process.argv.slice(2)) {
  let now = new Date();
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--as-of' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(args[1]) || !Number.isFinite(Date.parse(args[1]))) throw new Error('Usage: content:update [--as-of <offset-qualified ISO instant>]');
    now = new Date(publicationDate(args[1]));
  }
  const result = await runUpdate({ now });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Content intake failed; inspect local inputs and source health.'); process.exitCode = 1; });
}
