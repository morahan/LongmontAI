#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

BASE_URL="${MOBILE_AUDIT_BASE_URL:-http://localhost:5173}"
PLAYWRIGHT_CLI="${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh"

mkdir -p output/playwright/mobile-audit
"$PLAYWRIGHT_CLI" open "$BASE_URL" --headed
"$PLAYWRIGHT_CLI" run-code --filename scripts/mobile-playwright-audit.js
