import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { countDistinctModels, modelIdentityKey } from '../../src/lib/modelWatchPresentation.ts';

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
