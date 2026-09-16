#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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

// Fixture modules are inputs, not executable suites. All other .mjs files in
// scripts/tests (including nested directories), plus test/spec JS/TS variants,
// must have an aggregate owner.
export function discoverTestFiles(directory = fileURLToPath(new URL('./tests', import.meta.url))) {
  function visit(path, prefix) {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        return entry.name === 'fixtures' ? [] : visit(join(path, entry.name), `${prefix}/${entry.name}`);
      }
      const isTest = entry.name.endsWith('.mjs') || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name);
      return entry.isFile() && isTest ? [`${prefix}/${entry.name}`] : [];
    });
  }
  return visit(directory, 'scripts/tests').sort();
}

function matchesTestPattern(file, pattern) {
  // npm scripts currently use single-directory * globs, not a shell glob engine.
  const expression = pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
  return new RegExp(`^${expression}$`).test(file);
}

export function assertSuiteCoverage(packageScripts, suite = DETERMINISTIC_TEST_SCRIPTS, testFiles = discoverTestFiles()) {
  const suiteSet = new Set(suite);
  if (suiteSet.size !== suite.length) throw new Error('duplicate aggregate suite entries');
  const reached = new Set();
  const fileOwners = new Map(testFiles.map((file) => [file, []]));
  function visit(name, ancestors = []) {
    if (ancestors.includes(name)) throw new Error(`cyclic npm test chain: ${[...ancestors, name].join(' -> ')}`);
    const command = packageScripts[name];
    if (typeof command !== 'string') throw new Error(`aggregate entries missing from package.json: ${name}`);
    reached.add(name);
    // Deliberately recognize only our node / npm-run && command convention.
    // Unsupported wrappers fail closed through the unowned-file check below.
    for (const step of command.split('&&').map((value) => value.trim())) {
      const child = step.match(/^npm run ([\w:-]+)$/);
      if (child) visit(child[1], [...ancestors, name]);
      else if (step.startsWith('node ')) {
        for (const pattern of step.split(/\s+/).filter((value) => value.startsWith('scripts/tests/') && /\.[cm]?[jt]sx?$/.test(value))) {
          for (const [file, owners] of fileOwners) {
            if (matchesTestPattern(file, pattern)) owners.push(name);
          }
        }
      }
    }
  }
  for (const name of suite) visit(name);
  const exemptions = new Set(AGGREGATE_EXEMPTIONS);
  const registered = Object.keys(packageScripts)
    .filter((name) => name.startsWith('test:') || name === 'security:test' || name.startsWith('security:test:') || name === 'release:self-test')
    .filter((name) => !exemptions.has(name));
  const missing = registered.filter((name) => !reached.has(name));
  const unowned = [...fileOwners].filter(([, owners]) => owners.length === 0).map(([file]) => file);
  const repeated = [...fileOwners].filter(([, owners]) => owners.length > 1).map(([file]) => file);
  if (missing.length || unowned.length || repeated.length) {
    throw new Error([
      missing.length ? `deterministic npm scripts missing from aggregate: ${missing.join(', ')}` : '',
      unowned.length ? `standalone test files missing from aggregate: ${unowned.join(', ')}` : '',
      repeated.length ? `test files executed more than once: ${repeated.join(', ')}` : '',
    ].filter(Boolean).join('; '));
  }
}

export function runTestSuite({
  packageScripts,
  suite = DETERMINISTIC_TEST_SCRIPTS,
  testFiles = discoverTestFiles(),
  run = (name) => spawnSync('npm', ['run', name], { stdio: 'inherit' }),
} = {}) {
  assertSuiteCoverage(packageScripts, suite, testFiles);
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
