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
assert.ok(seedModels.includes('Kimi K3'));
assert.match(models, /id: 'muse-spark-1-1'/);
assert.match(models, /id: 'kimi-k3'/);
assert.match(workflow, /cron: "17 13 \* \* 1"/);
assert.match(editorGuide, /npm run model-watch:update/);
assert.match(updater, /Required Model Watch sources failed/);

console.log('model watch contract: PASS');
