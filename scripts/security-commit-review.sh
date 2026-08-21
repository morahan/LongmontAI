#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-staged}"
case "$MODE" in
  staged|commit|all|push) ;;
  *)
    echo "Usage: scripts/security-commit-review.sh [staged|commit|all|push]" >&2
    exit 2
    ;;
esac

if [[ "$MODE" == "commit" ]]; then
  MODE="staged"
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [[ "${SECURITY_COMMIT_BREAK_GLASS:-0}" == "1" ]]; then
  if [[ -n "${CI:-}" ]]; then
    echo "security-commit-review: break-glass is forbidden in CI." >&2
    exit 1
  fi
  break_glass_ticket="${SECURITY_COMMIT_BREAK_GLASS_TICKET:-}"
  if ! [[ "$break_glass_ticket" =~ ^[A-Za-z0-9._:/#-]{6,160}$ ]]; then
    echo "security-commit-review: SECURITY_COMMIT_BREAK_GLASS_TICKET must contain a ticket or incident reference." >&2
    exit 1
  fi
  break_glass_log="$ROOT/.git/security-review/break-glass.log"
  mkdir -p "$(dirname "$break_glass_log")"
  chmod 700 "$(dirname "$break_glass_log")" 2>/dev/null || true
  printf '%s mode=%s commit=%s ticket=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$MODE" \
    "$(git rev-parse HEAD 2>/dev/null || echo no-head)" "$break_glass_ticket" >>"$break_glass_log"
  chmod 600 "$break_glass_log" 2>/dev/null || true
  echo "security-commit-review: local break-glass recorded for $break_glass_ticket." >&2
  exit 0
fi

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
  bold="$(tput bold || true)"
  dim="$(tput dim || true)"
  green="$(tput setaf 2 || true)"
  yellow="$(tput setaf 3 || true)"
  red="$(tput setaf 1 || true)"
  cyan="$(tput setaf 6 || true)"
  reset="$(tput sgr0 || true)"
else
  bold=""
  dim=""
  green=""
  yellow=""
  red=""
  cyan=""
  reset=""
fi

failures=0
gate_total=6
gate_results=""
failed_gates=""
gate_count=0
gate_temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/security-review.XXXXXXXXXX")"
chmod 700 "$gate_temp_dir"
evidence_dir="${SECURITY_REVIEW_EVIDENCE_DIR:-$ROOT/.git/security-review}"
evidence_file=""

cleanup() {
  rm -rf "$gate_temp_dir"
}
trap cleanup EXIT

scan_tips=()
scan_labels=()
history_ranges=()
push_update_count=0

is_zero_oid() {
  [[ "$1" =~ ^0+$ ]]
}

valid_oid() {
  local oid="$1"
  local object_format oid_length
  object_format="$(git rev-parse --show-object-format 2>/dev/null)" || return 1
  case "$object_format" in
    sha1) oid_length=40 ;;
    sha256) oid_length=64 ;;
    *) return 1 ;;
  esac
  [[ ${#oid} -eq "$oid_length" && "$oid" =~ ^[0-9a-fA-F]+$ ]]
}

append_unique_tip() {
  local tip="$1"
  local existing
  for existing in "${scan_tips[@]:-}"; do
    [[ "$existing" == "$tip" ]] && return 0
  done
  scan_tips+=("$tip")
}

prepare_scan_scope() {
  if [[ "$MODE" == "staged" ]]; then
    return 0
  fi

  if [[ "$MODE" == "all" ]]; then
    local head
    if ! head="$(git rev-parse --verify 'HEAD^{commit}' 2>/dev/null)"; then
      echo "security-commit-review: cannot prove the tracked HEAD snapshot." >&2
      return 1
    fi
    append_unique_tip "$head"
  else
    local line local_ref local_oid remote_ref remote_oid extra local_commit remote_commit
    while IFS= read -r line; do
      [[ -n "$line" ]] || {
        echo "security-commit-review: malformed blank pre-push ref update." >&2
        return 1
      }
      local_ref=""; local_oid=""; remote_ref=""; remote_oid=""; extra=""
      read -r local_ref local_oid remote_ref remote_oid extra <<<"$line"
      if [[ -n "$extra" || -z "$local_ref" || -z "$local_oid" || -z "$remote_ref" || -z "$remote_oid" ]] \
        || ! valid_oid "$local_oid" || ! valid_oid "$remote_oid" \
        || [[ "$remote_ref" != refs/* ]]; then
        echo "security-commit-review: malformed or unprovable pre-push ref update." >&2
        return 1
      fi
      push_update_count=$((push_update_count + 1))

      if is_zero_oid "$local_oid"; then
        if is_zero_oid "$remote_oid" || [[ "$local_ref" != "(delete)" ]]; then
          echo "security-commit-review: malformed deletion ref update." >&2
          return 1
        fi
        continue
      fi
      if [[ "$local_ref" != refs/* && "$local_ref" != "HEAD" ]]; then
        echo "security-commit-review: unrecognized local ref in pre-push update." >&2
        return 1
      fi
      if ! local_commit="$(git rev-parse --verify "${local_oid}^{commit}" 2>/dev/null)"; then
        echo "security-commit-review: pushed object is not a locally provable commit." >&2
        return 1
      fi
      append_unique_tip "$local_commit"

      if is_zero_oid "$remote_oid"; then
        history_ranges+=("$local_commit")
      else
        if ! remote_commit="$(git rev-parse --verify "${remote_oid}^{commit}" 2>/dev/null)"; then
          echo "security-commit-review: remote baseline is unavailable locally; outgoing history is unprovable." >&2
          return 1
        fi
        history_ranges+=("${remote_commit}..${local_commit}")
      fi
    done
    if [[ "$push_update_count" -eq 0 ]]; then
      echo "security-commit-review: pre-push ref-update input is required." >&2
      return 1
    fi
  fi

  local tip index snapshot
  index=0
  for tip in "${scan_tips[@]:-}"; do
    [[ -n "$tip" ]] || continue
    index=$((index + 1))
    snapshot="$gate_temp_dir/tracked-snapshot-$index"
    mkdir -m 700 "$snapshot"
    if ! git archive --format=tar "$tip" | tar -xf - -C "$snapshot"; then
      echo "security-commit-review: failed to create exact snapshot for $tip." >&2
      return 1
    fi
    scan_labels+=("$tip:$snapshot")
  done
}

scope_label() {
  case "$MODE" in
    staged) echo "commit: staged diff" ;;
    push) echo "push: every ref tip and outgoing history before remote update" ;;
    all) echo "manual: full tracked source" ;;
  esac
}

scan_target_label() {
  case "$MODE" in
    staged) echo "staged files only" ;;
    push) echo "every pushed tracked snapshot and exact outgoing Git ranges" ;;
    all) echo "tracked repository files" ;;
  esac
}

commit_short() {
  git rev-parse --short HEAD 2>/dev/null || echo "no-head"
}

staged_count() {
  git diff --cached --name-only --diff-filter=ACMR | wc -l | tr -d ' '
}

tracked_count() {
  git ls-files | wc -l | tr -d ' '
}

draw_progress() {
  local done_count="$1"
  local total_count="$2"
  local width=24
  local filled=$((done_count * width / total_count))
  local empty=$((width - filled))
  local bar=""
  local i

  for ((i = 0; i < filled; i++)); do
    bar="${bar}#"
  done
  for ((i = 0; i < empty; i++)); do
    bar="${bar}-"
  done

  printf '%bProgress%b [%s] %s/%s gates\n' "$dim" "$reset" "$bar" "$done_count" "$total_count"
}

banner() {
  echo
  printf '%b============================================================%b\n' "$cyan" "$reset"
  printf '%b Security vulnerability review%b\n' "$bold" "$reset"
  printf ' Scope: %s\n' "$(scope_label)"
  printf ' Commit: %s\n' "$(commit_short)"
  printf ' Files: %s staged, %s tracked\n' "$(staged_count)" "$(tracked_count)"
  printf '%b------------------------------------------------------------%b\n' "$cyan" "$reset"
  echo "Flow:"
  echo "  git action -> parallel review gates -> sequential remediation only on failure"
  echo "  Parallel gates: secrets, dependencies, frontend sinks, agent controls, optional review"
  printf '%b============================================================%b\n' "$cyan" "$reset"
}

record_gate() {
  local label="$1"
  local status="$2"
  gate_results="${gate_results}${status}|${label}
"
  if [[ "$status" == "FAIL" ]]; then
    failed_gates="${failed_gates}${label}
"
  fi
}

mark_failure() {
  failures=$((failures + 1))
}

run_gate_worker() {
  local index="$1"
  local label="$2"
  local details="$3"
  shift 3

  echo
  printf '%b[%s/%s] %s%b\n' "$bold" "$index" "$gate_total" "$label" "$reset"
  printf '  %bWhat:%b %s\n' "$dim" "$reset" "$details"
  echo "  Execution: parallel review lane"

  if "$@"; then
    printf '  %bPASS%b %s\n' "$green" "$reset" "$label"
    return 0
  else
    printf '  %bFAIL%b %s\n' "$red" "$reset" "$label" >&2
    return 1
  fi
}

launch_gate() {
  local label="$1"
  local details="$2"
  shift 2

  gate_count=$((gate_count + 1))

  local log_file="$gate_temp_dir/gate-$gate_count.log"
  gate_labels[$gate_count]="$label"
  gate_logs[$gate_count]="$log_file"

  printf '  Launching [%s/%s] %s\n' "$gate_count" "$gate_total" "$label"
  run_gate_worker "$gate_count" "$label" "$details" "$@" >"$log_file" 2>&1 &
  gate_pids[$gate_count]=$!
}

run_parallel_gates() {
  echo
  printf '%bParallel review chain%b\n' "$bold" "$reset"
  printf '%b------------------------------------------------------------%b\n' "$cyan" "$reset"

  launch_gate "Secrets scan" "Look for staged or tracked secrets before they enter Git history." secret_scan
  launch_gate "Dependency vulnerability audit" "Check npm/OSV advisories and block configured severity levels." dependency_audit
  launch_gate "Frontend risky pattern scan" "Illustrate risky React/browser sinks that need human security review." risky_pattern_scan
  launch_gate "Agent control-plane policy scan" "Inspect agent, workflow, hook, script, API, and deployment configuration." control_plane_scan
  launch_gate "Security policy contract" "Verify the agent containment and production header contracts cannot drift." security_policy_contract
  launch_gate "Optional Codex agent security review" "Run an agent vulnerability review only when SECURITY_COMMIT_AGENT_REVIEW=1." agent_review_hint

  echo
  echo "Waiting for review lanes to finish..."
  draw_progress 0 "$gate_total"

  local index
  for ((index = 1; index <= gate_count; index++)); do
    local status
    if wait "${gate_pids[$index]}"; then
      status="PASS"
    else
      status="FAIL"
    fi

    cat "${gate_logs[$index]}"
    record_gate "${gate_labels[$index]}" "$status"
    if [[ "$status" == "FAIL" ]]; then
      mark_failure
    fi
    draw_progress "$index" "$gate_total"
  done
}

secret_scan() {
  if ! command -v gitleaks >/dev/null 2>&1; then
    echo "  gitleaks is required for secret scanning." >&2
    echo "  Install it before retrying this fail-closed gate." >&2
    return 1
  fi

  echo "  Scanner: gitleaks"
  echo "  Target: $(scan_target_label)"

  if [[ "$MODE" == "staged" ]]; then
    if git diff --cached --quiet --exit-code; then
      echo "  Finding summary: no staged files, so no staged secrets to scan."
      return 0
    fi
    gitleaks git --staged --redact --no-banner --log-level warn .
    echo "  Finding summary: no staged secrets detected."
    return
  fi

  local found=0
  local files_scanned=0
  local entry tip snapshot count range commits
  for entry in "${scan_labels[@]:-}"; do
    [[ -n "$entry" ]] || continue
    tip="${entry%%:*}"
    snapshot="${entry#*:}"
    if ! count="$(git ls-tree -r --name-only "$tip" | wc -l | tr -d ' ')"; then
      echo "  Failed to count files in pushed snapshot $tip." >&2
      return 1
    fi
    files_scanned=$((files_scanned + count))
    echo "  Snapshot: $tip"
    if ! gitleaks dir --redact --no-banner --log-level warn "$snapshot"; then
      found=1
    fi
  done

  if [[ "$MODE" == "push" ]]; then
    for range in "${history_ranges[@]:-}"; do
      [[ -n "$range" ]] || continue
      echo "  History range: $range"
      if ! commits="$(git rev-list "$range" 2>/dev/null)"; then
        echo "  Failed to prove outgoing commits for $range." >&2
        found=1
      elif [[ -n "$commits" ]]; then
        if ! gitleaks git --redact --no-banner --log-level warn --log-opts="$range" .; then
          found=1
        fi
      else
        echo "  Finding summary: no outgoing commits in $range."
      fi
    done
  fi

  echo "  Files scanned: $files_scanned"
  if [[ "$found" -eq 0 ]]; then
    echo "  Finding summary: no tracked-file or outgoing-history secrets detected."
  fi
  return "$found"
}

staged_scope_matches() {
  local pattern="$1"
  local scope_file
  scope_file="$(mktemp "$gate_temp_dir/staged-scope.XXXXXXXX")" || return 2
  local file found=1
  if ! git diff --cached --name-only --diff-filter=ACMRD -z >"$scope_file"; then
    echo "  Failed to determine the staged review scope." >&2
    return 2
  fi
  while IFS= read -r -d '' file; do
    if [[ "$file" =~ $pattern ]]; then
      found=0
    fi
  done <"$scope_file"
  return "$found"
}

dependency_audit() {
  if [[ "$MODE" == "staged" ]]; then
    local dependency_pattern
    dependency_pattern='(^|/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|pnpm-workspace\.yaml|bun\.lockb?|deno\.jsonc?|deno\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Pipfile(\.lock)?|uv\.lock|Cargo\.(toml|lock)|go\.(mod|sum)|Gemfile(\.lock)?|composer\.(json|lock)|pom\.xml|build\.gradle(\.kts)?|gradle\.lockfile)$'
    if staged_scope_matches "$dependency_pattern"; then
      :
    else
      local scope_status=$?
      if [[ "$scope_status" -eq 1 ]]; then
        echo "  Finding summary: no dependency manifests or lockfiles changed; audit not needed for this staged diff."
        return 0
      fi
      return "$scope_status"
    fi
  fi

  command -v osv-scanner >/dev/null 2>&1 || {
    echo "  osv-scanner is required for offline dependency scanning." >&2
    return 1
  }

  echo "  Scanner: osv-scanner"
  echo "  Database: local offline cache"
  if [[ "$MODE" == "staged" ]]; then
    osv-scanner scan source --offline-vulnerabilities --recursive --verbosity error .
    return
  fi
  local entry tip snapshot
  for entry in "${scan_labels[@]:-}"; do
    [[ -n "$entry" ]] || continue
    tip="${entry%%:*}"
    snapshot="${entry#*:}"
    echo "  Snapshot: $tip"
    (cd "$snapshot" && osv-scanner scan source --offline-vulnerabilities --recursive --verbosity error .) || return
  done
}

path_matches_review_scope() {
  [[ "$1" =~ ^(src/|public/|index\.html$|vite\.config\.(js|ts)$|eslint\.config\.js$) ]] \
    && [[ "$1" =~ (\.(js|jsx|ts|tsx|mjs|cjs|html)$|^index\.html$) ]]
}

path_matches_control_scope() {
  [[ "$1" =~ ^(\.github/|\.codex/|\.agents/|\.githooks/|api/|scripts/|vercel\.json$|package\.json$|justfile$) ]] \
    && [[ "$1" =~ (\.(yaml|yml|json|toml|sh|js|jsx|ts|tsx|mjs|cjs|md)$|^vercel\.json$) ]]
}

write_scope_targets() {
  local kind="$1"
  local output="$2"
  local source_file="$gate_temp_dir/targets-source-$$-$kind"
  local entry snapshot file relative
  : >"$output"
  if [[ "$MODE" == "staged" ]]; then
    git diff --cached --name-only --diff-filter=ACMR -z >"$source_file" || return 1
    while IFS= read -r -d '' file; do
      if [[ "$kind" == "review" ]] && path_matches_review_scope "$file"; then
        printf '%s\0%s\0' "$ROOT" "$file" >>"$output"
      elif [[ "$kind" == "control" ]] && path_matches_control_scope "$file"; then
        printf '%s\0%s\0' "$ROOT" "$file" >>"$output"
      fi
    done <"$source_file"
    return
  fi
  for entry in "${scan_labels[@]:-}"; do
    [[ -n "$entry" ]] || continue
    snapshot="${entry#*:}"
    (cd "$snapshot" && find . -type f -print0) >"$source_file" || return 1
    while IFS= read -r -d '' file; do
      relative="${file#./}"
      if [[ "$kind" == "review" ]] && path_matches_review_scope "$relative"; then
        printf '%s\0%s\0' "$snapshot" "$relative" >>"$output"
      elif [[ "$kind" == "control" ]] && path_matches_control_scope "$relative"; then
        printf '%s\0%s\0' "$snapshot" "$relative" >>"$output"
      fi
    done <"$source_file"
  done
}

control_plane_scan() {
  if ! command -v rg >/dev/null 2>&1; then
    echo "  ripgrep is required for agent control-plane scanning." >&2
    return 1
  fi

  local targets_file="$gate_temp_dir/control-targets-$$"
  if ! write_scope_targets control "$targets_file"; then
    echo "  Failed to enumerate control-plane scope." >&2
    return 1
  fi
  local target_count=0 count_root count_file
  while IFS= read -r -d '' count_root && IFS= read -r -d '' count_file; do
    : "$count_root" "$count_file"
    target_count=$((target_count + 1))
  done <"$targets_file"
  if [[ "$target_count" -eq 0 ]]; then
    echo "  Finding summary: no agent control-plane files in scope."
    return 0
  fi
  echo "  Files in scope: $target_count"
  echo "  Policy family: privileged agents, broad local writes, credential persistence"

  local pattern
  pattern=$'sandbox(_mode)?[[:space:]]*=[[:space:]]*["\x27]danger-full-access|--sandbox[[:space:]]+danger-full-access|permissions:[[:space:]]*write-all|persist-credentials:[[:space:]]*true'
  local found=0
  local finding_count=0
  local scan_pattern="$pattern"
  [[ "$MODE" == "staged" ]] && scan_pattern="^\\+[^+].*(${pattern})"
  local root file output rg_status scan_input="$gate_temp_dir/control-input-$$"
  while IFS= read -r -d '' root && IFS= read -r -d '' file; do
    [[ -f "$root/$file" ]] || { echo "  Missing control-plane snapshot file: $file" >&2; return 1; }
    # This scanner must describe forbidden values without reporting its own pattern table.
    [[ "$file" == "scripts/security-commit-review.sh" ]] && continue
    if [[ "$MODE" == "staged" ]]; then
      if ! git diff --cached --unified=0 -- "$file" >"$scan_input"; then
        echo "  Failed to read staged control-plane content: $file" >&2
        return 1
      fi
    else
      scan_input="$root/$file"
    fi
    if output="$(rg -n -i "$scan_pattern" "$scan_input")"; then
      :
    else
      rg_status=$?
      if [[ "$rg_status" -eq 1 ]]; then
        output=""
      else
        echo "  ripgrep failed while scanning $file." >&2
        return 1
      fi
    fi
    if [[ -n "$output" ]]; then
      found=1
      finding_count=$((finding_count + $(printf '%s\n' "$output" | sed '/^$/d' | wc -l | tr -d ' ')))
      echo "  Policy violation in $file"
      printf '%s\n' "$output" | sed -E 's/([A-Za-z0-9_+\/=.-]{12})[A-Za-z0-9_+\/=.-]+/[REDACTED]/g' | sed 's/^/    /'
    fi
  done <"$targets_file"

  if [[ "$found" -eq 1 ]]; then
    echo "  Finding summary: $finding_count privileged control-plane setting(s) must be removed or narrowly justified."
    return 1
  fi
  echo "  Finding summary: no prohibited agent or workflow privilege settings found."
}

security_policy_contract() {
  if [[ "$MODE" == "staged" ]]; then
    local policy_pattern
    policy_pattern='^(scripts/security-commit-review\.sh|scripts/tests/security-review-chain\.test\.mjs|scripts/tests/runtime-security-headers\.mjs|package\.json|vercel\.json|\.githooks/[^/]+|\.github/workflows/security\.ya?ml|\.codex/agents/security-(triage|fixer)\.toml|\.(codex|agents)/skills/security-commit-review/)'
    if staged_scope_matches "$policy_pattern"; then
      :
    else
      local scope_status=$?
      if [[ "$scope_status" -eq 1 ]]; then
        echo "  Finding summary: no security-contract or runtime-header governing files changed; contract tests not needed for this staged diff."
        return 0
      fi
      return "$scope_status"
    fi
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "  Node.js is required for security policy contract tests." >&2
    return 1
  fi

  if [[ "$MODE" == "staged" ]]; then
    node scripts/tests/security-review-chain.test.mjs
    node scripts/tests/runtime-security-headers.mjs
    return
  fi
  local entry tip snapshot
  for entry in "${scan_labels[@]:-}"; do
    [[ -n "$entry" ]] || continue
    tip="${entry%%:*}"
    snapshot="${entry#*:}"
    echo "  Snapshot: $tip"
    (cd "$snapshot" && node scripts/tests/security-review-chain.test.mjs) || return
    (cd "$snapshot" && node scripts/tests/runtime-security-headers.mjs) || return
  done
}

risky_pattern_scan() {
  if ! command -v rg >/dev/null 2>&1; then
    echo "  ripgrep is required for frontend risk scanning." >&2
    return 1
  fi

  local pattern
  pattern=$'dangerouslySetInnerHTML|\\.innerHTML\\b|\\.outerHTML\\b|insertAdjacentHTML\\s*\\(|document\\.write(ln)?\\s*\\(|\\beval\\s*\\(|new Function\\s*\\(|set(Time|Inter)val\\s*\\(\\s*["\\\']|window\\.open\\s*\\(|localStorage\\.(setItem|getItem)\\([^)]*(token|secret|password|jwt|credential|auth)|sessionStorage\\.(setItem|getItem)\\([^)]*(token|secret|password|jwt|credential|auth)'

  local targets_file="$gate_temp_dir/review-targets-$$"
  if ! write_scope_targets review "$targets_file"; then
    echo "  Failed to enumerate frontend scope." >&2
    return 1
  fi
  local target_count=0 count_root count_file
  while IFS= read -r -d '' count_root && IFS= read -r -d '' count_file; do
    : "$count_root" "$count_file"
    target_count=$((target_count + 1))
  done <"$targets_file"
  if [[ "$target_count" -eq 0 ]]; then
    echo "  Finding summary: no frontend source files in scope."
    return 0
  fi
  echo "  Files in scope: $target_count"
  echo "  Pattern family: raw HTML, string code execution, window.open, token-like browser storage"

  local found=0
  local finding_count=0
  local scan_pattern="$pattern"
  [[ "$MODE" == "staged" ]] && scan_pattern="^\\+[^+].*(${pattern})"
  local root file output rg_status scan_input="$gate_temp_dir/review-input-$$"
  while IFS= read -r -d '' root && IFS= read -r -d '' file; do
    [[ -f "$root/$file" ]] || { echo "  Missing frontend snapshot file: $file" >&2; return 1; }
    if [[ "$MODE" == "staged" ]]; then
      if ! git diff --cached --unified=0 -- "$file" >"$scan_input"; then
        echo "  Failed to read staged frontend content: $file" >&2
        return 1
      fi
    else
      scan_input="$root/$file"
    fi
    if output="$(rg -n -i "$scan_pattern" "$scan_input")"; then
      :
    else
      rg_status=$?
      if [[ "$rg_status" -eq 1 ]]; then
        output=""
      else
        echo "  ripgrep failed while scanning $file." >&2
        return 1
      fi
    fi

    if [[ -n "$output" ]]; then
      if [[ "$found" -eq 0 ]]; then
        echo "  Potentially dangerous frontend security patterns were found:"
      fi
      found=1
      finding_count=$((finding_count + $(printf '%s\n' "$output" | sed '/^$/d' | wc -l | tr -d ' ')))
      echo
      echo "  $file"
      printf '%s\n' "$output" | sed 's/^/    /'
    fi
  done <"$targets_file"

  if [[ "$found" -eq 1 ]]; then
    echo "  Finding summary: $finding_count risky pattern line(s) need review."
    return 1
  fi

  echo "  Finding summary: no high-risk frontend sink patterns found."
}

agent_review_hint() {
  if [[ "${SECURITY_COMMIT_AGENT_REVIEW:-0}" != "1" ]]; then
    echo "  Agent review: skipped by default for speed."
    if [[ "$MODE" == "push" ]]; then
      echo "  To include it in this hook: SECURITY_COMMIT_AGENT_REVIEW=1 git push ..."
    else
      echo "  To include it in this hook: SECURITY_COMMIT_AGENT_REVIEW=1 git commit ..."
    fi
    return 0
  fi

  if ! command -v codex >/dev/null 2>&1; then
    echo "  codex is not available for SECURITY_COMMIT_AGENT_REVIEW=1." >&2
    return 1
  fi

  echo "  Agent review: running Codex security review over local changes."
  codex exec --ephemeral -c 'approval_policy="never"' --sandbox read-only 'Use $security-commit-review to review local changes for security vulnerabilities only. Do not edit files or run commands that mutate the repository. Prioritize exploitable findings with exact file references and minimal fixes.'
}

write_evidence_packet() {
  mkdir -p "$evidence_dir"
  chmod 700 "$evidence_dir" 2>/dev/null || true
  evidence_file="$evidence_dir/evidence-$(date -u +%Y%m%dT%H%M%SZ)-$$.txt"
  {
    echo "security-review-evidence-v1"
    echo "mode=$MODE"
    echo "commit=$(git rev-parse HEAD 2>/dev/null || echo no-head)"
    echo "created_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "failed_gates_begin"
    printf '%s' "$failed_gates" | sed '/^$/d'
    echo "failed_gates_end"
    echo "files_in_scope_begin"
    if [[ "$MODE" == "staged" ]]; then
      git diff --cached --name-only --diff-filter=ACMR
    else
      git ls-files
    fi
    echo "files_in_scope_end"
  } >"$evidence_file"
  chmod 600 "$evidence_file" 2>/dev/null || true
  echo "  Redacted evidence packet: $evidence_file"
}

summary() {
  echo
  printf '%bSecurity gate summary%b\n' "$bold" "$reset"
  printf '%b------------------------------------------------------------%b\n' "$cyan" "$reset"
  printf '%s' "$gate_results" | while IFS='|' read -r status label; do
    [[ -n "$status" ]] || continue
    if [[ "$status" == "PASS" ]]; then
      printf '  [%bPASS%b] %s\n' "$green" "$reset" "$label"
    else
      printf '  [%bFAIL%b] %s\n' "$red" "$reset" "$label"
    fi
  done
  printf '%b------------------------------------------------------------%b\n' "$cyan" "$reset"
}

run_remediation_agent() {
  if [[ "${SECURITY_COMMIT_AUTO_FIX:-0}" != "1" ]]; then
    echo
    printf '%bAuto-remediation skipped%b because SECURITY_COMMIT_AUTO_FIX is not 1.\n' "$yellow" "$reset"
    return 0
  fi

  if ! command -v codex >/dev/null 2>&1; then
    echo
    printf '%bAuto-remediation unavailable%b because the codex CLI is not on PATH.\n' "$yellow" "$reset"
    return 1
  fi

  local model="${SECURITY_COMMIT_FIX_MODEL:-${CODEX_MODEL:-gpt-5.5}}"
  local attempts="${SECURITY_COMMIT_FIX_ATTEMPTS:-1}"
  if ! [[ "$attempts" =~ ^[12]$ ]]; then
    echo "  SECURITY_COMMIT_FIX_ATTEMPTS must be 1 or 2." >&2
    return 1
  fi
  local failed_summary
  failed_summary="$(printf '%s' "$failed_gates" | sed '/^$/d' | paste -sd ', ' -)"

  echo
  printf '%bAuto-remediation%b\n' "$bold" "$reset"
  printf '%b------------------------------------------------------------%b\n' "$cyan" "$reset"
  echo "  Model: $model"
  echo "  Failed gates: ${failed_summary:-unknown}"
  echo "  Action: asking Codex to fix discovered security vulnerabilities."
  echo "  Safety: this hook will still fail after remediation; review, stage, and rerun."
  printf '%b------------------------------------------------------------%b\n' "$cyan" "$reset"

  local attempt
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    echo "  Remediation attempt: $attempt/$attempts"
    codex exec \
      --ephemeral \
      --model "$model" \
      --cd "$ROOT" \
      --sandbox workspace-write \
      -c 'sandbox_workspace_write.network_access=false' \
      "Use \$security-commit-review to remediate only the vulnerabilities named in the redacted evidence packet at ${evidence_file}. Do not edit directly. First spawn the project security-triage subagent to validate findings read-only and return bounded remediation packets. For each independent validated packet, spawn a project security-fixer subagent; serialize overlapping file edits. Re-run failing deterministic gates only as needed and never expose secret values. Every subagent must remain inside this workspace and inherit these restrictions. Do not commit, push, deploy, change Git configuration, bypass hooks, access credentials, or weaken a scanner. Preserve behavior, make the smallest safe edits, then review the combined diff, run narrow verification, and summarize files changed and checks run."
  done
}

prepare_scan_scope
banner
run_parallel_gates
summary

if [[ "$failures" -ne 0 ]]; then
  echo
  printf '%bSecurity review blocked this %s with %s failing gate(s).%b\n' "$red" "$MODE" "$failures" "$reset" >&2
  write_evidence_packet
  run_remediation_agent || true
  echo
  echo "Review any remediation edits, stage them if appropriate, then rerun this gate." >&2
  echo "Run 'npm run security:remediate' to explicitly allow a workspace-only fixer." >&2
  echo "You can choose a model with SECURITY_COMMIT_FIX_MODEL=<model>." >&2
  exit 1
fi

echo
printf '%bSecurity review passed for %s.%b\n' "$green" "$(scope_label)" "$reset"
