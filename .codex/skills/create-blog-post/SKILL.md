---
name: create-blog-post
description: Research, write, illustrate, and validate a current AI-news blog post with a companion slideshow. Use when asked to create a weekly AI briefing, turn a supplied image folder or screenshots into an article and slide deck, gather recent model-company, robotics, research-breakthrough, or validated AI-efficiency news, or prepare a LongmontAI edition for editorial review.
---

# Create Blog Post

Build a fact-checked, visual, review-ready post. Default the reporting window to the previous seven calendar days ending today in the user's time zone. Treat a request for a different period, topic, audience, publication time, or image folder as an override.

Read [the research standard](references/research-standard.md) before researching. In the LongmontAI repository, also read [the LongmontAI release workflow](references/longmontai-release-workflow.md) before creating files.

## Intake And Research

1. Confirm the supplied image directory exists. If it is absent, still research and write the article, then identify only image needs that cannot be met with licensed or user-provided material.
2. Establish the edition date, topic, audience, reporting window, and whether the requested outcome is a review draft, a static published edition, or a scheduled release. Default to a review draft. Do not infer consent to publish from a request to create a post.
3. Search the web for the reporting window. Cover these independent lanes, adapting queries to the requested topic:
   - official model-company release notes and product announcements;
   - robotics, embodied AI, and physical-world evaluation;
   - peer-reviewed research, preprints, and institutional breakthrough announcements;
   - measured AI-efficiency techniques, deployment reports, and cost or reliability evidence.
4. Build a compact source ledger before drafting: claim, date, primary URL, corroborating URL when needed, confidence, and why it matters. Exclude any item whose date or source cannot be verified.
5. Prefer original releases, documentation, papers, benchmark repositories, and named institutions. Describe vendor-reported scores, partnerships, availability, and performance as vendor-reported. Do not transform a demo, social post, or press quote into proof of production capability.

## Draft The Briefing

1. Choose only the strongest, distinct developments. A coherent 4-6 story briefing is better than a long feed of announcements.
2. Lead with a precise title and one-sentence summary. Give each section one clear claim, its significance, its limitations, and a direct inline source link.
3. Separate announcement, measurement, and inference in the prose. State uncertainty and conflicts plainly. Do not claim efficiency gains unless a credible measurement names the task, baseline, metric, and operating conditions.
4. Finish with practical, bounded implications for the intended reader. Do not include investment advice, unsupported forecasts, or marketing language.
5. Use descriptive alt text for every image and chart. Preserve source attribution and license/permission notes for non-user-provided assets.

## Build The Visuals

1. Inspect every supplied image before using it. Flag or remove personal information, status bars, notifications, browser chrome, credentials, account names, irrelevant sidebars, and unreadable tiny text. Strip metadata from exported assets where the local toolchain supports it.
2. Make the slideshow from the reviewed source images. Use a stable 16:9 canvas (1920x1080 unless the site requires another size), one editorial idea per slide, and descriptive lowercase kebab-case filenames. Do not stretch, crop away a chart axis, or let an image overflow the slide bounds.
3. Review every rendered slide at full size and at mobile width. Verify that screenshots and charts are legible, attribution is readable, and no element is clipped, letterboxed awkwardly, or overlapping.
4. Use ImageGen for image edits or generated supporting visuals when it improves clarity. Do not use it to fabricate a screenshot, a data chart, a research result, or a company announcement. Label conceptual generated art as illustrative when used.
5. Keep supplied original files outside public output unless they pass the review. Store only editorial-ready derivatives in the post's asset location.

## LongmontAI Execution

1. Run the local planning helper to create a non-public work folder and image inventory:

```bash
node .codex/skills/create-blog-post/scripts/prepare-visual-briefing.mjs \
  --images /absolute/path/to/images \
  --date YYYY-MM-DD \
  --slug short-topic-slug
```

2. Follow the LongmontAI reference for draft paths, article registration, assets, deck registration, and scheduled-release isolation. Keep the release draft private until the requested publish workflow has passed its review.
3. During drafting and again before promotion, review `/model-watch`, `/leaderboard`, `/timeline`, and the hidden header/Star Text. Run `npm run model-watch:update`; for each surface record an individual updated or no-change-needed result, its reason, and primary-source evidence. Check `latestBriefingModelIds`; compare leaderboard results only when benchmarks are comparable and retain their notes; identify timeline provider auto-generation versus an explicit event; rotate Star Text alternatives and remove stale phrases.
4. For each edition's recurring hidden-header/Star Text workflow, use a bounded read-only subagent to propose 10–25 timely words or short phrases grounded only in that edition's verified primary-source ledger. The parent/editor independently verifies every proposal against that ledger, then selects and stores 10–25; concrete model names (for example, DEEPSEEK V5) are included only when genuinely current and primary-source-supported, never as speculative examples.
5. Run the applicable checks after implementation:

```bash
npm run content:check-assets
npm run build
npm run test:mobile
```

6. Start the local site when needed and use Browser Harness to inspect the actual article and every slideshow slide at 360 px, 390 px, and 430 px. Fix clipping, overflow, unreadable labels, missing media, and broken source links before calling the draft ready.
7. Run `npm run security:review` before any publication commit. Treat scanner errors or unavailable required scanners as a failure.

## Completion Boundary

Return the article path, slideshow path, source ledger, image-review findings, and exact validation results. Clearly label unresolved claims, missing rights, and any visual limitations. Do not commit, push, deploy, change a publication time, or expose a scheduled draft unless the user explicitly asks in a later instruction.
