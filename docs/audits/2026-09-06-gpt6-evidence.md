# GPT-6 Astra content evidence — 2026-09-06

Scope: local GPT-6 content correction only; no publication, deployment, billing, workflow or gate changes.

## Primary evidence

Public, unauthenticated HTTP access on 2026-09-06:

| Source | Result | Evidence |
| --- | --- | --- |
| https://openai.com/news/rss.xml | 200 XML | Release entry `https://openai.com/index/gpt-6-astra`, `Thu, 03 Sep 2026 11:00:00 GMT`. |
| https://openai.com/index/gpt-6-astra/ | 200 | “GPT-6 Astra: A new generation of intelligence”; staged rollout initially to limited organizations, then paid ChatGPT plans and API. Not proof of universal account access. |
| https://developers.openai.com/api/docs/changelog.md | 200 | September 2026 / Sep 3: “Released [GPT-6 Astra]”; model `gpt-6-astra`. |
| https://developers.openai.com/api/docs/models/gpt-6-astra.md | 200; rechecked during implementation | “Model ID: `gpt-6-astra`”; “Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.” |
| https://developers.openai.com/api/docs/pricing.md | 200; rechecked during implementation | Standard row: `gpt-6-astra | $10.00 | $1.00 | $12.50 | $50.00 | $20.00 | $2.00 | $25.00 | $75.00`. |

Pricing is USD per million tokens. Row columns: short-context input, cached input, cache writes, output; then long-context equivalents. Displayed standard prices: **$10 input / $1 cached input / $50 output**. Prompts **over 272K input tokens** use **$20 input / $2 cached input / $75 output for the full request**. Other processing tiers differ. Price notes cite both official pricing and model documentation.

No numerical performance claims or benchmark scores were added. Missing performance values remain absent under the existing partial-record schema, not zero; the leaderboard renders `N/A` rank and score.

## Changed paths and behavior

- `src/data/modelWatch.ts`: one canonical `gpt-6-astra` entry dated `2026-09-03`, one visible Latest Signal, qualified standard token prices. Existing timeline mapping automatically produces `model-watch-gpt-6-astra` exactly once.
- `src/pages/ModelWatch.tsx`: approved label-only followup replaces “Reviewed snapshot” with “Source snapshot” and the Reviewed/publication stat with Source/snapshot. Layout, timestamp source, fetching and API behavior are unchanged; no daily freshness or editorial-review claim.
- `scripts/tests/content-gpt6.test.mjs`: seven behavioral tests, including real Model Watch/leaderboard server rendering, truthful snapshot wording and actual timeline generation. Uses the existing Vite/React dependencies, no network listener or upstream calls. Test cache stays under ignored worktree `dist/`, not shared dependency cache.
- This evidence note.

Historical briefing membership and September 2 article/release assets were not edited. No generated detector snapshot or manual timeline entry was added.

## Checks

Run from `/tmp/lai-gpt6-content-20260906`:

- `node --experimental-strip-types --test scripts/tests/content-gpt6.test.mjs` — **PASS, 7/7** after the label-only followup.
- `npm run test:model-watch` — **PASS**.
- `npm run lint` — **PASS**.
- `npm run build` — **PASS before the label-only followup**, including both scheduled-release checks; preserved release identity `edition-2026-09-02-host-then-cheap-stack` (`30a381ef84e360dbeb005ce5`). Tracked buildinfo byproducts restored. Focused tests, model-watch contract, lint and diff check rerun successfully after the wording change.

Parent independently reports final build PASS after the label-only followup and browser verification PASS for three routes (`/model-watch`, `/leaderboard`, `/timeline`) at three widths, with no runtime failures. Interactive leaderboard verification selected `inputCost` and observed Astra `$10.00/M` with the qualified source note; default performance rank/score remained `N/A`. Parent evidence: `output/playwright/mobile-audit/gpt6-content-final` and `/tmp/lai-gpt6-interaction.log`. These are parent-verified results, not a second worker browser run. Tracked `tsconfig.node.tsbuildinfo` and `tsconfig.tsbuildinfo` restored again after the parent's build.

Dependencies accessed through the explicitly permitted ignored `node_modules` symlink. No dependency install or lockfile update.

## Residual limits / parent handoff

- **Security unproven:** coordinator explicitly prohibited security commands/tests while a separate fixer repairs the staged security gate. No security gate, full test-suite or publication claim is made here.
- Detector `checkedAt` does not establish editorial verification. The approved followup now labels it “Source snapshot”; detector freshness itself remains unchanged.
- Server-rendered route behavior is verified here; final browser/build and interactive price verification are parent-reported above. No hosted deployment verification was performed in this worker lane.
- Existing leaderboard SSR emits a React warning for multi-child SVG `<title>` content; existing Svelte build configuration emits its default-config notice. Neither failed the checks; neither is changed here.
- New focused test is directly runnable; central suite wiring is outside the owned paths and left for integration review.
- No commit, push, staging, Git configuration, branch/ref mutation or deployment performed. Parent owns integration and all publication gates.
