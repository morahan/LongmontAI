import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MODEL_WATCH_SOURCE_MAX_BYTES,
  MODEL_WATCH_SOURCE_TIMEOUT_MS,
  createModelWatchHandler,
} from '../../api/model-watch.mjs';
import { modelWatchSources, seedModels } from '../model-watch-sources.mjs';

const [models, workflow, editorGuide, updater, page, apiSource, vercelConfig] = await Promise.all([
  readFile(new URL('../../src/data/modelWatch.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../.github/workflows/model-watch.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/blog-editor.md', import.meta.url), 'utf8'),
  readFile(new URL('../update-model-watch.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../src/pages/ModelWatch.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../../api/model-watch.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../vercel.json', import.meta.url), 'utf8'),
]);

const sourceFixture = {
  url: 'https://source.example.test/models',
  patterns: [/Example Model 2/g],
};

function request({ method = 'GET', authorization, url = '/api/model-watch' } = {}) {
  return {
    method,
    url,
    query: Object.fromEntries(new URL(url, 'https://longmontai.com').searchParams),
    headers: authorization === undefined ? {} : { authorization },
  };
}

function responseHarness() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
  };
}

function handlerWith(fetchImpl, overrides = {}) {
  return createModelWatchHandler({
    env: { CRON_SECRET: 'cron-test-secret' },
    fetchImpl,
    watchSources: [sourceFixture],
    now: () => new Date('2026-08-25T12:00:00.000Z'),
    ...overrides,
  });
}

test('Model Watch source and editorial contracts remain complete', () => {
  assert.ok(modelWatchSources.some((source) => source.company === 'Meta AI' && source.url === 'https://ai.meta.com/blog/' && source.required));
  assert.ok(modelWatchSources.some((source) => source.company === 'Moonshot AI / Kimi' && source.url === 'https://www.moonshot.cn/en' && source.required));
  for (const model of ['Muse Spark 1.1', 'Muse Spark 1.2', 'GLM-5.3', 'Nemotron 3.5 Lightning', 'Qwen-Image 3.0', 'Kimi K3']) {
    assert.ok(seedModels.includes(model));
  }
  for (const id of ['muse-spark-1-1', 'muse-spark-1-2', 'glm-5-3', 'nemotron-3-5-lightning', 'qwen-image-3-0', 'weather-next-cyclones', 'kimi-k3']) {
    assert.match(models, new RegExp(`id: '${id}'`));
  }
  assert.match(models, /latestBriefingModelIds/);
  assert.match(workflow, /cron: "17 13 \* \* 1"/);
  assert.match(editorGuide, /npm run model-watch:update/);
  assert.match(updater, /Required Model Watch sources failed/);
});

test('public Model Watch page uses only the checked-in snapshot', () => {
  assert.match(page, /import modelWatchStatus from '\.\.\/data\/modelWatch\.generated\.json'/);
  assert.doesNotMatch(page, /fetch\s*\(/);
  assert.doesNotMatch(page, /\/api\/model-watch/);
  assert.doesNotMatch(page, /useEffect|useState/);
});

test('Vercel cron remains configured for the protected endpoint', () => {
  const config = JSON.parse(vercelConfig);
  assert.ok(config.crons.some((cron) => cron.path === '/api/model-watch' && cron.schedule === '17 13 * * *'));
});

test('handler rejects every non-GET method with Allow and without fetching', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    let fetches = 0;
    const handler = handlerWith(async () => { fetches += 1; return new Response(''); });
    const response = responseHarness();
    await handler(request({ method, authorization: 'Bearer cron-test-secret' }), response);
    assert.equal(response.statusCode, 405, method);
    assert.equal(response.headers.allow, 'GET');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(fetches, 0);
  }
});

