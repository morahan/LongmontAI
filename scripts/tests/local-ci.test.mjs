import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertCleanSarif, assertNoWorkflows, queryId, RUNTIME_POLICY, assertRuntime, resolveSecurityExecutables, criticalSecurityLaunch } from '../local-ci.mjs';
import { sourceIdentity, validateReceipt, digest, hashPath, attestedPath, containedPath, bindOsvCache } from '../local-ci-evidence.mjs';

const valid = () => ({ version: '2.1.0', runs: [{ tool: { driver: { name: 'CodeQL', rules: [{}] } }, invocations: [{ executionSuccessful: true }], results: [], properties: { metricResults: [{ ruleId: 'js/summary/lines-of-user-code', value: 1 }] } }] });
test('SARIF process success alone never proves a clean, complete scan', () => {
  assert.doesNotThrow(() => assertCleanSarif(valid()));
  for (const change of [r => { r.runs = []; }, r => { r.runs[0].results.push({}); }, r => { delete r.runs[0].results; }, r => { r.runs[0].invocations = []; }, r => { r.runs[0].invocations[0].executionSuccessful = false; }, r => { r.runs[0].tool.driver.rules = []; }, r => { r.runs[0].properties.metricResults[0].value = 0; }, r => { r.runs[0].invocations[0].toolExecutionNotifications = [{ level: 'error' }]; }]) {
    const report = valid(); change(report); assert.throws(() => assertCleanSarif(report));
  }
});
test('source-versioned runtime policy requires both exact Node/npm pins', () => {
  assert.deepEqual(RUNTIME_POLICY, [{ major: 22, node: 'v22.20.0', npm: '10.9.3' }, { major: 24, node: 'v24.16.0', npm: '10.9.3' }]);
  for (const policy of RUNTIME_POLICY) {
    assert.doesNotThrow(() => assertRuntime(policy, policy.node, policy.npm));
    assert.throws(() => assertRuntime(policy, 'v22.19.0', policy.npm));
    assert.throws(() => assertRuntime(policy, policy.node, '11.13.0'));
  }
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.engines.node, '>=22.12.0 <25');
  assert.equal(pkg.packageManager, 'npm@10.9.3');
  assert.equal(readFileSync(new URL('../../.nvmrc', import.meta.url), 'utf8').trim(), '22.20.0');
});
test('CodeQL query IDs parse whitespace, never literal escaped patterns', () => {
  assert.equal(queryId('/**\n * @id js/example\n */'), 'js/example');
  assert.throws(() => queryId('no query metadata'));
});
test('post-cutover policy rejects any workflow, including model watch', () => {
  assert.doesNotThrow(() => assertNoWorkflows(['docs/local-ci.md']));
  for (const p of ['.github/workflows/security.yml', '.github/workflows/model-watch.yml', '.github/workflows/new.yaml']) assert.throws(() => assertNoWorkflows([p]));
});
test('runner rejects unsupported arguments and break-glass before execution', () => {
  for (const [args, env] of [[['--skip-codeql'], {}], [[], { SECURITY_COMMIT_BREAK_GLASS: '1' }], [[], { SECURITY_COMMIT_AUTO_FIX: '1' }]]) {
    const r = spawnSync(process.execPath, ['scripts/local-ci.mjs', ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
    assert.equal(r.status, 1); assert.doesNotMatch(r.stdout, /Local verification passed/);
  }
});
test('optional direct entrypoint executes for logical and physical paths; imports do not', () => {
  const temp = mkdtempSync(join(tmpdir(), 'local-ci-entrypoint-'));
  const physical = realpathSync(fileURLToPath(new URL('../..', import.meta.url)));
  const logical = join(temp, 'logical-source');
  try {
    symlinkSync(physical, logical, 'dir');
    const paths = new Set([physical, logical]);
    if (physical.startsWith('/private/tmp/')) paths.add(physical.replace('/private/tmp/', '/tmp/'));
    for (const root of paths) {
      const invalid = spawnSync(process.execPath, [join(root, 'scripts/local-ci.mjs'), '--unsupported-entrypoint-test'], { encoding: 'utf8' });
      assert.equal(invalid.status, 1);
      assert.match(invalid.stderr, /Usage: node scripts\/local-ci.mjs/);
      const importer = join(temp, 'importer.mjs');
      writeFileSync(importer, `const m = await import(${JSON.stringify(pathToFileURL(join(root, 'scripts/local-ci.mjs')).href)}); if (typeof m.assertCleanSarif !== 'function') throw Error('missing export'); console.log('import-only');\n`);
      const imported = spawnSync(process.execPath, [importer], { encoding: 'utf8' });
      assert.equal(imported.status, 0, imported.stderr);
      assert.equal(imported.stdout, 'import-only\n');
      assert.equal(imported.stderr, '');
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
test('real CLI rejects dirty trees, mismatched SHA and missing tool attestation without receipt', () => {
  const temp = mkdtempSync(join(tmpdir(), 'local-ci-test-'));
  const repo = join(temp, 'repo');
  const runner = resolve('scripts/local-ci.mjs');
  try {
    assert.equal(spawnSync('git', ['clone', '--local', '--no-hardlinks', '.', repo], { encoding: 'utf8' }).status, 0);
    const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
    assert.ok(sourceIdentity(repo, sha));
    writeFileSync(join(repo, 'scripts/local-ci.sh'), 'drift');
    assert.throws(() => sourceIdentity(repo, sha), /source drift/);
    assert.equal(spawnSync('git', ['reset', '--hard', 'HEAD'], { cwd: repo }).status, 0);
    const invoke = (args = [], extra = {}) => spawnSync(process.execPath, [runner, ...args], { cwd: repo, env: { ...process.env, LOCAL_CI_BASE_SHA: sha, ...extra }, encoding: 'utf8' });
    const mismatch = invoke(['0'.repeat(40)]);
    assert.equal(mismatch.status, 1); assert.match(mismatch.stderr, /Requested SHA/);
    writeFileSync(join(repo, 'untracked-ci-fixture'), 'fixture');
    const dirty = invoke(); assert.equal(dirty.status, 1); assert.match(dirty.stderr, /Dirty tree/);
    assert.equal(spawnSync('git', ['add', 'untracked-ci-fixture'], { cwd: repo }).status, 0);
    const staged = invoke(); assert.equal(staged.status, 1); assert.match(staged.stderr, /Dirty tree/);
    assert.equal(spawnSync('git', ['reset', '--hard', 'HEAD'], { cwd: repo }).status, 0);
    const finalMode = invoke(['--final']);
    assert.equal(finalMode.status, 1);
    const workflowPaths = spawnSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '.github/workflows'], { cwd: repo, encoding: 'utf8' }).stdout;
    if (/\.ya?ml/m.test(workflowPaths)) assert.match(finalMode.stderr, /Hosted workflows remain/);
    else assert.match(finalMode.stderr, /LOCAL_CI_TOOL_MANIFEST required/);
    const missing = invoke([], { LOCAL_CI_TOOL_MANIFEST: '' });
    assert.equal(missing.status, 1); assert.match(missing.stderr, /LOCAL_CI_TOOL_MANIFEST required/);
    assert.doesNotMatch(missing.stdout, /Local verification passed/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
test('receipt verifier rejects edited, stale, incomplete and wrong-scope evidence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'local-ci-receipt-test-'));
  try {
    for (const name of ['gate.log', 'codeql.sarif', 'query-inventory.json']) writeFileSync(join(directory, name), '{}');
    const expected = { sha: 'a'.repeat(40), tree: 'b'.repeat(40), base: 'c'.repeat(40), mode: 'final', policyDigest: 'd'.repeat(64), toolManifestDigest: 'e'.repeat(64), sourceIdentity: 'f'.repeat(64), cacheIdentity: { sha256: '1'.repeat(64) }, gates: ['gate'] };
    const receipt = { ...expected, schema: 'longmont-local-ci-v1', started: new Date(Date.now() - 1000).toISOString(), completed: new Date().toISOString(), gates: [{ name: 'gate', status: 'passed', log: 'gate.log', sha256: digest('{}') }], artifacts: Object.fromEntries(['codeql.sarif', 'query-inventory.json'].map(p => [p, digest(readFileSync(join(directory, p)))])) };
    assert.equal(validateReceipt(receipt, directory, expected), true);
    for (const patch of [{ sha: '0'.repeat(40) }, { gates: [] }, { started: '2020-01-01' }, { artifacts: {} }, { cacheIdentity: {} }, { sourceIdentity: 'wrong' }]) assert.throws(() => validateReceipt({ ...receipt, ...patch }, directory, expected));
    for (const name of ['codeql.sarif', 'query-inventory.json']) {
      rmSync(join(directory, name));
      assert.throws(() => validateReceipt(receipt, directory, expected));
      mkdirSync(join(directory, name));
      assert.throws(() => validateReceipt(receipt, directory, expected));
      rmSync(join(directory, name), { recursive: true });
      const external = join(directory, 'external'); writeFileSync(external, '{}');
      symlinkSync(external, join(directory, name));
      assert.throws(() => validateReceipt(receipt, directory, expected));
      writeFileSync(external, 'changed target');
      assert.throws(() => validateReceipt(receipt, directory, expected));
      rmSync(join(directory, name)); writeFileSync(join(directory, name), '{}');
    }
    assert.throws(() => validateReceipt({ ...receipt, artifacts: { ...receipt.artifacts, '../outside': digest('{}') } }, directory, expected));
    writeFileSync(join(directory, 'gate.log'), 'tampered');
    assert.throws(() => validateReceipt(receipt, directory, expected));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('attested tools/dependencies reject missing files and symlink substitution', () => {
  const root = mkdtempSync(join(tmpdir(), 'local-ci-attested-'));
  try {
    mkdirSync(join(root, 'packs')); writeFileSync(join(root, 'packs', 'query.ql'), 'query');
    assert.ok(attestedPath(join(root, 'packs'), 'directory'));
    assert.ok(containedPath(join(root, 'packs', 'query.ql'), join(root, 'packs')));
    assert.throws(() => attestedPath(join(root, 'missing-codeql'), 'file'));
    writeFileSync(join(root, 'outside'), 'external');
    symlinkSync(join(root, 'outside'), join(root, 'packs', 'linked'));
    assert.throws(() => attestedPath(join(root, 'packs'), 'directory'), /symlinks/);
    assert.throws(() => containedPath(join(root, 'packs', 'linked'), join(root, 'packs')), /outside/);
    writeFileSync(join(root, 'outside'), 'changed');
    assert.throws(() => attestedPath(join(root, 'packs', 'linked'), 'file'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('OSV binding selects only a matching, dated npm cache and rejects wrong existing files', () => {
  const root = mkdtempSync(join(tmpdir(), 'local-ci-cache-'));
  try {
    const path = join(root, 'osv-scanner', 'npm', 'all.zip');
    mkdirSync(join(root, 'osv-scanner', 'npm'), { recursive: true }); writeFileSync(path, 'synthetic cache bytes');
    const entry = { path, sha256: hashPath(path), acquired: new Date(Date.now() - 1000).toISOString() };
    const selected = bindOsvCache(entry, join(root, 'evidence'));
    assert.equal(hashPath(selected.target), entry.sha256);
    assert.ok(selected.target.endsWith('/osv-scanner/npm/all.zip'));
    for (const acquired of [new Date(Date.now() + 86400000).toISOString(), '2020-01-01', 'invalid']) assert.throws(() => bindOsvCache({ ...entry, acquired }, root));
    const wrong = join(root, 'other.zip'); writeFileSync(wrong, 'synthetic cache bytes');
    assert.throws(() => bindOsvCache({ ...entry, path: wrong, sha256: hashPath(wrong) }, root));
    assert.throws(() => bindOsvCache({ ...entry, sha256: '0'.repeat(64) }, root));
    rmSync(path); assert.throws(() => bindOsvCache(entry, root));
    symlinkSync(wrong, path); assert.throws(() => bindOsvCache(entry, root));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('optional coordinator selects scanners before dependency PATH changes and launches current gates', () => {
  const root = mkdtempSync(join(tmpdir(), 'local-ci-selector-'));
  try {
    for (const name of ['gitleaks', 'osv-scanner', 'codex']) {
      writeFileSync(join(root, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    }
    assert.throws(() => resolveSecurityExecutables(''), /Preflight PATH/);
    const selected = resolveSecurityExecutables(root);
    for (const name of ['gitleaks', 'osv-scanner', 'codex']) {
      assert.equal(selected[name], realpathSync(join(root, name)));
    }
    const sha = 'a'.repeat(40);
    const matrix = criticalSecurityLaunch('matrix', root, { PATH: root }, sha);
    assert.equal(matrix[0], '/bin/bash');
    assert.deepEqual(matrix[1], [join(root, 'scripts/security-commit-review.sh'), 'all']);
    assert.equal(matrix[3].SECURITY_COMMIT_AGENT_REVIEW, '0');
    const extended = criticalSecurityLaunch('extended', root, { PATH: root }, sha);
    assert.equal(extended[0], '/bin/bash');
    assert.deepEqual(extended[1], [join(root, 'scripts/local-ci.sh')]);
    assert.equal(extended[3].LOCAL_CI_REVIEW_SHA, sha);
    assert.throws(() => criticalSecurityLaunch('unknown', root, {}, sha));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('TypeScript build outputs remain outside tracked source', () => {
  const app = readFileSync(new URL('../../tsconfig.json', import.meta.url), 'utf8');
  const config = JSON.parse(readFileSync(new URL('../../tsconfig.node.json', import.meta.url), 'utf8'));
  assert.match(app, /"tsBuildInfoFile": "\.\/node_modules\/\.cache\/tsconfig\.tsbuildinfo"/);
  assert.equal(config.compilerOptions.outDir, './node_modules/.cache/tsconfig.node');
  assert.equal(config.compilerOptions.tsBuildInfoFile, './node_modules/.cache/tsconfig.node.tsbuildinfo');
  for (const name of ['tsconfig.tsbuildinfo', 'tsconfig.node.tsbuildinfo', 'vite.config.js', 'vite.config.d.ts']) assert.equal(existsSync(new URL(`../../${name}`, import.meta.url)), false);
});
test('optional coordinator is absent from hooks and retains current local gate coverage', () => {
  const gates = readFileSync(new URL('../local-ci.sh', import.meta.url), 'utf8');
  for (const name of ['test:content', 'test:space-background', 'test:model-watch', 'release:check', 'release:self-test', 'test:scheduled-release', 'content:check-assets', 'security:test', 'test:loop-push', 'test:update-site', 'test:newsletter', 'test:mobile-contract', 'test:flows-contract', 'test:tools-matrix', 'test:mobile']) {
    assert.ok(gates.includes(`npm run ${name}`));
  }
  assert.match(gates, /npm run security:review/);
  assert.match(gates, /MOBILE_AUDIT_HEADED=0 env -u MOBILE_AUDIT_ROUTES npm run test:mobile/);
  for (const path of ['../local-ci.sh', '../fast-gate.sh', '../../.githooks/pre-commit', '../../.githooks/pre-push']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /local-ci\.mjs/);
  }
  const runner = readFileSync(new URL('../local-ci.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(runner, /run\([^\n]*['"]gh['"]/);
  assert.match(runner, /\['ci', '--ignore-scripts'\]/);
});
