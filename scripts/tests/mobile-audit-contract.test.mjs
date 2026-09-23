import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { FULL_ROUTES, selectMobileAudit } from '../mobile-audit-selector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runnerPath = path.join(root, 'scripts/run-targeted-mobile-audit.mjs');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function commit(cwd, message) {
  execFileSync('git', ['-c', 'user.name=Contract Test', '-c', 'user.email=contract@example.invalid', 'commit', '-m', message], {
    cwd,
    stdio: 'ignore',
  });
  return git(cwd, ['rev-parse', 'HEAD']);
}

function runSelection(cwd, mode, input = '') {
  const result = spawnSync(process.execPath, [runnerPath, mode], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, MOBILE_AUDIT_DRY_RUN: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'longmont-mobile-contract-'));
  git(directory, ['init', '-q']);
  await mkdir(path.join(directory, 'src/pages'), { recursive: true });
  await writeFile(path.join(directory, 'README.md'), 'baseline\n');
  git(directory, ['add', '.']);
  const base = commit(directory, 'baseline');
  return { directory, base };
}

test('hook and exhaustive local-CI wiring preserve their distinct scopes', async () => {
  const [packageJson, localCi, preCommit, prePush, browserRunner, audit, editorGuide] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'scripts/local-ci.sh'), 'utf8'),
    readFile(path.join(root, '.githooks/pre-commit'), 'utf8'),
    readFile(path.join(root, '.githooks/pre-push'), 'utf8'),
    readFile(path.join(root, 'scripts/run-mobile-browser-audit.sh'), 'utf8'),
    readFile(path.join(root, 'scripts/mobile-playwright-audit.js'), 'utf8'),
    readFile(path.join(root, 'docs/blog-editor.md'), 'utf8'),
  ]);

  assert.equal(packageJson.scripts['test:mobile'], 'bash scripts/run-mobile-audit.sh');
  assert.match(localCi, /npm run test:mobile-contract/);
  assert.match(localCi, /MOBILE_AUDIT_HEADED=0 env -u MOBILE_AUDIT_ROUTES npm run test:mobile/);
  assert.doesNotMatch(localCi, /test:mobile:staged/);
  assert.match(preCommit, /run-targeted-mobile-audit\.mjs staged/);
  assert.match(prePush, /run-targeted-mobile-audit\.mjs push/);
  assert.match(prePush, /cat >"\$PUSH_REFS"/);
  assert.equal(packageJson.scripts['audit:mobile'], 'bash scripts/run-mobile-browser-audit.sh');
  assert.match(browserRunner, /MOBILE_AUDIT_HEADED/);
  assert.match(browserRunner, /browserName.*chromium/);
  assert.match(browserRunner, /launchOptions.*headless.*true/);
  assert.match(browserRunner, /--browser chrome --headed/);
  assert.match(browserRunner, /--session "\$SESSION" run-code --filename scripts\/mobile-playwright-audit\.js/);
  assert.match(browserRunner, /--session "\$SESSION" close/);
  for (const [, template] of browserRunner.matchAll(/mktemp "([^"]+)"/g)) {
    assert.match(template, /X+$/, `mktemp template must end in X for BSD and GNU portability: ${template}`);
  }
  assert.match(audit, /__longmont_mobile_audit_routes/);
  assert.doesNotMatch(audit, /process\.env\.MOBILE_AUDIT_ROUTES/);
  assert.match(audit, /waitUntil: 'domcontentloaded'/);
  assert.doesNotMatch(audit, /waitUntil: 'networkidle'/);
  assert.match(audit, /document\.readyState === 'complete'/);
  assert.match(audit, /response\.ok\(\)/);
  assert.match(audit, /mediaLayoutFailures/);
  for (const route of FULL_ROUTES) assert.ok(audit.includes(`'${route}'`), `full audit is missing ${route}`);
  assert.match(audit, /latestEditionRoute/);
  assert.match(editorGuide, /selects from the staged\s+snapshot/);
});

