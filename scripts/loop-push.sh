#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: scripts/loop-push.sh <minutes> [--local-verify] [--merge-prune] [--dry-run]" >&2
}

MINUTES="${1:-}"
shift || true
MERGE_PRUNE=0
LOCAL_VERIFY=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local-verify) LOCAL_VERIFY=1 ;;
    --merge-prune) MERGE_PRUNE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *) usage; exit 2 ;;
  esac
  shift
done

if ! [[ "$MINUTES" =~ ^[0-9]+$ ]]; then
  usage
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "loop-push must run inside a Git repository." >&2
  exit 1
}
cd "$ROOT"

EMPTY_STOP_COUNT="${LOOP_PUSH_EMPTY_CHECKS:-3}"
if ! [[ "$EMPTY_STOP_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo "LOOP_PUSH_EMPTY_CHECKS must be a positive integer." >&2
  exit 2
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "loop-push dry run: delay=${MINUTES}m local-verify=${LOCAL_VERIFY} merge-prune=${MERGE_PRUNE} empty-stop=${EMPTY_STOP_COUNT}"
  exit 0
fi

tree_clean() {
  [[ -z "$(git status --porcelain=v1 --untracked-files=all)" ]]
}

commit_dirty_work() {
  local before after commit_count
  command -v codex >/dev/null 2>&1 || {
    echo "loop-push requires the Codex CLI to turn changed files into reviewed commits." >&2
    return 1
  }

  before="$(git rev-parse HEAD)"
  SECURITY_COMMIT_AGENT_REVIEW=1 codex exec \
    --ephemeral \
    -c 'approval_policy="never"' \
    --sandbox workspace-write \
    --add-dir "$ROOT/.git" \
    --cd "$ROOT" \
    "Inspect the current LongmontAI working tree and commit exactly one small, coherent batch. This is one drain iteration: return only after creating that one reviewed commit, or after reporting a concrete blocker. Stage only files belonging to that batch and preserve unrelated work for the next iteration; the outer loop immediately repeats until the working tree is clean and the branch is synced. Run focused validation when it helps. Do not push, deploy, change Git configuration, use bypass flags, rewrite history, or weaken any gate. Commit normally so the repository pre-commit hook performs deterministic and agent security review. Stop and explain if the changes cannot be safely separated into a coherent commit."

  after="$(git rev-parse HEAD)"
  commit_count="$(git rev-list --count "$before".."$after")"
  [[ "$commit_count" -eq 1 ]] || {
    echo "loop-push stopped: the commit agent must produce exactly one commit; got $commit_count." >&2
    return 1
  }
}

ahead_count() {
  local upstream
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
  if [[ -n "$upstream" ]] && git rev-parse --verify "$upstream" >/dev/null 2>&1; then
    git rev-list --count "$upstream"..HEAD
  elif git remote get-url origin >/dev/null 2>&1; then
    echo 1
  else
    echo 0
  fi
}

push_current_branch() {
  local branch
  branch="$(git branch --show-current)"
  if [[ "$LOCAL_VERIFY" -eq 1 ]]; then
    bash scripts/local-ci.sh
  fi
  npm run security:push
  if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
    SECURITY_COMMIT_AGENT_REVIEW=1 git push
  else
    SECURITY_COMMIT_AGENT_REVIEW=1 git push -u origin "$branch"
  fi
}

prune_repository() {
  git fetch --prune origin
  git worktree prune
}

echo "loop-push: commits one reviewed batch at a time, runs local verification when requested, pushes immediately, and waits ${MINUTES}m only after clean and synced checks; stops after ${EMPTY_STOP_COUNT} empty checks."
empty_checks=0
merge_requested=0

while [[ "$empty_checks" -lt "$EMPTY_STOP_COUNT" ]]; do
  if ! tree_clean; then
    commit_dirty_work
    empty_checks=0
    continue
  fi

  if [[ "$(ahead_count)" -gt 0 ]]; then
    push_current_branch
    empty_checks=0
    continue
  fi

  if [[ "$MERGE_PRUNE" -eq 1 ]]; then
    prune_repository
  fi

  if ! tree_clean || [[ "$(ahead_count)" -gt 0 ]]; then
    empty_checks=0
    continue
  fi

  empty_checks=$((empty_checks + 1))
  echo "Empty check ${empty_checks}/${EMPTY_STOP_COUNT}: clean and synced."
  if [[ "$empty_checks" -lt "$EMPTY_STOP_COUNT" ]] && [[ "$MINUTES" -gt 0 ]]; then
    sleep "$((MINUTES * 60))"
  fi
done

if [[ "$MERGE_PRUNE" -eq 1 ]]; then
  prune_repository
fi

echo "loop-push complete."
