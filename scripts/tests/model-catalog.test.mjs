import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compileCatalog, dateValue, renderCatalog, matrix } from '../update-models.mjs';
import { modelCatalog } from '../../src/data/modelCatalog.generated.ts';
import { activeModelWatchModels, latestBriefingModelIds, modelWatchArchive, modelWatchModels } from '../../src/data/modelWatch.ts';
import { STAR_TEXT_ALTERNATIVES, STAR_TEXT_EDITION } from '../../src/data/starText.ts';
import { CONSTELLATION_BUCKET_COUNT, getConstellationPhraseForBucket, selectConstellationPhrase, EASTER_EGG_PHRASES, selectEasterEggPhrase } from '../../src/components/spaceBackgroundModel.ts';

const ledger = JSON.parse(await readFile(new URL('../../content/models/catalog.json', import.meta.url), 'utf8'));
const fixture = (change = {}) => ({ version: 1, entries: [{ ...ledger.entries.find((e) => e.id === 'claude-opus-5-5'), ...change }] });

test('shared consumers match generated eligible identities and preserve all archived benchmark evidence', () => {
  const entries = modelCatalog.entries.filter((e) => e.weightUnits > 0);
  assert.deepEqual(latestBriefingModelIds, entries.map((e) => e.id));
  assert.deepEqual(activeModelWatchModels.map((e) => e.name), STAR_TEXT_ALTERNATIVES.map((e) => e.phrase));
  assert.equal(new Set(modelWatchModels.map((e) => e.id)).size, modelWatchModels.length);
  for (const old of modelWatchArchive) assert.deepEqual(modelWatchModels.find((e) => e.id === old.id).benchmarks, old.benchmarks);
  assert.equal(renderCatalog(compileCatalog(ledger, modelCatalog.asOf)), renderCatalog(modelCatalog));
  assert.ok(STAR_TEXT_EDITION.reviewedOn <= modelCatalog.asOf);
});

test('inclusive 30 day UTC eligibility, future dates, stale reviews and sourced exceptions', () => {
  assert.equal(compileCatalog(fixture({ releaseDate: '2026-09-10' }), '2026-10-10').entries[0].ageDays, 30);
  assert.throws(() => compileCatalog(fixture({ releaseDate: '2026-09-09' }), '2026-10-10'), /No eligible/);
  const exception = { reason: 'Current category frontier', sourceUrl: 'https://www.anthropic.com/claude/fable', reviewedAt: '2026-10-10' };
  assert.equal(compileCatalog(fixture({ releaseDate: '2025-01-01', frontierException: exception }), '2026-10-10').entries[0].weight, 7);
  assert.throws(() => compileCatalog(fixture({ releaseDate: '2025-01-01', frontierException: { ...exception, reviewedAt: '2026-09-09' } }), '2026-10-10'), /No eligible/);
  assert.throws(() => compileCatalog(fixture({ releaseDate: '2026-10-11' }), '2026-10-10'), /No eligible/);
  assert.throws(() => compileCatalog(fixture({ reviewedAt: '2026-09-09' }), '2026-10-10'), /No eligible/);
  assert.throws(() => dateValue('2026-02-29'), /Invalid date/);
  assert.equal(dateValue('2024-03-01') - dateValue('2024-02-29'), 86400000);
});

