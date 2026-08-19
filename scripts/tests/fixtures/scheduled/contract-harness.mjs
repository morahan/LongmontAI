import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const repositoryRoot = resolve(new URL('../../../..', import.meta.url).pathname);
export const fixtureWorkspace = resolve(new URL('./workspace', import.meta.url).pathname);
export const FIRST_ID = 'edition-2026-09-02-first';
export const SECOND_ID = 'edition-2026-09-16-second';
export const FIRST_PUBLISH_AT = Date.parse('2026-09-02T11:50:00-06:00');
export const TEST_NOW = Date.parse('2026-08-01T12:00:00-06:00');

export class HarnessIntegrationError extends Error {
  constructor(message) {
    super(`[HARNESS_INTEGRATION] ${message}`);
    this.name = 'HarnessIntegrationError';
  }
}

export async function makeWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'longmontai-scheduled-contract-'));
  await cp(fixtureWorkspace, root, { recursive: true });
  return root;
}

export async function cloneWorkspace(source) {
  const root = await mkdtemp(join(tmpdir(), 'longmontai-scheduled-deployment-'));
  await cp(source, root, { recursive: true });
  return root;
}

export function manifestPath(root, which = 'first') {
  const file = which === 'first'
    ? '2026.09.02-first.release.json'
    : '2026.09.16-second.release.json';
  return join(root, 'src/articles/drafts', file);
}

async function importFirst(paths, purpose) {
  const misses = [];
  for (const path of paths) {
    try {
      return { module: await import(`${pathToFileURL(path).href}?contract=${Date.now()}-${Math.random()}`), path };
    } catch (error) {
      if (error?.code === 'ERR_MODULE_NOT_FOUND') {
        misses.push(relative(repositoryRoot, path));
        continue;
      }
      throw new HarnessIntegrationError(`${purpose} module ${relative(repositoryRoot, path)} could not load: ${error.message}`);
    }
  }
  throw new HarnessIntegrationError(`${purpose} module missing; expected one of: ${misses.join(', ')}`);
}

export async function loadStager() {
  const { module, path } = await importFirst([
    join(repositoryRoot, 'scripts/lib/scheduled-release.mjs'),
    join(repositoryRoot, 'scripts/stage-scheduled-release.mjs'),
    join(repositoryRoot, 'scripts/stage-scheduled-edition.mjs'),
    join(repositoryRoot, 'scripts/stage-edition.mjs'),
    join(repositoryRoot, 'scripts/lib/stage-scheduled-edition.mjs'),
  ], 'staging core');
  if (typeof module.createScheduledReleaseTools === 'function') {
    return async ({ root, manifest, now = TEST_NOW }) => {
      const tools = module.createScheduledReleaseTools({ root, now: () => now });
      return tools.stageRelease(relative(root, manifest).replaceAll('\\', '/'));
    };
  }

  const stage = module.stageScheduledEdition ?? module.stageEdition ?? module.stageRelease ?? module.default;
  if (typeof stage !== 'function') {
    throw new HarnessIntegrationError(`staging core ${relative(repositoryRoot, path)} must export an injected-root staging factory or function`);
  }
  return async ({ root, manifest, now = TEST_NOW }) => {
    const options = { root, now: () => now, clock: () => now };
    if (stage === module.stageRelease) {
      return stage(relative(root, manifest).replaceAll('\\', '/'), options);
    }
    return stage({ root, manifestPath: manifest, manifest, ...options });
  };
}

export async function allFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await visit(root);
  return files.sort();
}

export async function snapshot(root) {
  const entries = await Promise.all((await allFiles(root)).map(async (path) => {
    const bytes = await readFile(path);
    return [relative(root, path), createHash('sha256').update(bytes).digest('hex')];
  }));
  return Object.fromEntries(entries);
}