test('browser runner isolates and closes sessions, forces bundled headless Chromium, and preserves failures', async (t) => {
  const { directory } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const codexHome = path.join(directory, 'codex-home');
  const cliDirectory = path.join(codexHome, 'skills/playwright/scripts');
  const cliPath = path.join(cliDirectory, 'playwright_cli.sh');
  const logPath = path.join(directory, 'playwright.log');
  await mkdir(cliDirectory, { recursive: true });
  await writeFile(cliPath, `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >>"$MOBILE_AUDIT_TEST_LOG"
case " $* " in
  *" open "*)
    if [[ "\${MOBILE_AUDIT_TEST_MISSING_BROWSER:-0}" == 1 ]]; then
      echo 'Browser chromium_headless_shell is not installed' >&2
      exit 1
    fi
    if [[ "\${MOBILE_AUDIT_TEST_OPEN_DELAY:-0}" == 1 ]]; then sleep 0.2; fi
    ;;
  *" run-code "*)
    if [[ "\${MOBILE_AUDIT_TEST_FAIL:-0}" == 1 ]]; then exit 17; fi
    ;;
esac
`);
  await chmod(cliPath, 0o755);

  const baseEnv = {
    ...process.env,
    CODEX_HOME: codexHome,
    MOBILE_AUDIT_BASE_URL: 'http://audit.test',
    MOBILE_AUDIT_TEST_LOG: logPath,
  };
  const run = (extraEnv = {}) => spawnSync('bash', [path.join(root, 'scripts/run-mobile-browser-audit.sh')], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...baseEnv, ...extraEnv },
  });
  const commands = async () => (await readFile(logPath, 'utf8')).trim().split('\n');

  const headless = run({ MOBILE_AUDIT_ROUTES: JSON.stringify(['/', '/edition/test']) });
  assert.equal(headless.status, 0, headless.stderr);
  const headlessCommands = await commands();
  assert.equal(headlessCommands.length, 3);
  const session = headlessCommands[0].match(/^--session (\S+) /)?.[1];
  assert.match(session, /^longmont-mobile-audit-/);
  assert.ok(headlessCommands.every((command) => command.startsWith(`--session ${session} `)));
  assert.match(headlessCommands[0], / open http:\/\/audit\.test\/\?__longmont_mobile_audit_routes=/);
  assert.match(headlessCommands[0], / --config \/.*longmont-mobile-audit-playwright\./);
  assert.doesNotMatch(headlessCommands[0], /(?:^|\s)(?:--headed|--browser(?:=|\s+)chrome)(?:\s|$)/);
  assert.match(headlessCommands[1], / run-code --filename scripts\/mobile-playwright-audit\.js$/);
  assert.match(headlessCommands[2], / close$/);

  await writeFile(logPath, '');
  const headed = run({ MOBILE_AUDIT_HEADED: '1' });
  assert.equal(headed.status, 0, headed.stderr);
  assert.match((await commands())[0], / open http:\/\/audit\.test --browser chrome --headed$/);

  await writeFile(logPath, '');
  const failedAudit = run({ MOBILE_AUDIT_TEST_FAIL: '1' });
  assert.equal(failedAudit.status, 17);
  assert.match((await commands()).at(-1), / close$/);

  await writeFile(logPath, '');
  const missingBrowser = run({ MOBILE_AUDIT_TEST_MISSING_BROWSER: '1' });
  assert.equal(missingBrowser.status, 1);
  assert.match(missingBrowser.stderr, /requires Playwright's bundled Chromium headless shell/);
  assert.match(missingBrowser.stderr, /install-browser chromium --only-shell/);
  assert.match((await commands()).at(-1), / close$/);

  await writeFile(logPath, '');
  const auditTmp = path.join(directory, 'audit-tmp');
  await mkdir(auditTmp);
  const runConcurrent = () => new Promise((resolve) => {
    const child = spawn('bash', [path.join(root, 'scripts/run-mobile-browser-audit.sh')], {
      cwd: directory,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...baseEnv, TMPDIR: auditTmp, MOBILE_AUDIT_TEST_OPEN_DELAY: '1' },
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stderr }));
  });
  const concurrent = await Promise.all([runConcurrent(), runConcurrent()]);
  for (const result of concurrent) assert.equal(result.status, 0, result.stderr);
  const configPaths = (await commands())
    .filter((command) => command.includes(' open '))
    .map((command) => command.match(/ --config (\S+)/)?.[1]);
  assert.equal(new Set(configPaths).size, 2, 'concurrent audits must use distinct config files');
  assert.deepEqual(await readdir(auditTmp), [], 'audit temporary files must be cleaned up');

  const invalidMode = run({ MOBILE_AUDIT_HEADED: 'sometimes' });
  assert.equal(invalidMode.status, 2);
  assert.match(invalidMode.stderr, /must be 0 or 1/);
});

