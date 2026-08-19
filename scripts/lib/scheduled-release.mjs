import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const generatedReleaseDir = path.join(repositoryRoot, 'src/generated/scheduled-release');

const TYPES = new Map([
  ['.avif', 'image/avif'], ['.gif', 'image/gif'], ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'], ['.mp4', 'video/mp4'], ['.png', 'image/png'],
  ['.webm', 'video/webm'], ['.webp', 'image/webp'],
]);
const MEDIA_URL = /\/(?:weekly-screenshots|slideshows|documents)\/([A-Za-z0-9._-]+)\/([A-Za-z0-9][A-Za-z0-9._/-]*)/g;
const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?[+-]\d{2}:\d{2}$/;

function fail(message) { throw new Error(`scheduled-release: ${message}`); }
function rootRelative(file) { return path.relative(repositoryRoot, file).split(path.sep).join('/'); }
export function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function safeRelative(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\\') || path.posix.isAbsolute(value)) fail(`${label} must be a safe relative path`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized.split('/').some((part) => !part || part === '.' || part === '..')) fail(`${label} must be a safe relative path`);
  return normalized;
}

function resolveRoot(value, label) {
  const result = path.resolve(repositoryRoot, safeRelative(value, label));
  if (!result.startsWith(`${repositoryRoot}${path.sep}`)) fail(`${label} escapes the repository`);
  return result;
}

async function assertFile(file, label) {
  let info;
  try { info = await lstat(file); } catch { fail(`${label} does not exist: ${rootRelative(file)}`); }
  if (!info.isFile() || info.isSymbolicLink()) fail(`${label} must be a regular file`);
}

export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) fail('article is missing frontmatter');
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at < 1) continue;
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[line.slice(0, at).trim()] = value;
  }
  return { data, body: match[2] };
}

function publication(value, requireFuture) {
  if (typeof value !== 'string' || !OFFSET_TIME.test(value)) fail('publishAt must have an explicit numeric offset');
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail('publishAt is invalid');
  if (requireFuture && milliseconds <= Date.now()) fail('publishAt must be in the future');
  return milliseconds;
}

function slideshowFrom(manifest) {
  if (manifest.slideshow === undefined) {
    if (manifest.slideshowId !== undefined) fail('slideshow metadata and ordered slides are required when slideshowId is set');
    return null;
  }
  const show = manifest.slideshow;
  const id = show?.id ?? manifest.slideshowId;
  if (!show || typeof show !== 'object' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? '')) fail('slideshow is invalid');
  if (!show.title?.trim() || !show.description?.trim() || !Array.isArray(show.slides) || !show.slides.length) fail('slideshow title, description, and slides are required');
  const seen = new Set();
  const slides = show.slides.map((slide, index) => {
    if (!slide?.title?.trim()) fail(`slideshow slide ${index + 1} needs a title`);
    const mediaPath = safeRelative(slide.path, `slideshow slide ${index + 1}`);
    if (seen.has(mediaPath)) fail(`duplicate slideshow path: ${mediaPath}`);
    seen.add(mediaPath);
    return { title: slide.title, path: mediaPath };
  });
  return { id, title: show.title, description: show.description, slides };
}