export async function mutateJson(path, mutate) {
  const value = JSON.parse(await readFile(path, 'utf8'));
  mutate(value);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function promoteFirstEdition(root) {
  const draft = join(root, 'src/articles/drafts/2026.09.02-first.md');
  const article = join(root, 'src/articles/2026.09.02-first.md');
  await cp(draft, article);

  const sourceAssets = join(root, 'src/articles/drafts/assets/2026.09.02');
  const publicArticle = join(root, 'public/weekly-screenshots/2026.09.02');
  const publicSlides = join(root, 'public/slideshows/2026.09.02/first-deck');
  await mkdir(publicArticle, { recursive: true });
  await mkdir(publicSlides, { recursive: true });
  await cp(join(sourceAssets, 'private-hero.png'), join(publicArticle, 'private-hero.png'));
  await cp(join(sourceAssets, 'slideshow'), publicSlides, { recursive: true });

  await writeFile(join(root, 'src/articles/index.ts'), [
    "import first from './2026.09.02-first.md?raw';",
    `export const editions = [{ id: '${FIRST_ID}', source: first }];`,
    '',
  ].join('\n'));
  await writeFile(join(root, 'src/articles/slideshows.ts'), [
    'export const slideshowDecks = {',
    "  'first-deck': {",
    "    id: 'first-deck',",
    "    sourceUrl: '/slideshows/2026.09.02/first-deck/slide-01.png',",
    '    slides: [',
    "      { title: 'First slide', src: '/slideshows/2026.09.02/first-deck/slide-01.png' },",
    "      { title: 'Second slide', src: '/slideshows/2026.09.02/first-deck/slide-02.png' },",
    '    ],',
    '  },',
    '};',
    '',
  ].join('\n'));
}

export async function findGeneratedPackages(root, editionId = FIRST_ID) {
  const sourceFiles = (await allFiles(root)).filter((path) =>
    /\.(?:mjs|js|ts|json)$/.test(path)
    && !path.includes('/drafts/')
    && !path.endsWith('/vercel.json'));
  const matching = [];
  for (const path of sourceFiles) {
    const text = await readFile(path, 'utf8');
    if (text.includes(editionId)) matching.push({ path, text });
  }
  const client = matching.find(({ path }) => path.includes('/src/'));
  const server = matching.find(({ path }) => path.includes('/api/') || /server/i.test(path));
  if (!client || !server) {
    throw new HarnessIntegrationError(
      `staging must generate separate client and server packages containing ${editionId}; found ${matching.map(({ path }) => relative(root, path)).join(', ') || 'none'}`,
    );
  }
  return { client, server, matching };
}

export async function importGeneratedServer(serverPath) {
  const module = await import(`${pathToFileURL(serverPath).href}?generated=${Date.now()}-${Math.random()}`);
  return module.release ?? module.scheduledRelease ?? module.default ?? module;
}

export async function loadApiModules(root) {
  const editionPath = join(root, 'api/scheduled-edition.mjs');
  const mediaPath = join(root, 'api/scheduled-media.mjs');
  await cp(join(repositoryRoot, 'api/scheduled-edition.mjs'), editionPath);
  await cp(join(repositoryRoot, 'api/scheduled-media.mjs'), mediaPath);
  const edition = await importFirst([editionPath], 'edition API');
  const media = await importFirst([mediaPath], 'media API');
  return { edition: edition.module, media: media.module };
}

function selectHandler(module, kind, options) {
  const factory = kind === 'edition'
    ? module.createScheduledEditionHandler ?? module.createEditionHandler ?? module.createHandler
    : module.createScheduledMediaHandler ?? module.createMediaHandler ?? module.createHandler;
  if (typeof factory === 'function') {
    const handler = factory(options);
    if (typeof handler !== 'function') {
      throw new HarnessIntegrationError(`${kind} API factory must return a handler`);
    }
    return { handler, patchesDate: false };
  }
  if (typeof module.default === 'function') return { handler: module.default, patchesDate: true };
  throw new HarnessIntegrationError(`${kind} API must export a clock-injected handler factory or default handler`);
}

function responseRecorder() {
  const record = { status: undefined, headers: {}, body: undefined };
  const response = {
    setHeader(name, value) { record.headers[String(name).toLowerCase()] = String(value); return response; },
    status(code) { record.status = code; return response; },
    json(value) { record.body = Buffer.from(JSON.stringify(value)); record.json = value; return response; },
    send(value) { record.body = Buffer.isBuffer(value) ? value : Buffer.from(String(value)); return response; },
    end(value = '') { record.body = Buffer.from(String(value)); return response; },
  };
  return { record, response };
}

export async function requestHandler(module, kind, {
  root,
  release,
  now,
  method = 'GET',
  query = {},
}) {
  const clock = () => now;
  const { handler, patchesDate } = selectHandler(module, kind, { root, release, clock, now: clock });
  const { record, response } = responseRecorder();
  const request = { method, query, headers: { accept: kind === 'edition' ? 'application/json' : '*/*' } };
  const originalNow = Date.now;
  if (patchesDate) Date.now = clock;
  try {
    await handler(request, response);
  } finally {
    if (patchesDate) Date.now = originalNow;
  }
  if (record.status === undefined || record.body === undefined) {
    throw new HarnessIntegrationError(`${kind} handler did not complete through status(...).send/json/end`);
  }
  return record;
}

export function correctQuery(release, overrides = {}) {
  const edition = release.editionId ?? release.id ?? FIRST_ID;
  const revision = release.revision ?? release.releaseRevision ?? release.fingerprint;
  if (!revision) throw new HarnessIntegrationError('generated server package must expose revision/releaseRevision/fingerprint');
  return { edition, slug: edition, revision, ...overrides };
}

export function collectUrls(value, found = []) {
  if (typeof value === 'string') {
    found.push(...(value.match(/\/api\/[^\s)"']+/g) ?? []));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectUrls(item, found));
  }
  return found;
}

export function assertGenericNotFound(assert, response) {
  assert.equal(response.status, 404);
  assert.equal(response.body.toString(), 'Not Found');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
}

export function cacheDirectives(header = '') {
  return new Map(header.split(',').map((part) => {
    const [name, value] = part.trim().toLowerCase().split('=', 2);
    return [name, value === undefined ? true : Number(value)];
  }));
}
