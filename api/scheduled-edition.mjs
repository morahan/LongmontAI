import { readFile } from 'node:fs/promises';

import release from '../src/generated/scheduled-release/server.mjs';

const ARTICLE_URL = new URL(`../src/generated/scheduled-release/${release.article.file}`, import.meta.url);
const NOT_FOUND_BODY = 'Not Found';
const RELEASE_CACHE = 'public, max-age=0, s-maxage=60, must-revalidate';

function notFound(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return response.status(404).send(NOT_FOUND_BODY);
}

function scalar(value) {
  return typeof value === 'string' ? value : null;
}

function mediaUrl(mediaPath) {
  const query = new URLSearchParams({
    edition: release.editionId,
    revision: release.releaseRevision,
    path: mediaPath,
  });
  return `/api/scheduled-media?${query}`;
}

function parseArticle(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('article frontmatter is invalid');
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[line.slice(0, separator).trim()] = value;
  }
  if (data.id !== release.editionId || data.publishAt !== release.publishAt || data.status !== 'scheduled') {
    throw new Error('article does not match generated release');
  }
  let markdownContent = match[2];
  for (const [mediaPath, media] of Object.entries(release.media).sort(([, left], [, right]) => (right.sourceUrl?.length ?? 0) - (left.sourceUrl?.length ?? 0))) {
    if (media.sourceUrl) markdownContent = markdownContent.replaceAll(media.sourceUrl, mediaUrl(mediaPath));
  }
  return {
    id: data.id,
    date: data.date,
    publishAt: data.publishAt,
    title: data.title,
    summary: data.summary,
    markdownContent,
  };
}

function slideshows() {
  if (!release.slideshow) return undefined;
  return {
    [release.slideshow.id]: {
      id: release.slideshow.id,
      title: release.slideshow.title,
      description: release.slideshow.description,
      slides: release.slideshow.slides.map((slide) => ({ title: slide.title, src: mediaUrl(slide.path) })),
    },
  };
}

export function createScheduledEditionHandler({ now = Date.now } = {}) {
  return async function scheduledEditionHandler(request, response) {
    if (request.method !== 'GET' || now() < release.publishAtMs || scalar(request.query?.slug) !== release.editionId) {
      return notFound(response);
    }
    try {
      const edition = parseArticle(await readFile(ARTICLE_URL, 'utf8'));
      response.setHeader('Cache-Control', RELEASE_CACHE);
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      return response.status(200).json({
        releaseRevision: release.releaseRevision,
        edition,
        slideshows: slideshows(),
      });
    } catch (error) {
      console.error(`Unable to serve scheduled edition: ${error instanceof Error ? error.message : 'unknown error'}`);
      return notFound(response);
    }
  };
}

export { NOT_FOUND_BODY, RELEASE_CACHE, mediaUrl, notFound, parseArticle, release };
export default createScheduledEditionHandler();
