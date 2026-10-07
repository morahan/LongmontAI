#!/usr/bin/env bash
# Fast git-hook gate. Thorough review stays in scripts/security-commit-review.sh
# (npm run security:review, scripts/local-ci.sh, just verify).
#   scripts/fast-gate.sh commit            # pre-commit: staged changes only
#   scripts/fast-gate.sh push <ref-lines   # pre-push: outgoing commits only
set -euo pipefail

MODE="${1:-}"
case "$MODE" in
  commit | push) ;;
  *) echo "usage: scripts/fast-gate.sh commit|push" >&2; exit 2 ;;
esac

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/longmontai-fast-gate.XXXXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

ZERO_OID="0000000000000000000000000000000000000000"

# Kept in sync with scripts/security-commit-review.sh.
RISKY_PATTERN=$'dangerouslySetInnerHTML|\\.innerHTML\\b|\\.outerHTML\\b|insertAdjacentHTML\\s*\\(|document\\.write(ln)?\\s*\\(|\\beval\\s*\\(|new Function\\s*\\(|set(Time|Inter)val\\s*\\(\\s*["\\\']|window\\.open\\s*\\(|localStorage\\.(setItem|getItem)\\([^)]*(token|secret|password|jwt|credential|auth)|sessionStorage\\.(setItem|getItem)\\([^)]*(token|secret|password|jwt|credential|auth)'
CONTROL_PATTERN=$'sandbox(_mode)?[[:space:]]*=[[:space:]]*["\x27]danger-full-access|--sandbox[[:space:]]+danger-full-access|permissions:[[:space:]]*write-all|persist-credentials:[[:space:]]*true'
DEPENDENCY_PATTERN='(^|/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|pnpm-workspace\.yaml|bun\.lockb?|deno\.jsonc?|deno\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Pipfile(\.lock)?|uv\.lock|Cargo\.(toml|lock)|go\.(mod|sum)|Gemfile(\.lock)?|composer\.(json|lock)|pom\.xml|build\.gradle(\.kts)?|gradle\.lockfile)$'

path_matches_review_scope() {
  [[ "$1" =~ ^(src/|public/|index\.html$|vite\.config\.(js|ts)$|eslint\.config\.js$) ]] \
    && [[ "$1" =~ (\.(js|jsx|ts|tsx|mjs|cjs|html)$|^index\.html$) ]]
}

path_matches_control_scope() {
  [[ "$1" =~ ^(\.github/|\.codex/|\.agents/|\.githooks/|api/|scripts/|vercel\.json$|package\.json$|justfile$) ]] \
    && [[ "$1" =~ (\.(yaml|yml|json|toml|sh|js|jsx|ts|tsx|mjs|cjs|md)$|^vercel\.json$) ]] \
    && [[ "$1" != "scripts/security-commit-review.sh" && "$1" != "scripts/fast-gate.sh" ]]
}

now() { printf '%s' "${EPOCHREALTIME:-$(date +%s)}"; }

SUMMARY=()
FAILED=0
record() { # status label start [note]
  local elapsed
  elapsed="$(awk -v s="$3" -v e="$(now)" 'BEGIN { printf "%.1f", e - s }')"
  SUMMARY+=("$(printf '%-4s %-16s %5ss%s' "$1" "$2" "$elapsed" "${4:+  $4}")")
  [[ "$1" == "FAIL" ]] && FAILED=1
  return 0
}

require_tool() { # tool install-hint
  command -v "$1" >/dev/null 2>&1 && return 0
  echo "fast-gate: $1 is required; install with: $2" >&2
  return 1
}

