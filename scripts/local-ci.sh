#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "Local verification: deterministic scanners, Codex security review, lint, content assets, mobile browser audit, and production build."
SECURITY_COMMIT_AGENT_REVIEW=1 npm run security:review
npm run lint
npm run release:check
npm test
npm run content:check-assets
npm run build
MOBILE_AUDIT_HEADED=0 env -u MOBILE_AUDIT_ROUTES npm run test:mobile
echo "Local verification passed."
