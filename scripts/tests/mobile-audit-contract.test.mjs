import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  const [packageJson, localCi, testSuite, preCommit, prePush, browserRunner, audit, editorGuide] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'scripts/local-ci.sh'), 'utf8'),
    readFile(path.join(root, 'scripts/test-suite.mjs'), 'utf8'),
    readFile(path.join(root, '.githooks/pre-commit'), 'utf8'),
    readFile(path.join(root, '.githooks/pre-push'), 'utf8'),
    readFile(path.join(root, 'scripts/run-mobile-browser-audit.sh'), 'utf8'),
    readFile(path.join(root, 'scripts/mobile-playwright-audit.js'), 'utf8'),
    readFile(path.join(root, 'docs/blog-editor.md'), 'utf8'),
  ]);

  assert.equal(packageJson.scripts['test:mobile'], 'bash scripts/run-mobile-audit.sh');
  assert.match(localCi, /npm test/);
  assert.match(testSuite, /'test:mobile-contract'/);
  assert.match(localCi, /MOBILE_AUDIT_HEADED=0 env -u MOBILE_AUDIT_ROUTES npm run test:mobile/);
  assert.doesNotMatch(localCi, /test:mobile:staged/);
  assert.match(preCommit, /run-targeted-mobile-audit\.mjs staged/);
  assert.match(prePush, /run-targeted-mobile-audit\.mjs push/);
  assert.match(prePush, /cat >"\$PUSH_REFS"/);
  assert.equal(packageJson.scripts['audit:mobile'], 'bash scripts/run-mobile-browser-audit.sh');
  assert.match(browserRunner, /MOBILE_AUDIT_PLAYWRIGHT_CLI/);
  assert.match(browserRunner, /MOBILE_AUDIT_HEADED/);
  assert.match(browserRunner, /browserName.*chromium/);
  assert.match(browserRunner, /launchOptions.*headless.*true/);
  assert.match(browserRunner, /--browser chrome --headed/);
  assert.match(browserRunner, /--session "\$SESSION" run-code --filename scripts\/mobile-playwright-audit\.js/);
  assert.match(browserRunner, /--session "\$SESSION" close/);
  assert.match(audit, /__longmont_mobile_audit_routes/);
  assert.doesNotMatch(audit, /process\.env\.MOBILE_AUDIT_ROUTES/);
  assert.match(audit, /mediaLayoutFailures/);
  assert.match(audit, /pageerror/);
  assert.match(audit, /desktop-smoke/);
  assert.match(audit, /invalid_email/);
  assert.match(audit, /newsletter-fallback/);
  assert.match(audit, /Newsletter signup is temporarily unavailable/);
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

  const headless = run({
    CODEX_HOME: path.join(directory, 'unused-codex-home'),
    MOBILE_AUDIT_PLAYWRIGHT_CLI: cliPath,
    MOBILE_AUDIT_RUN_ID: 'contract-headless',
    MOBILE_AUDIT_ROUTES: JSON.stringify(['/', '/edition/test']),
  });
  assert.equal(headless.status, 0, headless.stderr);
  const headlessCommands = await commands();
  assert.equal(headlessCommands.length, 3);
  const session = headlessCommands[0].match(/^--session (\S+) /)?.[1];
  assert.match(session, /^longmont-mobile-audit-/);
  assert.ok(headlessCommands.every((command) => command.startsWith(`--session ${session} `)));
  assert.match(headlessCommands[0], / open http:\/\/audit\.test\/\?__longmont_mobile_audit_run=contract-headless&__longmont_mobile_audit_routes=/);
  await assert.doesNotReject(() => access(path.join(directory, 'output/playwright/mobile-audit/contract-headless')));
  assert.match(headlessCommands[0], / --config \/.*longmont-mobile-audit-playwright\./);
  assert.doesNotMatch(headlessCommands[0], /(?:^|\s)(?:--headed|--browser(?:=|\s+)chrome)(?:\s|$)/);
  assert.match(headlessCommands[1], / run-code --filename scripts\/mobile-playwright-audit\.js$/);
  assert.match(headlessCommands[2], / close$/);

  await writeFile(logPath, '');
  const headed = run({ MOBILE_AUDIT_HEADED: '1', MOBILE_AUDIT_RUN_ID: 'contract-headed' });
  assert.equal(headed.status, 0, headed.stderr);
  assert.match((await commands())[0], / open http:\/\/audit\.test\/\?__longmont_mobile_audit_run=contract-headed --browser chrome --headed$/);
  await assert.doesNotReject(() => access(path.join(directory, 'output/playwright/mobile-audit/contract-headed')));

  await writeFile(logPath, '');
  const failedAudit = run({ MOBILE_AUDIT_PLAYWRIGHT_CLI: cliPath, MOBILE_AUDIT_TEST_FAIL: '1' });
  assert.equal(failedAudit.status, 17);
  assert.match((await commands()).at(-1), / close$/);

  await writeFile(logPath, '');
  const missingBrowser = run({ MOBILE_AUDIT_TEST_MISSING_BROWSER: '1' });
  assert.equal(missingBrowser.status, 1);
  assert.match(missingBrowser.stderr, /requires Playwright's bundled Chromium headless shell/);
  assert.match(missingBrowser.stderr, /install-browser chromium --only-shell/);
  assert.match((await commands()).at(-1), / close$/);

  const invalidMode = run({ MOBILE_AUDIT_HEADED: 'sometimes' });
  assert.equal(invalidMode.status, 2);
  assert.match(invalidMode.stderr, /must be 0 or 1/);

  const missingOverride = run({ MOBILE_AUDIT_PLAYWRIGHT_CLI: path.join(directory, 'missing-cli') });
  assert.equal(missingOverride.status, 1);
  assert.match(missingOverride.stderr, /must name an existing executable Playwright CLI launcher/);

  const nonExecutable = path.join(directory, 'not-executable-cli');
  await writeFile(nonExecutable, '#!/usr/bin/env bash\nexit 0\n');
  const nonExecutableOverride = run({ MOBILE_AUDIT_PLAYWRIGHT_CLI: nonExecutable });
  assert.equal(nonExecutableOverride.status, 1);
  assert.match(nonExecutableOverride.stderr, /must name an existing executable Playwright CLI launcher/);
});

