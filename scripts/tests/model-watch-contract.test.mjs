import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { modelWatchSources, seedModels } from '../model-watch-sources.mjs';

const [models, workflow, editorGuide, claudeEditorGuide, createPostGuide, releaseWorkflow, updater] = await Promise.all([
  readFile(new URL('../../src/data/modelWatch.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../.github/workflows/model-watch.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/blog-editor.md', import.meta.url), 'utf8'),
  readFile(new URL('../../.claude/skills/blog-editor/SKILL.md', import.meta.url), 'utf8'),
  readFile(new URL('../../.codex/skills/create-blog-post/SKILL.md', import.meta.url), 'utf8'),
  readFile(new URL('../../.codex/skills/create-blog-post/references/longmontai-release-workflow.md', import.meta.url), 'utf8'),
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
for (const [name, guide] of [
  ['docs/blog-editor.md', editorGuide],
  ['.claude blog-editor skill', claudeEditorGuide],
  ['create-blog-post skill', createPostGuide],
  ['release workflow reference', releaseWorkflow],
]) {
  assert.match(guide, /npm run model-watch:update/, `${name} must require model-watch:update`);
  assert.match(guide, /\/model-watch/, `${name} must review Model Watch`);
  assert.match(guide, /\/leaderboard/, `${name} must review the leaderboard`);
  assert.match(guide, /\/timeline/, `${name} must review the timeline`);
  assert.match(guide, /Star Text/, `${name} must review hidden header Star Text`);
  assert.match(guide, /for each(?: of the four)? surface/i, `${name} must record every surface individually`);
  assert.match(guide, /individual updated\s+or no-change-needed\s+result/, `${name} must record per-surface status`);
  assert.match(guide, /primary-source evidence/, `${name} must require primary-source verification`);
  assert.match(guide, /no-change-needed/, `${name} must permit recorded no-change-needed decisions`);
  assert.match(guide, /latestBriefingModelIds/, `${name} must mention briefing membership`);
  assert.match(guide, /comparable/, `${name} must preserve benchmark comparability`);
  assert.match(guide, /auto-generation/, `${name} must distinguish timeline generation`);
  assert.match(guide, /bounded\s+read-only\s+subagent/i, `${name} must use a bounded read-only Star Text subagent`);
  assert.match(guide, /propose\s+10[–-]25\s+timely\s+words\s+or\s+short\s+phrases/i, `${name} must bound Star Text proposals to 10–25 words or short phrases`);
  assert.match(guide, /only\s+in\s+that\s+edition's\s+verified\s+primary-source\s+ledger/i, `${name} must ground Star Text proposals only in the edition's verified primary-source ledger`);
  assert.match(guide, /parent\/editor\s+independently\s+verifies\s+every\s+proposal\s+against\s+that\s+ledger/i, `${name} must require independent parent/editor verification of every Star Text proposal`);
  assert.match(guide, /selects\s+and\s+stores\s+10[–-]25/i, `${name} must require parent/editor selection and storage of 10–25 Star Text entries`);
}
assert.match(updater, /Required Model Watch sources failed/);

console.log('model watch contract: PASS');
