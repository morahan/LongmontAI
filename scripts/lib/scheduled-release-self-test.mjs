import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createScheduledReleaseTools } from './scheduled-release.mjs';

const roots = [];
const clock = Date.parse('2098-01-01T00:00:00Z');

async function write(root, name, value) {
  const file = path.join(root, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value);
  return file;
}

async function fixture({ nestedMedia = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'scheduled-release-self-test-'));
  roots.push(root);
  const mediaPath = nestedMedia ? 'nested/pixel.png' : 'pixel.png';
  await write(root, 'vercel.json', JSON.stringify({ functions: {
    'api/scheduled-edition.mjs': { includeFiles: '{src/generated/scheduled-release/server.mjs,src/generated/scheduled-release/article.md}' },
    'api/scheduled-media.mjs': { includeFiles: '{src/generated/scheduled-release/server.mjs,src/generated/scheduled-release/media/**}' },
  } }));
  await write(root, 'src/articles/index.ts', 'export const editions = [];\n');
  await write(root, 'src/articles/slideshows.ts', 'export const slideshowDecks = {};\n');
  await write(root, 'src/articles/drafts/release.md', `---\nid: edition-2099-01-01-test\ndate: 2099-01-01\npublishAt: 2099-01-01T12:00:00-07:00\nstatus: scheduled\ntitle: "Private title"\nsummary: "Private summary"\n---\n\n![private](/weekly-screenshots/2099.01.01/${mediaPath})\n`);
  if (!nestedMedia) await write(root, `src/articles/drafts/assets/2099.01.01/${mediaPath}`, 'approved-media-bytes');
  const manifest = {
    status: 'scheduled', editionId: 'edition-2099-01-01-test', publishAt: '2099-01-01T12:00:00-07:00',
    article: 'src/articles/drafts/release.md', assetFolder: '2099.01.01', assetRoot: 'src/articles/drafts/assets/2099.01.01',
  };
  await write(root, 'src/articles/drafts/release.release.json', JSON.stringify(manifest, null, 2));
  return { root, manifest: 'src/articles/drafts/release.release.json', mediaPath, tools: createScheduledReleaseTools({ root, now: () => clock }) };
}

async function rejects(action, pattern) {
  await assert.rejects(action, (error) => pattern.test(error.message), `expected rejection matching ${pattern}`);
}

