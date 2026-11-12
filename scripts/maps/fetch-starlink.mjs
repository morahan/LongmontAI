#!/usr/bin/env node
// Builds the Starlink layer of the internet overlay for the maps page.
//
//   node scripts/maps/fetch-starlink.mjs src/data/maps/snapshots/<date>/starlink.json [cache-dir]
//
// Availability and speeds: the two public files behind starlink.com/map.
// Satellites: CelesTrak general perturbations elements for the Starlink group.
// Growth: CelesTrak SATCAT launch and decay dates for every Starlink payload.
//
// CelesTrak refuses a second download of the same group until its data updates, about every two hours.
// Pass a cache directory to keep the downloads and reuse them on a rerun.
//
// Exits non-zero with a message when a source changes shape.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ISO2_TO_ISO3 } from "./iso.mjs";

const AVAILABILITY_URL = "https://api.starlink.com/public-files/availability.json";
const METRICS_URL = "https://api.starlink.com/public-files/metrics_residential.json";
const ELEMENTS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json";
const SATCAT_URL = "https://celestrak.org/satcat/records.php?NAME=STARLINK&FORMAT=CSV";
const STARLINK_MAP = "https://www.starlink.com/map";

// Starlink's own status words, folded into the four levels the map draws. Statuses left out here
// ("unknown", "exclude") are drawn as no data unless Starlink reports speeds for the country.
const LEVEL_BY_STATUS = {
  launched: "available",
  available: "available",
  coming_soon: "coming",
  pending_regulatory: "pending",
  blacklisted: "unavailable",
};
const SUMMARY = {
  available: "Starlink lists residential service as available.",
  coming: "Starlink lists service as coming soon.",
  pending: "Starlink lists service as pending regulatory approval.",
  unavailable: "Starlink does not offer service in this market.",
};

const MIN_COUNTRIES = 150;
const MIN_MEASURED = 100;
const MIN_SATELLITES = 5000;
const FIRST_LAUNCH_MONTH = "2019-05";

function fail(message) {
  console.error(`fetch-starlink: ${message}`);
  process.exit(1);
}

const [outputPath, cacheDir] = process.argv.slice(2);
if (!outputPath) fail("usage: node scripts/maps/fetch-starlink.mjs <output.json> [cache-dir]");

async function get(url, cacheName) {
  const cached = cacheDir && join(cacheDir, cacheName);
  if (cached) {
    try {
      return await readFile(cached, "utf8");
    } catch {
      // Not cached yet.
    }
  }
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  } catch (error) {
    fail(`request to ${url} failed: ${error.message}`);
  }
  if (!response.ok) fail(`${url} answered HTTP ${response.status}`);
  const text = await response.text();
  if (cached) {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(cached, text);
  }
  return text;
}

