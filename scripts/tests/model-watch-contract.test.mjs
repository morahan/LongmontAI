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

assert.match(workflow, /cron: "17 13 \* \* \*"/);
assert.doesNotMatch(workflow, /cron: "17 13 \* \* 1"/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /permissions: \{\}/);
assert.match(workflow, /needs: generate/);
assert.match(workflow, /contents: read/);
assert.match(workflow, /npm run lint\s+npm run build/);
assert.match(workflow, /add-paths: src\/data\/modelWatch.generated.json/);
assert.match(workflow, /peter-evans\/create-pull-request@/);
const workflowSteps = workflow.match(/^ {6}- [^\n]*(?:\n(?: {7,}[^\n]*|[ \t]*))*/gm) || [];
const checkoutSteps = workflowSteps.filter((step) => /\buses: actions\/checkout@/.test(step));
assert.ok(checkoutSteps.length > 0, 'workflow must contain checkout steps');
for (const step of checkoutSteps) {
  assert.match(step, /^ {8}uses: actions\/checkout@[a-f0-9]{40}(?:\s+#.*)?$/m, 'checkout must be pinned');
  const settings = [...step.matchAll(/^\s+persist-credentials:\s*([^\n]*)$/gm)];
  assert.equal(settings.length, 1, 'each checkout must explicitly define credential persistence once');
  assert.equal(settings[0][1].trim(), 'false', 'each checkout must disable credential persistence');
}
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

const apiSource = await readFile(new URL('../../api/model-watch.mjs', import.meta.url), 'utf8');
assert.match(apiSource, /import snapshot from '\.\.\/src\/data\/modelWatch\.generated\.json' with \{ type: 'json' \}/);
assert.equal((apiSource.match(/\bimport\b/g) || []).length, 1, 'snapshot must be the only API import');
assert.doesNotMatch(apiSource, /model-watch-sources|\bfetch\s*\(|readFile|new Date/);
const expectedSnapshot = JSON.parse(await readFile(new URL('../../src/data/modelWatch.generated.json', import.meta.url), 'utf8'));
assert.deepEqual(Object.keys(expectedSnapshot).sort(), ['checkedAt', 'detectedModels', 'successfulSources', 'totalSources']);
assert.equal(typeof expectedSnapshot.checkedAt, 'string');
assert.ok(Number.isFinite(Date.parse(expectedSnapshot.checkedAt)));
assert.equal(typeof expectedSnapshot.successfulSources, 'number');
assert.equal(typeof expectedSnapshot.totalSources, 'number');
assert.ok(Array.isArray(expectedSnapshot.detectedModels));
assert.ok(expectedSnapshot.detectedModels.every((model) => typeof model === 'string'));

// Install before importing the API, covering module initialization as well as invocation.
const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
globalThis.fetch = () => {
  upstreamCalls += 1;
  throw new Error('Model Watch API must not perform upstream requests');
};
try {
  const { default: handler } = await import('../../api/model-watch.mjs');
  for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE', 'CONNECT', 'get', undefined]) {
    for (const url of ['/api/model-watch', '/api/model-watch?cacheBust=1', '/api/model-watch?source=https%3A%2F%2Funtrusted.example&refresh=true']) {
      const response = {
        statusCode: null, headers: {}, body: undefined, ended: false,
        setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; this.ended = true; return this; },
        end() { this.ended = true; return this; },
      };
      const request = { method, url, get body() { assert.fail('API must not inspect a request body'); } };
      await handler(request, response);
      assert.equal(response.ended, true);
      assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
      if (method === 'GET' || method === 'HEAD') {
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['cache-control'], 'public, s-maxage=86400, stale-while-revalidate=604800');
        assert.equal(response.headers.allow, undefined);
        if (method === 'HEAD') assert.equal(response.body, undefined);
        else assert.deepEqual(response.body, expectedSnapshot, 'must preserve tracked snapshot including actual checkedAt');
      } else {
        assert.equal(response.statusCode, 405);
        assert.equal(response.headers.allow, 'GET, HEAD');
        assert.equal(response.headers['cache-control'], 'no-store');
        assert.deepEqual(response.body, { ok: false, error: 'method_not_allowed' });
      }
      assert.equal(upstreamCalls, 0);
    }
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log('model watch contract: PASS');
