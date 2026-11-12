#!/usr/bin/env node
// Builds the internet overlay for the maps page.
//
//   node scripts/maps/fetch-internet.mjs src/data/maps/snapshots/<date>/internet.json
//
// Speeds: Ookla Speedtest Global Index, median download, fixed broadband and mobile.
// The index page embeds every ranked country in a `var results = {...}` script block.
// Coverage: ITU "individuals using the Internet (% of population)" through the
// World Bank API indicator IT.NET.USER.ZS, most recent value per country.
//
// Exits non-zero with a message when either source changes shape.

import { readFile, writeFile } from "node:fs/promises";

const OOKLA_URL = "https://www.speedtest.net/global-index";
const WB_INDICATOR_URL =
  "https://api.worldbank.org/v2/country/all/indicator/IT.NET.USER.ZS?format=json&mrnev=1&per_page=400";
const WB_INDICATOR_PAGE = "https://data.worldbank.org/indicator/IT.NET.USER.ZS";
const WB_COUNTRY_URL = "https://api.worldbank.org/v2/country?format=json&per_page=400";

// Ookla ranks about 150 countries for fixed and 100 for mobile. Far fewer means the page changed.
const MIN_FIXED = 100;
const MIN_MOBILE = 60;
const MIN_USERS = 150;
// A coverage value this many years behind the newest one in the response is dropped as stale.
const MAX_USERS_AGE_YEARS = 10;

// ISO 3166-1 alpha-2 to alpha-3, plus XK for Kosovo (user-assigned, XKX at the World Bank).
const ISO2_TO_ISO3 = Object.fromEntries(
  `AD:AND AE:ARE AF:AFG AG:ATG AI:AIA AL:ALB AM:ARM AO:AGO AQ:ATA AR:ARG AS:ASM AT:AUT AU:AUS AW:ABW AX:ALA AZ:AZE
BA:BIH BB:BRB BD:BGD BE:BEL BF:BFA BG:BGR BH:BHR BI:BDI BJ:BEN BL:BLM BM:BMU BN:BRN BO:BOL BQ:BES BR:BRA BS:BHS
BT:BTN BV:BVT BW:BWA BY:BLR BZ:BLZ CA:CAN CC:CCK CD:COD CF:CAF CG:COG CH:CHE CI:CIV CK:COK CL:CHL CM:CMR CN:CHN
CO:COL CR:CRI CU:CUB CV:CPV CW:CUW CX:CXR CY:CYP CZ:CZE DE:DEU DJ:DJI DK:DNK DM:DMA DO:DOM DZ:DZA EC:ECU EE:EST
EG:EGY EH:ESH ER:ERI ES:ESP ET:ETH FI:FIN FJ:FJI FK:FLK FM:FSM FO:FRO FR:FRA GA:GAB GB:GBR GD:GRD GE:GEO GF:GUF
GG:GGY GH:GHA GI:GIB GL:GRL GM:GMB GN:GIN GP:GLP GQ:GNQ GR:GRC GS:SGS GT:GTM GU:GUM GW:GNB GY:GUY HK:HKG HM:HMD
HN:HND HR:HRV HT:HTI HU:HUN ID:IDN IE:IRL IL:ISR IM:IMN IN:IND IO:IOT IQ:IRQ IR:IRN IS:ISL IT:ITA JE:JEY JM:JAM
JO:JOR JP:JPN KE:KEN KG:KGZ KH:KHM KI:KIR KM:COM KN:KNA KP:PRK KR:KOR KW:KWT KY:CYM KZ:KAZ LA:LAO LB:LBN LC:LCA
LI:LIE LK:LKA LR:LBR LS:LSO LT:LTU LU:LUX LV:LVA LY:LBY MA:MAR MC:MCO MD:MDA ME:MNE MF:MAF MG:MDG MH:MHL MK:MKD
ML:MLI MM:MMR MN:MNG MO:MAC MP:MNP MQ:MTQ MR:MRT MS:MSR MT:MLT MU:MUS MV:MDV MW:MWI MX:MEX MY:MYS MZ:MOZ NA:NAM
NC:NCL NE:NER NF:NFK NG:NGA NI:NIC NL:NLD NO:NOR NP:NPL NR:NRU NU:NIU NZ:NZL OM:OMN PA:PAN PE:PER PF:PYF PG:PNG
PH:PHL PK:PAK PL:POL PM:SPM PN:PCN PR:PRI PS:PSE PT:PRT PW:PLW PY:PRY QA:QAT RE:REU RO:ROU RS:SRB RU:RUS RW:RWA
SA:SAU SB:SLB SC:SYC SD:SDN SE:SWE SG:SGP SH:SHN SI:SVN SJ:SJM SK:SVK SL:SLE SM:SMR SN:SEN SO:SOM SR:SUR SS:SSD
ST:STP SV:SLV SX:SXM SY:SYR SZ:SWZ TC:TCA TD:TCD TF:ATF TG:TGO TH:THA TJ:TJK TK:TKL TL:TLS TM:TKM TN:TUN TO:TON
TR:TUR TT:TTO TV:TUV TW:TWN TZ:TZA UA:UKR UG:UGA UM:UMI US:USA UY:URY UZ:UZB VA:VAT VC:VCT VE:VEN VG:VGB VI:VIR
VN:VNM VU:VUT WF:WLF WS:WSM XK:XKX YE:YEM YT:MYT ZA:ZAF ZM:ZMB ZW:ZWE`
    .split(/\s+/)
    .map((pair) => pair.split(":")),
);
const ISO3 = new Set(Object.values(ISO2_TO_ISO3));

