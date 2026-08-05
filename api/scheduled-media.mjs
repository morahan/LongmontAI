import { readFile } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isPublished } from './scheduled-edition.mjs';

const ARTICLE_URL = new URL('../src/articles/drafts/2026.08.05-signal-routing.md', import.meta.url);
const ASSET_ROOT = fileURLToPath(new URL('../src/articles/drafts/assets/2026.08.05/', import.meta.url));
const ARTICLE_MEDIA_PATTERN = /\/weekly-screenshots\/2026\.08\.05\/([A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*)/g;
const SLIDESHOW_MEDIA = new Set(Array.from({ length: 8 }, (_, index) => `slideshow/slide-${String(index + 1).padStart(2, '0')}.png`));
const CONTENT_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function notFound(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(404).type('text/plain').send('Not Found');
}

function requestedPath(request) {
  const path = Array.isArray(request.query.path) ? request.query.path[0] : request.query.path;
  if (typeof path !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(path)) {
    return null;
  }
  return path;
}

async function allowedMedia() {
  const article = await readFile(ARTICLE_URL, 'utf8');
  const allowed = new Set(SLIDESHOW_MEDIA);
  for (const match of article.matchAll(ARTICLE_MEDIA_PATTERN)) {
    allowed.add(match[1]);
  }
  return allowed;
}

export { allowedMedia, requestedPath };

export default async function handler(request, response) {
  if (!isPublished()) {
    return notFound(response);
  }

  const path = requestedPath(request);
  if (!path) {
    return notFound(response);
  }

  try {
    if (!(await allowedMedia()).has(path)) {
      return notFound(response);
    }

    const assetPath = resolve(ASSET_ROOT, path);
    if (!assetPath.startsWith(`${ASSET_ROOT}${sep}`) || basename(assetPath) !== path.split('/').at(-1)) {
      return notFound(response);
    }

    const contentType = CONTENT_TYPES.get(extname(assetPath).toLowerCase());
    if (!contentType) {
      return notFound(response);
    }

    const asset = await readFile(assetPath);
    response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');
    response.setHeader('Content-Type', contentType);
    return response.status(200).send(asset);
  } catch {
    return notFound(response);
  }
}