test('handler requires the exact Bearer CRON_SECRET and query parameters cannot bypass auth', async () => {
  const rejected = [
    request(),
    request({ authorization: 'cron-test-secret' }),
    request({ authorization: 'Bearer wrong-secret' }),
    request({ authorization: 'bearer cron-test-secret' }),
    request({ authorization: 'Bearer cron-test-secret ' }),
    request({ url: '/api/model-watch?authorization=Bearer%20cron-test-secret&cron_secret=cron-test-secret' }),
  ];

  for (const rejectedRequest of rejected) {
    let fetches = 0;
    const handler = handlerWith(async () => { fetches += 1; return new Response(''); });
    const response = responseHarness();
    await handler(rejectedRequest, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(fetches, 0);
  }

  let unconfiguredFetches = 0;
  const unconfiguredHandler = handlerWith(
    async () => { unconfiguredFetches += 1; return new Response(''); },
    { env: {} },
  );
  const unconfiguredResponse = responseHarness();
  await unconfiguredHandler(request({ authorization: 'Bearer undefined' }), unconfiguredResponse);
  assert.equal(unconfiguredResponse.statusCode, 401);
  assert.equal(unconfiguredFetches, 0);

  assert.match(apiSource, /timingSafeEqual/);
});

test('authorized GET performs the bounded scan', async () => {
  let fetches = 0;
  const handler = handlerWith(async (_url, options) => {
    fetches += 1;
    assert.ok(options.signal instanceof AbortSignal);
    return new Response('Example Model 2');
  });
  const response = responseHarness();
  await handler(request({ authorization: 'Bearer cron-test-secret' }), response);

  assert.equal(response.statusCode, 200);
  assert.equal(fetches, 1);
  assert.equal(response.body.successfulSources, 1);
  assert.ok(response.body.detectedModels.includes('Example Model 2'));
  assert.equal(MODEL_WATCH_SOURCE_TIMEOUT_MS, 12_000);
  assert.equal(MODEL_WATCH_SOURCE_MAX_BYTES, 512 * 1024);
});

test('per-source deadline cancels a response stream stalled after headers', async () => {
  let cancellations = 0;
  let observedSignal;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Example'));
    },
    cancel() {
      cancellations += 1;
    },
  });
  const handler = handlerWith(
    async (_url, { signal }) => {
      observedSignal = signal;
      return new Response(stream, { status: 200 });
    },
    { sourceTimeoutMs: 5 },
  );
  const response = responseHarness();
  const keepEventLoopAlive = setTimeout(() => undefined, 50);
  try {
    await handler(request({ authorization: 'Bearer cron-test-secret' }), response);
  } finally {
    clearTimeout(keepEventLoopAlive);
  }

  assert.equal(observedSignal.aborted, true);
  assert.equal(cancellations, 1);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.successfulSources, 0);
});

test('streaming response-size ceiling immediately cancels an oversized source', async () => {
  let cancellations = 0;
  let pulls = 0;
  const stream = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(MODEL_WATCH_SOURCE_MAX_BYTES + 1));
    },
    cancel() {
      cancellations += 1;
    },
  }, { highWaterMark: 0 });
  const handler = handlerWith(async () => new Response(stream, { status: 200 }));
  const response = responseHarness();
  await handler(request({ authorization: 'Bearer cron-test-secret' }), response);

  assert.equal(pulls, 1);
  assert.equal(cancellations, 1);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.successfulSources, 0);
  assert.deepEqual(response.body.detectedModels.sort(), [...seedModels].sort());
});

test('non-OK source body is cancelled without reading or parsing', async () => {
  let cancellations = 0;
  let pulls = 0;
  const stream = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new TextEncoder().encode('Example Model 2'));
    },
    cancel() {
      cancellations += 1;
    },
  }, { highWaterMark: 0 });
  const handler = handlerWith(async () => new Response(stream, { status: 503 }));
  const response = responseHarness();
  await handler(request({ authorization: 'Bearer cron-test-secret' }), response);

  assert.equal(pulls, 0);
  assert.equal(cancellations, 1);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.successfulSources, 0);
  assert.equal(response.body.detectedModels.includes('Example Model 2'), false);
});
