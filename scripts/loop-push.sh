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
  local before after commit_count git_dir message_file response
  command -v codex >/dev/null 2>&1 || {
    echo "loop-push requires the Codex CLI to turn changed files into reviewed commits." >&2
    return 1
  }

  before="$(git rev-parse HEAD)"
  git_dir="$(git rev-parse --absolute-git-dir)"
  message_file="$git_dir/loop-push-commit-message.$$"
  rm -f "$message_file"

  # The commit must happen after this Codex process exits. Otherwise the hook's
  # mandatory Codex review would be an unsupported nested Codex invocation.
  if ! codex exec \
    --ephemeral \
    -c 'approval_policy="never"' \
    --sandbox workspace-write \
    --add-dir "$git_dir" \
    --cd "$ROOT" \
    --output-last-message "$message_file" \
    "Inspect the current LongmontAI working tree and prepare exactly one small, coherent batch for commit. This is one drain iteration: stage only files belonging to that batch, including an already-staged coherent batch when present, and preserve unrelated work for the next iteration; the outer loop immediately repeats until the working tree is clean and the branch is synced. Run focused validation when it helps. Do not commit, push, deploy, change Git configuration, use bypass flags, rewrite history, or weaken any gate. On success, return exactly one line in the form COMMIT_MESSAGE: <concise Git commit subject>, with no Markdown or commentary. If the changes cannot be safely separated into a coherent commit, do not use that prefix; stop and explain the blocker instead."; then
    rm -f "$message_file"
    return 1
  fi

  after="$(git rev-parse HEAD)"
  if [[ "$after" != "$before" ]]; then
    rm -f "$message_file"
    echo "loop-push stopped: the preparation agent created a commit unexpectedly." >&2
    return 1
  fi
  response=""
  if [[ -s "$message_file" ]]; then
    IFS= read -r response <"$message_file" || true
  fi
  if git diff --cached --quiet || [[ "$response" != "COMMIT_MESSAGE: "?* ]] || [[ -n "$(tail -n +2 "$message_file" 2>/dev/null)" ]]; then
    rm -f "$message_file"
    echo "loop-push stopped: the preparation agent must stage one batch and provide exactly one prefixed commit subject." >&2
    return 1
  fi
  printf '%s\n' "${response#COMMIT_MESSAGE: }" >"$message_file"

  # This shell is outside Codex, so the hook can safely launch its mandatory,
  # read-only Codex security review without nesting Codex inside Codex.
  if ! SECURITY_COMMIT_AGENT_REVIEW=1 git commit --file "$message_file"; then
    rm -f "$message_file"
    return 1
  fi
  rm -f "$message_file"

  after="$(git rev-parse HEAD)"
  commit_count="$(git rev-list --count "$before".."$after")"
  [[ "$commit_count" -eq 1 ]] || {
    echo "loop-push stopped: exactly one reviewed commit was required; got $commit_count." >&2
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