# Print "file:line: added text" for each added line of a unified=0 diff on stdin.
added_lines() {
  awk '
    /^\+\+\+ / { file = substr($0, 5); sub(/^b\//, "", file); next }
    /^@@/ { split($3, a, ","); line = substr(a[1], 2) + 0; next }
    /^\+/ { printf "%s:%d: %s\n", file, line, substr($0, 2); line++ }
  '
}

# scan_added label pattern scope_fn files_list diff-args...
scan_added() {
  local label="$1" pattern="$2" scope_fn="$3" files_list="$4"
  shift 4
  local start file hits
  local -a scoped=()
  start="$(now)"
  while IFS= read -r -d '' file; do
    "$scope_fn" "$file" && scoped+=(":(literal)$file")
  done <"$files_list"
  if [[ "${#scoped[@]}" -eq 0 ]]; then
    record SKIP "$label" "$start" "no files in scope"
    return 0
  fi
  if ! git diff --no-color --no-ext-diff --unified=0 "$@" -- "${scoped[@]}" | added_lines >"$TMP_DIR/added"; then
    echo "fast-gate: failed to read diff for $label" >&2
    record FAIL "$label" "$start" "diff failed"
    return 0
  fi
  local rg_status=0
  hits="$(rg -i -e "^[^:]+:[0-9]+: .*(${pattern})" "$TMP_DIR/added")" || rg_status=$?
  if [[ "$rg_status" -eq 0 ]]; then
    echo "fast-gate: $label matches:" >&2
    printf '%s\n' "$hits" | sed 's/^/  /' >&2
    record FAIL "$label" "$start" "$(printf '%s\n' "$hits" | wc -l | tr -d ' ') match(es)"
  elif [[ "$rg_status" -eq 1 ]]; then
    record PASS "$label" "$start" "${#scoped[@]} file(s)"
  else
    record FAIL "$label" "$start" "rg error"
  fi
}

root_lockfile() {
  local candidate
  for candidate in package-lock.json npm-shrinkwrap.json yarn.lock pnpm-lock.yaml; do
    [[ -f "$candidate" ]] && { printf '%s' "$candidate"; return 0; }
  done
  return 1
}

# osv_scan files_list revspec-prefix  (":" for the index, "<oid>:" for a commit)
osv_scan() {
  local files_list="$1" rev="$2" start file changed=0 lockfile dir
  start="$(now)"
  while IFS= read -r -d '' file; do
    [[ "$file" =~ $DEPENDENCY_PATTERN ]] && { changed=1; break; }
  done <"$files_list"
  if [[ "$changed" -eq 0 ]]; then
    record SKIP "osv-scanner" "$start" "no dependency changes"
    return 0
  fi
  if ! require_tool osv-scanner "brew install osv-scanner"; then
    record FAIL "osv-scanner" "$start" "not installed"
    return 0
  fi
  if ! lockfile="$(root_lockfile)"; then
    record SKIP "osv-scanner" "$start" "no root lockfile"
    return 0
  fi
  dir="$TMP_DIR/osv"
  mkdir -p "$dir"
  if ! git show "${rev}${lockfile}" >"$dir/$lockfile" 2>/dev/null; then
    record SKIP "osv-scanner" "$start" "$lockfile absent at target"
    return 0
  fi
  if osv-scanner scan source --offline-vulnerabilities --verbosity error --lockfile "$dir/$lockfile" >&2; then
    record PASS "osv-scanner" "$start" "$lockfile"
  else
    record FAIL "osv-scanner" "$start" "$lockfile"
  fi
}

agent_review() {
  [[ "${SECURITY_COMMIT_AGENT_REVIEW:-0}" == "1" ]] || return 0
  local start
  start="$(now)"
  if ! command -v codex >/dev/null 2>&1; then
    echo "fast-gate: codex is not available for SECURITY_COMMIT_AGENT_REVIEW=1." >&2
    record FAIL "codex review" "$start" "not installed"
    return 0
  fi
  # shellcheck disable=SC2016 # $security-commit-review is a literal skill name.
  if codex exec --ephemeral -c 'approval_policy="never"' --sandbox read-only 'Use $security-commit-review to review local changes for security vulnerabilities only. Do not edit files or run commands that mutate the repository. Prioritize exploitable findings with exact file references and minimal fixes.'; then
    record PASS "codex review" "$start"
  else
    record FAIL "codex review" "$start"
  fi
}

run_commit() {
  local files_list="$TMP_DIR/staged-files" start
  git diff --cached --name-only --diff-filter=ACMR -z >"$files_list"

  start="$(now)"
  if git diff --cached --quiet; then
    record SKIP "gitleaks" "$start" "nothing staged"
  elif ! require_tool gitleaks "brew install gitleaks"; then
    record FAIL "gitleaks" "$start" "not installed"
  elif gitleaks git --staged --redact --no-banner --log-level warn .; then
    record PASS "gitleaks" "$start" "staged"
  else
    record FAIL "gitleaks" "$start" "staged"
  fi

  scan_added "risky-frontend" "$RISKY_PATTERN" path_matches_review_scope "$files_list" --cached
  scan_added "control-plane" "$CONTROL_PATTERN" path_matches_control_scope "$files_list" --cached
  osv_scan "$files_list" ":"
  agent_review
}

run_push() {
  local push_refs="$TMP_DIR/push-refs"
  cat >"$push_refs"
  local local_ref local_oid remote_ref remote_oid extra start base count
  local -a range
  while read -r local_ref local_oid remote_ref remote_oid extra; do
    [[ -n "${local_oid:-}" ]] || continue
    [[ "$local_oid" == "$ZERO_OID" ]] && continue
    : "$local_ref" "${extra:-}"
    echo "fast-gate: $remote_ref ${local_oid:0:12}" >&2

    base=""
    if [[ "$remote_oid" != "$ZERO_OID" ]] && git rev-parse --quiet --verify "${remote_oid}^{commit}" >/dev/null 2>&1; then
      range=("${remote_oid}..${local_oid}")
      base="$remote_oid"
    else
      range=("$local_oid" --not --remotes=origin)
      base="$(git merge-base "$local_oid" origin/main 2>/dev/null || true)"
    fi

    start="$(now)"
    count="$(git rev-list --count "${range[@]}" 2>/dev/null || echo 0)"
    if [[ "$count" -eq 0 ]]; then
      record SKIP "gitleaks" "$start" "no outgoing commits"
    elif ! require_tool gitleaks "brew install gitleaks"; then
      record FAIL "gitleaks" "$start" "not installed"
    elif gitleaks git --redact --no-banner --log-level warn --log-opts="${range[*]}" .; then
      record PASS "gitleaks" "$start" "$count commit(s)"
    else
      record FAIL "gitleaks" "$start" "$count commit(s)"
    fi

    local files_list="$TMP_DIR/push-files"
    if [[ -z "$base" ]]; then
      record SKIP "pattern scans" "$(now)" "no provable base (origin/main merge-base unknown)"
      git log --format= --name-only -z "${range[@]}" >"$files_list" 2>/dev/null || : >"$files_list"
    else
      git diff --name-only --diff-filter=ACMR -z "${base}...${local_oid}" >"$files_list"
      scan_added "risky-frontend" "$RISKY_PATTERN" path_matches_review_scope "$files_list" "${base}...${local_oid}"
      scan_added "control-plane" "$CONTROL_PATTERN" path_matches_control_scope "$files_list" "${base}...${local_oid}"
    fi
    osv_scan "$files_list" "${local_oid}:"
  done <"$push_refs"

  start="$(now)"
  if [[ "${MOBILE_AUDIT:-0}" == "1" ]]; then
    if node scripts/run-targeted-mobile-audit.mjs push <"$push_refs"; then
      record PASS "mobile audit" "$start"
    else
      record FAIL "mobile audit" "$start"
    fi
  else
    echo "fast-gate: mobile audit skipped (set MOBILE_AUDIT=1 to run; 'just verify' runs it fully)"
  fi
  agent_review
}

if ! command -v rg >/dev/null 2>&1; then
  echo "fast-gate: ripgrep is required; install with: brew install ripgrep" >&2
  exit 1
fi

"run_$MODE"

for line in "${SUMMARY[@]}"; do
  echo "fast-gate: $line"
done
if [[ "$FAILED" -ne 0 ]]; then
  echo "fast-gate: FAILED. Thorough review: npm run security:review" >&2
  exit 1
fi
