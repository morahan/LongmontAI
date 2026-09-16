import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DETERMINISTIC_TEST_SCRIPTS,
  assertSuiteCoverage,
  discoverTestFiles,
  runTestSuite,
} from '../test-suite.mjs';

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

test('aggregate registers every deterministic npm test exactly once', () => {
  assert.equal(new Set(DETERMINISTIC_TEST_SCRIPTS).size, DETERMINISTIC_TEST_SCRIPTS.length);
  assert.doesNotThrow(() => assertSuiteCoverage(packageJson.scripts));
  for (const required of [
    'release:self-test',
    'security:test',
    'test:site-behavior',
    'test:model-watch',
    'test:space-background',
  ]) {
    assert.ok(DETERMINISTIC_TEST_SCRIPTS.includes(required), `${required} must run in npm test`);
  }
});

test('coverage check detects a newly registered deterministic suite missing from the aggregate', () => {
  assert.throws(
    () => assertSuiteCoverage({ ...packageJson.scripts, 'test:unregistered': 'node missing.test.mjs' }),
    /test:unregistered/,
  );
});

test('new security test registrations and duplicate aggregate entries fail closed', () => {
  assert.throws(
    () => assertSuiteCoverage({ ...packageJson.scripts, 'security:test:new-contract': 'node missing.test.mjs' }),
    /security:test:new-contract/,
  );
  assert.throws(
    () => assertSuiteCoverage(packageJson.scripts, [...DETERMINISTIC_TEST_SCRIPTS, 'test:site-behavior']),
    /duplicate aggregate suite entries/,
  );
});

test('filesystem discovery rejects unregistered standalone tests but excludes fixture modules', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'longmont-suite-discovery-'));
  try {
    await mkdir(join(directory, 'nested'));
    await mkdir(join(directory, 'fixtures'));
    await writeFile(join(directory, 'unregistered.test.mjs'), 'throw new Error("must not execute");');
    await writeFile(join(directory, 'nested/other.mjs'), 'throw new Error("must not execute");');
    await writeFile(join(directory, 'future.test.ts'), 'throw new Error("must not execute");');
    await writeFile(join(directory, 'future.spec.js'), 'throw new Error("must not execute");');
    await writeFile(join(directory, 'fixtures/input.test.mjs'), 'fixture input');
    const files = discoverTestFiles(directory);
    assert.deepEqual(files, [
      'scripts/tests/future.spec.js', 'scripts/tests/future.test.ts',
      'scripts/tests/nested/other.mjs', 'scripts/tests/unregistered.test.mjs',
    ]);
    let calls = 0;
    assert.throws(() => runTestSuite({
      packageScripts: packageJson.scripts,
      testFiles: [...discoverTestFiles(), ...files],
      run() { calls += 1; return { status: 0 }; },
    }), /standalone test files missing from aggregate:.*nested\/other.mjs.*unregistered.test.mjs/);
    assert.equal(calls, 0, 'discovery must reject before executing any suite');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('aggregate resolves chained security suites and glob aliases without double-running files', () => {
  const calls = [];
  runTestSuite({ packageScripts: packageJson.scripts, run(name) { calls.push(name); return { status: 0 }; } });
  assert.deepEqual(calls, [...DETERMINISTIC_TEST_SCRIPTS]);
  assert.equal(calls.filter((name) => name === 'test:scheduled-release').length, 1);
  assert.equal(calls.includes('test:scheduled-api'), false);
  assert.equal(calls.includes('security:test-chain'), false);
  assert.throws(
    () => assertSuiteCoverage(packageJson.scripts, [...DETERMINISTIC_TEST_SCRIPTS, 'test:scheduled-api']),
    /test files executed more than once:.*scheduled-api-contract/,
  );
  assert.throws(
    () => assertSuiteCoverage({ ...packageJson.scripts, 'security:test': 'npm run security:test' }),
    /cyclic npm test chain/,
  );
});

test('aggregate propagates child failure and does not run later suites', () => {
  const calls = [];
  const suite = ['test:first', 'test:fails', 'test:never'];
  const scripts = Object.fromEntries(suite.map((name) => [name, `node ${name}.mjs`]));
  assert.throws(
    () => runTestSuite({
      packageScripts: scripts,
      suite,
      testFiles: [],
      run(name) {
        calls.push(name);
        return { status: name === 'test:fails' ? 23 : 0 };
      },
    }),
    /test:fails failed with exit code 23/,
  );
  assert.deepEqual(calls, ['test:first', 'test:fails']);
});
