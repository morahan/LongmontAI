#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';

const execution = new AsyncLocalStorage();

const SCHEMA = 1;
const OID = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const RUN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/;
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value);
const digest = value => hash(stable(value));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const critical = p => /(?:^|\/)\.gitattributes$/.test(p) || /\.(?:js|mjs|cjs|ts|tsx|jsx|py|sh|html|svg|wasm)$/.test(p) || /^(?:\.gitmodules$|\.npmrc$|\.node-version$|\.nvmrc$|src\/|\.(?:githooks|github|agents|codex|claude|pi)\/|(?:api|server|functions|supabase|scripts)\/|AGENTS\.md$|justfile$|(?:package(?:-lock)?|vercel|tsconfig[^/]*|eslint[^/]*|vite\.config[^/]*)\.(?:json|js|mjs|ts)$|\.env(?:\.|$))/.test(p);
const gateCalls = ['security:review', 'lint', 'release:check', 'release:self-test', 'test:scheduled-release', 'content:check-assets', 'security:test', 'test:loop-push', 'test:update-site', 'test:content', 'test:model-watch', 'test:space-background', 'test:newsletter', 'test:mobile-contract', 'test:flows-contract', 'test:tools-matrix', 'build', 'test:mobile'];

class Stop extends Error {
  constructor(code, kind, detail, extra = {}) { super(detail); Object.assign(this, { code, kind, detail, ...extra }); }
}
function command(cwd, executable, args, { allow = [], input, timeout = 300_000, stage } = {}) {
  // Process-local housekeeping controls never write Git configuration and never alter hooks/scanners.
  // Ordinary fetch/commit can otherwise launch GC that prunes a missing registered workspace before MAIN proof.
  const actualArgs = executable === 'git' ? ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', ...args] : args;
  const result = spawnSync(executable, actualArgs, { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' }, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout });
  const context = execution.getStore();
  let evidencePath;
  if (context?.evidenceDir && (stage || result.error || result.status !== 0 && !allow.includes(result.status))) {
    evidencePath = path.join(context.evidenceDir, `${String(++context.sequence).padStart(6, '0')}-${stage || 'command-failure'}.json`);
    atomicWrite(evidencePath, { schema: SCHEMA, cwd, executable, args: actualArgs, status: result.status, signal: result.signal, error: result.error?.code || null, stdout: result.stdout || '', stderr: result.stderr || '', at: new Date().toISOString() });
    context.logs.push(evidencePath);
  }
  if (result.error || (result.status !== 0 && !allow.includes(result.status))) {
    // Command output can contain credentials or untrusted blob contents. Keep it private to the caller.
    throw new Stop(1, 'command-failed', `${executable} ${args[0] ?? ''} failed (status ${result.status ?? 'unavailable'}).`, { evidencePath });
  }
  return { stdout: result.stdout || '', stderr: result.stderr || '', status: result.status };
}
const git = (cwd, args, options) => command(cwd, 'git', args, options);
const text = (cwd, args) => git(cwd, args).stdout.replace(/\r?\n$/, '');
function gitPaths(cwd, names) {
  const rows = git(cwd, ['rev-parse', '--path-format=absolute', ...names.flatMap(name => ['--git-path', name])]).stdout.replace(/\r?\n$/, '').split('\n');
  if (rows.length !== names.length) throw new Stop(4, 'ambiguous-git-path', 'Git administrative path output is ambiguous; preserve source rather than parse unsafe paths.');
  return new Map(names.map((name, i) => [name, rows[i]]));
}
function noRoutingOverrides() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || major >= 25 || major === 22 && minor < 12) throw new Stop(2, 'node-runtime', 'Supported Node runtime is >=22.12.0 <25 (pinned 22.20.0).');
  if (process.env.SECURITY_COMMIT_BREAK_GLASS === '1') throw new Stop(2, 'gate-bypass-environment', 'Break-glass cannot be used by the ALL-source publication engine.');
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_CONFIG', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'GIT_NAMESPACE', 'GIT_SHALLOW_FILE', 'GIT_REPLACE_REF_BASE']) {
    if (process.env[name] !== undefined) throw new Stop(2, 'unsafe-environment', `Git routing/config override ${name} is not permitted.`);
  }
  if (Object.keys(process.env).some(name => /^GIT_CONFIG_(KEY|VALUE)_/.test(name))) throw new Stop(2, 'unsafe-environment', 'Injected Git config is not permitted.');
  for (const name of ['GIT_EXTERNAL_DIFF', 'GIT_DIFF_OPTS', 'GIT_EXEC_PATH', 'GH_REPO']) if (process.env[name] !== undefined) throw new Stop(2, 'unsafe-environment', `Execution/repository override ${name} is not permitted.`);
  if (Object.keys(process.env).some(name => name.startsWith('GIT_TRACE') || name === 'GIT_CURL_VERBOSE')) throw new Stop(2, 'unsafe-environment', 'External Git tracing can leak credentials or write outside private evidence; not permitted.');
}
function regularFile(p) {
  const stat = fs.lstatSync(p);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Stop(4, 'unsafe-file', 'Expected private regular file.');
  return stat;
}
function privateDirectory(p) {
  const stat = fs.lstatSync(p);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) throw new Stop(4, 'unsafe-state', 'Private state ownership/mode is unsafe.');
  return p;
}
function readPrivate(p) {
  const stat = regularFile(p);
  if ((stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) throw new Stop(4, 'unsafe-state', 'Private file ownership/mode is unsafe.');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function atomicWrite(p, value) {
  const temp = `${p}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try { fs.writeFileSync(fd, `${stable(value)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, p);
}
function fingerprintFile(p) {
  const stat = fs.lstatSync(p);
  const sameStat = actual => ['dev', 'ino', 'mode', 'size', 'mtimeMs', 'ctimeMs'].every(key => actual[key] === stat[key]);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(p, { encoding: 'buffer' }); if (!sameStat(fs.lstatSync(p))) throw new Stop(4, 'source-race', 'Symlink changed during inventory.');
    return { mode: stat.mode & 0o7777, kind: 'symlink', digest: hash(target) };
  }
  if (stat.isFile()) {
    const hasher = createHash('sha256'); const buffer = Buffer.allocUnsafe(64 * 1024); const fd = fs.openSync(p, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    try { const opened = fs.fstatSync(fd); if (!opened.isFile() || !sameStat(opened)) throw new Stop(4, 'source-race', 'Opened file differs from regular-file inventory identity.'); for (let length; (length = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0;) hasher.update(buffer.subarray(0, length)); } finally { fs.closeSync(fd); }
    if (!sameStat(fs.lstatSync(p))) throw new Stop(4, 'source-race', 'File identity/size/timestamps changed while streaming its bytes.');
    return { mode: stat.mode & 0o7777, kind: 'file', digest: hasher.digest('hex') };
  }
  if (stat.isDirectory()) return { mode: stat.mode & 0o7777, kind: 'directory' };
  throw new Stop(4, 'special-file', 'Special source files require separate reviewed intake.');
}
function sourcePath(root, relative) {
  if (path.isAbsolute(relative) || relative.split('/').includes('..')) throw new Stop(4, 'unsafe-source-path', 'Source path is outside workspace.');
  const parts = relative.split('/');
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Stop(4, 'symlink-traversal', 'Source parent directory is a symlink.');
  }
  return path.join(root, relative);
}
function refs(cwd) {
  return git(cwd, ['for-each-ref', '--format=%(refname)\t%(objectname)\t%(symref)\t%(objecttype)']).stdout.split('\n').filter(Boolean).map(line => {
    const [ref, oid, symbolic, objectType] = line.split('\t');
    return { ref, oid, symbolic: symbolic || null, objectType };
  });
}
function worktrees(cwd) {
  return git(cwd, ['worktree', 'list', '--porcelain', '-z']).stdout.split('\0\0').filter(Boolean).map(record => {
    const row = {};
    for (const field of record.split('\0').filter(Boolean)) {
      const split = field.indexOf(' ');
      const key = split < 0 ? field : field.slice(0, split);
      row[key] = split < 0 ? true : field.slice(split + 1);
    }
    return row;
  });
}
function indexEntries(cwd, admin) {
  const args = [...(admin ? [`--git-dir=${admin}`] : []), 'ls-files', '--stage', '-z'];
  return git(cwd, args).stdout.split('\0').filter(Boolean).map(entry => {
    const tab = entry.indexOf('\t');
    const [mode, oid, stage] = entry.slice(0, tab).split(' ');
    return { path: entry.slice(tab + 1), mode, oid, stage: Number(stage) };
  });
}
function treeEntries(cwd, tree) {
  const cache = execution.getStore()?.treeCache;
  const key = `${cwd}\0${tree}`;
  if (OID.test(tree) && cache?.has(key)) return cache.get(key);
  const entries = git(cwd, ['ls-tree', '-r', '-z', tree]).stdout.split('\0').filter(Boolean).map(entry => {
    const tab = entry.indexOf('\t'); const [mode, type, oid] = entry.slice(0, tab).split(' ');
    return { path: entry.slice(tab + 1), mode, type, oid };
  });
  if (OID.test(tree)) cache?.set(key, entries);
  return entries;
}
function adminFor(common, registeredPath) {
  const base = path.join(common, 'worktrees');
  if (!fs.existsSync(base)) return null;
  for (const name of fs.readdirSync(base)) {
    const dir = path.join(base, name);
    if (fs.lstatSync(dir).isSymbolicLink() || !fs.lstatSync(dir).isDirectory()) continue;
    const link = path.join(dir, 'gitdir');
    if (fs.existsSync(link) && path.resolve(fs.readFileSync(link, 'utf8').trim()) === path.join(registeredPath, '.git')) return dir;
  }
  return null;
}
function filesystemCensus(cwd, trackedNames, gitlinks = new Set()) {
  const tracked = new Set(trackedNames); const parents = new Set();
  for (const name of tracked) { const parts = name.split('/'); for (let i = 1; i < parts.length; i++) parents.add(parts.slice(0, i).join('/')); }
  let directories = ['']; const paths = []; const ignored = []; const blockers = []; const types = new Map();
  while (directories.length) {
    const entries = []; const next = [];
    for (const directory of directories) {
      const absolute = directory ? sourcePath(cwd, directory) : cwd;
      const before = fs.lstatSync(absolute);
      if (!before.isDirectory() || before.isSymbolicLink()) throw new Stop(4, 'source-race', 'Directory changed during safe filesystem census.');
      const names = fs.readdirSync(absolute);
      const after = fs.lstatSync(absolute);
      if (before.dev !== after.dev || before.ino !== after.ino || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) throw new Stop(4, 'source-race', 'Directory entries changed during census.');
      if (directory && !names.length && !parents.has(directory)) blockers.push({ kind: 'empty-untracked-directory', paths: [directory], detail: 'Untracked empty directory requires explicit retained/recovered input decision; Git cannot represent it automatically.' });
      for (const name of names) {
        if (!directory && name === '.git') continue; // validated administrative linkage, not source data
        const relative = directory ? `${directory}/${name}` : name;
        if (name === '.git') { blockers.push({ kind: 'foreign-embedded-repository', paths: [directory], detail: 'Embedded foreign Git administration is not silently traversed/deleted.' }); continue; }
        const stat = fs.lstatSync(sourcePath(cwd, relative));
        const kind = stat.isSymbolicLink() ? 'symlink' : stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'special';
        if (['.gitignore', '.gitattributes', '.gitmodules'].includes(name) && !stat.isFile()) throw new Stop(4, 'special-file', 'Special/symlink Git control input cannot be handed to Git for implicit reads.', { paths: [relative] });
        entries.push({ path: relative, kind, mode: stat.mode & 0o7777 });
      }
    }
    const candidates = entries.filter(e => !tracked.has(e.path) && !parents.has(e.path)).map(e => e.kind === 'directory' ? `${e.path}/` : e.path);
    const ignoredNames = candidates.length ? new Set(git(cwd, ['check-ignore', '--no-index', '-z', '--stdin'], { input: `${candidates.join('\0')}\0`, allow: [1] }).stdout.split('\0').filter(Boolean).map(name => name.replace(/\/$/, ''))) : new Set();
    for (const entry of entries) {
      if (ignoredNames.has(entry.path)) {
        ignored.push({ ...entry, classification: /^(?:(?:node_modules|dist|dist-ssr|build|output|\.playwright|\.playwright-cli|playwright-report|test-results)(?:\/|$)|tsconfig[^/]*\.tsbuildinfo$)/.test(entry.path) ? 'managed-cache' : 'unknown' });
        continue; // metadata only; NEVER read ignored credential file contents or descend ignored directories
      }
      paths.push(entry.path); types.set(entry.path, entry);
      if (entry.kind === 'directory' && !gitlinks.has(entry.path)) next.push(entry.path);
      if (entry.kind === 'special') blockers.push({ kind: 'special-file', paths: [entry.path], detail: 'FIFO/socket/device source cannot be silently ignored or deleted; reviewed nonpublishable intake remains unresolved.' });
    }
    directories = next;
  }
  return { paths: paths.sort(), ignored: ignored.sort((a, b) => a.path.localeCompare(b.path)), types, blockers };
}
function inspectWorkspace(cwd, common, row) {
  const p = row.worktree;
  const result = { path: p, head: row.HEAD ?? null, branch: row.branch ?? null, locked: row.locked || null, prunable: row.prunable || null, missing: false, index: [], indexDeletions: [], headTree: [], files: [], ignored: [], status: '', operations: [], blockers: [] };
  const block = (kind, detail, paths = []) => result.blockers.push({ kind, sourceId: `worktree:${p}`, detail, paths });
  try {
    if (result.head && OID.test(result.head) && !/^0+$/.test(result.head)) result.headTree = treeEntries(cwd, result.head);
    if (!fs.existsSync(p)) {
      result.missing = true;
      const admin = adminFor(common, p);
      if (admin) {
        result.index = indexEntries(cwd, admin);
        const index = path.join(admin, 'index');
        result.indexDigest = fs.existsSync(index) ? fingerprintFile(index).digest : null;
      }
      block('missing-workspace', 'Unknown original unstaged/untracked filesystem bytes; saved index does not prove completeness.');
    } else {
      if (fs.lstatSync(p).isSymbolicLink() || fs.realpathSync(p) !== p) throw new Stop(4, 'unsafe-workspace', 'Registered workspace path is not a real directory.');
      const actualCommon = fs.realpathSync(path.resolve(p, text(p, ['rev-parse', '--git-common-dir'])));
      if (actualCommon !== common) throw new Stop(4, 'foreign-workspace', 'Registered workspace uses a different common directory.');
      result.index = indexEntries(p);
      result.indexDigest = digest(result.index);
      const gitlinks = new Set([...result.headTree, ...result.index].filter(e => e.mode === '160000').map(e => e.path));
      const scan = filesystemCensus(p, [...result.headTree.map(e => e.path), ...result.index.map(e => e.path)], gitlinks);
      const before = git(p, ['status', '--porcelain=v2', '-z', '--untracked-files=all']).stdout;
      result.status = before;
      const untracked = git(p, ['ls-files', '--others', '--exclude-standard', '-z']).stdout.split('\0').filter(Boolean);
      for (const item of scan.blockers) block(item.kind, item.detail, item.paths);
      const names = [...new Set([...result.headTree.map(e => e.path), ...result.index.map(e => e.path), ...untracked, ...scan.paths])].sort();
      const indexed = new Set(result.index.map(e => e.path));
      result.indexDeletions = result.headTree.filter(e => !indexed.has(e.path)).map(e => ({ path: e.path, oldOid: e.oid, oldMode: e.mode }));
      for (const name of names) {
        const file = sourcePath(p, name);
        const entries = result.index.filter(e => e.path === name);
        if (entries.some(e => e.mode === '160000')) {
          const status = git(p, ['submodule', 'status', '--', name]).stdout;
          if (!status.startsWith(' ')) block('submodule-state', 'Foreign/uninitialized/changed submodule requires review.', [name]);
          else if (git(file, ['status', '--porcelain', '--untracked-files=all']).stdout) block('dirty-submodule', 'Submodule has unresolved source bytes.', [name]);
          result.files.push({ path: name, kind: 'submodule', digest: hash(status) });
        } else result.files.push({ path: name, ...(() => { try { if (scan.types.get(name)?.kind === 'special') return { kind: 'special', mode: scan.types.get(name).mode }; return fingerprintFile(file); } catch (error) { if (error.code === 'ENOENT') return { kind: 'missing' }; throw error; } })() });
      }
      result.ignored = scan.ignored;
      const operationNames = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG'];
      const operationPaths = gitPaths(p, operationNames);
      for (const operation of operationNames) if (fs.existsSync(operationPaths.get(operation))) result.operations.push(operation);
      if (result.operations.length) block('unfinished-operation', 'Source has an unfinished Git operation.');
      if (before) block('dirty-workspace', 'Distinct staged/unstaged/untracked bytes require reviewed intake; originals are unchanged.', names);
      const repeatFiles = result.files.map(file => {
        if (file.kind === 'submodule') return file;
        if (file.kind === 'special') { const stat = fs.lstatSync(sourcePath(p, file.path)); if (stat.isFile() || stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o7777) !== file.mode) throw new Stop(4, 'source-race', 'Special source type changed during census.'); return file; }
        try { return { path: file.path, ...fingerprintFile(sourcePath(p, file.path)) }; } catch (error) { if (error.code === 'ENOENT') return { path: file.path, kind: 'missing' }; throw error; }
      });
      const repeatScan = filesystemCensus(p, [...result.headTree.map(e => e.path), ...result.index.map(e => e.path)], gitlinks);
      if (stable(scan.paths) !== stable(repeatScan.paths) || stable(scan.ignored) !== stable(repeatScan.ignored) || stable(scan.blockers) !== stable(repeatScan.blockers) || stable(repeatFiles) !== stable(result.files) || stable(indexEntries(p)) !== stable(result.index) || before !== git(p, ['status', '--porcelain=v2', '-z', '--untracked-files=all']).stdout || result.head && !/^0+$/.test(result.head) && text(p, ['rev-parse', 'HEAD']) !== result.head) block('source-race', 'Source file bytes/index/HEAD/status changed across repeated coherent inventory.');
    }
    for (const entry of result.index) {
      if (entry.stage !== 0) block('unresolved-index', 'Saved/live index contains unresolved stages.', [entry.path]);
      // Object availability is deduplicated/batched across ALL workspaces below.
    }
    if (result.locked) block('ownership-held', 'Original workspace lock requires explicit owner release.');
    if (result.ignored.some(e => e.classification === 'unknown')) block('unknown-ignored', 'Ignored source existence retained privately; cleanup is blocked.');
  } catch (error) { block(error.kind || 'unreadable-workspace', error.detail || 'Source workspace inspection failed.', error.paths || []); }
  result.fingerprint = digest({ ...result, blockers: undefined, fingerprint: undefined });
  return result;
}
function inventory(cwd, common, derived) {
  executionPreflight(cwd, common);
  const first = refs(cwd);
  const allWorktrees = worktrees(cwd);
  const inspected = allWorktrees.filter(row => !derived || row.worktree !== derived.worktree).map(row => inspectWorkspace(cwd, common, row));
  const indexOids = [...new Set(inspected.flatMap(w => w.index.filter(e => e.mode !== '160000').map(e => e.oid)))];
  const validated = indexOids.filter(oid => OID.test(oid));
  const available = new Map();
  if (validated.length) {
    const batch = git(cwd, ['cat-file', '--batch-check=%(objectname) %(objecttype)'], { input: `${validated.join('\n')}\n` }).stdout.trim().split('\n');
    if (batch.length !== validated.length) throw new Stop(4, 'object-batch-integrity', 'Index object batch census is incomplete.');
    for (const line of batch) { const [oid, type] = line.split(' '); available.set(oid, type); }
  }
  for (const workspace of inspected) {
    workspace.indexObjectStates = [...new Set(workspace.index.filter(e => e.mode !== '160000').map(e => e.oid))].sort().map(oid => ({ oid, type: available.get(oid) || 'missing' }));
    for (const entry of workspace.index) if (entry.mode !== '160000' && available.get(entry.oid) !== 'blob') workspace.blockers.push({ kind: 'missing-index-object', sourceId: `worktree:${workspace.path}`, paths: [entry.path], detail: 'Saved/live index object is unavailable or not a blob.' });
    workspace.fingerprint = digest({ ...workspace, fingerprint: undefined });
  }
  const stash = git(cwd, ['reflog', 'show', '--format=%H', 'refs/stash'], { allow: [128] }).stdout.split('\n').filter(Boolean).map(oid => ({ oid, parents: text(cwd, ['rev-list', '--parents', '-n', '1', oid]).split(' ').slice(1) }));
  const remotes = text(cwd, ['remote']).split('\n').filter(Boolean).sort();
  const historyPath = path.join(common, 'loop-merge-push', 'historical-inputs.json');
  let historicalInputs = [];
  if (fs.existsSync(historyPath)) {
    privateDirectory(path.dirname(historyPath));
    const history = readPrivate(historyPath);
    if (history.schema !== SCHEMA || !Array.isArray(history.inputs) || history.inputs.some(i => typeof i.id !== 'string' || !OID.test(i.oid || '') || typeof i.provenance !== 'string')) throw new Stop(4, 'historical-manifest', 'Prior historical input manifest is invalid.');
    historicalInputs = history.inputs;
  }
  const sources = historicalInputs.filter(i => i.objectType === 'commit').map(i => ({ id: i.id, oid: i.oid, kind: 'historical', provenance: i.provenance }));
  const managed = row => derived && (row.ref === derived.ref || derived.managedRefs?.some(r => r.ref === row.ref && r.oid === row.oid));
  const inputs = first.filter(row => !row.symbolic && !managed(row));
  const objectInputs = [...inputs.filter(row => row.objectType !== 'commit').map(row => ({ id: row.ref, oid: row.oid, objectType: row.objectType, provenance: 'original-ref' })), ...historicalInputs.filter(i => i.objectType !== 'commit')];
  const noncommitInputs = objectInputs.map(row => ({ ...row, entries: row.objectType === 'tree' ? git(cwd, ['ls-tree', '-r', '-z', row.oid]).stdout.split('\0').filter(Boolean).map(entry => { const tab = entry.indexOf('\t'); const [mode, type, oid] = entry.slice(0, tab).split(' '); return { path: entry.slice(tab + 1), mode, type, oid }; }) : [] }));
  for (const row of inputs) if (row.objectType === 'commit' && row.ref !== 'refs/stash') sources.push({ id: row.ref, oid: row.oid, kind: row.ref.startsWith('refs/heads/') ? 'local' : row.ref.startsWith('refs/remotes/') ? 'remote' : 'historical' });
  for (const row of inspected) if (row.head && !/^0+$/.test(row.head)) sources.push({ id: `worktree:${row.path}`, oid: row.head, kind: 'worktree' });
  const blockers = inspected.flatMap(row => row.blockers);
  for (const input of noncommitInputs) blockers.push({ kind: 'noncommit-intake', sourceId: input.id, paths: input.entries.map(e => e.path), detail: 'Historical noncommit object preserved/classified; reviewed recovery required, never fake commit ancestry.' });
  for (const s of stash) blockers.push({ kind: 'stash-intake', sourceId: `stash:${s.oid}`, paths: [], detail: 'Stash worktree/index/untracked history requires reviewed ordinary recovery; no pop/drop.' });
  if (stable(first) !== stable(refs(cwd)) || stable(allWorktrees) !== stable(worktrees(cwd))) blockers.push({ kind: 'source-race', sourceId: 'refs', paths: [], detail: 'Ref/worktree registration census moved during inventory.' });
  const result = { refs: first.filter(row => !managed(row)), derivedResources: first.filter(managed), historicalInputs, noncommitInputs, worktrees: inspected, stash, remotes, sources, blockers };
  result.fingerprint = inventoryDigest(result);
  return result;
}

// Runner implementation is below. Importing this module never executes Git or changes state.
export async function runMergeAll(options = {}) {
  return execution.run({ evidenceDir: null, sequence: 0, logs: [], treeCache: new Map(), treeMaps: new Map() }, () => run(options));
}

function inventoryDigest(inv) {
  return digest({ refs: inv.refs, worktrees: inv.worktrees.map(row => [row.path, row.fingerprint]), stash: inv.stash, remotes: inv.remotes, historicalInputs: inv.historicalInputs });
}
function pinInputs(cwd, state, store) {
  state.managedRefs ||= [];
  const oids = [...new Set([...state.sources.map(s => s.oid), ...state.preFetch.noncommitInputs.map(s => s.oid), ...state.expected.noncommitInputs.map(s => s.oid), ...state.expected.stash.flatMap(s => [s.oid, ...s.parents])])];
  const presentRefs = new Map(refs(cwd).map(row => [row.ref, row.oid]));
  for (const oid of oids) {
    if (!OID.test(oid)) throw new Stop(4, 'invalid-source-object', 'Invalid frozen object ID.');
    const ref = `refs/loop-merge-all/${state.id}/inputs/${oid}`;
    if (presentRefs.has(ref) && presentRefs.get(ref) !== oid) throw new Stop(4, 'preservation-ref-movement', 'Private preservation ref moved.');
    if (!state.managedRefs.some(r => r.ref === ref)) { state.managedRefs.push({ ref, oid, preserved: false }); store.event(state, 'preservation-ref-intent', { ref, oid }); }
    const record = state.managedRefs.find(r => r.ref === ref);
    if (!presentRefs.has(ref)) {
      if (record.preserved) throw new Stop(4, 'preservation-ref-movement', 'Previously preserved private ref disappeared; do not silently restore external changes.');
      if (git(cwd, ['cat-file', '-e', oid], { allow: [1, 128] }).status !== 0) continue;
      git(cwd, ['update-ref', ref, oid, '0'.repeat(oid.length)]);
      record.preserved = true;
      store.event(state, 'source-object-preserved', { ref, oid });
    }
  }
}
function ancestor(cwd, source, target) {
  const result = git(cwd, ['merge-base', '--is-ancestor', source, target], { allow: [1] });
  return result.status === 0;
}
function commitExists(cwd, oid) {
  return OID.test(oid) && git(cwd, ['cat-file', '-e', `${oid}^{commit}`], { allow: [1, 128] }).status === 0;
}
function changedPaths(cwd, a, b) {
  return git(cwd, ['diff', '--no-renames', '--name-only', '-z', a, b, '--']).stdout.split('\0').filter(Boolean).sort();
}
function stagedPaths(cwd) {
  return git(cwd, ['diff', '--cached', '--no-renames', '--name-only', '-z', '--']).stdout.split('\0').filter(Boolean).sort();
}
function treeEntry(cwd, tree, name) {
  const cache = execution.getStore()?.treeMaps;
  const key = `${cwd}\0${tree}`;
  let entries = OID.test(tree) ? cache?.get(key) : null;
  if (!entries) { entries = new Map(treeEntries(cwd, tree).map(e => [e.path, e])); if (OID.test(tree)) cache?.set(key, entries); }
  const entry = entries.get(name);
  return entry ? { mode: entry.mode, oid: entry.oid } : { mode: null, oid: null };
}
function bindPacket(packet) { return { ...packet, packetDigest: digest(packet) }; }
function validateEvidence(dir, records) {
  if (!Array.isArray(records) || !records.length) throw new Stop(4, 'review-evidence', 'Parent review requires durable evidence files.');
  for (const record of records) {
    if (!record || typeof record.relativePath !== 'string' || !/^[0-9a-f]{64}$/.test(record.sha256 || '')) throw new Stop(4, 'review-evidence', 'Review evidence schema is invalid.');
    const p = sourcePath(dir, record.relativePath);
    if (!p.startsWith(`${dir}${path.sep}`)) throw new Stop(4, 'review-evidence', 'Evidence must remain in private run directory.');
    const stat = regularFile(p);
    if ((stat.mode & 0o077) || hash(fs.readFileSync(p)) !== record.sha256) throw new Stop(4, 'review-evidence', 'Review evidence is not private or hash-matched.');
  }
}
function reviewer(receipt) {
  if (receipt.schema !== SCHEMA || receipt.reviewer?.role !== 'parent' || typeof receipt.reviewer.provider !== 'string' || typeof receipt.reviewer.model !== 'string') throw new Stop(4, 'review-receipt', 'Receipt must identify the independently reviewing parent.');
  if (process.env.PI_PROVIDER && receipt.reviewer.provider !== process.env.PI_PROVIDER) throw new Stop(4, 'review-receipt', 'Parent review provider does not match active identity.');
  if (process.env.PI_MODEL && receipt.reviewer.model !== process.env.PI_MODEL) throw new Stop(4, 'review-receipt', 'Parent review model does not match active identity.');
}
function executionPreflight(cwd, common, targetOid, store) {
  const config = git(cwd, ['config', '--get-regexp', '^(merge\\..*\\.driver|filter\\..*\\.(clean|smudge|process)|diff\\..*\\.(command|textconv)|core\\.(fsmonitor|attributesfile))$'], { allow: [1] }).stdout;
  const automatic = ['post-checkout', 'post-merge', 'pre-merge-commit', 'reference-transaction', 'post-commit', 'prepare-commit-msg', 'commit-msg'];
  const hooks = []; const hookPaths = gitPaths(cwd, automatic.map(name => `hooks/${name}`));
  for (const name of automatic) {
    const p = hookPaths.get(`hooks/${name}`);
    const relative = path.relative(cwd, p);
    const inTree = !relative.startsWith('..') && !path.isAbsolute(relative) && !relative.startsWith('.git/');
    const target = targetOid && inTree ? treeEntry(cwd, targetOid, relative.split(path.sep).join('/')) : { mode: null, oid: null };
    let hookStat = null; try { hookStat = fs.lstatSync(p); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (hookStat && !hookStat.isFile() || target.mode === '120000' || target.mode === '160000') throw new Stop(4, 'unsafe-automatic-hook', 'Automatic executable hooks must be regular files, never symlink/submodule escape routes.');
    if (hookStat?.mode & 0o111 || target.mode === '100755') hooks.push({ name, path: p, actual: hookStat ? fingerprintFile(p) : null, target });
  }
  const executableConfig = config.split('\n').filter(Boolean).filter(line => !/^core\.fsmonitor (?:false|0)$/.test(line));
  if (!executableConfig.length && !hooks.length) return false;
  const sourceOid = targetOid || text(cwd, ['rev-parse', 'HEAD']);
  const attributes = treeEntries(cwd, sourceOid).filter(e => /(?:^|\/)\.gitattributes$/.test(e.path));
  const packet = bindPacket({ schema: SCHEMA, sourceOid, configDigest: hash(config), hooksDigest: digest(hooks), attributesDigest: digest(attributes), hooks, attributes });
  if (store) atomicWrite(path.join(store.dir, 'base-execution-packet.json'), packet);
  const dir = store?.dir || path.join(common, 'loop-merge-push');
  const approval = path.join(dir, 'base-execution-approval.json');
  if (!fs.existsSync(approval)) throw new Stop(4, 'git-execution-review', 'Configured external drivers/filters/fsmonitor/attributes or automatic hooks require exact parent review BEFORE Git can execute them.', { reviewPacket: packet, reviewPacketPath: store ? path.join(store.dir, 'base-execution-packet.json') : null });
  privateDirectory(dir);
  const receipt = readPrivate(approval); reviewer(receipt);
  for (const key of ['sourceOid', 'configDigest', 'hooksDigest', 'attributesDigest', 'packetDigest']) if (receipt[key] !== packet[key]) throw new Stop(4, 'git-execution-review', 'Git execution trust receipt is stale for actual config/hooks/attributes/source.');
  if (receipt.decision !== 'approve-reviewed-git-execution') throw new Stop(4, 'git-execution-review', 'Git execution receipt decision is invalid.');
  validateEvidence(dir, receipt.evidenceFiles);
  return true;
}
function gateHooks(cwd) {
  const hookPaths = gitPaths(cwd, ['hooks/pre-commit', 'hooks/pre-push']);
  for (const name of ['pre-commit', 'pre-push']) {
    const p = hookPaths.get(`hooks/${name}`);
    if (!fs.existsSync(p) || !regularFile(p) || !(fs.statSync(p).mode & 0o111)) throw new Stop(1, 'missing-hook', `Executable ordinary ${name} hook is required.`);
  }
  const security = path.join(cwd, 'scripts/security-commit-review.sh');
  if (!fs.existsSync(security) || !regularFile(security)) throw new Stop(1, 'missing-security-gate', 'Configured staged security gate is unavailable.');
}
function checkOptionalIdentity() {
  if (process.env.SECURITY_COMMIT_AUTO_FIX === '1') throw new Stop(4, 'security-remediation-parent', 'Automatic remediation was requested; this agent-free engine cannot launch source/security agents. Parent must perform bounded reviewed remediation separately.');
  if (process.env.SECURITY_COMMIT_AGENT_REVIEW === '1') throw new Stop(4, 'optional-review-identity', 'Optional external-agent review was requested; its resolved model cannot be verified by this agent-free runner. Parent must run it with verified identity before resuming under an approved environment.');
}
class Store {
  constructor(common, id, fresh) {
    this.base = path.join(common, 'loop-merge-push');
    if (!fs.existsSync(this.base)) fs.mkdirSync(this.base, { mode: 0o700 });
    privateDirectory(this.base);
    this.dir = path.join(this.base, id);
    if (fresh) fs.mkdirSync(this.dir, { mode: 0o700 });
    privateDirectory(this.dir);
    this.file = path.join(this.dir, 'state.json');
    this.lock = path.join(this.base, 'active.lock');
  }
  acquire(id) {
    try {
      this.fd = fs.openSync(this.lock, 'wx', 0o600);
      fs.writeFileSync(this.fd, stable({ schema: SCHEMA, pid: process.pid, runId: id, owner: process.getuid?.(), startedAt: new Date().toISOString() }));
      fs.fsyncSync(this.fd);
    } catch { throw new Stop(4, 'run-locked', 'An active/stale common-directory mutex requires explicit owner resolution.'); }
  }
  release() { if (this.fd !== undefined) { fs.closeSync(this.fd); fs.unlinkSync(this.lock); this.fd = undefined; } }
  save(data) {
    const context = execution.getStore();
    if (context?.logs.length) data.evidencePaths = [...new Set([...(data.evidencePaths || []), ...context.logs])];
    atomicWrite(this.file, { schema: SCHEMA, digest: digest(data), data });
  }
  load() {
    const record = readPrivate(this.file);
    if (record.schema !== SCHEMA || record.digest !== digest(record.data)) throw new Stop(4, 'state-integrity', 'Run ledger is corrupt or checksum-mismatched.');
    return record.data;
  }
  event(state, kind, data = {}) { state.events.push({ kind, ...data, at: new Date().toISOString() }); this.save(state); }
}
function captureInputHistory(state, inv) {
  state.inputInventories ||= [];
  if (!state.inputInventories.some(old => old.fingerprint === inv.fingerprint)) state.inputInventories.push(structuredClone(inv));
}
function pendingInputs(state) {
  const groups = new Map();
  const runtimeOnly = new Set(['ownership-held', 'unknown-ignored', 'source-race']);
  for (const inv of state.inputInventories || [state.expected]) {
    for (const workspace of inv.worktrees) {
      const content = workspace.blockers.filter(b => !runtimeOnly.has(b.kind));
      if (!content.length) continue;
      const key = digest({ sourceId: `worktree:${workspace.path}`, fingerprint: workspace.fingerprint });
      groups.set(key, { inputDigest: key, sourceId: `worktree:${workspace.path}`, kind: 'worktree', snapshot: workspace, blockers: content.map(b => ({ ...b, inputDigest: key })) });
    }
    for (const saved of inv.stash) {
      const key = digest({ sourceId: `stash:${saved.oid}`, parents: saved.parents });
      groups.set(key, { inputDigest: key, sourceId: `stash:${saved.oid}`, kind: 'stash', snapshot: saved, blockers: [{ kind: 'stash-intake', sourceId: `stash:${saved.oid}`, inputDigest: key, paths: [], detail: 'Original three-part stash intake remains unresolved until reviewed recovery proof.' }] });
    }
    for (const input of inv.noncommitInputs) {
      const key = digest({ sourceId: input.id, oid: input.oid });
      groups.set(key, { inputDigest: key, sourceId: input.id, kind: 'noncommit', snapshot: input, blockers: [{ kind: 'noncommit-intake', sourceId: input.id, inputDigest: key, paths: input.entries.map(e => e.path), detail: 'Original historical noncommit input requires reviewed recovery, not fake ancestry.' }] });
    }
  }
  return [...groups.values()];
}
function addSources(state, rows) {
  const ids = new Set(state.sources.map(row => `${row.id}\0${row.oid}`));
  for (const row of rows) if (!ids.has(`${row.id}\0${row.oid}`)) { state.sources.push(row); ids.add(`${row.id}\0${row.oid}`); }
}
function updateSnapshot(cwd, common, state) {
  return inventory(cwd, common, { ref: state.integrationRef, worktree: state.integrationWorktree, managedRefs: state.managedRefs });
}
function assertStable(cwd, common, state, store) {
  const current = updateSnapshot(cwd, common, state);
  if (current.fingerprint === state.expected.fingerprint) return current;
  const receiptPath = path.join(store.dir, 'source-transition-approval.json');
  if (!fs.existsSync(receiptPath)) throw new Stop(4, 'source-movement', 'Frozen source changed; parent must review exact old/new census and recovery evidence.', { currentInventory: current });
  const receipt = readPrivate(receiptPath);
  reviewer(receipt);
  if (receipt.runId !== state.id || receipt.beforeDigest !== state.expected.fingerprint || receipt.afterDigest !== current.fingerprint || receipt.decision !== 'approve-reviewed-source-transition') throw new Stop(4, 'source-movement', 'Source transition receipt does not bind exact old/new census.');
  validateEvidence(store.dir, receipt.evidenceFiles);
  if (!Array.isArray(receipt.recoveryOids)) throw new Stop(4, 'source-movement', 'Source transition receipt must enumerate ordinary reviewed recovery commits.');
  for (const oid of receipt.recoveryOids) {
    if (!commitExists(cwd, oid)) throw new Stop(4, 'missing-recovery-commit', 'Reviewed recovery commit is unavailable.');
    addSources(state, [{ id: `recovery:${oid}`, oid, kind: 'recovery' }]);
  }
  addSources(state, current.sources);
  captureInputHistory(state, state.expected); captureInputHistory(state, current);
  state.expected = current;
  store.event(state, 'accepted-source-transition', { beforeDigest: receipt.beforeDigest, afterDigest: receipt.afterDigest, receiptDigest: digest(receipt) });
  return current;
}
async function hashBlob(cwd, oid) {
  if (!OID.test(oid || '')) throw new Stop(4, 'recovery-blob', 'Recovery blob ID is invalid.');
  const context = execution.getStore(); context.blobHashes ||= new Map();
  if (context.blobHashes.has(oid)) return context.blobHashes.get(oid);
  const promised = new Promise((resolve, reject) => {
    const child = spawn('git', ['--no-replace-objects', 'cat-file', 'blob', oid], { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const hasher = createHash('sha256'); let stderr = ''; let settled = false;
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, 300_000);
    child.stdout.on('data', chunk => hasher.update(chunk));
    child.stderr.on('data', chunk => { if (stderr.length < 64 * 1024) stderr += chunk.toString('utf8'); });
    child.on('error', () => { clearTimeout(timer); if (!settled) { settled = true; reject(new Stop(1, 'recovery-blob', 'Replace-safe streamed recovery blob read failed.')); } });
    child.on('close', (code, signal) => {
      clearTimeout(timer); if (settled) return; settled = true;
      if (code !== 0) {
        let evidencePath;
        if (context.evidenceDir) { evidencePath = path.join(context.evidenceDir, `${String(++context.sequence).padStart(6, '0')}-recovery-blob-failure.json`); atomicWrite(evidencePath, { cwd, args: ['--no-replace-objects', 'cat-file', 'blob', oid], status: code, signal, stderr }); context.logs.push(evidencePath); }
        reject(new Stop(1, 'recovery-blob', 'Replace-safe streamed recovery blob read failed.', { evidencePath }));
      } else resolve(hasher.digest('hex'));
    });
  });
  context.blobHashes.set(oid, promised);
  return promised;
}
async function intakeBlockers(cwd, state, store) {
  captureInputHistory(state, state.expected);
  const inputs = pendingInputs(state);
  const runtimeOnly = new Set(['ownership-held', 'unknown-ignored', 'source-race']);
  const blockers = [...inputs.flatMap(i => i.blockers), ...state.expected.blockers.filter(b => runtimeOnly.has(b.kind)), ...state.fetchBlockers];
  const receiptPath = path.join(store.dir, 'intake-approval.json');
  if (!fs.existsSync(receiptPath)) return blockers;
  const receipt = readPrivate(receiptPath);
  reviewer(receipt);
  if (receipt.runId !== state.id || receipt.inventoryDigest !== state.expected.fingerprint || receipt.decision !== 'approve-reviewed-intake' || !Array.isArray(receipt.resolutions)) throw new Stop(4, 'intake-receipt', 'Intake receipt does not bind exact frozen source bytes.');
  validateEvidence(store.dir, receipt.evidenceFiles);
  const resolved = new Set();
  for (const resolution of receipt.resolutions) {
    const selected = inputs.find(i => i.sourceId === resolution.sourceId && i.inputDigest === resolution.inputDigest);
    const candidates = blockers.filter(b => selected && b.inputDigest === selected.inputDigest);
    if (!candidates.length || candidates.some(b => ['missing-workspace', 'source-race', 'unreadable-workspace', 'foreign-workspace', 'unsafe-workspace', 'submodule-state', 'dirty-submodule', 'ownership-held', 'unfinished-operation', 'unknown-ignored', 'unresolved-index', 'special-file', 'empty-untracked-directory', 'foreign-embedded-repository'].includes(b.kind))) throw new Stop(4, 'intake-receipt', 'Unknown bytes/ownership/unsafe inputs cannot be waived by intake receipt.');
    if (!Array.isArray(resolution.recoveryOids) || !resolution.recoveryOids.length) throw new Stop(4, 'intake-receipt', 'Intake requires ordinary reviewed recovery commits.');
    for (const oid of resolution.recoveryOids) {
      if (!commitExists(cwd, oid)) throw new Stop(4, 'intake-receipt', 'Recovery commit is not available.');
      addSources(state, [{ id: `recovery:${oid}`, oid, kind: 'recovery' }]);
    }
    const historicalObject = selected?.kind === 'noncommit' ? selected.snapshot : null;
    if (historicalObject) {
      if (resolution.objectOid !== historicalObject.oid || !Array.isArray(resolution.versions)) throw new Stop(4, 'noncommit-intake', 'Historical object receipt is not exact-bound.');
      const entries = historicalObject.objectType === 'tree' ? historicalObject.entries : historicalObject.objectType === 'blob' ? [{ path: null, oid: historicalObject.oid, type: 'blob', mode: null }] : null;
      if (!entries) throw new Stop(4, 'noncommit-intake', 'Unknown object type remains explicitly unresolved.');
      for (const entry of entries) {
        if (!resolution.versions.some(v => v.oid === entry.oid && (entry.path === null || v.path === entry.path) && resolution.recoveryOids.includes(v.commit) && treeEntry(cwd, v.commit, v.path).oid === entry.oid && (entry.mode === null || treeEntry(cwd, v.commit, v.path).mode === entry.mode))) throw new Stop(4, 'noncommit-intake', 'Original noncommit tree/blob version is not represented in normal recovery history.');
      }
    } else if (resolution.sourceId.startsWith('stash:')) {
      const oid = resolution.sourceId.slice(6);
      const saved = selected?.kind === 'stash' ? selected.snapshot : null;
      if (!saved || !resolution.recoveryOids.some(recovery => ancestor(cwd, oid, recovery))) throw new Stop(4, 'intake-receipt', 'Stash original history must be preserved by ordinary recovery ancestry.');
      if (!Array.isArray(resolution.components)) throw new Stop(4, 'stash-intake', 'Stash requires exact index/worktree/untracked component tree proofs.');
      const baseEntries = treeEntries(cwd, saved.parents[0]);
      const components = [{ kind: 'worktree', object: oid }, { kind: 'index', object: saved.parents[1] }, ...(saved.parents[2] ? [{ kind: 'untracked', object: saved.parents[2] }] : [])];
      for (const component of components) {
        if (!component.object) throw new Stop(4, 'stash-intake', 'Saved stash index/base parent is missing.');
        const treeOid = text(cwd, ['rev-parse', `${component.object}^{tree}`]);
        const entries = treeEntries(cwd, treeOid);
        const names = new Set(entries.map(e => e.path));
        const deletions = component.kind === 'untracked' ? [] : baseEntries.filter(e => !names.has(e.path)).map(e => e.path).sort();
        const proof = resolution.components.find(c => c.kind === component.kind);
        if (!proof || proof.treeOid !== treeOid || proof.entriesDigest !== digest(entries) || stable(proof.deletions) !== stable(deletions) || !resolution.recoveryOids.includes(proof.commit) || proof.commit === oid || saved.parents.includes(proof.commit) || !ancestor(cwd, oid, proof.commit)) throw new Stop(4, 'stash-intake', 'Stash component proof must bind exact original tree and a NEW ordinary recovery descendant.');
        for (const entry of entries) { const represented = treeEntry(cwd, proof.commit, entry.path); if (represented.oid !== entry.oid || represented.mode !== entry.mode) throw new Stop(4, 'stash-intake', 'Distinct stash component bytes/modes are not simultaneously represented in reviewed recovery.'); }
        for (const name of deletions) if (treeEntry(cwd, proof.commit, name).oid !== null) throw new Stop(4, 'stash-intake', 'Original stash component deletion is not represented.');
      }
      addSources(state, [{ id: resolution.sourceId, oid, kind: 'stash' }, ...saved.parents.map(parent => ({ id: `stash-parent:${oid}:${parent}`, oid: parent, kind: 'stash' }))]);
    } else {
      const workspace = selected?.kind === 'worktree' ? selected.snapshot : null;
      if (!workspace || resolution.sourceFingerprint !== workspace.fingerprint || !Array.isArray(resolution.versions)) throw new Stop(4, 'intake-receipt', 'Dirty source version matrix is missing or stale.');
      // Distinct index and worktree versions must occur in the reviewed recovery history.
      for (const entry of workspace.index.filter(e => e.stage === 0 && e.mode !== '160000')) {
        if (!resolution.versions.some(v => v.path === entry.path && v.kind === 'index' && v.oid === entry.oid && v.mode === entry.mode && resolution.recoveryOids.includes(v.commit) && treeEntry(cwd, v.commit, v.path).oid === v.oid && treeEntry(cwd, v.commit, v.path).mode === entry.mode)) throw new Stop(4, 'intake-receipt', 'Original index version is not represented in reviewed recovery commits.');
      }
      for (const deleted of workspace.indexDeletions) if (!resolution.versions.some(v => v.path === deleted.path && v.kind === 'index-deleted' && v.mode === null && resolution.recoveryOids.includes(v.commit) && treeEntry(cwd, v.commit, v.path).oid === null)) throw new Stop(4, 'intake-receipt', 'Original staged deletion is not represented in reviewed recovery.');
      for (const file of workspace.files.filter(f => f.kind === 'file' || f.kind === 'symlink')) {
        const expectedMode = file.kind === 'symlink' ? '120000' : file.mode & 0o111 ? '100755' : '100644';
        const version = resolution.versions.find(v => v.path === file.path && v.kind === 'worktree' && v.digest === file.digest && v.mode === expectedMode && resolution.recoveryOids.includes(v.commit));
        if (!version) throw new Stop(4, 'intake-receipt', 'Original worktree/untracked version is not represented in reviewed recovery commits.');
        const blob = treeEntry(cwd, version.commit, version.path);
        if (await hashBlob(cwd, blob.oid) !== file.digest || blob.mode !== expectedMode) throw new Stop(4, 'intake-receipt', 'Recovery blob/type/executable mode differs from frozen original bytes.');
      }
      for (const file of workspace.files.filter(f => f.kind === 'missing')) if (!resolution.versions.some(v => v.path === file.path && v.kind === 'deleted' && v.mode === null && resolution.recoveryOids.includes(v.commit) && treeEntry(cwd, v.commit, v.path).oid === null)) throw new Stop(4, 'intake-receipt', 'Original deletion is not represented in recovery.');
    }
    resolved.add(selected.inputDigest);
  }
  state.acceptedIntake = [...resolved];
  store.save(state);
  return blockers.filter(b => !b.inputDigest || !resolved.has(b.inputDigest));
}
function policyPacket(cwd, state, source, beforeOid, proposedTreeOid, store) {
  const paths = changedPaths(cwd, beforeOid, proposedTreeOid).filter(name => {
    if (critical(name)) return true;
    const before = treeEntry(cwd, beforeOid, name); const after = treeEntry(cwd, proposedTreeOid, name);
    return ['120000', '160000'].some(mode => before.mode === mode || after.mode === mode);
  });
  if (!paths.length) return null;
  const diff = git(cwd, ['diff', '--binary', beforeOid, proposedTreeOid, '--', ...paths]).stdout;
  const packet = bindPacket({ schema: SCHEMA, runId: state.id, inventoryDigest: state.expected.fingerprint, sourceOid: source, beforeOid, proposedTreeOid, criticalPaths: paths.map(name => { const a = treeEntry(cwd, beforeOid, name); const b = treeEntry(cwd, proposedTreeOid, name); return { path: name, oldMode: a.mode, oldOid: a.oid, newMode: b.mode, newOid: b.oid }; }), diffDigest: hash(diff) });
  // Policy diff is private; never print its possibly sensitive bytes.
  atomicWrite(path.join(store.dir, 'policy-diff.json'), { diff });
  atomicWrite(path.join(store.dir, 'policy-packet.json'), packet);
  atomicWrite(path.join(store.dir, `policy-packet-${packet.packetDigest}.json`), packet);
  atomicWrite(path.join(store.dir, `policy-diff-${packet.packetDigest}.json`), { diff });
  state.pendingReviews ||= []; state.pendingReviews = state.pendingReviews.filter(p => p.sourceOid !== source); state.pendingReviews.push(packet);
  state.pendingReview = packet;
  store.save(state);
  const specific = path.join(store.dir, `policy-approval-${packet.packetDigest}.json`);
  const approval = fs.existsSync(specific) ? specific : path.join(store.dir, 'policy-approval.json');
  if (!fs.existsSync(approval)) throw new Stop(4, 'policy-review', 'Policy-critical candidate requires bounded parent diff approval BEFORE candidate hooks/code execute.', { paths });
  const receipt = readPrivate(approval);
  reviewer(receipt);
  for (const key of ['runId', 'inventoryDigest', 'sourceOid', 'beforeOid', 'proposedTreeOid', 'packetDigest', 'diffDigest']) if (receipt[key] !== packet[key]) throw new Stop(4, 'policy-review', 'Policy receipt does not bind this exact source/proposed tree/diff.');
  if (stable(receipt.criticalPaths) !== stable(packet.criticalPaths) || receipt.decision !== 'approve-preserved-gates' || !['normal-merge-commit', 'execute-existing-local-gates'].every(action => receipt.approvedActions?.includes(action))) throw new Stop(4, 'policy-review', 'Policy receipt scope/actions do not match candidate.');
  validateEvidence(store.dir, receipt.evidenceFiles);
  state.policyReviews.push({ packetDigest: packet.packetDigest, receiptDigest: digest(receipt) });
  state.pendingReview = null; state.pendingReviews = state.pendingReviews.filter(p => p.sourceOid !== source);
  store.save(state);
  return packet;
}
function commitPending(cwd, common, state, store) {
  const p = state.pendingMerge;
  const w = state.integrationWorktree;
  assertStable(cwd, common, state, store);
  const head = text(w, ['rev-parse', 'HEAD']);
  if (head !== p.beforeOid) {
    // Only recover a crashed normal merge commit with exact parent list/tree intent.
    const parents = text(w, ['rev-list', '--parents', '-n', '1', head]).split(' ').slice(1);
    if (state.intent?.kind !== 'merge-commit' || parents[0] !== p.beforeOid || parents[1] !== p.sourceOid || text(w, ['rev-parse', 'HEAD^{tree}']) !== state.intent.treeOid || git(w, ['status', '--porcelain', '--untracked-files=all']).stdout) throw new Stop(4, 'integration-movement', 'Integration HEAD moved outside recorded normal merge intent.');
    state.merges.push({ sourceOid: p.sourceOid, beforeOid: p.beforeOid, afterOid: head, treeOid: state.intent.treeOid, recovered: true });
    state.pendingMerge = null; state.pendingConflict = null; state.intent = null; state.integrationHead = head;
    store.event(state, 'recovered-normal-merge', { oid: head });
    return;
  }
  if (text(w, ['rev-parse', 'MERGE_HEAD']) !== p.sourceOid) throw new Stop(4, 'merge-parent-mismatch', 'Pending MERGE_HEAD does not match frozen source.');
  const entries = indexEntries(w);
  if (entries.some(e => e.stage !== 0)) throw new Stop(3, 'conflict', 'Resolve packet paths and stage the reviewed resolution before resume.');
  if (git(w, ['diff', '--quiet'], { allow: [1] }).status !== 0 || git(w, ['ls-files', '--others', '--exclude-standard', '-z']).stdout) throw new Stop(4, 'unrelated-resolution', 'Integration has unstaged/untracked edits outside reviewed staged resolution.');
  const staged = stagedPaths(w);
  if (staged.some(name => !p.allowedPaths.includes(name))) throw new Stop(4, 'unrelated-resolution', 'Staged changes extend outside the pending merge allowlist.');
  if (state.pendingConflict) {
    const packet = state.pendingConflict;
    const approval = path.join(store.dir, 'conflict-approval.json');
    const proposedTreeOid = text(w, ['write-tree']); const resolutionIndexDigest = digest(entries);
    atomicWrite(path.join(store.dir, 'resolution-packet.json'), { schema: SCHEMA, runId: state.id, packetDigest: packet.packetDigest, beforeOid: p.beforeOid, sourceOid: p.sourceOid, proposedTreeOid, resolutionIndexDigest });
    if (!fs.existsSync(approval)) throw new Stop(3, 'conflict-review', 'Parent per-file conflict decisions bound to exact resolution tree/index are required before normal merge commit.');
    const receipt = readPrivate(approval); reviewer(receipt);
    if (receipt.proposedTreeOid !== proposedTreeOid || receipt.resolutionIndexDigest !== resolutionIndexDigest) throw new Stop(3, 'conflict-review', 'Conflict approval does not bind actual staged resolution tree/index; never execute stale-approved hooks.');
    if (receipt.runId !== state.id || receipt.packetDigest !== packet.packetDigest || receipt.beforeOid !== p.beforeOid || receipt.sourceOid !== p.sourceOid || !Array.isArray(receipt.decisions)) throw new Stop(3, 'conflict-review', 'Conflict receipt is stale or outside pending parents.');
    for (const name of packet.paths) {
      const decision = receipt.decisions.find(d => d.path === name && typeof d.decision === 'string' && d.decision.length);
      if (!decision) throw new Stop(3, 'conflict-review', 'Every original conflict path requires a parent decision.');
      validateEvidence(store.dir, decision.evidenceFiles);
    }
    state.conflictDecisions.push({ packetDigest: packet.packetDigest, receiptDigest: digest(receipt), paths: packet.paths });
  }
  const treeOid = text(w, ['write-tree']);
  if (!state.pendingConflict && treeOid !== p.proposedTree) {
    const paths = changedPaths(w, p.proposedTree, treeOid);
    if (paths.some(name => !p.allowedPaths.includes(name))) throw new Stop(4, 'unrelated-resolution', 'Merge reconciliation extends outside original bounded source paths.');
    const packet = bindPacket({ schema: SCHEMA, runId: state.id, beforeOid: p.beforeOid, sourceOid: p.sourceOid, originalProposedTreeOid: p.proposedTree, proposedTreeOid: treeOid, resolutionIndexDigest: digest(entries), paths });
    atomicWrite(path.join(store.dir, 'merge-reconciliation-packet.json'), packet);
    const approval = path.join(store.dir, 'merge-reconciliation-approval.json');
    if (!fs.existsSync(approval)) throw new Stop(4, 'unreviewed-staged-tree', 'Bounded manual merge repair requires exact parent reconciliation receipt before code/hooks execute.');
    const receipt = readPrivate(approval); reviewer(receipt);
    for (const key of ['runId', 'beforeOid', 'sourceOid', 'originalProposedTreeOid', 'proposedTreeOid', 'resolutionIndexDigest', 'packetDigest']) if (receipt[key] !== packet[key]) throw new Stop(4, 'unreviewed-staged-tree', 'Merge reconciliation receipt is stale or outside frozen parents/tree/index.');
    if (receipt.decision !== 'approve-bounded-merge-reconciliation' || !Array.isArray(receipt.decisions)) throw new Stop(4, 'unreviewed-staged-tree', 'Bounded merge reconciliation decision schema is invalid.');
    for (const name of paths) { const decision = receipt.decisions.find(d => d.path === name && typeof d.decision === 'string' && d.decision.length); if (!decision) throw new Stop(4, 'unreviewed-staged-tree', 'Each manually reconciled source path needs independent decision evidence.'); validateEvidence(store.dir, decision.evidenceFiles); }
    state.reconciliations ||= []; state.reconciliations.push({ packetDigest: packet.packetDigest, receiptDigest: digest(receipt), paths }); store.save(state);
  }
  policyPacket(w, state, p.sourceOid, p.beforeOid, treeOid, store);
  executionPreflight(w, common, treeOid, store);
  checkOptionalIdentity();
  gateHooks(w);
  command(w, 'bash', ['scripts/security-commit-review.sh', 'staged'], { stage: 'staged-security' });
  if (text(w, ['write-tree']) !== treeOid || digest(indexEntries(w)) !== digest(entries) || text(w, ['rev-parse', 'HEAD']) !== p.beforeOid || text(w, ['rev-parse', 'MERGE_HEAD']) !== p.sourceOid || git(w, ['diff', '--quiet'], { allow: [1] }).status !== 0) throw new Stop(4, 'candidate-movement', 'Exact approved staged tree/index/parents moved during source security review; no commit.');
  state.intent = { kind: 'merge-commit', beforeOid: p.beforeOid, sourceOid: p.sourceOid, treeOid };
  store.event(state, 'merge-commit-intent', state.intent);
  git(w, ['commit', '-m', `Merge frozen source ${p.sourceOid.slice(0, 12)} (loop ALL ${state.id})`], { stage: 'ordinary-merge-commit-hooks' });
  const afterOid = text(w, ['rev-parse', 'HEAD']);
  const parents = text(w, ['rev-list', '--parents', '-n', '1', afterOid]).split(' ').slice(1);
  if (parents.length !== 2 || parents[0] !== p.beforeOid || parents[1] !== p.sourceOid || text(w, ['rev-parse', 'HEAD^{tree}']) !== treeOid) throw new Stop(4, 'merge-commit-integrity', 'Normal merge commit does not match recorded parents/tree.');
  state.merges.push({ sourceOid: p.sourceOid, beforeOid: p.beforeOid, afterOid, treeOid });
  state.pendingMerge = null; state.pendingConflict = null; state.intent = null;
  state.integrationHead = afterOid;
  store.event(state, 'normal-merge-committed', { afterOid });
}
function restoreConflict(cwd, state, store) {
  const p = state.pendingMerge; const entries = indexEntries(state.integrationWorktree);
  const paths = [...new Set(entries.filter(e => e.stage !== 0).map(e => e.path))].sort();
  if (!paths.length) return;
  p.allowedPaths = [...new Set([...p.allowedPaths, ...paths, ...stagedPaths(state.integrationWorktree)])].sort();
  const packet = bindPacket({ schema: SCHEMA, runId: state.id, beforeOid: p.beforeOid, sourceOid: p.sourceOid, sourceIds: p.sourceIds, paths, stagedPaths: stagedPaths(state.integrationWorktree), indexDigest: digest(entries), stages: entries.filter(e => e.stage !== 0) });
  state.pendingConflict = packet; state.phase = 'conflict'; state.intent = null;
  atomicWrite(path.join(store.dir, 'conflict-packet.json'), packet); store.event(state, 'recovered-conflict-index');
}
async function recoverFacts(cwd, common, state, store, adapter) {
  const intent = state.intent;
  if (intent?.kind === 'create-integration') {
    const row = worktrees(cwd).find(w => w.worktree === intent.worktree);
    const ref = refs(cwd).find(r => r.ref === intent.ref);
    if (!row && !ref && !fs.existsSync(intent.worktree)) {
      executionPreflight(cwd, common, intent.baseOid, store);
      git(cwd, ['worktree', 'add', '-b', intent.ref.slice('refs/heads/'.length), intent.worktree, intent.baseOid]);
    } else if (!row || !ref || row.HEAD !== intent.baseOid || ref.oid !== intent.baseOid || row.branch !== intent.ref) throw new Stop(4, 'integration-create-incomplete', 'Partially created integration does not match exact intent; no overwrite/prune.');
    state.integrationHead = intent.baseOid; state.intent = null; store.event(state, 'integration-create-facts-recovered');
  }
  if (intent?.kind === 'normal-merge' && state.pendingMerge) {
    const p = state.pendingMerge; const w = state.integrationWorktree;
    const head = text(w, ['rev-parse', 'HEAD']);
    const merge = git(w, ['rev-parse', '--verify', 'MERGE_HEAD'], { allow: [128] }).stdout.trim();
    if (head === p.beforeOid && !merge) {
      if (git(w, ['status', '--porcelain', '--untracked-files=all']).stdout) throw new Stop(4, 'premerge-intent-drift', 'Pre-operation integration is not clean; no retry over unexplained edits.');
      state.pendingMerge = null; state.intent = null; store.event(state, 'normal-merge-not-started-retry-safe');
    } else if (head === p.beforeOid && merge === p.sourceOid) {
      restoreConflict(cwd, state, store);
      if (!state.pendingConflict) { state.intent = null; store.event(state, 'clean-merge-index-facts-recovered'); }
    } else throw new Stop(4, 'merge-intent-drift', 'Normal merge intent facts do not match recorded parents.');
  }
  if (intent?.kind === 'main-push' && !state.publication) {
    const observed = remoteHead(cwd);
    if (observed === intent.afterOid && state.validation?.oid === intent.afterOid && state.validation.passed) {
      state.publication = { mode: 'ordinary-main-fast-forward', beforeOid: intent.beforeOid, afterOid: intent.afterOid, recovered: true };
      state.intent = null; fetchedMain(cwd, state, store); store.event(state, 'main-push-facts-recovered', state.publication);
    } else if (observed === intent.beforeOid) { state.intent = null; store.event(state, 'main-push-not-landed-retry-safe'); }
    else throw new Stop(4, 'main-push-uncertain', 'Remote main does not match old/new publication intent; no repeated blind push.');
  }
  if (!state.publication && state.pr?.number && state.validation) {
    const observed = await adapter.inspectPullRequest({ cwd, remote: 'origin', branch: 'main', number: state.pr.number, headOid: state.validation.oid });
    if (observed.merged) {
      const policy = await adapter.discoverPolicy({ cwd, remote: 'origin', branch: 'main' }); validatePolicy(policy);
      if (observed.headOid !== state.validation.oid || !OID.test(observed.mergeOid || '') || observed.approvals < policy.requiredApprovals || !policy.requiredChecks.every(required => observed.checks?.some(c => c.context === required.context && (required.appId === null || c.appId === required.appId) && c.headOid === state.validation.oid && c.status === 'completed' && c.conclusion === 'success'))) throw new Stop(5, 'merged-pr-gate-provenance', 'Already-merged PR is not exact-head/current-gate proven.');
      state.policy = policy; state.publication = { mode: 'protected-history-merge', number: state.pr.number, headOid: observed.headOid, mergeOid: observed.mergeOid, checks: observed.checks, approvals: observed.approvals, recovered: true };
      state.intent = null; fetchedMain(cwd, state, store); store.event(state, 'protected-merge-facts-recovered', state.publication);
    }
  }
  if (intent && ['worktree-remove', 'branch-delete'].includes(intent.kind)) {
    const proof = state.mainProof;
    if (!proof || !state.validation?.passed || proof.sourcesDigest !== digest(state.sources) || remoteHead(cwd) !== proof.oid || text(cwd, ['rev-parse', `${proof.oid}^{tree}`]) !== state.validation.tree || state.sources.some(s => !ancestor(cwd, s.oid, proof.oid))) throw new Stop(4, 'cleanup-recovery-proof', 'Cleanup recovery needs fresh global accepted-main ancestry/tree proof.');
    const candidate = structuredClone(state.expected);
    let reached = false;
    if (intent.kind === 'worktree-remove') {
      const registered = worktrees(cwd).some(w => w.worktree === intent.path);
      if (!registered && !fs.existsSync(intent.path)) {
        const row = candidate.worktrees.find(w => w.path === intent.path);
        if (!row || row.fingerprint !== intent.fingerprint) throw new Stop(4, 'cleanup-intent-mismatch', 'Removed workspace was not exact intended frozen state.');
        candidate.worktrees = candidate.worktrees.filter(w => w.path !== intent.path);
        candidate.blockers = candidate.blockers.filter(b => b.sourceId !== `worktree:${intent.path}`); reached = true;
      }
    } else if (!refs(cwd).some(r => r.ref === intent.ref)) {
      if (!candidate.refs.some(r => r.ref === intent.ref && r.oid === intent.oid)) throw new Stop(4, 'cleanup-intent-mismatch', 'Deleted branch was not exact intended frozen ref.');
      candidate.refs = candidate.refs.filter(r => r.ref !== intent.ref); candidate.sources = candidate.sources.filter(s => s.id !== intent.ref); reached = true;
    }
    if (reached) {
      candidate.fingerprint = inventoryDigest(candidate);
      const current = updateSnapshot(cwd, common, state);
      if (current.fingerprint !== candidate.fingerprint) throw new Stop(4, 'cleanup-recovery-drift', 'Unrelated source drift exists beyond exact completed deletion intent.');
      state.expected = candidate;
      state.cleanupActions.push(intent.kind === 'worktree-remove' ? { kind: intent.kind, path: intent.path, recovered: true } : { kind: intent.kind, ref: intent.ref, oid: intent.oid, recovered: true });
      state.intent = null; store.event(state, 'cleanup-operation-facts-recovered', intent);
    }
  }
}
function mergeSources(cwd, common, state, store) {
  const w = state.integrationWorktree;
  state.phase = 'integrating'; store.save(state);
  if (state.pendingMerge) { if (!state.pendingConflict) restoreConflict(cwd, state, store); commitPending(cwd, common, state, store); }
  for (const source of [...new Set(state.sources.map(s => s.oid))].sort()) {
    assertStable(cwd, common, state, store);
    if (!commitExists(cwd, source)) {
      state.objectBlockers.push({ kind: 'missing-source-object', sourceId: source, paths: [], detail: 'Frozen source commit is unavailable.' });
      continue;
    }
    const beforeOid = text(w, ['rev-parse', 'HEAD']);
    if (ancestor(w, source, beforeOid)) { state.coverage[source] = { integrationOid: beforeOid, ancestor: true }; store.save(state); continue; }
    if (git(w, ['status', '--porcelain', '--untracked-files=all']).stdout) throw new Stop(4, 'integration-dirty', 'Unexpected derived integration edits require explicit review.');
    // External merge drivers/attributes and automatic hooks are NOT intrinsically safe preview operations.
    let proposedTree, previewConflict = false;
    try {
      const executionRisk = executionPreflight(w, common, source, store);
      const preview = git(w, ['merge-tree', '--write-tree', '--allow-unrelated-histories', beforeOid, source], { allow: [1] });
      proposedTree = preview.stdout.split('\n')[0]; previewConflict = preview.status === 1;
      if (!OID.test(proposedTree)) throw new Stop(1, 'merge-preview', 'Cannot safely preview normal source merge.');
      // With no external driver/filter or automatic hook, --no-commit only materializes source bytes/index;
      // no newly merged program executes. Policy review therefore binds the actual staged tree in commitPending,
      // allowing bounded repairs of clean-but-unsafe control-plane changes as well as genuine conflicts.
      // If preview/merge can execute external code, BEFORE-execution trust AND proposed-tree approval are mandatory.
      if (executionRisk) policyPacket(w, state, source, beforeOid, proposedTree, store);
    } catch (error) {
      if (error instanceof Stop && error.code === 4 && ['policy-review', 'git-execution-review'].includes(error.kind)) { state.reviewBlockers.push({ kind: error.kind, sourceId: source, paths: error.paths || [], detail: error.detail, reviewPacketPath: error.reviewPacketPath || path.join(store.dir, 'policy-packet.json') }); store.event(state, 'source-review-deferred', { sourceOid: source }); continue; }
      throw error;
    }
    const allowedPaths = [...new Set([...changedPaths(w, beforeOid, proposedTree), ...changedPaths(w, beforeOid, source)])].sort();
    state.pendingMerge = { beforeOid, sourceOid: source, sourceIds: state.sources.filter(s => s.oid === source).map(s => s.id), allowedPaths, proposedTree };
    state.intent = { kind: 'normal-merge', beforeOid, sourceOid: source, proposedTree };
    store.event(state, 'normal-merge-intent', state.intent);
    const result = git(w, ['merge', '--no-ff', '--no-commit', source, '--allow-unrelated-histories'], { allow: [1] });
    if (previewConflict && result.status === 0) throw new Stop(4, 'merge-preview-drift', 'Actual merge unexpectedly differs from frozen conflict preview; no candidate gate execution.');
    if (result.status !== 0) {
      const entries = indexEntries(w);
      const paths = [...new Set(entries.filter(e => e.stage !== 0).map(e => e.path))].sort();
      if (!paths.length) throw new Stop(1, 'merge-failed', 'Normal merge failed without a resumable conflict index.');
      state.pendingMerge.allowedPaths = [...new Set([...state.pendingMerge.allowedPaths, ...paths, ...stagedPaths(w)])].sort();
      const packet = bindPacket({ schema: SCHEMA, runId: state.id, beforeOid, sourceOid: source, sourceIds: state.pendingMerge.sourceIds, paths, stagedPaths: stagedPaths(w), indexDigest: digest(entries), stages: entries.filter(e => e.stage !== 0) });
      state.pendingConflict = packet; state.phase = 'conflict'; state.intent = null;
      atomicWrite(path.join(store.dir, 'conflict-packet.json'), packet); store.save(state);
      throw new Stop(3, 'conflict', 'Normal merge conflict preserved; parent must resolve bounded packet then resume.', { paths });
    }
    state.intent = null; store.save(state);
    commitPending(cwd, common, state, store);
    state.coverage[source] = { integrationOid: text(w, ['rev-parse', 'HEAD']), ancestor: true }; store.save(state);
  }
}
function acceptContributions(cwd, state, store) {
  const oid = text(state.integrationWorktree, ['rev-parse', 'HEAD']);
  const tree = text(state.integrationWorktree, ['rev-parse', 'HEAD^{tree}']);
  const packet = bindPacket({ schema: SCHEMA, runId: state.id, inventoryDigest: state.expected.fingerprint, candidateOid: oid, candidateTree: tree, sourcesDigest: digest(state.sources), conflictsDigest: digest({ conflicts: state.conflictDecisions, reconciliations: state.reconciliations || [] }), contributions: state.sources.map(s => ({ ...s, tree: text(cwd, ['rev-parse', `${s.oid}^{tree}`]), ancestor: ancestor(cwd, s.oid, oid) })) });
  atomicWrite(path.join(store.dir, 'content-packet.json'), packet);
  const file = path.join(store.dir, 'content-approval.json');
  if (!fs.existsSync(file)) throw new Stop(4, 'content-review', 'Every source contribution/final reconciled tree requires bounded parent acceptance before final gates/publication.');
  const receipt = readPrivate(file); reviewer(receipt);
  for (const key of ['runId', 'inventoryDigest', 'candidateOid', 'candidateTree', 'sourcesDigest', 'conflictsDigest', 'packetDigest']) if (receipt[key] !== packet[key]) throw new Stop(4, 'content-review', 'Contribution receipt does not bind exact accepted candidate/all source graph.');
  if (receipt.decision !== 'approve-all-reviewed-contributions' || stable(receipt.contributions) !== stable(packet.contributions)) throw new Stop(4, 'content-review', 'Every frozen source alias/contribution must be explicitly reviewed.');
  validateEvidence(store.dir, receipt.evidenceFiles);
  state.contentAcceptance = { candidateOid: oid, candidateTree: tree, packetDigest: packet.packetDigest, receiptDigest: digest(receipt), sourcesDigest: packet.sourcesDigest };
  store.event(state, 'all-source-content-accepted', state.contentAcceptance);
}
function verifyCandidate(cwd, common, state, store) {
  assertStable(cwd, common, state, store);
  const w = state.integrationWorktree;
  const oid = text(w, ['rev-parse', 'HEAD']);
  const tree = text(w, ['rev-parse', 'HEAD^{tree}']);
  if (state.sources.some(s => !ancestor(w, s.oid, oid))) throw new Stop(4, 'coverage-gap', 'Not every frozen source/recovery commit is ancestral to the candidate.');
  if (git(w, ['status', '--porcelain', '--untracked-files=all']).stdout) throw new Stop(4, 'candidate-dirty', 'Final verification requires immutable clean HEAD.');
  checkOptionalIdentity(); gateHooks(w);
  const localCi = path.join(w, 'scripts/local-ci.sh');
  regularFile(localCi);
  const script = fs.readFileSync(localCi, 'utf8');
  const actualCalls = [...script.matchAll(/npm run ([\w:-]+)/g)].map(match => match[1]);
  if (stable(actualCalls) !== stable(gateCalls)) throw new Stop(1, 'local-ci-contract', 'Final local-ci must retain exact ordered 18-command verification contract.');
  state.phase = 'verifying'; state.intent = { kind: 'final-verification', oid, tree };
  store.event(state, 'final-verification-intent', state.intent);
  command(w, 'bash', ['scripts/local-ci.sh'], { timeout: 3_600_000, stage: 'full-18-local-ci' });
  if (text(w, ['rev-parse', 'HEAD']) !== oid || text(w, ['rev-parse', 'HEAD^{tree}']) !== tree || git(w, ['status', '--porcelain', '--untracked-files=all']).stdout) throw new Stop(4, 'candidate-movement', 'Final verification changed candidate or left dirty files; no cache restore/discard is permitted.');
  assertStable(cwd, common, state, store);
  state.validation = { oid, tree, localCiDigest: hash(script), calls: gateCalls, at: new Date().toISOString(), passed: true };
  state.intent = null; store.event(state, 'final-verification-passed', state.validation);
}
function gh(cwd, args, allow = []) { return command(cwd, 'gh', args, { allow, timeout: 120_000 }); }
function githubAdapter(cwd) {
  let repository, host = 'github.com';
  const repo = () => {
    if (repository) return repository;
    const origin = text(cwd, ['remote', 'get-url', 'origin']);
    if (/[?#]/.test(origin) || /^[a-z][a-z0-9+.-]*:\/\/[^/]*@/i.test(origin) && !origin.startsWith('ssh://git@')) throw new Stop(5, 'unsafe-origin-identity', 'Credential-bearing origin URI must not be passed to policy CLI/logs.');
    const parsedHost = /^(?:https?:\/\/|ssh:\/\/(?:git@)?)([^/:]+)/.exec(origin)?.[1] || /^git@([^:]+):/.exec(origin)?.[1];
    if (parsedHost) host = parsedHost;
    const resolved = JSON.parse(gh(cwd, ['repo', 'view', origin, '--json', 'nameWithOwner']).stdout).nameWithOwner;
    if (!/^[\w.-]+\/[\w.-]+$/.test(resolved || '')) throw new Stop(5, 'unknown-policy-repository', 'Origin-scoped GitHub repository identity is unavailable.');
    repository = resolved; return repository;
  };
  const api = endpoint => { const identity = repo(); return JSON.parse(gh(cwd, ['api', `repos/${identity}/${endpoint}`, '--hostname', host]).stdout); };
  return {
    async discoverPolicy({ branch }) {
      const info = api('');
      const identity = repo();
      const result = gh(cwd, ['api', `repos/${identity}/branches/${encodeURIComponent(branch)}/protection`, '--hostname', host], [1]);
      let protection = null;
      if (result.status === 0) protection = JSON.parse(result.stdout);
      else {
        let body; try { body = JSON.parse(result.stdout); } catch { throw new Stop(5, 'unknown-policy', 'Protection read failed without recognized unprotected response.'); }
        if (body.status !== '404' && body.status !== 404 || body.message !== 'Branch not protected') throw new Stop(5, 'unknown-policy', 'Protection absence is not established.');
      }
      const rules = api(`rules/branches/${encodeURIComponent(branch)}`);
      if (!Array.isArray(rules)) throw new Stop(5, 'unknown-policy', 'Branch rules response is invalid.');
      const known = new Set(['required_linear_history', 'required_status_checks', 'pull_request', 'non_fast_forward', 'deletion', 'required_signatures']);
      if (rules.some(r => !known.has(r.type)) || rules.some(r => r.type === 'required_signatures')) throw new Stop(5, 'unsupported-policy-requirement', 'Additional branch policy requires explicit compliant workflow review.');
      const checks = [...(protection?.required_status_checks?.checks || []), ...rules.filter(r => r.type === 'required_status_checks').flatMap(r => r.parameters?.required_status_checks || [])];
      for (const context of protection?.required_status_checks?.contexts || []) if (!checks.some(c => c.context === context)) checks.push({ context, app_id: null });
      return { protected: Boolean(protection) || rules.length > 0, allowsMergeCommits: info.allow_merge_commit === true, canPush: info.permissions?.push === true, strict: protection?.required_status_checks?.strict === true || rules.some(r => r.parameters?.strict_required_status_checks_policy === true), linearHistory: protection?.required_linear_history?.enabled === true || rules.some(r => r.type === 'required_linear_history'), requiredChecks: checks.map(c => ({ context: c.context, appId: c.app_id ?? c.integration_id ?? null })), requiredApprovals: Math.max(protection?.required_pull_request_reviews?.required_approving_review_count || 0, ...rules.filter(r => r.type === 'pull_request').map(r => r.parameters?.required_approving_review_count || 0)), evidence: { protectionStatus: protection ? 200 : 404, branchRules: rules, observedAt: new Date().toISOString() } };
    },
    async ensurePullRequest({ headRef, headOid, baseOid, branch }) {
      const list = JSON.parse(gh(cwd, ['pr', 'list', '--repo', `${host}/${repo()}`, '--head', headRef.replace('refs/heads/', ''), '--base', branch, '--state', 'all', '--json', 'number,headRefOid']).stdout);
      const existing = list.find(p => p.headRefOid === headOid);
      if (existing) return { number: existing.number, headOid, baseOid };
      gh(cwd, ['pr', 'create', '--repo', `${host}/${repo()}`, '--head', headRef.replace('refs/heads/', ''), '--base', branch, '--title', 'Consolidate frozen ALL-source history', '--body', 'Normal history-preserving integration; all mandatory local gates retained.']);
      const created = JSON.parse(gh(cwd, ['pr', 'list', '--repo', `${host}/${repo()}`, '--head', headRef.replace('refs/heads/', ''), '--base', branch, '--json', 'number,headRefOid']).stdout).find(p => p.headRefOid === headOid);
      if (!created) throw new Stop(5, 'pr-unavailable', 'Exact candidate PR was not found.');
      return { number: created.number, headOid, baseOid };
    },
    async inspectPullRequest({ number }) {
      const p = api(`pulls/${number}`);
      const checks = api(`commits/${p.head.sha}/check-runs?filter=latest&per_page=100`);
      const statuses = api(`commits/${p.head.sha}/status?per_page=100`);
      const reviews = api(`pulls/${number}/reviews?per_page=100`);
      if ((checks.total_count || 0) > 100 || reviews.length >= 100 || statuses.total_count > 100) throw new Stop(5, 'policy-pagination', 'Required check/review evidence exceeds bounded response; no partial green claim.');
      const latest = new Map(); for (const review of reviews) if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.id, review);
      const approvals = [...latest.values()].filter(r => r.state === 'APPROVED' && r.commit_id === p.head.sha).length;
      return { number, headOid: p.head.sha, baseOid: p.base.sha, merged: p.merged === true, mergeOid: p.merge_commit_sha, approvals, checks: [...checks.check_runs.map(c => ({ context: c.name, appId: c.app.id, headOid: c.head_sha, status: c.status, conclusion: c.conclusion })), ...statuses.statuses.map(s => ({ context: s.context, appId: null, headOid: p.head.sha, status: s.state === 'pending' ? 'in_progress' : 'completed', conclusion: s.state }))] };
    },
    async mergePullRequest({ number, headOid }) {
      gh(cwd, ['pr', 'merge', String(number), '--repo', `${host}/${repo()}`, '--merge', '--match-head-commit', headOid]);
      return this.inspectPullRequest({ number });
    },
  };
}
function validatePolicy(policy) {
  if (!policy || ['protected', 'allowsMergeCommits', 'canPush', 'strict', 'linearHistory'].some(k => typeof policy[k] !== 'boolean') || !Array.isArray(policy.requiredChecks) || !Number.isInteger(policy.requiredApprovals) || policy.requiredApprovals < 0 || !policy.evidence || policy.requiredChecks.some(c => typeof c.context !== 'string' || !own(c, 'appId'))) throw new Stop(5, 'unknown-policy', 'Authoritative policy metadata is incomplete.');
  if (!policy.canPush) throw new Stop(5, 'push-permission', 'Normal publication permission is unavailable.');
  if (policy.linearHistory || !policy.allowsMergeCommits) throw new Stop(5, 'literal-ancestry-policy-conflict', 'Current policy cannot preserve all frozen merge ancestry; no squash/admin fallback.');
}
function remoteHead(cwd) {
  const out = git(cwd, ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], { allow: [2] });
  const oid = out.stdout.split(/\s+/)[0];
  if (!OID.test(oid || '')) throw new Stop(4, 'missing-remote-main', 'Remote main is unavailable; no completion or cleanup.');
  return oid;
}
function fetchedMain(cwd, state, store) {
  const before = refs(cwd).find(r => r.ref === 'refs/remotes/origin/main')?.oid;
  git(cwd, ['fetch', '--atomic', '--no-tags', '--no-prune', '--no-auto-maintenance', 'origin', 'refs/heads/main:refs/remotes/origin/main']);
  const oid = text(cwd, ['rev-parse', 'refs/remotes/origin/main']);
  if (remoteHead(cwd) !== oid) throw new Stop(4, 'remote-main-race', 'Fresh fetched main and remote advertisement disagree.');
  const expected = state.expected.refs.find(r => r.ref === 'refs/remotes/origin/main');
  const allowed = new Set([expected?.oid, state.intent?.kind === 'main-push' ? state.intent.afterOid : null, state.publication?.afterOid, state.publication?.mergeOid].filter(Boolean));
  if (expected && before !== expected.oid && !allowed.has(before)) throw new Stop(4, 'source-movement', 'Origin tracking main changed outside a recorded transition.');
  if (!allowed.has(oid)) throw new Stop(4, 'remote-main-movement', 'Main advanced outside an accepted managed publication transition; refresh source review and reverify.');
  if (expected) expected.oid = oid;
  for (const source of state.expected.sources) if (source.id === 'refs/remotes/origin/main') source.oid = oid;
  state.expected.fingerprint = inventoryDigest(state.expected);
  store.event(state, 'managed-origin-main-refresh', { beforeOid: before, afterOid: oid });
  return oid;
}
async function publish(cwd, common, state, store, adapter) {
  assertStable(cwd, common, state, store);
  const v = state.validation;
  if (!v?.passed || text(state.integrationWorktree, ['rev-parse', 'HEAD']) !== v.oid) throw new Stop(1, 'unverified-candidate', 'Exact candidate full verification evidence is required.');
  let policy;
  try { policy = await adapter.discoverPolicy({ cwd, remote: 'origin', branch: 'main' }); } catch (error) { throw error instanceof Stop ? error : new Stop(5, 'unknown-policy', 'Live publication policy read is unavailable.'); }
  validatePolicy(policy);
  state.policy = policy; store.save(state);
  const base = fetchedMain(cwd, state, store);
  if (!ancestor(cwd, base, v.oid)) throw new Stop(4, 'remote-main-movement', 'Remote main advanced outside candidate ancestry; integrate it and rerun final verification.');
  assertStable(cwd, common, state, store);
  checkOptionalIdentity(); gateHooks(state.integrationWorktree);
  state.phase = 'publishing';
  if (!policy.protected) {
    state.intent = { kind: 'main-push', beforeOid: base, afterOid: v.oid };
    store.event(state, 'main-push-intent', state.intent);
    const latest = await adapter.discoverPolicy({ cwd, remote: 'origin', branch: 'main' }); validatePolicy(latest);
    if (digest({ ...latest, evidence: undefined }) !== digest({ ...policy, evidence: undefined }) || remoteHead(cwd) !== base) throw new Stop(5, 'policy-base-race', 'Policy/base changed immediately before normal main push.');
    assertStable(cwd, common, state, store);
    if (text(state.integrationWorktree, ['rev-parse', state.integrationRef]) !== v.oid || text(state.integrationWorktree, ['rev-parse', 'HEAD']) !== v.oid) throw new Stop(4, 'candidate-ref-movement', 'Verified named integration source moved immediately before ordinary push.');
    // Mandatory pre-push accepts refs/* or HEAD local_ref, not a raw object ID.
    git(state.integrationWorktree, ['push', 'origin', `${state.integrationRef}:refs/heads/main`], { stage: 'ordinary-main-push-hooks' });
    if (text(state.integrationWorktree, ['rev-parse', state.integrationRef]) !== v.oid || text(state.integrationWorktree, ['rev-parse', 'HEAD']) !== v.oid) throw new Stop(4, 'candidate-ref-movement', 'Verified named integration source moved during ordinary push.');
    state.publication = { mode: 'ordinary-main-fast-forward', localRef: state.integrationRef, beforeOid: base, afterOid: v.oid };
  } else {
    const trackingRef = `refs/remotes/origin/${state.integrationRef.slice('refs/heads/'.length)}`;
    if (!state.managedRefs.some(r => r.ref === trackingRef)) state.managedRefs.push({ ref: trackingRef, oid: v.oid, provenance: 'owned-integration-publication' });
    store.event(state, 'integration-push-intent', { trackingRef, oid: v.oid });
    git(state.integrationWorktree, ['push', 'origin', `${state.integrationRef}:${state.integrationRef}`], { stage: 'ordinary-integration-push-hooks' });
    const pr = await adapter.ensurePullRequest({ cwd, remote: 'origin', branch: 'main', headRef: state.integrationRef, headOid: v.oid, baseOid: base });
    if (!pr || !Number.isInteger(pr.number)) throw new Stop(5, 'pr-unavailable', 'Exact-head PR result is unavailable.');
    state.pr = pr; store.save(state);
    const deadline = Date.now() + 300_000;
    let observed;
    do {
      observed = await adapter.inspectPullRequest({ cwd, remote: 'origin', branch: 'main', number: pr.number, headOid: v.oid });
      if (observed.headOid !== v.oid || observed.baseOid !== base) throw new Stop(5, 'pr-head-base-movement', 'PR head/base differs from verified candidate/current base.');
      const complete = policy.requiredChecks.every(required => observed.checks?.some(c => c.context === required.context && (required.appId === null || c.appId === required.appId) && c.headOid === v.oid && c.status === 'completed' && c.conclusion === 'success')) && observed.approvals >= policy.requiredApprovals;
      if (complete) break;
      if (!state.minutes || Date.now() >= deadline) throw new Stop(5, 'required-hosted-gates', 'Actual current-head required checks/reviews have not passed; no cleanup.');
      await new Promise(resolve => setTimeout(resolve, Math.min(state.minutes * 60_000, Math.max(0, deadline - Date.now()))));
    } while (true);
    assertStable(cwd, common, state, store);
    const latestPolicy = await adapter.discoverPolicy({ cwd, remote: 'origin', branch: 'main' }); validatePolicy(latestPolicy);
    if (digest({ ...latestPolicy, evidence: undefined }) !== digest({ ...policy, evidence: undefined }) || remoteHead(cwd) !== base) throw new Stop(5, 'policy-base-race', 'Policy/base changed before compliant PR merge.');
    state.intent = { kind: 'pr-merge', number: pr.number, headOid: v.oid, baseOid: base, policyDigest: digest(policy), gateEvidence: observed };
    store.event(state, 'protected-pr-merge-intent', state.intent);
    const merged = observed.merged ? observed : await adapter.mergePullRequest({ cwd, remote: 'origin', branch: 'main', number: pr.number, headOid: v.oid, baseOid: base });
    if (!merged?.merged || merged.headOid !== v.oid || !OID.test(merged.mergeOid || '')) throw new Stop(5, 'pr-merge-unproven', 'History-preserving PR merge is not independently acknowledged.');
    const proven = await adapter.inspectPullRequest({ cwd, remote: 'origin', branch: 'main', number: pr.number, headOid: v.oid });
    if (!proven.merged || proven.headOid !== v.oid || proven.mergeOid !== merged.mergeOid || proven.approvals < policy.requiredApprovals || !policy.requiredChecks.every(required => proven.checks?.some(c => c.context === required.context && (required.appId === null || c.appId === required.appId) && c.headOid === v.oid && c.status === 'completed' && c.conclusion === 'success'))) throw new Stop(5, 'merged-pr-gate-provenance', 'Merged PR lacks exact current-head required approval/check provenance.');
    state.publication = { mode: 'protected-history-merge', number: pr.number, headOid: v.oid, mergeOid: merged.mergeOid, checks: proven.checks, approvals: proven.approvals };
  }
  state.intent = null; store.event(state, 'publication-operation-returned', state.publication);
}
function acknowledge(cwd, common, state, store) {
  state.phase = 'acknowledging'; store.save(state);
  const oid = fetchedMain(cwd, state, store);
  const tree = text(cwd, ['rev-parse', `${oid}^{tree}`]);
  if (tree !== state.validation?.tree || !ancestor(cwd, state.validation.oid, oid)) throw new Stop(4, 'remote-content-mismatch', 'Remote main does not contain accepted immutable candidate/tree.');
  if (state.publication?.mode === 'ordinary-main-fast-forward' && oid !== state.validation.oid) throw new Stop(4, 'remote-main-movement', 'Remote main moved after direct publication.');
  const coverage = state.sources.map(source => ({ ...source, mainOid: oid, ancestor: ancestor(cwd, source.oid, oid) }));
  if (coverage.some(row => !row.ancestor)) throw new Stop(4, 'remote-ancestry-gap', 'Some frozen original/recovery source is not a literal ancestor of remote MAIN.');
  assertStable(cwd, common, state, store);
  state.mainProof = { oid, tree, candidateOid: state.validation.oid, inventoryDigest: state.expected.fingerprint, sourcesDigest: digest(state.sources), coverage, policyDigest: digest(state.policy), at: new Date().toISOString() };
  store.event(state, 'fresh-main-ancestry-tree-proof', state.mainProof);
}
function cleanupSources(cwd, common, state, store) {
  state.phase = 'cleanup'; store.save(state);
  const anchors = new Set([state.caller, state.primary, state.integrationWorktree]);
  state.retainedAnchors = [...anchors].map(p => ({ path: p, reason: p === state.primary ? 'primary-main' : p === state.caller ? 'executing-caller' : 'integration-evidence-history' }));
  state.retainedAnchors.push({ reason: 'all-remote-source-history-retained', refs: state.sources.filter(s => s.kind === 'remote').map(s => s.id) });
  for (const workspace of state.expected.worktrees) if (!anchors.has(workspace.path) && (workspace.missing || workspace.locked || workspace.status || workspace.ignored.length || workspace.operations.length || workspace.blockers.length)) throw new Stop(4, 'cleanup-held', 'Global eligible-local cleanup preflight found a held/dirty/missing/ignored/unresolved non-anchor; no removals yet.');
  for (const original of [...state.expected.worktrees]) {
    if (anchors.has(original.path)) continue;
    if (original.missing || original.locked || original.status || original.ignored.length || original.operations.length) throw new Stop(4, 'cleanup-held', 'Non-anchor workspace is dirty/missing/locked/ignored/unresolved; no silent pruning waiver.');
    assertStable(cwd, common, state, store);
    acknowledge(cwd, common, state, store);
    const actual = updateSnapshot(cwd, common, state).worktrees.find(row => row.path === original.path);
    if (!actual || actual.fingerprint !== original.fingerprint) throw new Stop(4, 'cleanup-source-movement', 'Workspace changed immediately before ordinary removal.');
    state.intent = { kind: 'worktree-remove', path: original.path, fingerprint: original.fingerprint };
    store.event(state, 'worktree-remove-intent', state.intent);
    git(state.integrationWorktree, ['worktree', 'remove', original.path]);
    state.expected.worktrees = state.expected.worktrees.filter(row => row.path !== original.path);
    state.expected.blockers = state.expected.blockers.filter(row => row.sourceId !== `worktree:${original.path}`);
    state.expected.fingerprint = inventoryDigest(state.expected);
    state.cleanupActions.push({ kind: 'worktree-remove', path: original.path });
    state.intent = null; store.event(state, 'worktree-removed', { path: original.path });
  }
  const retained = new Set(worktrees(cwd).map(row => row.branch).filter(Boolean));
  retained.add('refs/heads/main'); retained.add(state.integrationRef);
  for (const source of state.expected.refs.filter(s => s.ref.startsWith('refs/heads/')).map(s => ({ id: s.ref, oid: s.oid }))) {
    if (retained.has(source.id) || state.cleanupActions.some(a => a.kind === 'branch-delete' && a.ref === source.id)) continue;
    const current = refs(cwd).find(row => row.ref === source.id);
    if (!current) {
      if (state.intent?.kind === 'branch-delete' && state.intent.ref === source.id) continue;
      throw new Stop(4, 'cleanup-ref-missing', 'Source ref disappeared outside recorded deletion.');
    }
    if (current.oid !== source.oid) throw new Stop(4, 'cleanup-ref-movement', 'Source branch moved before removal.');
    assertStable(cwd, common, state, store); acknowledge(cwd, common, state, store);
    state.intent = { kind: 'branch-delete', ref: source.id, oid: source.oid }; store.event(state, 'branch-delete-intent', state.intent);
    git(state.integrationWorktree, ['branch', '-d', source.id.slice('refs/heads/'.length)]);
    state.expected.refs = state.expected.refs.filter(row => row.ref !== source.id);
    state.expected.sources = state.expected.sources.filter(row => row.id !== source.id);
    state.expected.fingerprint = inventoryDigest(state.expected);
    state.cleanupActions.push({ kind: 'branch-delete', ref: source.id, oid: source.oid }); state.intent = null;
    store.event(state, 'branch-deleted', { ref: source.id });
  }
  acknowledge(cwd, common, state, store);
  state.phase = 'complete'; state.complete = true; store.event(state, 'all-input-main-local-cleanup-complete');
}
function output(state, store, code, extra = {}) {
  return { code, phase: state?.phase || 'failed', complete: state?.complete === true && code === 0, runId: state?.id || null, statePath: store?.file || null, integrationWorktree: state?.integrationWorktree || null, integrationRef: state?.integrationRef || null, inventory: state?.expected || null, pendingConflict: state?.pendingConflict || null, blockers: state?.blockers || [], mainProof: state?.mainProof || null, retainedAnchors: state?.retainedAnchors || [], cleanupActions: state?.cleanupActions || [], evidencePaths: state?.evidencePaths || [], ...extra };
}
async function run(options) {
  let state, store;
  try {
    noRoutingOverrides();
    const { cwd, dryRun = false, resume, status, cleanup, adapters } = options;
    const minutes = options.minutes ?? 2;
    if (typeof cwd !== 'string' || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440 || typeof dryRun !== 'boolean' || [resume, status, cleanup].filter(v => v !== undefined).length > 1 || [resume, status, cleanup].some(v => v !== undefined && (typeof v !== 'string' || !RUN.test(v))) || dryRun && (resume || status || cleanup)) throw new Stop(2, 'usage', 'Use cwd and integer minutes 0..1440; resume/status/cleanup are mutually exclusive run IDs.');
    if (adapters && (Object.keys(adapters).some(k => k !== 'github') || !adapters.github)) throw new Stop(2, 'adapter-shape', 'Only module-import GitHub policy adapter is supported.');
    const root = fs.realpathSync(text(cwd, ['rev-parse', '--show-toplevel']));
    const common = fs.realpathSync(path.resolve(root, text(root, ['rev-parse', '--git-common-dir'])));
    if (text(root, ['rev-parse', '--is-shallow-repository']) !== 'false' || git(root, ['for-each-ref', '--format=%(refname)', 'refs/replace']).stdout || fs.existsSync(path.join(common, 'info/grafts'))) throw new Stop(4, 'uncertain-history', 'Shallow/replaced/grafted history cannot prove complete ancestry.');
    if (dryRun) {
      const inv = inventory(root, common);
      return output(null, null, 0, { phase: 'dry-run', complete: false, inventory: inv, blockers: inv.blockers, detail: 'DRY-RUN: local/cached census only; remote freshness UNPROVEN; NOT PUBLISHED / NOT COMPLETE.' });
    }
    const id = resume || status || cleanup || `${Date.now()}-${randomUUID().slice(0, 8)}`;
    store = new Store(common, id, !(resume || status || cleanup));
    if (resume || status || cleanup) {
      state = store.load();
      if (state.schema !== SCHEMA || state.id !== id || state.common !== common || state.caller !== root) throw new Stop(4, 'foreign-run', 'Resume must use original repository/caller identity.');
      if (status) {
        const current = updateSnapshot(root, common, state);
        const fresh = state.complete && current.fingerprint === state.expected.fingerprint && state.mainProof && remoteHead(root) === state.mainProof.oid && text(state.integrationWorktree, ['rev-parse', 'HEAD']) === state.validation?.oid;
        return output(state, store, fresh ? 0 : state.pendingConflict ? 3 : 4, { complete: Boolean(fresh), detail: fresh ? 'Recorded completion freshly matched against sources and remote main.' : 'Run is incomplete or its completion proof is no longer current.' });
      }
    }
    store.acquire(id);
    const evidenceDir = path.join(store.dir, 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { mode: 0o700 }); privateDirectory(evidenceDir);
    execution.getStore().evidenceDir = evidenceDir;
    execution.getStore().sequence = fs.readdirSync(evidenceDir).length;
    if (!state) {
      const beforeFetch = inventory(root, common);
      state = { schema: SCHEMA, id, common, caller: root, primary: worktrees(root)[0]?.worktree, minutes, phase: 'inventory', complete: false, sources: [...beforeFetch.sources], expected: beforeFetch, preFetch: beforeFetch, fetchBlockers: [], objectBlockers: [], blockers: [], events: [], merges: [], coverage: {}, policyReviews: [], conflictDecisions: [], cleanupActions: [], retainedAnchors: [], pendingMerge: null, pendingConflict: null, pendingReview: null, intent: null, mainProof: null, integrationRef: `refs/heads/integration/loop-merge-all-${id}`, integrationWorktree: path.join(store.dir, 'integration') };
      store.save(state);
      executionPreflight(root, common, text(root, ['rev-parse', 'HEAD']), store);
      // Preserve every pre-fetch object BEFORE any remote update. Fetch only that remote's head namespace;
      // do not honor a custom refspec that could overwrite a local source head or silently narrow ALL coverage.
      pinInputs(root, state, store);
      for (const remote of beforeFetch.remotes) {
        try {
          git(root, ['check-ref-format', `refs/remotes/${remote}/scope-proof`]);
          git(root, ['fetch', '--atomic', '--no-tags', '--no-prune', '--no-auto-maintenance', '--', remote, `refs/heads/*:refs/remotes/${remote}/*`]);
        } catch { state.fetchBlockers.push({ kind: 'remote-fetch', sourceId: `remote:${remote}`, paths: [], detail: 'Configured remote refresh failed; stale sources retained, completeness blocked.' }); }
      }
      state.expected = inventory(root, common, { ref: state.integrationRef, worktree: state.integrationWorktree, managedRefs: state.managedRefs }); addSources(state, state.expected.sources);
      captureInputHistory(state, beforeFetch); captureInputHistory(state, state.expected);
      store.event(state, 'all-remote-prefetch-and-refreshed-census');
      if (!state.expected.remotes.includes('origin')) throw new Stop(4, 'missing-origin', 'Origin main publication remote is required.');
      const base = state.expected.refs.find(r => r.ref === 'refs/remotes/origin/main')?.oid;
      if (!base || !commitExists(root, base)) throw new Stop(4, 'missing-main', 'A real origin/main commit is required.');
      state.baseOid = base;
      executionPreflight(root, common, base, store);
      state.intent = { kind: 'create-integration', baseOid: base, ref: state.integrationRef, worktree: state.integrationWorktree }; store.event(state, 'integration-create-intent', state.intent);
      git(root, ['worktree', 'add', '-b', state.integrationRef.slice('refs/heads/'.length), state.integrationWorktree, base]);
      state.integrationHead = base; state.intent = null; store.event(state, 'isolated-integration-created');
    }
    await recoverFacts(root, common, state, store, adapters?.github || githubAdapter(root));
    pinInputs(root, state, store);
    assertStable(root, common, state, store);
    if (!fs.existsSync(state.integrationWorktree) || text(state.integrationWorktree, ['symbolic-ref', 'HEAD']) !== state.integrationRef || fs.realpathSync(path.resolve(state.integrationWorktree, text(state.integrationWorktree, ['rev-parse', '--git-common-dir']))) !== common) throw new Stop(4, 'derived-resource-mismatch', 'Integration provenance/workspace identity does not match run ledger.');
    if (!state.pendingMerge && text(state.integrationWorktree, ['rev-parse', 'HEAD']) !== state.integrationHead) throw new Stop(4, 'integration-movement', 'Derived integration HEAD changed outside an exact recorded engine transition.');
    state.blockers = []; state.objectBlockers = []; state.reviewBlockers = [];
    const unresolved = await intakeBlockers(root, state, store);
    pinInputs(root, state, store);
    if (state.complete) {
      acknowledge(root, common, state, store);
      state.phase = 'complete'; store.save(state); return output(state, store, 0);
    }
    if (!state.publication && !state.mainProof) mergeSources(root, common, state, store);
    state.blockers = [...unresolved, ...state.objectBlockers, ...state.reviewBlockers];
    if (state.blockers.length) {
      state.phase = 'intake-blocked'; atomicWrite(path.join(store.dir, 'intake-packet.json'), { schema: SCHEMA, runId: id, inventoryDigest: state.expected.fingerprint, blockers: state.blockers, inventory: state.expected }); store.save(state);
      return output(state, store, 4);
    }
    if (cleanup && !state.mainProof) throw new Stop(4, 'missing-main-proof', 'Cleanup requires previous real publication and fresh global main proof.');
    if (!state.publication) acceptContributions(root, state, store);
    if (!state.validation || state.validation.oid !== text(state.integrationWorktree, ['rev-parse', 'HEAD'])) verifyCandidate(root, common, state, store);
    if (!state.publication) await publish(root, common, state, store, adapters?.github || githubAdapter(root));
    acknowledge(root, common, state, store);
    cleanupSources(root, common, state, store);
    return output(state, store, 0);
  } catch (error) {
    const failure = error instanceof Stop ? error : new Stop(1, 'engine-error', 'Operation failed; preserve state and originals for parent investigation.');
    if (state) {
      state.complete = false;
      state.phase = failure.code === 3 ? 'conflict' : failure.code === 5 ? 'policy-blocked' : failure.code === 4 ? 'intake-blocked' : 'failed';
      state.blockers = [{ kind: failure.kind, sourceId: 'run', paths: failure.paths || [], detail: failure.detail, ...(failure.evidencePath ? { evidencePath: failure.evidencePath } : {}), ...(failure.reviewPacketPath ? { reviewPacketPath: failure.reviewPacketPath } : {}) }];
      if (failure.currentInventory && store) atomicWrite(path.join(store.dir, 'movement-packet.json'), { beforeDigest: state.expected.fingerprint, afterDigest: failure.currentInventory.fingerprint, currentInventory: failure.currentInventory });
      if (store?.fd !== undefined) store.save(state);
    }
    return output(state, store, failure.code, { blockers: state?.blockers || [{ kind: failure.kind, sourceId: 'run', paths: [], detail: failure.detail }], ...(failure.reviewPacket ? { reviewPacket: failure.reviewPacket } : {}) });
  } finally { store?.release(); }
}

function parseCli(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  const minutes = argv.shift();
  if (!/^(?:0|[1-9][0-9]*)$/.test(minutes || '') || Number(minutes) > 1440) throw new Stop(2, 'usage', 'Minutes must be an exact unsigned integer 0..1440.');
  const result = { cwd: process.cwd(), minutes: Number(minutes) };
  while (argv.length) {
    const flag = argv.shift();
    if (flag === '--dry-run' && !result.dryRun) result.dryRun = true;
    else if (['--resume', '--status', '--cleanup'].includes(flag) && !own(result, flag.slice(2))) { const id = argv.shift(); if (!RUN.test(id || '')) throw new Stop(2, 'usage', 'A safe run ID is required.'); result[flag.slice(2)] = id; }
    else throw new Stop(2, 'usage', 'Unknown/duplicate option; no adapter/state/gate overrides are supported.');
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let result;
  try {
    const options = parseCli(process.argv.slice(2));
    if (options.help) result = { code: 0, complete: false, phase: 'help', detail: 'Usage: node scripts/loop-merge-push.mjs <minutes 0..1440> [--dry-run] [--resume ID|--status ID|--cleanup ID]. Help/dry-run are NOT PUBLISHED / NOT COMPLETE.' };
    else result = await runMergeAll(options);
  } catch (error) { result = { code: error.code || 1, complete: false, phase: 'failed', blockers: [{ kind: error.kind || 'usage', detail: error.detail || 'Invalid invocation.' }] }; }
  // Source path/version matrices stay private, especially ignored names. CLI prints only aggregate scope and packet locations.
  const { inventory: inv, pendingConflict: conflict, ...metadata } = result;
  console.log(JSON.stringify({ ...metadata, blockers: (metadata.blockers || []).map(({ paths, ...b }) => ({ ...b, pathCount: paths?.length || 0 })), inventory: inv ? { sources: inv.sources.length, worktrees: inv.worktrees.length, stashes: inv.stash.length, configuredRemotes: inv.remotes.length, fingerprint: inv.fingerprint } : null, pendingConflict: conflict ? { beforeOid: conflict.beforeOid, sourceOid: conflict.sourceOid, packetDigest: conflict.packetDigest, pathCount: conflict.paths.length } : null }, null, 2));
  process.exitCode = result.code;
}
