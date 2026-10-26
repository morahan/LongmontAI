#!/usr/bin/env bash
# Source-control status matrix for one or more repos: a per-repo summary, then one row per branch
# (local/remote, worktree, dirty files, stashes, commits vs the default branch, sync with origin, last
# commit age, PR), then per-repo details (stashes, dirty files, unpushed/unpulled commits per branch).
# Repo-agnostic: each repo's default branch is origin/HEAD's target, else local main, else master, else
# the current branch. Repos are scanned in parallel (STATUS_JOBS, default 8) but printed in argument
# order; labels are paths relative to the cwd (the repo's own name for "."). Needs bash >= 4 (re-execs
# under a newer bash from PATH or Homebrew if started by macOS's /bin/bash 3.2).
# Usage: git-status-matrix.sh [repo-dir ...]   (default: current repo; NO_COLOR=1 disables colour)
# The only git write is `git fetch --prune origin` per repo.
set -uo pipefail

# bash >= 4 guard (declare -A). Kept bash-3.2-safe: top-level commands are parsed one at a time.
if [ "${BASH_VERSINFO[0]:-0}" -lt 4 ]; then
  if [ -z "${GIT_STATUS_MATRIX_REEXEC:-}" ]; then
    export GIT_STATUS_MATRIX_REEXEC=1
    while IFS= read -r b; do
      [ -x "$b" ] && "$b" -c '[ "${BASH_VERSINFO[0]}" -ge 4 ]' 2>/dev/null && exec "$b" "$0" "$@"
    done < <(type -ap bash; echo /opt/homebrew/bin/bash; echo /usr/local/bin/bash)
  fi
  echo "git-status-matrix.sh: needs bash >= 4 (this is ${BASH_VERSION:-not bash}); install one, e.g. 'brew install bash'" >&2
  exit 2
fi

[ "$#" -eq 0 ] && set -- .
# Strip control chars (keep tab/newline) so PR titles or branch names can't inject terminal escapes
clean() { LC_ALL=C tr -d '\000-\010\013-\037\177'; }
has_gh=0; command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1 && has_gh=1
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  cR=$'\e[31m' cG=$'\e[32m' cY=$'\e[33m' cC=$'\e[36m' cB=$'\e[1m' cD=$'\e[2m' cX=$'\e[0m'
else
  cR='' cG='' cY='' cC='' cB='' cD='' cX=''
fi
root="$(pwd)"; now="$(date +%s)"
jobs_max="${STATUS_JOBS:-8}"; [[ "$jobs_max" =~ ^[1-9][0-9]*$ ]] || jobs_max=8
tmp="$(mktemp -d "${TMPDIR:-/tmp}/git-status-matrix.XXXXXX")" || exit 1
trap 'rm -rf "$tmp"' EXIT
trap 'kill $(jobs -p) 2>/dev/null; exit 130' INT TERM

