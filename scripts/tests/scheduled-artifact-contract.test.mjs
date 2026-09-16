import assert from 'node:assert/strict';
import { readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';
import { build } from 'vite';

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
  assert.equal(await exists(directory), true, `artifact tree ${tree} must exist before scanning`);
  const files = await allFiles(directory);
  assert.ok(files.length > 0, `artifact tree ${tree} must not be empty`);
  const findings = [];
  for (const path of files) {
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

test('staging alone does not create public or dist artifacts', async () => {
  await withStaged(async ({ root }) => {
    assert.equal(await exists(join(root, 'public')), false);
    assert.equal(await exists(join(root, 'dist')), false);
    await assert.rejects(() => scanTree(root, 'dist', privateText), /artifact tree dist must exist/);
  });
});

test('real emitted client artifacts exclude private release inputs and reject an injected leak', async () => {
  await withStaged(async ({ root, packages }) => {
    const release = await importGeneratedServer(packages.server.path);
    const revision = release.revision ?? release.releaseRevision ?? release.fingerprint;
    const forbidden = [...privateText, ...(revision ? [revision] : [])];
    // Build only inside the disposable fixture. No source-checkout dist, Vite
    // configuration, browser, providers, or generated production files are used.
    const clientPath = relative(root, packages.client.path).replaceAll('\\', '/');
    await writeFile(join(root, 'index.html'), '<!doctype html><html><body><main></main><script type="module" src="/entry.js"></script></body></html>');
    await writeFile(join(root, 'entry.js'), `import * as locator from './${clientPath}';\ndocument.querySelector('main').textContent = JSON.stringify(locator);\n`);
    await build({
      // macOS temporary paths may enter through /var but resolve to /private/var.
      // Vite's root must use the same canonical path as emitted module IDs.
      root: await realpath(root),
      configFile: false,
      publicDir: false,
      logLevel: 'silent',
      build: { outDir: 'dist', emptyOutDir: true, minify: false },
    });
    const artifacts = await allFiles(join(root, 'dist'));
    assert.ok(artifacts.some((path) => path.endsWith('/index.html')), 'Vite must emit HTML');
    const scripts = artifacts.filter((path) => path.endsWith('.js'));
    assert.ok(scripts.length > 0, 'Vite must emit JavaScript');
    const emitted = await Promise.all(scripts.map((path) => readFile(path, 'utf8')));
    assert.ok(emitted.every((text) => text.length > 0), 'emitted scripts must not be empty');
    assert.ok(emitted.some((text) => text.includes(FIRST_ID)), 'public locator must survive bundling');
    const assertNoLeaks = async () => assert.deepEqual(await scanTree(root, 'dist', forbidden), []);
    await assertNoLeaks();

    const original = await readFile(scripts[0]);
    await writeFile(scripts[0], Buffer.concat([original, Buffer.from('\n// FIRST_PRIVATE_BODY_MARKER\n')]));
    await assert.rejects(assertNoLeaks, /FIRST_PRIVATE_BODY_MARKER/, 'same artifact assertion must fail on leaked private content');
    await writeFile(scripts[0], original);
    await assertNoLeaks();
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

    assert.equal(
      String(edition.includeFiles ?? ''),
      '{src/generated/scheduled-release/server.mjs,src/generated/scheduled-release/article.md}',
      'edition function must contain only server configuration and approved article',
    );
    assert.equal(
      String(media.includeFiles ?? ''),
      '{src/generated/scheduled-release/server.mjs,src/generated/scheduled-release/media/**}',
      'media function must contain only server configuration and approved media',
    );

    const serverRelative = relative(root, packages.server.path).replaceAll('\\', '/');
    assert.ok(
      Object.values(functions).some((value) => String(value.includeFiles ?? '').includes(serverRelative)),
      'generated server configuration is not declared in package inventory',
    );
  });
});
