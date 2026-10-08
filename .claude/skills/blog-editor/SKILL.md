---
name: blog-editor
description: Draft and release Longmont AI meetup editions with dated asset organization, privacy-safe media handling, high-resolution slides, and a ten-minute pre-meetup release hold.
---

# Longmont AI Blog Editor

1. Read `design.md`, the latest edition, the countdown schedule, and
   `docs/blog-editor.md` before writing.
2. Draft in `src/articles/drafts/` with the meeting date and a `publishAt` ten
   minutes before the meetup in `America/Denver`.
3. Keep draft assets beside the draft, named in lowercase kebab case by editorial
   subject. Do not publish assets or register the edition early.
4. Crop phone screenshots to remove personal device chrome, notifications,
   controls, timestamps, and duplicated overlap. Preserve source pixels, strip
   metadata, and inspect every image and video frame for personal information.
5. Use high-resolution media, meaningful alt text, native controlled video, and
   a concise high-resolution top slideshow with a downloadable deck.
6. Label evidence honestly. Separate social claims, vendor claims, independent
   benchmarks, and primary research.
7. During drafting and before promotion, review `/model-watch`, `/leaderboard`,
   `/timeline`, and hidden header/Star Text. Run `npm run model-watch:update`.
   For each surface record an individual updated or no-change-needed result,
   reason, and primary-source evidence. Check `latestBriefingModelIds`, compare
   leaderboard results only when benchmarks are comparable, and distinguish
   timeline auto-generation from explicit events. For Star Text, use a bounded
   read-only subagent to propose 10–25 timely words or short phrases only from
   that edition's verified primary-source ledger. The parent/editor independently
   verifies every proposal, then selects and stores 10–25 in `src/data/starText.ts`.
8. At the scheduled time only, promote the article and approved assets, update
   the registries, run `npm run content:check-assets` and `npm run build`, check
   desktop and mobile, then publish through the normal reviewed path.