try {
  const primary = await fixture();
  await primary.tools.stageRelease(primary.manifest);
  assert.equal(primary.tools.generatedDir, path.join(primary.root, 'src/generated/scheduled-release'));
  const verified = await primary.tools.verifyGeneratedRelease();
  assert.equal(verified.editionId, 'edition-2099-01-01-test');
  assert.deepEqual(await primary.tools.verifyFunctionInventory(), {
    'api/scheduled-edition.mjs': ['src/generated/scheduled-release/article.md', 'src/generated/scheduled-release/server.mjs'],
    'api/scheduled-media.mjs': ['src/generated/scheduled-release/media/**', 'src/generated/scheduled-release/server.mjs'],
  });

  const publicCopy = `public/weekly-screenshots/2099.01.01/${primary.mediaPath}`;
  await write(primary.root, publicCopy, 'approved-media-bytes');
  await rejects(() => primary.tools.verifyGeneratedRelease(), /static duplicate.*pixel\.png/);
  await rm(path.join(primary.root, 'public'), { recursive: true });
  await write(primary.root, 'public/copied-private-article.md', await readFile(path.join(primary.tools.generatedDir, 'article.md')));
  await rejects(() => primary.tools.verifyGeneratedRelease(), /static duplicate of article\.md/);
  await rm(path.join(primary.root, 'public'), { recursive: true });
  await write(primary.root, 'dist/copied-private-media.png', 'approved-media-bytes');
  await rejects(() => primary.tools.verifyGeneratedRelease(), /static duplicate.*pixel\.png/);
  await rm(path.join(primary.root, 'dist'), { recursive: true });

  const client = path.join(primary.tools.generatedDir, 'client.ts');
  const approvedClient = await readFile(client);
  await writeFile(client, `${approvedClient.toString('utf8')}// manual edit\n`);
  await rejects(() => primary.tools.verifyGeneratedRelease(), /client config differs/);
  await writeFile(client, approvedClient);
  const server = path.join(primary.tools.generatedDir, 'server.mjs');
  const approvedServer = await readFile(server);
  await writeFile(server, approvedServer.toString('utf8').replace('releaseRevision', 'manualRevision'));
  await rejects(() => primary.tools.verifyGeneratedRelease(), /server config differs/);
  await writeFile(server, approvedServer);

  const before = await readFile(server);
  await write(primary.root, 'src/articles/drafts/next.md', '---\nid: edition-2099-01-02-next\ndate: 2099-01-02\npublishAt: 2099-01-02T12:00:00-07:00\nstatus: scheduled\ntitle: Next\nsummary: Next\n---\n\n![next](/weekly-screenshots/2099.01.02/pixel.png)\n');
  await write(primary.root, 'src/articles/drafts/assets/2099.01.02/pixel.png', 'next-media');
  await write(primary.root, 'src/articles/drafts/next.release.json', JSON.stringify({ status: 'scheduled', editionId: 'edition-2099-01-02-next', publishAt: '2099-01-02T12:00:00-07:00', article: 'src/articles/drafts/next.md', assetFolder: '2099.01.02' }));
  await rejects(() => primary.tools.stageRelease('src/articles/drafts/next.release.json'), /not promoted/);
  assert.deepEqual(await readFile(server), before);

  const promotedArticle = await readFile(path.join(primary.root, 'src/articles/drafts/release.md'));
  await write(primary.root, 'src/articles/2099.01.01.md', promotedArticle);
  await write(primary.root, 'src/articles/index.ts', "import promoted from './2099.01.01.md?raw';\nexport const editions = [promoted];\n");
  await write(primary.root, publicCopy, 'approved-media-bytes');
  await primary.tools.stageRelease('src/articles/drafts/next.release.json');
  const nextActive = await primary.tools.verifyGeneratedRelease();
  assert.equal(nextActive.editionId, 'edition-2099-01-02-next', 'historical public bytes must not flag after pointer rollover');

  await rm(server);
  await rejects(() => primary.tools.stageRelease(primary.manifest), /ENOENT|no such file/i);

  const linkedManifest = await fixture();
  const external = await write(linkedManifest.root, 'external.json', '{"status":"scheduled"}');
  await rm(path.join(linkedManifest.root, linkedManifest.manifest));
  await symlink(external, path.join(linkedManifest.root, linkedManifest.manifest));
  await rejects(() => linkedManifest.tools.stageRelease(linkedManifest.manifest), /symlink/);

  const linkedArticle = await fixture();
  const articleTarget = path.join(linkedArticle.root, 'article-target.md');
  await writeFile(articleTarget, 'external article bytes');
  await rm(path.join(linkedArticle.root, 'src/articles/drafts/release.md'));
  await symlink(articleTarget, path.join(linkedArticle.root, 'src/articles/drafts/release.md'));
  await rejects(() => linkedArticle.tools.stageRelease(linkedArticle.manifest), /symlink/);

  const linkedRoot = await fixture();
  const assetTarget = path.join(linkedRoot.root, 'asset-target');
  await mkdir(assetTarget);
  await rm(path.join(linkedRoot.root, 'src/articles/drafts/assets/2099.01.01'), { recursive: true });
  await symlink(assetTarget, path.join(linkedRoot.root, 'src/articles/drafts/assets/2099.01.01'));
  await rejects(() => linkedRoot.tools.stageRelease(linkedRoot.manifest), /symlink/);

  const intermediate = await fixture({ nestedMedia: true });
  const outside = await mkdtemp(path.join(os.tmpdir(), 'scheduled-release-external-media-'));
  roots.push(outside);
  await writeFile(path.join(outside, 'pixel.png'), 'must-not-be-captured');
  await mkdir(path.join(intermediate.root, 'src/articles/drafts/assets/2099.01.01'), { recursive: true });
  await symlink(outside, path.join(intermediate.root, 'src/articles/drafts/assets/2099.01.01/nested'));
  await rejects(() => intermediate.tools.stageRelease(intermediate.manifest), /symlink/);

  const expired = await fixture();
  const lateTools = createScheduledReleaseTools({ root: expired.root, now: () => Date.parse('2100-01-01T00:00:00Z') });
  await rejects(() => lateTools.stageRelease(expired.manifest), /future/);

  console.log('scheduled release disposable self-test: PASS');
} finally {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
}
