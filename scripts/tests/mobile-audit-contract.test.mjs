import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [packageJson, localCi, preCommit, prePush, runner, browserRunner, audit, editorGuide] = await Promise.all([
  readFile(new URL('../../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../local-ci.sh', import.meta.url), 'utf8'),
  readFile(new URL('../../.githooks/pre-commit', import.meta.url), 'utf8'),
  readFile(new URL('../../.githooks/pre-push', import.meta.url), 'utf8'),
  readFile(new URL('../run-mobile-audit.sh', import.meta.url), 'utf8'),
  readFile(new URL('../run-mobile-browser-audit.sh', import.meta.url), 'utf8'),
  readFile(new URL('../mobile-playwright-audit.js', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/blog-editor.md', import.meta.url), 'utf8'),
]);

assert.equal(packageJson.scripts['test:mobile'], 'bash scripts/run-mobile-audit.sh');
assert.equal(packageJson.scripts['test:mobile-contract'], 'node scripts/tests/mobile-audit-contract.test.mjs');
assert.match(localCi, /npm run test:mobile-contract/);
assert.match(localCi, /npm run test:mobile/);
assert.match(preCommit, /npm run test:mobile/);
assert.match(prePush, /npm run test:mobile/);
assert.match(runner, /mktemp "\$\{TMPDIR:-\/tmp\}\/longmontai-mobile-audit-\$\{PORT\}\.XXXXXXXX"/);
assert.doesNotMatch(runner, /XXXXXXXX\.log/);
assert.equal(packageJson.scripts['audit:mobile'], 'bash scripts/run-mobile-browser-audit.sh');
assert.match(browserRunner, /playwright_cli\.sh/);
assert.match(browserRunner, /run-code --filename scripts\/mobile-playwright-audit\.js/);
assert.match(audit, /mediaLayoutFailures/);
assert.match(audit, /slideshow-embed-mobile/);
assert.match(audit, /media\.width < Math\.min\(260, viewportWidth \* 0\.72\)/);
assert.match(audit, /edition-2026-06-10-ai-landscape/);
assert.match(audit, /latestEditionRoute/);
assert.match(audit, /viewport\.name === 'iphone-12'/);
assert.match(editorGuide, /pre-commit,\s+pre-push, and full local-CI paths/);

console.log('mobile audit contract: PASS');
