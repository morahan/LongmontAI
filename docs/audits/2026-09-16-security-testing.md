# Security and testing audit — 2026-09-16

## Status: pre-publication checkpoint

A01/A02/A03, C3, B03/B04, C2 and the C-site corrections are integrated in the source checkout. The parent reproduced the complete deterministic aggregate, lint, content assets, production build and expanded full browser audit: **all PASS**. A independently accepted C3 and the final A03 intent-to-add correction (`output/audit-20260916/A/A03-final-review.md`).

The exact **21-file staged implementation** passed `SECURITY_COMMIT_AGENT_REVIEW=1 npm run security:commit`: **all six gates**, including an actual optional Codex review, not a skipped lane. Normal commit/pre-push hooks and branch publication remain pending at this checkpoint. Main merge is blocked by the diverged baseline (reported `origin/main` versus audit baseline: **7/10**) and externally blocked CI OSV provisioning. This records pre-publication state, not a claim that publication can never occur. Deployment and production-provider behavior remain unverified.

Baseline: `94e9202882a773a368210bdffa4ff4fe36b96cf2`. Earlier repairs in the [2026-09-05 audit](2026-09-05-security-testing.md) were checked rather than re-reported as open findings. Independent A/B/C lanes investigated security, testing and functional behavior; bounded worktrees prevented overlapping source ownership. Production submissions, credentials/admin operations and gate bypasses were excluded.

## Integrated repairs

| Scope | Finding and correction | Acceptance / limitation |
|---|---|---|
| **A01: signup validation** | Object/string/Buffer bodies bypassed the stream-only byte limit, exposing unbounded synchronous email regex work. All supported adapters now enforce the budget, reject invalid parsed shapes and bound email characters/UTF-8 bytes before regex. | Independent A review accepted; integrated newsletter tests pass. Pre-parsed allocation, transport limits, durable rate limiting and reconciliation remain separate concerns. |
| **A02: staged failure propagation** | Conditional Bash gate functions could mask staged Gitleaks or first-policy-contract failures. Explicit failure propagation and finding/error/positive-control fixtures retain fail-closed behavior. | Integrated security-chain tests pass. Fake scanner contract tests do not replace actual publication-scope scanning. |
| **A03: staged snapshot** | Dependency/policy checks selected index filenames but read mutable worktree data. Private frozen-index materialization now supplies exact inputs, with divergence, containment, cleanup and caller-state tests. | Core repair and intent-to-add follow-up independently accepted by A; parent chain PASS. Genuine staged empty files remain distinct from intent-only entries. |
| **B03: emitted artifacts** | A source-only fixture's absent public/dist trees made its artifact scan vacuous. Staging absence is now explicit; a real disposable Vite build must emit HTML/nonempty JS before scanning, and an injected private marker must fail the same assertion. | Parent reproduced artifact contracts **5/5**. This minimal generated-client build complements, not replaces, production build/release checks. |
| **B04: test discovery** | Standalone files and new `security:test:*` names could evade registration checks. Scoped filesystem discovery and command-chain/glob ownership now reject omissions, duplicates, multiple execution, missing child scripts and cycles before execution. | Parent reproduced wiring **6/6**; aliases are not double-run and serial fail-fast remains. Fixture directories are explicitly excluded; future command grammar requires deliberate support. |
| **C2: benchmark identity** | Different metrics/versions/harnesses were ranked together. Explicit comparable groups retain sourced values and leave insufficiently specified provenance unranked. | Parent verified all **19** selector/table/chart/count comparisons in real Chromium, with no page errors. External score truth is not thereby verified. |
| **C3: newsletter publication context** | A released generated edition was omitted until static promotion. Curation now merges eligible generated content before sorting/limit, favors eligible static duplicates, and includes only exact server/article function inputs. | A accepted the actual integrated diff and reproduced **69 newsletter / 8 scheduled API** tests plus release/header checks and offline adversarial probes. Embargo, digest/identity/time validation, fixed-path confinement and minimal data projection remain enforced. Local package fixtures are not deployed Vercel proof. |
| **C-site: navigation/signup/readiness** | Deep route scroll, shadow-DOM overflow, invisible radio focus, ignored biweekly default and generic readiness false passes were corrected. | Final parent browser audit passes; B's final independent source/evidence review accepts the bounded C1/C4/C5/C6/B02 scope. Details below. |

### Site scrutiny and closure

The route helper stores positions by history key plus local location, handles lazy layout and stable hash positioning, preserves POP coordinates, cancels restoration on user interaction and cleans up. Expanded browser checks cover deep archive PUSH, Back/Forward, direct and same-document hashes, wheel-scrolled hash POP and skip-link focus.

B caught an intermediate assertion expecting archive top zero despite existing `scroll-margin-top: 6.5rem`; C corrected the assertion to computed margin without removing header clearance. Shadow geometry now requires both expected visible, positive-size controls, content-box/label containment and no overlap at 360/390/430/1280 widths. Both cadence radios have distinct keyboard focus indicators and verified request values.

C's retained host harness imports the actual React `NewsletterSignupHost` and verifies omitted/weekly/biweekly initial props, initial POST values, clicking the current selection, changed props through rerenders, later user choice and final POST. `host-proof.json` reports the expected weekly/weekly/biweekly initial values, preserved explicit choices and no page errors. This closes B's initial-prop evidence concern, though the React host harness remains ignored evidence rather than a committed ongoing suite.

