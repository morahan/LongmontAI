#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

BASE_URL="${MOBILE_AUDIT_BASE_URL:-http://localhost:5173}"
PLAYWRIGHT_CLI="${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh"
SESSION="longmont-mobile-audit-$$-$RANDOM"
OPEN_ERROR="$(mktemp "${TMPDIR:-/tmp}/longmont-mobile-audit-open.XXXXXXXX")"
CONFIG_FILE=""

cleanup() {
  local status=$?
  trap - EXIT
  "$PLAYWRIGHT_CLI" --session "$SESSION" close >/dev/null 2>&1 || true
  rm -f "$OPEN_ERROR"
  [[ -z "$CONFIG_FILE" ]] || rm -f "$CONFIG_FILE"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

AUDIT_URL="$BASE_URL"
if [[ -n "${MOBILE_AUDIT_ROUTES+x}" ]]; then
  AUDIT_URL="$(node - "$BASE_URL" "$MOBILE_AUDIT_ROUTES" <<'NODE'
const url = new URL(process.argv[2]);
url.searchParams.set(
  '__longmont_mobile_audit_routes',
  Buffer.from(process.argv[3], 'utf8').toString('base64url')
);
process.stdout.write(url.href);
NODE
)"
fi

case "${MOBILE_AUDIT_HEADED:-0}" in
  0|"")
    CONFIG_FILE="$(mktemp "${TMPDIR:-/tmp}/longmont-mobile-audit-playwright.XXXXXXXX.json")"
    cat >"$CONFIG_FILE" <<'JSON'
{"browser":{"browserName":"chromium","launchOptions":{"headless":true}}}
JSON
    OPEN_ARGS=(open "$AUDIT_URL" --config "$CONFIG_FILE")
    ;;
  1)
    OPEN_ARGS=(open "$AUDIT_URL" --browser chrome --headed)
    ;;
  *)
    echo "MOBILE_AUDIT_HEADED must be 0 or 1." >&2
    exit 2
    ;;
esac

mkdir -p output/playwright/mobile-audit
set +e
"$PLAYWRIGHT_CLI" --session "$SESSION" "${OPEN_ARGS[@]}" 2>"$OPEN_ERROR"
open_status=$?
set -e
cat "$OPEN_ERROR" >&2
if (( open_status != 0 )); then
  if [[ "${MOBILE_AUDIT_HEADED:-0}" != 1 ]] && grep -Eqi 'chromium[_-]headless[_-]shell|headless shell|Browser.*chromium.*not installed' "$OPEN_ERROR"; then
    cat >&2 <<EOF
Automated mobile audit requires Playwright's bundled Chromium headless shell.
Install it once with:
  "$PLAYWRIGHT_CLI" install-browser chromium --only-shell
EOF
  fi
  exit "$open_status"
fi

"$PLAYWRIGHT_CLI" --session "$SESSION" run-code --filename scripts/mobile-playwright-audit.js
