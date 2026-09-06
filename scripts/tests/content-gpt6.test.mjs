import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import {
  latestBriefingModelIds,
  modelBenchmarkDefinitions,
  modelWatchModels,
  modelWatchSnapshots,
} from '../../src/data/modelWatch.ts';

const releaseUrl = 'https://openai.com/index/gpt-6-astra/';
const root = fileURLToPath(new URL('../../', import.meta.url));
let server;

before(async () => {
  // Transform the real page and timeline modules without opening a listener or
  // writing Vite's cache through a shared node_modules symlink.
  server = await createServer({
    root,
    configFile: false,
    plugins: [react()],
    cacheDir: `${root}dist/.gpt6-test-cache`,
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
});
after(async () => { await server?.close(); });

function astra() {
  const matches = modelWatchModels.filter((model) => model.id === 'gpt-6-astra');
  assert.equal(matches.length, 1, 'one canonical curated model');
  return matches[0];
}

async function renderPage(name) {
  const { default: Page } = await server.ssrLoadModule(`/src/pages/${name}.tsx`);
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page)));
}

test('GPT-6 Astra carries the primary-verified September 3 release identity', () => {
  const model = astra();
  assert.equal(model.name, 'GPT-6 Astra');
  assert.equal(model.provider, 'OpenAI');
  assert.equal(model.releaseDate, 'Sep 3, 2026');
  assert.equal(model.releaseDateSort, '2026-09-03');
  assert.equal(model.sourceUrl, releaseUrl);
  assert.match(model.description, /staged rollout/);
  const signals = modelWatchSnapshots.filter((signal) => signal.url === releaseUrl);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].model, model.name);
  assert.equal(signals[0].date, model.releaseDate);
  assert.ok(modelWatchSnapshots.slice(0, 6).includes(signals[0]), 'visible Latest Signals window');
});

test('standard token prices retain source, units and full-request >272K qualification', () => {
  const { benchmarks, description } = astra();
  assert.equal(benchmarks.inputCost.value, 10);
  assert.equal(benchmarks.outputCost.value, 50);
  for (const key of ['inputCost', 'outputCost']) {
    const note = benchmarks[key].note;
    assert.match(note, /Standard USD per 1M tokens/);
    assert.match(note, /Prompts over 272K input tokens/);
    assert.match(note, /for the full request/);
    assert.match(note, /Other processing tiers differ/);
    assert.ok(note.includes('https://developers.openai.com/api/docs/pricing.md'));
    assert.ok(note.includes('https://developers.openai.com/api/docs/models/gpt-6-astra.md'));
  }
  assert.match(benchmarks.inputCost.note, /Cached input \$1\./);
  assert.match(benchmarks.inputCost.note, /\$20 input \/ \$2 cached input/);
  assert.match(benchmarks.outputCost.note, /\$75 output/);
  assert.match(description, /\$10 input \/ \$1 cached input \/ \$50 output per 1M tokens/);
});

test('unknown performance metrics remain absent, never fabricated as zero', () => {
  const { benchmarks } = astra();
  assert.deepEqual(Object.keys(benchmarks).sort(), ['inputCost', 'outputCost']);
  for (const { key } of modelBenchmarkDefinitions) {
    if (key !== 'inputCost' && key !== 'outputCost') {
      assert.equal(benchmarks[key], undefined, `${key} must remain unreported`);
    }
  }
});

test('real Model Watch renders Astra in signals and releases, not the historical briefing', async () => {
  assert.deepEqual([...latestBriefingModelIds], [
    'glm-5-3', 'nemotron-3-5-lightning', 'gemini-3-7-flash', 'muse-spark-1-2',
    'grok-4-6', 'qwen-3-8-27b', 'muse-glimmer', 'gpt-5-6-sol', 'gpt-5-6-luna',
    'qwen-image-3-0', 'weather-next-cyclones',
  ], 'this release must not rewrite the existing edition membership');
  const html = await renderPage('ModelWatch');
  for (const heading of ['snapshot-heading', 'models-heading']) {
    const section = html.match(new RegExp(`<section[^>]*aria-labelledby="${heading}"[\\s\\S]*?</section>`));
    assert.ok(section, heading);
    assert.match(section[0], /GPT-6 Astra/);
    if (heading === 'snapshot-heading') assert.ok(section[0].includes(releaseUrl));
    else assert.match(section[0], /dateTime="2026-09-03"/);
  }
  const briefing = html.match(/<section[^>]*aria-labelledby="briefing-models-heading"[\s\S]*?<\/section>/);
  assert.ok(briefing);
  assert.doesNotMatch(briefing[0], /GPT-6 Astra/);
});

test('Model Watch labels the detector timestamp as a source snapshot, not editorial review', async () => {
  const html = await renderPage('ModelWatch');
  assert.match(html, /<span>Source<\/span><p>snapshot<\/p>/);
  const signals = html.match(/<section[^>]*aria-labelledby="snapshot-heading"[\s\S]*?<\/section>/);
  assert.ok(signals);
  assert.match(signals[0], /Source snapshot /);
  assert.doesNotMatch(html, /Reviewed snapshot|snapshot publication|<span>Reviewed<\/span>/);
});

test('real leaderboard renders Astra unranked with no performance score', async () => {
  const html = await renderPage('Leaderboard');
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  const matches = rows.filter((row) => row.includes('<strong>GPT-6 Astra</strong>'));
  assert.equal(matches.length, 1);
  assert.match(matches[0], /leaderboard-rank-cell"><span>N\/A<\/span>/);
  assert.match(matches[0], /leaderboard-score is-empty">N\/A<\/span>/);
  assert.ok(matches[0].includes(releaseUrl));
});

test('existing timeline generation produces one sourced Astra release without a manual duplicate', async () => {
  const { timelineEvents } = await server.ssrLoadModule('/src/data/timeline.ts');
  const matches = timelineEvents.filter((event) => (
    event.id === 'model-watch-gpt-6-astra'
    || event.title === 'GPT-6 Astra'
    || event.sourceUrl.replace(/\/$/, '') === releaseUrl.replace(/\/$/, '')
  ));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'model-watch-gpt-6-astra');
  assert.equal(matches[0].date, '2026-09-03');
  assert.equal(matches[0].category, 'Model release');
  assert.equal(matches[0].organization, 'OpenAI');
  assert.equal(matches[0].sourceUrl, releaseUrl);
});
