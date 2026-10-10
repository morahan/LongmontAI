# Security and testing audit — 2026-09-05

## Status

This is an integrated implementation audit record, not a publication or production-provider verification claim. Work was split across independent read-only review and bounded implementation lanes. No lane accessed production databases/provider dashboards, read credentials, deployed, pushed, or bypassed a gate.

The parent has combined the accepted implementation in `/tmp/lai-audit-integration` and reproduced the deterministic aggregate, full browser audit, lint, content-asset check, and production build. The final Share pointer-event correction, inherited error-key correction, and their focused regressions are also complete. All implementation is verified; publication hooks, commit, and push have not run.

## Scope

The review covered:

- newsletter subscription persistence, provider synchronization, and failure semantics;
- Model Watch API trust boundaries and scheduled producer workflow;
- deterministic test/CI/hook wiring and checkout portability;
- route rendering, error states, interaction behavior, responsive layout, and browser-runner reliability;
- scheduled-edition client behavior, event timing, timeline state, newsletter error handling, and accessibility regressions.

## Security lane findings and remediation

### Newsletter subscription replay and partial-failure behavior

The security lane found that the prior merge-style subscriber upsert and public retry behavior could overwrite existing/suppressed records and replay provider synchronization. It also found that non-authoritative telemetry/provider bookkeeping failures could turn a completed subscriber insert into a public failure.

The bounded A1 implementation changed the persistence request to insert-if-absent semantics backed by the existing case-insensitive unique constraint, returns a generic accepted response for duplicate/honeypot/degraded post-insert outcomes, limits provider synchronization to one attempt, and isolates bookkeeping failures. Tests model concurrent equivalent-email inserts, suppression preservation, provider failures, and each bookkeeping failure point.

Residuals are explicit: a crash or ambiguous timeout after insertion still requires a trusted outbox/reconciliation design; unique-address abuse requires durable platform rate limiting; generic signup is not an authenticated preference-management flow.

### Model Watch request boundary

The security lane found that the public Model Watch request path performed live outbound source fetching. The bounded A2 implementation serves only the generated static snapshot, enforces GET/HEAD method behavior, and leaves source fetching in the scheduled producer workflow. The producer schedule was changed to daily while retaining its separate generation/build job, artifact handoff, and pull-request-only update path.

Deployed freshness still depends on successful scheduled execution, review, merge, and deployment. No live producer or deployment was exercised in this audit.

### Newsletter generated-content sinks (A3 — fixed and parent-verified)

The security lane found that arbitrary model-produced HTML could flow into newsletter campaign content and then be interpolated into the downstream owner-notification HTML. This crossed two rendering/sending sinks and could not rely on model instructions as a safety boundary.

A3 now constrains model output to structured fields and renders campaign and owner-notification content through strict escaped templates. Regression coverage invokes the actual generate handler and verifies both downstream sinks rather than testing only a helper. The parent reviewed the final sink correction and recorded `security:commit` passing on the staged A3 scope.

### Security-gate reliability (A4 — fixed and parent-reviewed)

A deterministic control-plane scanner correctly blocked a test fixture containing a prohibited workflow token even though the fixture represented a negative assertion. Triage classified that occurrence as a lexical test collision, not an exploitable workflow setting; the real checkout steps retained disabled credential persistence. Triage also found that security evidence output assumed `.git` was a directory and therefore failed while writing evidence in linked worktrees.

A4 now resolves Git's authoritative per-worktree directory while preserving private evidence permissions, redaction, and fail-closed behavior. The parent reviewed the actual A4 diff and reproduced `security:test-chain` passing. Final publication-scope hooks still remain pending.

### Inherited newsletter error keys (A5 — fixed and verified)

A5 corrected newsletter response handling so inherited object properties cannot be treated as trusted API error keys; only expected own error fields drive user-facing mapping. The parent reports the focused site-behavior suite passing after this correction.

## Testing lane findings and remediation

