import assert from 'node:assert/strict';
import { readFile, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

import {
  FIRST_ID,
  TEST_NOW,
  allFiles,
  findGeneratedPackages,
  importGeneratedServer,
  loadStager,
  makeWorkspace,
  manifestPath,
} from './fixtures/scheduled/contract-harness.mjs';

const privateText = [
  'Fixture title must remain private',
  'Fixture summary must remain private',
  'FIRST_PRIVATE_BODY_MARKER',
  'private-hero.png',
  'slide-01.png',
  'slide-02.png',
  '/drafts/',
];

async function withStaged(run) {
  const root = await makeWorkspace();
  try {
    const stage = await loadStager();
    await stage({ root, manifest: manifestPath(root), now: TEST_NOW });
    return await run({ root, packages: await findGeneratedPackages(root) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function exists(path) {
  try { await stat(path); return true; } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function scanTree(root, tree, forbidden) {
  const directory = join(root, tree);
  if (!(await exists(directory))) return [];
  const findings = [];
  for (const path of await allFiles(directory)) {
    const bytes = await readFile(path);
    for (const value of forbidden) {
      if (bytes.includes(Buffer.from(value))) findings.push(`${relative(root, path)} contains ${value}`);
    }
  }
  return findings;
}

test('generated client package exposes only public locator metadata', async () => {
  await withStaged(async ({ packages }) => {
    const release = await importGeneratedServer(packages.server.path);
    const revision = release.revision ?? release.releaseRevision ?? release.fingerprint;

    assert.match(packages.client.text, new RegExp(FIRST_ID));
    assert.match(packages.client.text, /2026-09-02T11:50:00-06:00/);
    for (const value of privateText) {
      assert.equal(packages.client.text.includes(value), false, `client package leaked ${value}`);
    }
    if (revision) {
      assert.equal(packages.client.text.includes(revision), false, 'client package leaked source fingerprint/revision');
    }
  });
});

test('server package contains selected private inputs but excludes the next edition', async () => {
  await withStaged(async ({ packages }) => {
    assert.match(packages.server.text, new RegExp(FIRST_ID));
    assert.match(packages.server.text, /2026\.09\.02-first\.md/);
    assert.match(packages.server.text, /2026\.09\.02/);
    assert.doesNotMatch(packages.server.text, /edition-2026-09-16-second/);
    assert.doesNotMatch(packages.server.text, /2026\.09\.16/);
    assert.doesNotMatch(packages.server.text, /outputs\//);
  });
});

test('scheduled source and bytes are absent from public and any locally emitted dist tree', async () => {
  await withStaged(async ({ root, packages }) => {
    const release = await importGeneratedServer(packages.server.path);
    const revision = release.revision ?? release.releaseRevision ?? release.fingerprint;
    const forbidden = [...privateText, ...(revision ? [revision] : [])];

    assert.deepEqual(await scanTree(root, 'public', forbidden), []);
    assert.deepEqual(await scanTree(root, 'dist', forbidden), []);
    assert.equal(await exists(join(root, 'public/weekly-screenshots/2026.09.02')), false);
    assert.equal(await exists(join(root, 'public/slideshows/2026.09.02')), false);
  });
});

test('local Vercel inventory selects only the active Markdown and dated asset tree', async () => {
  await withStaged(async ({ root, packages }) => {
    const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
    const functions = config.functions ?? {};
    const edition = functions['api/scheduled-edition.mjs'];
    const media = functions['api/scheduled-media.mjs'];
    assert.ok(edition, 'scheduled edition function inventory is missing');
    assert.ok(media, 'scheduled media function inventory is missing');

    for (const [name, definition] of Object.entries(functions)) {
      const inventory = JSON.stringify(definition);
      for (const forbidden of ['outputs/', 'review', 'ledger', '2026.09.16', 'edition-2026-09-16-second']) {
        assert.equal(inventory.includes(forbidden), false, `${name} includes forbidden ${forbidden}`);
      }
      if (name === 'api/model-watch.mjs') {
        assert.equal(inventory.includes('src/articles/drafts'), false, 'unrelated function packages scheduled drafts');
      }
    }

    for (const [name, definition] of Object.entries({
      'api/scheduled-edition.mjs': edition,
      'api/scheduled-media.mjs': media,
    })) {
      const include = String(definition.includeFiles ?? '');
      assert.equal(
        include,
        'src/generated/scheduled-release/**',
        `${name} must package only the generated active-release directory`,
      );
    }

    const serverRelative = relative(root, packages.server.path).replaceAll('\\', '/');
    const serverIsIncluded = Object.values(functions).some((value) => {
      const include = String(value.includeFiles ?? '');
      return include.endsWith('/**') && serverRelative.startsWith(include.slice(0, -3));
    });
    assert.ok(
      packages.server.path.includes('/api/') || serverIsIncluded,
      'generated server configuration is neither function-local nor declared in package inventory',
    );
  });
});
