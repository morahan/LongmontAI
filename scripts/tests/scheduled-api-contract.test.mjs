import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  FIRST_ID,
  FIRST_PUBLISH_AT,
  TEST_NOW,
  assertGenericNotFound,
  cacheDirectives,
  cloneWorkspace,
  collectUrls,
  correctQuery,
  findGeneratedPackages,
  importGeneratedServer,
  loadApiModules,
  loadStager,
  makeWorkspace,
  manifestPath,
  requestHandler,
} from './fixtures/scheduled/contract-harness.mjs';

async function preparedWorkspace() {
  const root = await makeWorkspace();
  const stage = await loadStager();
  await stage({ root, manifest: manifestPath(root), now: TEST_NOW });
  const packages = await findGeneratedPackages(root);
  const release = await importGeneratedServer(packages.server.path);
  const api = await loadApiModules(root);
  return { root, stage, packages, release, api };
}

async function withPrepared(run) {
  const prepared = await preparedWorkspace();
  try {
    return await run(prepared);
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
  }
}

function assertReleasedJsonCache(response) {
  const directives = cacheDirectives(response.headers['cache-control']);
  assert.equal(directives.has('no-store'), false);
  assert.equal(directives.has('stale-while-revalidate'), false);
  assert.ok(Number.isFinite(directives.get('s-maxage')), 'released JSON must declare numeric s-maxage');
  assert.ok(directives.get('s-maxage') <= 60, 'released JSON shared freshness exceeds 60 seconds');
}

function revisionOf(release) {
  const revision = release.revision ?? release.releaseRevision ?? release.fingerprint;
  assert.equal(typeof revision, 'string', 'generated server package must expose a revision');
  assert.ok(revision.length >= 8, 'release revision is too short to safely version media');
  return revision;
}

test('edition API is a generic non-cacheable 404 at T-1 for known, wrong, and missing locators', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const known = correctQuery(release);
    const queries = [
      known,
      { ...known, slug: 'edition-unknown' },
      {},
    ];
    const bodies = [];
    for (const query of queries) {
      const response = await requestHandler(api.edition, 'edition', {
        root, release, now: FIRST_PUBLISH_AT - 1, query,
      });
      assertGenericNotFound(assert, response);
      bodies.push(response.body.toString('hex'));
    }
    assert.equal(new Set(bodies).size, 1, 'embargo responses disclose which locator is valid');
  });
});

test('edition API unlocks exactly at T and preserves the approved payload at T+1', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const query = correctQuery(release);
    for (const now of [FIRST_PUBLISH_AT, FIRST_PUBLISH_AT + 1]) {
      const response = await requestHandler(api.edition, 'edition', { root, release, now, query });
      assert.equal(response.status, 200, `edition did not unlock at ${now}`);
      assertReleasedJsonCache(response);
      assert.match(response.body.toString(), /FIRST_PRIVATE_BODY_MARKER/);
      assert.match(response.body.toString(), /Fixture title must remain private/);
      assert.doesNotMatch(response.body.toString(), /SECOND_PRIVATE_BODY_MARKER/);
    }
  });
});

test('unsupported edition methods return the same generic 404 before and after publication', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const query = correctQuery(release);
    for (const now of [FIRST_PUBLISH_AT - 1, FIRST_PUBLISH_AT, FIRST_PUBLISH_AT + 1]) {
      for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
        assertGenericNotFound(assert, await requestHandler(api.edition, 'edition', {
          root, release, now, method, query,
        }));
      }
    }
  });
});

test('released payload media URLs carry edition, revision, and allowlisted path locators', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const response = await requestHandler(api.edition, 'edition', {
      root, release, now: FIRST_PUBLISH_AT, query: correctQuery(release),
    });
    assert.equal(response.status, 200);
    const urls = collectUrls(response.json);
    assert.ok(urls.length >= 3, 'article image and declared slides must use API media URLs');
    for (const url of urls) {
      const parsed = new URL(url, 'https://fixture.invalid');
      if (!parsed.pathname.includes('scheduled-media')) continue;
      assert.equal(parsed.searchParams.get('edition'), FIRST_ID);
      assert.equal(parsed.searchParams.get('revision'), revisionOf(release));
      assert.ok(parsed.searchParams.get('path'), `media URL lacks path: ${url}`);
    }
  });
});

test('media API remains byte-indistinguishable and non-cacheable through T-1', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const known = correctQuery(release, { path: 'private-hero.png' });
    const queries = [
      known,
      { ...known, edition: 'edition-unknown' },
      { ...known, revision: 'wrong-revision' },
      { ...known, path: 'not-allowlisted.png' },
      {},
    ];
    const bodies = [];
    for (const query of queries) {
      const response = await requestHandler(api.media, 'media', {
        root, release, now: FIRST_PUBLISH_AT - 1, query,
      });
      assertGenericNotFound(assert, response);
      bodies.push(response.body.toString('hex'));
    }
    assert.equal(new Set(bodies).size, 1);

    for (const method of ['POST', 'PUT', 'OPTIONS']) {
      assertGenericNotFound(assert, await requestHandler(api.media, 'media', {
        root, release, now: FIRST_PUBLISH_AT - 1, method, query: known,
      }));
    }
  });
});

