import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const sourceRoot = resolve(dirname(new URL(import.meta.url).pathname), '../..')

async function exec(file, args, options = {}) {
  return execFileAsync(file, args, { encoding: 'utf8', ...options })
}

async function hashTree(path, excludeGit = false) {
  const hash = createHash('sha256')
  async function visit(current, relative = '') {
    const stat = await lstat(current)
    hash.update(`${relative}\0${stat.mode}\0${stat.size}\0`)
    if (stat.isDirectory()) {
      for (const name of (await readdir(current)).sort()) {
        if (excludeGit && name === '.git') continue
        await visit(join(current, name), join(relative, name))
      }
    } else if (stat.isFile()) {
      hash.update(await readFile(current))
    } else if (stat.isSymbolicLink()) {
      hash.update(await readlink(current))
    }
  }
  await visit(path)
  return hash.digest('hex')
}

async function copyArchiveEntry(source, target) {
  const stat = await lstat(source)
  if (stat.isSymbolicLink()) {
    await symlink(await readlink(source), target)
  } else if (stat.isFile()) {
    await copyFile(source, target)
  } else {
    throw new Error('Unsupported archive source entry type')
  }
}

async function archiveSourceState() {
  const files = {}
  async function visit(directory, relative = '') {
    for (const name of (await readdir(directory)).sort()) {
      // Only this suite's disposable fixtures are excluded from source identity.
      if (!relative && name.startsWith('.security-review-contract-')) continue
      const file = join(relative, name)
      const absolute = join(directory, name)
      if ((await lstat(absolute)).isDirectory()) await visit(absolute, file)
      else files[file] = await hashTree(absolute)
    }
  }
  await visit(sourceRoot)
  return { kind: 'archive', files }
}

async function callerGitState(root = sourceRoot, includeFiles = true) {
  // Independent fixture repositories must not inherit a hook's private index.
  const options = root === sourceRoot ? { cwd: root } : {
    cwd: root,
    env: Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
  }
  // all/push execute this suite inside git-archive snapshots, not repositories.
  // Missing metadata is legitimate there; present but broken metadata is not.
  try { await lstat(join(root, '.git')) }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    return archiveSourceState()
  }
  try {
    const { stdout: commonOutput } = await exec('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], options)
    const common = commonOutput.trim()
    const [{ stdout: refs }, { stdout: config }, { stdout: head }] = await Promise.all([
      exec('git', ['for-each-ref', '--format=%(refname)%00%(objectname)'], options),
      exec('git', ['config', '--local', '--null', '--list'], options),
      exec('git', ['rev-parse', 'HEAD'], options),
    ])
    const { stdout: indexPath } = await exec('git', ['rev-parse', '--path-format=absolute', '--git-path', 'index'], options)
    const { stdout: tracked } = await exec('git', ['ls-files', '-z'], options)
    const files = {}
    for (const file of includeFiles ? [...new Set(tracked.split('\0').filter(Boolean))] : []) {
      try { files[file] = await hashTree(join(root, file)) }
      catch (error) { if (error.code !== 'ENOENT') throw error; files[file] = null }
    }
    return {
      kind: 'git',
      index: await hashTree(indexPath.trim()),
      files,
      refs: createHash('sha256').update(refs).digest('hex'),
      config: createHash('sha256').update(config).digest('hex'),
      head: head.trim(),
      objects: await hashTree(join(common, 'objects')),
    }
  } catch (error) {
    throw new Error('Cannot establish caller Git state', { cause: error })
  }
}

const callerBefore = await callerGitState()
const stateFingerprint = state => createHash('sha256').update(JSON.stringify(state)).digest('hex')
console.log(`Caller source kind: ${callerBefore.kind}`)
console.log(`Caller state before: ${stateFingerprint(callerBefore)}`)
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
assert.match(script, /break_glass_log="\$git_metadata_dir\/security-review\/break-glass\.log"/, 'break-glass logs must use the per-worktree metadata directory')
assert.match(script, /--sandbox read-only/, 'agent review must be read-only')
assert.match(script, /--sandbox workspace-write/, 'fixer must be workspace-write')
assert.match(script, /sandbox_workspace_write\.network_access=false/, 'fixer network must be disabled')
assert.match(script, /read -r local_ref local_oid remote_ref remote_oid extra/, 'push scope must come from hook stdin')
assert.match(script, /history_ranges\+=\("\$local_commit"\)/, 'new refs must scan all reachable history')
assert.match(script, /history_ranges\+=\("\$\{remote_commit\}\.\.\$\{local_commit\}"\)/, 'updates and force pushes must use exact endpoints')
assert.match(script, /--materialize "\$tip" "\$snapshot"/, 'full scans must materialize exact ref-tip trees')
assert.match(script, /--name-only --diff-filter=ACMRD -z/, 'staged scope matching must be NUL-delimited and include deletions')
assert.match(script, /pre-push ref-update input is required/, 'missing push scope must fail closed')
assert.match(script, /remote baseline is unavailable locally/, 'unprovable history must fail closed')
assert.match(script, /osv-scanner scan source[\s\S]*"\$snapshot"/, 'push dependency scans must run from snapshots')
assert.match(prePushHook, /cat >"\$PUSH_REFS"/, 'pre-push input must be captured exactly once')
assert.match(prePushHook, /security-commit-review\.sh push <"\$PUSH_REFS"/, 'security review must receive preserved ref updates')
assert.match(prePushHook, /run-targeted-mobile-audit\.mjs push <"\$PUSH_REFS"/, 'mobile selection must receive the same ref updates')
assert.match(prePushHook, /chmod 600 "\$PUSH_REFS"/, 'preserved ref updates must remain private')
assert.match(script, /failed_gates_begin/, 'evidence must name failed gates')
assert.match(script, /SECURITY_COMMIT_FIX_ATTEMPTS must be 1 or 2/, 'fix retries must be bounded')
assert.equal(packageJson.scripts['security:remediate'], 'SECURITY_COMMIT_AUTO_FIX=1 scripts/security-commit-review.sh all')
assert.equal(packageJson.scripts['verify:local'], 'bash scripts/local-ci.sh')
for (const skill of [agentSkill, codexSkill]) {
  assert.match(skill, /Automatic fixing is off by default/)
}

