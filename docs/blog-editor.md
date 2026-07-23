# Blog Editor Standard

Use this guide for every Longmont AI meetup edition.

## Draft and release

1. Read `design.md`, the current countdown, and the most recent published edition.
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
  components, shared styles, or embedded content. It captures all public routes
  at phone sizes and fails on overflow, broken images, squeezed release tables,
  and editorial media that is off-screen or too small to read. The same audit
  runs in the local pre-commit, pre-push, and full local-CI paths.

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
- Video embeds use native controls, `playsInline`, and metadata preload. Audio
  never starts automatically.

## Evidence standard

Label the evidence type. A social-media post is a claim, a vendor benchmark is a
vendor claim, an independent benchmark is a comparison under its stated harness,
and a paper is a research result. Do not promote a screenshot or a benchmark into
a universal causal claim.