### Portable preflight

The site-update preflight contained a machine-specific absolute checkout path. It now derives its location from the module URL. Its regression test copies the required modules into a fresh temporary directory, executes the copied preflight there, and proves the detected root differs from the source checkout.

### Canonical deterministic suite and CI

The prior local verification omitted Model Watch and space-background tests, while pull-request CI ran no product contract aggregate. A canonical fail-fast `npm test` runner now registers the release self-test, scheduled-release, security, loop-push, update-site, Model Watch, newsletter, mobile audit contract, flow, tools, and space-background suites. A wiring test detects newly registered suites omitted from the aggregate and verifies child failure propagation without recursively invoking the aggregate.

Local verification uses the canonical aggregate while preserving scanners, lint, release checks, asset checks, build, and the separate real browser gate. Pull-request CI adds a least-privilege Node 22 deterministic-test job; the existing Node 20/22 security/lint/build matrix remains. Node 22 is explicit because the space model test uses runtime TypeScript stripping.

The UI lane's site behavior suite is present in the accepted integration tree and registered in both `package.json` and the deterministic aggregate. The wiring test fails closed if a future registered deterministic suite is omitted.

### Redundancy conclusion

No behavioral tests were deleted or weakened. The scheduled API, staging, and artifact suites exercise intentionally distinct trust boundaries and should remain separate. The 66 deterministic space-background tests are not redundant; splitting that large file by subsystem could improve diagnosis and ownership, but its behavioral coverage should be preserved. Repeated prose/source-regex assertions—especially duplicated editorial guidance checks—are consolidation candidates, preferably into structured policy data, but they should not replace or remove observable behavioral tests.

### Browser audit semantics and isolation

The former browser audit primarily checked layout and used a fixed port/output directory. It could accept a blank or wrong SPA route and collide with concurrent runs.

The updated runner adds navigation status, route identity/readiness, uncaught page exception, same-origin required-resource failure, and URL-aware optional API fallback checks. A full audit waits for the home archive before discovering the latest linked edition and fails if no linked edition is found. It retains the three mobile viewports and adds a bounded desktop smoke. Compact interactions cover mobile navigation, feed filtering/recovery, a populated Tools detail, Timeline matrix switching, and locally mocked newsletter success/known-error/non-JSON fallback states. No production subscription is sent.

Audit launchers now allocate a local port and namespace screenshots by validated run ID. Contract tests prove two concurrent launchers receive distinct ports and that wrong identity, navigation failure, JavaScript exception, and required-resource 500 conditions fail.

The browser launcher also supports `MOBILE_AUDIT_PLAYWRIGHT_CLI=/path/to/executable` for an already-installed Playwright CLI launcher. The default remains the official wrapper. The override changes only CLI startup: unique sessions, headless configuration, `run-code`, assertions, failure propagation, and cleanup remain mandatory. This can avoid an `npx` registry-resolution stall, but installed cache paths are machine-local and must not be committed or assumed portable.

This remains a smoke suite, not exhaustive UI, accessibility, compatibility, or production coverage.

## Product correctness lane findings

The independent UI/data-flow lane verified these defects in the original baseline:

- meetup recurrence used visitor-local time and fixed elapsed intervals, shifting Mountain noon across DST;
- scheduled-edition API failure/direct prepublication access could leave a blank main area;
- edition share controls were inert;
- Timeline filters could leave an out-of-filter detail selected;
- unknown routes rendered an empty SPA shell;
- Model Watch counts could be inflated by case/separator variants;
- newsletter HTML/empty upstream errors exposed parser-shaped text;
- Tools icon-only close controls lacked accessible names;
- route document titles were generic and About used placeholder branding.

The integrated C correction addresses Denver calendar recurrence, Timeline selection reconciliation and pressed states, stable newsletter error parsing, Tools close-control names, scheduled-edition loading/recovery with bounded retry deadlines, unknown-route recovery, route-aware titles and About branding, edition sharing, and normalized Model Watch counts. The site-behavior suite covers these helper/state contracts, including recovery-event storms that must not bypass scheduled-edition backoff.

