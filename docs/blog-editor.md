# Blog Editor Standard

Use this guide for every Longmont AI meetup edition.

## Repeatable preparation recipes

- `just blog-new 2026-09-16 astra-then-projects` validates a proposed new
  draft without writing. Add `--write` as the third argument to create only
  the Markdown draft from the template, using exclusive creation. An existing
  draft **or** release manifest is an error, never permission to overwrite it.
  The noon-meetup publication time is calculated in America/Denver, including DST.
- For an existing scheduled draft with a release manifest, run
  `just blog-update src/articles/drafts/2026.09.16-astra-then-projects.release.json`.
  By default this is a read-only preparation check: validate the package, dated media,
  11:50 publication time, downloadable deck, and living-site preflight. It is
  repeatable and never edits content, fetches Model Watch data, promotes an
  edition, changes the active scheduled package, commits, or pushes.
- Add `--stage` as the second recipe argument to explicitly update the site's
  scheduled release package using the same `stageRelease` machinery as
  `npm run release:stage -- <manifest>`. Its future-time, integrity and active
  edition rollover checks remain intact. This does **not** deploy, update living
  Model Watch data, promote an older edition, or make a draft public early.
  A blocked rollover is an error; never hand-edit the generated package to pass.
- There is no automatic static-promotion recipe. The existing reviewed path is
  step 5 below: only after the old edition's release time, promote its Markdown
  and approved assets, register its article/slideshow, and run the listed gates.
  That is separate work with separate file ownership. Only then may a **future**
  edition replace the active package through guarded staging. Complete the old
  promotion and new staging in one coherent reviewed change before the final
  build: default inspection still rejects static duplicates of the active
  package during this transition. Explicit `blog-update ... --stage` validates
  the candidate and runs preflight, checks active source/hash/inventory integrity,
  and lets the core stager enforce old publication time and complete promotion.
  It then runs full integrity and static-leak verification on the new package.
  A final verification failure is not success and may leave the newly staged
  local package for correction; it does not deploy anything.
- Exit 1 means invalid input, failed validation, or guarded staging failure. Exit 2 means preparation
  was inspected but blockers remain, including a different active release.
  **Preparation is not a completed site update.** Resolve release sequencing
  through the reviewed workflow below; never bypass rollover checks.
- Read output as local evidence only: `localState` is `prepared`,
  `locally-staged`, or `registered-static`; `production` is always `unverified`
  and `published` remains `false`. `publication: future` says only that the
  timestamp is ahead. `active-release-due` says the selected local package's
  time has arrived, **not** that production serves it.
- `publication: overdue` means the timestamp passed without matching the active
  package or a registered published static article. Use the reviewed static
  publication path with the original timestamp, not late staging or a fake
  future date. A retained draft with exactly one published article of matching
  identity and time in the exported `editions` registry is `registered-static`,
  not a new overdue release. Inspection recognizes the current literal
  `parseMarkdownToEdition(importName)` array convention, not arbitrary computed
  registries; unused/commented imports and duplicate entries are not registration.
  This is not proof of asset completeness or deployment.
- These recipe reports apply only to manifests using the current 11:50 Denver
  policy. Historical exceptions, including the existing Sep 2 11:30 package,
  fail recipe inspection with an explicit 11:50 policy error instead of receiving
  a readiness classification. Use the existing `release:check` for that active
  package's integrity. Do not retime or rewrite historical packages to obtain a
  recipe report; supporting their read-only classification is deferred.
- Scheduling is complete only after the approved package is shipped through the
  normal reviewed main/deployment path and the **production locator and publishAt**
  match the intended edition. Verify the deployed client locator before the
  deadline without exposing private payloads; the API intentionally returns a
  generic 404 before release. At/after release, verify the intended article and
  real media bytes (an HTTP 200 SPA shell is not evidence). An already deployed
  package unlocks at server request time without cron. A local schedule or PR
  preview cannot arm production, and billing-blocked required checks still block
  publication; do not bypass them.
- **Unresolved readiness gap:** these recipes do not monitor delivery, alert on
  missed deadlines, or provide an external heartbeat. Operators must verify the
  shipping receipt manually; automated readiness monitoring remains separate,
  deferred work.
- Draft images use dated `/weekly-screenshots/YYYY.MM.DD/...` URLs and decks
  use `/documents/YYYY.MM.DD/...` URLs, backed by private files under the
  manifest's `assetRoot`. These references do not authorize copying files into
  `public/` early. Relative `assets/...` links are not discovered by the release
  packager and must not be used.
- Run `node --test scripts/tests/blog-edition.test.mjs` and
  `npm run test:update-site` when changing these recipes. Preflight identifies
  the script's Git checkout/worktree rather than requiring one absolute path.

## Draft and release

1. Read `design.md`, `public/brand/README.md`, the current countdown, and the
   most recent published edition.
2. Start from `src/articles/drafts/edition-template.md` and create the edition in `src/articles/drafts/`.
3. Record `publishAt` at exactly ten minutes before the meetup, in
   `America/Denver`. For the standing noon schedule, this is 11:50 AM.
