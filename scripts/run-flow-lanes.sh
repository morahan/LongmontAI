#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

platform="${1:-all}"
case "$platform" in
  all|web|android|ios) ;;
  *)
    echo "Usage: $0 {all|web|android|ios}" >&2
    exit 2
    ;;
esac

run_web() {
  echo "[web] RUNNING npm run test:mobile"
  npm run test:mobile
}

run_android() {
  if [[ ! -x android/gradlew ]]; then
    echo "[android] SKIPPED no Android project in this checkout"
    return 0
  fi

  echo "[android] RUNNING ./android/gradlew test"
  ./android/gradlew test
}

run_ios() {
  local workspace project
  workspace="$(find ios -maxdepth 1 -name '*.xcworkspace' -print -quit 2>/dev/null || true)"
  project="$(find ios -maxdepth 1 -name '*.xcodeproj' -print -quit 2>/dev/null || true)"

  if [[ -z "$workspace" && -z "$project" ]]; then
    echo "[ios] SKIPPED no iOS project in this checkout"
    return 0
  fi

  if [[ -n "$workspace" ]]; then
    echo "[ios] RUNNING xcodebuild test for $workspace"
    xcodebuild -workspace "$workspace" -scheme "${IOS_TEST_SCHEME:?Set IOS_TEST_SCHEME for iOS flow tests}" test
    return
  fi

  echo "[ios] RUNNING xcodebuild test for $project"
  xcodebuild -project "$project" -scheme "${IOS_TEST_SCHEME:?Set IOS_TEST_SCHEME for iOS flow tests}" test
}

run_lane() {
  local lane="$1"
  case "$lane" in
    web) run_web ;;
    android) run_android ;;
    ios) run_ios ;;
  esac
}

if [[ "$platform" != "all" ]]; then
  run_lane "$platform"
  exit 0
fi

declare -a pids=()
declare -a lanes=(web android ios)
for lane in "${lanes[@]}"; do
  (
    run_lane "$lane"
  ) &
  pids+=("$!")
done

failed=0
for index in "${!pids[@]}"; do
  if ! wait "${pids[$index]}"; then
    echo "[${lanes[$index]}] FAILED" >&2
    failed=1
  fi
done

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

echo "Flow lanes passed: web executed; Android/iOS executed when present, otherwise skipped."
