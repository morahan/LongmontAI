import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, renameSync, mkdirSync, symlinkSync, existsSync, realpathSync, accessSync, statSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

import { digest, hashPath, sourceIdentity, attestedPath, containedPath, bindOsvCache } from './local-ci-evidence.mjs';

export const RUNTIME_POLICY = Object.freeze([
  Object.freeze({ major: 22, node: 'v22.20.0', npm: '10.9.3' }),
  Object.freeze({ major: 24, node: 'v24.16.0', npm: '10.9.3' }),
]);
export function assertRuntime(policy, nodeVersion, npmVersion) {
  if (nodeVersion !== policy.node || npmVersion !== policy.npm) throw Error(`Runtime policy requires Node ${policy.node} / npm ${policy.npm}`);
}

// Resolve once before dependency installation changes lifecycle PATH. These are
// selected executable paths, not a claim of distribution attestation or isolation.
export function resolveSecurityExecutables(path) {
  if (typeof path !== 'string' || !path) throw Error('Preflight PATH is required for scanner selection');
  const executables = {};
  for (const name of ['gitleaks', 'osv-scanner', 'codex']) {
    for (const directory of path.split(delimiter)) {
      try {
        const executable = realpathSync(resolve(directory || '.', name));
        accessSync(executable, constants.X_OK);
        if (!statSync(executable).isFile()) continue;
        executables[name] = executable;
        break;
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'EACCES', 'ELOOP'].includes(error.code)) throw error;
      }
    }
    if (!executables[name]) throw Error(`Required executable unavailable at preflight: ${name}`);
  }
  return Object.freeze(executables);
}

// Critical scans must not enter npm lifecycle PATH before shell/Node selection.
export function criticalSecurityLaunch(kind, lane, nodeEnv, sha) {
  if (kind === 'matrix') return ['/bin/bash', [join(lane, 'scripts/security-commit-review.sh'), 'all'], lane, { ...nodeEnv, SECURITY_COMMIT_AGENT_REVIEW: '0' }];
  if (kind === 'extended') return ['/bin/bash', [join(lane, 'scripts/local-ci.sh')], lane, { ...nodeEnv, LOCAL_CI_REVIEW_SHA: sha }];
  throw Error('Unknown critical security launch');
}

