// Weekly Model Watch worklist. Reads the reviewed ledger and the unreviewed detection snapshot and
// prints what a reviewer has to look at this week. It changes nothing and uses no network.
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compileCatalog, dateValue } from './update-models.mjs';

const root = new URL('../', import.meta.url);
const day = 86400000;
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const isoDate = (time) => new Date(time).toISOString().slice(0, 10);

/**
 * `rereview`: in rotation today, but the 30-day source review lapses within `horizonDays`, so the entry would drop out unreviewed.
 * `lapsed`: already held only because the review is older than 30 days.
 * `leaving`: ages out of its 45- or 60-day window within `horizonDays`. Nothing to do; listed so the change is expected.
 * `leads`: names the detector saw that the ledger has no entry for. Unreviewed, and many are old models.
 */
export function weeklyWorklist(ledger, detectedModels, asOf, horizonDays = 7) {
  const today = compileCatalog(ledger, asOf).entries;
  const later = new Map(compileCatalog(ledger, isoDate(dateValue(asOf) + horizonDays * day)).entries.map((entry) => [entry.id, entry]));
  const brief = ({ id, phrase, provider, releaseDate, reviewedAt, sourceUrl }) => ({ id, phrase, provider, releaseDate, reviewedAt, sourceUrl });
  const reviewLapse = 'hold: source review is older than 30 days';
  const known = new Set(ledger.entries.map((entry) => normalize(entry.phrase)));
  return {
    asOf,
    included: today.filter((entry) => entry.eligibility === 'include').length,
    rereview: today.filter((entry) => entry.eligibility === 'include' && later.get(entry.id).eligibility === reviewLapse).map(brief),
    lapsed: today.filter((entry) => entry.eligibility === reviewLapse).map(brief),
    leaving: today.filter((entry) => entry.eligibility === 'include' && /^hold: older than \d+ days$/.test(later.get(entry.id).eligibility)).map(brief),
    leads: [...new Set(detectedModels)].filter((name) => !known.has(normalize(name))).sort(),
  };
}

export async function main(args) {
  let asOf = isoDate(Date.now());
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--as-of') asOf = args[++i];
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  const ledger = JSON.parse(await readFile(new URL('content/models/catalog.json', root), 'utf8'));
  const detected = JSON.parse(await readFile(new URL('src/data/modelWatch.generated.json', root), 'utf8'));
  console.log(JSON.stringify({ detectionCheckedAt: detected.checkedAt, ...weeklyWorklist(ledger, detected.detectedModels, asOf) }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