test('mobile server owns an ephemeral listener, preserves audit environment and cleans up failures', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'longmont-mobile-server-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bin = path.join(directory, 'bin');
  const vite = path.join(directory, 'node_modules/vite');
  await mkdir(bin);
  await mkdir(vite, { recursive: true });
  await writeFile(path.join(vite, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
  await writeFile(path.join(vite, 'index.js'), `
import assert from 'node:assert/strict';
import http from 'node:http';
import { appendFileSync } from 'node:fs';
export async function createServer(config) {
  assert.ok(Number.isInteger(config.server.port) && config.server.port > 0);
  assert.deepEqual(config.server, { host: '127.0.0.1', port: config.server.port, strictPort: true, open: false });
  if (process.env.TEST_START_FAIL) throw new Error('fixture startup failure');
  let middleware;
  const httpServer = http.createServer((req, res) => {
    if (process.env.TEST_WRONG_READY) return res.end('unrelated server');
    middleware(req, res, () => res.end('fixture app'));
  });
  const server = {
    httpServer,
    middlewares: { use(fn) { middleware = fn; } },
    listen: () => new Promise(resolve => httpServer.listen(config.server.port, config.server.host, resolve)),
    close: () => new Promise(resolve => {
      httpServer.closeAllConnections();
      httpServer.close(() => { appendFileSync(process.env.TEST_LOG, 'closed\\n'); resolve(); });
    }),
  };
  config.plugins[0].configureServer(server);
  return server;
}
`);
  await writeFile(path.join(bin, 'git'), '#!/bin/sh\nexit 1\n');
  await writeFile(path.join(bin, 'npm'), `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.TEST_LOG, JSON.stringify({
  args: process.argv.slice(2), url: process.env.MOBILE_AUDIT_BASE_URL,
  routes: process.env.MOBILE_AUDIT_ROUTES, headed: process.env.MOBILE_AUDIT_HEADED,
}) + '\\n');
setTimeout(() => process.exit(Number(process.env.TEST_AUDIT_STATUS || 0)), 300);
`);
  await chmod(path.join(bin, 'git'), 0o755);
  await chmod(path.join(bin, 'npm'), 0o755);
  let sequence = 0;
  const run = async (extra = {}) => {
    const log = path.join(directory, `run-${sequence++}.log`);
    const child = spawn('bash', [path.join(root, 'scripts/run-mobile-audit.sh')], {
      cwd: directory,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_LOG: log,
        MOBILE_AUDIT_ROUTES: '["/","/tools"]', MOBILE_AUDIT_HEADED: '0', ...extra },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    const status = await new Promise(resolve => child.on('close', resolve));
    const lines = await readFile(log, 'utf8').catch(() => '');
    return { status, stderr, lines: lines.trim().split('\n').filter(Boolean) };
  };
  const results = await Promise.all([run(), run({ TEST_AUDIT_STATUS: '17' })]);
  assert.deepEqual(results.map(result => result.status), [0, 17]);
  const urls = [];
  for (const result of results) {
    assert.equal(result.lines.at(-1), 'closed');
    const invocation = JSON.parse(result.lines[0]);
    assert.deepEqual(invocation.args, ['run', 'audit:mobile']);
    assert.equal(invocation.routes, '["/","/tools"]');
    assert.equal(invocation.headed, '0');
    assert.match(invocation.url, /^http:\/\/127\.0\.0\.1:\d+$/);
    urls.push(invocation.url);
    await assert.rejects(fetch(invocation.url));
  }
  assert.equal(new Set(urls).size, 2);
  const wrong = await run({ TEST_WRONG_READY: '1' });
  assert.equal(wrong.status, 1);
  assert.deepEqual(wrong.lines, ['closed']);
  assert.match(wrong.stderr, /did not match its own Vite instance/);
  const failed = await run({ TEST_START_FAIL: '1' });
  assert.equal(failed.status, 1);
  assert.deepEqual(failed.lines, []);
  assert.match(failed.stderr, /fixture startup failure/);
});

test('encoded targeted routes reach audit code before navigation and invalid transport fails closed', async () => {
  const source = await readFile(path.join(root, 'scripts/mobile-playwright-audit.js'), 'utf8');
  const audit = vm.runInNewContext(`(${source})`, { Error, JSON, Array, Math, Set });
  const routes = ['/', '/edition/edition-2099-01-01-target'];
  const encoded = Buffer.from(JSON.stringify(routes)).toString('base64url');
  const navigations = [];
  const navigationWaits = [];
  let evaluateCount = 0;
  let unreadableMarkdownTables = [];
  const page = {
    url: () => `http://audit.test/?__longmont_mobile_audit_routes=${encoded}`,
    evaluate: async (_callback, argument) => {
      evaluateCount += 1;
      if (evaluateCount === 1) return 'http://audit.test';
      if (typeof argument === 'string') {
        return { canonical: argument, parsed: JSON.parse(Buffer.from(argument, 'base64url').toString('utf8')) };
      }
      if (evaluateCount === 3) return [];
      return {
        title: 'fixture', viewportWidth: 390, scrollWidth: 390, bodyScrollWidth: 390,
        overflowingElements: [], brokenImages: [], mediaLayoutFailures: [], unreadableReleaseTables: [],
        unreadableMarkdownTables,
      };
    },
    goto: async (url, options) => {
      if (options?.waitUntil === 'networkidle') throw new Error('simulated page with ongoing network activity');
      navigations.push(url);
      navigationWaits.push(options?.waitUntil);
      return { ok: () => true, status: () => 200 };
    },
    setViewportSize: async () => {},
    waitForFunction: async () => {},
    waitForTimeout: async () => {},
    screenshot: async () => {},
  };

  const result = await audit(page);
  assert.deepEqual([...result.routes], routes);
  assert.deepEqual([...new Set(navigations)], ['http://audit.test/', ...routes.slice(1).map((route) => `http://audit.test${route}`)]);
  assert.ok(!navigations.some((url) => url.includes('/tools')));
  assert.deepEqual([...new Set(navigationWaits)], ['domcontentloaded']);

  evaluateCount = 0;
  unreadableMarkdownTables = [{ minimumCellWidth: 70, minimumFontSize: 12 }];
  await assert.rejects(() => audit(page), /Mobile audit failed/);

  const invalidPage = { ...page, url: () => 'http://audit.test/?__longmont_mobile_audit_routes=not_json' };
  await assert.rejects(() => audit(invalidPage), /Invalid targeted mobile audit route transport/);
});

test('production route transport validates bounded paths without backtracking or navigation on rejection', () => {
  // A child deadline also catches a synchronous regex hang, which an async test
  // timeout cannot interrupt. Execute the real audit and its decoding callback.
  const result = spawnSync(process.execPath, ['--input-type=module'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 2000,
    env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR },
    input: `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('scripts/mobile-playwright-audit.js', 'utf8');
const audit = vm.runInNewContext('(' + source + ')', {
  Error, JSON, Array, Math, Set, Uint8Array, TextDecoder, atob, btoa,
  window: { location: { origin: 'http://audit.test' } },
});
async function check(parsed, accepted, rawEncoding) {
  const encoded = rawEncoding ?? Buffer.from(JSON.stringify(parsed)).toString('base64url');
  const navigations = [];
  const page = {
    url: () => 'http://audit.test/?__longmont_mobile_audit_routes=' + encoded,
    evaluate: async (callback, argument) => callback(argument),
    goto: async (url) => { navigations.push(url); throw new Error('fixture-navigation'); },
  };
  await assert.rejects(() => audit(page), accepted
    ? /^Error: fixture-navigation$/
    : /Invalid targeted mobile audit route transport/);
  assert.deepEqual(navigations, accepted ? ['http://audit.test/'] : []);
}
const shortAttack = '/0/' + '00/'.repeat(25) + '!';
const longAttack = '/0/' + '00/'.repeat(681) + '!';
assert.equal(shortAttack.length, 79);
assert.equal(longAttack.length, 2047);
for (const route of [shortAttack, longAttack]) await check([route], false);
for (const routes of [
  ['/'], ['/a', '/0', '/123/456', '/a--b/0-9', '/edition/edition-2099-01-01-target'],
  ['/' + 'a'.repeat(2047)], Array.from({ length: 50 }, (_, i) => '/route-' + i),
]) await check(routes, true);
for (const parsed of [
  null, {}, '/', [], [null], [1], Array(51).fill('/'), ['/' + 'a'.repeat(2048)],
  ...['', 'a', '//', '/a/', '/a//b', '/-a', '/a-', '/a/-b', '/a/b-', '/A',
    '/.', '/..', '/a/../b', '/a?b', '/a#b', 'https://evil.test/a', '//evil.test/a',
    '/%2f', '/%2e%2e', '/a b', '/é', '/a' + String.fromCharCode(92) + 'b',
    '/a' + String.fromCharCode(10), '/a' + String.fromCharCode(13),
  ].map((route) => [route]),
]) await check(parsed, false);
await check(null, false, 'not_json');
// "WyIvIl0" is the canonical encoding of ["/"]; the final low bits must be zero.
await check(null, false, 'WyIvIl1');
await check(null, false, 'WyIvIl0=');
console.log('bounded production route validation: PASS');
`,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /bounded production route validation: PASS/);
});

test('selector targets page and edition routes, skips known non-web paths, and fails unknown paths closed', async () => {
  assert.deepEqual(FULL_ROUTES, [
    '/', '/tools', '/model-watch', '/timeline', '/newsletter', '/countdown', '/leaderboard', '/about',
    '/edition/edition-2026-06-10-ai-landscape',
  ]);
  assert.deepEqual(await selectMobileAudit(['src/pages/Tools.tsx']), {
    action: 'routes', routes: ['/tools'], reason: 'src/pages/Tools.tsx',
  });
  assert.equal((await selectMobileAudit(['docs/operator.md', 'api/job.ts'])).action, 'skip');
  assert.equal((await selectMobileAudit(['src/App.css'])).action, 'full');
  assert.equal((await selectMobileAudit(['mystery/new-surface.xyz'])).action, 'full');

  const edition = await selectMobileAudit(['src/articles/2026.09.02.md'], {
    readSnapshot: async () => '---\nid: edition-2026-09-02-test\n---\nbody',
  });
  assert.deepEqual(edition.routes, ['/', '/edition/edition-2026-09-02-test']);

  const ambiguousAssetMapping = await selectMobileAudit(['public/weekly-screenshots/2026.09.02/chart.png'], {
    listPublishedArticles: async () => [
      'src/articles/2026.09.02-a.md',
      'src/articles/2026.09.02-b.md',
    ],
    readSnapshot: async (articlePath) => articlePath.endsWith('-a.md')
      ? 'id: edition-2026-09-02-a'
      : undefined,
  });
  assert.equal(ambiguousAssetMapping.action, 'full');
});

test('staged mode reads only the index snapshot, not unstaged worktree changes', async (t) => {
  const { directory } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(path.join(directory, 'src/pages/Tools.tsx'), 'staged\n');
  git(directory, ['add', 'src/pages/Tools.tsx']);
  await mkdir(path.join(directory, 'src'), { recursive: true });
  await writeFile(path.join(directory, 'src/App.css'), 'unstaged shared css\n');

  const selection = runSelection(directory, 'staged');
  assert.equal(selection.action, 'routes');
  assert.deepEqual(selection.routes, ['/tools']);
  assert.deepEqual(selection.paths, ['src/pages/Tools.tsx']);
});

test('push mode selects files from outgoing commits rather than the worktree', async (t) => {
  const { directory, base } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(path.join(directory, 'src/pages/ModelWatch.tsx'), 'outgoing\n');
  git(directory, ['add', '.']);
  const head = commit(directory, 'model watch');
  await writeFile(path.join(directory, 'src/App.css'), 'uncommitted shared css\n');

  const update = `refs/heads/topic ${head} refs/heads/topic ${base}\n`;
  const selection = runSelection(directory, 'push', update);
  assert.equal(selection.action, 'routes');
  assert.deepEqual(selection.routes, ['/model-watch']);
  assert.deepEqual(selection.paths, ['src/pages/ModelWatch.tsx']);
});

test('push mode detects resolution-only paths introduced by an outgoing merge commit', async (t) => {
  const { directory, base } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const mainBranch = git(directory, ['branch', '--show-current']);
  await writeFile(path.join(directory, 'src/pages/Tools.tsx'), 'common\n');
  git(directory, ['add', '.']);
  const common = commit(directory, 'common page');

  git(directory, ['checkout', '-q', '-b', 'merge-side', common]);
  await mkdir(path.join(directory, 'docs'), { recursive: true });
  await writeFile(path.join(directory, 'docs/side.md'), 'side\n');
  git(directory, ['add', '.']);
  commit(directory, 'side docs');

  git(directory, ['checkout', '-q', mainBranch]);
  await mkdir(path.join(directory, 'docs'), { recursive: true });
  await writeFile(path.join(directory, 'docs/main.md'), 'main\n');
  git(directory, ['add', '.']);
  commit(directory, 'main docs');
  git(directory, ['merge', '--no-commit', '--no-ff', 'merge-side']);
  await writeFile(path.join(directory, 'src/pages/Tools.tsx'), 'resolution-only merge change\n');
  git(directory, ['add', '.']);
  const merge = commit(directory, 'merge with resolution-only page change');

  const update = `refs/heads/topic ${merge} refs/heads/topic ${common}\n`;
  const selection = runSelection(directory, 'push', update);
  assert.equal(selection.action, 'routes');
  assert.deepEqual(selection.routes, ['/tools']);
  assert.ok(selection.paths.includes('src/pages/Tools.tsx'));
  assert.notEqual(common, base);
});

test('multi-ref conflicting article and asset snapshots fall back to a full audit', async (t) => {
  const { directory } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'src/articles'), { recursive: true });
  await writeFile(path.join(directory, 'src/articles/2026.09.02.md'), 'id: edition-2026-09-02-common\n');
  git(directory, ['add', '.']);
  const common = commit(directory, 'published article');

  git(directory, ['checkout', '-q', '-b', 'asset-a', common]);
  await mkdir(path.join(directory, 'public/weekly-screenshots/2026.09.02'), { recursive: true });
  const assetPath = path.join(directory, 'public/weekly-screenshots/2026.09.02/chart.png');
  await writeFile(assetPath, 'asset a\n');
  git(directory, ['add', '.']);
  const assetA = commit(directory, 'asset a');

  git(directory, ['checkout', '-q', '-b', 'asset-b', common]);
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, 'asset b\n');
  git(directory, ['add', '.']);
  const assetB = commit(directory, 'asset b');

  const assetUpdates = [
    `refs/heads/a ${assetA} refs/heads/a ${common}`,
    `refs/heads/b ${assetB} refs/heads/b ${common}`,
  ].join('\n');
  const assetSelection = runSelection(directory, 'push', `${assetUpdates}\n`);
  assert.equal(assetSelection.action, 'full');
  assert.match(assetSelection.reason, /ambiguous editorial asset snapshot/);

  git(directory, ['checkout', '-q', '-b', 'article-a', common]);
  await writeFile(path.join(directory, 'src/articles/2026.09.02.md'), 'id: edition-2026-09-02-a\n');
  git(directory, ['add', '.']);
  const articleA = commit(directory, 'article a');

  git(directory, ['checkout', '-q', '-b', 'article-b', common]);
  await writeFile(path.join(directory, 'src/articles/2026.09.02.md'), 'id: edition-2026-09-02-b\n');
  git(directory, ['add', '.']);
  const articleB = commit(directory, 'article b');

  const articleUpdates = [
    `refs/heads/a ${articleA} refs/heads/a ${common}`,
    `refs/heads/b ${articleB} refs/heads/b ${common}`,
  ].join('\n');
  const articleSelection = runSelection(directory, 'push', `${articleUpdates}\n`);
  assert.equal(articleSelection.action, 'full');
  assert.match(articleSelection.reason, /cannot resolve published edition/);
});

test('new branches and missing push ref data conservatively request a full audit', async (t) => {
  const { directory, base } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const zeros = '0'.repeat(40);
  const update = `refs/heads/new ${base} refs/heads/new ${zeros}\n`;
  assert.equal(runSelection(directory, 'push', update).action, 'full');
  assert.equal(runSelection(directory, 'push', '').action, 'full');
});
