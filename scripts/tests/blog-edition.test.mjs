import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, cp, unlink } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { newDraft, publicationTime, inspectDraft, updateDraft, main } from '../blog-edition.mjs';
import { createScheduledReleaseTools } from '../lib/scheduled-release.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lai-blog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'src/articles/drafts'), { recursive: true });
  await writeFile(path.join(root, 'src/articles/drafts/edition-template.md'), await readFile(new URL('../../src/articles/drafts/edition-template.md', import.meta.url)));
  return root;
}

test('Denver noon meetup publication accounts for DST and rejects invalid dates', () => {
  assert.equal(publicationTime('2026-09-16'), '2026-09-16T11:50:00-06:00');
  assert.equal(publicationTime('2026-01-07'), '2026-01-07T11:50:00-07:00');
  for (const value of ['2026-02-30', '../escape', '2026-9-16', '2026-13-01']) assert.throws(() => publicationTime(value));
});

test('new defaults to no writes; exclusive creation never overwrites a draft or manifest', async (t) => {
  const root = await fixture(t);
  const before = await readdir(path.join(root, 'src/articles/drafts'));
  assert.equal((await newDraft(root, '2026-09-16', 'test-edition')).mode, 'dry-run');
  assert.deepEqual(await readdir(path.join(root, 'src/articles/drafts')), before);
  const created = await newDraft(root, '2026-09-16', 'test-edition', true);
  const original = await readFile(path.join(root, created.article), 'utf8');
  assert.match(original, /status: draft/);
  assert.match(original, /2026-09-16T11:50:00-06:00/);
  await assert.rejects(newDraft(root, '2026-09-16', 'test-edition', true), /already exists/);
  assert.equal(await readFile(path.join(root, created.article), 'utf8'), original);
  await writeFile(path.join(root, 'src/articles/drafts/2026.09.16-manifest-only.release.json'), '{}');
  await assert.rejects(newDraft(root, '2026-09-16', 'manifest-only', true), /already exists/);
  await assert.rejects(newDraft(root, '2026-09-16', '../escape', true), /kebab/);
  await symlink('/does-not-exist', path.join(root, 'src/articles/drafts/2026.09.16-link.md'));
  await assert.rejects(newDraft(root, '2026-09-16', 'link', true), /already exists/);
});

test('update validates draft bytes without staging and honestly blocks a different active release', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'vercel.json'), await readFile(new URL('../../vercel.json', import.meta.url)));
  await writeFile(path.join(root, 'src/articles/index.ts'), 'export const editions = [];');
  await mkdir(path.join(root, 'public'));
  const tools = createScheduledReleaseTools({ root, now: () => Date.parse('2026-01-01') });
  async function release(day, topic) {
    const date = `2099-09-${day}`;
    const folder = date.replaceAll('-', '.');
    const stem = `src/articles/drafts/${folder}-${topic}`;
    const article = `---\nid: edition-${date}-${topic}\ndate: ${date}\nstatus: scheduled\npublishAt: ${publicationTime(date)}\ntitle: Test\nsummary: Test\n---\n![Chart](/weekly-screenshots/${folder}/chart.png)\n[Deck](/documents/${folder}/deck.pdf)\n`;
    await mkdir(path.join(root, `src/articles/drafts/assets/${folder}`), { recursive: true });
    for (const file of ['chart.png', 'deck.pdf']) await writeFile(path.join(root, `src/articles/drafts/assets/${folder}/${file}`), 'fixture');
    await writeFile(path.join(root, `${stem}.md`), article);
    await writeFile(path.join(root, `${stem}.release.json`), JSON.stringify({ editionId: `edition-${date}-${topic}`, publishAt: publicationTime(date), status: 'scheduled', article: `${stem}.md`, assetFolder: folder }));
    return `${stem}.release.json`;
  }
  const active = await release('02', 'old');
  await tools.stageRelease(active);
  const generated = path.join(root, 'src/generated/scheduled-release/server.mjs');
  const before = await readFile(generated, 'utf8');
  const next = await release('16', 'new');
  for (let i = 0; i < 2; i++) {
    const report = await updateDraft(root, next);
    assert.equal(report.preparation, 'validated');
    assert.equal(report.siteUpdate, 'not performed');
    assert.equal(report.published, false);
    assert.match(report.blockers.join(' '), /active pointer is edition-2099-09-02-old/);
    assert.deepEqual(report.media, ['chart.png', 'deck.pdf']);
    assert.equal(await readFile(generated, 'utf8'), before);
  }
  await assert.rejects(updateDraft(root, next, true), /active edition .* has not reached publishAt/);
  assert.equal(await readFile(generated, 'utf8'), before, 'explicit staging must preserve blocked active package');
  assert.deepEqual(await readdir(path.join(root, 'src/generated')), ['scheduled-release']);
  const articlePath = path.join(root, next.replace('.release.json', '.md'));
  const article = await readFile(articlePath, 'utf8');
  await writeFile(articlePath, article + '\n![Lost](assets/2026.09.16/lost.png)');
  await assert.rejects(inspectDraft(root, next), /not packaged/);
  await writeFile(articlePath, article.replace('[Deck](/documents/2099.09.16/deck.pdf)', ''));
  assert.match((await inspectDraft(root, next)).blockers.join(' '), /deck missing/);
  await assert.rejects(inspectDraft(root, '../outside.release.json'), /inside/);
});

