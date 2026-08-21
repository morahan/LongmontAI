import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const [script, packageJson, skill] = await Promise.all([
  readFile(new URL('../security-commit-review.sh', import.meta.url), 'utf8'),
  readFile(new URL('../../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../../.codex/skills/security-commit-review/SKILL.md', import.meta.url), 'utf8'),
])

assert.match(script, /SECURITY_COMMIT_AUTO_FIX:-0/, 'remediation must be opt-in')
assert.doesNotMatch(script, /SECURITY_COMMIT_SKIP/, 'scanner skips must not turn failures into passes')
assert.match(script, /break-glass is forbidden in CI/, 'break-glass must not work in CI')
assert.match(script, /SECURITY_COMMIT_BREAK_GLASS_TICKET/, 'break-glass must be attributable')
assert.match(script, /--sandbox read-only/, 'agent review must be read-only')
assert.doesNotMatch(
  script,
  /review --uncommitted ['"]/,
  'agent review must use a Codex CLI form that accepts custom security instructions',
)
assert.match(script, /--sandbox workspace-write/, 'fixer must be workspace-write')
assert.match(script, /approval_policy="never"/, 'agent review must be non-interactive')
const forbiddenFullAccessInvocation = new RegExp(
  String.raw`codex exec[\s\S]{0,400}--sandbox danger-full` + '-access',
)
assert.doesNotMatch(
  script,
  forbiddenFullAccessInvocation,
  'no agent invocation may use full filesystem access',
)
assert.match(script, /sandbox_workspace_write\.network_access=false/, 'fixer network must be disabled')
assert.match(script, /--log-opts="\$range"/, 'push must scan outgoing history')
assert.match(
  script,
  /git archive --format=tar HEAD \| tar -xf - -C "\$snapshot_dir"/,
  'full scans must use an exact tracked snapshot',
)
assert.match(script, /chmod 700 "\$gate_temp_dir"/, 'snapshot parent must be private')
assert.equal(
  script.match(/gitleaks dir /g)?.length,
  1,
  'tracked files must be scanned by one gitleaks process',
)
assert.doesNotMatch(
  script,
  /while IFS= read -r -d '' file; do[\s\S]{0,300}gitleaks dir/,
  'tracked-file gitleaks must not spawn once per file',
)
assert.match(
  script,
  /if ! git archive[\s\S]{0,200}return 1/,
  'archive failures must fail closed',
)
assert.match(
  script,
  /if \[\[ "\$MODE" == "staged" \]\]; then[\s\S]*dependency_pattern[\s\S]*no dependency manifests or lockfiles changed/,
  'only staged reviews may omit an irrelevant dependency audit',
)
assert.match(script, /package-lock\\\.json/, 'dependency scope must include npm lockfiles')
assert.match(script, /Cargo\\\.\(toml\|lock\)/, 'dependency scope must include nested Cargo manifests')
assert.match(script, /staged_files=.*--diff-filter=ACMRD/, 'staged scope changes must include deletions')
assert.match(
  script,
  /if \[\[ "\$MODE" == "staged" \]\]; then[\s\S]*policy_pattern[\s\S]*no security-contract or runtime-header governing files changed/,
  'only staged reviews may omit an irrelevant security policy contract',
)
for (const governingFile of [
  'scripts/security-commit-review\\.sh',
  'scripts/tests/security-review-chain\\.test\\.mjs',
  'scripts/tests/runtime-security-headers\\.mjs',
  'package\\.json',
  'vercel\\.json',
]) {
  assert.ok(script.includes(governingFile), `policy scope must include ${governingFile}`)
}
assert.match(script, /\.github\//, 'control-plane scan must cover future workflow files')
assert.match(script, /\.githooks\//, 'control-plane scan must include local hooks')
assert.match(script, /failed_gates_begin/, 'evidence must name failed gates')
assert.match(script, /files_in_scope_begin/, 'evidence must list filenames only')
assert.match(script, /SECURITY_COMMIT_FIX_ATTEMPTS must be 1 or 2/, 'fix retries must be bounded')

assert.equal(
  packageJson.scripts['security:remediate'],
  'SECURITY_COMMIT_AUTO_FIX=1 scripts/security-commit-review.sh all',
)
assert.match(packageJson.scripts['security:agent-review'], /--sandbox read-only/)
assert.doesNotMatch(packageJson.scripts['security:agent-review'], /review --uncommitted ['"]/)
assert.match(skill, /Automatic fixing is off by default/)
assert.equal(packageJson.scripts['verify:local'], 'bash scripts/local-ci.sh')

const fixture = await mkdtemp(join(tmpdir(), 'security-review-contract-'))
const bin = join(fixture, 'bin')
const reviewScript = join(fixture, 'scripts/security-commit-review.sh')
const scannerLog = join(fixture, 'scanner.log')
const env = {
  ...process.env,
  GIT_DIR: join(fixture, '.git'),
  GIT_INDEX_FILE: join(fixture, '.git', 'index'),
  GIT_WORK_TREE: fixture,
  PATH: `${bin}:${process.env.PATH}`,
  SECURITY_TEST_LOG: scannerLog,
}
for (const inheritedGitVariable of [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
]) {
  delete env[inheritedGitVariable]
}

const run = (file, args = [], options = {}) => execFileAsync(file, args, {
  cwd: fixture,
  env,
  timeout: 30_000,
  ...options,
})
const scannerLines = async () => {
  try {
    return (await readFile(scannerLog, 'utf8')).trim().split('\n').filter(Boolean)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

try {
  await mkdir(join(fixture, 'scripts'), { recursive: true })
  await mkdir(bin)
  await copyFile(new URL('../security-commit-review.sh', import.meta.url), reviewScript)
  await chmod(reviewScript, 0o755)
  await writeFile(join(fixture, 'tracked.txt'), 'tracked\n')
  await writeFile(join(fixture, 'package-lock.json'), '{}\n')
  await writeFile(join(fixture, 'vercel.json'), '{}\n')
  await writeFile(join(bin, 'gitleaks'), `#!/usr/bin/env bash
set -eu
printf 'gitleaks:%s\\n' "$*" >>"$SECURITY_TEST_LOG"
if [[ "\${1:-}" == "dir" ]]; then
  target="\${!#}"
  [[ -f "$target/tracked.txt" ]]
  [[ ! -e "$target/untracked.txt" ]]
fi
`)
  await writeFile(join(bin, 'osv-scanner'), `#!/usr/bin/env bash
printf 'osv:%s\\n' "$*" >>"$SECURITY_TEST_LOG"
`)
  await writeFile(join(bin, 'node'), `#!/usr/bin/env bash
printf 'node:%s\\n' "$*" >>"$SECURITY_TEST_LOG"
`)
  await Promise.all(['gitleaks', 'osv-scanner', 'node'].map((name) => chmod(join(bin, name), 0o755)))

  await run('git', ['init', '-q'])
  await run('git', ['add', '.'])
  await run('git', ['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qm', 'fixture'])

  await writeFile(join(fixture, 'tracked.txt'), 'staged unrelated change\n')
  await run('git', ['add', 'tracked.txt'])
  await writeFile(scannerLog, '')
  await run(reviewScript, ['staged'])
  let lines = await scannerLines()
  assert.equal(lines.filter((line) => line.startsWith('gitleaks:git --staged')).length, 1)
  assert.equal(lines.filter((line) => line.startsWith('osv:')).length, 0, 'irrelevant staged diffs skip OSV')
  assert.equal(lines.filter((line) => line.startsWith('node:')).length, 0, 'irrelevant staged diffs skip policy tests')

  await run('git', ['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qm', 'unrelated'])
  await writeFile(join(fixture, 'package-lock.json'), '{"lockfileVersion": 3}\n')
  await run('git', ['add', 'package-lock.json'])
  await writeFile(scannerLog, '')
  await run(reviewScript, ['staged'])
  lines = await scannerLines()
  assert.equal(lines.filter((line) => line.startsWith('osv:')).length, 1, 'lockfile changes run OSV')
  assert.equal(lines.filter((line) => line.startsWith('node:')).length, 0, 'lockfiles alone do not govern policy tests')

  await run('git', ['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qm', 'lockfile'])
  await writeFile(join(fixture, 'vercel.json'), '{"headers": []}\n')
  await run('git', ['add', 'vercel.json'])
  await writeFile(scannerLog, '')
  await run(reviewScript, ['staged'])
  lines = await scannerLines()
  assert.equal(lines.filter((line) => line.startsWith('osv:')).length, 0, 'runtime policy changes do not force OSV')
  assert.equal(lines.filter((line) => line.startsWith('node:')).length, 2, 'runtime-header changes run both policy tests')

  await run('git', ['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qm', 'runtime policy'])
  await writeFile(join(fixture, 'untracked.txt'), 'must not enter snapshot\n')
  await writeFile(scannerLog, '')
  await run(reviewScript, ['all'])
  lines = await scannerLines()
  assert.equal(lines.filter((line) => line.startsWith('gitleaks:dir ')).length, 1, 'all mode uses one directory scan')
  assert.equal(lines.filter((line) => line.startsWith('osv:')).length, 1, 'all mode always audits dependencies')
  assert.equal(lines.filter((line) => line.startsWith('node:')).length, 2, 'all mode always runs both policy tests')

  await run('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD~1'])
  await writeFile(scannerLog, '')
  await run(reviewScript, ['push'])
  lines = await scannerLines()
  assert.equal(lines.filter((line) => line.startsWith('gitleaks:dir ')).length, 1, 'push uses one tracked snapshot scan')
  assert.equal(lines.filter((line) => line.startsWith('gitleaks:git ') && line.includes('--log-opts=origin/main..HEAD')).length, 1, 'push preserves outgoing-history scanning')
  assert.equal(lines.filter((line) => line.startsWith('osv:')).length, 1, 'push always audits dependencies')
  assert.equal(lines.filter((line) => line.startsWith('node:')).length, 2, 'push always runs both policy tests')
} finally {
  await rm(fixture, { recursive: true, force: true })
}

console.log('security review chain contract: PASS')
