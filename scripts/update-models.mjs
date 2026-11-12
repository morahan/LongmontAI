import { readFile, writeFile, rename, lstat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const day = 86400000;
export const weights = { frontier: 7, pareto: 5, decision: 3, world: 3, science: 3, audio: 3, image: 3, video: 3, tools: 2, new: 1.5, base: 1 };
export const windows = { standard: 45, frontier: 60 };
const categories = ['base', 'decision', 'world', 'science', 'audio', 'image', 'video', 'tools'];
export function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error(`Invalid date: ${value}`);
  return time;
}
function source(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid source URL');
  const url = new URL(value);
  const hosts = ['anthropic.com', 'openai.com', 'x.ai', 'google', 'deepseek.com', 'typesafe.ai', 'cloudflare.com', 'pi.dev', 'github.com', 'worldlabs.ai', 'fb.com', 'z.ai', 'ibm.com', 'tencent.com', 'longmont.ai', 'meta.ai', 'mistral.ai', 'thinkingmachines.ai', 'huggingface.co', 'fish.audio', 'suno.com', 'acemusic.ai'];
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error('Sources must use an approved primary HTTPS host');
}
export function compileCatalog(ledger, asOf) {
  const now = dateValue(asOf);
  if (ledger.version !== 1 || !Array.isArray(ledger.entries)) throw new Error('Invalid ledger');
  const ids = new Set(), names = new Set();
  const reviewed = ledger.entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid ledger entry');
    const { id, phrase, provider, category, priorities, releaseDate, reviewedAt, sourceUrl, availability, disposition, reason } = entry;
    const validText = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit && ![...value].some((character) => character.charCodeAt(0) < 32);
    if (!validText(id, 100) || !/^[a-z0-9-]+$/.test(id) || !validText(phrase, 40) || !/^[A-Za-z0-9 .-]+$/.test(phrase) || !validText(provider, 100) || !validText(availability, 300) || !validText(reason, 1000)) throw new Error(`Invalid identity: ${id}`);
    const normalized = phrase.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized || ['longmontai', '1023digital'].includes(normalized)) throw new Error(`Reserved or empty phrase: ${phrase}`);
    if (ids.has(id) || names.has(normalized)) throw new Error(`Duplicate identity: ${id}`);
    ids.add(id); names.add(normalized);
    if (!['include', 'hold', 'remove'].includes(disposition) || !categories.includes(category) || !Array.isArray(priorities) || priorities.some((p) => !['frontier', 'pareto'].includes(p))) throw new Error(`Invalid classification: ${id}`);
    source(sourceUrl);
    const review = dateValue(reviewedAt);
    const release = releaseDate === null && disposition === 'remove' ? null : dateValue(releaseDate);
    return { entry, review, ageDays: release === null ? null : (now - release) / day };
  });
  const successors = new Map();
  for (const { entry, ageDays } of reviewed) {
    if (entry.supersedes === undefined) continue;
    if (entry.supersedes === entry.id || !ids.has(entry.supersedes)) throw new Error(`Unknown superseded identity: ${entry.id}`);
    if (entry.disposition === 'include' && ageDays >= 0) successors.set(entry.supersedes, entry.phrase);
  }
  const entries = reviewed.map(({ entry, review, ageDays }) => {
    const { id, category, priorities, disposition, reason } = entry;
    const limit = priorities.includes('frontier') ? windows.frontier : windows.standard;
    const eligibility = disposition !== 'include' ? `${disposition}: ${reason}`
      : successors.has(id) ? `hold: superseded by ${successors.get(id)}`
      : review > now ? 'hold: review is after snapshot date'
      : now - review > 30 * day ? 'hold: source review is older than 30 days'
      : ageDays < 0 ? 'hold: release is after snapshot date'
      : ageDays > limit ? `hold: older than ${limit} days`
      : 'include';
    const isNew = ageDays !== null && ageDays >= 0 && ageDays <= 30;
    const weight = eligibility === 'include' ? Math.max(weights[category], ...priorities.map((p) => weights[p]), isNew ? weights.new : 1) : 0;
    return { ...entry, ageDays, isNew, eligibility, weight, weightUnits: weight * 2 };
  });
  const totalWeightUnits = entries.reduce((sum, entry) => sum + entry.weightUnits, 0);
  if (!totalWeightUnits) throw new Error('No eligible models; previous snapshot preserved');
  return { asOf, totalWeightUnits, entries: entries.map((entry) => ({ ...entry, probability: entry.weightUnits / totalWeightUnits * 50 })) };
}
export function renderCatalog(catalog) {
  return `// Generated by just update-models. Source reviews are never advanced by generation.\nexport const modelCatalog = ${JSON.stringify(catalog, null, 2)} as const;\n`;
}
export function matrix(catalog) {
  const header = '| Text | Category | Priority | Released | Reviewed | Access | Supersedes | Weight | Probability | Disposition | Sources |';
  const rows = catalog.entries.map((e) => [e.phrase, e.category, e.priorities.join(', ') || '-', e.releaseDate || '-', e.reviewedAt, e.availability, e.supersedes ?? '-', `${e.weight}x`, `${e.probability.toFixed(4)}%`, e.eligibility === 'include' ? e.reason : e.eligibility, e.sourceUrl]);
  return [`Snapshot: ${catalog.asOf} (UTC)`, header, '|---|---|---|---|---|---|---|---|---|---|---|', '| Longmont.AI | fixed | permanent | - | - | - | - | fixed | 35% | permanent | - |', '| 1023.Digital | fixed | permanent | - | - | - | - | fixed | 15% | permanent | - |', ...rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll('|', '/').replaceAll('\n', ' ')).join(' | ')} |`)].join('\n');
}
export async function main(args) {
  let asOf = new Date().toISOString().slice(0, 10), check = false, showMatrix = false, discover = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--as-of') asOf = args[++i];
    else if (args[i] === '--check') check = true;
    else if (args[i] === '--matrix') showMatrix = true;
    else if (args[i] === '--discover') discover = true;
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  if (dateValue(asOf) > dateValue(new Date().toISOString().slice(0, 10))) throw new Error('Future snapshot dates are not allowed');
  if (check && discover) throw new Error('--check cannot run discovery');
  if (discover) {
    console.log('Discovery produces unreviewed leads only; it does not change the reviewed catalog.');
    const result = spawnSync(process.execPath, ['scripts/update-model-watch.mjs'], { cwd: fileURLToPath(root), stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Unreviewed discovery failed');
    return;
  }
  const ledger = JSON.parse(await readFile(new URL('content/models/catalog.json', root), 'utf8'));
  const catalog = compileCatalog(ledger, asOf);
  const output = new URL('src/data/modelCatalog.generated.ts', root);
  for (const path of [new URL('src/', root), new URL('src/data/', root), output]) {
    const info = await lstat(path).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
    if (info?.isSymbolicLink()) throw new Error('Catalog output must not use symbolic links');
  }
  const expected = renderCatalog(catalog);
  const existing = await readFile(output, 'utf8').catch((error) => { if (error.code === 'ENOENT') return ''; throw error; });
  if (showMatrix) console.log(matrix(catalog));
  if (check) {
    if (existing !== expected) throw new Error('Reviewed catalog snapshot is stale; run just update-models');
  } else if (existing !== expected) {
    const temporary = new URL(`src/data/.modelCatalog-${randomUUID()}.tmp`, root);
    try {
      await writeFile(temporary, expected, { flag: 'wx' });
      await rename(temporary, output);
    } finally {
      await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  console.log(`${check ? 'Checked' : 'Regenerated'} reviewed snapshot ${asOf}: ${catalog.entries.filter((e) => e.weight > 0).length} shared entries. No new release research was performed.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
