import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function hashPath(path) {
  const hash = createHash('sha256');
  function visit(p, name) {
    const stat = lstatSync(p);
    hash.update(`${name}\0${stat.mode & 0o777}\0`);
    if (stat.isSymbolicLink()) hash.update(`link\0${readlinkSync(p)}\0`);
    else if (stat.isDirectory()) for (const entry of readdirSync(p).sort()) visit(join(p, entry), `${name}/${entry}`);
    else if (stat.isFile()) hash.update(readFileSync(p));
    else throw Error('Unsupported evidence file type');
  }
  visit(path, ''); return hash.digest('hex');
}
// Tool/cache attestation is stricter than committed-source symlink identity.
export function attestedPath(path, type) {
  const visit = p => {
    const stat = lstatSync(p);
    if (stat.isSymbolicLink()) throw Error('Attested inputs must not contain symlinks');
    if (stat.isDirectory()) for (const name of readdirSync(p)) visit(join(p, name));
    else if (!stat.isFile()) throw Error('Unsupported attested input');
  };
  const stat = lstatSync(path);
  if (type === 'file' ? !stat.isFile() : !stat.isDirectory()) throw Error(`Expected attested ${type}`);
  visit(path);
  return realpathSync(path);
}
export function containedPath(path, root) {
  const actual = realpathSync(path); const base = realpathSync(root);
  const rel = relative(base, actual);
  if (rel === '..' || rel.startsWith('../') || resolve(base, rel) !== actual) throw Error('Resolved dependency outside attested root');
  return actual;
}
export function bindOsvCache(entry, evidence, now = Date.now()) {
  const date = Date.parse(entry.acquired);
  if (!Number.isFinite(date) || date > now || now - date > 7 * 86400000) throw Error('Stale or future OSV cache acquisition');
  const path = attestedPath(entry.path, 'file');
  if (!path.endsWith('/osv-scanner/npm/all.zip') || hashPath(path) !== entry.sha256) throw Error('Expected attested npm offline cache');
  const root = join(evidence, 'osv-cache');
  const target = join(root, 'osv-scanner', 'npm', 'all.zip');
  mkdirSync(join(root, 'osv-scanner', 'npm'), { recursive: true, mode: 0o700 });
  copyFileSync(path, target);
  if (hashPath(target) !== entry.sha256) throw Error('OSV cache copy identity mismatch');
  // OSV 2.3.6 documents this exact root layout and environment variable.
  // Only npm is supplied: another ecosystem fails for a missing offline DB.
  return { root, target };
}
export function sourceIdentity(cwd, expectedSha) {
  const git = args => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
    if (r.status !== 0) throw Error('Cannot inspect snapshot');
    return r.stdout;
  };
  if (git(['rev-parse', 'HEAD']).trim() !== expectedSha) throw Error('Snapshot HEAD drift');
  const entries = git(['ls-tree', '-rz', '--full-tree', 'HEAD']).split('\0').filter(Boolean);
  const hash = createHash('sha256');
  for (const entry of entries) {
    const match = /^(100644|100755|120000) blob ([0-9a-f]{40})\t([\s\S]+)$/.exec(entry);
    if (!match) throw Error('Unsupported snapshot entry');
    const [, mode, oid, name] = match;
    const path = join(cwd, name); const stat = lstatSync(path);
    if (stat.isSymbolicLink() !== (mode === '120000')) throw Error('Snapshot type drift');
    const bytes = mode === '120000' ? Buffer.from(readlinkSync(path)) : readFileSync(path);
    const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (actual !== oid || (mode !== '120000' && Boolean(stat.mode & 0o111) !== (mode === '100755'))) throw Error(`Tracked source drift: ${name}`);
    hash.update(`${name}\0${mode}\0${oid}\0`);
  }
  if (git(['diff', '--cached', '--name-only', 'HEAD']).trim()) throw Error('Snapshot index drift');
  return hash.digest('hex');
}
export function validateReceipt(receipt, directory, expected, now = Date.now()) {
  if (receipt.schema !== 'longmont-local-ci-v1' || receipt.sha !== expected.sha || receipt.tree !== expected.tree || receipt.base !== expected.base || receipt.mode !== expected.mode || receipt.policyDigest !== expected.policyDigest || receipt.toolManifestDigest !== expected.toolManifestDigest || receipt.sourceIdentity !== expected.sourceIdentity || JSON.stringify(receipt.cacheIdentity) !== JSON.stringify(expected.cacheIdentity) || !/^[a-f0-9]{40}$/.test(receipt.sha)) throw Error('Receipt identity mismatch');
  const start = Date.parse(receipt.started); const end = Date.parse(receipt.completed);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end > now || now - start > 24 * 60 * 60 * 1000) throw Error('Stale or invalid receipt time');
  if (!Array.isArray(receipt.gates) || !Array.isArray(expected.gates) || receipt.gates.length !== expected.gates.length || new Set(expected.gates).size !== expected.gates.length) throw Error('Incomplete gates');
  for (const [i, gate] of receipt.gates.entries()) {
    if (gate.name !== expected.gates[i] || gate.status !== 'passed' || typeof gate.log !== 'string' || gate.log.includes('/') || gate.log.includes('\\') || gate.log === '..' || !lstatSync(join(directory, gate.log)).isFile() || gate.sha256 !== digest(readFileSync(join(directory, gate.log)))) throw Error('Invalid gate evidence');
  }
  for (const [file, hash] of Object.entries(receipt.artifacts || {})) {
    if (!file || file.includes('/') || file.includes('\\') || file === '..' || !lstatSync(join(directory, file)).isFile() || hash !== digest(readFileSync(join(directory, file)))) throw Error('Artifact identity mismatch');
  }
  if (!receipt.artifacts?.['codeql.sarif'] || !receipt.artifacts?.['query-inventory.json'] || !receipt.sourceIdentity || !receipt.cacheIdentity) throw Error('Incomplete receipt evidence');
  return true; // Integrity only. This is never execution provenance or authorization.
}
