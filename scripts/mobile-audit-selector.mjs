#!/usr/bin/env node

export const FULL_ROUTES = [
  '/',
  '/tools',
  '/model-watch',
  '/timeline',
  '/countdown',
  '/leaderboard',
  '/about',
  '/edition/edition-2026-06-10-ai-landscape',
];

const PAGE_ROUTES = new Map([
  ['src/pages/Feed.tsx', ['/']],
  ['src/pages/Tools.tsx', ['/tools']],
  ['src/pages/ModelWatch.tsx', ['/model-watch']],
  ['src/pages/Timeline.tsx', ['/timeline']],
  ['src/pages/Countdown.tsx', ['/countdown']],
  ['src/pages/Leaderboard.tsx', ['/leaderboard']],
  ['src/data/modelWatch.ts', ['/model-watch']],
  ['src/data/modelWatch.generated.json', ['/model-watch']],
  ['src/data/timeline.ts', ['/timeline']],
  ['src/data/browserCaptureTools.js', ['/tools']],
  ['src/data/browserCaptureTools.d.ts', ['/tools']],
]);

const SHARED_WEB_FILES = new Set([
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.d.ts',
  'eslint.config.js',
  'tsconfig.json',
  'tsconfig.node.json',
  'src/App.tsx',
  'src/App.css',
  'src/main.tsx',
  'src/index.css',
]);

const SKIPPED_PREFIXES = [
  '.agents/', '.claude/', '.codex/', '.githooks/', '.github/', '.hermes/',
  'api/', 'docs/', 'outputs/', 'scripts/',
];
const SKIPPED_FILES = new Set([
  '.gitignore', '.yarnrc.yml', 'AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md',
  'DEPLOYMENT.md', 'README.md', 'design.md', 'justfile', 'vercel.json', 'walkthrough.md',
]);

function editionId(markdown) {
  const match = markdown.match(/^id:\s*['"]?([^'"\s]+)['"]?\s*$/m);
  return match?.[1];
}

function addRoutes(target, routes) {
  for (const route of routes) target.add(route);
}

export async function selectMobileAudit(paths, options = {}) {
  const readSnapshot = options.readSnapshot ?? (async () => undefined);
  const snapshotIsUnambiguous = options.snapshotIsUnambiguous ?? (async () => true);
  const listPublishedArticles = options.listPublishedArticles ?? (async () => []);
  const routes = new Set();
  const reasons = [];

  async function full(reason) {
    return { action: 'full', routes: FULL_ROUTES, reason };
  }

  for (const rawPath of paths) {
    const path = rawPath.replaceAll('\\', '/').replace(/^\.\//, '');
    if (!path || path.includes('\0')) return full(`invalid path: ${JSON.stringify(rawPath)}`);

    if (PAGE_ROUTES.has(path)) {
      addRoutes(routes, PAGE_ROUTES.get(path));
      reasons.push(path);
      continue;
    }

    if (/^src\/articles\/[^/]+\.md$/.test(path) && path !== 'src/articles/model-comparison-matrix.md') {
      const markdown = await readSnapshot(path);
      const id = markdown && editionId(markdown);
      if (!id) return full(`cannot resolve published edition from ${path}`);
      addRoutes(routes, ['/', `/edition/${id}`]);
      reasons.push(path);
      continue;
    }

    if (/^public\/weekly-screenshots\/\d{4}\.\d{2}\.\d{2}\//.test(path) ||
        /^public\/documents\/\d{4}\.\d{2}\.\d{2}\//.test(path)) {
      if (!await snapshotIsUnambiguous(path)) {
        return full(`ambiguous editorial asset snapshot ${path}`);
      }
      const date = path.split('/')[2];
      const articlePaths = await listPublishedArticles();
      if (!Array.isArray(articlePaths)) return full(`ambiguous published article snapshots for ${path}`);
      const matchingRoutes = [];
      for (const articlePath of articlePaths) {
        if (!articlePath.startsWith(`src/articles/${date}`) || !articlePath.endsWith('.md')) continue;
        const markdown = await readSnapshot(articlePath);
        const id = markdown && editionId(markdown);
        if (!id) return full(`cannot resolve edition snapshot ${articlePath} for ${path}`);
        matchingRoutes.push(`/edition/${id}`);
      }
      if (matchingRoutes.length === 0) return full(`cannot map dated editorial asset ${path}`);
      addRoutes(routes, matchingRoutes);
      reasons.push(path);
      continue;
    }

    if (SHARED_WEB_FILES.has(path) || path.startsWith('src/components/') ||
        path === 'src/articles/index.ts' || path === 'src/articles/types.ts' ||
        path === 'src/articles/slideshows.ts' || path === 'src/articles/documents.ts' ||
        path === 'src/articles/chinese-model-release-widgets.tsx' ||
        path === 'src/articles/chinese-model-releases.ts' ||
        path.startsWith('public/brand/') || path.startsWith('public/images/')) {
      return full(`shared web surface changed: ${path}`);
    }

    if (path.startsWith('src/articles/drafts/') || path.startsWith('src/generated/') ||
        SKIPPED_FILES.has(path) || SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      continue;
    }

    // A new web path or an unclassified repository path is not safe to skip.
    return full(`unclassified path: ${path}`);
  }

  if (routes.size === 0) return { action: 'skip', routes: [], reason: 'no live browser surface changed' };
  return { action: 'routes', routes: [...routes], reason: reasons.join(', ') };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await selectMobileAudit(process.argv.slice(2));
  console.log(JSON.stringify(result));
}
