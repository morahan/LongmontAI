#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { selectMobileAudit } from './mobile-audit-selector.mjs';

const mode = process.argv[2];
if (!['staged', 'push', 'full'].includes(mode)) {
  console.error('Usage: node scripts/run-targeted-mobile-audit.mjs <staged|push|full>');
  process.exit(2);
}

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options });
}

function zeroOid(oid) {
  return /^0+$/.test(oid);
}

function splitNul(value) {
  return value.split('\0').filter(Boolean);
}

let paths = [];
let snapshotKind = mode;
let snapshotRefs = [];
let forcedFullReason;

try {
  if (mode === 'staged') {
    paths = splitNul(git(['diff', '--cached', '--name-only', '--diff-filter=ACDMRTUXB', '-z']));
  } else if (mode === 'push') {
    const input = await new Promise((resolve, reject) => {
      let value = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => { value += chunk; });
      process.stdin.on('end', () => resolve(value));
      process.stdin.on('error', reject);
    });
    const updates = input.split('\n').map((line) => line.trim()).filter(Boolean);
    if (updates.length === 0) {
      forcedFullReason = 'push ref updates unavailable (no upstream or unknown push surface)';
    } else {
      const commits = new Set();
      for (const line of updates) {
        const fields = line.split(/\s+/);
        if (fields.length !== 4 || !/^[0-9a-f]{40,64}$/i.test(fields[1]) || !/^[0-9a-f]{40,64}$/i.test(fields[3])) {
          forcedFullReason = `unrecognized push update: ${line}`;
          break;
        }
        const [, localOid, , remoteOid] = fields;
        if (zeroOid(localOid)) continue; // A branch deletion sends no browser code.
        if (zeroOid(remoteOid)) {
          forcedFullReason = 'new branch has no remote baseline';
          break;
        }
        const outgoing = git(['rev-list', localOid, `^${remoteOid}`]).trim().split('\n').filter(Boolean);
        for (const commit of outgoing) commits.add(commit);
        snapshotRefs.push(localOid);
      }
      if (!forcedFullReason) {
        for (const commit of commits) {
          for (const path of splitNul(git(['diff-tree', '--root', '-m', '--no-commit-id', '--name-only', '-r', '-z', commit]))) {
            paths.push(path);
          }
        }
      }
    }
  }
} catch (error) {
  forcedFullReason = `git selection failed: ${error.message.split('\n')[0]}`;
}

const uniquePaths = [...new Set(paths)];

function selectionRefs() {
  return snapshotKind === 'staged' ? [':'] : [...new Set(snapshotRefs)];
}

function snapshotSpec(ref, path) {
  return ref === ':' ? `:${path}` : `${ref}:${path}`;
}

async function readSnapshot(path) {
  const contents = new Set();
  const refs = selectionRefs();
  if (refs.length === 0) return undefined;
  for (const ref of refs) {
    try {
      contents.add(git(['show', snapshotSpec(ref, path)], { maxBuffer: 10 * 1024 * 1024 }));
    } catch {
      return undefined;
    }
  }
  // Different or missing snapshots for the same path are ambiguous and fail closed.
  return contents.size === 1 ? [...contents][0] : undefined;
}

async function snapshotIsUnambiguous(path) {
  const objectIds = new Set();
  const refs = selectionRefs();
  if (refs.length === 0) return false;
  for (const ref of refs) {
    try {
      objectIds.add(git(['rev-parse', '--verify', snapshotSpec(ref, path)]).trim());
    } catch {
      return false;
    }
  }
  return objectIds.size === 1;
}

async function listPublishedArticles() {
  try {
    if (snapshotKind === 'staged') {
      return splitNul(git(['ls-files', '-z', 'src/articles/*.md']))
        .filter((path) => !path.includes('/drafts/'));
    }
    const snapshots = [];
    for (const ref of new Set(snapshotRefs)) {
      snapshots.push(git(['ls-tree', '-r', '--name-only', ref, '--', 'src/articles']).split('\n')
        .filter((path) => /^src\/articles\/[^/]+\.md$/.test(path))
        .sort());
    }
    if (snapshots.length === 0) return undefined;
    const signatures = new Set(snapshots.map((articles) => JSON.stringify(articles)));
    return signatures.size === 1 ? snapshots[0] : undefined;
  } catch {
    return undefined;
  }
}

const selection = forcedFullReason
  ? { action: 'full', routes: [], reason: forcedFullReason }
  : mode === 'full'
    ? { action: 'full', routes: [], reason: 'explicit exhaustive audit' }
    : await selectMobileAudit(uniquePaths, { readSnapshot, snapshotIsUnambiguous, listPublishedArticles });

console.log(`Mobile browser audit selection: ${selection.action.toUpperCase()} (${selection.reason})`);
if (selection.action === 'routes') console.log(`Routes: ${selection.routes.join(', ')}`);

if (process.env.MOBILE_AUDIT_DRY_RUN === '1') {
  console.log(JSON.stringify({ ...selection, paths: uniquePaths }));
  process.exit(0);
}
if (selection.action === 'skip') process.exit(0);

const env = { ...process.env };
if (selection.action === 'routes') env.MOBILE_AUDIT_ROUTES = JSON.stringify(selection.routes);
else delete env.MOBILE_AUDIT_ROUTES;

const result = spawnSync('npm', ['run', 'test:mobile'], { stdio: 'inherit', env });
if (result.error) {
  console.error(`Unable to launch mobile audit: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
