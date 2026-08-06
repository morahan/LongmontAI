set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

verify:
    @bash scripts/local-ci.sh

# Run available web, Android, and iOS flow lanes concurrently. Native lanes are
# reported as skipped when this web-only checkout has no corresponding project.
test-flows:
    @bash scripts/run-flow-lanes.sh all

test-flows-web:
    @bash scripts/run-flow-lanes.sh web

test-flows-android:
    @bash scripts/run-flow-lanes.sh android

test-flows-ios:
    @bash scripts/run-flow-lanes.sh ios

# Publish committed work, then recheck after the requested clean-tree interval.
loop-push minutes="2":
    @bash scripts/loop-push.sh {{quote(minutes)}}

# Publish the current branch, run the local verification contract, and prune stale worktree metadata.
loop-push-merge minutes="2":
    @bash scripts/loop-push.sh {{quote(minutes)}} --local-verify --merge-prune

loop-merge-push minutes="2": (loop-push-merge minutes)