function json(text, url) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${url} is not JSON: ${error.message}`);
  }
}

const round = (value, digits) => Number(value.toFixed(digits));

const [availabilityText, metricsText, elementsText, satcatText] = await Promise.all([
  get(AVAILABILITY_URL, "availability.json"),
  get(METRICS_URL, "metrics_residential.json"),
  get(ELEMENTS_URL, "gp.json"),
  get(SATCAT_URL, "satcat.csv"),
]);

const world = JSON.parse(await readFile(new URL("../../src/data/maps/world.json", import.meta.url), "utf8"));
const drawn = new Set(world.countries.map((country) => country.id));

// Availability and speeds.
const availability = json(availabilityText, AVAILABILITY_URL).admin0;
const metrics = json(metricsText, METRICS_URL).admin0Metrics;
if (!availability || Object.keys(availability).length < MIN_COUNTRIES)
  fail(`${AVAILABILITY_URL} lists ${Object.keys(availability ?? {}).length} countries, expected at least ${MIN_COUNTRIES}`);
if (!metrics || Object.keys(metrics).length < MIN_MEASURED)
  fail(`${METRICS_URL} measures ${Object.keys(metrics ?? {}).length} countries, expected at least ${MIN_MEASURED}`);

const regions = {};
const undrawn = [];
const unmapped = new Set();
for (const [iso2, record] of Object.entries(availability)) {
  const iso3 = ISO2_TO_ISO3[iso2];
  // Starlink adds private X codes for disputed areas.
  if (!iso3) continue;
  if (!drawn.has(iso3)) {
    undrawn.push(iso3);
    continue;
  }
  const measured = metrics[iso3];
  const level = LEVEL_BY_STATUS[record?.status] ?? (measured ? "available" : undefined);
  if (!level) {
    if (!["unknown", "exclude"].includes(record?.status)) unmapped.add(record?.status);
    continue;
  }
  regions[iso3] = { level, summary: SUMMARY[level], source: STARLINK_MAP };
  if (level === "available" && measured) {
    for (const [field, key, digits] of [["downMbps", "download_p50", 1], ["upMbps", "upload_p50", 1], ["latencyMs", "latency_p50", 0]]) {
      const value = measured[key];
      if (!Number.isFinite(value) || value <= 0) fail(`${METRICS_URL} has no usable ${key} for ${iso3}`);
      regions[iso3][field] = round(value, digits);
    }
  }
}
if (unmapped.size) fail(`${AVAILABILITY_URL} uses statuses this script does not know: ${[...unmapped].join(", ")}`);

// Satellites.
const catalog = json(elementsText, ELEMENTS_URL);
if (!Array.isArray(catalog) || catalog.length < MIN_SATELLITES)
  fail(`${ELEMENTS_URL} lists ${catalog?.length} satellites, expected at least ${MIN_SATELLITES}`);
const epochOf = (record) => Date.parse(`${record.EPOCH}Z`);
const epochMs = Math.max(...catalog.map(epochOf));
const elements = catalog.map((record) => {
  const fields = [record.INCLINATION, record.RA_OF_ASC_NODE, record.ARG_OF_PERICENTER, record.MEAN_ANOMALY, record.MEAN_MOTION, record.MEAN_MOTION_DOT];
  if (!fields.every(Number.isFinite) || Number.isNaN(epochOf(record)))
    fail(`${ELEMENTS_URL} record is incomplete: ${JSON.stringify(record).slice(0, 200)}`);
  return [
    round(record.INCLINATION, 2),
    round(record.RA_OF_ASC_NODE, 2),
    round((record.ARG_OF_PERICENTER + record.MEAN_ANOMALY) % 360, 2),
    round(record.MEAN_MOTION, 5),
    round(record.MEAN_MOTION_DOT, 6),
    Math.round((epochMs - epochOf(record)) / 1000),
  ];
});

// Growth.
const [header, ...rows] = satcatText.trim().split(/\r?\n/).map((line) => line.split(","));
const column = (name) => {
  const index = header.indexOf(name);
  if (index < 0) fail(`${SATCAT_URL} has no ${name} column`);
  return index;
};
const [typeAt, launchAt, decayAt] = [column("OBJECT_TYPE"), column("LAUNCH_DATE"), column("DECAY_DATE")];
const payloads = rows.filter((row) => row[typeAt] === "PAY");
if (payloads.length < MIN_SATELLITES) fail(`${SATCAT_URL} lists ${payloads.length} payloads, expected at least ${MIN_SATELLITES}`);
for (const row of payloads) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row[launchAt]) || !/^(\d{4}-\d{2}-\d{2})?$/.test(row[decayAt]))
    fail(`${SATCAT_URL} row has a malformed date: ${row.join(",")}`);
}
const asOf = new Date(epochMs).toISOString().slice(0, 10);
const tally = (date) => {
  const launched = payloads.filter((row) => row[launchAt] <= date).length;
  return { date, launched, inOrbit: launched - payloads.filter((row) => row[decayAt] && row[decayAt] <= date).length };
};
const growth = [];
for (let month = new Date(`${FIRST_LAUNCH_MONTH}-01T00:00:00Z`); ; month.setUTCMonth(month.getUTCMonth() + 1)) {
  const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  if (monthEnd >= asOf) break;
  growth.push(tally(monthEnd));
}
growth.push(tally(asOf));
const latest = growth[growth.length - 1];
// The element set and the catalog are separate CelesTrak products, so allow a few launches of slack.
if (Math.abs(latest.inOrbit - elements.length) > 200)
  fail(`SATCAT counts ${latest.inOrbit} Starlink payloads in orbit but the element set has ${elements.length}`);

const overlay = {
  sources: [
    { name: "Starlink availability map", url: STARLINK_MAP },
    { name: "CelesTrak Starlink elements", url: "https://celestrak.org/NORAD/elements/" },
    { name: "CelesTrak satellite catalog", url: "https://celestrak.org/satcat/search.php" },
    { name: "Live 3D tracker: satellitemap.space", url: "https://satellitemap.space/" },
    { name: "Starlink tracker: orbitalradar.com", url: "https://orbitalradar.com/starlink-tracker" },
  ],
  notes:
    `Availability and median speeds are Starlink's own published figures, read ${asOf}. Speeds are residential medians ` +
    "as Starlink reports them and are not independent measurements. For some large countries Starlink publishes speeds " +
    "by state or province only, so those show availability without a speed figure. Satellite positions are computed in your browser " +
    `from orbital elements CelesTrak published ${asOf}. They are close to live when the map is fresh and drift as it ages, ` +
    "because satellites manoeuvre. Every tracked Starlink payload is drawn, including ones still raising their orbit or " +
    "retiring. The growth chart counts payloads by launch and decay date in the CelesTrak catalog.",
  regions: Object.fromEntries(Object.entries(regions).sort(([a], [b]) => a.localeCompare(b))),
  satellites: { epoch: new Date(epochMs).toISOString(), elements },
  growth,
};

await writeFile(outputPath, `${JSON.stringify(overlay)}\n`);

const count = (level) => Object.values(regions).filter((region) => region.level === level).length;
console.log(
  `starlink: ${Object.keys(regions).length} countries (${count("available")} available, ${count("coming")} coming soon, ` +
    `${count("pending")} awaiting approval, ${count("unavailable")} not offered), ${elements.length} satellites, ` +
    `${latest.launched} launched and ${latest.inOrbit} in orbit as of ${asOf}`,
);
if (undrawn.length) console.log(`not on the base map, skipped: ${undrawn.sort().join(" ")}`);