async function verifyOsvProvisioning() {
  const workflow = await readFile(new URL('../../.github/workflows/webpack.yml', import.meta.url), 'utf8')
  const buildStart = workflow.indexOf('\n  build:\n')
  assert.ok(buildStart > 0)
  assert.doesNotMatch(workflow.slice(0, buildStart), /Install OSV Scanner|Provision fresh OSV advisory cache/)
  const build = workflow.slice(buildStart)
  const steps = build.split(/^      - name: /m).slice(1)
  const step = (name) => {
    const matches = steps.filter((value) => value.startsWith(`${name}\n`))
    assert.equal(matches.length, 1, `exactly one ${name} build step`)
    assert.doesNotMatch(matches[0], /continue-on-error:|\n        if:/, 'required provisioning cannot be conditional or ignored')
    return matches[0]
  }
  const installStep = step('Install OSV Scanner')
  const cacheStep = step('Provision fresh OSV advisory cache')
  const reviewStep = step('Security review')
  assert.ok(steps.indexOf(installStep) < steps.indexOf(cacheStep))
  assert.ok(steps.indexOf(cacheStep) < steps.indexOf(reviewStep))
  assert.match(installStep, /OSV_VERSION: 2\.3\.6\n/)
  assert.match(installStep, /OSV_SHA256: f689e183ef0d573d2459738aae457d411a26241ae58b5088de1af288b3355604\n/)
  assert.match(installStep, /https:\/\/github\.com\/google\/osv-scanner\/releases\/download\/v\$\{OSV_VERSION\}\/\$binary/)
  assert.match(installStep, /binary="osv-scanner_linux_amd64"/)
  assert.match(installStep, /--proto '=https' --tlsv1\.2/)
  assert.match(installStep, /sha256sum --check --strict/)
  assert.doesNotMatch(build, /uses: actions\/cache|XDG_CACHE_HOME:/, 'no reused advisory cache or review-step override')
  assert.match(reviewStep, /run: npm run security:review/)
  const shellBody = (value) => {
    assert.match(value, /shell: bash/)
    const match = value.match(/^        run: \|\n((?:          .*\n)+)/m)
    assert.ok(match, 'known literal shell block required')
    return match[1].replace(/^          /gm, '')
  }
  const installBody = shellBody(installStep)
  const cacheBody = shellBody(cacheStep)
  assert.match(cacheBody, /osv-scanner scan source --offline --download-offline-databases --no-resolve --lockfile package-lock\.json\n/)
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'osv-provisioning-contract-')))
  try {
    const tools = join(directory, 'tools')
    const workspace = join(directory, 'workspace')
    await mkdir(tools)
    await mkdir(workspace)
    await writeFile(join(workspace, 'package-lock.json'), '{"lockfileVersion":3,"packages":{}}\n')
    const artifact = join(directory, 'synthetic-scanner')
    const scanner = `#!/usr/bin/env bash
set -euo pipefail
printf 'scanner:%s:%s:%s\\n' "$PWD" "$XDG_CACHE_HOME" "$*" >>"$A04_LOG"
if [[ "$*" == 'scan source --offline --download-offline-databases --no-resolve --lockfile package-lock.json' ]]; then
  [[ -f package-lock.json ]]
  [[ -z "$(ls -A "$XDG_CACHE_HOME")" ]]
  [[ "\${A04_DB_FAILURE:-0}" == 0 ]] || exit 42
  printf 'valid-fixture-db' >"$XDG_CACHE_HOME/db"
else
  [[ "$*" == 'scan source --offline-vulnerabilities --recursive --verbosity error .' ]]
  [[ -f "$XDG_CACHE_HOME/db" && "$(<"$XDG_CACHE_HOME/db")" == valid-fixture-db ]] || exit 43
fi
`
    await writeFile(artifact, scanner)
    await writeFile(join(tools, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
printf 'download:%s\\n' "$*" >>"$A04_LOG"
[[ "\${A04_DOWNLOAD_FAILURE:-0}" == 0 ]] || exit 22
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == --output ]]; then target="$2"; shift; fi
  shift
done
cp "$A04_ARTIFACT" "$target"
if [[ "\${A04_CORRUPT:-0}" == 1 ]]; then printf 'corrupt' >>"$target"; fi
`)
    // Fixture-only adapter verifies actual synthetic bytes with Node crypto.
    await writeFile(join(tools, 'sha256sum'), `#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == '--check --strict' ]]
"$A04_NODE" -e '
  const fs = require("node:fs"), crypto = require("node:crypto");
  const line = fs.readFileSync(0, "utf8");
  const match = line.match(/^([a-f0-9]{64})  (.+)\\n$/);
  if (!match) process.exit(1);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(match[2])).digest("hex");
  if (actual !== match[1]) process.exit(1);
'
`)
    await writeFile(join(tools, 'npm'), `#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == 'run security:review' ]]