function fail(message) {
  console.error(`fetch-internet: ${message}`);
  process.exit(1);
}

async function get(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        // speedtest.net refuses requests without a browser user agent.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    fail(`request to ${url} failed: ${error.message}`);
  }
  if (!response.ok) fail(`${url} answered HTTP ${response.status}`);
  return response.text();
}

// Returns the object literal assigned to `var results` in the index page.
function extractOoklaResults(html) {
  const marker = html.search(/var\s+results\s*=\s*\{/);
  if (marker < 0) fail(`Ookla page no longer embeds "var results = {...}" (${OOKLA_URL})`);
  const start = html.indexOf("{", marker);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch (error) {
        fail(`Ookla "var results" block is not valid JSON: ${error.message}`);
      }
    }
  }
  fail('Ookla "var results" block is not terminated');
}

// Reads one median list into Map<iso3, mbps> and returns it with the index month.
function readOoklaList(results, key, minRows, unmapped) {
  const rows = results[key];
  if (!Array.isArray(rows)) fail(`Ookla results.${key} is missing or not an array`);
  if (rows.length < minRows) fail(`Ookla results.${key} has ${rows.length} rows, expected at least ${minRows}`);
  const speeds = new Map();
  const months = new Set();
  for (const row of rows) {
    const code = row?.country?.country_code;
    const name = row?.country?.country_name;
    const mbps = Number(row?.download_mbps);
    if (typeof code !== "string" || typeof name !== "string")
      fail(`Ookla results.${key} row lacks country.country_code or country.country_name: ${JSON.stringify(row).slice(0, 200)}`);
    if (!Number.isFinite(mbps) || mbps <= 0)
      fail(`Ookla results.${key} has no usable download_mbps for ${name}: ${JSON.stringify(row?.download_mbps)}`);
    if (typeof row.month !== "string" || !/^\d{4}-\d{2}$/.test(row.month))
      fail(`Ookla results.${key} row for ${name} has no YYYY-MM month: ${JSON.stringify(row.month)}`);
    months.add(row.month);
    const iso3 = ISO2_TO_ISO3[code.toUpperCase()];
    if (!iso3) {
      unmapped.add(`${name} (${code})`);
      continue;
    }
    if (speeds.has(iso3)) fail(`Ookla results.${key} lists ${iso3} twice`);
    speeds.set(iso3, mbps);
  }
  if (months.size !== 1) fail(`Ookla results.${key} mixes months: ${[...months].join(", ")}`);
  return { speeds, month: [...months][0] };
}

function parseWorldBank(text, url) {
  let body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    fail(`World Bank response is not JSON (${url}): ${error.message}`);
  }
  if (!Array.isArray(body) || body.length !== 2 || !Array.isArray(body[1]))
    fail(`World Bank response is not [meta, rows] (${url}): ${text.slice(0, 200)}`);
  const [meta, rows] = body;
  if (meta.pages !== 1) fail(`World Bank response spans ${meta.pages} pages, raise per_page (${url})`);
  return rows;
}

const outputPath = process.argv[2];
if (!outputPath) fail("usage: node scripts/maps/fetch-internet.mjs <output.json>");

const [ooklaHtml, indicatorText, countryText] = await Promise.all([
  get(OOKLA_URL),
  get(WB_INDICATOR_URL),
  get(WB_COUNTRY_URL),
]);

const unmapped = new Set();
const results = extractOoklaResults(ooklaHtml);
const fixed = readOoklaList(results, "fixedMedian", MIN_FIXED, unmapped);
const mobile = readOoklaList(results, "mobileMedian", MIN_MOBILE, unmapped);
if (fixed.month !== mobile.month)
  fail(`Ookla fixed (${fixed.month}) and mobile (${mobile.month}) lists are for different months`);
