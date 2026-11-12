#!/usr/bin/env node
// Builds the AI usage and sentiment overlay for the maps page.
//
//   node scripts/maps/fetch-ai-usage.mjs src/data/maps/snapshots/<date>/ai-usage.json [cache-dir]
//
// Source: the Gallup and Microsoft global AI study. Each article in ARTICLES embeds Datawrapper charts,
// and every chart serves its numbers as dataset.csv. Later articles override earlier ones country by
// country, so add each new release to the end of ARTICLES.
//
// Each run also lists Gallup AI articles newer than the last one in ARTICLES. They are leads to read,
// not data. When one carries new country figures, add it here with its chart ids.
//
// Exits non-zero with a message when a source changes shape.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ISO2_TO_ISO3 } from "./iso.mjs";

const ARTICLES = [
  {
    name: "Gallup: AI Optimism Globally Widespread Despite Uneven Use",
    url: "https://news.gallup.com/poll/714593/optimism-globally-widespread-despite-uneven.aspx",
    surveyAsOf: "Apr to Jul 2026",
    usageChart: "hKNdm",
    sentimentChart: "jqaHd",
    minCountries: 30,
  },
];
const TOPIC_URL = "https://news.gallup.com/topic/artificial-intelligence.aspx";
const USAGE_COLUMNS = ["Daily", "Weekly", "Monthly or less", "Aware but never used", "Not aware"];
// Datawrapper flag shortcodes are ISO alpha-2 codes, apart from the United Kingdom.
const FLAG_ALIASES = { uk: "GB" };

function fail(message) {
  console.error(`fetch-ai-usage: ${message}`);
  process.exit(1);
}

const [outputPath, cacheDir] = process.argv.slice(2);
if (!outputPath) fail("usage: node scripts/maps/fetch-ai-usage.mjs <output.json> [cache-dir]");

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
    response = await fetch(url, {
      // Gallup refuses requests without a browser user agent.
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" },
      signal: AbortSignal.timeout(60_000),
    });
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