osv-scanner scan source --offline-vulnerabilities --recursive --verbosity error .
`)
    await chmod(join(tools, 'curl'), 0o755)
    await chmod(join(tools, 'npm'), 0o755)
    await chmod(join(tools, 'sha256sum'), 0o755)
    // No network: production digest is asserted separately from synthetic bytes.
    const digest = createHash('sha256').update(scanner).digest('hex')
    const environment = async (name) => {
      const runner = join(directory, name)
      await mkdir(runner)
      return {
        PATH: `${tools}:${process.env.PATH}`, HOME: directory, RUNNER_TEMP: runner,
        GITHUB_PATH: join(runner, 'github-path'), GITHUB_ENV: join(runner, 'github-env'),
        OSV_VERSION: '2.3.6', OSV_SHA256: digest, A04_ARTIFACT: artifact, A04_LOG: join(runner, 'log'), A04_NODE: process.execPath,
      }
    }
    const execute = (body, env) => exec('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', body], { cwd: workspace, env })
    for (const [name, overrides] of [
      ['bad-checksum', { A04_CORRUPT: '1' }], ['download-error', { A04_DOWNLOAD_FAILURE: '1' }],
    ]) {
      const env = { ...await environment(name), ...overrides }
      await assert.rejects(execute(installBody, env))
      await assert.rejects(lstat(join(env.RUNNER_TEMP, 'bin/osv-scanner')), { code: 'ENOENT' })
      await assert.rejects(lstat(env.GITHUB_PATH), { code: 'ENOENT' }, 'failed install cannot publish its path')
    }
    const env = await environment('good')
    await execute(installBody, env)
    assert.equal(await readFile(join(env.RUNNER_TEMP, 'bin/osv-scanner'), 'utf8'), scanner)
    assert.equal((await lstat(join(env.RUNNER_TEMP, 'bin/osv-scanner'))).mode & 0o777, 0o755)
    assert.equal(await readFile(env.GITHUB_PATH, 'utf8'), `${env.RUNNER_TEMP}/bin\n`)
    env.PATH = `${env.RUNNER_TEMP}/bin:${env.PATH}`
    await assert.rejects(execute(cacheBody, { ...env, A04_DB_FAILURE: '1' }), (error) => error.code === 42)
    await assert.rejects(lstat(env.GITHUB_ENV), { code: 'ENOENT' })
    await execute(cacheBody, env)
    const exported = (await readFile(env.GITHUB_ENV, 'utf8')).trim().split('\n')
    assert.equal(exported.length, 1)
    assert.match(exported[0], /^XDG_CACHE_HOME=/)
    const cache = exported[0].slice('XDG_CACHE_HOME='.length)
    assert.equal(dirname(cache), env.RUNNER_TEMP)
    assert.equal((await lstat(cache)).mode & 0o777, 0o700)
    const reviewEnv = { ...env, XDG_CACHE_HOME: cache }
    const reviewCommand = reviewStep.match(/run: (npm run security:review)/)[1]
    await execute(reviewCommand, reviewEnv)
    const records = await readFile(env.A04_LOG, 'utf8')
    assert.ok(records.includes(`scanner:${workspace}:${cache}:scan source --offline --download-offline-databases --no-resolve --lockfile package-lock.json`))
    assert.ok(records.includes(`scanner:${workspace}:${cache}:scan source --offline-vulnerabilities --recursive --verbosity error .`))
    await writeFile(join(cache, 'db'), 'corrupt-cache')
    await assert.rejects(execute(reviewCommand, reviewEnv), (error) => error.code === 43)
    await rm(join(cache, 'db'))
    await assert.rejects(execute(reviewCommand, reviewEnv), (error) => error.code === 43)
    await writeFile(join(cache, 'db'), 'stale-cache')
    await execute(cacheBody, reviewEnv)
    const again = (await readFile(env.GITHUB_ENV, 'utf8')).trim().split('\n')[1].slice('XDG_CACHE_HOME='.length)
    assert.notEqual(again, cache)
    assert.equal(await readFile(join(cache, 'db'), 'utf8'), 'stale-cache')
    await execute(reviewCommand, { ...env, XDG_CACHE_HOME: again })
    console.log('OSV provisioning workflow contract: PASS (offline synthetic fixtures)')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const fixture = await mkdtemp(join(sourceRoot, '.security-review-contract-'))
const bin = join(fixture, 'bin')
const home = join(fixture, 'home')
const repo = join(fixture, 'repo')
const reviewScript = join(repo, 'scripts/security-commit-review.sh')
const scannerLog = join(fixture, 'scanner.log')
const isolatedEnv = Object.fromEntries(Object.entries(process.env).filter(
  ([name]) => !name.startsWith('GIT_') && !name.startsWith('SECURITY_COMMIT_'),
))
Object.assign(isolatedEnv, {
  HOME: home,
  XDG_CONFIG_HOME: join(home, '.config'),
  PATH: `${bin}:${process.env.PATH}`,
  SECURITY_TEST_LOG: scannerLog,
  TMPDIR: fixture,
  GIT_CEILING_DIRECTORIES: fixture,
  SECURITY_REVIEW_EVIDENCE_DIR: join(fixture, 'evidence'),
  SECURITY_TEST_GITLEAKS_STATUS: '0',
  SECURITY_TEST_CHAIN_STATUS: '0',
  SECURITY_TEST_HEADER_STATUS: '0',
})

const run = (file, args = [], options = {}) => execFileAsync(file, args, {
  cwd: repo,
  env: isolatedEnv,
  timeout: 120_000,
  ...options,
})
const runReview = (mode, input = '', env = isolatedEnv, cwd = repo) => new Promise((resolvePromise, reject) => {
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

async function verifySnapshotHashing() {
  const match = /verify_snapshot\(\)[\s\S]*?<<'NODE'\n([\s\S]*?)\nNODE/.exec(script)
  assert.ok(match, 'exact production verifier must be available')
  const verifier = match[1]
  const directory = join(fixture, 'verifier-hashing')
  const tools = join(directory, 'bin')
  await mkdir(tools, { recursive: true })
  const realGit = (await exec('/bin/sh', ['-c', 'command -v git'], { env: isolatedEnv })).stdout.trim()
  const log = join(directory, 'git-calls')
  await writeFile(join(tools, 'git'), `#!/bin/sh
printf '%s\\n' "$1" >> "$VERIFIER_GIT_LOG"
if [ "$1" = rev-parse ] && [ "\${2:-}" = --show-object-format ]; then
  case "\${VERIFIER_FORMAT_PROBE:-}" in
    unsupported) printf 'unsupported\\n'; exit 0 ;;
    unavailable) exit 9 ;;
  esac
fi
if [ "$1" = ls-tree ] && [ -n "\${VERIFIER_FAKE_TREE:-}" ]; then
  exec /bin/cat "$VERIFIER_FAKE_TREE"
