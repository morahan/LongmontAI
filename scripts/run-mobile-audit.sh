#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

HOST="127.0.0.1"
PORT="${MOBILE_AUDIT_PORT:-$(node - <<'NODE'
const net = await import('node:net');
const server = net.createServer();
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  process.stdout.write(String(address.port));
  server.close();
});
NODE
)}"
if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
  echo "MOBILE_AUDIT_PORT must be an integer from 1 to 65535." >&2
  exit 2
fi
BASE_URL="http://${HOST}:${PORT}"
LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/longmontai-mobile-audit-${PORT}.XXXXXXXX")"

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
