#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFrontmatter } from './lib/newsletter/curation.mjs';
import { parseEditionDigest, renderEditionEmail } from './lib/newsletter/edition-email.mjs';

const [manifestPath, outArg] = process.argv.slice(2);
if (!manifestPath) {
  console.error('Usage: node scripts/preview-edition-email.mjs <manifest.release.json> [outFile.html]');
  process.exit(2);
}

try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const { digest } = parseEditionDigest(manifest);
  const articlePath = manifest.article ?? manifest.articlePath;
  if (typeof articlePath !== 'string') throw new Error('The manifest does not name its article.');
  const { data } = parseFrontmatter(await readFile(articlePath, 'utf8'));
  const email = renderEditionEmail({
    edition: { id: data.id, title: data.title, date: data.date },
    digest,
    postalAddress: process.env.NEWSLETTER_POSTAL_ADDRESS,
  });

  // output/ is gitignored, so a default preview never lands in a commit.
  const outFile = outArg || path.join('output', 'edition-email', `${manifest.editionId}.html`);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, email.html);
  console.log(`Subject: ${email.subject}\n\n${email.text}`);
  console.error(`Wrote ${outFile}`);
} catch (error) {
  console.error(`Edition email preview failed: ${error.message}`);
  process.exit(1);
}
