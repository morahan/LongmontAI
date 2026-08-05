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
3. Run `npm run content:check-assets`, `npm run build`, and `npm run test:mobile`.
4. Use Browser Harness to view the rendered article and slides at 360 px, 390 px, and 430 px. Check the first and last slide as well as each individual slide.
5. Run `npm run security:review` before publication. A scanner error or unavailable scanner blocks publication.
6. Stop at review-ready status unless the user separately requests the normal commit and push workflow.
