# LongmontAI Release Workflow

## Choose The Release Mode

Create a draft by default. A normal public edition needs a dated Markdown file under `src/articles/`, an explicit raw import and newest-first registration in `src/articles/index.ts`, public assets under a matching `YYYY.MM.DD` folder, and a slideshow entry in `src/articles/slideshows.ts` when used.

The existing scheduled-edition API is a deliberately isolated, single-edition implementation. Do not copy its hard-coded constants or replace the active edition casually. For a new scheduled release, first inspect the current scheduled-edition implementation, agree a safe migration or extension, and verify both the pre-publish 404 behavior and the post-publish response. Keep draft text and assets outside `public/` until that release gate is intentionally implemented and reviewed.

## Paths And Assets

- Use `YYYY.MM.DD` date folders.
- Put article images under `public/weekly-screenshots/YYYY.MM.DD/`.
- Put deck images and optional presentation files under `public/slideshows/YYYY.MM.DD/<deck-slug>/`.
- Refer to local assets from article Markdown with site-relative URLs.
- Use the article's frontmatter date to align asset folders. `npm run content:check-assets` enforces this for static content.
- Keep release-only assets in `src/articles/drafts/assets/YYYY.MM.DD/` until an approved scheduled-media route allowlists them.

## Required Review

1. Inspect every asset for private information and visual quality before copying it into a public path.
2. Confirm every Markdown image, slideshow, video, PDF, and source link resolves.
3. During drafting and again before promotion, review `/model-watch`, `/leaderboard`, `/timeline`, and the hidden header/Star Text. Run `npm run model-watch:update`; for each surface record an individual updated or no-change-needed result, its reason, and primary-source evidence. Verify `latestBriefingModelIds`; compare leaderboard results only when benchmarks are comparable and retain their notes; determine timeline provider auto-generation versus an explicit event; rotate Star Text alternatives and remove stale phrases.
4. For each edition's recurring hidden-header/Star Text workflow, use a bounded read-only subagent to propose 10–25 timely words or short phrases grounded only in that edition's verified primary-source ledger. The parent/editor independently verifies every proposal against that ledger, then selects and stores 10–25; concrete model names (for example, DEEPSEEK V5) are included only when genuinely current and primary-source-supported, never as speculative examples.
5. Run `npm run content:check-assets`, `npm run build`, and `npm run test:mobile`.
6. Use Browser Harness to view the rendered article and slides at 360 px, 390 px, and 430 px. Check the first and last slide as well as each individual slide.
7. Run `npm run security:review` before publication. A scanner error or unavailable scanner blocks publication.
8. Stop at review-ready status unless the user separately requests the normal commit and push workflow.
