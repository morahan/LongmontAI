# Main reconciliation — 2026-09-23

## Scope and status

The original evidence baseline is **`21cc383`**. During reconciliation, remote main advanced through **`efaf05d`** (browser server-port isolation) to **`df4a725`** (opaque menu); the final candidate is reconciled onto **`df4a725`**. The only conflict was the mobile-contract append/import overlap: both the upstream server fixture and this port's config fixture were preserved verbatim. Parent independently inspected/staged the resolution and reproduced the final-base checks below. Upstream features remain intact and audit scope did not broaden.

The same bounded audit scope remains: **A04 CI scanner provisioning, D1 post-publication active-release corrections, D2 scheduled video rendering, D6 dated Model Watch wording, B's portable browser-config temporary directory**, and one separately approved dependency correction.

Parent isolated installation, focused tests, deterministic security review, lint/assets/build and local browser validation passed before the base update. On `df4a725`, parent freshly reproduced mobile contracts, build/release checks, full browser and staged deterministic security: **all PASS**. Earlier unchanged-source media/model-watch/space/content/release/lint evidence retains its stated scope. Security/media diffs and the devalue correction are retained; no upstream browser-isolation or menu feature was rolled back. Custom A read-only source review **accepted the adapted A04/D1/D2 changes**, retaining main's archive/index/source/caller safeguards (`output/audit-reconcile/security-source-acceptance.md`). At this **documentation-preparation checkpoint**, final-base validation is accepted and the report is ready for copying/staging. Final normal publication hooks—including actual optional agent review at commit—will run during the immediate parent commit/push sequence. This is time-bounded status, not a permanent assertion about a later published revision. No main/admin publication, hosted-CI success, production verification or whole-site acceptance is claimed here.

The continuation does **not** merge the broader `2750666` audit ancestry, API architecture, aggregate runner, newsletter implementation, UI helpers or unrelated title/background changes. Main's newer dependencies supersede the audit branch's `d24b401` lock repair. The sole accepted lock exception is **`devalue` 5.9.1 → 5.9.2**, changing that node's `version`, `resolved` and `integrity`; parent deep-equal verification confirms **all other main lock nodes and dependency declarations are unchanged**.

## Measured baseline conflict — not repaired here

Independent B review read immutable `21cc383` objects, not evolving integrator files. Exact-file tests ran offline in an ignored plain directory without shared Git mutation, network, browser or build:

| Baseline suite | Result |
|---|---|
| `scripts/tests/model-watch-contract.test.mjs` | **1/1 PASS** at the original baseline |
| `scripts/tests/content-model-watch-api.test.mjs` | **8/8 FAIL** |

Main's API is a bearer-authorized GET-only live-source detector. Its current Model Watch contract expects that behavior. The separate content API suite instead requires an unauthenticated static snapshot GET/HEAD endpoint with no producer dependency. Seven cases cannot import the current handler in their deliberately static-only fixture; the eighth rejects its dependency surface. An injected offline probe returned unauthenticated GET 401/HEAD 405 rather than the static suite's expected 200, with zero outbound calls.

This incompatibility **predates the port and remains unresolved**. `test:content` includes the failing API suite, so neither it nor `verify:local` is reported clean. A separate API/contract decision is required; no failing tests were deleted or bypassed and no old API architecture was restored. Evidence: ignored `output/audit-20260916/B/baseline-21cc383/` and `main-reconcile-baseline.md`.

Main has **no aggregate `npm test`**. Its local verification script enumerates suites explicitly. The current workflow uses **Node 22.20.0/24.x and npm 10.9.3**; this port preserves those lanes, expanded space/PDF/content contracts and centered edition titles. Historical audit test counts do not certify this different main architecture.

## Scoped repairs

| Scope | Contract preserved |
|---|---|
| A04 | Verified pinned scanner installation, fresh Linux advisory-cache provisioning, and fail-closed prerequisite errors; current workflow permissions and Node/npm policy retained |
| D1 | Corrections to the active published release retain its original publication time; new-release future gating, identity, atomicity and revision/hash checks remain |
| D2 | Approved static/scheduled video URLs survive API-to-renderer dispatch, with strict invalid-media rejection and preservation of main's PDF handling |
| D6 | Honest dated briefing wording without inventing membership or altering Model Watch/content architecture |
| B launcher | Private unique temporary directory containing JSON config, concurrent/stale-file safety, owned cleanup and failure propagation; no timeout weakening |
| Dependency exception | Only the affected devalue lock node's three approved fields change to 5.9.2 |

## Dependency evidence and cache limits

