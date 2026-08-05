import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { modelWatchSources as detectorSources } from './model-watch-sources.mjs';

const root = new URL('../', import.meta.url);
const expectedRoot = '/Users/msfm/Creations/Coding/LongmontAI';

function parseArguments(args) {
  const options = { asOf: undefined, json: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--json') {
      options.json = true;
    } else if (args[index] === '--as-of') {
      options.asOf = args[index + 1];
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

const options = parseArguments(process.argv.slice(2));
const asOf = options.asOf ?? denverDate();
assertIsoDate(asOf);

const [modelWatchModule, scheduledEditionSource, timeline] = await Promise.all([
  import(new URL('src/data/modelWatch.ts', root)),
  readFile(new URL('src/articles/scheduledEdition.ts', root), 'utf8'),
  readFile(new URL('src/data/timeline.ts', root), 'utf8'),
]);

const { modelWatchModels, modelWatchSnapshots, modelWatchSources } = modelWatchModule;
const scheduledEditionSlug = scheduledEditionSource.match(/scheduledEditionSlug\s*=\s*'([^']+)'/)?.[1];
if (!scheduledEditionSlug) throw new Error('Could not resolve scheduledEditionSlug');
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
    detectedRoot: root.pathname.replace(/\/$/, ''),
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
    { route: `/edition/${scheduledEditionSlug}`, owners: ['src/articles/scheduledEdition.ts', 'src/articles/drafts/2026.08.05-signal-routing.md'] },
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

if (report.repository.detectedRoot !== expectedRoot) {
  throw new Error(`This command is site-specific. Expected ${expectedRoot}, found ${report.repository.detectedRoot}`);
}

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
