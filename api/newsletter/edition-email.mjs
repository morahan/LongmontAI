import { readFile } from 'node:fs/promises';

import { parseFrontmatter } from '../../scripts/lib/newsletter/curation.mjs';
import { createEditionEmailHandler } from '../../scripts/lib/newsletter/edition-email-handler.mjs';
import { NewsletterError } from '../../scripts/lib/newsletter/shared.mjs';
import release from '../../src/generated/scheduled-release/server.mjs';

function invalidRelease(message, cause) {
  return new NewsletterError(message, { status: 500, code: 'edition_release_invalid', cause });
}

export async function loadStagedEdition() {
  let manifest;
  let article;
  try {
    manifest = JSON.parse(await readFile(new URL(`../../${release.source.manifest}`, import.meta.url), 'utf8'));
    article = parseFrontmatter(await readFile(
      new URL(`../../src/generated/scheduled-release/${release.article.file}`, import.meta.url),
      'utf8',
    )).data;
  } catch (error) {
    throw invalidRelease('The staged edition package could not be read.', error);
  }
  if (manifest?.editionId !== release.editionId || article.id !== release.editionId) {
    throw invalidRelease('The staged manifest and article do not match the staged edition.');
  }
  if (!article.title || !/^\d{4}-\d{2}-\d{2}$/.test(article.date ?? '')) {
    throw invalidRelease('The staged article is missing its title or date.');
  }
  return { release, manifest, article: { id: article.id, title: article.title, date: article.date } };
}

export default createEditionEmailHandler({ loadEdition: loadStagedEdition });