The parent ran the full combined browser audit after integrating A/B/C: all seeded routes plus the latest discovered edition, three mobile viewports, the bounded desktop smoke, and compact interactions passed with `runtimeFailures: []`.

The final Share status overlay now uses `pointer-events: none`. C's isolated real-browser proof repeated four clicks against the same rendered edition: native share success, native share failure, clipboard fallback success, and clipboard failure all completed; each showed the expected safe visible status, preserved the canonical route/title, and exposed no private failure text. A separate real-clock reduced-motion check proved the released scheduled-edition headline and ancestors were visibly rendered.

## Verification evidence and attribution

### Parent-reproduced checks

The parent independently recorded:

- A1 staged security review: all six configured gates passed (secrets, dependency audit, frontend patterns, control-plane policy, security policy contract, optional-agent gate); optional agent review remained disabled by default.
- A1 newsletter regression: 18 tests passed, 0 failed/skipped/todo.
- A2 corrected staged security review: all six configured gates passed after the scanner/test collision was fixed; no bypass was used.
- A2 focused Model Watch checks were reported reproduced after correction.
- B1/B2 portable preflight and suite-wiring tests passed in the testing worktree.
- B3/B4 mobile audit contract: 11 tests passed, 0 failed/skipped/todo.
- Final integrated `npm test`: all registered suites passed, including newsletter 58, scheduled release 24, site behavior 11, mobile contract 11, and space background 66.
- Final integrated full browser audit: ten routes across mobile plus bounded desktop smoke passed with `runtimeFailures: []`.
- Final integrated lint, content-asset check, and production build passed.
- A3 actual generate-handler sink correction passed staged `security:commit`.
- A4 actual diff was reviewed and `security:test-chain` passed.
- A5 inherited error-key correction completed and the parent site-behavior suite passed.
- Final Share repeat-click browser proof passed native-share and clipboard success/failure paths; released scheduled headline visibility was also proved.

These are local integrated/staged checks, not production-provider verification or publication evidence.

### Worker checks

- A1 worker: newsletter tests, lint, build, and local security review passed; its own security invocation scanned immutable HEAD, so parent staged evidence above is the acceptance evidence.
- A2 worker: Model Watch tests and builds passed on installed Node 20 and 22; lint passed.
- B worker: final canonical `npm test` passed after registering C's site-behavior suite (11/11), including 24 scheduled-release tests, newsletter contracts, 11 mobile audit contract tests, and 66 space-background tests. The combined C/B implementation also passed a full isolated browser audit through an explicitly installed Playwright CLI override: ten routes, three mobile viewports, bounded desktop smoke, compact interactions, and zero runtime/layout failures. Earlier B lint/build checks passed; no new broad build was run after C integration per parent scope.
- C1 worker: TypeScript no-emit, lint, flow/mobile contracts, and the new site behavior suite passed under UTC, New York, and Denver process timezones; isolated browser checks passed for its four corrected surfaces.

Worker reports are supporting evidence. The parent reproduction above, together with the final focused A5 and Share evidence, establishes the integrated implementation state. Publication hooks, commit, and push remain outstanding.

## Remaining publication gates and residuals

Implementation verification is complete. Before publication, without bypass:

1. inspect the final publication diff and exclude unintended generated TypeScript build metadata;
2. run normal pre-commit and pre-push hooks and the repository-approved serialized commit/push workflow.

No commit, push, deploy, or publication is claimed by this document. Production Supabase/RLS state, Listmonk and Resend behavior, provider availability, scheduled-job execution, deployed Model Watch freshness, Vercel function/cache behavior, external links, and the exact scheduled publication transition remain outside this local audit. Durable rate limiting and a trusted outbox/reconciliation path for post-insert crashes or ambiguous provider timeouts also remain residual work.
