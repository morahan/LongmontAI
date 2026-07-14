#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const publicDir = path.join(rootDir, 'public');
const articleDir = path.join(rootDir, 'src', 'articles');

const assetExtensionPattern = /\.(png|jpe?g|webp|gif|svg|pdf|pptx|mp4|webm|ico|json)$/i;
const dateFolderPattern = /^\d{4}\.\d{2}\.\d{2}$/;
const localPublicAssetPattern = /\/(?:weekly-screenshots|slideshows|documents|images|brand)\/[^)\s'"`]+/g;

const errors = [];

function relative(filePath) {
  return path.relative(rootDir, filePath);
}

function stripUrlDecoration(url) {
  return url.split(/[?#]/, 1)[0];
}

function publicFilePath(url) {
  return path.join(publicDir, stripUrlDecoration(url).replace(/^\//, ''));
}

function isPlaceholderUrl(url) {
  return /YYYY|filename\.|deck-name\.|example-screenshot\./.test(url);
}

function assertPublicAssetExists(url, sourceLabel) {
  const cleanUrl = stripUrlDecoration(url);

  if (!cleanUrl.startsWith('/') || !assetExtensionPattern.test(cleanUrl)) {
    return;
  }

  if (isPlaceholderUrl(cleanUrl)) {
    return;
  }

  if (!fs.existsSync(publicFilePath(cleanUrl))) {
    errors.push(`${sourceLabel}: missing public asset ${cleanUrl}`);
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  const data = {};

  if (!match) {
    return data;
  }

  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    data[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return data;
}

function dateFromUrl(url, bucket) {
  const match = stripUrlDecoration(url).match(new RegExp(`^/${bucket}/([^/]+)/`));
  return match?.[1];
}

function assertArticleAssetDate(url, articleDate, sourceLabel) {
  if (!articleDate) {
    return;
  }

  for (const bucket of ['weekly-screenshots', 'slideshows', 'documents']) {
    const bucketDate = dateFromUrl(url, bucket);
    if (bucketDate && bucketDate !== articleDate) {
      errors.push(`${sourceLabel}: ${url} should live under /${bucket}/${articleDate}/`);
    }
  }
}

function parseRegistrySources(filePath, propertyName) {
  const source = fs.readFileSync(filePath, 'utf8');
  const registry = new Map();
  const entryPattern = /['"]([^'"]+)['"]:\s*\{/g;
  let entryMatch;

  while ((entryMatch = entryPattern.exec(source)) !== null) {
    const id = entryMatch[1];
    const bodyStart = entryMatch.index;
    const nextEntryIndex = source.slice(entryPattern.lastIndex).search(/\n\s{4}['"][^'"]+['"]:\s*\{/);
    const bodyEnd = nextEntryIndex === -1 ? source.length : entryPattern.lastIndex + nextEntryIndex;
    const body = source.slice(bodyStart, bodyEnd);
    const propertyMatch = body.match(new RegExp(`${propertyName}:\\s*['"]([^'"]+)['"]`));

    if (propertyMatch) {
      registry.set(id, propertyMatch[1]);
    }
  }

  return registry;
}

function validatePublicUrlStrings(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const matches = source.matchAll(localPublicAssetPattern);

  for (const match of matches) {
    assertPublicAssetExists(match[0], relative(filePath));
  }
}

function validateDateFolders(bucket) {
  const bucketDir = path.join(publicDir, bucket);
  if (!fs.existsSync(bucketDir)) {
    return;
  }

  for (const entry of fs.readdirSync(bucketDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !dateFolderPattern.test(entry.name)) {
      errors.push(`public/${bucket}/${entry.name}: article-scoped assets must use YYYY.MM.DD folders`);
    }
  }
}

function validateOutputsFolder() {
  const outputsDir = path.join(rootDir, 'outputs');
  if (!fs.existsSync(outputsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(outputsDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      errors.push(`outputs/${entry.name}: tracked output files must live under outputs/YYYY.MM.DD/post-slug/`);
    }

    if (entry.isDirectory() && !dateFolderPattern.test(entry.name)) {
      errors.push(`outputs/${entry.name}: tracked output directories must use YYYY.MM.DD/post-slug/`);
    }
  }
}

function validateRedirectDestinations() {
  const vercelPath = path.join(rootDir, 'vercel.json');
  if (!fs.existsSync(vercelPath)) {
    return;
  }

  const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  for (const redirect of config.redirects ?? []) {
    const destination = redirect.destination;
    if (!destination?.startsWith('/')) {
      continue;
    }

    if (destination.includes(':path*')) {
      const directoryUrl = destination.replace(/:path\*.*$/, '');
      if (!fs.existsSync(publicFilePath(directoryUrl))) {
        errors.push(`vercel.json: redirect destination directory is missing ${directoryUrl}`);
      }
      continue;
    }

    assertPublicAssetExists(destination, 'vercel.json');
  }
}

const slideshowSources = parseRegistrySources(path.join(articleDir, 'slideshows.ts'), 'sourceUrl');
const documentSources = parseRegistrySources(path.join(articleDir, 'documents.ts'), 'src');

for (const fileName of fs.readdirSync(articleDir).filter((name) => name.endsWith('.md')).sort()) {
  const filePath = path.join(articleDir, fileName);
  const markdown = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseFrontmatter(markdown);
  const articleDate = frontmatter.date?.replaceAll('-', '.');
  const sourceLabel = relative(filePath);

  for (const match of markdown.matchAll(localPublicAssetPattern)) {
    const url = match[0];
    assertPublicAssetExists(url, sourceLabel);
    assertArticleAssetDate(url, articleDate, sourceLabel);
  }

  for (const match of markdown.matchAll(/\{\{slideshow:([a-z0-9-]+)\}\}/g)) {
    const deckId = match[1];
    const sourceUrl = slideshowSources.get(deckId);

    if (!sourceUrl) {
      errors.push(`${sourceLabel}: unknown slideshow embed ${deckId}`);
      continue;
    }

    const deckDate = dateFromUrl(sourceUrl, 'slideshows');
    if (articleDate && deckDate !== articleDate) {
      errors.push(`${sourceLabel}: slideshow ${deckId} should live under /slideshows/${articleDate}/`);
    }
  }

  for (const match of markdown.matchAll(/\{\{pdf:([a-z0-9-]+)\}\}/g)) {
    const documentId = match[1];
    const sourceUrl = documentSources.get(documentId);

    if (!sourceUrl) {
      errors.push(`${sourceLabel}: unknown PDF embed ${documentId}`);
      continue;
    }

    const documentDate = dateFromUrl(sourceUrl, 'documents');
    if (articleDate && documentDate !== articleDate) {
      errors.push(`${sourceLabel}: PDF ${documentId} should live under /documents/${articleDate}/`);
    }
  }
}

validatePublicUrlStrings(path.join(articleDir, 'slideshows.ts'));
validatePublicUrlStrings(path.join(articleDir, 'documents.ts'));
validatePublicUrlStrings(path.join(rootDir, 'CONTRIBUTING.md'));
validateDateFolders('weekly-screenshots');
validateDateFolders('slideshows');
validateDateFolders('documents');
validateOutputsFolder();
validateRedirectDestinations();

if (errors.length > 0) {
  console.error('Content asset check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Content asset check passed.');
