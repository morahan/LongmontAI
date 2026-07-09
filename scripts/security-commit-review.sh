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

if [[ "${SECURITY_COMMIT_SKIP:-0}" == "1" ]]; then
  echo "security-commit-review: skipped because SECURITY_COMMIT_SKIP=1"
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
gate_index=0
gate_total=4
gate_results=""
failed_gates=""

scope_label() {
  case "$MODE" in
    staged) echo "commit: staged diff" ;;
    push) echo "push: full tracked source before remote update" ;;
    all) echo "manual: full tracked source" ;;
  esac
}

scan_target_label() {
  case "$MODE" in
    staged) echo "staged files only" ;;
    push|all) echo "tracked repository files" ;;
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
  echo "  git action -> secrets -> dependency advisories -> frontend sinks -> optional agent"
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

run_gate() {
  local label="$1"
  local details="$2"
  shift 2

  gate_index=$((gate_index + 1))
  echo
  printf '%b[%s/%s] %s%b\n' "$bold" "$gate_index" "$gate_total" "$label" "$reset"
  printf '  %bWhat:%b %s\n' "$dim" "$reset" "$details"
  draw_progress "$((gate_index - 1))" "$gate_total"

  if "$@"; then
    printf '  %bPASS%b %s\n' "$green" "$reset" "$label"
    record_gate "$label" "PASS"
  else
    printf '  %bFAIL%b %s\n' "$red" "$reset" "$label" >&2
    record_gate "$label" "FAIL"
    mark_failure
  fi

  draw_progress "$gate_index" "$gate_total"
}

secret_scan() {
  if ! command -v gitleaks >/dev/null 2>&1; then
    echo "  gitleaks is required for secret scanning." >&2
    echo "  Install it or set SECURITY_COMMIT_SKIP=1 for an intentional emergency bypass." >&2
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
  local file
  while IFS= read -r -d '' file; do
    [[ -f "$file" ]] || continue
    files_scanned=$((files_scanned + 1))
    if ! gitleaks dir --redact --no-banner --log-level warn "$file"; then
      found=1
    fi
  done < <(git ls-files -z)

  echo "  Files scanned: $files_scanned"
  if [[ "$found" -eq 0 ]]; then
    echo "  Finding summary: no tracked-file secrets detected."
  fi

  return "$found"
}

dependency_audit() {
  if [[ "${SECURITY_COMMIT_SKIP_DEP_AUDIT:-0}" == "1" ]]; then
    echo "  Dependency audit skipped because SECURITY_COMMIT_SKIP_DEP_AUDIT=1."
    return 0
  fi

  echo "  Scanner: npm audit"
  echo "  Blocking level: ${SECURITY_COMMIT_AUDIT_LEVEL:-high}"

  if [[ -f package-lock.json ]]; then
    local audit_json
    local audit_status
    audit_json="$(mktemp "${TMPDIR:-/tmp}/security-audit.XXXXXXXXXX")"

    if npm audit --audit-level="${SECURITY_COMMIT_AUDIT_LEVEL:-high}" --ignore-scripts --json >"$audit_json"; then
      audit_status=0
    else
      audit_status=$?
    fi

    node - "$audit_json" "${SECURITY_COMMIT_AUDIT_LEVEL:-high}" <<'NODE'
const fs = require('fs');
const [path, threshold] = process.argv.slice(2);
const report = JSON.parse(fs.readFileSync(path, 'utf8'));
const counts = report.metadata?.vulnerabilities || {};
const total = counts.total || 0;
const severities = ['critical', 'high', 'moderate', 'low', 'info'];
const blocking = new Set(
  threshold === 'critical' ? ['critical'] :
  threshold === 'high' ? ['critical', 'high'] :
  threshold === 'moderate' ? ['critical', 'high', 'moderate'] :
  threshold === 'low' ? ['critical', 'high', 'moderate', 'low'] :
  threshold === 'info' ? ['critical', 'high', 'moderate', 'low', 'info'] : []
);
console.log(`  Vulnerability summary: total=${total} critical=${counts.critical || 0} high=${counts.high || 0} moderate=${counts.moderate || 0} low=${counts.low || 0}`);
const vulns = Object.values(report.vulnerabilities || {})
  .filter(v => blocking.has(v.severity))
  .sort((a, b) => severities.indexOf(a.severity) - severities.indexOf(b.severity));
if (vulns.length) {
  console.log('  Blocking advisories:');
  for (const vuln of vulns.slice(0, 12)) {
    const via = Array.isArray(vuln.via)
      ? vuln.via.find(item => item && typeof item === 'object')
      : null;
    const title = via?.title || vuln.name;
    const range = vuln.range ? ` (${vuln.range})` : '';
    console.log(`    - ${vuln.severity.toUpperCase()} ${vuln.name}${range}: ${title}`);
  }
  if (vulns.length > 12) {
    console.log(`    - ...and ${vulns.length - 12} more blocking advisory entries.`);
  }
}
NODE
    rm -f "$audit_json"
    return "$audit_status"
  fi

  if command -v osv-scanner >/dev/null 2>&1; then
    echo "  package-lock.json not found; falling back to osv-scanner."
    osv-scanner scan source --recursive --verbosity error .
    return
  fi

  echo "  No supported dependency scanner found for this repository." >&2
  return 1
}

