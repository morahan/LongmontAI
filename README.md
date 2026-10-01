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
# Open a PR targeting main; wait for all required checks and approvals before merging.
```

Pre-commit runs staged security review plus a scope-selected mobile audit. Pre-push preserves Git's exact ref updates and checks pushed snapshots/history plus a scope-selected mobile audit. Article changes select feed/edition routes where provable; new branches or ambiguous changes conservatively run the full browser audit. Do not weaken these gates, use `--no-verify`, or bypass branch protection. `npm run security:push` without Git's four-field ref-update input intentionally fails closed.

A **branch push is not publication to main**. Main requires a PR and required Build/security, CodeQL, and GitHub Actions security checks. A merge to main can trigger Vercel production deployment; confirm the actual deployment and intended article/media before calling it live. Scheduled content additionally requires deployed locator/timestamp verification as described in the editor guide.

There is no safe guarantee of **under one minute to main**: hooks, remote checks, review, and deployment take independent time. On the September 30, 2026 investigation, deterministic full-tree security review took about **10s**, lint **2s**, and build **53s** locally (not a commit/push benchmark). GitHub Actions was reported disabled/billing-blocked, and protection expected Node `20.x`/`22.x` contexts while the workflow emitted `22.20.0`/`24.x`. Those unresolved remote blockers prevent the required checks from completing; a repository administrator must resolve them through the approved process, not bypass protection.

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
- `scripts/loop-push.sh` still requires Codex to prepare batches; additional security agent review is optional and inherits explicit caller opt-in for local verification, commits and pushes. Preparation exits before hooks can request review, preventing nested review. Existing hook selection uses Git's actual ref stream; this does not change Git push defaults. The loop is not the minimal article path, does not merge PRs, and must not be used to sweep a dirty shared checkout. Its `--merge-prune` flag prunes metadata; it does not satisfy protected-main merge requirements.
