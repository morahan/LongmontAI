import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import release from '../src/generated/scheduled-release/server.mjs';

const MEDIA_ROOT = resolve(fileURLToPath(new URL('../src/generated/scheduled-release/media/', import.meta.url)));
const NOT_FOUND_BODY = 'Not Found';
const IMMUTABLE_CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable';
const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

function notFound(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return response.status(404).send(NOT_FOUND_BODY);
}

function scalar(value) { return typeof value === 'string' ? value : null; }

export function createScheduledMediaHandler({ now = Date.now } = {}) {
  return async function scheduledMediaHandler(request, response) {
    const edition = scalar(request.query?.edition);
    const revision = scalar(request.query?.revision);
    const mediaPath = scalar(request.query?.path);
    if (request.method !== 'GET' || now() < release.publishAtMs || edition !== release.editionId ||
        revision !== release.releaseRevision || !mediaPath || !SAFE_PATH.test(mediaPath)) {
      return notFound(response);
    }
    const media = Object.hasOwn(release.media, mediaPath) ? release.media[mediaPath] : null;
    if (!media) return notFound(response);
    try {
      const file = resolve(MEDIA_ROOT, ...mediaPath.split('/'));
      if (!file.startsWith(`${MEDIA_ROOT}${sep}`)) return notFound(response);
      const bytes = await readFile(file);
      response.setHeader('Cache-Control', IMMUTABLE_CACHE);
      response.setHeader('Content-Type', media.contentType);
      return response.status(200).send(bytes);
    } catch {
      return notFound(response);
    }
  };
}

export { IMMUTABLE_CACHE, MEDIA_ROOT, NOT_FOUND_BODY, SAFE_PATH, notFound, release };
export default createScheduledMediaHandler();
