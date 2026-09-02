import { createHash, timingSafeEqual } from 'node:crypto';

import {
  modelWatchSources as sources,
  normalizeModelName,
  seedModels,
} from '../scripts/model-watch-sources.mjs';

export const MODEL_WATCH_SOURCE_TIMEOUT_MS = 12_000;
export const MODEL_WATCH_SOURCE_MAX_BYTES = 512 * 1024;

function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()];
}

function constantTimeAuthorizationEqual(actual, expected) {
  const actualDigest = createHash('sha256').update(String(actual ?? '')).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function requireCronAuthorization(request, env) {
  const secret = typeof env.CRON_SECRET === 'string' ? env.CRON_SECRET : '';
  const authorization = headerValue(request, 'authorization');
  return Boolean(secret) && constantTimeAuthorizationEqual(authorization, `Bearer ${secret}`);
}

function abortError(signal) {
  return signal.reason instanceof Error ? signal.reason : new Error('Model Watch source deadline exceeded.');
}

async function readChunk(reader, signal) {
  if (signal.aborted) throw abortError(signal);
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([reader.read(), aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

async function cancelResponseBody(response) {
  if (response.body && typeof response.body.cancel === 'function') {
    await response.body.cancel().catch(() => undefined);
  }
}

async function readTextWithLimit(response, signal, maxBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new Error('Model Watch source response is not streamable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await readChunk(reader, signal);
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        throw new Error('Model Watch source response exceeded the size limit.');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    if (bytesRead > maxBytes || signal.aborted) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function createModelWatchHandler({
  env = process.env,
  fetchImpl = fetch,
  watchSources = sources,
  sourceTimeoutMs = MODEL_WATCH_SOURCE_TIMEOUT_MS,
  sourceMaxBytes = MODEL_WATCH_SOURCE_MAX_BYTES,
  now = () => new Date(),
} = {}) {
  return async function modelWatchHandler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ ok: false, error: 'method_not_allowed' });
    }
    if (!requireCronAuthorization(request, env)) {
      return response.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const detectedModels = new Set(seedModels);
    let successfulSources = 0;

    await Promise.all(watchSources.map(async (source) => {
      const signal = AbortSignal.timeout(sourceTimeoutMs);
      try {
        const sourceResponse = await fetchImpl(source.url, {
          headers: { 'User-Agent': 'LongmontAI-ModelWatch/1.0 (+https://longmont.ai/model-watch)' },
          signal,
        });
        if (!sourceResponse.ok) {
          await cancelResponseBody(sourceResponse);
          return;
        }

        const body = await readTextWithLimit(sourceResponse, signal, sourceMaxBytes);
        for (const pattern of source.patterns) {
          for (const match of body.matchAll(pattern)) {
            detectedModels.add(normalizeModelName(match[0]));
          }
        }
        successfulSources += 1;
      } catch {
        // A bounded partial result is more useful than failing the entire cron run.
      }
    }));

    return response.status(200).json({
      checkedAt: now().toISOString(),
      successfulSources,
      totalSources: watchSources.length,
      detectedModels: [...detectedModels].sort((a, b) => a.localeCompare(b)),
    });
  };
}

export default createModelWatchHandler();