Countdown and static/scheduled editions expose stable page/edition identities. Actual-predicate negative tests reject generic countdown headings and wrong edition IDs; browser checks exercise unknown-page and unknown-edition recovery separately. B inspected the final eight-file site patch and confirmed byte equality with integrated source, without another overlapping browser/build run. Final disposition is retained in ignored `output/audit-20260916/B/C-review.md`.

## Parent verification

Source evidence: `output/audit-20260916/parent/`.

| Command / surface | Result | Evidence |
|---|---|---|
| `npm test` | PASS: all 13 aggregate entries; **190 TAP tests** plus assertion-script suites | `final-tests.log` |
| `npm run lint` | PASS | `final-lint.log` |
| `npm run content:check-assets` | PASS | `final-assets.log` |
| `npm run build` | PASS, including release checks before/after build | `final-build.log` |
| Full local browser audit | PASS: **10 routes**, three mobile widths, bounded desktop smoke, expanded interactions; `runtimeFailures: []` | `final-browser.log` |
| Benchmark comparisons | All 19 selectors/table/chart/count comparisons verified; no page errors | `metrics-browser.json` |
| A03 intent-to-add follow-up | Parent security chain PASS; final A review ACCEPT | `A/A03-final-review.md` |
| Exact 21-file staged security review | All six gates PASS, including actual optional Codex review | `final-security-staged.log` |

The browser's controlled optional-API/mock HTTP errors are not claimed absent merely because `runtimeFailures` is empty. No actual subscription was sent. The metric probe blocked external Google Fonts; it does not prove external font availability.

Supporting worker evidence includes baseline local security scanning, focused repair suites, C's actual React host proof and A's independent C3 boundary/package/adversarial review. Baseline archived-HEAD security PASS is **not** certification of later staged repairs. Earlier failed runs were preserved: macOS disposable build-path canonicalization, concurrent shared Git-object snapshot changes, and browser assertion/debugging failures were resolved without bypassing gates or declaring failed runs successful.

## Coverage and redundancy

**No full-coverage claim or percentage is made.** The aggregate includes strong scheduled staging/API/leak controls, mocked newsletter capture/sink contracts, static-only Model Watch API tests, selected site helpers, orchestration checks and 66 pure space-background model tests. Browser evidence is bounded local Chromium behavior, not every route state or platform.

No unnecessary behavioral test deletions were made. Scheduled staging/API/artifact tests are complementary; helper-sink versus actual generation-wrapper tests are complementary; browser-runner mocks do not replace real browser tests. Large space-model probability/motion/continuity suites should not be removed merely for size. Consolidation candidates remain fixture boilerplate and repeated source/prose readers, preserving distinct timeouts, HTTP failures, concurrency, suppression and security negative controls.

Remaining coverage includes feed summary/article parity and filter/publication combinations; Timeline combinations/grouping; historical Markdown/PDF/video/slideshow interactions; complete scheduled-client transition/recovery; broader ranking/chart boundary cases; and accessibility/cross-browser behavior. Navigation REPLACE, prolonged lazy loading, bfcache/reload, repeated native-history edge cases and all interruption patterns are not exhaustively proven. The custom-element/React host evidence is not a universal prop-lifecycle proof.

## Remaining gates and external blocker

1. Run normal pre-commit/pre-push hooks and publish the branch through the repository-approved serialized path. The exact 21-file staged implementation already passed all six security gates, including actual Codex review; changes to that scope require renewed review. Scanner errors or unavailable prerequisites fail closed; no bypass is authorized.
2. Resolve the remote-main divergence and CI OSV provisioning blocker before main merge, using the approved integration path and rerunning affected checks. The tested local tree is not a claim about a future merged tree.
3. Review final publication diff and exclude unintended build-info/ignored evidence. Commit, push and merge results remain pending as of this checkpoint and should be recorded when completed.

**CI OSV provisioning is externally blocked.** The checked-in fresh-runner workflow does not provision both the required Linux OSV executable and offline advisory database. A's real offline empty-cache probe failed; its preceding zero-findings text was not treated as clean. Verified release/checksum inputs and an approved database freshness/provisioning policy are required. No fabricated hashes, skipped dependency audit or hosted-CI success claim is acceptable. This is an operational gate prerequisite, not an observed dependency vulnerability or claimed hosted run failure.

The Node 22 deterministic CI aggregate, Node 20/22 security/lint/build matrix and independent CodeQL/zizmor jobs remain. Local security-chain tests use scanner fixtures; the header contract reads configuration rather than deployed responses. Passing them does not provision CI or satisfy actual scanner/hooks automatically.

## Production and reliability residuals

No deployed Supabase schema/RLS/grants, Listmonk opt-in/suppression/delivery, Resend/OpenAI availability, Vercel package/header/cache behavior, scheduled-job/PR/merge/deploy delivery, live snapshot freshness or external editorial claims were verified. Local Vite does not execute Vercel functions; the latest browser-discovered static edition is not end-to-end scheduled release evidence.

Durable signup abuse controls, trusted post-insert reconciliation, provider deadlines, generation idempotency/partial persistence, full accessibility and Safari/iOS/remote-media behavior remain follow-up scope. Local checks and independent review establish the listed repairs and contracts—not a production security clearance.
