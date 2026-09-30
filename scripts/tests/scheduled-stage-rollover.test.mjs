import assert from 'node:assert/strict';
import { cp, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { createScheduledReleaseTools } from '../lib/scheduled-release.mjs';

for (const offset of [-1, 0, 1]) {
  test(`same-release article/media corrections at T${offset} preserve identity and are deterministic`, async () => {
    await withWorkspace(async (root) => {
      const stage = await loadStager();
      const manifest = manifestPath(root);
      const before = await stage({ root, manifest, now: FIRST_PUBLISH_AT - 1 });
      const article = join(root, 'src/articles/drafts/2026.09.02-first.md');
      const media = join(root, 'src/articles/drafts/assets/2026.09.02/private-hero.png');
      let previous = before;
      for (const file of [article, media]) {
        await writeFile(file, Buffer.concat([await readFile(file), Buffer.from('\nReviewed correction\n')]));
        const tools = createScheduledReleaseTools({ root, now: () => FIRST_PUBLISH_AT + offset });
        await assert.rejects(tools.verifyGeneratedRelease(), /differs from approved sources/);
        const corrected = await stage({ root, manifest, now: FIRST_PUBLISH_AT + offset });
        assert.equal(corrected.editionId, before.editionId);
        assert.equal(corrected.publishAt, before.publishAt);
        assert.equal(corrected.publishAtMs, before.publishAtMs);
        assert.notEqual(corrected.releaseRevision, previous.releaseRevision);
        assert.deepEqual(await tools.verifyGeneratedRelease(), corrected);
        const bytes = await snapshot(root);
        await stage({ root, manifest, now: FIRST_PUBLISH_AT + offset });
        assert.deepEqual(await snapshot(root), bytes);
        previous = corrected;
      }
    });
  });
}


import {
  FIRST_ID,
  FIRST_PUBLISH_AT,
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

const correctionNegatives = [
  ...['2026-09-01T11:50:00-06:00', '2026-09-03T11:50:00-06:00', '2026-09-02T17:50:00+00:00'].map((time) => ({
    name: `changed publication ${time}`,
    arrange: async (root) => {
      await mutateJson(manifestPath(root), (manifest) => { manifest.publishAt = time; });
      const article = join(root, 'src/articles/drafts/2026.09.02-first.md');
      await writeFile(article, (await readFile(article, 'utf8')).replace('2026-09-02T11:50:00-06:00', time));
    },
  })),
  ...invalidCases,
  { name: 'corrupt active article hash', arrange: (root) => writeFile(join(root, 'src/generated/scheduled-release/article.md'), 'corrupt') },
  { name: 'malformed active descriptor', arrange: (root) => writeFile(join(root, 'src/generated/scheduled-release/server.mjs'), 'malformed') },
  { name: 'corrupt active media', arrange: (root) => writeFile(join(root, 'src/generated/scheduled-release/media/private-hero.png'), 'corrupt') },
  { name: 'unexpected active inventory', arrange: (root) => writeFile(join(root, 'src/generated/scheduled-release/extra'), 'extra') },
  { name: 'source media symlink', arrange: async (root) => {
    const media = join(root, 'src/articles/drafts/assets/2026.09.02/private-hero.png');
    await unlink(media);
    await symlink('slideshow/slide-01.png', media);
  } },
  { name: 'candidate traversal', arrange: (root) => mutateJson(manifestPath(root), (manifest) => { manifest.slideshow.slides[0].path = '../escape.png'; }) },
];
for (const scenario of correctionNegatives) test(`correction rejection preserves package: ${scenario.name}`, async () => {
  await withWorkspace(async (root) => {
    const stage = await loadStager();
    await stage({ root, manifest: manifestPath(root), now: FIRST_PUBLISH_AT - 1 });
    await scenario.arrange(root);
    const before = await snapshot(root);
    await assert.rejects(stage({ root, manifest: manifestPath(root), now: FIRST_PUBLISH_AT + 1 }));
    assert.deepEqual(await snapshot(root), before);
    assert.ok(!(await readdir(root)).includes('.scheduled-release.lock'));
    assert.deepEqual((await readdir(join(root, 'src/generated'))).filter((name) => name.startsWith('.scheduled-release.')), []);
  });
});

for (const offset of [0, 1]) test(`new releases remain future-only at T+${offset}`, async () => {
  await withWorkspace(async (root) => {
    const stage = await loadStager();
    await assert.rejects(stage({ root, manifest: manifestPath(root), now: FIRST_PUBLISH_AT + offset }), /must be in the future/);
    await stage({ root, manifest: manifestPath(root), now: FIRST_PUBLISH_AT - 1 });
    await promoteFirstEdition(root);
    const second = JSON.parse(await readFile(manifestPath(root, 'second'), 'utf8'));
    const before = await snapshot(root);
    await assert.rejects(stage({ root, manifest: manifestPath(root, 'second'), now: Date.parse(second.publishAt) + offset }), /must be in the future/);
    assert.deepEqual(await snapshot(root), before);
  });
});

test('future rollover cannot replace an unpublished active release even if promoted', async () => {
  await withWorkspace(async (root) => {
    const stage = await loadStager();
    await stage({ root, manifest: manifestPath(root), now: FIRST_PUBLISH_AT - 1 });
    await promoteFirstEdition(root);
    await assert.rejects(stage({ root, manifest: manifestPath(root, 'second'), now: FIRST_PUBLISH_AT - 1 }), /has not reached publishAt/);
  });
});

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
      stage({ root, manifest: manifestPath(root, 'second'), now: FIRST_PUBLISH_AT + 1 }),
      'unpromoted replacement',
    );
    assert.deepEqual(await snapshot(root), beforeReplacement, 'refused rollover changed generated outputs');

    await promoteFirstEdition(root);
    await stage({ root, manifest: manifestPath(root, 'second'), now: FIRST_PUBLISH_AT + 1 });
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
      stage({ root, manifest: manifestPath(root, 'second'), now: FIRST_PUBLISH_AT + 1 }),
      'partial promotion replacement',
    );
    assert.deepEqual(await snapshot(root), before);
  });
});