Fresh OSV data identified **medium GHSA-9rgm-9g3h-6x36** affecting `devalue@5.9.1`, fixed in **5.9.2**. Triage confirmed the normative SEMVER range; application exposure remains unproven for this development/Svelte dependency. `npm audit` reported zero before the correction, but that did not negate OSV's finding. The reason for npm's omission is unknown; inconsistent `last_known_affected` versus normative range data does not establish causation.

Parent independently verified the exact three-field correction, installed the accepted tree with **offline `npm ci` PASS**, and reproduced offline OSV on the corrected candidate: **306 packages, zero findings**. These are bounded package/advisory results, not proof of universal vulnerability absence.

On macOS, this scanner uses `~/Library/Caches/osv-scanner/npm/all.zip` despite an `XDG_CACHE_HOME` override. Parent explicitly refreshed that actual cache with `--download-offline-databases`; freshness evidence is valid, but the local cache was **not private or isolated**. A04's Linux configuration uses XDG as intended; hosted provisioning/execution remains unverified.

Evidence in the reconciliation worktree: `output/audit-reconcile/fresh-osv.log`, `devalue-triage.md`, `devalue-advisory.json`, `devalue-fixed-metadata.json`, and parent verification logs.

## Parent isolated acceptance

Evidence: reconciliation worktree `output/audit-reconcile/parent-*.log`. The original focused results below remain applicable to unchanged scoped source. Fresh post-rebase checks on `df4a725` are recorded separately; counts are not combined across runs.

| Check | Result |
|---|---|
| Offline `npm ci` | PASS on reconciled source plus accepted devalue correction |
| Exact lock delta | One node, three fields; all other main nodes/declarations unchanged |
| Staged deterministic security review | All deterministic gates PASS; optional agent review used its default **skip**, not an actual agent PASS |
| Scheduled aggregate | **56/56 PASS** |
| `release:self-test` | PASS |
| `test:content-gpt6` | PASS |
| Expanded space suites | **110/110 PASS** |
| Custom A source review | ACCEPT adapted A04/D1/D2; main archive/index/source/caller safeguards retained |
| Mobile contract | **11/11 PASS** |
| Current Model Watch contract | **2/2 PASS**; does not resolve the separate static API fixture conflict |
| Security chain | PASS, including archive behavior and unchanged caller Git state |
| Runtime-header contract, actionlint, lint, content assets, build | **All PASS** |
| Actual full local mobile/browser audit | **10 routes PASS**, including the September 16 edition route |
| Offline OSV | **306 packages, zero findings** after explicit refresh of the actual macOS cache |

The September 16 local browser result is not proof of production deployment, server clock, CDN/cache or provider behavior. Runtime-header assertions inspect configuration, not deployed HTTP headers. Scanner orchestration fixtures do not substitute for real scanner evidence. No broader `verify:local` or nonexistent aggregate success is implied.

### Fresh final-base revalidation — `df4a725`

| Check | Parent result |
|---|---|
| Mobile contract, preserving both upstream server and audit config fixtures | **12/12 PASS** |
| Build and release checks | **PASS** |
| Actual full local browser audit | **10 routes PASS**, including the September 16 edition |
| Exact staged deterministic security | **All deterministic gates PASS**; optional agent review defaulted to skip before the final hook |

The previous **56/56 media/scheduled**, **2/2 Model Watch**, **110/110 expanded space**, GPT-6, release self-test and lint evidence remains unchanged-source proof, not a claim that every suite was rerun after rebase. Parent inspected the sole conflict resolution; no source broadening occurred.

## Publication and coverage limits

Final-base revalidation is accepted and report copy is ready. At this documentation-preparation checkpoint, normal commit/pre-push hooks and actual optional agent review at final commit are the immediate remaining publication steps; parent will record their outcome. This checkpoint does not imply those gates remain unverified after successful publication. GitHub requires a **pull request**, with stale required check contexts **20.x/22.x** while the workflow runs **22.20.0/24.x**. This is a confirmed external merge blocker; no branch-rule changes, fabricated statuses or check spoofing are authorized.

No full-coverage percentage, hosted-CI result, production-provider behavior or main publication is claimed. Main has newer newsletter deadline/rate-limit/idempotency architecture; older audit residual descriptions are not automatically current defects, nor certified repaired by this limited scope. Broader audit behaviors absent from main are not implicitly restored.

Database/RLS/provider conformance, deployed packaging/cache/publication transitions, long-lived clients across releases, external editorial accuracy, historical media completeness, cross-browser behavior and full accessibility remain outside these local contracts. The unresolved baseline API test conflict and narrow lock exception remain explicit despite the scoped passing gates.
