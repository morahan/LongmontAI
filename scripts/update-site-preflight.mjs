import { execFile } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { modelWatchSources as detectorSources } from './model-watch-sources.mjs';

const root = new URL('../', import.meta.url);
// Anchor to this script's checkout, never the caller's cwd or a machine path.
const expectedRoot = await realpath(fileURLToPath(root));
const execFileAsync = promisify(execFile);

export async function assertSiteRepository(detectedRoot, canonicalRoot = expectedRoot) {
  // Ignore inherited Git routing overrides: identity must come from these paths.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  async function identity(directory) {
    const { stdout } = await execFileAsync('git', [
      '-C', directory, 'rev-parse', '--path-format=absolute', '--show-toplevel', '--git-common-dir',
    ], { env });
    const [topLevel, commonDirectory] = stdout.trimEnd().split('\n');
    if (await realpath(topLevel) !== await realpath(directory)) {
      throw new Error('Expected a repository root');
    }
    return realpath(commonDirectory);
  }
  try {
    const [detected, expected] = await Promise.all([identity(detectedRoot), identity(canonicalRoot)]);
    if (detected === expected) {
      // Explicit anchors support isolated identity tests. The CLI's default
      // anchor must also be a committed LongmontAI checkout, as on main.
      if (canonicalRoot === expectedRoot) {
        const { stdout } = await execFileAsync('git', [
          '-C', canonicalRoot, 'show', 'HEAD:package.json',
        ], { env });
        if (JSON.parse(stdout).name !== 'longmont-ai') throw new Error('Not a LongmontAI checkout');
      }
      return;
    }
  } catch (error) {
    throw new Error(`This command is site-specific. Could not verify ${detectedRoot} against ${canonicalRoot}`, { cause: error });
  }
  throw new Error(`This command is site-specific. Expected ${canonicalRoot} or its linked worktree, found ${detectedRoot}`);
}

function parseArguments(args) {
  const options = { asOf: undefined, json: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--json') {
      options.json = true;
    } else if (args[index] === '--as-of') {
      options.asOf = args[index + 1];
      if (!options.asOf || options.asOf.startsWith('--')) throw new Error('Missing --as-of date');
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
  }
  return options;
}

function denverDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function assertIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid --as-of date: ${value}`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid --as-of date: ${value}`);
  }
  return parsed;
}

function shiftUtcDate(value, days) {
  const date = assertIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function literalMatches(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function duplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

async function main() {
  const detectedRoot = await realpath(fileURLToPath(root));
  await assertSiteRepository(detectedRoot);
  const options = parseArguments(process.argv.slice(2));
  const asOf = options.asOf ?? denverDate();
  assertIsoDate(asOf);

  const [modelWatchModule, scheduledReleaseModule, timeline] = await Promise.all([
    import(new URL('src/data/modelWatch.ts', root)),
    import(new URL('src/generated/scheduled-release/server.mjs', root)),
    readFile(new URL('src/data/timeline.ts', root), 'utf8'),
  ]);

  const { modelWatchModels, modelWatchSnapshots, modelWatchSources } = modelWatchModule;
  const scheduledRelease = scheduledReleaseModule.default;
  const scheduledEditionSlug = scheduledRelease?.editionId;
  if (!scheduledEditionSlug) throw new Error('Could not resolve scheduledEditionSlug');
  if (!scheduledRelease.source?.article) throw new Error('Could not resolve scheduled article source');
  const editorialSources = modelWatchSources.map(({ company, url: primary, backupUrl: backup }) => ({
    company,
    primary,
    ...(backup ? { backup } : {}),
  }));
  const modelIds = modelWatchModels.map(({ id }) => id);
  const timelineIds = literalMatches(timeline, /\n\s+id: '([^']+)'/g);
  const snapshotDates = modelWatchSnapshots.map(({ date }) => date);
  const releaseDates = modelWatchModels.map(({ releaseDateSort }) => releaseDateSort)
    .filter((value) => value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const timelineDates = literalMatches(timeline, /\bdate: '(\d{4}-\d{2}-\d{2})'/g);

  const report = {
    repository: {
      expectedRoot,
      detectedRoot,
    },
    window: {
      timeZone: 'America/Denver',
      start: shiftUtcDate(asOf, -13),
      end: asOf,
      calendarDays: 14,
      inclusive: true,
    },
    surfaces: [
      { route: '/tools', owners: ['src/pages/Tools.tsx'] },
      { route: '/model-watch', owners: ['src/data/modelWatch.ts', 'src/data/modelWatch.generated.json'] },
      { route: '/leaderboard', owners: ['src/data/modelWatch.ts'] },
      { route: '/timeline', owners: ['src/data/timeline.ts', 'src/data/modelWatch.ts', 'src/articles/chinese-model-releases.ts'] },
      { route: `/edition/${scheduledEditionSlug}`, owners: ['src/articles/scheduledEdition.ts', scheduledRelease.source.article] },
    ],
    excluded: ['new blog posts', 'published edition markdown', 'older drafts', 'slideshows', 'editorial assets'],
    sources: {
      editorial: editorialSources,
      detector: detectorSources.map(({ company, url, required = false }) => ({ company, url, required })),
    },
    currentData: {
      snapshotDates: snapshotDates.slice(0, 12),
      latestReleaseDate: releaseDates.sort().at(-1) ?? null,
      latestLiteralTimelineDate: timelineDates.sort().at(-1) ?? null,
    },
    integrity: {
      duplicateModelIds: duplicates(modelIds),
      duplicateTimelineIds: duplicates(timelineIds),
    },
  };

  if (report.integrity.duplicateModelIds.length || report.integrity.duplicateTimelineIds.length) {
    process.exitCode = 1;
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`LongmontAI update window: ${report.window.start} through ${report.window.end} (${report.window.calendarDays} days, inclusive)`);
    console.log(`Living surfaces: ${report.surfaces.map(({ route }) => route).join(', ')}`);
    console.log(`Editorial sources: ${editorialSources.length}; detector sources: ${detectorSources.length}`);
    console.log(`Latest model release date: ${report.currentData.latestReleaseDate ?? 'none'}`);
    console.log(`Latest literal timeline date: ${report.currentData.latestLiteralTimelineDate ?? 'none'}`);
  }
}

if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
