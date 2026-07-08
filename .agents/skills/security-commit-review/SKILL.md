---
name: security-commit-review
description: Run and interpret the LongmontAI local security commit review. Use when Codex is preparing a commit, debugging a blocked pre-commit hook, reviewing staged changes for secrets, dependency vulnerabilities, or risky frontend JavaScript/React security sinks, or deciding whether to run the optional local Codex security review.
---

# Security Commit Review

This skill keeps security review tied to the exact commit surface. The local hook runs deterministic scanners on every commit after `npm run hooks:install`; agents can run the same gates manually and escalate to a Codex review when a change touches security-sensitive frontend behavior.

## Commands

Use the repo scripts from the project root:

```bash
npm run hooks:install
npm run security:commit
npm run security:push
npm run security:review
npm run security:agent-review
```

- `npm run hooks:install` sets `core.hooksPath=.githooks` for this local checkout.
- `npm run security:commit` checks staged changes with visible progress, matching the pre-commit hook.
- `npm run security:push` checks the full tracked source tree with visible progress, matching the pre-push hook.
- `npm run security:review` checks the full tracked source tree.
- `npm run security:agent-review` runs a local Codex security review over local changes.
- Set `SECURITY_COMMIT_AGENT_REVIEW=1` before committing or pushing when the hook should also run the Codex review gate; it is off by default to avoid surprise long model runs.
- Set `SECURITY_COMMIT_FIX_MODEL=<model>` to choose the Codex model that fixes discovered vulnerabilities. The default is `CODEX_MODEL`, then `gpt-5.5`.
- Set `SECURITY_COMMIT_AUTO_FIX=0` only when you want the hook to report vulnerabilities without attempting model remediation.

## Review Workflow

1. Run `npm run security:commit` before committing or when a pre-commit hook fails.
2. Run `npm run security:push` before pushing or when a pre-push hook fails.
3. Watch the terminal dashboard: it prints scope, scan flow, numbered gates, progress bars, scanner details, vulnerability counts, and a final pass/fail table.
4. Treat `gitleaks` findings as blocking until the staged secret is removed, rotated, or proven to be a false positive with a narrow ignore.
5. Treat `npm audit --audit-level=high` failures as blocking dependency vulnerabilities. Prefer upgrading the vulnerable package or removing the vulnerable path.
6. Treat frontend risky-pattern failures as a request for manual security review. Refactor away from the sink when possible; otherwise run `npm run security:agent-review` and document why the sink is safe.
7. When any gate fails, let the configured Codex fix model attempt remediation. The hook still exits non-zero afterward so the fix can be reviewed, staged, and rerun.
8. Do not bypass the hook silently. If a commit must proceed during an external outage, use `SECURITY_COMMIT_SKIP=1` only as an explicit emergency choice and report it.

## What The Hook Checks

- Staged secrets with `gitleaks git --staged`.
- Full tracked-file secrets with `gitleaks dir` on push/manual review.
- High or critical npm dependency advisories with `npm audit --audit-level=high`.
- Newly staged frontend sink patterns in `src/`, `public/`, `index.html`, and Vite/ESLint config:
  `dangerouslySetInnerHTML`, raw HTML insertion, string code execution, `window.open`, and token-like browser storage.

## Interpreting Results

- A scanner error is a failed gate, not a pass.
- A blocked commit should be fixed at the smallest safe surface, then rerun with `npm run security:commit`.
- Auto-remediation must not commit, push, or bypass hooks; it only edits the working tree and asks for a rerun.
- If the dependency audit is blocked by registry/network issues, report that the vulnerability gate is unproven instead of calling the commit clean.
- If the staged code intentionally introduces a risky frontend pattern, run the agent review and keep the justification near the code or in the commit message.