fi
exec ${JSON.stringify(realGit)} "$@"
`)
  await chmod(join(tools, 'git'), 0o755)
  const verifierEnv = { ...isolatedEnv, PATH: `${tools}:${isolatedEnv.PATH}`, VERIFIER_GIT_LOG: log }
  async function invoke(work, tip, snapshot, passes, extra = {}, program = verifier) {
    await writeFile(log, '')
    const result = await new Promise((resolvePromise, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-', tip, snapshot], {
        cwd: work, env: { ...verifierEnv, ...extra }, stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = '', stderr = ''
      child.stdout.on('data', chunk => { stdout += chunk })
      child.stderr.on('data', chunk => { stderr += chunk })
      child.on('error', reject)
      child.on('close', (code, signal) => resolvePromise({ code, signal, stdout, stderr }))
      child.stdin.end(program)
    })
    const failed = result.code !== 0 || result.signal !== null
    assert.equal(failed, !passes, 'verifier acceptance must match independent fixture expectation')
    assert.equal(result.stdout, '', 'verifier must not print snapshot contents')
    assert.equal(result.stderr, '', 'verifier must not expose object or file contents on errors')
    const calls = (await readFile(log, 'utf8')).trim().split('\n').filter(Boolean)
    assert.ok(calls.length <= 2, 'verifier Git process count is bounded independently of inventory')
    assert.ok(!calls.includes('hash-object'), 'no per-file hash-object subprocess')
    if (passes) assert.deepEqual(calls, ['rev-parse', 'ls-tree'])
  }
  for (const algorithm of ['sha1', 'sha256']) {
    const work = join(directory, algorithm)
    const snapshot = join(directory, `${algorithm}-snapshot`)
    await mkdir(work); await mkdir(snapshot)
    const options = { cwd: work, env: isolatedEnv }
    const git = args => exec('git', args, options)
    await git(['init', '-q', '--object-format=' + algorithm])
    const contents = new Map([
      ['empty', Buffer.alloc(0)],
      ['binary', Buffer.from([0, 255, 128, 13, 10, 0, 1])],
      ['multi-chunk', Buffer.alloc(2 * 1024 * 1024 + 3, 0xa5)],
      ['duplicate', Buffer.from([0, 255, 128, 13, 10, 0, 1])],
      ['space directory/tab\tnewline\n雪', Buffer.from('CRLF\r\nno final newline')],
      ['executable', Buffer.from('#!/bin/sh\nexit 0\n')],
    ])
    for (const [file, bytes] of contents) {
      await mkdir(dirname(join(work, file)), { recursive: true })
      await writeFile(join(work, file), bytes)
    }
    await chmod(join(work, 'executable'), 0o755)
    await git(['add', '.'])
    await git(['-c', 'user.name=Verifier Test', '-c', 'user.email=verifier@example.invalid', 'commit', '-qm', 'immutable fidelity fixture'])
    const tip = (await git(['rev-parse', 'HEAD'])).stdout.trim()
    const records = (await git(['ls-tree', '-rz', '--full-tree', tip])).stdout.split('\0').filter(Boolean)
    for (const record of records) {
      const tab = record.indexOf('\t')
      const [mode, type, oid] = record.slice(0, tab).split(' ')
      const file = record.slice(tab + 1)
      assert.equal(type, 'blob')
      const { stdout: bytes } = await exec('git', ['cat-file', 'blob', oid], { ...options, encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 })
      assert.deepEqual(bytes, contents.get(file), 'raw Git bytes independently match fixture')
      await mkdir(dirname(join(snapshot, file)), { recursive: true })
      await writeFile(join(snapshot, file), bytes)
      await chmod(join(snapshot, file), mode === '100755' ? 0o755 : 0o644)
      assert.equal((await git(['hash-object', '--no-filters', '--', join(snapshot, file)])).stdout.trim(), oid)
    }
    await invoke(work, tip, snapshot, true)
    const binary = join(snapshot, 'binary')
    await writeFile(binary, Buffer.from([1, 255, 128, 13, 10, 0, 1]))
    await invoke(work, tip, snapshot, false) // same-length corruption
    await writeFile(binary, contents.get('binary').subarray(0, 3))
    await invoke(work, tip, snapshot, false) // truncation
    await writeFile(binary, contents.get('binary')); await chmod(binary, 0o644)
    await chmod(join(snapshot, 'executable'), 0o644)
    await invoke(work, tip, snapshot, false)
    await chmod(join(snapshot, 'executable'), 0o755)
    await rm(binary); await invoke(work, tip, snapshot, false)
    await symlink(join(work, 'binary'), binary); await invoke(work, tip, snapshot, false)
    await rm(binary); await mkdir(binary); await invoke(work, tip, snapshot, false)
    await rm(binary, { recursive: true }); await writeFile(binary, contents.get('binary')); await chmod(binary, 0o644)
    const nested = join(snapshot, 'space directory')
    await rm(nested, { recursive: true }); await symlink(join(work, 'space directory'), nested)
    await invoke(work, tip, snapshot, false)
    await rm(nested); await mkdir(nested)
    await writeFile(join(nested, 'tab\tnewline\n雪'), contents.get('space directory/tab\tnewline\n雪'))
    await chmod(join(nested, 'tab\tnewline\n雪'), 0o644)
    await writeFile(join(snapshot, 'extra'), 'extra')
    await invoke(work, tip, snapshot, false); await rm(join(snapshot, 'extra'))
    await mkdir(join(snapshot, 'extra-directory'))
    await invoke(work, tip, snapshot, false); await rm(join(snapshot, 'extra-directory'), { recursive: true })
    await invoke(work, tip, snapshot, false, { VERIFIER_FORMAT_PROBE: 'unsupported' })
    await invoke(work, tip, snapshot, false, { VERIFIER_FORMAT_PROBE: 'unavailable' })
    await invoke(work, '0'.repeat(tip.length), snapshot, false)
    // Deterministic fault injection exercises I/O errors and early EOF without racing a file.
    const alias = verifier.replace('openSync, readSync, readdirSync', 'openSync, readSync as actualReadSync, readdirSync')
    assert.notEqual(alias, verifier)
    await invoke(work, tip, snapshot, false, {}, `const readSync = () => { throw new Error('synthetic I/O'); };\n${alias}`)
    await invoke(work, tip, snapshot, false, {}, `const readSync = () => 0;\n${alias}`)
    const oid = (await git(['hash-object', '--no-filters', '--', join(work, 'binary')])).stdout.trim()
    const fake = join(directory, 'fake-tree')
    for (const entry of [
      Buffer.from(`120000 blob ${oid}\tunsafe-link\0`),
      Buffer.from(`160000 commit ${tip}\tgitlink\0`),
      Buffer.from(`100644 blob ${oid}\t../escape\0`),
      Buffer.from(`100644 blob ${oid}\t.git/config\0`),
      Buffer.from(`100644 blob ${oid}\tbinary\0`.repeat(2)),
      Buffer.concat([Buffer.from(`100644 blob ${oid}\t`), Buffer.from([0xff, 0])]),
      Buffer.from(`100644 blob ${oid}\tbinary`), // missing NUL terminator
    ]) {
      await writeFile(fake, entry)
      await invoke(work, tip, snapshot, false, { VERIFIER_FAKE_TREE: fake })
    }
    await invoke(work, tip, snapshot, true)
  }
  console.log('Streamed snapshot hashing: SHA-1/SHA-256, raw bytes/modes/inventory, adversarial failures and bounded Git calls: PASS')
}

try {
  await verifySnapshotHashing()
  await verifyOsvProvisioning()
  await Promise.all([mkdir(bin, { recursive: true }), mkdir(home, { recursive: true }), mkdir(join(repo, 'scripts/tests'), { recursive: true })])
  await copyFile(new URL('../security-commit-review.sh', import.meta.url), reviewScript)
  await chmod(reviewScript, 0o755)
  await mkdir(join(repo, 'scripts/lib/local-required-gate'), { recursive: true })
  await copyFile(new URL('../lib/local-required-gate/run.mjs', import.meta.url), join(repo, 'scripts/lib/local-required-gate/run.mjs'))
  await writeFile(join(repo, '.gitattributes'), 'omitted.txt export-ignore\nsubstituted.txt export-subst\n')
  await writeFile(join(repo, 'omitted.txt'), 'must-scan\n')
  await writeFile(join(repo, 'substituted.txt'), '$Format:%H$\n')
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
  [[ $(<"$target/omitted.txt") == must-scan ]]
  [[ $(<"$target/substituted.txt") == '$Format:%H$' ]]
fi
printf '%s\\n' "$record" >>"$SECURITY_TEST_LOG"
printf '%s\\n' "SYNTHETIC-PRIVATE-SCANNER-CONTENT" >&2
exit "$SECURITY_TEST_GITLEAKS_STATUS"
`)
  await writeFile(join(bin, 'osv-scanner'), `#!/usr/bin/env bash
set -eu
printf 'osv:cwd=%s:%s\\n' "$PWD" "$*" >>"$SECURITY_TEST_LOG"
found=0
while IFS= read -r -d '' file; do
  found=1
  content=$(tr -d '\\n' <"$file")
  printf 'dependency-bytes:%s:%s\\n' "$file" "$content" >>"$SECURITY_TEST_LOG"
  [[ "$content" != *REJECT_DEP* ]] || exit 2
done < <(find . -name package-lock.json -type f -print0)
[[ "$found" == 1 ]] || exit 128
if [[ -n "\${SECURITY_TEST_MUTATE_WORKTREE:-}" ]]; then
  printf 'REJECT_DEP-mutated\\n' >"$SECURITY_TEST_MUTATE_WORKTREE/package-lock.json"
  printf 'REJECT_HEADER-mutated\\n' >"$SECURITY_TEST_MUTATE_WORKTREE/vercel.json"
fi
if [[ -f staged-empty.txt ]]; then
  printf 'empty-file-bytes:%s\\n' "$(wc -c <staged-empty.txt | tr -d ' ')" >>"$SECURITY_TEST_LOG"
fi
`)
  await writeFile(join(bin, 'node'), `#!/usr/bin/env bash
set -eu
if [[ "\${1:-}" == */scripts/lib/local-required-gate/run.mjs || "\${1:-}" == --input-type=module ]]; then
  exec ${JSON.stringify(process.execPath)} "$@"
fi
printf 'node:cwd=%s:%s\\n' "$PWD" "$*" >>"$SECURITY_TEST_LOG"
content=$(tr -d '\\n' <"$1")
printf 'script-bytes:%s:%s\\n' "$1" "$content" >>"$SECURITY_TEST_LOG"
[[ "$content" != *REJECT_SCRIPT* ]] || exit 3
if [[ "$1" == scripts/tests/runtime-security-headers.mjs ]]; then
  content=$(tr -d '\\n' <vercel.json)
  printf 'header-bytes:%s\\n' "$content" >>"$SECURITY_TEST_LOG"
  [[ "$content" != *REJECT_HEADER* ]] || exit 4
fi
case "$1" in
  scripts/tests/security-review-chain.test.mjs) exit "$SECURITY_TEST_CHAIN_STATUS" ;;
  scripts/tests/runtime-security-headers.mjs) exit "$SECURITY_TEST_HEADER_STATUS" ;;
esac
`)
  await Promise.all(['gitleaks', 'osv-scanner', 'node'].map((name) => chmod(join(bin, name), 0o755)))

  await git(['init', '-q', '-b', 'main'])
  await git(['add', '.'])
  await git(['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'commit', '-qm', 'base'])
  const base = (await git(['rev-parse', 'HEAD'])).stdout.trim()

  const linkProof = join(fixture, 'archive-link-proof')
  await mkdir(linkProof)
  const externalMarker = join(fixture, 'external-marker.txt')
  const markerBytes = 'SYNTHETIC-EXTERNAL-ARCHIVE-CONTENT\n'
  await writeFile(externalMarker, markerBytes)
  for (const [name, target] of [['absolute', externalMarker], ['relative', '../external-marker.txt'], ['dangling', '../missing-marker.txt']]) {
    const source = join(linkProof, `${name}-source`)
    const destination = join(linkProof, `${name}-copy`)
    await symlink(target, source)
    await copyArchiveEntry(source, destination)
    assert.ok((await lstat(destination)).isSymbolicLink(), 'archive copy must not materialize external bytes')
    assert.equal(await readlink(destination), target, 'archive copy must preserve the exact link target')
  }
  assert.equal(await readFile(externalMarker, 'utf8'), markerBytes)
  await assert.rejects(copyArchiveEntry(linkProof, join(fixture, 'unsupported-copy')), /Unsupported archive source entry type/)
  console.log('Archive entry fidelity: absolute/relative/dangling symlinks preserved; unsupported types rejected')

  if (callerBefore.kind === 'git') {
    // Run the exact current suite and tracked source without Git metadata, as
    // security_policy_contract does in each immutable all/push snapshot.
    const archive = join(fixture, 'archive-source')
    await mkdir(archive)
    for (const [file, hash] of Object.entries(callerBefore.files)) {
      if (hash === null) continue
      const target = join(archive, file)
      await mkdir(dirname(target), { recursive: true })
      await copyArchiveEntry(join(sourceRoot, file), target)
    }
    const result = await exec(process.execPath, [join(archive, 'scripts/tests/security-review-chain.test.mjs')], {
      cwd: archive,
      env: isolatedEnv,
      timeout: 120_000,
    })
    assert.match(result.stdout, /security review chain contract: PASS/)
    assert.match(result.stdout, /Caller source kind: archive/)
    console.log('Metadata-free archive suite: PASS')
    console.log(result.stdout.trim())
    // Present-but-invalid metadata must never silently become archive mode.
    await writeFile(join(archive, '.git'), 'gitdir: missing-metadata\n')
    await assert.rejects(exec(process.execPath, [join(archive, 'scripts/tests/security-review-chain.test.mjs')], {
      cwd: archive, env: isolatedEnv, timeout: 120_000,
    }), error => {
      assert.match(error.stderr, /Cannot establish caller Git state/)
      return true
    })
    console.log('Broken Git source metadata: rejected (not archive mode)')
  }

  const linked = join(fixture, 'linked')
  await git(['worktree', 'add', '--detach', linked, base])
  assert.ok((await lstat(join(linked, '.git'))).isFile(), 'fixture must be a genuine linked worktree')
  const privateMarker = 'SYNTHETIC-PRIVATE-SCANNER-CONTENT'
  for (const [label, cwd, override] of [
    ['ordinary default', repo, false],
    ['linked default', linked, false],
    ['explicit override', linked, true],
  ]) {
    await writeFile(join(cwd, 'tracked.txt'), `${privateMarker}\n`)
    await run('git', ['add', 'tracked.txt'], { cwd })
    const env = { ...isolatedEnv, SECURITY_TEST_GITLEAKS_STATUS: '23' }
    delete env.SECURITY_REVIEW_EVIDENCE_DIR
    const metadata = (await run('git', ['rev-parse', '--absolute-git-dir'], { cwd })).stdout.trim()
    const destination = override ? join(fixture, 'explicit-evidence') : join(metadata, 'security-review')
    if (override) env.SECURITY_REVIEW_EVIDENCE_DIR = destination
    let failure
    try { await runReview('staged', '', env, cwd) } catch (error) { failure = error }
    assert.equal(failure?.code, 1, `${label}: failure must stay nonzero`)
    const output = failure.stdout + failure.stderr
    assert.match(output, /\[FAIL\] Secrets scan/)
    assert.match(output, /Security review blocked this staged with 1 failing gate/)
    assert.ok(output.includes(privateMarker), 'stub raw output must exist to test evidence exclusion')
    assert.ok(output.includes(`Redacted evidence packet: ${destination}/`))
    assert.equal((await lstat(destination)).mode & 0o777, 0o700)
    const packets = (await readdir(destination)).filter(name => name.startsWith('evidence-'))
    assert.equal(packets.length, 1)
    const packetPath = join(destination, packets[0])
    assert.equal((await lstat(packetPath)).mode & 0o777, 0o600)
    const packet = await readFile(packetPath, 'utf8')
    assert.match(packet, /^security-review-evidence-v1\nmode=staged\ncommit=[0-9a-f]+\ncreated_utc=[^\n]+\nfailed_gates_begin\nSecrets scan\nfailed_gates_end\nfiles_in_scope_begin\ntracked\.txt\nfiles_in_scope_end\n$/)
    assert.ok(packet.length < 1024)
    assert.ok(!packet.includes(privateMarker), 'no file contents or raw scanner output in evidence')
    await run('git', ['reset', '--hard', 'HEAD'], { cwd })
    console.log(`Evidence contract: ${label} PASS (nonzero, named gate, metadata only, private permissions)`)
  }
  const nonrepo = join(fixture, 'nonrepo')
  const invalid = join(fixture, 'invalid')
  await mkdir(nonrepo)
  await mkdir(invalid)
  await writeFile(join(invalid, '.git'), 'gitdir: missing-metadata\n')
  for (const cwd of [nonrepo, invalid]) {
    const env = { ...isolatedEnv }
    delete env.SECURITY_REVIEW_EVIDENCE_DIR
    await clearLog()
    await assert.rejects(runReview('staged', '', env, cwd), error => {
      assert.equal(error.code, 1)
      assert.match(error.stderr, /cannot establish Git repository metadata/)
      assert.doesNotMatch(error.stdout, /Launching|Redacted evidence packet|Security review passed/)
      return true
    })
    assert.deepEqual(await scannerLines(), [], 'invalid repository must fail before scanner invocation')
    console.log(`Evidence contract: ${cwd === nonrepo ? 'nonrepository' : 'invalid metadata'} rejected before scanning`)
  }

  // Workflow changes select policy checks without broadening dependency scope.
  for (const filename of ['webpack.yml', 'webpack.yaml', 'unrelated.yml']) {
    await git(['reset', '--hard', 'HEAD'])
    await mkdir(join(repo, '.github/workflows'), { recursive: true })
    const file = `.github/workflows/${filename}`
    await writeFile(join(repo, file), 'name: scoped fixture\n')
    await git(['add', file])
    await clearLog()
    await runReview('staged')
    const records = await scannerLines()
    assert.equal(occurrences(records, 'node:cwd='), filename.startsWith('webpack.') ? 2 : 0, `${filename} policy scope`)
    assert.ok(!records.some(line => line.startsWith('osv:')), 'workflow-only change does not broaden dependency scope')
  }
  await git(['reset', '--hard', 'HEAD'])

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
  assert.ok(lines.join('\n').includes('dependency-bytes:./odd\nname/package-lock.json:{"lockfileVersion":3}'), 'newline path staged bytes are scanned')

  await git(['reset', '--hard', 'HEAD'])
  await writeFile(join(repo, 'vercel.json'), '{"headers":[]}\n')
  await git(['add', 'vercel.json'])
  const policyFunctions = ['staged_scope_matches', 'security_policy_contract', 'run_gate_worker', 'secret_scan', 'scan_target_label']
    .map((name) => {
      const match = script.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'))
      assert.ok(match, `production ${name} function must be available`)
      return match[0]
    }).join('\n')
  for (const [chainStatus, headerStatus] of [[23, 0], [0, 24], [23, 24], [0, 0]]) {
    const env = {
      ...isolatedEnv,
      SECURITY_TEST_CHAIN_STATUS: String(chainStatus),
      SECURITY_TEST_HEADER_STATUS: String(headerStatus),
    }
    const expectedStatus = chainStatus || headerStatus
    const expectedLabel = expectedStatus ? 'FAIL' : 'PASS'
    const context = `set -euo pipefail
MODE=staged
gate_temp_dir="$TMPDIR"
staged_snapshot="$PWD"
gate_total=6
bold= reset= dim= green= red=
${policyFunctions}
`
    // Exercise the raw gate in a conditional, just as the worker does: errexit
    // must not be relied on to propagate a failing contract child.
    const raw = await run('bash', ['-c', `${context}
if security_policy_contract; then status=0; else status=$?; fi
printf 'gate-status=%s\\n' "$status"
`], { env })
    assert.match(raw.stdout, new RegExp(`gate-status=${expectedStatus}\\n`))
    const worker = await run('bash', ['-c', `${context}
if run_gate_worker 5 'Security policy contract' 'synthetic child statuses' security_policy_contract; then status=0; else status=$?; fi
printf 'worker-status=%s\\n' "$status"
`], { env })
    assert.match(worker.stdout, new RegExp(`worker-status=${expectedStatus ? 1 : 0}\\n`))
    assert.match(worker.stdout + worker.stderr, new RegExp(`  ${expectedLabel} Security policy contract`))

    await clearLog()
    let result
    try {
      result = { ...await runReview('staged', '', env), code: 0 }
    } catch (error) {
      result = error
    }
    assert.equal(result.code, expectedStatus ? 1 : 0, `wrapper status for children ${chainStatus},${headerStatus}`)
    const output = result.stdout + result.stderr
    assert.ok(output.includes(`[${expectedLabel}] Security policy contract`), 'summary must reflect child failures')
    assert.match(output, expectedStatus ? /Security review blocked this staged with 1 failing gate/ : /Security review passed for commit: staged diff/)
    assert.doesNotMatch(output, /contract tests not needed/, 'staged policy selection must run the contracts')
    const contractCalls = (await scannerLines()).filter((line) => line.startsWith('node:'))
    assert.equal(contractCalls.length, chainStatus ? 1 : 2, 'stop at the first failing child')
    assert.ok(contractCalls[0].endsWith(':scripts/tests/security-review-chain.test.mjs'))
    if (!chainStatus) assert.ok(contractCalls[1].endsWith(':scripts/tests/runtime-security-headers.mjs'))
  }

  for (const scannerStatus of [0, 1, 2, 23]) {
    const env = { ...isolatedEnv, SECURITY_TEST_GITLEAKS_STATUS: String(scannerStatus) }
    const expectedLabel = scannerStatus ? 'FAIL' : 'PASS'
    const context = `set -euo pipefail
MODE=staged
gate_total=6
bold= reset= dim= green= red=
${policyFunctions}
`
    const raw = await run('bash', ['-c', `${context}
if secret_scan; then status=0; else status=$?; fi
printf 'gate-status=%s\\n' "$status"
`], { env })
    assert.match(raw.stdout, new RegExp(`gate-status=${scannerStatus}\\n`))
    const worker = await run('bash', ['-c', `${context}
if run_gate_worker 1 'Secrets scan' 'synthetic scanner status' secret_scan; then status=0; else status=$?; fi
printf 'worker-status=%s\\n' "$status"
`], { env })
    assert.match(worker.stdout, new RegExp(`worker-status=${scannerStatus ? 1 : 0}\\n`))
    assert.match(worker.stdout + worker.stderr, new RegExp(`  ${expectedLabel} Secrets scan`))

    await clearLog()
    let result
    try {
      result = { ...await runReview('staged', '', env), code: 0 }
    } catch (error) {
      result = error
    }
    assert.equal(result.code, scannerStatus ? 1 : 0, `wrapper status for scanner ${scannerStatus}`)
    const output = result.stdout + result.stderr
    assert.ok(output.includes(`[${expectedLabel}] Secrets scan`), 'summary must reflect scanner failure')
    assert.match(output, scannerStatus ? /Security review blocked this staged with 1 failing gate/ : /Security review passed for commit: staged diff/)
    for (const text of [raw.stdout + raw.stderr, worker.stdout + worker.stderr, output]) {
      if (scannerStatus) {
        assert.doesNotMatch(text, /no staged secrets detected|PASS[^\n]*Secrets scan|Security review passed/)
      } else {
        assert.match(text, /no staged secrets detected/)
      }
    }
    const scannerCalls = (await scannerLines()).filter((line) => line.startsWith('gitleaks:'))
    assert.deepEqual(scannerCalls, ['gitleaks:git --staged --redact --no-banner --log-level warn .'], 'staged scan retains redaction and runs exactly once')
  }

  // A-03: prove bytes, containment, and no caller Git/worktree mutation.
  const snapshotEnv = { ...isolatedEnv, SECURITY_REVIEW_EVIDENCE_DIR: join(fixture, 'a03-evidence') }
  async function checkSnapshot(expectedFailure = null, env = snapshotEnv, preserveWorktree = true) {
    const before = await callerGitState(repo, false)
    assert.ok(before, 'fixture Git state must be measurable')
    const worktreeBefore = await hashTree(repo, true)
    await clearLog()
    if (expectedFailure) {
      await assert.rejects(runReview('staged', '', env), (error) => {
        assert.equal(error.code, 1)
        assert.ok((error.stdout + error.stderr).includes(expectedFailure))
        return true
      })
    } else {
      await runReview('staged', '', env)
    }
    assert.deepEqual(await callerGitState(repo, false), before, 'snapshot must preserve index bytes, objects, refs, HEAD and config')
    if (preserveWorktree) assert.equal(await hashTree(repo, true), worktreeBefore, 'snapshot must preserve tracked and untracked files')
    const records = await scannerLines()
    const directories = [...new Set(records.filter((line) => /^(osv|node):cwd=/.test(line)).map((line) => line.split(':cwd=')[1].split(':')[0]))]
    if (directories.length) {
      assert.equal(directories.length, 1, 'all scoped readers share one snapshot')
      assert.notEqual(directories[0], repo)
      await assert.rejects(lstat(directories[0]), { code: 'ENOENT' }, 'snapshot cleaned on success/failure')
    }
    return records.join('\n')
  }
  for (const [file, rejected, gate, marker] of [
    ['package-lock.json', 'REJECT_DEP', 'Dependency vulnerability audit', 'dependency-bytes:./package-lock.json:'],
    ['vercel.json', 'REJECT_HEADER', 'Security policy contract', 'header-bytes:'],
    ['scripts/tests/security-review-chain.test.mjs', 'REJECT_SCRIPT_POLICY', 'Security policy contract', 'script-bytes:scripts/tests/security-review-chain.test.mjs:'],
    ['scripts/tests/runtime-security-headers.mjs', 'REJECT_SCRIPT_HEADERS', 'Security policy contract', 'script-bytes:scripts/tests/runtime-security-headers.mjs:'],
  ]) {
    for (const stagedBad of [true, false]) {
      await git(['reset', '--hard', 'HEAD'])
      const staged = stagedBad ? rejected : `SAFE_INDEX_${rejected}`.replace('REJECT_', '')
      const working = stagedBad ? 'SAFE_WORKTREE' : rejected
      await writeFile(join(repo, file), staged + '\n')
      await git(['add', file])
      await writeFile(join(repo, file), working + '\n')
      if (file === 'package-lock.json' && stagedBad) {
        // Negative control reproduces pre-A03 mutable-reader behavior only in
        // the disposable script: the new byte/status assertions must catch it.
        const legacyReaders = script.replaceAll('(cd "$staged_snapshot" &&', '(cd "$ROOT" &&')
        assert.notEqual(legacyReaders, script)
        await writeFile(reviewScript, legacyReaders)
        try {
          await clearLog()
          await runReview('staged', '', snapshotEnv)
          const legacyRecords = (await scannerLines()).join('\n')
          assert.ok(legacyRecords.includes(marker + working), 'old reader incorrectly accepts worktree bytes')
          assert.ok(!legacyRecords.includes(marker + staged), 'negative control cannot satisfy exact-index assertion')
        } finally {
          await writeFile(reviewScript, script)
        }
      }
      await mkdir(join(repo, 'untracked-dependency'), { recursive: true })
      await writeFile(join(repo, 'untracked-dependency/package-lock.json'), 'REJECT_DEP-untracked\n')
      const records = await checkSnapshot(stagedBad ? `[FAIL] ${gate}` : null)
      assert.ok(records.includes(marker + staged), 'scanner consumes exact staged content')
      assert.ok(!records.includes(marker + working), 'scanner never consumes divergent working content')
      assert.ok(!records.includes('REJECT_DEP-untracked'))
    }
  }

  await git(['reset', '--hard', 'HEAD'])
  for (const [file, content] of [['package-lock.json', 'SAFE_FROZEN_DEP'], ['vercel.json', 'SAFE_FROZEN_HEADER']]) {
    await writeFile(join(repo, file), content + '\n')
    await git(['add', file])
  }
  let records = await checkSnapshot(null, { ...snapshotEnv, SECURITY_TEST_MUTATE_WORKTREE: repo }, false)
  assert.ok(records.includes('dependency-bytes:./package-lock.json:SAFE_FROZEN_DEP'))
  assert.ok(records.includes('header-bytes:SAFE_FROZEN_HEADER'))
  assert.equal(await readFile(join(repo, 'vercel.json'), 'utf8'), 'REJECT_HEADER-mutated\n', 'only disposable scanner fixture intentionally mutates worktree')

  await git(['reset', '--hard', 'HEAD'])
  await mkdir(join(repo, 'space directory'), { recursive: true })
  await git(['mv', 'package-lock.json', 'space directory/package-lock.json'])
  await writeFile(join(repo, 'package-lock.json'), 'REJECT_DEP-resurrected\n')
  records = await checkSnapshot()
  assert.ok(records.includes('dependency-bytes:./space directory/package-lock.json:{}'))
  assert.ok(!records.includes('REJECT_DEP-resurrected'))
  await git(['rm', '-f', 'space directory/package-lock.json'])
  await checkSnapshot('[FAIL] Dependency vulnerability audit') // no dependency sources: fail closed

  await git(['reset', '--hard', 'HEAD'])
  records = await checkSnapshot()
  assert.equal(records, '', 'empty staged diff launches no scoped scanner/contract')
  await writeFile(join(repo, 'tracked.txt'), 'plain change\n')
  await git(['add', 'tracked.txt'])
  records = await checkSnapshot()
  assert.ok(!records.includes('osv:') && !records.includes('node:'), 'non-governing change keeps scope filters')

  // Intent-only entries must never be fabricated as committed empty files.
  // Include deleted governing paths recreated as intent entries: comparing only
  // cached filenames would miss the different deletion/modification semantics.
  for (const candidate of ['candidate.txt', 'new dependency/package-lock.json', 'vercel.json', 'scripts/tests/security-review-chain.test.mjs']) {
    await git(['reset', '--hard', 'HEAD'])
    await writeFile(join(repo, 'package-lock.json'), '{"staged":"governing-change"}\n')
    await git(['add', 'package-lock.json'])
    if (['vercel.json', 'scripts/tests/security-review-chain.test.mjs'].includes(candidate)) {
      await git(['rm', '--cached', candidate])
    }
    await mkdir(dirname(join(repo, candidate)), { recursive: true })
    await writeFile(join(repo, candidate), 'intent-worktree-content\n')
    await git(['add', '--intent-to-add', candidate])
    await checkSnapshot('intent-to-add index entries are unsupported', { ...snapshotEnv, TMPDIR: fixture })
    assert.deepEqual(await scannerLines(), [], 'intent rejection must precede every scanner/contract')
    assert.deepEqual((await readdir(fixture)).filter((name) => name.startsWith('security-review.')), [], 'early rejection cleans private index and temporary tree')
  }
  await git(['reset', '--hard', 'HEAD'])
  await writeFile(join(repo, 'staged-empty.txt'), '')
  await writeFile(join(repo, 'package-lock.json'), '{"staged":"empty-file-control"}\n')
  await git(['add', 'staged-empty.txt', 'package-lock.json'])
  await writeFile(join(repo, 'staged-empty.txt'), 'unstaged nonempty bytes must not be read\n')
  records = await checkSnapshot()
  assert.ok(records.includes('empty-file-bytes:0'), 'genuine staged empty file remains present with exact zero bytes')
  assert.ok(records.includes('dependency-bytes:./package-lock.json:{"staged":"empty-file-control"}'))

  // Malicious symlinks never reach a reader or materializer; no target access.
  await git(['reset', '--hard', 'HEAD'])
  await run('ln', ['-s', '../outside-sentinel', 'escape'])
  await writeFile(join(fixture, 'outside-sentinel'), 'untouched\n')
  await git(['add', 'escape'])
  await checkSnapshot('unsupported staged entry')
  assert.equal(await readFile(join(fixture, 'outside-sentinel'), 'utf8'), 'untouched\n')
  assert.deepEqual(await scannerLines(), [])

  await git(['reset', '--hard', 'HEAD'])
  await assert.rejects(git(['-c', 'user.name=Security Test', '-c', 'user.email=security-test@example.invalid', 'merge', 'main']), 'disposable branches must conflict')
  await checkSnapshot('unresolved or unsupported staged entry')
  assert.deepEqual(await scannerLines(), [])

  const unborn = join(fixture, 'unborn')
  await mkdir(unborn)
  await run('git', ['init', '-q'], { cwd: unborn })
  await writeFile(join(unborn, 'package-lock.json'), '{}\n')
  await run('git', ['add', '.'], { cwd: unborn })
  const unbornIndex = await readFile(join(unborn, '.git/index'))
  await assert.rejects(runReview('staged', '', snapshotEnv, unborn), (error) => {
    assert.equal(error.code, 1)
    assert.match(error.stderr, /unborn staged review is unsupported/)
    return true
  })
  assert.deepEqual(await readFile(join(unborn, '.git/index')), unbornIndex)

  await git(['reset', '--hard', 'HEAD'])
  await writeFile(join(repo, 'tracked.txt'), 'mutable-worktree\n')
  await clearLog()
  await runReview('all')
  let allLines = await scannerLines()
  assert.equal(allLines.filter((line) => line.startsWith('gitleaks:dir ')).length, 1, 'all mode performs one exact HEAD snapshot scan')
  assert.ok(allLines.some((line) => line.includes('content=side-tip')), 'all mode excludes mutable worktree content')
  assert.equal(occurrences(allLines, 'osv:'), 1, 'all mode audits the exact HEAD snapshot')
  assert.equal(occurrences(allLines, 'node:'), 2, 'all mode runs both contracts from archived HEAD')
  await git(['reset', '--hard', 'HEAD'])

  await writeFile(join(repo, 'scripts/lib/local-required-gate/run.mjs'), 'process.exit(0)\n')
  await clearLog()
  await assert.rejects(runReview('all'), 'a helper claiming success with an incomplete snapshot must block review')
  assert.deepEqual(await scannerLines(), [], 'no scanner may run after incomplete materialization')
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
  const callerAfter = await callerGitState()
  console.log(`Caller state after: ${stateFingerprint(callerAfter)}`)
  assert.deepEqual(callerAfter, callerBefore, 'contract test must not change caller files, index, config, HEAD, refs, or object database')
}

console.log('security review chain contract: PASS (caller git state unchanged)')
