---
name: security-commit-review
description: Run and interpret the LongmontAI local security commit review. Use when Codex is preparing a commit, debugging a blocked pre-commit hook, reviewing staged changes for secrets, dependency vulnerabilities, or risky frontend JavaScript/React security sinks, or deciding whether to run the optional local Codex security review.
---

# Security Commit Review

This skill keeps security review tied to the exact commit and push surface. After `npm run hooks:install`, the local pre-commit and pre-push hooks run the shared review chain automatically. Independent review gates run in parallel whenever possible; remediation is intentionally sequential and starts only after every gate has reported its result.

## Commands

Use the repo scripts from the project root:

```bash
npm run hooks:install
npm run security:commit
npm run security:push
npm run security:review
npm run security:agent-review
npm run security:remediate
npm run security:test-chain
npm run security:test-runtime
npm run verify:local
```

- `npm run hooks:install` sets `core.hooksPath=.githooks` for this local checkout.
- `npm run security:commit` checks staged changes through the parallel review chain, matching the pre-commit hook.
- `npm run security:push` checks the full tracked source tree through the parallel review chain, matching the pre-push hook.
- `npm run security:review` checks the full tracked source tree through the parallel review chain.
- `npm run security:agent-review` runs a read-only, ephemeral Codex security review over local changes.
- `npm run security:remediate` runs all deterministic gates and, only after a failure, explicitly starts a workspace-write orchestrator. It delegates read-only validation to `security-triage`, then delegates each validated packet to a bounded `security-fixer` subagent.
- `npm run security:test-chain` verifies the safety contract without launching an agent.
- `npm run security:test-runtime` verifies the production response-header contract.
- `npm run verify:local` runs the complete local release gate: deterministic scans, a read-only Codex review, lint, content assets, contract tests, and the production build.
- Set `SECURITY_COMMIT_AGENT_REVIEW=1` before committing or pushing when the hook should also run the Codex review gate; it is off by default to avoid surprise long model runs.
- Set `SECURITY_COMMIT_FIX_MODEL=<model>` to choose the Codex model that fixes discovered vulnerabilities. The default is `CODEX_MODEL`, then `gpt-5.5`.
- Automatic fixing is off by default. `SECURITY_COMMIT_AUTO_FIX=1` is an explicit grant for one invocation; `SECURITY_COMMIT_FIX_ATTEMPTS` accepts only `1` or `2` and defaults to `1`.

## Review Workflow

1. Run `npm run hooks:install` once per checkout so every Git commit and push enters this review chain.
2. Run `npm run security:commit` before committing or when a pre-commit hook fails.
3. Run `npm run security:push` before pushing or when a pre-push hook fails.
4. Watch the terminal dashboard: it prints scope, parallel lane launches, numbered gates, progress bars, scanner details, vulnerability counts, and a final pass/fail table.
5. Keep deterministic scanners and optional agent review parallel; keep only auto-remediation sequential, because it needs the complete set of failed gates.
6. Treat `gitleaks` findings as blocking until the staged secret is removed, rotated, or proven to be a false positive with a narrow ignore.
7. Treat the offline `osv-scanner` result as blocking dependency-vulnerability evidence. Refresh its local database outside the release gate, then rerun the gate before publication.
8. Treat frontend risky-pattern failures as a request for manual security review. Refactor away from the sink when possible; otherwise run `npm run security:agent-review` and document why the sink is safe.
9. A normal hook failure only reports and writes a redacted evidence packet under `.git/security-review/`. Run `npm run security:remediate` when you explicitly want an agent to edit the workspace.
10. Review remediation edits, stage them intentionally, and rerun the original gate. The scanner remains fail-closed and the fixer cannot commit, push, deploy, bypass hooks, access credentials, or weaken scanners.
11. Do not bypass a failing scanner. A genuine local incident may use `SECURITY_COMMIT_BREAK_GLASS=1 SECURITY_COMMIT_BREAK_GLASS_TICKET=<ticket>`; it is refused in CI and recorded under `.git/security-review/`.

## What The Hook Checks

- Staged secrets with `gitleaks git --staged`.
- Full tracked-file secrets with `gitleaks dir` on push/manual review, plus every outgoing commit in `upstream..HEAD` on push.
- Dependency advisories from the locally cached OSV database with `osv-scanner scan source --offline-vulnerabilities`.
- Newly staged frontend sink patterns in `src/`, `public/`, `index.html`, and Vite/ESLint config:
  `dangerouslySetInnerHTML`, raw HTML insertion, string code execution, `window.open`, and token-like browser storage.
- Agent control-plane files under `.github/`, `.codex/`, `.agents/`, `.githooks/`, `api/`, and `scripts/`, plus `package.json`, `justfile`, and `vercel.json`, for prohibited full-access sandboxes, broad writes, and persisted checkout credentials.

## Interpreting Results

- A scanner error is a failed gate, not a pass.
- A blocked commit should be fixed at the smallest safe surface, then rerun with `npm run security:commit`.
- Triage/review agents run read-only. Explicit remediation runs ephemeral and workspace-write with network disabled by the sandbox; it must not commit, push, deploy, change Git configuration, access credentials, bypass hooks, or weaken scanners.
- Evidence packets contain only mode, commit, failed gate names, and filenames. Never add scanner output or secret values to them.
- If the offline OSV database is missing or unreadable, report that the vulnerability gate is unproven instead of calling the commit clean.
- If the staged code intentionally introduces a risky frontend pattern, run the agent review and keep the justification near the code or in the commit message.
