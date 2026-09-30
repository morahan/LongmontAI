# One-shot local required gate

The base gate produces **local evidence, not a GitHub required check**. The optional
GitHub App reporter below can post `LongmontAI Local Required Gate` only when
explicitly invoked. Neither command changes protection/settings, installs hooks or
services, or uploads SARIF/artifacts. Existing CI and hook requirements remain in
force. Implementation and mocked tests do not prove a real check was posted or
that branch protection requires this check.

## Run

Use a trusted, exclusively held checkout on an attached branch, with no staged,
unstaged, or untracked files. Ignored build products are not included. Submodules
are rejected because their contents are outside the named tree. Commit the tooling before
using it to validate that commit. Never change HEAD or the checkout during a run.

Requirements on PATH: Node 22.12+ (or 24), Bash, Git, tar, a working Docker daemon,
gitleaks, osv-scanner with its provisioned offline vulnerability cache, ripgrep,
zizmor, and the CodeQL CLI **bundle including JavaScript query packs**. Missing
scanners, missing query packs, cache errors, and unavailable Docker fail closed.
The gate does not install host tools or repair a failing scanner.

```sh
sha="$(git rev-parse --verify HEAD)"
# Keep output outside the worktree, otherwise the output file itself is untracked.
umask 077
npm run --silent gate:local-required -- --sha "$sha" > /tmp/local-required-evidence.json
# Inspect the exit status as well as the JSON status; nonzero means blocked.
```

Only `--sha <full-lowercase-commit-id>` is accepted; no abbreviations, revision
expressions, skip switches, or remote options. A SHA must equal HEAD, and the tree
must be clean and attached both before work and at the end. Every command error,
timeout, malformed CodeQL report, or CodeQL result blocks success. Subsequent gates
are not run after failure. This checks a commit tip, not outgoing Git history;
the existing pre-push review still checks the actual outgoing ranges.

## What runs

1. Exact-SHA/clean-tree/attached-branch checks and required-tool probes.
2. A private temporary snapshot materialized from the supplied commit's Git tree
   blobs. Export attributes do not omit or substitute source bytes. Symlinks,
   unsupported tree entries, and materialization errors block scanners. The
   all/push security review independently verifies paths, modes, and blob bytes
   against the named tree before starting scanners.
3. The existing `scripts/security-commit-review.sh all`, against the
   checkout's HEAD: gitleaks redacted tracked-snapshot semantics, OSV
   `scan source --offline-vulnerabilities --recursive --verbosity error`, frontend
   and control-plane scans, and security contracts. Agent remediation/review is
   off; inherited bypass/remediation settings are not forwarded. OSV cache must
   already exist; it is not refreshed by this gate.
4. Offline zizmor with pedantic persona and medium severity/confidence thresholds,
   matching the Actions security lane.
5. Separate disposable `linux/amd64` Docker runs using
   `node:22.20.0-bookworm` and `node:24-bookworm`. Each receives only a tar stream of the snapshot on
   stdin, with no host bind mounts, host environment, Git credentials, or Docker
   socket. Capabilities are dropped and privilege escalation is disabled. Each
   installs npm 10.9.3 inside the container, runs `npm ci --ignore-scripts`, lint,
   release/content/security/contract suites, and the production build. See
   `scripts/lib/local-required-gate/container.sh` for the explicit inventory.
   Docker pulls and npm installs need public network access. Node 24's tag is
   deliberately rolling like CI's `24.x`; this is not a hermetic image attestation.
6. Local CodeQL JavaScript/TypeScript database creation (`--build-mode=none`) and
   `javascript-security-extended.qls` analysis. The gate requires valid SARIF with
   successful invocations and zero results, not merely CodeQL's zero exit status.
7. Final checkout identity check and temporary-file cleanup.

