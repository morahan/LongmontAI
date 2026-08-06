import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../..//', import.meta.url);
const [justfile, runner] = await Promise.all([
  readFile(new URL('justfile', root), 'utf8'),
  readFile(new URL('scripts/run-flow-lanes.sh', root), 'utf8'),
]);

for (const recipe of ['test-flows:', 'test-flows-web:', 'test-flows-android:', 'test-flows-ios:']) {
  assert.match(justfile, new RegExp(`^${recipe.replace('-', '\\-')}`, 'm'));
}

assert.match(justfile, /test-flows:\n\s+@bash scripts\/run-flow-lanes\.sh all/);
assert.match(runner, /lanes=\(web android ios\)/);
assert.match(runner, /\) &\n\s+pids\+=/);
assert.match(runner, /\[android\] SKIPPED no Android project/);
assert.match(runner, /\[ios\] SKIPPED no iOS project/);

console.log('flow lanes contract: PASS');
