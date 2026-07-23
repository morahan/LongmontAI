#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

HOST="127.0.0.1"
PORT="4173"
BASE_URL="http://${HOST}:${PORT}"
LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/longmontai-mobile-audit-${PORT}.XXXXXXXX.log")"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

npm run dev -- --host "$HOST" --port "$PORT" --strictPort >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Mobile audit server exited before becoming ready. Log: $LOG_FILE" >&2
    exit 1
  fi

  if curl --fail --silent "$BASE_URL" >/dev/null 2>&1; then
    MOBILE_AUDIT_BASE_URL="$BASE_URL" npm run audit:mobile
    exit 0
  fi
  sleep 1
done

echo "Mobile audit server did not become ready. Log: $LOG_FILE" >&2
exit 1
