import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { countDistinctModels, modelIdentityKey } from '../../src/lib/modelWatchPresentation.ts';
import { benchmarkPosition, benchmarkRange, rankBenchmarkModels } from '../../src/lib/benchmarkRanking.ts';
import { modelBenchmarkDefinitions, modelWatchModels } from '../../src/data/modelWatch.ts';

test('model identities normalize compatibility characters, case and separators', () => {
  for (const name of [' Qwen-Image 3.0 ', 'qwen_image-3.0', 'QWEN\tIMAGE\n3.0', 'Ｑｗｅｎ－Ｉｍａｇｅ ３.０']) {
    assert.equal(modelIdentityKey(name), 'qwen image 3.0');
  }
  for (const separator of ['‐', '‑', '‒', '–', '—', '―']) {
    assert.equal(modelIdentityKey(`GLM${separator}5`), 'glm 5');
  }
  assert.equal(countDistinctModels(['glm-5', 'GLM-5', 'Qwen-Image 3.0', 'qwen_image-3.0']), 2);
});

test('blank identities do not count and distinct versions remain distinct', () => {
  assert.equal(countDistinctModels([]), 0);
  assert.equal(countDistinctModels(['', ' ', '\t\n', '__---', '—', '\u00a0']), 0);
  const names = Object.freeze(['GLM-5', 'GLM-5.1', 'GLM-5-Turbo', 'GPT-5', 'GPT-5.1']);
  assert.equal(countDistinctModels(names), 5);
  assert.equal(modelIdentityKey(modelIdentityKey(' ＧＬＭ__5 ')), 'glm 5');
});

test('Model Watch counts both static snapshot and watchlist without restoring fetching', () => {
  const page = readFileSync(new URL('../../src/pages/ModelWatch.tsx', import.meta.url), 'utf8');
  assert.match(page, /countDistinctModels\(\[\s*\.\.\.modelWatchStatus.detectedModels,\s*\.\.\.modelWatchModels.map\(\(model\) => model.name\),\s*\]\)/);
  assert.doesNotMatch(page, /fetch\(|useEffect|setLiveStatus|setSnapshotStatus/);
});

test('leaderboard ties, unavailable scores, and incomparable metrics retain honest ranks', () => {
  const cost = modelBenchmarkDefinitions.find(({ key }) => key === 'costPerTask');
  const fixtures = ['Missing', 'Zulu', 'Alpha', 'Cheap', 'Invalid'].map((name, index) => ({
    name, benchmarks: index === 0 ? {} : { costPerTask: { value: [0, 2, 2, 1, NaN][index] } },
  }));
  assert.deepEqual(rankBenchmarkModels(fixtures, cost).map(({ model, rank }) => [model.name, rank]), [
    ['Cheap', 1], ['Alpha', 2], ['Zulu', 2], ['Invalid', null], ['Missing', null],
  ]);
  assert.equal(fixtures[0].name, 'Missing');
  for (const key of ['terminalBench', 'frontierCode', 'aaIndex']) {
    const definition = modelBenchmarkDefinitions.find((entry) => entry.key === key);
    assert.equal(definition.rankable, false);
    assert.ok(modelWatchModels.some((model) => model.benchmarks[key]));
    assert.ok(rankBenchmarkModels(modelWatchModels, definition).every(({ rank }) => rank === null));
  }
  assert.equal(benchmarkRange([]), null);
  assert.deepEqual(benchmarkRange([2, 2]), { min: 2, max: 2 });
  assert.equal(benchmarkPosition(2, 2, 2), 0.5);
});
