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
7. During drafting and again before promotion, review `/model-watch`,
   `/leaderboard`, `/timeline`, and the hidden header/Star Text. Run
   `npm run model-watch:update`; for each surface record an individual updated
   or no-change-needed result, its reason, and primary-source evidence. Check
   `latestBriefingModelIds`; only compare
   leaderboard results with comparable benchmarks and retain their notes;
   decide whether timeline coverage is provider auto-generation or needs an
   explicit event; rotate Star Text alternatives and remove stale phrases. For
   each edition's recurring hidden-header/Star Text workflow, use a bounded
   read-only subagent to propose 10–25 timely words or short phrases grounded
   only in that edition's verified primary-source ledger. The parent/editor
   independently verifies every proposal against that ledger, then selects and
   stores 10–25; concrete model names (for example, DEEPSEEK V5) are included
   only when genuinely current and primary-source-supported, never as
   speculative examples.
8. At the scheduled time only, promote the article and approved assets, update
   the registries, run `npm run content:check-assets` and `npm run build`, check
   desktop and mobile, then publish through the normal reviewed path.