export async function specFromManifest(manifestName, { requireFuture = true } = {}) {
  const manifestFile = resolveRoot(manifestName, 'manifest');
  await assertFile(manifestFile, 'manifest');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')); } catch { fail('manifest is not valid JSON'); }
  if (manifest?.status !== 'scheduled') fail('manifest status must be scheduled');
  if (!/^edition-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(manifest.editionId ?? '')) fail('editionId is invalid');
  const publishAtMs = publication(manifest.publishAt, requireFuture);
  const manifestRelative = rootRelative(manifestFile);
  const articleRelative = manifest.article
    ? safeRelative(manifest.article, 'article')
    : manifestRelative.replace(/\.release\.json$/, '.md');
  if (articleRelative === manifestRelative) fail('article must be declared or use a .release.json manifest name');
  const articleFile = resolveRoot(articleRelative, 'article');
  await assertFile(articleFile, 'article');
  const articleBytes = await readFile(articleFile);
  const articleText = articleBytes.toString('utf8');
  const frontmatter = parseFrontmatter(articleText).data;
  if (frontmatter.id !== manifest.editionId) fail('article id does not match manifest');
  if (frontmatter.publishAt !== manifest.publishAt) fail('article publishAt does not match manifest');
  if (frontmatter.status !== 'scheduled') fail('article status must be scheduled');
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(manifest.assetFolder ?? '')) fail('assetFolder must use YYYY.MM.DD');
  const assetRootRelative = manifest.assetRoot
    ? safeRelative(manifest.assetRoot, 'assetRoot')
    : `src/articles/drafts/assets/${manifest.assetFolder}`;
  const assetRoot = resolveRoot(assetRootRelative, 'assetRoot');
  try { if (!(await stat(assetRoot)).isDirectory()) fail('assetRoot must be a directory'); } catch { fail(`assetRoot does not exist: ${assetRootRelative}`); }
  const slideshow = slideshowFrom(manifest);
  const selected = new Map();
  for (const match of articleText.matchAll(MEDIA_URL)) {
    if (match[1] !== manifest.assetFolder) fail(`article media uses the wrong dated folder: ${match[0]}`);
    const mediaPath = safeRelative(match[2], 'article media');
    selected.set(mediaPath, { path: mediaPath, sourceUrl: match[0] });
  }
  for (const slide of slideshow?.slides ?? []) if (!selected.has(slide.path)) selected.set(slide.path, { path: slide.path, sourceUrl: null });
  if (!selected.size) fail('release does not reference any media');
  const media = [];
  for (const item of [...selected.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const sourceFile = path.resolve(assetRoot, ...item.path.split('/'));
    if (!sourceFile.startsWith(`${assetRoot}${path.sep}`)) fail(`media escapes assetRoot: ${item.path}`);
    await assertFile(sourceFile, `media ${item.path}`);
    const contentType = TYPES.get(path.extname(item.path).toLowerCase());
    if (!contentType) fail(`unsupported media extension: ${item.path}`);
    const bytes = await readFile(sourceFile);
    media.push({ ...item, sourceFile, contentType, sha256: digest(bytes), bytes });
  }
  return {
    schemaVersion: 1, editionId: manifest.editionId, publishAt: manifest.publishAt, publishAtMs,
    source: { manifest: manifestRelative, article: articleRelative, assetRoot: assetRootRelative },
    article: { sourceFile: articleFile, sha256: digest(articleBytes), bytes: articleBytes },
    slideshow, media,
  };
}

function canonical(spec) {
  return JSON.stringify({
    schemaVersion: spec.schemaVersion, editionId: spec.editionId, publishAt: spec.publishAt,
    articleSha256: spec.article.sha256, slideshow: spec.slideshow,
    media: spec.media.map(({ path: name, sourceUrl, contentType, sha256 }) => ({ path: name, sourceUrl, contentType, sha256 })),
  });
}

function finalize(spec) { return { ...spec, releaseRevision: digest(canonical(spec)).slice(0, 24) }; }
function clientText(spec) {
  return `// Generated public locator metadata. Do not add private release fields.\nexport const scheduledEditionSlug = ${JSON.stringify(spec.editionId)};\nexport const scheduledEditionPublishAt = Date.parse(${JSON.stringify(spec.publishAt)});\n`;
}
function serverText(spec) {
  const release = {
    schemaVersion: 1, editionId: spec.editionId, publishAt: spec.publishAt, publishAtMs: spec.publishAtMs,
    releaseRevision: spec.releaseRevision, source: spec.source,
    article: { file: 'article.md', sha256: spec.article.sha256 }, slideshow: spec.slideshow,
    media: Object.fromEntries(spec.media.map((item) => [item.path, {
      file: `media/${item.path}`, sourceUrl: item.sourceUrl, contentType: item.contentType, sha256: item.sha256,
    }])),
  };
  return `// Generated by scripts/stage-scheduled-release.mjs. Do not edit.\nconst release = Object.freeze(${JSON.stringify(release, null, 2)});\n\nexport default release;\n`;
}

async function writePackage(directory, input) {
  const spec = finalize(input);
  await mkdir(path.join(directory, 'media'), { recursive: true });
  await writeFile(path.join(directory, 'article.md'), spec.article.bytes);
  for (const item of spec.media) {
    const target = path.join(directory, 'media', ...item.path.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, item.bytes);
  }
  await writeFile(path.join(directory, 'server.mjs'), serverText(spec));
  await writeFile(path.join(directory, 'client.ts'), clientText(spec));
  return spec;
}

async function configAt(directory) {
  try { return (await import(`${pathToFileURL(path.join(directory, 'server.mjs')).href}?v=${Date.now()}-${Math.random()}`)).default; }
  catch { fail('generated release configuration is missing or invalid'); }
}

async function filesBelow(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), name));
    else if (entry.isFile()) files.push(name);
    else fail(`generated package contains non-regular entry: ${name}`);
  }
  return files.sort();
}

