#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

git config core.hooksPath .githooks
echo "Installed local Git hooks: core.hooksPath=.githooks"
echo "Pre-commit runs the staged security review and mobile editorial audit."
echo "Pre-push runs the full security review and mobile editorial audit."
echo "Both hooks launch independent review gates in parallel; remediation stays sequential after failures."