async function deliveryFixture(t, cli = false, oldDate = '2020-09-02') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lai-blog-delivery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  if (cli) {
    // Local, offline clone supplies real HEAD metadata for the real preflight.
    execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', fileURLToPath(new URL('../../', import.meta.url)), root]);
    for (const name of ['package.json', 'scripts/blog-edition.mjs', 'scripts/lib/scheduled-release.mjs',
      'scripts/update-site-preflight.mjs', 'scripts/model-watch-sources.mjs', 'src/data/modelWatch.ts', 'src/data/timeline.ts']) {
      await mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await cp(new URL(`../../${name}`, import.meta.url), path.join(root, name));
    }
  }
  await mkdir(path.join(root, 'src/articles/drafts'), { recursive: true });
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'vercel.json'), await readFile(new URL('../../vercel.json', import.meta.url)));
  await writeFile(path.join(root, 'src/articles/index.ts'), 'export const editions = [];');
  await writeFile(path.join(root, 'src/articles/slideshows.ts'), 'export const slideshowDecks = {};');
  async function release(date, topic) {
    const folder = date.replaceAll('-', '.');
    const stem = `src/articles/drafts/${folder}-${topic}`;
    const assetRoot = `src/articles/drafts/assets/${folder}`;
    const editionId = `edition-${date}-${topic}`;
    const publishAt = publicationTime(date);
    const article = `---\nid: ${editionId}\ndate: ${date}\nstatus: scheduled\npublishAt: ${publishAt}\ntitle: Unique ${topic} title\nsummary: Distinct ${topic} summary\n---\n![Chart](/weekly-screenshots/${folder}/chart.png)\n[Deck](/documents/${folder}/deck.pdf)\n`;
    await mkdir(path.join(root, assetRoot), { recursive: true });
    for (const file of ['chart.png', 'deck.pdf', 'slide.png']) await writeFile(path.join(root, assetRoot, file), `${editionId}-${file.split('.')[0]}`);
    await writeFile(path.join(root, `${stem}.md`), article);
    const manifest = `${stem}.release.json`;
    await writeFile(path.join(root, manifest), JSON.stringify({ editionId, publishAt, status: 'scheduled', article: `${stem}.md`, assetFolder: folder,
      slideshow: { id: topic, title: topic, description: topic, slides: [{ title: 'Slide', path: 'slide.png' }] } }));
    return { manifest, stem, assetRoot, folder, topic, editionId, publishAt, article };
  }
  const old = await release(oldDate, 'previous');
  const next = await release('2099-09-16', 'upcoming');
  await createScheduledReleaseTools({ root, now: () => Date.parse('2020-01-01') }).stageRelease(old.manifest);
  async function promote(edition) {
    const name = `${edition.folder}-${edition.topic}.md`;
    await writeFile(path.join(root, 'src/articles', name), edition.article.replace('status: scheduled', 'status: published'));
    await writeFile(path.join(root, 'src/articles/index.ts'), `import article from './${name}?raw';\nexport const editions = [parseMarkdownToEdition(article)];\n`);
    await writeFile(path.join(root, 'src/articles/slideshows.ts'), `export const slideshowDecks = { '${edition.topic}': {} };`);
    for (const [file, directory] of [['chart.png', `weekly-screenshots/${edition.folder}`], ['deck.pdf', `documents/${edition.folder}`], ['slide.png', `slideshows/${edition.folder}/${edition.topic}`]]) {
      await mkdir(path.join(root, 'public', directory), { recursive: true });
      await cp(path.join(root, edition.assetRoot, file), path.join(root, 'public', directory, file));
    }
  }
  return { root, old, next, release, promote };
}

