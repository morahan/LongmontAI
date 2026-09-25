import assert from 'node:assert/strict';
import { readFile, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import {
  makeWorkspace, manifestPath, loadStager, loadApiModules, requestHandler,
  FIRST_ID, FIRST_PUBLISH_AT as T, repositoryRoot, assertGenericNotFound,
} from './fixtures/scheduled/contract-harness.mjs';

// Real TSX and its actual dependencies, not a parser substitute or component mock.
test('scheduled video stage -> API -> ContentBlock transport, rendering and inert invalid tokens', async () => {
  const root = await makeWorkspace();
  const cacheDir = await mkdtemp(join(tmpdir(), 'longmontai-video-vite-'));
  let server;
  try {
    server = await createServer({ root: repositoryRoot, cacheDir,
      server: { middlewareMode: true }, appType: 'custom',
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const { default: ContentBlock } = await server.ssrLoadModule('/src/components/ContentBlock.tsx');
    const render = (markdown, slideshows) => renderToStaticMarkup(React.createElement(ContentBlock, { markdown, slideshows }));
    const article = join(root, 'src/articles/drafts/2026.09.02-first.md');
    const token = (src) => `{{video:${src}}}`;
    const mediaPaths = ['demo.mp4', 'clips/demo.webm'];
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(root, 'src/articles/drafts/assets/2026.09.02/clips'));
    for (const name of mediaPaths) {
      await writeFile(join(root, 'src/articles/drafts/assets/2026.09.02', name), `synthetic ${name} transport bytes; not codec/playback evidence`);
    }
    await writeFile(article, (await readFile(article, 'utf8')) + `\nBefore video\n\n${token('/weekly-screenshots/2026.09.02/demo.mp4')}{{slideshow:first-deck}}${token('/weekly-screenshots/2026.09.02/clips/demo.webm')}\n\nAfter video\n`);
    const stage = await loadStager();
    const release = await stage({ root, manifest: manifestPath(root), now: T - 1 });
    const api = await loadApiModules(root);
    const url = (path) => `/api/scheduled-media?edition=${FIRST_ID}&revision=${release.releaseRevision}&path=${encodeURIComponent(path)}`;
    const edition = await requestHandler(api.edition, 'edition', { root, now: T, query: { slug: FIRST_ID } });
    assert.equal(edition.status, 200);
    const html = render(edition.json.edition.markdownContent, edition.json.slideshows);
    assert.equal((html.match(/<video\b/g) ?? []).length, 2);
    assert.equal((html.match(/controls=""/g) ?? []).length, 2);
    assert.equal((html.match(/playsInline=""/g) ?? []).length, 2);
    assert.doesNotMatch(html, /autoPlay/);
    const leadingProse = html.indexOf('Before video');
    const trailingProse = html.indexOf('After video');
    const firstVideoStart = html.indexOf('<video');
    assert.ok(leadingProse >= 0 && leadingProse < firstVideoStart);
    const firstVideoEnd = html.indexOf('</video>');
    const secondVideoStart = html.indexOf('<video', firstVideoEnd);
    const interveningSlideshow = html.indexOf('slideshow-panel', firstVideoEnd);
    assert.ok(firstVideoStart >= 0 && firstVideoEnd > firstVideoStart);
    assert.ok(secondVideoStart > firstVideoEnd);
    assert.ok(interveningSlideshow >= firstVideoEnd && interveningSlideshow < secondVideoStart);
    assert.ok(trailingProse >= 0 && trailingProse > secondVideoStart);
    for (const name of mediaPaths) {
      const mime = name.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
      assert.ok(html.includes(`<source src="${url(name).replaceAll('&', '&amp;')}" type="${mime}"`));
      const query = Object.fromEntries(new URLSearchParams(url(name).split('?')[1]));
      const media = await requestHandler(api.media, 'media', { root, now: T, query });
      assert.equal(media.status, 200);
      assert.equal(media.headers['content-type'], mime);
      assert.deepEqual(media.body, await readFile(join(root, 'src/articles/drafts/assets/2026.09.02', name)));
      assertGenericNotFound(assert, await requestHandler(api.media, 'media', { root, now: T - 1, query }));
    }
    assertGenericNotFound(assert, await requestHandler(api.edition, 'edition', { root, now: T - 1, query: { slug: FIRST_ID } }));
    for (const query of [
      { edition: FIRST_ID, revision: release.releaseRevision, path: 'unreferenced.mp4' },
      { edition: FIRST_ID, revision: '0'.repeat(24), path: 'demo.mp4' },
    ]) assertGenericNotFound(assert, await requestHandler(api.media, 'media', { root, now: T, query }));

    // Keep the actual July 22 static syntax, plus supported webm and relative locals.
    const july = await readFile(join(repositoryRoot, 'src/articles/2026.07.22-efficiency-frontier.md'), 'utf8');
    const julyToken = july.match(/\{\{video:[^}]+\}\}/)?.[0];
    assert.ok(julyToken);
    for (const [source, mime] of [[julyToken, 'video/mp4'], [token('/weekly-screenshots/2026.09.02/demo.webm'), 'video/webm'], [token('media/demo.mp4'), 'video/mp4']]) {
      const staticHtml = render(source);
      assert.match(staticHtml, /<video controls="" preload="metadata" playsInline="">/);
      assert.ok(staticHtml.includes(`type="${mime}"`));
    }
    // Extension matching is case-insensitive; URL spelling must remain intact.
    const { videoMime } = await server.ssrLoadModule('/src/lib/videoEmbed.ts');
    for (const [extension, mime] of [
      ['mp4', 'video/mp4'], ['MP4', 'video/mp4'], ['mP4', 'video/mp4'],
      ['webm', 'video/webm'], ['WEBM', 'video/webm'], ['WeBm', 'video/webm'],
    ]) {
      for (const source of [`media/demo.${extension}`, `/media/demo.${extension}`, url(`clips/demo.${extension}`)]) {
        assert.equal(videoMime(source), mime, source);
        const caseHtml = render(token(source));
        assert.ok(caseHtml.includes(`<source src="${source.replaceAll('&', '&amp;')}" type="${mime}"`), source);
      }
    }
    const valid = url('demo.mp4');
    const invalid = [
      'https://evil.example/demo.mp4', '//evil.example/demo.mp4', 'javascript:demo.mp4', 'data:video/mp4,demo', 'blob:demo.mp4',
      '/api/other?' + valid.split('?')[1], valid.replace('/api/', 'https://evil.example/api/'),
      valid.replace(`edition=${FIRST_ID}&`, ''), valid.replace(/&revision=[^&]+/, ''), valid.replace('&path=demo.mp4', ''),
      valid + '&extra=x', valid + '&path=demo.mp4', valid + `&edition=${FIRST_ID}`, valid + `&revision=${release.releaseRevision}`,
      valid.replace(FIRST_ID, ''), valid.replace(FIRST_ID, 'other'), valid.replace(release.releaseRevision, ''),
      valid.replace(release.releaseRevision, 'A'.repeat(24)), valid.replace(release.releaseRevision, 'a'.repeat(23)),
      valid + '#fragment', valid.replace('demo.mp4', 'demo.mov'), valid.replace('demo.mp4', 'demo.mp4%23fragment'),
      ...['../demo.mp4', '%2E%2E%2Fdemo.mp4', '%252E%252E%252Fdemo.mp4', 'clips%2F..%2Fdemo.mp4',
        'clips%5Cdemo.mp4', 'demo%00.mp4', 'demo%0A.mp4', '%ZZdemo.mp4', 'demo.mp4%22', 'demo.mp4%7D%7D',
        '%64emo.mp4', 'clips%2fdemo.webm', 'demo.mp4&'].map((value) => valid.replace('demo.mp4', value)),
      '/media/../demo.mp4', '/media/./demo.mp4', '../demo.mp4', './demo.mp4', '/media//demo.mp4', '/media\\demo.mp4',
      '/media/demo.mp4#fragment', '/media/demo.mp4?extra=1', '/media/demo\n.mp4', '/media/demo\u0000.mp4',
      '/media/demo.mp4" onerror="alert(1)', '/media/de}mo.mp4<script>alert(1)</script>',
      valid.replace(`edition=${FIRST_ID}&revision=${release.releaseRevision}`, `revision=${release.releaseRevision}&edition=${FIRST_ID}`),
    ];
    for (const source of invalid.flatMap((source) => [source, source.replaceAll('.mp4', '.MP4').replaceAll('.webm', '.WeBm')])) {
      assert.equal(videoMime(source), null, source);
      const unsafeHtml = render(`Safe before\n\n${token(source)}\n\nSafe after`);
      assert.doesNotMatch(unsafeHtml, /<(?:video|source|script|iframe)\b/i, source);
      assert.ok(unsafeHtml.includes('Safe before') && unsafeHtml.includes('Safe after'), source);
    }
    assert.doesNotMatch(render(`${token(valid)}<script>alert(1)</script>`), /<script\b/);
    // Broad query grammar must not spread to other embed families.
    assert.doesNotMatch(render(`{{slideshow:${valid}}}{{pdf:${valid}}}`), /<(?:iframe|video|source)\b/);
    const mixed = render(`{{pdf:missing-fixture}}${token(valid)}{{slideshow:first-deck}}`, edition.json.slideshows);
    assert.ok(mixed.includes('Missing document:'));
    assert.ok(mixed.includes('slideshow-panel'));
    assert.equal((mixed.match(/<video\b/g) ?? []).length, 1);
  } finally {
    await server?.close();
    await rm(root, { recursive: true, force: true });
    await rm(cacheDir, { recursive: true, force: true });
  }
});
