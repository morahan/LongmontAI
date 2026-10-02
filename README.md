# Longmont AI — Meetup Website

Meetup articles, tools, and Model Watch, built with React, TypeScript, Vite, vanilla CSS, Framer Motion, and Lucide React. Production hosting is on Vercel.

## Bootstrap

Use Node **22.20.0** (`.nvmrc`) and npm **10.9.3** (`packageManager`). The supported Node range is `>=22.12.0 <25`; Node 20 is not supported by the current dependencies.

```bash
nvm install
nvm use
npm install --global npm@10.9.3
npm ci --ignore-scripts
npm run hooks:install
npm run dev
```

`nvm` is optional if the pinned Node is already installed. Hook installation sets local `core.hooksPath=.githooks`; linked worktrees can share that Git configuration, so install intentionally. Before committing, ensure `gitleaks`, `osv-scanner`, and `rg` are on PATH. OSV requires a populated offline vulnerability database; a missing scanner/database blocks publication, not a clean result. See the [security review guide](.agents/skills/security-commit-review/SKILL.md).

The mobile audit also requires the Playwright CLI at `${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh` and its bundled Chromium headless shell. If the CLI is installed, bootstrap the browser with:

```bash
"${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh" install-browser chromium --only-shell
```

## Article preparation and publication

Follow the [blog editor standard](docs/blog-editor.md), including release timing, asset ownership, and guarded staging. Preparation does not publish anything. The optional `just` recipes have equivalent direct commands:

```bash
# Read-only draft/manifest checks; replace the example date, topic, and path.
node scripts/blog-edition.mjs new 2026-10-07 meetup-topic --dry-run
node scripts/blog-edition.mjs update src/articles/drafts/2026.10.07-meetup-topic.release.json --dry-run
# Equivalent: just blog-new 2026-10-07 meetup-topic
# Equivalent: just blog-update src/articles/drafts/2026.10.07-meetup-topic.release.json
```

Do expensive preparation and verification **before** timing the final commit/push. Use a clean, dedicated topic branch/worktree based on `origin/main`; never drain unrelated changes with an automated commit loop. Review and stage only the article's approved files:

```bash
npm run verify:local                 # equivalent to just verify; see limitations below
# Replace these paths with the exact reviewed publication batch, including required assets.
git add -- src/articles/<approved-article>.md <approved-related-file>
git diff --cached --stat
git diff --cached                    # review locally; never paste sensitive output
# Both commands below retain the installed hooks.
git commit -m "content: publish reviewed meetup edition"
git push -u origin HEAD
# Re-read current main protection/rules; use a PR when required, otherwise normal nonforce publication.
```

Pre-commit runs staged security review plus a scope-selected mobile audit. Pre-push preserves Git's exact ref updates and checks pushed snapshots/history plus a scope-selected mobile audit. Article changes select feed/edition routes where provable; new branches or ambiguous changes conservatively run the full browser audit. Do not weaken these gates, use `--no-verify`, or bypass branch protection. `npm run security:push` without Git's four-field ref-update input intentionally fails closed.

A **branch push is not publication to main**. Discover current main protection and applicable rules before publishing. Owner observations on October 1, 2026 show main unprotected, no branch rules, merge commits/direct nonforce pushes permitted, and Actions disabled; do not restore removed governance or invent required Actions greens. If protection later requires a PR, checks or approvals, honor those actual requirements. All local security/mobile hooks and full verification remain mandatory. A main update can trigger Vercel deployment; confirm the actual deployment and intended article/media before calling it live. Scheduled content additionally requires deployed locator/timestamp verification as described in the editor guide.

There is no safe guarantee of **under one minute to main**: hooks, verification, any policy-required remote checks/review, and deployment take independent time. On the September 30, 2026 investigation, deterministic full-tree security review took about **10s**, lint **2s**, and build **53s** locally (not a commit/push benchmark). Historical protection/billing blockers are not current requirements after the owner's October 1 policy change; always use fresh policy evidence, never weaken a local gate.

## Consolidate ALL source history into main

Use this explicitly authorized consolidation path, not the routine article path:

```bash
just loop-merge-push 0 --dry-run       # read-only local census; remote freshness UNPROVEN
just loop-merge-push 2                 # actual isolated serial merges, gates, publication and cleanup
just loop-push-merge 0 --resume <run-id> # equivalent alias; safe positional arguments
node scripts/loop-merge-push.mjs 0 --status <run-id>
node scripts/loop-merge-push.mjs 0 --cleanup <run-id>
```

The engine inventories all local branches, all configured remote-tracking namespaces **before and after nonpruning fetch**, every registered/detached/missing/locked worktree, saved administrative indices, staged/unstaged/unignored-untracked versions, filesystem special entries, three-part stashes and noncommit checkpoint refs. Prior parent inventory can be supplied privately as `<real-common-Git-dir>/loop-merge-push/historical-inputs.json`; missing historical inputs are not silently dropped. Ignored files are classified by existence without reading their contents. Streamed file hashes and batched index-object checks retain modes, symlink types and staged deletions. Repeated byte/index/ref snapshots detect movement; a cooperating mutex does not claim to exclude arbitrary external writers.

