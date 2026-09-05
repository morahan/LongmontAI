import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const sourceRoot = resolve(dirname(new URL(import.meta.url).pathname), '../..')

async function exec(file, args, options = {}) {
  return execFileAsync(file, args, { encoding: 'utf8', ...options })
}

async function hashTree(path) {
  const hash = createHash('sha256')
  async function visit(current, relative = '') {
    const stat = await lstat(current)
    hash.update(`${relative}\0${stat.mode}\0${stat.size}\0`)
    if (stat.isDirectory()) {
      for (const name of (await readdir(current)).sort()) await visit(join(current, name), join(relative, name))
    } else if (stat.isFile()) {
      hash.update(await readFile(current))
    }
  }
  await visit(path)
  return hash.digest('hex')
}

async function callerGitState() {
  try {
    const { stdout: commonOutput } = await exec('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: sourceRoot })
    const common = commonOutput.trim()
    const [{ stdout: refs }, { stdout: config }, { stdout: head }] = await Promise.all([
      exec('git', ['for-each-ref', '--format=%(refname)%00%(objectname)'], { cwd: sourceRoot }),
      exec('git', ['config', '--local', '--null', '--list'], { cwd: sourceRoot }),
      exec('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot }),
    ])
    return {
      refs: createHash('sha256').update(refs).digest('hex'),
      config: createHash('sha256').update(config).digest('hex'),
      head: head.trim(),
      objects: await hashTree(join(common, 'objects')),
    }
  } catch {
    return null
  }
}

const callerBefore = await callerGitState()
const [script, prePushHook, packageJson, agentSkill, codexSkill] = await Promise.all([
  readFile(new URL('../security-commit-review.sh', import.meta.url), 'utf8'),
  readFile(new URL('../../.githooks/pre-push', import.meta.url), 'utf8'),
  readFile(new URL('../../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../../.agents/skills/security-commit-review/SKILL.md', import.meta.url), 'utf8'),
  readFile(new URL('../../.codex/skills/security-commit-review/SKILL.md', import.meta.url), 'utf8'),
])

assert.match(script, /SECURITY_COMMIT_AUTO_FIX:-0/, 'remediation must be opt-in')
assert.doesNotMatch(script, /SECURITY_COMMIT_SKIP/, 'scanner skips must not turn failures into passes')
assert.match(script, /break-glass is forbidden in CI/, 'break-glass must not work in CI')
assert.match(script, /--sandbox read-only/, 'agent review must be read-only')
assert.match(script, /--sandbox workspace-write/, 'fixer must be workspace-write')
assert.match(script, /sandbox_workspace_write\.network_access=false/, 'fixer network must be disabled')
assert.match(script, /read -r local_ref local_oid remote_ref remote_oid extra/, 'push scope must come from hook stdin')
assert.match(script, /history_ranges\+=\("\$local_commit"\)/, 'new refs must scan all reachable history')
assert.match(script, /history_ranges\+=\("\$\{remote_commit\}\.\.\$\{local_commit\}"\)/, 'updates and force pushes must use exact endpoints')
assert.match(script, /git archive --format=tar "\$tip"/, 'full scans must use exact ref-tip snapshots')
assert.match(script, /--name-only --diff-filter=ACMRD -z/, 'staged scope matching must be NUL-delimited and include deletions')
assert.match(script, /pre-push ref-update input is required/, 'missing push scope must fail closed')
assert.match(script, /remote baseline is unavailable locally/, 'unprovable history must fail closed')
assert.match(script, /osv-scanner scan source[\s\S]*"\$snapshot"/, 'push dependency scans must run from snapshots')
assert.match(prePushHook, /cat >"\$PUSH_REFS"/, 'pre-push input must be captured exactly once')
assert.match(prePushHook, /security-commit-review\.sh push <"\$PUSH_REFS"/, 'security review must receive preserved ref updates')
assert.match(prePushHook, /run-targeted-mobile-audit\.mjs push <"\$PUSH_REFS"/, 'mobile selection must receive the same ref updates')
assert.match(prePushHook, /chmod 600 "\$PUSH_REFS"/, 'preserved ref updates must remain private')
assert.match(script, /failed_gates_begin/, 'evidence must name failed gates')
assert.match(script, /git rev-parse --absolute-git-dir/, 'Git must resolve the per-worktree metadata directory')
assert.match(script, /SECURITY_COMMIT_FIX_ATTEMPTS must be 1 or 2/, 'fix retries must be bounded')
assert.equal(packageJson.scripts['security:remediate'], 'SECURITY_COMMIT_AUTO_FIX=1 scripts/security-commit-review.sh all')
assert.equal(packageJson.scripts['verify:local'], 'bash scripts/local-ci.sh')
for (const skill of [agentSkill, codexSkill]) {
  assert.match(skill, /Automatic fixing is off by default/)
}

const fixture = await mkdtemp(join(tmpdir(), 'security-review-contract-'))
const bin = join(fixture, 'bin')
const home = join(fixture, 'home')
const repo = join(fixture, 'repo')
const reviewScript = join(repo, 'scripts/security-commit-review.sh')
const scannerLog = join(fixture, 'scanner.log')
const isolatedEnv = Object.fromEntries(Object.entries(process.env).filter(
  ([name]) => !name.startsWith('GIT_') && !name.startsWith('SECURITY_COMMIT_') && !name.startsWith('SECURITY_REVIEW_'),
))
Object.assign(isolatedEnv, {
  HOME: home,
  XDG_CONFIG_HOME: join(home, '.config'),
  PATH: `${bin}:${process.env.PATH}`,
  SECURITY_TEST_LOG: scannerLog,
})

const run = (file, args = [], options = {}) => execFileAsync(file, args, {
  cwd: repo,
  env: isolatedEnv,
  timeout: 120_000,
  ...options,
})
const runReview = (mode, input = '', { cwd = repo, env = isolatedEnv } = {}) => new Promise((resolvePromise, reject) => {
  const child = spawn(reviewScript, [mode], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  const timer = setTimeout(() => child.kill('SIGTERM'), 120_000)
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
  child.on('error', reject)
  child.on('close', (code, signal) => {
    clearTimeout(timer)
    if (code === 0) resolvePromise({ stdout, stderr })
    else reject(Object.assign(new Error(`security review failed (${code ?? signal})`), { code, signal, stdout, stderr }))
  })
  child.stdin.end(input)
})
const git = (args) => run('git', args)
const commit = (message) => git(['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qam', message])
const scannerLines = async () => {
  try {
    return (await readFile(scannerLog, 'utf8')).trim().split('\n').filter(Boolean)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}
const clearLog = () => writeFile(scannerLog, '')
const occurrences = (lines, marker) => lines.join('\n').split(marker).length - 1
const zero = '0'.repeat(40)

try {
  await Promise.all([mkdir(bin, { recursive: true }), mkdir(home, { recursive: true }), mkdir(join(repo, 'scripts/tests'), { recursive: true })])
  await copyFile(new URL('../security-commit-review.sh', import.meta.url), reviewScript)
  await chmod(reviewScript, 0o755)
  await writeFile(join(repo, 'tracked.txt'), 'base\n')
  await writeFile(join(repo, 'package-lock.json'), '{}\n')
  await writeFile(join(repo, 'vercel.json'), '{}\n')
  await writeFile(join(repo, 'scripts/tests/security-review-chain.test.mjs'), '// fixture contract\n')
  await writeFile(join(repo, 'scripts/tests/runtime-security-headers.mjs'), '// fixture headers\n')
  await writeFile(join(bin, 'gitleaks'), `#!/usr/bin/env bash
set -eu
record="gitleaks:$*"
if [[ "\${1:-}" == "dir" ]]; then
  target="\${!#}"
  record="$record:content=$(tr -d '\\n' <"$target/tracked.txt")"
  [[ ! -e "$target/untracked.txt" ]]
fi
printf '%s\\n' "$record" >>"$SECURITY_TEST_LOG"
`)
  await writeFile(join(bin, 'osv-scanner'), `#!/usr/bin/env bash
set -eu
printf 'osv:cwd=%s:%s\\n' "$PWD" "$*" >>"$SECURITY_TEST_LOG"
`)
  await writeFile(join(bin, 'node'), `#!/usr/bin/env bash
set -eu
printf 'node:cwd=%s:%s\\n' "$PWD" "$*" >>"$SECURITY_TEST_LOG"
`)
  await Promise.all(['gitleaks', 'osv-scanner', 'node'].map((name) => chmod(join(bin, name), 0o755)))

  await git(['init', '-q', '-b', 'main'])
  await git(['add', '.'])
  await git(['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qm', 'base'])
  const base = (await git(['rev-parse', 'HEAD'])).stdout.trim()

  await writeFile(join(repo, 'tracked.txt'), 'main-tip\n')
  await commit('main tip')
  const mainTip = (await git(['rev-parse', 'HEAD'])).stdout.trim()

  await git(['switch', '-qc', 'side', base])
  await writeFile(join(repo, 'tracked.txt'), 'side-tip\n')
  await commit('side tip')
  const sideTip = (await git(['rev-parse', 'HEAD'])).stdout.trim()
  await writeFile(join(repo, 'untracked.txt'), 'must never enter a snapshot\n')

  await mkdir(join(repo, 'odd\nname'))
  await writeFile(join(repo, 'odd\nname/package-lock.json'), '{"lockfileVersion":3}\n')
  await git(['add', 'odd\nname/package-lock.json'])
  await clearLog()
  await runReview('staged')
  let lines = await scannerLines()
  assert.equal(lines.filter((line) => line.startsWith('gitleaks:git --staged')).length, 1)
  assert.equal(lines.filter((line) => line.startsWith('osv:')).length, 1, 'NUL-safe matching finds newline-containing dependency paths')

  await git(['reset', '--hard', 'HEAD'])
  await writeFile(join(repo, 'tracked.txt'), 'mutable-worktree\n')
  await clearLog()
  await runReview('all')
  let allLines = await scannerLines()
  assert.equal(allLines.filter((line) => line.startsWith('gitleaks:dir ')).length, 1, 'all mode performs one exact HEAD snapshot scan')
  assert.ok(allLines.some((line) => line.includes('content=side-tip')), 'all mode excludes mutable worktree content')
  assert.equal(occurrences(allLines, 'osv:'), 1, 'all mode audits the archived HEAD snapshot')
  assert.equal(occurrences(allLines, 'node:'), 2, 'all mode runs both contracts from archived HEAD')
  await git(['reset', '--hard', 'HEAD'])

  await clearLog()
  const multiRefInput = [
    `refs/heads/main ${mainTip} refs/heads/main ${base}`,
    `refs/heads/side ${sideTip} refs/heads/side ${zero}`,
    `(delete) ${zero} refs/heads/obsolete ${base}`,
    '',
  ].join('\n')
  await runReview('push', multiRefInput)
  lines = await scannerLines()
  const directoryScans = lines.filter((line) => line.startsWith('gitleaks:dir '))
  assert.equal(directoryScans.length, 2, 'every unique pushed tip gets an exact tracked snapshot scan')
  assert.ok(directoryScans.some((line) => line.includes('content=main-tip')), 'non-current branch tip is scanned')
  assert.ok(directoryScans.some((line) => line.includes('content=side-tip')), 'current pushed tip is scanned')
  assert.equal(lines.filter((line) => line.includes(`--log-opts=${base}..${mainTip}`)).length, 1, 'updated ref uses exact outgoing range')
  assert.equal(lines.filter((line) => line.includes(`--log-opts=${sideTip}`)).length, 1, 'new ref scans all reachable history')
  assert.equal(occurrences(lines, 'osv:'), 2, 'dependency gate scans each unique tip')
  assert.equal(occurrences(lines, 'node:'), 4, 'both policy contracts run at each unique tip')

  await clearLog()
  await runReview('push', `refs/heads/side ${sideTip} refs/heads/side ${mainTip}\n`)
  lines = await scannerLines()
  assert.equal(lines.filter((line) => line.includes(`--log-opts=${mainTip}..${sideTip}`)).length, 1, 'force push scans the exact non-ancestor range')

  await clearLog()
  await runReview('push', `(delete) ${zero} refs/heads/obsolete ${base}\n`)
  assert.deepEqual(await scannerLines(), [], 'deletions introduce no snapshot or history to scan')

  // All Git mutations below belong to this disposable repository, never the caller.
  const linked = join(fixture, 'linked')
  await git(['worktree', 'add', '--detach', linked, 'HEAD'])
  try {
    const linkedGit = (await run('git', ['rev-parse', '--absolute-git-dir'], { cwd: linked })).stdout.trim()
    assert.ok((await lstat(join(linked, '.git'))).isFile(), 'fixture must be a real linked worktree')
    const violationPath = '.github/workflows/fixture.yml'
    await mkdir(join(linked, '.github/workflows'), { recursive: true })
    const privateMarker = 'fixture-private-content-must-not-enter-evidence'
    await writeFile(join(linked, violationPath), [
      '# ' + privateMarker,
      'jobs:', '  fixture:', '    steps:', '      - uses: actions/checkout@fixture',
      '        with:', '          persist-credentials: ' + String(true), '',
    ].join('\n'))
    await run('git', ['add', violationPath], { cwd: linked })

    async function assertPrivateFailure(evidenceDirectory, env = isolatedEnv) {
      let failure
      await assert.rejects(runReview('staged', '', { cwd: linked, env }), (error) => {
        failure = error
        return error.code === 1
      })
      assert.match(failure.stdout + failure.stderr, /FAIL.*Agent control-plane policy scan/)
      assert.doesNotMatch(failure.stdout + failure.stderr, /Not a directory/)
      assert.match(failure.stdout, /Redacted evidence packet:/)
      const files = (await readdir(evidenceDirectory)).filter((name) => name.startsWith('evidence-'))
      assert.equal(files.length, 1)
      const evidencePath = join(evidenceDirectory, files[0])
      assert.equal((await lstat(evidenceDirectory)).mode & 0o777, 0o700)
      assert.equal((await lstat(evidencePath)).mode & 0o777, 0o600)
      const evidence = await readFile(evidencePath, 'utf8')
      assert.ok(evidence.length < 1024, 'evidence is bounded metadata, not scanner output')
      assert.equal(evidence.includes(privateMarker), false)
      assert.equal(evidence.includes('uses:'), false)
      assert.match(evidence, new RegExp(`^security-review-evidence-v1\\nmode=staged\\ncommit=${sideTip}\\ncreated_utc=[^\\n]+\\nfailed_gates_begin\\nAgent control-plane policy scan\\nfailed_gates_end\\nfiles_in_scope_begin\\n\\.github/workflows/fixture\\.yml\\nfiles_in_scope_end\\n$`))
    }
    await assertPrivateFailure(join(linkedGit, 'security-review'))
    const customEvidence = join(fixture, 'custom-private-evidence')
    await assertPrivateFailure(customEvidence, { ...isolatedEnv, SECURITY_REVIEW_EVIDENCE_DIR: customEvidence })

    // Local emergency-path testing is confined to this disposable fixture.
    const emergencyEnv = {
      ...isolatedEnv, CI: '', SECURITY_COMMIT_BREAK_GLASS: '1', SECURITY_COMMIT_BREAK_GLASS_TICKET: 'TEST-1234',
    }
    await runReview('staged', '', { cwd: linked, env: emergencyEnv })
    const logPath = join(linkedGit, 'security-review/break-glass.log')
    assert.equal((await lstat(logPath)).mode & 0o777, 0o600)
    const log = await readFile(logPath, 'utf8')
    assert.match(log, /mode=staged commit=[a-f0-9]+ ticket=TEST-1234/)
    await assert.rejects(runReview('staged', '', { cwd: linked, env: { ...emergencyEnv, CI: 'true' } }), (error) => {
      assert.match(error.stderr, /break-glass is forbidden in CI/)
      return error.code === 1
    })
    assert.equal(await readFile(logPath, 'utf8'), log, 'CI refusal must not append an emergency log')
  } finally {
    await git(['worktree', 'remove', '--force', linked])
  }
  await assert.rejects(runReview('staged', '', { cwd: home }), (error) => {
    assert.match(error.stderr, /cannot determine repository Git directory/)
    return error.code === 1
  })

  for (const input of [
    '',
    'malformed\n',
    `refs/heads/main ${mainTip} refs/heads/main ${'f'.repeat(40)}\n`,
    `refs/heads/main ${mainTip} not-a-ref ${base}\n`,
  ]) {
    await assert.rejects(runReview('push', input), 'malformed or unprovable push scope must fail closed')
  }
} finally {
  await rm(fixture, { recursive: true, force: true })
  assert.deepEqual(await callerGitState(), callerBefore, 'contract test must not change caller config, HEAD, refs, or object database')
}

console.log('security review chain contract: PASS (caller git state unchanged)')