export function assertCleanSarif(report, expectedRules) {
  if (report.version !== '2.1.0' || !Array.isArray(report.runs) || !report.runs.length) throw Error('Invalid SARIF');
  for (const run of report.runs) {
    if (run.tool?.driver?.name !== 'CodeQL' || !run.tool?.driver?.rules?.length || !run.invocations?.length ||
        run.invocations.some(i => i.executionSuccessful !== true || i.toolExecutionNotifications?.some(n => n.level === 'error' || n.descriptor?.id === 'js/diagnostics/extraction-errors')) ||
        !Array.isArray(run.results) || run.results.length ||
        !run.properties?.metricResults?.some(m => m.ruleId === 'js/summary/lines-of-user-code' && m.value > 0)) {
      throw Error('CodeQL findings, errors, or incomplete analysis');
    }
    if (expectedRules && JSON.stringify(run.tool.driver.rules.map(r => r.id).sort()) !== JSON.stringify([...expectedRules].sort())) throw Error('Unexpected CodeQL query coverage');
  }
}
export function queryId(source) {
  const match = source.match(/@id\s+(\S+)/);
  if (!match) throw Error('Query missing identity');
  return match[1];
}
export function assertNoWorkflows(paths) {
  if (paths.some(p => /^\.github\/workflows\/.*\.ya?ml$/i.test(p))) throw Error('Hosted workflows remain; cutover is not complete');
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] === '--final' ? (args.shift(), 'final') : 'pre-cutover';
  const started = new Date().toISOString();
  const policyFiles = ['local-ci.sh', 'local-ci.mjs', 'local-ci-evidence.mjs'];
  const callerPolicy = digest(policyFiles.map(p => digest(readFileSync(join(dirname(fileURLToPath(import.meta.url)), p)))).join('\n'));
  if (args.length > 1 || (args[0] && !/^[a-f0-9]{40}$/.test(args[0]))) throw Error('Usage: node scripts/local-ci.mjs [--final] [full-commit-sha]');
  for (const key of ['SECURITY_COMMIT_BREAK_GLASS', 'SECURITY_COMMIT_SKIP', 'SECURITY_COMMIT_AUTO_FIX']) {
    if (process.env[key] && process.env[key] !== '0') throw Error(`${key} forbidden in local CI`);
  }
  const git = (...a) => {
    const r = spawnSync('git', a, { encoding: 'utf8' });
    if (r.status !== 0) throw Error('Cannot establish Git state');
    return r.stdout.trim();
  };
  const root = git('rev-parse', '--show-toplevel');
  process.chdir(root);
  const sha = git('rev-parse', 'HEAD');
  const clean = () => {
    if (git('status', '--porcelain=v1', '--untracked-files=all') || git('rev-parse', 'HEAD') !== sha) throw Error('Dirty tree or HEAD drift');
  };
  clean();
  if (args[0] && args[0] !== sha) throw Error('Requested SHA must equal checked-out HEAD');
  const workflows = git('ls-tree', '-r', '--name-only', sha, '.github/workflows').split('\n').filter(Boolean);
  if (mode === 'final') assertNoWorkflows(workflows);
  const base = process.env.LOCAL_CI_BASE_SHA;
  if (!/^[a-f0-9]{40}$/.test(base || '') || git('rev-parse', `${base}^{commit}`) !== base) throw Error('Exact locally provable LOCAL_CI_BASE_SHA required');
  const evidence = mkdtempSync(join(tmpdir(), 'longmont-local-ci-'));
  console.log(`Local CI evidence (private, never upload raw logs): ${evidence}`);
  const env = { ...process.env, CI: 'true', SECURITY_COMMIT_AUTO_FIX: '0', SECURITY_COMMIT_AGENT_REVIEW: '1', SECURITY_COMMIT_BREAK_GLASS: '0' };
  // Never pass GitHub publication credentials to verification children.
  for (const key of Object.keys(env)) if (/^(GH_|GITHUB_|CODEQL_|GIT_CONFIG|GIT_DIR$|GIT_WORK_TREE$|GIT_INDEX_FILE$)/.test(key)) delete env[key];
  const gates = [];
  const snapshots = new Set();
  function run(name, command, argv, cwd = root, childEnv = env) {
    if (snapshots.has(cwd)) sourceIdentity(cwd, sha);
    const log = join(evidence, `${gates.length}-${name}.log`);
    const result = spawnSync(command, argv, { cwd, env: childEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    writeFileSync(log, (result.stdout || '') + (result.stderr || ''), { mode: 0o600 });
    if (result.error || result.status !== 0) throw Error(`${name} failed; private log: ${log}`);
    if (snapshots.has(cwd)) sourceIdentity(cwd, sha);
    gates.push({ name, status: 'passed', command, args: argv, log: log.slice(evidence.length + 1), sha256: digest(readFileSync(log)) });
    console.log(`PASS ${name}`);
    return result.stdout.trim();
  }
  const manifestPath = process.env.LOCAL_CI_TOOL_MANIFEST;
  if (!manifestPath?.startsWith('/')) throw Error('Owner-approved absolute LOCAL_CI_TOOL_MANIFEST required');
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  for (const key of ['codeql', 'packs', 'zizmor', 'osvCache']) {
    if (!manifest[key]?.path?.startsWith('/') || !/^[a-f0-9]{64}$/.test(manifest[key].sha256)) throw Error(`Unverified tool/cache identity: ${key}`);
    attestedPath(manifest[key].path, ['codeql', 'packs'].includes(key) ? 'directory' : 'file');
    if (hashPath(manifest[key].path) !== manifest[key].sha256) throw Error(`Unverified tool/cache identity: ${key}`);
  }
  const cache = bindOsvCache(manifest.osvCache, evidence);
  env.OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY = cache.root;
  const codeql = attestedPath(join(manifest.codeql.path, 'codeql'), 'file');
  const zizmor = attestedPath(manifest.zizmor.path, 'file');
  const securityExecutables = resolveSecurityExecutables(env.PATH);
  Object.assign(env, {
    LOCAL_CI_SECURITY_BOUND: '1',
    LOCAL_CI_GITLEAKS: securityExecutables.gitleaks,
    LOCAL_CI_OSV_SCANNER: securityExecutables['osv-scanner'],
    LOCAL_CI_CODEX: securityExecutables.codex,
  });
  const versions = {};
  for (const [tool, expected] of [['codeql', '2.27.0'], ['zizmor', '1.26.1'], ['gitleaks', '8.30.1'], ['osv-scanner', '2.3.6'], ['codex', null]]) {
    versions[tool] = run(`version-${tool}`, tool === 'codeql' ? codeql : tool === 'zizmor' ? zizmor : securityExecutables[tool], tool === 'codeql' || tool === 'gitleaks' ? ['version'] : ['--version']);
    if (expected && !new RegExp(`\\b${expected.replaceAll('.', '\\.')}\\b`).test(versions[tool])) throw Error(`Unexpected ${tool} version`);
  }
  const suite = containedPath(resolve(process.env.LOCAL_CI_CODEQL_SUITE || ''), manifest.packs.path);
  if (!suite.endsWith('/codeql/javascript-queries/2.4.5/codeql-suites/javascript-security-extended.qls')) throw Error('Pinned CodeQL 2.4.5 security-extended suite required');
  const packRoot = attestedPath(manifest.packs.path, 'directory');
  const search = [`--search-path=${dirname(dirname(suite))}`, `--common-caches=${join(evidence, 'codeql-cache')}`];
  const suiteDigest = digest(readFileSync(suite));
  const inventory = JSON.parse(run('query-inventory', codeql, ['resolve', 'queries', suite, '--format=json', ...search]));
  if (!Array.isArray(inventory) || !inventory.length) throw Error('Invalid resolved queries');
  const owners = new Set();
  for (const query of inventory) {
    containedPath(query, packRoot);
    let owner = dirname(query);
    while (!existsSync(join(owner, 'qlpack.yml'))) { owner = dirname(owner); containedPath(owner, packRoot); }
    owners.add(owner);
  }
  const dependencies = [];
  for (const owner of owners) {
    const resolution = JSON.parse(run(`query-dependencies-${dependencies.length}`, codeql, ['resolve', 'library-path', `--dir=${owner}`, '--format=json', '--no-default-compilation-cache', ...search]));
    if (!resolution.libraryPath?.length || !resolution.dbscheme) throw Error('Missing resolved CodeQL dependencies');
    for (const path of [...resolution.libraryPath, resolution.dbscheme]) containedPath(path, packRoot);
    dependencies.push({ owner, resolution });
  }
  writeFileSync(join(evidence, 'query-dependencies.json'), JSON.stringify(dependencies, null, 2), { mode: 0o600 });
  const rules = inventory.map(p => queryId(readFileSync(p, 'utf8')));
  writeFileSync(join(evidence, 'query-inventory.json'), JSON.stringify(inventory.map((p, i) => ({ path: p.slice(packRoot.length + 1), id: rules[i], sha256: digest(readFileSync(p)) })), null, 2), { mode: 0o600 });
  const npmCli = process.env.LOCAL_CI_NPM_CLI;
  if (!npmCli?.startsWith('/')) throw Error('Absolute LOCAL_CI_NPM_CLI for pinned npm required');
  attestedPath(npmCli, 'file');
  attestedPath(dirname(dirname(npmCli)), 'directory');
  const npmIdentity = hashPath(dirname(dirname(npmCli)));
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
  const nodes = RUNTIME_POLICY.map(policy => {
    const { major } = policy;
    const bin = process.env[`LOCAL_CI_NODE${major}_BIN`];
    if (!bin?.startsWith('/')) throw Error(`LOCAL_CI_NODE${major}_BIN must be an absolute bin directory`);
    const executable = attestedPath(join(bin, 'node'), 'file');
    const wrapperBin = join(evidence, `runtime-${major}`);
    mkdirSync(wrapperBin, { mode: 0o700 });
    symlinkSync(executable, join(wrapperBin, 'node'));
    const npm = join(wrapperBin, 'npm');
    writeFileSync(npm, `#!/bin/sh\nexec ${quote(executable)} ${quote(npmCli)} "$@"\n`, { mode: 0o700 });
    const nodeEnv = { ...env, PATH: `${wrapperBin}:${bin}:${env.PATH}` };
    const version = run(`node-${major}`, executable, ['--version'], root, nodeEnv);
    const npmVersion = run(`npm-${major}`, npm, ['--version'], root, nodeEnv);
    assertRuntime(policy, version, npmVersion);
    return { major, version, npmVersion, npm, executable, executableDigest: digest(readFileSync(executable)), env: nodeEnv };
  });
  // No hardlinks, alternates, hooks, remote credentials or mutable caller files.
  const source = join(evidence, 'source');
  run('snapshot', 'git', ['clone', '--no-hardlinks', '--no-checkout', '--local', root, source]);
  run('checkout', 'git', ['-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', sha], source);
  if (callerPolicy !== digest(policyFiles.map(p => digest(readFileSync(join(source, 'scripts', p)))).join('\n'))) throw Error('Coordinator is not the requested SHA policy');
  const identity = sourceIdentity(source, sha);
  const packagePolicy = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  if (packagePolicy.packageManager !== 'npm@10.9.3' || packagePolicy.engines?.node !== '>=22.12.0 <25' || readFileSync(join(source, '.nvmrc'), 'utf8').trim() !== '22.20.0') throw Error('Package/runtime policy mismatch');
  snapshots.add(source);
  writeFileSync(join(evidence, 'workflow-policy.json'), JSON.stringify({ mode, workflows }), { mode: 0o600 });
  gates.push({ name: 'workflow-policy', status: 'passed', log: 'workflow-policy.json', sha256: digest(readFileSync(join(evidence, 'workflow-policy.json'))) });
  if (workflows.length) run('zizmor', zizmor, ['--offline', '--persona', 'pedantic', '--min-severity', 'medium', '--min-confidence', 'medium', '.github/workflows'], source);
  const database = join(evidence, 'codeql-db');
  run('codeql-create', codeql, ['database', 'create', database, '--language=javascript-typescript', `--source-root=${source}`], source);
  const sarif = join(evidence, 'codeql.sarif');
  run('codeql-analyze', codeql, ['database', 'analyze', database, suite, '--format=sarifv2.1.0', `--output=${sarif}`, '--threads=2', '--no-default-compilation-cache', ...search], source);
  assertCleanSarif(JSON.parse(readFileSync(sarif, 'utf8')), rules.filter(id => !id.startsWith('js/diagnostics/')));
  for (const node of nodes) {
    const lane = join(evidence, `node-${node.major}-source`);
    run(`snapshot-${node.major}`, 'git', ['clone', '--no-hardlinks', '--no-checkout', '--local', source, lane]);
    run(`checkout-${node.major}`, 'git', ['-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', sha], lane);
    sourceIdentity(lane, sha); snapshots.add(lane);
    const npm = node.npm;
    run(`install-${node.major}`, npm, ['ci', '--ignore-scripts'], lane, node.env);
    run(`security-${node.major}`, ...criticalSecurityLaunch('matrix', lane, node.env, sha));
    run(`lint-${node.major}`, npm, ['run', 'lint'], lane, node.env);
    run(`build-${node.major}`, npm, ['run', 'build'], lane, node.env);
    if (node.major === 22) run('extended-local-gates', ...criticalSecurityLaunch('extended', lane, node.env, sha));
  }
  clean();
  attestedPath(dirname(dirname(npmCli)), 'directory');
  if (npmIdentity !== hashPath(dirname(dirname(npmCli)))) throw Error('npm distribution drift');
  for (const node of nodes) {
    attestedPath(node.executable, 'file');
    if (node.executableDigest !== digest(readFileSync(node.executable))) throw Error('Node executable drift');
  }
  if (hashPath(cache.target) !== manifest.osvCache.sha256) throw Error('Consumed OSV cache drift');
  for (const key of ['codeql', 'packs', 'zizmor', 'osvCache']) {
    attestedPath(manifest[key].path, ['codeql', 'packs'].includes(key) ? 'directory' : 'file');
    if (hashPath(manifest[key].path) !== manifest[key].sha256) throw Error(`Tool/cache drift: ${key}`);
  }
  const policyDigest = digest(['local-ci.sh', 'local-ci.mjs', 'local-ci-evidence.mjs'].map(p => digest(readFileSync(join(source, 'scripts', p)))).join('\n'));
  const receipt = { schema: 'longmont-local-ci-v1', started, mode, base, policyDigest, sourceIdentity: identity, toolManifestDigest: digest(manifestBytes), cacheIdentity: { ...manifest.osvCache, ecosystems: ['npm'], selectedRoot: cache.root }, artifacts: { 'codeql.sarif': digest(readFileSync(sarif)), 'query-inventory.json': digest(readFileSync(join(evidence, 'query-inventory.json'))), 'query-dependencies.json': digest(readFileSync(join(evidence, 'query-dependencies.json'))) }, sha, tree: git('rev-parse', 'HEAD^{tree}'), completed: new Date().toISOString(), hostedWorkflowsRemaining: workflows, versions, securityExecutables, npmIdentity, nodes: nodes.map(({ major, version, npmVersion, executableDigest }) => ({ major, version, npmVersion, executableDigest })), suiteDigest, sarifDigest: digest(readFileSync(sarif)), gates };
  writeFileSync(join(evidence, 'receipt.tmp'), JSON.stringify(receipt, null, 2), { mode: 0o600 });
  renameSync(join(evidence, 'receipt.tmp'), join(evidence, 'receipt.json'));
  console.log(`Local verification passed for ${sha}. Receipt: ${evidence}/receipt.json (not an authorization or remote status).`);
}
// Node canonicalizes module URLs, while argv may retain /tmp or another symlink.
// Compare filesystem identity, not path spelling; imports must stay side-effect free.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
