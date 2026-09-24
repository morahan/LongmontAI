#!/usr/bin/env bash
set -euo pipefail
# JSON evidence is emitted on stdout; never relay raw tool output.
exec node "${BASH_SOURCE[0]%/*}/lib/local-required-gate/run.mjs" "$@"