test('highest weights never stack; every exact bucket reachable, fixed shares and alternative-only cycles', () => {
  assert.equal(compileCatalog(fixture({ category: 'world', priorities: ['pareto', 'frontier'] }), '2026-10-10').entries[0].weight, 7);
  assert.equal(compileCatalog(fixture({ category: 'tools', priorities: ['pareto'] }), '2026-10-10').entries[0].weight, 5);
  assert.equal(compileCatalog(fixture({ priorities: [] }), '2026-10-10').entries[0].weight, 1.5);
  const counts = new Map();
  for (let i = 0; i < CONSTELLATION_BUCKET_COUNT; i++) { const phrase = getConstellationPhraseForBucket(i); counts.set(phrase, (counts.get(phrase) ?? 0) + 1); }
  assert.equal(counts.get('Longmont.AI') / CONSTELLATION_BUCKET_COUNT, 0.35);
  assert.equal(counts.get('1023.Digital') / CONSTELLATION_BUCKET_COUNT, 0.15);
  for (const entry of STAR_TEXT_ALTERNATIVES) assert.equal(counts.get(entry.phrase), entry.weightUnits * 10);
  assert.equal(getConstellationPhraseForBucket(CONSTELLATION_BUCKET_COUNT), 'Longmont.AI');
  assert.equal(getConstellationPhraseForBucket(-1), STAR_TEXT_ALTERNATIVES.at(-1).phrase);
  const seen = new Set(Array.from({ length: 10000 }, (_, event) => { const value = selectConstellationPhrase(1023, event); assert.equal(value, selectConstellationPhrase(1023, event)); return value; }));
  assert.equal(seen.size, counts.size);
  const cycle = Array.from({ length: EASTER_EGG_PHRASES.length }, (_, i) => selectEasterEggPhrase(7, i));
  assert.equal(new Set(cycle).size, EASTER_EGG_PHRASES.length);
  assert.ok(!cycle.includes('Longmont.AI') && !cycle.includes('1023.Digital'));
});

test('invalid ledger fails closed and matrix retains held/removed identities and sources', () => {
  for (const sourceUrl of ['javascript:alert(1)', 'https://localhost/', 'https://127.0.0.1/', 'https://user:pass@openai.com/']) assert.throws(() => compileCatalog(fixture({ sourceUrl }), '2026-10-10'));
  for (const phrase of ['Longmont.AI', 'LONGMONT AI', '1023.Digital', '   ', '...']) assert.throws(() => compileCatalog(fixture({ phrase }), '2026-10-10'));
  for (const change of [{ provider: {} }, { availability: [] }, { reason: {} }, { phrase: 'X'.repeat(100) }]) assert.throws(() => compileCatalog(fixture(change), '2026-10-10'));
  assert.throws(() => compileCatalog({ version: 1, entries: [...fixture().entries, ...fixture().entries] }, '2026-10-10'), /Duplicate/);
  const report = matrix(modelCatalog);
  for (const entry of ledger.entries) { assert.ok(report.includes(entry.phrase)); assert.ok(report.includes(entry.sourceUrl)); }
  assert.match(report, /Longmont.AI.*35%/);
});

test('real CLI is idempotent, no-write check detects drift, malformed input preserves output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'longmont-model-cli-'));
  try {
    const sentinel = join(dir, 'shell-expansion');
    const unsafeArgument = `2026-10-10; touch ${sentinel}`;
    const quoted = spawnSync('just', ['update-models', '--as-of', unsafeArgument], { encoding: 'utf8' });
    assert.notEqual(quoted.status, 0);
    assert.match(quoted.stderr, /Invalid date/);
    await assert.rejects(access(sentinel));
    for (const folder of ['scripts', 'content/models', 'src/data']) await mkdir(join(dir, folder), { recursive: true });
    await writeFile(join(dir, 'scripts/update-models.mjs'), await readFile(new URL('../update-models.mjs', import.meta.url)));
    const ledgerPath = join(dir, 'content/models/catalog.json');
    const output = join(dir, 'src/data/modelCatalog.generated.ts');
    await writeFile(ledgerPath, JSON.stringify(ledger));
    const run = (...args) => spawnSync(process.execPath, [join(dir, 'scripts/update-models.mjs'), '--as-of', '2026-10-10', ...args], { encoding: 'utf8' });
    assert.equal(run().status, 0);
    const baseline = await readFile(output, 'utf8');
    assert.equal(run().status, 0);
    assert.equal(await readFile(output, 'utf8'), baseline);
    assert.equal(run('--check').status, 0);
    await writeFile(output, 'drift');
    assert.equal(run('--check').status, 1);
    assert.equal(await readFile(output, 'utf8'), 'drift');
    await writeFile(output, baseline);
    await writeFile(ledgerPath, '{broken');
    assert.equal(run().status, 1);
    assert.equal(await readFile(output, 'utf8'), baseline);
    assert.equal(run('--unknown').status, 1);
    assert.equal(run('--as-of', '2999-01-01').status, 1);
    assert.equal(await readFile(output, 'utf8'), baseline);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