# Pad/truncate to a display width (character-based, so ● and … don't skew columns)
pad() { local s="$1" w="$2"; (( ${#s} > w )) && s="${s:0:w-1}…"; printf '%s%*s' "$s" $(( w - ${#s} )) ''; }
age() {
  local s=$(( now - $1 ))
  if (( s < 3600 )); then echo "$(( s / 60 ))m"; elif (( s < 86400 )); then echo "$(( s / 3600 ))h"
  elif (( s < 86400 * 14 )); then echo "$(( s / 86400 ))d"; elif (( s < 86400 * 60 )); then echo "$(( s / 604800 ))w"
  else echo "$(( s / 2592000 ))mo"; fi
}
shortpath() { local p="${1#"$root"/}"; [ "$p" = "$root" ] && p="."; printf '%s' "${p/#"$HOME"/\~}"; }
ab() { git -C "$dir" rev-list --left-right --count "$1...$2" 2>/dev/null; }   # "<ahead> <behind>"
# Repo label: path relative to the cwd; "." (or the cwd itself) becomes the repo's own directory name
label() {
  local abs top
  abs="$(cd "$1" 2>/dev/null && pwd)" || { printf '%s' "$1"; return; }
  if [ "$abs" = "$root" ]; then
    top="$(git -C "$abs" rev-parse --show-toplevel 2>/dev/null)"; basename "${top:-$abs}"
  else shortpath "$abs"; fi
}
# Default branch: origin/HEAD target, else local main, else master, else the current branch
default_branch() {
  local h b
  h="$(git -C "$dir" symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null)" && [ -n "$h" ] && { printf '%s' "${h#origin/}"; return; }
  for b in main master; do git -C "$dir" show-ref -q --verify "refs/heads/$b" && { printf '%s' "$b"; return; }; done
  git -C "$dir" symbolic-ref --short -q HEAD || printf main
}
# Up to 5 commits in a range, then "+N more": title count range
clist() {
  printf '    %s (%s):\n' "$1" "$2"
  git -C "$dir" log -5 --format='%h %s (%cr)' "$3" -- | clean | sed 's/^/      /'
  if (( $2 > 5 )); then printf '      +%s more\n' $(( $2 - 5 )); fi
}

labels=(); w=24
for dir in "$@"; do l="$(label "$dir")"; labels+=("$l"); (( ${#l} > w )) && w=${#l}; done
fmt="%-${w}s │ %6s %6s │ %6s │ %6s │ %6s │ %5s │ %-10s │ %s\n"
sep="$(printf '%*s' $(( w + 1 )) '' | sed 's/ /─/g')"
line() { printf '%s\n' "$sep┼───────────────┼────────┼────────┼────────┼───────┼────────────┼────"; }

# One branch-table row: name L R worktree dirty stash vs-default vs-origin age note (colour per cell)
brow() {
  printf '  %s %s %s  %s %s%s%s %s%s%s  %s %s%s%s %s  %s\n' \
    "$(pad "$1" 30)" "$2" "$3" "$(pad "$4" 28)" "$5" "$(pad "$6" 5)" "$cX" "$7" "$(pad "$8" 5)" "$cX" \
    "$(pad "$9" 8)" "${10}" "$(pad "${11}" 11)" "$cX" "$(pad "${12}" 4)" "${13}"
}

# Scan one repo; writes <out>.row (summary line), .tot (nl nr np wt st dirty bad), .table, .details
scan() {
  local dir="$1" name="$2" out="$3"
  if ! git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf "%-${w}s │ not a git repository\n" "$name" >"$out.row"; echo "0 - n/a 0 0 0 1" >"$out.tot"; return
  fi
  local has_origin=0 fetched=0 def
  git -C "$dir" remote get-url origin >/dev/null 2>&1 && has_origin=1
  [ "$has_origin" = 1 ] && git -C "$dir" fetch --prune -q origin 2>/dev/null && fetched=1
  def="$(default_branch)"

  local nl nr wt st dirty
  nl="$(git -C "$dir" for-each-ref refs/heads | wc -l | tr -d ' ')"
  nr="$(git -C "$dir" for-each-ref --format='%(refname)' refs/remotes | grep -vc '/HEAD$' | tr -d ' ')"
  wt="$(git -C "$dir" worktree list --porcelain | grep -c '^worktree ')"
  st="$(git -C "$dir" stash list | wc -l | tr -d ' ')"
  dirty="$(git -C "$dir" status --porcelain | wc -l | tr -d ' ')"

  local prs="" np="n/a" slug
  if [ "$has_origin" = 1 ] && [ "$has_gh" = 1 ]; then
    slug="$(git -C "$dir" remote get-url origin | sed -E 's#^(https://github.com/|git@github.com:)##; s#\.git$##')"
    if prs="$(gh pr list -R "$slug" --state open --limit 200 \
        --json number,headRefName,title,isDraft \
        --jq '.[] | "\(.headRefName)\t#\(.number)\(if .isDraft then " [draft]" else "" end) \(.title)"' 2>/dev/null | clean)"; then
      np="$(printf '%s' "$prs" | grep -c . | tr -d ' ')"
    else
      prs=""; np="err"
    fi
  fi

  local abm
  if [ "$has_origin" = 1 ] && [ "$fetched" = 0 ]; then
    abm="fetch fail"   # remote refs may be stale, so don't compare against them
  elif [ "$has_origin" = 1 ]; then
    abm="$(ab "$def" "origin/$def" | awk '{print "+"$1"/-"$2}')"
    abm="${abm:-n/a}"
  else
    abm="no remote"; nr="-"
  fi

  local remote_ok=0 cur ok bad=0
  [ "$has_origin" = 1 ] && [ "$nr" = 1 ] && [ "$abm" = "+0/-0" ] && [ "$np" = 0 ] && remote_ok=1
  cur="$(git -C "$dir" symbolic-ref --short -q HEAD || echo "detached at $(git -C "$dir" rev-parse --short HEAD)")"
  if [ "$cur" = "$def" ] && [ "$nl" = 1 ] && [ "$wt" = 1 ] && [ "$st" = 0 ] && [ "$dirty" = 0 ] && [ "$remote_ok" = 1 ]; then ok=✅; else ok=❌; bad=1; fi
  printf "$fmt" "$name" "$nl" "$nr" "$np" "$wt" "$st" "$dirty" "$abm" "$ok" >"$out.row"
  echo "$nl $nr $np $wt $st $dirty $bad" >"$out.tot"

  # ---- per-branch table ----
  local base="$def" k v p b s t
  git -C "$dir" rev-parse -q --verify "refs/remotes/origin/$def" >/dev/null && base="origin/$def"
  local -A wt_of=() st_of=() pr_of=(); local detached=() dhead=() hd=""
  while read -r k v; do
    case "$k" in
      worktree) p="$v"; hd="" ;;
      HEAD) hd="$v" ;;
      branch) wt_of["${v#refs/heads/}"]="$p" ;;
      detached) detached+=("$p"); dhead+=("$hd") ;;
    esac
  done < <(git -C "$dir" worktree list --porcelain)
  while IFS= read -r s; do
    [ -n "$s" ] || continue; b="${s#WIP on }"; b="${b#On }"; b="${b%%:*}"; st_of["$b"]=$(( ${st_of["$b"]:-0} + 1 ))
  done < <(git -C "$dir" stash list --format='%gs' | clean)
  while IFS=$'\t' read -r b t; do [ -n "$b" ] && pr_of["$b"]="$t"; done <<<"$prs"

  local locals remotes branches
  locals="$(git -C "$dir" for-each-ref --format='%(refname:short)' refs/heads)"
  remotes="$(git -C "$dir" for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v -E '^origin(/HEAD)?$' | sed 's#^origin/##')"
  branches="$( { grep -Fx "$def" <<<"$locals"; grep -vFx "$def" <<<"$locals"; comm -13 <(sort <<<"$locals") <(sort <<<"$remotes"); } | grep . )"

  local rows="" commits="" l r ref wp dy dyc sc note vm vmc ahead a bh sy syc h
  while IFS= read -r b; do
    [ -n "$b" ] || continue
    l="·"; r="·"; git -C "$dir" rev-parse -q --verify "refs/heads/$b" >/dev/null && l="●"
    git -C "$dir" rev-parse -q --verify "refs/remotes/origin/$b" >/dev/null && r="●"
    ref="$b"; [ "$l" = "·" ] && ref="origin/$b"
    wp="—"; dy="—"; dyc=""
    if [ -n "${wt_of[$b]:-}" ]; then
      wp="$(shortpath "${wt_of[$b]}")"
      if [ ! -d "${wt_of[$b]}" ]; then dy="gone"; elif ! dy="$(git -C "${wt_of[$b]}" status --porcelain 2>/dev/null | wc -l | tr -d ' '; exit "${PIPESTATUS[0]}")"; then dy="?"; fi
      [ "$dy" != 0 ] && dyc="$cY"
    fi
    s="${st_of[$b]:-0}"; sc=""; [ "$s" != 0 ] && sc="$cY"
    note=""; vm="—"; vmc=""; ahead=0
    if [ "$b" != "$def" ]; then
      read -r a bh <<<"$(ab "$ref" "$base")"; vm="+${a:-?}/-${bh:-?}"
      if [ "${a:-1}" = 0 ]; then vmc="$cD"; note+="${cD}merged, prunable${cX} "; else vmc="$cC"; ahead=1; fi
    fi
    if [ "$has_origin" = 0 ]; then sy="no remote"; syc="$cD"
    elif [ "$fetched" = 0 ]; then sy="stale"; syc="$cY"
    elif [ "$l" = "●" ] && [ "$r" = "●" ]; then
      read -r a bh <<<"$(ab "$b" "origin/$b")"; sy=""; syc="$cG"
      [ "$a" != 0 ] && { sy+="↑$a "; syc="$cR"; note+="${cR}unpushed${cX} "; }
      [ "$bh" != 0 ] && { sy+="↓$bh"; [ "$a" = 0 ] && syc="$cY"; note+="${cY}needs pull${cX} "; }
      sy="${sy:-synced}"
      if [ "${a:-0}" != 0 ] || [ "${bh:-0}" != 0 ]; then
        commits+="  $b:"$'\n'
        [ "$a" != 0 ] && commits+="$(clist "↑ unpushed" "$a" "origin/$b..$b")"$'\n'
        [ "$bh" != 0 ] && commits+="$(clist "↓ unpulled" "$bh" "$b..origin/$b")"$'\n'
      fi
    elif [ "$l" = "●" ]; then sy="local only"; syc="$cY"; [ "$ahead" = 1 ] && { syc="$cR"; note+="${cR}unpushed${cX} "; }
    else sy="remote only"; syc="$cD"; fi
    [ -n "${pr_of[$b]:-}" ] && note+="${cC}$(pad "${pr_of[$b]}" 48)${cX}"
    rows+="$(brow "$b" "$l" "$r" "$wp" "$dyc" "$dy" "$sc" "$s" "$vm" "$syc" "$sy" "$(age "$(git -C "$dir" log -1 --format=%ct "$ref")")" "$note")"$'\n'
  done <<<"$branches"
  # Detached worktrees: resolve the porcelain HEAD sha via the main repo, so gone dirs still get hash/age/vs-base
  local j full ct da
  for j in ${detached[@]+"${!detached[@]}"}; do
    p="${detached[j]}"; full="${dhead[j]}"; a=""; bh=""; da="—"
    if h="$(git -C "$dir" rev-parse -q --short --verify "${full:-?}^{commit}" 2>/dev/null)"; then
      read -r a bh <<<"$(ab "$full" "$base")"
      ct="$(git -C "$dir" log -1 --format=%ct "$full" 2>/dev/null)" && [ -n "$ct" ] && da="$(age "$ct")"
    else
      h="${full:0:7}"; h="${h:-?}"
    fi
    if [ -d "$p" ]; then
      dy="$(git -C "$p" status --porcelain 2>/dev/null | wc -l | tr -d ' '; exit "${PIPESTATUS[0]}")" || dy="?"
      note="${cY}detached worktree${cX}"
    else
      dy="gone"; note="${cD}gone, prunable (git worktree prune)${cX}"
    fi
    rows+="$(brow "(detached $h)" "·" "·" "$(shortpath "$p")" "$cY" "$dy" "" "—" "+${a:-?}/-${bh:-?}" "$cD" "—" "$da" "$note")"$'\n'
  done
  printf '%s' $'\n'"${cB}── $name${cX}  ${cD}(on $cur, compared against $base)${cX}"$'\n'"$rows" >"$out.table"

  local d=""
  [ "$st" -gt 0 ] && d+="  stashes:"$'\n'"$(git -C "$dir" stash list | clean | sed 's/^/    /')"$'\n'
  [ "$dirty" -gt 0 ] && d+="  dirty files (first 15):"$'\n'"$(git -C "$dir" status --short | clean | head -15 | sed 's/^/    /')"$'\n'
  [ -n "$commits" ] && d+="  commits not in sync with origin:"$'\n'"$commits"
  [ -n "$d" ] && printf '%s' $'\n'"── $name"$'\n'"$d" >"$out.details"
  return 0
}

# ---- parallel scan, at most $jobs_max repos at once ----
running=0; i=0
for dir in "$@"; do
  if (( running >= jobs_max )); then
    if (( BASH_VERSINFO[0] * 100 + BASH_VERSINFO[1] >= 403 )); then wait -n; running=$((running - 1)); else wait; running=0; fi
  fi
  scan "$dir" "${labels[i]}" "$tmp/$i" &
  running=$((running + 1)); i=$((i + 1))
done
wait

# ---- assemble in argument order ----
printf "$fmt" '' 'branch' 'branch' 'PRs' 'work-' 'stash' 'dirty' 'default' ''
printf "$fmt" 'repo' 'local' 'remote' 'open' 'trees' 'local' 'files' 'vs origin' 'ok'
line
tl=0; tr=0; tp=0; tw=0; ts=0; td=0; all_ok=0; details=""; table=""
for (( i = 0; i < $#; i++ )); do
  f="$tmp/$i"
  if [ ! -s "$f.row" ]; then printf "%-${w}s │ scan failed\n" "${labels[i]}"; all_ok=1; continue; fi
  cat "$f.row"
  read -r nl nr np wt st dirty bad <"$f.tot"
  tl=$((tl + nl)); tw=$((tw + wt)); ts=$((ts + st)); td=$((td + dirty))
  [ "$nr" != "-" ] && tr=$((tr + nr))
  [[ "$np" =~ ^[0-9]+$ ]] && tp=$((tp + np))
  [ "$bad" = 1 ] && all_ok=1
  [ -f "$f.table" ] && table+="$(cat "$f.table"; echo x)" && table="${table%x}"
  [ -f "$f.details" ] && details+="$(cat "$f.details"; echo x)" && details="${details%x}"
done

if [ "$#" -gt 1 ]; then
  line
  printf "$fmt" 'TOTAL' "$tl" "$tr" "$tp" "$tw" "$ts" "$td" '' ''
fi
[ "$has_gh" = 0 ] && echo "(PRs n/a: gh CLI missing or not authenticated)"

echo
printf '%s' "$cD"; brow 'branch' 'L' 'R' 'worktree' '' 'dirty' '' 'stash' 'vs base' '' 'vs origin' 'age' 'note'; printf '%s' "$cX"
printf '%s' "$table"
printf '%s' "$details"
echo
printf '%s\n' "${cD}L/R = local/remote branch exists · base = each repo's default branch (origin/HEAD, else main, else master) · vs base = commits ahead/behind it · ↑ unpushed ↓ unpulled · age = last commit${cX}"
[ "$all_ok" -eq 0 ] && echo "default-branch-only, clean and level with origin ✅" || echo "❌ = not on the default branch, extra branches, PRs, worktrees, stashes, dirty files, default-branch drift, failed fetch or no remote"
