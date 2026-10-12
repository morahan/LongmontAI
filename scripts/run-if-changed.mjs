#!/usr/bin/env node
// Change-aware test runner: `node scripts/run-if-changed.mjs [--also p1,p2] -- <command...>`.
// Runs <command> only when a file it depends on changed versus origin/main (committed, staged,
// unstaged or untracked). Dependencies are discovered from the test files named in <command>:
// relative imports (transitively) plus string literals that resolve to existing repo paths.
// Fail-safe: unknown base, git failure or a change to a global trigger runs the command.
// Pass cache: a successful run is remembered by the exact bytes of every dependency, so after a fix
// only the suites whose inputs changed run again. TEST_ALL=1 forces a run (ignores the cache);
// TEST_BASE=<ref> overrides the comparison base; RUN_IF_CHANGED_DRY=1 prints the decision only.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const GLOBAL_TRIGGERS = [/^package(-lock)?\.json$/, /^tsconfig[^/]*\.json$/, /^vite\.config\./, /^eslint\.config\./, /^\.nvmrc$|^\.node-version$/, /^scripts\/run-if-changed\.mjs$/, /^scripts\/tests\/fixtures\//];
const CODE = /\.(?:[cm]?[jt]sx?)$/;
const EXTENSIONS = ['', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.cjs', '/index.ts', '/index.tsx', '/index.mjs', '/index.js'];

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
if (split < 0 || split === argv.length - 1) { console.error('usage: run-if-changed.mjs [--also p1,p2] -- <command...>'); process.exit(2); }
const options = argv.slice(0, split), cmd = argv.slice(split + 1);
const also = options[0] === '--also' ? (options[1] || '').split(',').filter(Boolean) : [];

const git = args => { const r = spawnSync('git', args, { encoding: 'utf8' }); return r.status === 0 ? r.stdout : null; };
const ROOT = git(['rev-parse', '--show-toplevel'])?.trim();
const label = `run-if-changed: ${cmd.filter(a => !a.startsWith('-')).slice(1).join(' ') || cmd.join(' ')}`;
let cacheFile = null;
const run = reason => {
  console.log(`${label}\n  RUN (${reason})`);
  if (process.env.RUN_IF_CHANGED_DRY === '1') process.exit(0);
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: false });
  if (r.status === 0 && cacheFile) { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, `${new Date().toISOString()}\n`); }
  process.exit(r.status ?? 1);
};

if (process.env.TEST_ALL === '1') run('TEST_ALL=1');
if (!ROOT) run('not a git checkout');
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');

function changedFiles() {
  const base = process.env.TEST_BASE || 'origin/main';
  const mergeBase = git(['-C', ROOT, 'merge-base', 'HEAD', base])?.trim();
  if (!mergeBase) return null;
  const lists = [git(['-C', ROOT, 'diff', '--name-only', mergeBase]), git(['-C', ROOT, 'ls-files', '--others', '--exclude-standard'])];
  if (lists.some(l => l === null)) return null;
  return [...new Set(lists.join('\n').split('\n').filter(Boolean))];
}

function testFiles() {
  const out = new Set();
  for (const arg of cmd.slice(1)) {
    if (arg.startsWith('-')) continue;
    const matches = /[*?[]/.test(arg) ? fs.globSync(arg, { cwd: ROOT }) : [arg];
    for (const m of matches) { const abs = path.resolve(ROOT, m); if (fs.existsSync(abs) && fs.statSync(abs).isFile()) out.add(abs); }
  }
  return [...out];
}

function resolveRef(fromFile, spec) {
  const bases = spec.startsWith('.') ? [path.resolve(path.dirname(fromFile), spec)] : [path.resolve(ROOT, spec)];
  for (const base of bases) {
    if (!base.startsWith(ROOT + path.sep) || base.includes(`${path.sep}node_modules${path.sep}`)) continue;
    for (const ext of EXTENSIONS) { const p = base + ext; if (fs.existsSync(p)) return p; }
  }
  return null;
}

// Every repo path a test can reach: imported code (transitive) and referenced files/directories.
function dependencies(entries) {
  const deps = new Set(), queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (deps.has(file)) continue;
    deps.add(file);
    if (!CODE.test(file) || !fs.statSync(file).isFile() || fs.statSync(file).size > 1_000_000) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const [, spec] of source.matchAll(/['"`]((?:\.{1,2}\/|[A-Za-z_.][\w.-]*\/)[^'"`\s${}]*)['"`]/g)) {
      const target = resolveRef(file, spec);
      if (target && target !== ROOT) queue.push(target);
    }
    // Bare root files joined to the repo root, e.g. resolve(root, 'justfile'). Plain 'README.md' literals
    // are usually fixture names inside temp repos, so they do not count.
    for (const [, name] of source.matchAll(/\b(?:root|ROOT|repoRoot|checkout)\s*,\s*['"`]([\w][\w.-]*)['"`]/g)) {
      const p = path.join(ROOT, name);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) queue.push(p);
    }
  }
  return [...deps].map(rel);
}

const changed = changedFiles();
if (!changed) run('could not compute changes vs origin/main');
if (!changed.length) { console.log(`${label}\n  SKIP (no changes vs origin/main; TEST_ALL=1 to force)`); process.exit(0); }
const entries = testFiles();
if (!entries.length) run('no test files found in command');
const deps = [...new Set([...dependencies(entries), ...also])];
if (process.env.RUN_IF_CHANGED_DRY === '1') console.log(`  deps: ${deps.join(' ')}`);
const trigger = changed.find(f => GLOBAL_TRIGGERS.some(re => re.test(f)));
const hit = changed.find(f => deps.some(d => f === d || f.startsWith(d.replace(/\/$/, '') + '/')));
if (!trigger && !hit) { console.log(`${label}\n  SKIP (${changed.length} changed file(s), none among ${deps.length} dependencies)`); process.exit(0); }

// Key = command + bytes of every dependency (directories walked) + global triggers.
const hash = createHash('sha256').update(JSON.stringify(cmd));
const walk = p => {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) { for (const e of fs.readdirSync(p).sort()) if (e !== 'node_modules' && e !== '.git') walk(path.join(p, e)); }
  else { hash.update(rel(p)); hash.update(fs.readFileSync(p)); }
};
for (const d of deps.sort()) walk(path.resolve(ROOT, d));
for (const f of git(['-C', ROOT, 'ls-files']).split('\n').filter(f => GLOBAL_TRIGGERS.some(re => re.test(f))).sort()) walk(path.join(ROOT, f));
cacheFile = path.join(git(['-C', ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir']).trim(), 'run-if-changed', hash.digest('hex'));
if (fs.existsSync(cacheFile)) { console.log(`${label}\n  SKIP (already passed with identical inputs)`); process.exit(0); }
run(trigger ? `global trigger ${trigger}` : `${hit} changed`);
