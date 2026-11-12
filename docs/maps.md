# Maps

`/maps` draws one world map and swaps a single overlay on top of it. Each overlay is a JSON file per
fortnight. The page lists every dated folder on the timeline, so adding a folder adds a stop.

## Files

| Path | Role |
| --- | --- |
| `src/data/maps/world.json` | Pre-projected base map (countries and US states). Generated, do not edit. |
| `src/data/maps/snapshots/<YYYY-MM-DD>/<overlay>.json` | One overlay's data for one fortnight. |
| `src/lib/maps.ts` | Overlay registry (labels, legends, colours), projection, snapshot diff. |
| `src/pages/Maps.tsx` | The page. |
| `scripts/tests/maps-data.test.mjs` | Validates every snapshot. Run with `npm run test:maps`. |

Overlay ids: `data-centers`, `autonomous-driving`, `autonomous-delivery`, `drone-delivery`, `internet`,
`ai-usage`. `starlink` is a layer of `internet`. It has its own file and shows as a button beside the internet measures.

## Fortnightly update

A new fortnight is due when the calendar date in Denver is 14 or more days after the newest folder.
`just update-due` reports whether one is due. It prints `due <date>` or `not due until <date>` and
changes nothing.

1. Run `just update-maps`. `just update` runs it as its last step. When a fortnight is due, the run first
   copies the newest folder to a new folder dated on the meetup Wednesday. It then reruns every
   `scripts/maps/fetch-<name>.mjs` into the newest folder and runs `npm run test:maps`.
2. Review the files that have no fetcher. The new folder holds them as unchanged copies. Before the first
   fetcher, the run prints `No fetcher, needs a hand review:` and the names of those files. Edit each
   file that is out of date.
3. Commit and push. If you edit a file after `just update-maps`, run `npm run test:maps` first.

The date of the new folder is a whole number of fortnights after the newest folder. A late run still
dates the folder on the meetup Wednesday, and a fortnight that passed with no run gets no folder.

To start a folder early or on a chosen date, run `npm run maps:new-snapshot`. With no argument, it copies
the newest folder to a new one dated 14 days later. Pass a date to override:
`npm run maps:new-snapshot -- 2026-12-09`. The next due date counts from the newest folder, so a chosen
date moves every later date with it.

`just update-maps` passes each fetcher the output path `src/data/maps/snapshots/<date>/<name>.json`, where
`<name>` comes from the fetcher's filename, so a new fetcher needs no registration. It also passes a
cache directory for the current UTC day, which a fetcher may ignore.

The folder date is the "Last updated" stamp. A fortnight may carry only the overlays that changed. An
overlay missing from a folder shows its newest earlier file, with that file's date.

Keep a site's `id` stable between fortnights. The timeline compares each snapshot with the one before
it. A new `id`, a changed `status`, or a changed region `level` pulses on the map and counts in the
"changes since" line.

## Snapshot shape

```json
{
  "sources": [{ "name": "Ookla Speedtest Global Index", "url": "https://www.speedtest.net/global-index" }],
  "notes": "Coverage limits, in a sentence or two.",
  "regions": { "USA": {}, "US-CA": {} },
  "points": [{}]
}
```

Region keys are ISO 3166-1 alpha-3 codes, or `US-XX` for a US state. When an overlay has any `US-XX`
key the state layer is drawn and the `USA` record is used only for the tooltip on unlisted states.

Points need `id`, `kind`, `name`, `lat`, `lon`, `place` (nearest city or town), `country` (alpha-3),
`status` and `source`. Optional: `operator`, `detail`, `mw`, `mwBasis`, `vehicle`, `precision`.
The test rejects a point whose coordinate falls outside its stated country.

| Overlay | Point `kind:status` | Region fields |
| --- | --- | --- |
| `data-centers` | `data-center` with `operational`, `construction`, `proposed`, plus `mw` of 25 or more | none |
| `autonomous-driving` | `robotaxi:driverless-public`, `driverless-limited`, `safety-driver`, `announced`. `factory:producing`, `construction`, `announced` | `level`: `driverless-service`, `driverless-permitted`, `supervised`, `restricted`. `fsd`: `unsupervised`, `supervised`, `none` |
| `autonomous-delivery` | `sidewalk-robot` or `road-robot` with `commercial`, `pilot`, `announced` | `level`: `commercial`, `permitted`, `pilot`, `restricted` |
| `drone-delivery` | `drone-hub` with `commercial`, `pilot`, `announced` | same levels as delivery |
| `internet` | none | `fixedMbps`, `mobileMbps`, `usersPct`, `speedAsOf`, `usersAsOf` |
| `ai-usage` | none | `usedPct`, `dailyPct`, `weeklyPct`, `awarePct`, `helpPct`, `betterLifePct`, `surveyAsOf`, `source` |
| `starlink` | none | `level`: `available`, `coming`, `pending`, `unavailable`. `downMbps`, `upMbps`, `latencyMs` |

Legal overlays also need `summary` and `source` on every region.

## AI usage and sentiment

`just update` reruns `scripts/maps/fetch-ai-usage.mjs` with the other fetchers. It reads the Datawrapper
charts embedded in each Gallup article listed in `ARTICLES` at the top of the script, so a chart Gallup
edits is picked up on the next run. It then prints any Gallup AI article newer than the last one in
`ARTICLES`. Those are leads, not data. The Gallup and Microsoft study is due to grow from 37 countries
to 140, so expect new releases.

When a lead carries country figures, add it to the end of `ARTICLES` with its chart ids. Later articles
override earlier ones country by country. If Gallup goes quiet, the nearest equivalents are the Pew
Research Center global AI surveys, the Ipsos AI Monitor and the Stanford AI Index public opinion chapter.
Their questions differ from Gallup's, so give another survey its own region fields and metric in
`src/lib/maps.ts` instead of mixing it into a Gallup measure.

## Starlink

`starlink.json` also carries `satellites` (orbital elements for every Starlink payload, with one shared
`epoch`) and `growth` (launched and in-orbit counts per month). The page moves each satellite along a
circular orbit from those elements, so positions are near live on a fresh snapshot and drift as it ages.
Refresh it every fortnight. satellitemap.space and orbitalradar.com both refuse to be embedded in another
site, so the map and chart are drawn here from the same public data and link out to them.

CelesTrak refuses a second download of the Starlink group until its data updates, about every two hours.
Pass a directory as a second argument to `fetch-starlink.mjs` to cache the downloads between reruns.

## Adding an overlay

Add an entry to `OVERLAYS` in `src/lib/maps.ts` and drop `<id>.json` into the newest snapshot folder.
The dropdown, legend, list and timeline pick it up. Extend the `OverlayId` type to match.

## Regenerating the base map

Borders rarely change, so the atlas packages are not project dependencies.

```sh
npm i --no-save d3-geo@3 topojson-client@3 topojson-simplify@3 world-atlas@2 us-atlas@3
node scripts/maps/build-world.mjs
npm run test:maps
```

The test checks the runtime projection in `src/lib/maps.ts` against reference points that d3-geo
wrote into `world.json`.
