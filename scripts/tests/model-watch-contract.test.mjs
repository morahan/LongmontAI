import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { modelWatchSources, seedModels } from '../model-watch-sources.mjs';

const [models, workflow, editorGuide, updater] = await Promise.all([
  readFile(new URL('../../src/data/modelWatch.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../.github/workflows/model-watch.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/blog-editor.md', import.meta.url), 'utf8'),
  readFile(new URL('../update-model-watch.mjs', import.meta.url), 'utf8'),
]);

assert.ok(modelWatchSources.some((source) => source.company === 'Meta AI' && source.url === 'https://ai.meta.com/blog/' && source.required));
assert.ok(modelWatchSources.some((source) => source.company === 'Moonshot AI / Kimi' && source.url === 'https://www.moonshot.cn/en' && source.required));
assert.ok(seedModels.includes('Muse Spark 1.1'));
assert.ok(seedModels.includes('Muse Spark 1.2'));
assert.ok(seedModels.includes('GLM-5.3'));
assert.ok(seedModels.includes('Nemotron 3.5 Lightning'));
assert.ok(seedModels.includes('Qwen-Image 3.0'));
assert.ok(seedModels.includes('Kimi K3'));
assert.match(models, /id: 'muse-spark-1-1'/);
assert.match(models, /id: 'muse-spark-1-2'/);
assert.match(models, /id: 'glm-5-3'/);
assert.match(models, /id: 'nemotron-3-5-lightning'/);
assert.match(models, /id: 'qwen-image-3-0'/);
assert.match(models, /id: 'weather-next-cyclones'/);
assert.match(models, /latestBriefingModelIds/);
assert.match(models, /id: 'kimi-k3'/);

const snapshotsBlock = models.match(/export const modelWatchSnapshots: ModelWatchSnapshot\[\] = \[([\s\S]*?)\n\];/);
assert.ok(snapshotsBlock, 'modelWatchSnapshots export should remain parseable by the contract test');
const snapshotIdentities = [...snapshotsBlock[1].matchAll(
  /\{\s*company: '([^']+)',[\s\S]*?\n\s*date: '([^']+)',[\s\S]*?\n\s*url: '([^']+)',\s*\n\s*\}/g,
)].map(([, company, date, url]) => `${company}\u0000${date}\u0000${url}`);
assert.ok(snapshotIdentities.length > 0, 'contract test should extract model watch snapshot identities');
const duplicateSnapshotIdentities = snapshotIdentities.filter(
  (identity, index) => snapshotIdentities.indexOf(identity) !== index,
);
assert.deepEqual(
  duplicateSnapshotIdentities,
  [],
  `model watch snapshots must not repeat a company/date/source event: ${duplicateSnapshotIdentities.join(', ')}`,
);

assert.match(workflow, /cron: "17 13 \* \* 1"/);
assert.match(editorGuide, /npm run model-watch:update/);
assert.match(updater, /Required Model Watch sources failed/);

console.log('model watch contract: PASS');