async function generatedSnapshot(root) {
  const snapshot = {};
  async function collect(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await collect(path.join(directory, entry.name), `${name}/`);
      else snapshot[name] = (await readFile(path.join(directory, entry.name))).toString('hex');
    }
  }
  await collect(path.join(root, 'src/generated'));
  assert.equal((await readdir(root)).includes('.scheduled-release.lock'), false);
  return snapshot;
}

function assertUnverified(report) {
  assert.equal(report.production, 'unverified');
  assert.equal(report.published, false);
}

test('explicit stage completes promoted rollover despite transitional dry-run leaks', async (t) => {
  const { root, old, next, promote } = await deliveryFixture(t);
  const initial = await inspectDraft(root, old.manifest);
  assert.equal(initial.publication, 'active-release-due');
  assertUnverified(initial);
  await promote(old);
  await assert.rejects(inspectDraft(root, next.manifest), /static duplicate|leaks/);
  const report = await updateDraft(root, next.manifest, true);
  assert.equal(report.mode, 'staged');
  assert.equal(report.localState, 'locally-staged');
  assert.equal(report.publication, 'future');
  assert.equal(report.activeEdition, next.editionId);
  assert.deepEqual(report.blockers, []);
  assertUnverified(report);
  assert.match(report.siteUpdate, /production unverified/);
  await createScheduledReleaseTools({ root }).verifyGeneratedRelease();
  const before = await generatedSnapshot(root);
  const again = await updateDraft(root, next.manifest, true);
  assert.equal(again.releaseRevision, report.releaseRevision);
  assert.deepEqual(await generatedSnapshot(root), before);
  const alternate = 'src/articles/drafts/2099.09.16-alternate';
  await writeFile(path.join(root, `${alternate}.md`), `${next.article}\nDifferent candidate bytes\n`);
  const manifest = JSON.parse(await readFile(path.join(root, next.manifest), 'utf8'));
  await writeFile(path.join(root, `${alternate}.release.json`), JSON.stringify({ ...manifest, article: `${alternate}.md` }));
  const mismatched = await inspectDraft(root, `${alternate}.release.json`);
  assert.equal(mismatched.localState, 'prepared', 'same ID alone is not a staged candidate receipt');
  assert.match(mismatched.blockers.join(' '), /identity\/time\/revision\/source does not match/);
  // Even byte-identical alternative sources are not the approved active source.
  await writeFile(path.join(root, `${alternate}.md`), next.article);
  assert.equal((await inspectDraft(root, `${alternate}.release.json`)).localState, 'prepared');
  // A policy-valid new date/time with the same ID cannot borrow active readiness.
  const differentTime = await createScheduledReleaseTools({ root }).specFromManifest(`${alternate}.release.json`, { requireFuture: false });
  const alternateTime = publicationTime('2099-09-17');
  await writeFile(path.join(root, `${alternate}.md`), next.article.replace(next.publishAt, alternateTime).replaceAll('/2099.09.16/', '/2099.09.17/'));
  await cp(path.join(root, next.assetRoot), path.join(root, 'src/articles/drafts/assets/2099.09.17'), { recursive: true });
  await writeFile(path.join(root, `${alternate}.release.json`), JSON.stringify({ ...manifest, article: `${alternate}.md`, publishAt: alternateTime, assetFolder: '2099.09.17' }));
  const changedTime = await inspectDraft(root, `${alternate}.release.json`);
  assert.notEqual(changedTime.publishAt, differentTime.publishAt);
  assert.equal(changedTime.localState, 'prepared');
  assertUnverified(changedTime);
});