const articleId = (url) => Number(/\/poll\/(\d+)\//.exec(url)?.[1]);

// The article names the published version of each chart, so an edited chart is picked up on the next run.
async function chartRows(article, html, chartId) {
  const embed = new RegExp(`https://datawrapper\\.dwcdn\\.net/${chartId}/\\d+/`).exec(html)?.[0];
  if (!embed) fail(`${article.url} no longer embeds Datawrapper chart ${chartId}`);
  const csv = await get(`${embed}dataset.csv`, `gallup-${articleId(article.url)}-${chartId}.csv`);
  return csv.split(/\r?\n/).map((line) => line.split("\t").map((cell) => cell.trim()));
}

function iso3Of(cell, where) {
  const flag = /^:([a-z]{2}):/.exec(cell)?.[1];
  if (!flag) return undefined;
  const iso3 = ISO2_TO_ISO3[FLAG_ALIASES[flag] ?? flag.toUpperCase()];
  if (!iso3) fail(`${where} names a country this script cannot place: ${cell}`);
  return iso3;
}

function percent(cell, where) {
  const value = Number(cell.replace("%", ""));
  if (cell === "" || !Number.isFinite(value) || value < 0 || value > 100) fail(`${where} has a bad percentage: "${cell}"`);
  return value;
}

const round = (value) => Math.round(value * 10) / 10;

const world = JSON.parse(await readFile(new URL("../../src/data/maps/world.json", import.meta.url), "utf8"));
const drawn = new Set(world.countries.map((country) => country.id));
const regions = {};
const undrawn = new Set();

for (const article of ARTICLES) {
  const id = articleId(article.url);
  const html = await get(article.url, `gallup-${id}.html`);

  const [header, ...usageRows] = await chartRows(article, html, article.usageChart);
  if (USAGE_COLUMNS.some((column, index) => header[index + 1] !== column))
    fail(`usage chart ${article.usageChart} columns are now ${header.slice(1).join(", ")}`);
  let counted = 0;
  for (const row of usageRows) {
    const where = `usage chart ${article.usageChart} row "${row[0]}"`;
    const iso3 = iso3Of(row[0], where);
    if (!iso3) continue;
    const [daily, weekly, rarely, neverUsed, notAware] = row.slice(1, 6).map((cell) => percent(cell ?? "", where));
    if (Math.abs(daily + weekly + rarely + neverUsed + notAware - 100) > 1.5) fail(`${where} does not add up to 100%`);
    counted += 1;
    if (!drawn.has(iso3)) {
      undrawn.add(iso3);
      continue;
    }
    regions[iso3] = {
      usedPct: round(daily + weekly + rarely),
      dailyPct: daily,
      weeklyPct: round(daily + weekly),
      awarePct: round(100 - notAware),
      surveyAsOf: article.surveyAsOf,
      source: article.url,
    };
  }
  if (counted < article.minCountries) fail(`usage chart ${article.usageChart} lists ${counted} countries, expected at least ${article.minCountries}`);

  // Gallup publishes only the five highest and five lowest countries for each outlook question.
  const sentimentRows = await chartRows(article, html, article.sentimentChart);
  const labels = sentimentRows.find((row) => row[1]?.startsWith("%"));
  if (labels?.[1] !== "%Mostly Help" || labels?.[3] !== "%Mostly Better")
    fail(`sentiment chart ${article.sentimentChart} columns are now ${labels?.join(", ")}`);
  let outlooks = 0;
  for (const row of sentimentRows) {
    for (const [at, field] of [[0, "helpPct"], [2, "betterLifePct"]]) {
      const where = `sentiment chart ${article.sentimentChart} cell "${row[at]}"`;
      const iso3 = iso3Of(row[at] ?? "", where);
      if (!iso3) continue;
      if (!regions[iso3]) fail(`${where} is not in the usage chart`);
      regions[iso3][field] = percent(row[at + 1] ?? "", where);
      outlooks += 1;
    }
  }
  if (outlooks < 10) fail(`sentiment chart ${article.sentimentChart} gave ${outlooks} values, expected at least 10`);
}

const overlay = {
  sources: [
    ...ARTICLES.map(({ name, url }) => ({ name, url })),
    { name: "Gallup World Poll methodology", url: "https://www.gallup.com/178667/gallup-world-poll-work.aspx" },
  ],
  notes:
    "Gallup and Microsoft survey about 1,000 adults aged 15 and older in each country, with a margin of error of 2.2 to " +
    "4.9 points. Only the countries Gallup has published so far are coloured, and the study is due to reach 140. " +
    "Usage shares are of all adults. Ever used adds daily, weekly and less frequent users. The outlook questions were " +
    "asked of adults who are aware of AI, and Gallup has published only the five highest and five lowest countries for " +
    "each, so most countries show no outlook figure yet.",
  regions: Object.fromEntries(Object.entries(regions).sort(([a], [b]) => a.localeCompare(b))),
};
await writeFile(outputPath, `${JSON.stringify(overlay, null, 1)}\n`);

const withOutlook = Object.values(regions).filter((region) => region.helpPct !== undefined).length;
console.log(`ai-usage: ${Object.keys(regions).length} countries with usage, ${withOutlook} with an outlook figure`);
if (undrawn.size) console.log(`not on the base map, skipped: ${[...undrawn].sort().join(" ")}`);

const newestKnown = Math.max(...ARTICLES.map((article) => articleId(article.url)));
const topic = await get(TOPIC_URL, "gallup-ai-topic.html");
const leads = [...new Set([...topic.matchAll(/href="(\/poll\/(\d+)\/[^"]+)"/g)].filter((match) => Number(match[2]) > newestKnown).map((match) => match[1]))];
if (leads.length) {
  console.log("Newer Gallup AI articles to review for country data:");
  for (const lead of leads) console.log(`  https://news.gallup.com${lead}`);
} else {
  console.log(`No Gallup AI article newer than ${newestKnown}. Other trackers to check are listed in docs/maps.md.`);
}
