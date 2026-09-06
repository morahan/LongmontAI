# Content intake: deterministic evidence, not automatic editorial publication

## Scope and activation

`npm run content:update` (legacy alias: `npm run model-watch:update`) runs one
producer. `.github/workflows/model-watch.yml` runs it daily at 13:17 UTC, on
relevant `main` pushes, and by manual dispatch. Generated-only pushes do not
match its explicit push paths. GitHub schedules are best-effort, not a daily SLA.

**Hosted activation is externally blocked.** The August 31 run
[33430925069](https://github.com/morahan/LongmontAI/actions/runs/33430925069)
never started: GitHub reported an account billing lock. The owner must resolve
that account issue; code or cron changes cannot resolve it. Local validation is
not evidence of successful hosted execution or publication.

Standard GitHub-hosted Linux Actions are free for eligible public repositories;
private-repository quotas, larger runners, storage and provider terms differ.
This collector calls no model API and needs no AI credentials: **zero AI tokens
for intake and packets**, not a promise of zero repository-review cost. The
repository's required agent/security review may consume model tokens and must
not be bypassed.

## Commands / options

```sh
npm run test:content
npm run content:update
npm run content:update -- --as-of 2026-09-06T12:00:00-06:00
npm run test:model-watch
npm run lint
npm run build
```

`--as-of` requires a valid offset-qualified ISO instant and makes the packet
window reproducible. The CLI uses the repository containing the script, not an
arbitrary current directory. For isolated tests, `runUpdate({root, now,
fetchImpl, sources, seeds})` accepts an explicit fixture root and injected fetch;
production uses only the fixed registry. Run one local producer at a time.

No paid-source fallback, newsletter setup, database service, email send, admin
session, or browser is required. Do not put credentials into source URLs.

## Source and safety contract (VAL-CONTENT-01/02)

- `scripts/model-watch-sources.mjs` is the single registry: existing model-name
  sources plus official GitHub release JSON for `openai/codex` (10 entries) and
  `anthropics/claude-code` (20 entries). No pagination. Drafts/prereleases excluded.
- Each source gets 15 seconds across all requests and a 2 MiB **decompressed**
  streamed-response limit. At most one same-origin HTTPS redirect is allowed.
  No arbitrary discovered URLs are fetched; feed evidence links must match the
  configured source origin or official repository release prefix. HTML is never
  executed; source text is untrusted data and Markdown labels are escaped.
- ETag/Last-Modified enable conditional fetch. A 304 with absent/corrupt cache
  makes exactly one unconditional recovery attempt. Cache records have parser
  fingerprints and aggregate hashes. Empty text captures are invalid; valid
  empty RSS/GitHub lists are permitted. RSS/GitHub dates require explicit timezones
  and valid calendar components; malformed dates are never rolled into a month.
- OpenAI, Meta AI and Moonshot are required. Required fetch/parse failure returns
  nonzero and preserves **all trusted output bytes**, with no proposal artifact.
  Optional failures retain attributed prior records and are marked stale in
  transient health. They are coverage gaps, not proof of no releases. Source
  limits are not relaxed to manufacture success.
- September 6 local live evidence: Meta Research was unavailable within the
  same-origin redirect policy; Qwen and even the 10-entry Codex sample exceeded
  2 MiB. Codex coverage is therefore currently unavailable, not silently complete.
  Hugging Face also returned no supported model-name matches in the worker run.
  Keep these gaps visible; do not raise limits or infer that no releases occurred.
- Undated HTML/name-regex detections, dated official feed entries, and legacy
  bootstrap seed names are distinct. A dated RSS title mentioning a model is an
  official **entry**, not independently verified release availability. No scores,
  prices, licenses, capabilities or benchmark comparisons are inferred.

## Files and semantic stability (VAL-CONTENT-02/03)

Trusted reviewable generated files are restricted to:

1. `src/data/modelWatch.generated.json`: existing four-field runtime schema.
   `successfulSources` means model sources with **retained valid captures**;
   `totalSources` counts model sources only, never the tool feeds. `checkedAt`
   is the last semantic model-snapshot capture, **not today's source health or
   a curated/editorially reviewed timestamp**. Counts/detections/timestamp do not
   update just because another clock tick or temporary outage occurred.
2. `content/review/latest.json`: stable source attribution, retained observations,
   explicit bootstrap names and a pending review matrix for `/model-watch`,
   `/leaderboard`, `/tools`, `/timeline`, and `src/components/spaceBackgroundModel.ts`
   (`CONSTELLATION_PHRASES`, the current main Star Text phrase source). This file
   identifier routes editorial review only; intake never changes phrases or renderers.
   Matrix statuses
   are `review-required`, `no-observed-change`, or `unsupported`, with a separate
   `detected` observation. Pending evidence accumulates; v1 has no automatic
   resolver that silently clears unresolved review items. Leaderboard updates
   remain unsupported without a reviewed benchmark adapter.
3. `content/review/biweekly/YYYY-MM-DD.md`: generated, **non-public source-review
   packet**, not an article. Here “non-public” means **not website-published**,
   not confidential: this public repository exposes packets on GitHub and PRs.
   Never include secrets or embargoed material. Do not manually edit generated packets; record human
   editorial decisions separately. Late-arrival dated evidence can rebuild the
   same period ID deterministically.

`output/content-automation/` is ignored transient state: `cache.json` retains
conditional validators, accumulated validated sightings (including pending-PR
observations) and candidate snapshot timestamps; `health.json` records the actual
latest attempt, individual failures and stale states. It is not a trusted release
ledger. GitHub caches only `cache.json` with the pinned Actions cache action;
health is a separate short-lived artifact, never a PR file. Cache eviction means
unconditional fetching; correctness does not require a cache hit. Without a
persisted cache, an unmerged candidate's original capture timestamp and sightings
that disappeared from upstream may be unavailable until its PR is merged.

No-op against the checked-out trusted files skips build and proposal; collector
tests still run. **Hosted limitation:** a fresh checkout of `main` differs from
an unmerged PR, so the same candidate may be rebuilt/proposed again. The stable
`automation/model-watch` branch avoids duplicate PRs; cached snapshot time avoids
timestamp-only candidate churn. This is not a claim of zero repeated builds while
review is pending. Normal merges make the next unchanged run a true no-op.

Every trusted candidate is validated, then all changed bytes/backups are staged
before promotion. Caught staging/rename failures roll back prior bytes. Multiple
filesystem paths cannot be atomically visible across a host/process crash: an
interrupted promotion retains `output/content-automation/transaction.json` and
backups and blocks subsequent runs. Preserve them for an operator to restore
originals or verify completed outputs before clearing the journal; never blindly
delete it to bypass reconciliation. No automatic publication occurs in recovery.

## Fortnight packets and editorial boundary (VAL-CONTENT-04)

The anchor is **May 27, 2026, Wednesday 00:00 America/Denver**, matching the
countdown's fortnight cadence. A period's ID is its ending local date. At/after
each boundary, generate the most recent complete half-open local-date window
`[end minus 14 days, end)`. A late run does not fabricate every missed edition.
DST changes are handled as local calendar dates, not fixed 336-hour instants.

Only dated official entries within that window enter the brief. Bootstrap and
undated sightings are never advertised as new fortnight news. The bounded feeds
may not cover the complete fortnight: **no observed change does not mean no
release**. Packet regeneration for late-arriving dated evidence is idempotent.

`content/review/**` is outside article registries, public assets and server release
packages. The producer never writes `src/articles/**`, `public/**`, scheduled
manifests, `src/generated/scheduled-release/**`, runtime API code or email data.
Actual blog authoring remains every other Wednesday, with primary-source review,
assets, approval, and existing embargo/staging gates. Daily updates to actual
Model Watch cards, Tools, Timeline, Star Text and benchmark rankings still need
reviewed adapters or editors. These packets do **not** make those pages current.

## Options and next steps (not implemented; owner approval required)

- **Recommended:** retain public GitHub Actions intake plus the existing Vercel
  deployment path: least extra infrastructure. Vercel Cron ingestion would need
  additional persistence/secrets; an always-on local scheduler needs a maintained,
  reliably running machine. Neither alternative bypasses review or source limits.
- After security/dependency/required-CI blockers clear, integrate through the
  approved path and manually dispatch once to prove the actual PR, required
  checks, reviewed merge and deployment. Local success is not hosted activation.
- A future free-tier, keyed Artificial Analysis adapter could provide separately
  attributed benchmark data, subject to current API terms/quota and owner approval.
  Preserve harness comparability; do not mix vendor scores or invent missing data.
- Later, explicitly approved deterministic-data auto-merge could use a scoped
  GitHub App, but only after required checks/review rules pass—not as a bypass.
- Fortnight packets still need an editor's source verification, article/assets,
  approval and the existing scheduled-release flow. This phase does not promise
  automatic daily editorial or benchmark updates across every page.

## PR / publication controls (VAL-CONTENT-05/06)

Generation runs with contents-read permissions and nonpersisted checkout
credentials, tests and changed-content lint/build. Only the exact three artifact
patterns above cross into a separate writer job. That job rejects unexpected
paths/symlinks, copies data only and updates the existing review PR branch.
Before reading/copying it enforces 2 MiB for the ledger, 256 KiB for each snapshot
or packet, 8 MiB total, 64 files, 128 entries and depth 3. Exceeding these bounds
blocks the proposal rather than truncating evidence.

GitHub must permit Actions-created PRs. Under the current
[workflow-trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow),
`GITHUB_TOKEN`-created `pull_request` opened/synchronize/reopened events can create
approval-required runs: a user with write access must approve them. Token-created
push events generally do not start new Actions runs. An owner-approved scoped
GitHub App installation token supplied via `MODEL_WATCH_PR_TOKEN` can support
unattended PR triggering, subject to repository policy—not guarantee merge or
deployment. Vercel's external Git integration must be verified separately.
Do not inspect secrets or broaden privileges as a shortcut. Auto-merge is not enabled. Required repository checks, security
review, human review and the approved main/deploy path remain mandatory. A billing
lock or unavailable required scanner is a blocker, not permission to bypass it.

Tests in `scripts/tests/content-automation.test.mjs` cover conditional-cache
recovery, no-op bytes, bounded requests/redirects, malformed dates across host TZ,
optional stale retention, required-failure preservation, pending evidence,
fortnight/DST boundaries, malicious text, transactional rollback and narrow
workflow artifact paths. `npm run test:content` includes all `content-*.test.mjs`
fixtures, including separately owned curated-content tests when integrated.