This includes deterministic local-CI contracts, not the interactive Codex review
or the separately provisioned mobile browser audit in `verify:local`. It does not
claim those surfaces passed. Host scanners/CodeQL are trusted local executables;
Docker is isolation for build/test dependencies, not a sandbox for host scanners.
Do not run unreviewed repository scripts on a credentialed workstation. Docker
may retain pulled images; normal containers use `--rm` and failed clients trigger
forced container cleanup. Abrupt host termination can require operator cleanup.

## Evidence and failure diagnosis

Stdout contains exactly one JSON object (use npm `--silent`). It contains only the
schema, validated SHA (or null for malformed input), overall pass/fail, fixed gate
names/statuses, and `remoteReported: false`. It contains no file paths, branch
names, arguments, environment values, scanner messages, source, or SARIF details.
Tool stdout/stderr is discarded, not copied into the evidence. Temporary SARIF,
databases, snapshot tar streams, and scanner evidence are removed on normal completion or
caught failure. Process termination before cleanup produces no usable success
claim. This unsigned JSON is not an authenticated attestation.

For diagnosis, rerun the named existing check locally in a private terminal;
do not attach raw scanner output to public issues. No break-glass is supported.
Use `npm run test:local-required-gate` for offline adversarial mocked contracts,
including the reporter. Mocked success proves orchestration behavior, not a real
Docker/CodeQL pass or authenticated GitHub installation scope.

## Optional exact-SHA GitHub App reporter

Run only from the root of a trusted, exclusively held, clean attached checkout.
The explicit SHA must be the full lowercase 40-character GitHub commit ID and
match HEAD throughout. Origin must be exactly `git@github.com:morahan/LongmontAI.git`
or `https://github.com/morahan/LongmontAI.git`. The commit must exist on GitHub.
The reporter never fetches, rebases, commits, pushes, or changes remote settings.

Provision credentials separately; never put them in this repository or command
arguments. The only supported files are:

- `~/.config/longmontai-gate/metadata.json`: exactly the fields `app_id` (positive
  integer), `installation_id` (positive integer), and `slug` (App slug string).
- `~/.config/longmontai-gate/reporter.pem`: RSA private key, at least 2048 bits.

Both files must be regular, non-symlink, single-link files owned by the current
UID with exactly `0600` permissions. The reporter checks ownership/mode before
and after opening with no-follow semantics. Keep the parent directory private
and trusted. No CLI credential overrides, environment tokens, debug logging,
credential printing, or automatic permission repair are supported.

The App installation must belong to `morahan`, select **only**
`morahan/LongmontAI`, and have exactly `checks: write`, `contents: read`, and
`metadata: read`, matching the installed App manifest. Both the installation and
the full-scope token response must contain all three permissions at these exact
levels and no others. Missing permissions, Contents write, or any additional
permission (even read-only) are rejected.
All-repository installations, extra repositories/permissions, suspended
installations, mismatched identities, malformed API responses, expired tokens,
and redirects fail closed. A short-lived RS256 JWT (`iat = now - 60s`,
`exp = now + 300s`) is signed using Node crypto. Its installation token stays in
memory. The token exchange deliberately requests the installation's full scope:
a narrowed token must not conceal access to other repositories. The repository
inventory must contain exactly one repository. Scope is rechecked after the gate.

### Separate read-only scope verification plan (operator authorization required)

From the clean committed checkout, in a private terminal without shell tracing:

```sh
sha="$(git rev-parse --verify HEAD)"
npm run --silent gate:local-required:verify-installation -- --sha "$sha"
```

This authenticates the installation and enumerates its scope; it does **not**
create/update checks, run scanners, mutate settings, or change repository content.
Authentication requires a POST to mint an ephemeral installation token, so this
is read-only with respect to repository/App configuration, not an HTTP-GET-only
operation. Its only success output is
`{"status":"scope-verified","remoteReported":false}`. It never emits identities,
tokens, keys, headers, or raw responses. Do not run it as part of offline tests.

### Posting (separate explicit operator action; not a dry run)

