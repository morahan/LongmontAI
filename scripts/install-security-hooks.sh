#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

git config core.hooksPath .githooks
echo "Installed local Git hooks: core.hooksPath=.githooks"
echo "Pre-commit and pre-push run scripts/fast-gate.sh (gitleaks, risky-pattern, control-plane, osv on dependency changes)."
echo "Thorough review: npm run security:review / just verify. Mobile audit on push only with MOBILE_AUDIT=1."