review_targets() {
  if [[ "$MODE" == "staged" ]]; then
    git diff --cached --name-only --diff-filter=ACMR
  else
    git ls-files
  fi | grep -E '^(src/|public/|index\.html$|vite\.config\.(js|ts)$|eslint\.config\.js$)' \
     | grep -E '(\.(js|jsx|ts|tsx|mjs|cjs|html)$|^index\.html$)' || true
}

risky_pattern_scan() {
  if ! command -v rg >/dev/null 2>&1; then
    echo "  ripgrep is required for frontend risk scanning." >&2
    return 1
  fi

  local pattern
  pattern=$'dangerouslySetInnerHTML|\\.innerHTML\\b|\\.outerHTML\\b|insertAdjacentHTML\\s*\\(|document\\.write(ln)?\\s*\\(|\\beval\\s*\\(|new Function\\s*\\(|set(Time|Inter)val\\s*\\(\\s*["\\\']|window\\.open\\s*\\(|localStorage\\.(setItem|getItem)\\([^)]*(token|secret|password|jwt|credential|auth)|sessionStorage\\.(setItem|getItem)\\([^)]*(token|secret|password|jwt|credential|auth)'

  local targets
  targets="$(review_targets)"
  if [[ -z "$targets" ]]; then
    echo "  Finding summary: no frontend source files in scope."
    return 0
  fi

  local target_count
  target_count="$(printf '%s\n' "$targets" | sed '/^$/d' | wc -l | tr -d ' ')"
  echo "  Files in scope: $target_count"
  echo "  Pattern family: raw HTML, string code execution, window.open, token-like browser storage"

  local found=0
  local finding_count=0
  local file
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    [[ -f "$file" ]] || continue

    local output
    if [[ "$MODE" == "staged" ]]; then
      output="$(git diff --cached --unified=0 -- "$file" | rg -n -i "^\\+[^+].*(${pattern})" || true)"
    else
      output="$(rg -n -i "$pattern" "$file" || true)"
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
  done <<< "$targets"

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
  codex exec review --uncommitted 'Use $security-commit-review to review local changes for security vulnerabilities only. Prioritize exploitable findings with exact file references and minimal fixes.'
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
  if [[ "${SECURITY_COMMIT_AUTO_FIX:-1}" != "1" ]]; then
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

  codex exec \
    --model "$model" \
    --cd "$ROOT" \
    --sandbox danger-full-access \
    "Use \$security-commit-review to fix the security vulnerabilities discovered by the local ${MODE} security gate. Failed gates: ${failed_summary:-unknown}. Work only on security remediation. Preserve existing behavior, do not commit, do not push, do not bypass hooks, do not print or commit secrets. After editing, run the narrow security checks needed to verify the fix and summarize exactly what changed."
}

banner
run_gate "Secrets scan" "Look for staged or tracked secrets before they enter Git history." secret_scan
run_gate "Dependency vulnerability audit" "Check npm/OSV advisories and block configured severity levels." dependency_audit
run_gate "Frontend risky pattern scan" "Illustrate risky React/browser sinks that need human security review." risky_pattern_scan
run_gate "Optional Codex agent security review" "Run an agent vulnerability review only when SECURITY_COMMIT_AGENT_REVIEW=1." agent_review_hint
summary

if [[ "$failures" -ne 0 ]]; then
  echo
  printf '%bSecurity review blocked this %s with %s failing gate(s).%b\n' "$red" "$MODE" "$failures" "$reset" >&2
  run_remediation_agent || true
  echo
  echo "Review any remediation edits, stage them if appropriate, then rerun this gate." >&2
  echo "You can choose a model with SECURITY_COMMIT_FIX_MODEL=<model>." >&2
  exit 1
fi

echo
printf '%bSecurity review passed for %s.%b\n' "$green" "$(scope_label)" "$reset"