test('explicit stage retains active integrity, promotion, asset and future-only guards', async (t) => {
  for (const kind of ['unpromoted', 'future-old', 'missing-asset', 'modified-asset', 'tampered-active', 'tampered-source', 'past-candidate']) {
    await t.test(kind, async (t) => {
      const { root, old, next, promote, release } = await deliveryFixture(t, false, kind === 'future-old' ? '2099-09-02' : '2020-09-02');
      let candidate = next.manifest;
      if (kind !== 'unpromoted') await promote(old);
      if (kind === 'missing-asset') await unlink(path.join(root, `public/documents/${old.folder}/deck.pdf`));
      if (kind === 'modified-asset') await writeFile(path.join(root, `public/documents/${old.folder}/deck.pdf`), 'changed approved bytes');
      if (kind === 'tampered-active') await writeFile(path.join(root, 'src/generated/scheduled-release/article.md'), 'tampered');
      if (kind === 'tampered-source') await writeFile(path.join(root, `${old.stem}.md`), `${old.article}\nUnapproved change\n`);
      if (kind === 'past-candidate') candidate = (await release('2021-09-16', 'late')).manifest;
      const before = await generatedSnapshot(root);
      await assert.rejects(updateDraft(root, candidate, true), {
        message: kind === 'tampered-active' ? /hash mismatch/ : kind === 'tampered-source' ? /differs from approved sources/ : kind === 'past-candidate' ? /must be in the future/ : kind === 'future-old' ? /has not reached publishAt/ : /not fully promoted/,
      });
      assert.deepEqual(await generatedSnapshot(root), before);
    });
  }
});

test('post-stage verification never reports success for leaked candidate bytes', async (t) => {
  const { root, old, next, promote } = await deliveryFixture(t);
  await promote(old);
  await cp(path.join(root, next.assetRoot, 'deck.pdf'), path.join(root, 'public/leaked.pdf'));
  await assert.rejects(updateDraft(root, next.manifest, true), /static duplicate/);
});

test('retained registered published draft is not overdue; stray and ambiguous files are', async (t) => {
  const { root, release, promote } = await deliveryFixture(t);
  const past = await release('2021-09-16', 'historical');
  const before = await generatedSnapshot(root);
  const overdue = await inspectDraft(root, past.manifest);
  assert.equal(overdue.localState, 'prepared');
  assert.equal(overdue.publication, 'overdue');
  assert.match(overdue.blockers.join(' '), /reviewed static publication/);
  assertUnverified(overdue);
  await promote(past);
  const report = await inspectDraft(root, past.manifest);
  assert.equal(report.publication, 'registered-static');
  assert.equal(report.localState, 'registered-static');
  assert.match(report.next, /scheduled pointer need not move/);
  assert.deepEqual(report.blockers, []);
  assertUnverified(report);
  const index = path.join(root, 'src/articles/index.ts');
  const registered = await readFile(index, 'utf8');
  for (const text of [
    'export const editions = [];',
    `${registered}\nimport duplicate from './${past.folder}-${past.topic}.md?raw';`,
    registered.replace('import article', '// import article'),
    `/* ${registered} */\nexport const editions = [];`,
    registered.replace('[parseMarkdownToEdition(article)]', '[]'),
    registered.replace('[parseMarkdownToEdition(article)]', '[parseMarkdownToEdition(article), parseMarkdownToEdition(article)]'),
  ]) {
    await writeFile(index, text);
    assert.equal((await inspectDraft(root, past.manifest)).publication, 'overdue');
  }
  await writeFile(index, registered);
  const file = path.join(root, 'src/articles', `${past.folder}-${past.topic}.md`);
  for (const article of [
    past.article.replace(past.editionId, 'edition-2021-09-16-wrong').replace('status: scheduled', 'status: published'),
    past.article,
    past.article.replace('status: scheduled', 'status: published').replace(past.publishAt, '2021-09-16T11:30:00-06:00'),
  ]) {
    await writeFile(file, article);
    assert.equal((await inspectDraft(root, past.manifest)).publication, 'overdue');
  }
  assert.deepEqual(await generatedSnapshot(root), before);
});