test('media API serves only approved revision-scoped bytes at T and T+1', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const expected = await readFile(join(root, 'src/articles/drafts/assets/2026.09.02/private-hero.png'));
    const query = correctQuery(release, { path: 'private-hero.png' });
    for (const now of [FIRST_PUBLISH_AT, FIRST_PUBLISH_AT + 1]) {
      const response = await requestHandler(api.media, 'media', { root, release, now, query });
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, expected);
      assert.equal(response.headers['content-type'], 'image/png');
      const cache = cacheDirectives(response.headers['cache-control']);
      assert.equal(cache.has('immutable'), true, 'fingerprinted media should be immutable');
      assert.equal(cache.has('stale-while-revalidate'), false);
    }
  });
});

test('released media rejects traversal, unsupported, unreferenced, directory, and cross-edition requests', async () => {
  await withPrepared(async ({ root, release, api }) => {
    const valid = correctQuery(release);
    const invalidQueries = [
      { ...valid, path: '../private-hero.png' },
      { ...valid, path: '%2e%2e%2fprivate-hero.png' },
      { ...valid, path: '/etc/passwd' },
      { ...valid, path: 'slideshow' },
      { ...valid, path: 'unreferenced.png' },
      { ...valid, path: 'private-hero.exe' },
      { ...valid, edition: 'edition-2026-09-16-second', path: 'private-hero.png' },
      { ...valid, revision: 'old-correction-revision', path: 'private-hero.png' },
    ];
    for (const query of invalidQueries) {
      assertGenericNotFound(assert, await requestHandler(api.media, 'media', {
        root, release, now: FIRST_PUBLISH_AT, query,
      }));
    }
    for (const method of ['POST', 'DELETE', 'OPTIONS']) {
      assertGenericNotFound(assert, await requestHandler(api.media, 'media', {
        root,
        release,
        now: FIRST_PUBLISH_AT + 1,
        method,
        query: correctQuery(release, { path: 'private-hero.png' }),
      }));
    }
  });
});

test('a media correction changes revision, URL, and bytes without extending JSON freshness', async () => {
  await withPrepared(async ({ root, stage, release: beforeRelease, api }) => {
    const beforeResponse = await requestHandler(api.edition, 'edition', {
      root, release: beforeRelease, now: FIRST_PUBLISH_AT, query: correctQuery(beforeRelease),
    });
    const beforeMediaUrl = collectUrls(beforeResponse.json).find((url) => url.includes('private-hero.png'));
    assert.ok(beforeMediaUrl, 'approved article media URL missing before correction');
    const beforeMedia = await requestHandler(api.media, 'media', {
      root,
      release: beforeRelease,
      now: FIRST_PUBLISH_AT,
      query: correctQuery(beforeRelease, { path: 'private-hero.png' }),
    });

    const assetPath = join(root, 'src/articles/drafts/assets/2026.09.02/private-hero.png');
    await writeFile(assetPath, '<svg xmlns="http://www.w3.org/2000/svg"><text>corrected bytes</text></svg>\n');
    await stage({ root, manifest: manifestPath(root), now: TEST_NOW });
    const correctedPackages = await findGeneratedPackages(root);
    const afterRelease = await importGeneratedServer(correctedPackages.server.path);
    assert.notEqual(revisionOf(afterRelease), revisionOf(beforeRelease));

    // A correction is a reviewed redeployment: load handlers from a fresh module
    // graph so their immutable generated-package import cannot reuse the old release.
    const redeployedRoot = await cloneWorkspace(root);
    try {
      const correctedApi = await loadApiModules(redeployedRoot);
      const afterResponse = await requestHandler(correctedApi.edition, 'edition', {
        root: redeployedRoot,
        release: afterRelease,
        now: FIRST_PUBLISH_AT,
        query: correctQuery(afterRelease),
      });
      assertReleasedJsonCache(afterResponse);
      const afterMediaUrl = collectUrls(afterResponse.json).find((url) => url.includes('private-hero.png'));
      assert.ok(afterMediaUrl, 'approved article media URL missing after correction');
      assert.notEqual(afterMediaUrl, beforeMediaUrl, 'corrected media reused an immutable URL');

      const afterMedia = await requestHandler(correctedApi.media, 'media', {
        root: redeployedRoot,
        release: afterRelease,
        now: FIRST_PUBLISH_AT,
        query: correctQuery(afterRelease, { path: 'private-hero.png' }),
      });
      assert.notDeepEqual(afterMedia.body, beforeMedia.body);
      assert.deepEqual(afterMedia.body, await readFile(assetPath));
    } finally {
      await rm(redeployedRoot, { recursive: true, force: true });
    }
  });
});
