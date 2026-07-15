import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

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

console.log('security review chain contract: PASS')