State, exact operation intents, private command evidence and packets live under `<real-common-Git-dir>/loop-merge-push/<run-id>/`. Original source indices/worktrees/stashes are not staged, restored, reset or popped. Compatible committed tips are merged normally in a dedicated integration worktree even while unrelated intake is blocked. Blocked intake, policy-critical candidate changes, unknown external Git drivers/automatic hooks, and conflicts return nonzero with packet locations. Parent-owned bounded workers resolve actual packets; the engine launches no agents. Locks/missing bytes cannot be waived as clean. A conflict leaves the original merge parents/index intact; stage only packet paths, obtain parent per-file decisions bound to the **actual resolution tree/index**, then resume the same run. Do not let a resolver commit/push or use ours/theirs strategies.

Parent review receipts are private regular files with exact run/inventory/source/tree/diff/index bindings and hashed evidence, not CLI booleans: `base-execution-approval.json`, `policy-approval.json`, `conflict-approval.json`, `merge-reconciliation-approval.json`, `source-transition-approval.json`, `intake-approval.json` and final `content-approval.json`. Packets define required fields; dirty recovery must prove both original index and working bytes/deletions/modes, stash recovery must prove all three component trees, and noncommit trees need ordinary reviewed recovery commits. A changed resolution/candidate invalidates its receipt. A pure builtin no-commit merge may materialize critical files without executing them; exact resulting-policy review still precedes security/hook code. Clean manual repairs require bounded per-path reconciliation approval as well. Unrelated roots use normal Git merges, not ours/theirs. Process-local Git housekeeping-only controls disable automatic GC/maintenance (no configuration files changed) so ordinary commands cannot prune registrations before main proof. Genuine independent review remains required; a checksum is not authentication against a privileged local writer. Optional external-agent review opt-in is never unset; if its resolved identity cannot be verified, execution blocks rather than launching an unmatched agent.

After all intended inputs are accepted, the exact clean candidate runs staged security/ordinary merge hooks and the configured ordered **18-command** final verification. Publication uses a verified **named integration ref** and normal pre-push hooks. Fresh policy permits ordinary history-preserving main fast-forward push here; protected repositories use their actual compliant PR/check path. A squash/linear-only policy incompatible with literal source ancestry blocks instead of substituting tree equality. Source/required gate/policy failures remain resumable; stderr/stdout/exit evidence is private, not dumped to the console.

Cleanup starts only after fresh advertised/fetched remote main agrees, its tree equals the accepted candidate, **every frozen original/recovery source commit is literally ancestral to remote main**, and all intended inputs are resolved. Only stable clean owner-released local branches/worktrees are removed with ordinary commands; no force, generic worktree prune, fetch-prune or remote branch deletion. Primary main, executing caller and integration/evidence/history anchors remain; remote source branches are documented durable history but still must be merged. Other locked/missing/dirty/unknown/ignored non-anchor resources block full cleanup. A stale crash mutex requires explicit owner investigation/release; resumption recovers only exact intent-bound facts, never unrelated drift.

Mutating exit `0` means all intended inputs are main-landed and eligible local cleanup completed. Conflict `3`, unresolved intake/movement `4`, policy/required hosted gate `5`, ordinary gate failure `1`, and usage `2` are **not completion**. Help/dry-run may return `0` but explicitly say not published/not complete. Baseline publication, integration-branch push, local ancestry and fixture passes do not prove ALL completion or live deployment.

## Verification and troubleshooting

```bash
npm run security:review             # deterministic review of archived HEAD, not dirty files
npm run security:commit             # staged diff; also run by pre-commit
npm run security:test               # containment and runtime-header contracts
npm run lint
npm run content:check-assets
npm run build
npm run test:mobile                 # exhaustive headless browser audit
npm run verify:local                # complete configured local verification
```

- `verify:local` runs deterministic security review, lint, release/content/contract tests, build, and exhaustive mobile audit. Routine read-only Codex security review is optional/default-off; explicitly request it with `SECURITY_COMMIT_AGENT_REVIEW=1 npm run verify:local`, `SECURITY_COMMIT_AGENT_REVIEW=1 git commit -m "reviewed batch"`, or `SECURITY_COMMIT_AGENT_REVIEW=1 git push`. Requested review failures remain blocking; verify the resolved provider/model before launching when model matching is required. Normal `git commit -m "reviewed batch"` commits only intentionally staged files and retains the hooks. Missing scanners and intentionally retained risky frontend sinks still require the security guide's review/justification; optional scheduling does not bypass those obligations. `security:review` archives HEAD, not staged or dirty bytes: verification before a later commit is not exact-final-candidate evidence. Individually passing commands do **not** prove complete local verification passed.
- At the investigation baseline, `test:content` exists but fails on a stale space-test command assertion and Model Watch API fixture/dependency-contract mismatch. Full local verification is therefore **not green**; report these failures and resolve them through scoped ownership before publication. Do not remove coverage or call the missing fixture dependency a successful API test.
- An unavailable scanner or offline database is a failed/unproven security gate. Security findings require read-only `security-triage` and a bounded `security-fixer` packet under parent review; normal hooks do not automatically fix vulnerabilities.
- Mobile audit browser-install errors include the required install command. The runner starts and cleans up its own ephemeral Vite listener; do not assume a separately running dev server proves the audit passed.
- Plain `scripts/loop-push.sh` retains its current-branch Codex preparation behavior and is not the minimal article path. Its legacy `--merge-prune` flag now dispatches to the ALL-source engine **before** dirty preparation/fetch/prune; it never prunes metadata early. Both merge aliases use the actual engine. Normal optional security-review opt-in and exact Git pre-push ref streams remain unchanged; no scanner/mobile/hook bypass is introduced.
