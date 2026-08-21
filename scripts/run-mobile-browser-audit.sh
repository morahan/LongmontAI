#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

BASE_URL="${MOBILE_AUDIT_BASE_URL:-http://localhost:5173}"
PLAYWRIGHT_CLI="${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh"

OPEN_ARGS=(open "$BASE_URL")
case "${MOBILE_AUDIT_HEADED:-0}" in
  0|"") ;;
  1) OPEN_ARGS+=(--headed) ;;
  *)
    echo "MOBILE_AUDIT_HEADED must be 0 or 1." >&2
    exit 2
    ;;
esac

mkdir -p output/playwright/mobile-audit
"$PLAYWRIGHT_CLI" "${OPEN_ARGS[@]}"
"$PLAYWRIGHT_CLI" run-code --filename scripts/mobile-playwright-audit.js