test('encoded targeted routes reach audit code before navigation and invalid transport fails closed', async () => {
  const source = await readFile(path.join(root, 'scripts/mobile-playwright-audit.js'), 'utf8');
  const audit = vm.runInNewContext(`(${source})`, { Error, JSON, Array, Math, Set, URL });
  const routes = ['/', '/edition/edition-2099-01-01-target'];
  const encoded = Buffer.from(JSON.stringify(routes)).toString('base64url');
  const navigations = [];
  let evaluateCount = 0;
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
      };
    },
    goto: async (url) => { navigations.push(url); },
    setViewportSize: async () => {},
    waitForFunction: async () => {},
    waitForTimeout: async () => {},
    screenshot: async () => {},
  };

  const result = await audit(page);
  assert.deepEqual([...result.routes], routes);
  assert.deepEqual([...new Set(navigations)], ['http://audit.test/', ...routes.slice(1).map((route) => `http://audit.test${route}`)]);
  assert.ok(!navigations.some((url) => url.includes('/tools')));

  const invalidPage = { ...page, url: () => 'http://audit.test/?__longmont_mobile_audit_routes=not_json' };
  await assert.rejects(() => audit(invalidPage), /Invalid targeted mobile audit route transport/);
});

test('semantic audit fails wrong route identity, navigation errors, page exceptions, and required-resource 500s', async () => {
  const source = await readFile(path.join(root, 'scripts/mobile-playwright-audit.js'), 'utf8');

  async function runScenario({ fullScope = false, wrongIdentity = false, navigationStatus = 200, pageError = false, resourceStatus = 200 }) {
    const context = { Error, JSON, Array, Math, Set, URL, document: undefined };
    const audit = vm.runInNewContext(`(${source})`, context);
    const encoded = Buffer.from(JSON.stringify(['/tools'])).toString('base64url');
    const listeners = new Map();
    let evaluateCount = 0;
    let emitted = false;
    const page = {
      url: () => fullScope
        ? 'http://audit.test/?__longmont_mobile_audit_run=semantic'
        : `http://audit.test/?__longmont_mobile_audit_run=semantic&__longmont_mobile_audit_routes=${encoded}`,
      on: (event, listener) => listeners.set(event, listener),
      evaluate: async (_callback, argument) => {
        evaluateCount += 1;
        if (evaluateCount === 1) return 'http://audit.test';
        if (typeof argument === 'string') {
          return { canonical: argument, parsed: JSON.parse(Buffer.from(argument, 'base64url').toString('utf8')) };
        }
        if (evaluateCount === (fullScope ? 2 : 3)) return [];
        return {
          title: 'fixture', viewportWidth: 390, scrollWidth: 390, bodyScrollWidth: 390,
          overflowingElements: [], brokenImages: [], mediaLayoutFailures: [], unreadableReleaseTables: [],
        };
      },
      goto: async (url) => {
        if (!emitted && url.endsWith('/tools')) {
          emitted = true;
          if (pageError) listeners.get('pageerror')?.(new Error('injected page exception'));
          if (resourceStatus >= 400) listeners.get('response')?.({
            url: () => 'http://audit.test/assets/required.js',
            status: () => resourceStatus,
            headerValue: async () => null,
          });
        }
        const status = url.endsWith('/tools') ? navigationStatus : 200;
        return { ok: () => status < 400, status: () => status };
      },
      setViewportSize: async () => {},
      waitForFunction: async (callback, argument) => {
        if (argument === '/tools') {
          context.document = {
            querySelector: () => ({ textContent: wrongIdentity ? 'Wrong page' : 'AI Capabilities Matrix' }),
            images: [],
          };
          if (!callback(argument)) throw new Error('route readiness timed out');
        }
      },
      screenshot: async () => {},
    };
    return audit(page);
  }

  await assert.rejects(() => runScenario({ fullScope: true }), /could not discover a linked edition/);
  await assert.rejects(() => runScenario({ wrongIdentity: true }), /route readiness timed out/);
  await assert.rejects(() => runScenario({ navigationStatus: 503 }), /Navigation \/tools failed with status 503/);
  await assert.rejects(() => runScenario({ pageError: true }), /injected page exception/);
  await assert.rejects(() => runScenario({ resourceStatus: 500 }), /required\.js/);
});

