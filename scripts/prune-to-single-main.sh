#!/usr/bin/env bash
# Reduce this repository to a single branch: main (local and origin).
# Generated 2026-10-07 after the consolidation review. Review before running.
# Safety: a bundle of every ref exists in ~/LongmontAI-backups/ and dirty
# worktree files are copied to ~/LongmontAI-backups/worktree-dirty-20261007/.
#   bash scripts/prune-to-single-main.sh            # dry run (prints only)
#   bash scripts/prune-to-single-main.sh --execute  # performs the deletions
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[[ "$(git branch --show-current)" == "main" ]] || { echo "checkout main first" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "working tree must be clean" >&2; exit 1; }
run() { if [[ "${1:-}" == "--execute" ]]; then shift; "$@"; else printf 'DRY: %q ' "$@"; echo; fi; }
MODE="${1:-}"

echo "## 1. Unlock and prune worktree registrations whose directory is gone"
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r w; do
  [[ -d "$w" ]] && continue
  run $MODE git worktree unlock "$w" || true
done
run $MODE git worktree prune -v

echo "## 2. Delete every local branch except main"
git branch --format='%(refname:short)' | grep -vx main | while read -r b; do
  run $MODE git branch -D "$b"
done

echo "## 3. Delete every origin branch except main"
git fetch --prune origin
git branch -r --format='%(refname:short)' | grep -v '^origin/HEAD' | grep -vx 'origin/main' | sed 's#^origin/##' | while read -r b; do
  run $MODE git push origin --delete "$b"
done

echo "## 4. (Manual) real worktree directories still on disk; remove only when you are sure:"
git worktree list | tail -n +2
echo "   e.g.: git worktree remove --force <path>   (deletes that directory)"

echo "## Final state"
git branch -a
git worktree list
