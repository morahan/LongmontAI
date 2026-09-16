import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
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

test('invalid CLI arguments fail before any write', async () => {
  for (const args of [[], ['new'], ['new', '2026-09-16', 'test', '--force'],
    ['update', 'draft', '--write'], ['update', 'draft', '--stage', 'extra'], ['publish']]) {
    await assert.rejects(main(args), /Usage:/);
  }
});
