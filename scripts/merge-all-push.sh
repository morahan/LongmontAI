#!/usr/bin/env bash
# Merge every local branch and worktree into main, push through the normal hooks, prune merged leftovers.
# Idempotent and resumable: on conflict it exits 3 with the file list; resolve, `git add`, re-run.
# Exit codes: 0 done, 2 usage/precondition, 3 conflict needs resolution, 1 other failure (hook/gate/push).
set -euo pipefail

MINUTES="${1:-2}"
[[ "$MINUTES" =~ ^[0-9]+$ ]] || { echo "usage: merge-all-push.sh [minutes]  (recheck interval; 0 = single pass)" >&2; exit 2; }

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
COMMON="$(git rev-parse --path-format=absolute --git-common-dir)"
[[ "$(git rev-parse --path-format=absolute --git-dir)" == "$COMMON" ]] || { echo "Run from the main checkout, not a linked worktree: $(dirname "$COMMON")" >&2; exit 2; }
[[ "$(git symbolic-ref --short -q HEAD)" == main ]] || { echo "Main checkout must be on 'main'." >&2; exit 2; }

LOCK="$COMMON/merge-all-push.lock"
mkdir "$LOCK" 2>/dev/null || { echo "Another merge-all-push is running (remove $LOCK if stale)." >&2; exit 2; }
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

log() { printf '\033[1m[merge-all]\033[0m %s\n' "$*"; }
dirty() { [[ -n "$(git -C "$1" status --porcelain --untracked-files=normal)" ]]; }

conflict_stop() {
  echo >&2
  echo "CONFLICT merging $1 into main. Unresolved files:" >&2
  git diff --name-only --diff-filter=U | sed 's/^/  /' >&2
  echo "Resolve them (keep both sides' intent), 'git add' each file, then re-run: just loop-merge-push" >&2
  echo "Do NOT use -s ours/theirs, --no-verify, or reset to escape. Abort instead with: git merge --abort" >&2
  exit 3
}

finish_pending_merge() {
  git rev-parse -q --verify MERGE_HEAD >/dev/null || return 0
  [[ -z "$(git diff --name-only --diff-filter=U)" ]] || conflict_stop "$(git name-rev --name-only MERGE_HEAD)"
  log "completing previously resolved merge"
  git commit --no-edit
}

# Emits <path>\t<branch or "-" if detached>\t<locked 0|1> per linked worktree. No empty fields: read collapses tabs.
linked_worktrees() {
  git worktree list --porcelain | awk -v root="$ROOT" '
    /^worktree /{ if (wt != "" && wt != root) print wt "\t" br "\t" lk; wt=substr($0,10); br="-"; lk=0 }
    /^branch refs\/heads\//{ br=substr($0,19) }
    /^locked/{ lk=1 }
    END{ if (wt != "" && wt != root) print wt "\t" br "\t" lk }'
}

DID=0
one_pass() {
  local wt br lk b
  DID=0

  finish_pending_merge

  # 1. Checkpoint uncommitted work everywhere (hooks run normally).
  if dirty "$ROOT"; then
    log "committing uncommitted changes on main"
    git add -A
    git commit -m "chore: checkpoint uncommitted work on main"
    DID=1
  fi
  while IFS=$'\t' read -r wt br lk; do
    [[ -d "$wt" ]] || continue
    # Detached work (dirty or unmerged commits) gets a branch so step 3 can merge it.
    if [[ "$br" == - ]] && { dirty "$wt" || ! git -C "$wt" merge-base --is-ancestor HEAD main; }; then
      br="wip/$(basename "$wt")-$(date +%Y%m%d%H%M%S)"
      log "worktree $wt is detached; creating branch $br"
      git -C "$wt" switch -c "$br"
    fi
    dirty "$wt" || continue
    log "committing uncommitted changes in $wt ($br)"
    git -C "$wt" add -A
    git -C "$wt" commit -m "chore: checkpoint uncommitted work on $br"
    DID=1
  done < <(linked_worktrees)

  # 2. Sync with origin first so local branches merge onto the real tip.
  git fetch --prune origin
  if ! git merge-base --is-ancestor origin/main main; then
    log "merging origin/main"
    git merge --no-edit origin/main || conflict_stop origin/main
    DID=1
  fi

  # 3. Merge every local branch that still contributes something.
  while read -r b; do
    [[ "$b" == main ]] && continue
    git merge-base --is-ancestor "$b" main && continue
    if git diff --quiet main "$b" 2>/dev/null && [[ -z "$(git log --format=%H main.."$b" --no-merges)" ]]; then continue; fi
    log "merging $b"
    git merge --no-ff --no-edit "$b" || conflict_stop "$b"
    DID=1
  done < <(git for-each-ref --format='%(refname:short)' refs/heads/)

  # 4. Publish through the repository's own pre-push gate.
  if [[ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]]; then
    log "pushing main"
    git push origin main
    DID=1
  fi

  # 5. Prune only what main already contains (content-identical counts as contained).
  while IFS=$'\t' read -r wt br lk; do
    [[ "$lk" == 1 ]] && { log "skipping locked worktree $wt"; continue; }
    if [[ ! -d "$wt" ]]; then continue; fi
    dirty "$wt" && continue
    [[ "$br" != - ]] || { git -C "$wt" merge-base --is-ancestor HEAD main && git worktree remove "$wt" && log "removed $wt"; continue; }
    if git merge-base --is-ancestor "$br" main || git diff --quiet main "$br"; then git worktree remove "$wt" && log "removed $wt"; fi
  done < <(linked_worktrees)
  git worktree prune
  while read -r b; do
    [[ "$b" == main ]] && continue
    git worktree list --porcelain | grep -qx "branch refs/heads/$b" && continue
    if git merge-base --is-ancestor "$b" main; then git branch -d "$b" >/dev/null && log "deleted branch $b"
    elif git diff --quiet main "$b"; then git branch -D "$b" >/dev/null && log "deleted content-identical branch $b"; fi
  done < <(git for-each-ref --format='%(refname:short)' refs/heads/)
}

# one_pass must not run in a conditional context, or bash silently disables `set -e` inside it.
while :; do
  one_pass
  if [[ "$DID" == 0 || "$MINUTES" == 0 ]]; then
    log "done: main == origin/main ($(git rev-parse --short main)); $(git worktree list | wc -l | tr -d ' ') worktree(s), $(git for-each-ref refs/heads/ | wc -l | tr -d ' ') branch(es)"
    exit 0
  fi
  log "work was published; rechecking in ${MINUTES}m for new work (Ctrl-C to stop)"
  sleep "$((MINUTES * 60))"
done
