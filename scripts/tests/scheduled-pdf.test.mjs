import assert from 'node:assert/strict';
import { readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { FIRST_PUBLISH_AT, TEST_NOW, assertGenericNotFound, correctQuery, findGeneratedPackages, importGeneratedServer, loadApiModules, loadStager, makeWorkspace, manifestPath, requestHandler, snapshot } from './fixtures/scheduled/contract-harness.mjs';

const pdf = Buffer.from('%PDF-1.4\n% private fixture deck\n%%EOF\n');

async function fixture(t) {
  const root = await makeWorkspace();
  t.after(() => rm(root, { recursive: true, force: true }));
  const article = join(root, 'src/articles/drafts/2026.09.02-first.md');
  const asset = join(root, 'src/articles/drafts/assets/2026.09.02/briefing.pdf');
  await writeFile(asset, pdf);
  await writeFile(article, `${await readFile(article, 'utf8')}\n[Download deck](/documents/2026.09.02/briefing.pdf)\n`);
  return { root, article, asset, stage: await loadStager() };
}

test('PDF is allowlisted, revision-scoped, embargoed and served with exact application/pdf bytes', async (t) => {
  const { root, stage } = await fixture(t);
  await stage({ root, manifest: manifestPath(root), now: TEST_NOW });
  const before = await snapshot(root);
  await stage({ root, manifest: manifestPath(root), now: TEST_NOW });
  assert.deepEqual(await snapshot(root), before, 'PDF staging remains deterministic');
  const packages = await findGeneratedPackages(root);
  const release = await importGeneratedServer(packages.server.path);
  assert.equal(release.media['briefing.pdf'].contentType, 'application/pdf');
  assert.doesNotMatch(packages.client.text, /briefing\.pdf|private fixture/);
  const api = await loadApiModules(root);
  const query = correctQuery(release, { path: 'briefing.pdf' });
  assertGenericNotFound(assert, await requestHandler(api.media, 'media', { root, release, now: FIRST_PUBLISH_AT - 1, query }));
  for (const now of [FIRST_PUBLISH_AT, FIRST_PUBLISH_AT + 1]) {
    const response = await requestHandler(api.media, 'media', { root, release, now, query });
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.deepEqual(response.body, pdf);
  }
  for (const bad of [
    { ...query, path: '../briefing.pdf' }, { ...query, path: '%2e%2e/briefing.pdf' },
    { ...query, path: 'unreferenced.pdf' }, { ...query, revision: 'wrong' },
    { ...query, edition: 'wrong' }, { ...query, path: '/briefing.pdf' },
  ]) assertGenericNotFound(assert, await requestHandler(api.media, 'media', { root, release, now: FIRST_PUBLISH_AT, query: bad }));
  assertGenericNotFound(assert, await requestHandler(api.media, 'media', { root, release, now: FIRST_PUBLISH_AT, method: 'POST', query }));
  const edition = await requestHandler(api.edition, 'edition', { root, release, now: FIRST_PUBLISH_AT, query: correctQuery(release) });
  assert.match(edition.body.toString(), /scheduled-media[^\s]*briefing\.pdf/);
  // API handlers inherit deployment-wide nosniff; do not relax the existing header contract.
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const global = config.headers.find(({ source }) => source === '/(.*)');
  assert.ok(global.headers.some(({ key, value }) => key.toLowerCase() === 'x-content-type-options' && value === 'nosniff'));
});

for (const scenario of ['missing', 'symlink', 'pptx', 'image-bucket', 'slideshow']) {
  test(`PDF support does not admit ${scenario} media`, async (t) => {
    const { root, article, asset, stage } = await fixture(t);
    if (scenario === 'missing') await rm(asset);
    if (scenario === 'symlink') { await rm(asset); await symlink(article, asset); }
    if (scenario === 'pptx') {
      await writeFile(`${asset}.pptx`, 'not a supported deck');
      await writeFile(article, (await readFile(article, 'utf8')).replace('briefing.pdf', 'briefing.pdf.pptx'));
    }
    if (scenario === 'image-bucket') await writeFile(article, (await readFile(article, 'utf8')).replace('/documents/', '/weekly-screenshots/'));
    if (scenario === 'slideshow') {
      const file = manifestPath(root);
      const manifest = JSON.parse(await readFile(file, 'utf8'));
      manifest.slideshow.slides[0].path = 'briefing.pdf';
      await writeFile(file, JSON.stringify(manifest));
    }
    const before = await snapshot(root);
    await assert.rejects(stage({ root, manifest: manifestPath(root), now: TEST_NOW }));
    assert.deepEqual(await snapshot(root), before, 'rejected staging must not mutate the package');
  });
}
