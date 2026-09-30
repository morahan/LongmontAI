import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// The scheduled-* glob includes this shared static/scheduled edition contract.
test('edition sharing uses canonical links, platform fallback and safe outcomes', async (t) => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'longmontai-share-vite-'));
    const server = await createServer({ cacheDir, server: { middlewareMode: true }, appType: 'custom',
        optimizeDeps: { noDiscovery: true, include: [] } });
    try {
        const { canonicalEditionUrl, shareEdition } = await server.ssrLoadModule('/src/lib/editionShare.ts');
        const url = canonicalEditionUrl('https://longmontai.com/edition/old?tracking=1#section', 'edition-2026-09-16-astra-then-projects');
        const title = 'An edition';
        assert.equal(url, 'https://longmontai.com/edition/edition-2026-09-16-astra-then-projects');
        assert.equal(canonicalEditionUrl('https://preview.example', 'a/b?c#d'), 'https://preview.example/edition/a%2Fb%3Fc%23d');

        await t.test('native share is preferred and retains navigator receiver', async () => {
            const platform = {
                canShare(data) { assert.equal(this, platform); assert.deepEqual(data, { title, url }); return true; },
                async share(data) { assert.equal(this, platform); assert.deepEqual(data, { title, url }); },
                clipboard: { async writeText() { assert.fail('native success must not copy'); } },
            };
            assert.equal(await shareEdition(platform, title, url), 'shared');
            assert.equal(await shareEdition({ async share() {} }, title, url), 'shared');
        });
        await t.test('missing, unsupported and rejected native sharing fall back to clipboard', async () => {
            for (const native of [
                {},
                { canShare: () => false, share: () => assert.fail('unsupported share called') },
                { share: async () => { throw new Error('private platform detail'); } },
            ]) {
                let copied;
                const clipboard = { async writeText(value) { assert.equal(this, clipboard); copied = value; } };
                assert.equal(await shareEdition({ ...native, clipboard }, title, url), 'copied');
                assert.equal(copied, url);
            }
        });
        await t.test('native cancellation does not copy or report success', async () => {
            assert.equal(await shareEdition({
                share: async () => { throw new DOMException('private cancellation detail', 'AbortError'); },
                clipboard: { async writeText() { assert.fail('cancellation must not copy'); } },
            }, title, url), 'cancelled');
        });
        await t.test('missing APIs and clipboard failures return only generic failure', async () => {
            assert.equal(await shareEdition({}, title, url), 'failed');
            assert.equal(await shareEdition({ clipboard: { async writeText() { throw new Error('private denial'); } } }, title, url), 'failed');
        });
        await t.test('success is reported only after the platform promise resolves', async () => {
            let finish;
            let settled = false;
            const result = shareEdition({ share: () => new Promise((resolve) => { finish = resolve; }) }, title, url)
                .then((value) => { settled = true; return value; });
            await Promise.resolve();
            assert.equal(settled, false);
            finish();
            assert.equal(await result, 'shared');
        });
        await t.test('real shared component exposes an accessible button and mounted live region', async () => {
            const { default: EditionShare } = await server.ssrLoadModule('/src/components/EditionShare.tsx');
            const html = renderToStaticMarkup(React.createElement(EditionShare, { editionId: 'example', title }));
            assert.match(html, /<button[^>]+type="button"[^>]+aria-label="Share this edition"/);
            assert.match(html, /aria-live="polite" aria-atomic="true"/);
            // An idle control is not a page-loading status (the mobile audit waits for those).
            assert.doesNotMatch(html, /role="status"|Edition shared\.|Edition link copied\./);
        });
        await t.test('both callers retain centered titles and wire the shared control to edition identity', async () => {
            for (const name of ['Edition', 'ScheduledEdition']) {
                const source = await readFile(new URL(`../../src/pages/${name}.tsx`, import.meta.url), 'utf8');
                assert.match(source, /<EditionShare key=\{edition.id\} editionId=\{edition.id\} title=\{edition.title\} \/>/);
                assert.match(source, /<h1 className="[^"]*text-center[^"]*">/);
                assert.doesNotMatch(source, /<Share2/);
            }
        });
    } finally {
        await server.close();
        await rm(cacheDir, { recursive: true, force: true });
    }
});