```sh
npm run --silent gate:local-required:report -- --sha "$(git rev-parse --verify HEAD)"
```

The reporter checks every page of existing check runs (including older runs),
refusing a same-name success from another App. It creates an App-authored
`in_progress` check on that SHA, invokes `scripts/local-required-gate.sh --sha`
with an allowlisted child environment and discarded stderr, and only completes
`success` when the child exits zero and its bounded JSON evidence matches the
exact schema/SHA, `status: pass`, `remoteReported: false`, and every required gate
exactly once in the expected order. It also rechecks the checkout before posting.

Inherited bypass/skip/security override variables and Git/Node/shell/loader
configuration overrides are rejected by presence (even `0`), not silently
honored. The reporter sends only fixed summaries; scanner stdout, stderr,
credentials, exception details and raw API responses never become public output.
It attempts `completed/failure` for any failure after obtaining a verified check
ID. An unavailable API, expired token, ambiguous creation response, termination,
or lost network can prevent that update; the run can remain pending. An ambiguous
success-update response triggers a best-effort failure update, but network loss
cannot provide transactional rollback guarantees. Nonzero exit always means
unproven, never success; `remoteReported: true` on failure only confirms a
validated failure update. No automatic retry/reuse of an existing check occurs.

Credentialed execution trusts the reviewed checkout, host tools, filesystem and
current user. Clean-tree checks are not a sandbox against a malicious same-user
process or concurrent changes between checks. Do not execute unreviewed branches
with these credentials. No real authenticated verification or check posting is
performed by the mocked contract suite.

## Public CodeQL bundle and checksum workflow

Use GitHub's public documentation and release pages:

- <https://docs.github.com/en/code-security/codeql-cli/getting-started-with-the-codeql-cli/setting-up-the-codeql-cli>
- <https://github.com/github/codeql-action/releases> (CodeQL **bundle** releases)
- <https://github.com/github/codeql-cli-binaries/releases> (CLI-only releases;
  additional compatible query packs would be required)

Choose an explicit bundle release and the supported OS/architecture asset; review
its license/eligibility for this repository. Do not use an unpinned `latest` URL.
Obtain the publisher's SHA-256 from that release's published checksum or GitHub's
asset digest metadata over HTTPS. Record the release, asset, and expected digest
in your private operator notes. If no trusted digest is available, stop: computing
a hash of an unchecked download does not authenticate it.

Example session-only workflow (replace the placeholders from the public release):

```sh
# Work in an operator-created temporary directory, not a shell startup file.
scratch="$(mktemp -d)"
asset_url='https://github.com/github/codeql-action/releases/download/EXPLICIT_BUNDLE_TAG/OS_SPECIFIC_BUNDLE.tar.gz'
expected_sha256='PUBLISHER_64_HEX_SHA256'
curl --fail --location --proto '=https' --proto-redir '=https' --tlsv1.2 \
  "$asset_url" -o "$scratch/bundle.tar.gz" || exit 1
# On macOS use shasum -a 256 -c; on Linux use sha256sum -c.
printf '%s  %s\n' "$expected_sha256" "$scratch/bundle.tar.gz" | shasum -a 256 -c - || exit 1
# Proceed ONLY after a successful checksum comparison.
tar -xzf "$scratch/bundle.tar.gz" -C "$scratch"
"$scratch/codeql/codeql" version
"$scratch/codeql/codeql" resolve languages
# Prefix PATH for this invocation only; no shell/profile/service changes.
PATH="$scratch/codeql:$PATH" npm run --silent gate:local-required -- --sha "$(git rev-parse HEAD)"
# Remove only this session's temporary directory after recording metadata evidence.
rm -rf "$scratch"
```

These are operator instructions, not an installer run by this task. No GitHub
login, token, App key, credential helper, or persistent PATH change is needed for
a public bundle download. Never add any of those to evidence or repository files.
