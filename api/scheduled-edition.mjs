import { readFile } from 'node:fs/promises';

const EDITION_ID = 'edition-2026-08-05-signal-routing';
const PUBLISH_AT = Date.parse('2026-08-05T11:15:00-06:00');
const ARTICLE_URL = new URL('../src/articles/drafts/2026.08.05-signal-routing.md', import.meta.url);

function isPublished(now = Date.now()) {
  return now >= PUBLISH_AT;
}

function notFound(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(404).type('text/plain').send('Not Found');
}

function parseArticle(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Scheduled edition is missing frontmatter');
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;

    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  if (data.id !== EDITION_ID || data.publishAt !== '2026-08-05T11:15:00-06:00') {
    throw new Error('Scheduled edition frontmatter does not match the release contract');
  }

  return {
    id: data.id,
    date: data.date,
    publishAt: data.publishAt,
    title: data.title,
    summary: data.summary,
    markdownContent: match[2].replace(
      /\/weekly-screenshots\/2026\.08\.05\/([A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*)/g,
      (_url, mediaPath) => `/api/scheduled-media?path=${encodeURIComponent(mediaPath)}`,
    ),
  };
}

export { EDITION_ID, PUBLISH_AT, isPublished, parseArticle };

export default async function handler(_request, response) {
  if (!isPublished()) {
    return notFound(response);
  }

  try {
    const article = parseArticle(await readFile(ARTICLE_URL, 'utf8'));
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return response.status(200).json(article);
  } catch (error) {
    // Do not disclose draft paths or malformed draft contents through this endpoint.
    console.error(`Unable to serve ${EDITION_ID}:`, error instanceof Error ? error.message : 'unknown error');
    return notFound(response);
  }
}
