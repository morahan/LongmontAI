#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DETERMINISTIC_TEST_SCRIPTS = Object.freeze([
  'test:suite-wiring',
  'test:site-behavior',
  'release:self-test',
  'test:scheduled-release',
  'security:test',
  'test:loop-push',
  'test:update-site',
  'test:model-watch',
  'test:newsletter',
  'test:mobile-contract',
  'test:flows-contract',
  'test:tools-matrix',
  'test:space-background',
]);

// Focused aliases are covered by test:scheduled-release. The real browser lane
// remains a separate local gate because it requires an installed browser.
export const AGGREGATE_EXEMPTIONS = Object.freeze([
  'test:scheduled-stage',
  'test:scheduled-api',
  'test:scheduled-artifact',
  'test:mobile',
]);

export function assertSuiteCoverage(packageScripts, suite = DETERMINISTIC_TEST_SCRIPTS) {
  const suiteSet = new Set(suite);
  const exemptions = new Set(AGGREGATE_EXEMPTIONS);
  const registered = Object.keys(packageScripts)
    .filter((name) => name.startsWith('test:') || name === 'security:test' || name === 'release:self-test')
    .filter((name) => !exemptions.has(name));
  const missing = registered.filter((name) => !suiteSet.has(name));
  const unknown = suite.filter((name) => typeof packageScripts[name] !== 'string');
  if (missing.length || unknown.length) {
    throw new Error([
      missing.length ? `deterministic npm scripts missing from aggregate: ${missing.join(', ')}` : '',
      unknown.length ? `aggregate entries missing from package.json: ${unknown.join(', ')}` : '',
    ].filter(Boolean).join('; '));
  }
}

export function runTestSuite({
  packageScripts,
  suite = DETERMINISTIC_TEST_SCRIPTS,
  run = (name) => spawnSync('npm', ['run', name], { stdio: 'inherit' }),
} = {}) {
  assertSuiteCoverage(packageScripts, suite);
  for (const name of suite) {
    console.log(`\n=== ${name} ===`);
    const result = run(name);
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`${name} failed with exit code ${result.status ?? 'unknown'}`);
    }
  }
}

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  try {
    runTestSuite({ packageScripts: packageJson.scripts });
  } catch (error) {
    console.error(`Deterministic test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
