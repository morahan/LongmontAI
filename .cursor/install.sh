#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for LongmontAI.
# Refreshes Node dependencies and ensures the deterministic security scanners
# used by `npm run security:review` and the repository commit/push hooks are
# available. Safe to re-run; each step is a no-op when already satisfied.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 1. Node dependencies, pinned by package-lock.json.
npm ci

# 2. gitleaks (secret scanning). Version and digest match .github/workflows/webpack.yml.
GITLEAKS_VERSION=8.30.1
GITLEAKS_SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
if ! command -v gitleaks >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  archive="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
    --output "$tmp/$archive" \
    "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/$archive"
  echo "${GITLEAKS_SHA256}  $tmp/$archive" | sha256sum --check --strict
  tar -xzf "$tmp/$archive" -C "$tmp" gitleaks
  sudo install -m 0755 "$tmp/gitleaks" /usr/local/bin/gitleaks
  rm -rf "$tmp"
fi

# 3. osv-scanner (offline dependency vulnerability audit).
OSV_SCANNER_VERSION=2.5.1
if ! command -v osv-scanner >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
    --output "$tmp/osv-scanner" \
    "https://github.com/google/osv-scanner/releases/download/v${OSV_SCANNER_VERSION}/osv-scanner_linux_amd64"
  sudo install -m 0755 "$tmp/osv-scanner" /usr/local/bin/osv-scanner
  rm -rf "$tmp"
fi

# 4. Prime the offline OSV database so the dependency audit gate runs offline.
#    osv-scanner exits non-zero when advisories are found, so ignore its status here.
OSV_DB_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/osv-scanner"
if [ ! -d "$OSV_DB_DIR" ] || [ -z "$(ls -A "$OSV_DB_DIR" 2>/dev/null)" ]; then
  osv-scanner scan source --offline-vulnerabilities --download-offline-databases \
    --recursive --verbosity error . >/dev/null 2>&1 || true
fi

echo "LongmontAI Cloud Agent environment ready."
