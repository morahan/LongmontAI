import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { makeWorkspace, manifestPath, mutateJson, loadStager, TEST_NOW } from './fixtures/scheduled/contract-harness.mjs';

test('text-only scheduled releases require explicit opt-in and have no private media', async () => {
  const root = await makeWorkspace();
  try {
    const manifest = manifestPath(root);
    const source = JSON.parse(await readFile(manifest, 'utf8'));
    const article = join(root, source.article);
    await writeFile(article, (await readFile(article, 'utf8')).replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/\{\{slideshow:[^}]+\}\}/g, ''));
    await mutateJson(manifest, (value) => { delete value.slideshow; delete value.slideshowId; });
    const stage = await loadStager();
    await assert.rejects(stage({ root, manifest, now: TEST_NOW }), /text-only editions must explicitly declare textOnly/);
    await mutateJson(manifest, (value) => { value.textOnly = 'true'; });
    await assert.rejects(stage({ root, manifest, now: TEST_NOW }), /textOnly must be a boolean/);
    await mutateJson(manifest, (value) => { value.textOnly = true; });
    const result = await stage({ root, manifest, now: TEST_NOW });
    assert.equal(result.slideshow, null);
    assert.deepEqual(result.media, {});
    await mutateJson(manifest, (value) => { value.slideshow = source.slideshow; });
    await assert.rejects(stage({ root, manifest, now: TEST_NOW }), /text-only editions cannot declare private media or a slideshow/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
