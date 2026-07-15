set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# Publish committed work, then recheck after the requested clean-tree interval.
loop-push minutes="2":
    @bash scripts/loop-push.sh {{quote(minutes)}}

# Publish the current branch, enable PR auto-merge, and prune stale worktree metadata.
loop-push-merge minutes="2":
    @bash scripts/loop-push.sh {{quote(minutes)}} --merge-prune

loop-merge-push minutes="2": (loop-push-merge minutes)