4. Keep a draft out of `src/articles/index.ts`, out of the live slideshow
   registry, and out of public asset directories until the scheduled release.
5. At or after `publishAt`, promote the draft, copy its approved assets into the
   matching `public/.../YYYY.MM.DD/` folder, register the article and slideshow,
   run `npm run model-watch:update`, review the resulting official-source
   signals, update `src/data/modelWatch.ts` for any consequential release, then
   run `npm run content:check-assets`, `npm run build`, and `npm run test:mobile`,
   then verify the generated phone screenshots for the new edition before using
   the normal reviewed publication path.

## Mobile acceptance standard

- Every published edition must be readable at 360 px, 390 px, and 430 px wide.
- Never compress dense tables until their labels or source notes become unreadable.
  Keep them inside a clearly bounded horizontal scroller or redesign them as
  cards for small screens.
- Images, video, slideshows, documents, code blocks, charts, and embeds must
  fit the viewport without creating page-level horizontal overflow.
- Mobile article media should use the available reading width without exceeding
  it. Do not rely on a desktop iframe for a PowerPoint: provide a direct,
  clearly labeled presentation link when the embedded viewer is not usable on a
  phone.
- Run `npm run test:mobile` before every push that changes articles, editorial
  components, shared styles, or embedded content. The full matrix checks every
  live application page (`/`, `/tools`, `/model-watch`, `/timeline`,
  `/countdown`, `/leaderboard`, and `/about`), the fixed PowerPoint-backed
  edition, and the newest linked edition at 360 px, 390 px, and 430 px,
  retaining 390 px screenshots for review. It fails on overflow, broken images,
  squeezed release tables, and editorial media that is off-screen or too small
  to read. Full local CI clears inherited route targeting and explicitly runs
  this exhaustive matrix headlessly. The pre-commit hook selects from the staged
  snapshot, and pre-push selects from outgoing commits, including merge-only
  resolutions: page or edition changes run only affected routes, shared
  UI/CSS/config changes run the full matrix, and known unrelated docs, backend,
  or tooling changes skip the browser. Unknown selections, new branches, and
  conflicting multi-ref article or asset snapshots fail closed to the full
  audit. Each automated audit uses and reliably closes a unique Playwright CLI
  session. It explicitly runs Playwright's bundled Chromium headless shell—not
  installed Google Chrome—so hooks do not steal focus. Route selections are
  encoded into the session's initial URL because shell environment does not
  propagate into the persistent Playwright CLI daemon; malformed targeting
  fails closed. If the shell is not installed, the runner prints the one-time
  `playwright_cli.sh install-browser chromium --only-shell` command. For manual
  visual debugging only, set `MOBILE_AUDIT_HEADED=1` when running
  `npm run test:mobile`; that explicit mode may use headed Chrome. Headless and
  headed runs enforce the same audit failures and retain the same screenshots.

## Model Watch cadence

- GitHub Actions checks the fixed official sources every Monday and opens or
  refreshes a reviewable Model Watch pull request. It does not publish an
  unreviewed release claim. A Meta or Moonshot source failure fails the check
  rather than producing a stale success.
- Every blog-editing session runs `npm run model-watch:update` before the
  edition is promoted. Add a curated entry only when the primary announcement
  confirms a named model, date, and availability; label vendor benchmark claims
  as vendor-reported.
- The source configuration is shared by the scheduled updater and the live
  status endpoint in `scripts/model-watch-sources.mjs`. Add a provider there,
  rather than changing only the source-map UI.

## Asset handling

- Use the meeting date as the asset directory date.
- Rename every supplied file in lowercase kebab case for its actual editorial
  subject. Do not retain device timestamps or generic screenshot names.
- Preserve high-resolution originals and ensure chart labels are legible.
- Crop phone screenshots to remove status bars, notifications, app controls,
  reply fields, timestamps, and redundant overlap. Do not regenerate text or
  charts; make a deterministic crop and strip metadata instead.
- Inspect images and video frames for personal information, identifiers,
  locations, notifications, and metadata before use.
- Every edition gets a top slideshow with a coherent story, high-resolution
  slides, a downloadable deck, source links, and meaningful alt text.
- Build every deck from the canonical assets in `public/brand/`. The cover and
  closing slides use the cubist parrot; content slides use the approved
  Longmont AI wordmark bar. Use only the palette exported in
  `public/brand/palette/colors.json`. Do not invent an edition-only brand system.
- Keep slide language presentation-tight: one claim per slide, a short headline,
  at most one short supporting sentence, and labels instead of explanatory
  paragraphs. Put nuance and caveats in the article unless they are essential
  to interpreting a number on the slide.
- Video embeds use native controls, `playsInline`, and metadata preload. Audio
  never starts automatically.

## Evidence standard

Label the evidence type. A social-media post is a claim, a vendor benchmark is a
vendor claim, an independent benchmark is a comparison under its stated harness,
and a paper is a research result. Do not promote a screenshot or a benchmark into
a universal causal claim.
