#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "Local verification: deterministic scanners, Codex security review, lint, content assets, and production build."
SECURITY_COMMIT_AGENT_REVIEW=1 npm run security:review
npm run lint
npm run content:check-assets
npm run security:test
npm run test:loop-push
npm run build
echo "Local verification passed."
