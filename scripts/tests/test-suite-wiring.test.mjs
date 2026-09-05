import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DETERMINISTIC_TEST_SCRIPTS,
  assertSuiteCoverage,
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

test('aggregate propagates child failure and does not run later suites', () => {
  const calls = [];
  const suite = ['test:first', 'test:fails', 'test:never'];
  const scripts = Object.fromEntries(suite.map((name) => [name, `node ${name}.mjs`]));
  assert.throws(
    () => runTestSuite({
      packageScripts: scripts,
      suite,
      run(name) {
        calls.push(name);
        return { status: name === 'test:fails' ? 23 : 0 };
      },
    }),
    /test:fails failed with exit code 23/,
  );
  assert.deepEqual(calls, ['test:first', 'test:fails']);
});
