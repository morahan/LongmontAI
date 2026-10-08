# Optional exact-commit local CI

`scripts/local-ci.mjs` is an opt-in coordinator for verifying a clean, committed
`main` SHA. It is separate from `just verify` (`scripts/local-ci.sh`), the fast
gate, and the Git hooks. No hook or npm script invokes it. It does not commit,
push, publish a status, or change branch protection. Its receipt is local evidence,
not permission to publish.

Run it directly only after provisioning the required tools and reviewing the
candidate code:

```bash
LOCAL_CI_BASE_SHA=<reviewed-full-base-sha> \
LOCAL_CI_TOOL_MANIFEST=<absolute-owner-reviewed-manifest.json> \
LOCAL_CI_CODEQL_SUITE=<absolute-pinned-security-extended.qls> \
LOCAL_CI_NODE22_BIN=<absolute-node22-bin> \
LOCAL_CI_NODE24_BIN=<absolute-node24-bin> \
LOCAL_CI_NPM_CLI=<absolute-npm-10.9.3-cli.js> \
node scripts/local-ci.mjs <full-HEAD-sha>
```

The default mode is `pre-cutover`, which records any retained hosted workflow
files. `--final` additionally rejects all `.github/workflows/*.yml` and `*.yaml`
files; use it only after a separately approved workflow cutover. Unsupported
arguments and non-clean trees fail before scanning.

## Inputs and checks

- Trusted PATH must provide Gitleaks 8.30.1, OSV scanner 2.3.6, Codex, Git,
  and Bash. The tool manifest pins CodeQL 2.27.0, zizmor 1.26.1, the CodeQL
  query packs, and a fresh offline npm advisory cache by absolute path and
  full-content SHA-256. The CodeQL suite must be the pinned JavaScript security
  extended suite from `codeql/javascript-queries/2.4.5`.
- The coordinator checks Node 22.20.0 and 24.16.0, both with npm 10.9.3. The
  repository currently declares `>=22.12.0 <25` in `package.json` and selects
  22.20.0 in `.nvmrc`; the coordinator's stricter exact pins are its own policy.
- It clones the exact commit without hardlinks into private temporary evidence,
  checks source identity, scans with CodeQL and the deterministic security gates,
  then installs with `npm ci --ignore-scripts`, lints, and builds under each Node
  version. The Node 22 lane also runs the current `scripts/local-ci.sh` gates,
  including the mobile browser audit. Required tools, scanner coverage, or an
  incomplete scan fail closed.
- It strips GitHub publication environment variables from child processes, but
  that is not an operating-system sandbox. Run only on a trusted verification
  host without publisher credentials. It may access the npm registry during
  `npm ci`; prepare the host accordingly.

A successful run creates a private `receipt.json` with the exact SHA, tree,
reviewed base, source and tool identities, gate results, and hashes of logs and
CodeQL artifacts. `validateReceipt` in `scripts/local-ci-evidence.mjs` checks a
receipt against independently supplied expected values. A self-consistent
receipt is not proof that the run happened; the reviewer must observe the run
and inspect the private evidence. Never upload raw logs or SARIF without review.

The focused offline contract test is:

```bash
node --test scripts/tests/local-ci.test.mjs
```

It tests parser, receipt, path, source identity, scanner selection, and
entrypoint failure behavior. It does not run the full coordinator or establish
scanner parity on this machine.