test('concurrent mobile audit launchers allocate distinct ports', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'longmont-mobile-concurrency-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bin = path.join(directory, 'bin');
  const log = path.join(directory, 'audit-urls.log');
  await mkdir(bin, { recursive: true });
  await writeFile(path.join(bin, 'npm'), `#!/usr/bin/env bash
set -eu
if [[ " $* " == *" run dev "* ]]; then
  trap 'exit 0' TERM INT
  while :; do sleep 1; done
fi
if [[ " $* " == *" run audit:mobile "* ]]; then
  printf '%s\\n' "$MOBILE_AUDIT_BASE_URL" >>"$MOBILE_AUDIT_TEST_LOG"
fi
`);
  await writeFile(path.join(bin, 'curl'), '#!/usr/bin/env bash\nexit 0\n');
  await Promise.all(['npm', 'curl'].map((name) => chmod(path.join(bin, name), 0o755)));

  const run = () => new Promise((resolve, reject) => {
    const child = spawn('bash', [path.join(root, 'scripts/run-mobile-audit.sh')], {
      cwd: directory,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, MOBILE_AUDIT_TEST_LOG: log },
      stdio: 'ignore',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`launcher exited ${code}`)));
  });
  await Promise.all([run(), run()]);
  const urls = (await readFile(log, 'utf8')).trim().split('\n');
  assert.equal(urls.length, 2);
  assert.equal(new Set(urls).size, 2);
  assert.ok(urls.every((url) => /^http:\/\/127\.0\.0\.1:\d+$/.test(url)));
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
