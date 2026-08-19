import assert from 'node:assert/strict';
import { cp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  FIRST_ID,
  HarnessIntegrationError,
  SECOND_ID,
  TEST_NOW,
  findGeneratedPackages,
  loadStager,
  makeWorkspace,
  manifestPath,
  mutateJson,
  promoteFirstEdition,
  snapshot,
} from './fixtures/scheduled/contract-harness.mjs';

async function withWorkspace(run) {
  const root = await makeWorkspace();
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function expectContractRejection(operation, label) {
  await assert.rejects(operation, (error) => {
    if (error instanceof HarnessIntegrationError) throw error;
    assert.ok(error instanceof Error, `${label} must reject with an Error`);
    assert.ok(error.message.trim(), `${label} must provide a diagnostic`);
    return true;
  });
}

test('approved staging is deterministic and generates distinct client/server packages', async () => {
  await withWorkspace(async (root) => {
    const stage = await loadStager();
    const manifest = manifestPath(root);
    await stage({ root, manifest, now: TEST_NOW });
    const first = await snapshot(root);
    const packages = await findGeneratedPackages(root, FIRST_ID);

    assert.notEqual(packages.client.path, packages.server.path);
    assert.match(packages.client.text, new RegExp(FIRST_ID));
    assert.match(packages.server.text, new RegExp(FIRST_ID));

    await stage({ root, manifest, now: TEST_NOW });
    assert.deepEqual(await snapshot(root), first, 'a deterministic rerun must be byte-identical');
  });
});

const invalidCases = [
  {
    name: 'draft status',
    arrange: (root) => mutateJson(manifestPath(root), (manifest) => { manifest.status = 'draft'; }),
  },
  {
    name: 'past publishAt',
    arrange: (root) => mutateJson(manifestPath(root), (manifest) => { manifest.publishAt = '2026-07-01T11:50:00-06:00'; }),
  },
  {
    name: 'implicit-offset publishAt',
    arrange: (root) => mutateJson(manifestPath(root), (manifest) => { manifest.publishAt = '2026-09-02T11:50:00'; }),
  },
  {
    name: 'unsafe asset folder',
    arrange: (root) => mutateJson(manifestPath(root), (manifest) => { manifest.assetFolder = '../2026.09.02'; }),
  },
  {
    name: 'mismatched article id',
    arrange: async (root) => {
      const path = join(root, 'src/articles/drafts/2026.09.02-first.md');
      await writeFile(path, (await readFile(path, 'utf8')).replace(FIRST_ID, 'edition-2026-09-02-wrong'));
    },
  },
  {
    name: 'missing referenced article media',
    arrange: (root) => unlink(join(root, 'src/articles/drafts/assets/2026.09.02/private-hero.png')),
  },
  {
    name: 'missing declared slide',
    arrange: (root) => unlink(join(root, 'src/articles/drafts/assets/2026.09.02/slideshow/slide-02.png')),
  },
  {
    name: 'duplicate slide order',
    arrange: (root) => mutateJson(manifestPath(root), (manifest) => { manifest.slideshow.slides[1].path = manifest.slideshow.slides[0].path; }),
  },
  {
    name: 'malformed manifest',
    arrange: (root) => writeFile(manifestPath(root), '{ not-json\n'),
  },
];

for (const scenario of invalidCases) {
  test(`invalid staging fails atomically: ${scenario.name}`, async () => {
    await withWorkspace(async (root) => {
      const stage = await loadStager();
      await scenario.arrange(root);
      const before = await snapshot(root);
      await expectContractRejection(
        stage({ root, manifest: manifestPath(root), now: TEST_NOW }),
        scenario.name,
      );
      assert.deepEqual(await snapshot(root), before, `${scenario.name} changed workspace bytes`);
    });
  });
}

test('replacement is refused atomically until article and slideshow are promoted', async () => {
  await withWorkspace(async (root) => {
    const stage = await loadStager();
    await stage({ root, manifest: manifestPath(root, 'first'), now: TEST_NOW });
    const beforeReplacement = await snapshot(root);

    await expectContractRejection(
      stage({ root, manifest: manifestPath(root, 'second'), now: TEST_NOW }),
      'unpromoted replacement',
    );
    assert.deepEqual(await snapshot(root), beforeReplacement, 'refused rollover changed generated outputs');

    await promoteFirstEdition(root);
    await stage({ root, manifest: manifestPath(root, 'second'), now: TEST_NOW });
    await findGeneratedPackages(root, SECOND_ID);

    const articleRegistry = await readFile(join(root, 'src/articles/index.ts'), 'utf8');
    const slideshowRegistry = await readFile(join(root, 'src/articles/slideshows.ts'), 'utf8');
    assert.equal(articleRegistry.split(FIRST_ID).length - 1, 1, 'promoted article must remain exactly once');
    assert.equal(slideshowRegistry.split("'first-deck':").length - 1, 1, 'promoted slideshow must remain exactly once');
  });
});

test('promotion of only one registry still refuses rollover without changing bytes', async () => {
  await withWorkspace(async (root) => {
    const stage = await loadStager();
    await stage({ root, manifest: manifestPath(root), now: TEST_NOW });
    await cp(
      join(root, 'src/articles/drafts/2026.09.02-first.md'),
      join(root, 'src/articles/2026.09.02-first.md'),
    );
    await writeFile(
      join(root, 'src/articles/index.ts'),
      `export const editions = [{ id: '${FIRST_ID}' }];\n`,
    );
    const before = await snapshot(root);
    await expectContractRejection(
      stage({ root, manifest: manifestPath(root, 'second'), now: TEST_NOW }),
      'partial promotion replacement',
    );
    assert.deepEqual(await snapshot(root), before);
  });
});