export async function verifyGeneratedRelease(directory = generatedReleaseDir, { compareSources = true } = {}) {
  const config = await configAt(directory);
  if (config?.schemaVersion !== 1 || config.publishAtMs !== publication(config.publishAt, false)) fail('generated config schema or timestamp is invalid');
  const article = await readFile(path.join(directory, config.article.file));
  if (digest(article) !== config.article.sha256) fail('generated article hash mismatch');
  const material = [];
  for (const [name, item] of Object.entries(config.media).sort(([a], [b]) => a.localeCompare(b))) {
    safeRelative(name, 'generated media');
    const bytes = await readFile(path.join(directory, item.file));
    if (digest(bytes) !== item.sha256) fail(`generated media hash mismatch: ${name}`);
    material.push({ path: name, sourceUrl: item.sourceUrl, contentType: item.contentType, sha256: item.sha256 });
  }
  const expected = ['article.md', 'client.ts', 'server.mjs', ...material.map(({ path: name }) => `media/${name}`)].sort();
  if (JSON.stringify(await filesBelow(directory)) !== JSON.stringify(expected)) fail('generated package has unexpected or missing files');
  const revision = digest(JSON.stringify({ schemaVersion: 1, editionId: config.editionId, publishAt: config.publishAt, articleSha256: config.article.sha256, slideshow: config.slideshow, media: material })).slice(0, 24);
  if (revision !== config.releaseRevision) fail('generated release revision mismatch');
  if (clientText(config) !== await readFile(path.join(directory, 'client.ts'), 'utf8')) fail('generated client locator is stale');
  if (compareSources) {
    if (config.source.manifest) {
      const sourceSpec = finalize(await specFromManifest(config.source.manifest, { requireFuture: false }));
      if (sourceSpec.releaseRevision !== config.releaseRevision) fail('release manifest or approved sources changed after staging');
    }
    const sourceArticle = resolveRoot(config.source.article, 'source article');
    await assertFile(sourceArticle, 'source article');
    if (digest(await readFile(sourceArticle)) !== config.article.sha256) fail('source article changed after staging');
    const sourceRoot = resolveRoot(config.source.assetRoot, 'source assetRoot');
    for (const [name, item] of Object.entries(config.media)) {
      const source = path.resolve(sourceRoot, ...name.split('/'));
      await assertFile(source, `source media ${name}`);
      if (digest(await readFile(source)) !== item.sha256) fail(`source media changed after staging: ${name}`);
    }
  }
  return config;
}

async function isPromoted(active) {
  const index = await readFile(path.join(repositoryRoot, 'src/articles/index.ts'), 'utf8');
  let matches = 0;
  for (const found of index.matchAll(/from ['"](\.\/[^'"]+\.md)\?raw['"]/g)) {
    try {
      const raw = await readFile(path.resolve(repositoryRoot, 'src/articles', found[1]), 'utf8');
      if (parseFrontmatter(raw).data.id === active.editionId) matches += 1;
    } catch { /* normal validation reports broken static imports */ }
  }
  if (matches !== 1) return false;
  if (!active.slideshow) return true;
  const registry = await readFile(path.join(repositoryRoot, 'src/articles/slideshows.ts'), 'utf8');
  const id = active.slideshow.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (registry.match(new RegExp(`['"]${id}['"]\\s*:`, 'g')) ?? []).length === 1;
}

async function lock() {
  const name = path.join(repositoryRoot, '.scheduled-release.lock');
  let handle;
  try { handle = await open(name, 'wx'); } catch (error) { if (error?.code === 'EEXIST') fail('another staging process is running'); throw error; }
  return async () => { await handle.close(); await rm(name, { force: true }); };
}

export async function stageRelease(manifest) {
  const unlock = await lock();
  const parent = path.dirname(generatedReleaseDir);
  const next = path.join(parent, `.scheduled-release.next-${process.pid}`);
  const previous = path.join(parent, `.scheduled-release.previous-${process.pid}`);
  let backedUp = false;
  try {
    const spec = await specFromManifest(manifest);
    let active;
    try { active = await configAt(generatedReleaseDir); } catch { active = null; }
    if (active && active.editionId !== spec.editionId && !(await isPromoted(active))) fail(`active edition ${active.editionId} is not promoted in both static registries`);
    await rm(next, { recursive: true, force: true });
    await writePackage(next, spec);
    await verifyGeneratedRelease(next);
    await mkdir(parent, { recursive: true });
    try { await rename(generatedReleaseDir, previous); backedUp = true; } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    try { await rename(next, generatedReleaseDir); } catch (error) { if (backedUp) await rename(previous, generatedReleaseDir); throw error; }
    await rm(previous, { recursive: true, force: true });
    backedUp = false;
    return finalize(spec);
  } finally {
    await rm(next, { recursive: true, force: true });
    // If rollback itself fails, preserve the backup for explicit recovery.
    await unlock();
  }
}

// Migration helper for the edition that was already staged before this reusable workflow.
export async function materializeExistingRelease(spec) {
  const next = `${generatedReleaseDir}.migration-${process.pid}`;
  await rm(next, { recursive: true, force: true });
  try {
    await writePackage(next, spec);
    await rm(generatedReleaseDir, { recursive: true, force: true });
    await rename(next, generatedReleaseDir);
  } finally { await rm(next, { recursive: true, force: true }); }
}
