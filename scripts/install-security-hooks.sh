#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

git config core.hooksPath .githooks
echo "Installed local Git hooks: core.hooksPath=.githooks"
echo "Pre-commit now runs scripts/security-commit-review.sh staged."
echo "Pre-push now runs scripts/security-commit-review.sh push."