test('future static metadata does not claim registered publication', async (t) => {
  const { root, next, promote } = await deliveryFixture(t);
  await promote(next);
  const report = await inspectDraft(root, next.manifest);
  assert.equal(report.publication, 'future');
  assert.equal(report.localState, 'prepared');
  assertUnverified(report);
});

test('actual CLI dry-run, overdue guidance and guarded staging run real preflight', async (t) => {
  const { root, old, next, promote, release } = await deliveryFixture(t, true);
  const run = (manifest, flag) => spawnSync(process.execPath, ['scripts/blog-edition.mjs', 'update', manifest, ...(flag ? [flag] : [])], { cwd: root, encoding: 'utf8' });
  const before = await generatedSnapshot(root);
  const dry = run(next.manifest);
  assert.equal(dry.status, 2, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).localState, 'prepared');
  assertUnverified(JSON.parse(dry.stdout));
  assert.deepEqual(await generatedSnapshot(root), before);
  const late = await release('2021-09-16', 'late');
  const overdue = run(late.manifest);
  assert.equal(overdue.status, 2, overdue.stderr);
  assert.equal(JSON.parse(overdue.stdout).publication, 'overdue');
  await promote(old);
  const staged = run(next.manifest, '--stage');
  assert.equal(staged.status, 0, staged.stderr);
  const report = JSON.parse(staged.stdout);
  assert.equal(report.mode, 'staged');
  assert.equal(report.activeEdition, next.editionId);
  assert.equal(report.sitePreflight.window.timeZone, 'America/Denver');
  assertUnverified(report);
  await createScheduledReleaseTools({ root }).verifyGeneratedRelease();
});

test('real CLI preflight failure preserves generated bytes before any stage', async (t) => {
  const { root, old, next, promote } = await deliveryFixture(t, true);
  await promote(old);
  const timeline = path.join(root, 'src/data/timeline.ts');
  await writeFile(timeline, `${await readFile(timeline, 'utf8')}\n// fixture duplicate integrity IDs\n  id: 'duplicate-fixture',\n  id: 'duplicate-fixture',\n`);
  const before = await generatedSnapshot(root);
  const result = spawnSync(process.execPath, ['scripts/blog-edition.mjs', 'update', next.manifest, '--stage'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /update-site-preflight/);
  assert.deepEqual(await generatedSnapshot(root), before);
});

test('historical 11:30 schedules remain unchanged and are explicitly outside recipe policy', async (t) => {
  const { root, release, promote } = await deliveryFixture(t);
  const history = await release('2021-09-16', 'legacy');
  const publishAt = '2021-09-16T11:30:00-06:00';
  history.article = history.article.replace(history.publishAt, publishAt);
  await writeFile(path.join(root, `${history.stem}.md`), history.article);
  const file = path.join(root, history.manifest);
  await writeFile(file, JSON.stringify({ ...JSON.parse(await readFile(file, 'utf8')), publishAt }));
  await promote(history);
  const before = await generatedSnapshot(root);
  await assert.rejects(inspectDraft(root, history.manifest), /11:50 America\/Denver/);
  await assert.rejects(updateDraft(root, history.manifest, true), /11:50 America\/Denver/);
  assert.deepEqual(await generatedSnapshot(root), before);
  assert.match(await readFile(path.join(root, `${history.stem}.md`), 'utf8'), /T11:30:00-06:00/);
});

test('invalid CLI arguments fail before any write', async () => {
  for (const args of [[], ['new'], ['new', '2026-09-16', 'test', '--force'],
    ['update', 'draft', '--write'], ['update', 'draft', '--stage', 'extra'], ['publish']]) {
    await assert.rejects(main(args), /Usage:/);
  }
});