const speedAsOf = fixed.month;

const aggregates = new Set();
for (const country of parseWorldBank(countryText, WB_COUNTRY_URL)) {
  if (typeof country?.id !== "string" || typeof country?.region?.value !== "string")
    fail(`World Bank country row lacks id or region.value: ${JSON.stringify(country).slice(0, 200)}`);
  if (country.region.value.trim() === "Aggregates") aggregates.add(country.id);
}
if (aggregates.size < 20) fail(`World Bank country list marks only ${aggregates.size} aggregates, expected dozens`);

const userRows = [];
const skipped = [];
for (const row of parseWorldBank(indicatorText, WB_INDICATOR_URL)) {
  const iso3 = row?.countryiso3code;
  if (typeof iso3 !== "string" || typeof row?.date !== "string")
    fail(`World Bank indicator row lacks countryiso3code or date: ${JSON.stringify(row).slice(0, 200)}`);
  // Income groups arrive with an empty code, regions with a code the country list marks as aggregate.
  if (iso3 === "" || aggregates.has(iso3)) continue;
  if (row.value === null) continue;
  if (typeof row.value !== "number" || row.value < 0 || row.value > 100 || !/^\d{4}$/.test(row.date))
    fail(`World Bank indicator row for ${iso3} is out of range: ${JSON.stringify(row).slice(0, 200)}`);
  if (!ISO3.has(iso3)) {
    skipped.push(`${row.country?.value} (${iso3}, not an ISO code)`);
    continue;
  }
  userRows.push({ iso3, year: Number(row.date), pct: row.value, name: row.country?.value });
}
const newestYear = Math.max(...userRows.map((row) => row.year));
const users = new Map();
for (const row of userRows) {
  if (newestYear - row.year > MAX_USERS_AGE_YEARS) {
    skipped.push(`${row.name} (${row.iso3}, latest value is from ${row.year})`);
    continue;
  }
  users.set(row.iso3, row);
}
if (users.size < MIN_USERS) fail(`World Bank indicator has ${users.size} countries, expected at least ${MIN_USERS}`);

const world = JSON.parse(await readFile(new URL("../../src/data/maps/world.json", import.meta.url), "utf8"));
const drawn = new Set(world.countries.map((country) => country.id));

const regions = {};
for (const iso3 of [...new Set([...fixed.speeds.keys(), ...mobile.speeds.keys(), ...users.keys()])].sort()) {
  if (!drawn.has(iso3)) {
    skipped.push(`${iso3} (too small for the base map)`);
    continue;
  }
  const record = {};
  const hasSpeed = fixed.speeds.has(iso3) || mobile.speeds.has(iso3);
  if (fixed.speeds.has(iso3)) record.fixedMbps = fixed.speeds.get(iso3);
  if (mobile.speeds.has(iso3)) record.mobileMbps = mobile.speeds.get(iso3);
  if (hasSpeed) record.speedAsOf = speedAsOf;
  const user = users.get(iso3);
  if (user) {
    record.usersPct = Math.round(user.pct * 10) / 10;
    record.usersAsOf = String(user.year);
  }
  record.source = hasSpeed ? OOKLA_URL : WB_INDICATOR_PAGE;
  regions[iso3] = record;
}

const output = {
  sources: [
    { name: "Ookla Speedtest Global Index", url: OOKLA_URL },
    { name: "ITU via World Bank, individuals using the internet", url: WB_INDICATOR_PAGE },
  ],
  notes:
    `Speeds are median downloads in Mbps from Ookla's ${speedAsOf} Speedtest Global Index, a rolling three-month ` +
    "aggregate. Ookla ranks only countries with enough tests, so many have no speed. Population online is each " +
    `country's latest ITU estimate as published by the World Bank, left out when more than ${MAX_USERS_AGE_YEARS} years old.`,
  regions,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

const count = (field) => Object.values(regions).filter((record) => field in record).length;
console.log(
  `wrote ${Object.keys(regions).length} regions: fixedMbps ${count("fixedMbps")}, mobileMbps ${count("mobileMbps")}, ` +
    `usersPct ${count("usersPct")}; speeds as of ${speedAsOf}, users newest year ${newestYear}`,
);
if (unmapped.size) console.error(`unmapped Ookla countries: ${[...unmapped].join("; ")}`);
if (skipped.length) console.error(`skipped World Bank rows: ${skipped.join("; ")}`);
