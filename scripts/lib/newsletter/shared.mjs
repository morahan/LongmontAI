import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export const CADENCES = new Set(['weekly', 'biweekly']);
export const DEFAULT_CADENCE = 'weekly';

// Provider-specific budgets keep cron and request handlers finite without applying one oversized global timeout.
export const NEWSLETTER_OUTBOUND_LIMITS = Object.freeze({
  supabase: { timeoutMs: 10_000, maxBytes: 1024 * 1024 },
  listmonk: { timeoutMs: 12_000, maxBytes: 1024 * 1024 },
  listmonkCampaign: { timeoutMs: 15_000, maxBytes: 1024 * 1024 },
  resend: { timeoutMs: 10_000, maxBytes: 256 * 1024 },
  openai: { timeoutMs: 30_000, maxBytes: 1024 * 1024 },
  liveSource: { timeoutMs: 9_000, maxBytes: 80_000 },
  setup: { timeoutMs: 10_000, maxBytes: 1024 * 1024 },
});

export class NewsletterError extends Error {
  constructor(message, { status = 500, code = 'newsletter_error', cause, retryAfter } = {}) {
    super(message, { cause });
    this.name = 'NewsletterError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function outboundFailure(message, code) {
  return new NewsletterError(message, { status: 502, code });
}

// Cancellation is best-effort. Providers may return a promise that never settles,
// so cleanup must never delay an error or timeout result.
export function cancelNewsletterBody(body) {
  if (!body || typeof body.cancel !== 'function') return;
  try {
    void Promise.resolve(body.cancel()).catch(() => undefined);
  } catch {
    // Cleanup failures are intentionally ignored.
  }
}

function cancelNewsletterReader(reader) {
  try {
    void Promise.resolve(reader.cancel()).catch(() => undefined);
  } catch {
    // Cleanup failures are intentionally ignored.
  }
}

export async function newsletterFetch(fetchImpl, url, options = {}, { timeoutMs }) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('A finite positive newsletter outbound timeout is required.');
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  try {
    const response = await fetchImpl(url, { ...options, signal });
    return { response, signal };
  } catch {
    if (signal.aborted) {
      throw outboundFailure('Newsletter outbound request was aborted.', 'newsletter_outbound_aborted');
    }
    throw outboundFailure('Newsletter outbound request failed.', 'newsletter_outbound_failed');
  }
}

function abortReason(signal) {
  return signal.reason instanceof Error ? signal.reason : new Error('Newsletter outbound request was aborted.');
}

async function readStreamChunk(reader, signal) {
  if (signal?.aborted) throw abortReason(signal);
  if (!signal) return reader.read();
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(abortReason(signal));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([reader.read(), aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export async function readBoundedResponseText(response, { maxBytes, signal } = {}) {
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError('A finite positive newsletter response-size limit is required.');
  }
  // Fetch permits null bodies for responses such as 204 and HEAD. Treat that
  // legitimate representation exactly like an empty text/JSON payload.
  if (response?.body === null) return '';
  if (!response?.body || typeof response.body.getReader !== 'function') {
    throw outboundFailure('Newsletter provider response was not streamable.', 'newsletter_response_invalid');
  }
  let reader;
  try {
    reader = response.body.getReader();
  } catch {
    throw outboundFailure('Newsletter provider response was not streamable.', 'newsletter_response_invalid');
  }
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  let cancel = false;
  try {
    while (true) {
      const { done, value } = await readStreamChunk(reader, signal);
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        cancel = true;
        throw outboundFailure('Newsletter provider response exceeded the size limit.', 'newsletter_response_too_large');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    if (signal?.aborted) {
      cancel = true;
      throw outboundFailure('Newsletter outbound response was aborted.', 'newsletter_outbound_aborted');
    }
    if (error instanceof NewsletterError) throw error;
    throw outboundFailure('Newsletter provider response could not be read.', 'newsletter_response_invalid');
  } finally {
    if (cancel || signal?.aborted) cancelNewsletterReader(reader);
    try {
      reader.releaseLock();
    } catch {
      // Releasing a provider lock is also best-effort cleanup.
    }
  }
}

export async function readBoundedResponseJson(response, options) {
  const text = await readBoundedResponseText(response, options);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw outboundFailure('Newsletter provider returned invalid JSON.', 'newsletter_response_invalid');
  }
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"']+@[^\s@<>()[\]\\,;:"']+\.[^\s@<>()[\]\\,;:"']{2,}$/.test(email);
}

export function sanitizeText(value, maxLength = 180) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeCadence(value) {
  const cadence = String(value ?? DEFAULT_CADENCE).toLowerCase();
  return CADENCES.has(cadence) ? cadence : DEFAULT_CADENCE;
}

export function newsletterPeriod(cadence, now) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (cadence === 'biweekly' ? 13 : 6));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name);
  const lower = name.toLowerCase();
  return headers[name] ?? headers[lower];
}

function constantTimeEqual(left, right) {
  const leftBytes = Buffer.from(String(left));
  const rightBytes = Buffer.from(String(right));
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function requireJsonRequest(request) {
  const contentType = headerValue(request, 'content-type');
  if (contentType && !String(contentType).toLowerCase().includes('application/json')) {
    throw new NewsletterError('Request content type must be application/json.', {
      status: 415,
      code: 'unsupported_content_type',
    });
  }
}

function parsedOrigin(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim() === 'null') return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return url.origin === value.trim().replace(/\/$/, '') ? url.origin : null;
  } catch {
    return null;
  }
}

export function requireAllowedOrigin(request, env) {
  const originHeader = headerValue(request, 'origin');
  const allowMissingInDevelopment =
    env.NEWSLETTER_ALLOW_MISSING_ORIGIN === '1' && env.NODE_ENV === 'development';
  if ((originHeader === undefined || originHeader === null || originHeader === '') && allowMissingInDevelopment) return;

  const origin = parsedOrigin(originHeader);
  const configured = typeof env.NEWSLETTER_ALLOWED_ORIGINS === 'string' ? env.NEWSLETTER_ALLOWED_ORIGINS : '';
  const allowedOrigins = new Set(configured.split(',').map(parsedOrigin).filter(Boolean));
  if (!origin || !allowedOrigins.has(origin)) {
    throw new NewsletterError('Newsletter signup origin is not allowed.', {
      status: 403,
      code: 'origin_not_allowed',
    });
  }
}

export function trustedClientIp(request) {
  const value = headerValue(request, 'x-vercel-forwarded-for');
  if (typeof value !== 'string' || value !== value.trim() || value.includes(',') || !isIP(value)) {
    throw new NewsletterError('A trusted client identity is required.', {
      status: 503,
      code: 'client_identity_unavailable',
    });
  }
  return value;
}

function rateLimitHash(env, scope, value) {
  const secret = envValue(env, 'NEWSLETTER_RATE_LIMIT_SECRET');
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new NewsletterError('Newsletter rate limiting is not configured.', {
      status: 503,
      code: 'rate_limit_not_configured',
    });
  }
  return `\\x${createHmac('sha256', secret).update(`${scope}\0${value}`).digest('hex')}`;
}

export async function enforceNewsletterSignupRateLimit(env, { ip, email, now }, fetchImpl = fetch) {
  const ipHash = rateLimitHash(env, 'ip', ip);
  const emailHash = rateLimitHash(env, 'email', normalizeEmail(email));
  supabaseConfig(env);

  let result;
  try {
    result = await supabaseRest(
      env,
      'rpc/newsletter_enforce_signup_rate_limit',
      {
        method: 'POST',
        body: {
          p_ip_hash: ipHash,
          p_email_hash: emailHash,
          p_now: now.toISOString(),
        },
      },
      fetchImpl,
    );
  } catch {
    throw new NewsletterError('Newsletter signup is temporarily unavailable.', {
      status: 503,
      code: 'rate_limit_unavailable',
    });
  }
  const row = Array.isArray(result) ? result[0] : result;
  if (typeof row?.allowed !== 'boolean') {
    throw new NewsletterError('Newsletter signup is temporarily unavailable.', {
      status: 503,
      code: 'rate_limit_unavailable',
    });
  }
  if (!row.allowed) {
    const retryAfter = Math.max(1, Math.min(3600, Math.ceil(Number(row.retry_after_seconds) || 1)));
    throw new NewsletterError('Too many newsletter signup attempts. Please try again later.', {
      status: 429,
      code: 'rate_limit_exceeded',
      retryAfter,
    });
  }
}

export async function readJsonBody(request, { maxBytes = 4096 } = {}) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  let raw = '';
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
    raw = String(request.body);
  } else if (request.readable || typeof request[Symbol.asyncIterator] === 'function') {
    for await (const chunk of request) {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) {
        throw new NewsletterError('Request body is too large.', { status: 413, code: 'body_too_large' });
      }
    }
  }

  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new NewsletterError('Request body must be valid JSON.', { status: 400, code: 'invalid_json', cause: error });
  }
}

export function sendJson(response, status, payload, headers = {}) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(headers)) response.setHeader(key, value);
  return response.status(status).json(payload);
}

export function requireMethod(request, response, methods) {
  if (methods.includes(request.method)) return false;
  response.setHeader('Allow', methods.join(', '));
  sendJson(response, 405, { ok: false, error: 'method_not_allowed' });
  return true;
}

export function requireCronAuthorization(request, env) {
  const secret = env.CRON_SECRET;
  const authorization = headerValue(request, 'authorization');
  if (secret && authorization && constantTimeEqual(authorization, `Bearer ${secret}`)) return;
  if (env.NEWSLETTER_ALLOW_UNAUTHENTICATED_GENERATE === '1' && env.NODE_ENV !== 'production') return;
  throw new NewsletterError('Unauthorized.', { status: 401, code: 'unauthorized' });
}

function envValue(env, name) {
  const value = env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function supabaseConfig(env) {
  const url = envValue(env, 'SUPABASE_URL');
  const serviceRoleKey = envValue(env, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new NewsletterError('Supabase newsletter environment is not configured.', {
      status: 503,
      code: 'supabase_not_configured',
    });
  }
  return { url: url.replace(/\/+$/, ''), serviceRoleKey };
}

export async function supabaseRest(env, path, { method = 'GET', body, headers = {}, signal } = {}, fetchImpl = fetch) {
  const { url, serviceRoleKey } = supabaseConfig(env);
  const outbound = await newsletterFetch(fetchImpl, `${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  }, NEWSLETTER_OUTBOUND_LIMITS.supabase);
  const data = await readBoundedResponseJson(outbound.response, {
    maxBytes: NEWSLETTER_OUTBOUND_LIMITS.supabase.maxBytes,
    signal: outbound.signal,
  });
  if (!outbound.response.ok) {
    throw new NewsletterError('Supabase request failed.', {
      status: outbound.response.status >= 400 && outbound.response.status < 500 ? 502 : outbound.response.status,
      code: 'supabase_request_failed',
    });
  }
  return data;
}

export async function upsertSubscriber(env, subscriber, fetchImpl = fetch) {
  const rows = await supabaseRest(
    env,
    'newsletter_subscribers?on_conflict=email',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: {
        email: subscriber.email,
        name: subscriber.name || null,
        cadence: subscriber.cadence,
        status: subscriber.status ?? 'pending',
        source: subscriber.source,
        consented_at: subscriber.consentedAt ?? new Date().toISOString(),
        metadata: subscriber.metadata ?? {},
        sync_error: null,
      },
    },
    fetchImpl,
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function patchSubscriber(env, id, fields, fetchImpl = fetch) {
  if (!id) return null;
  const rows = await supabaseRest(
    env,
    `newsletter_subscribers?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: fields,
    },
    fetchImpl,
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

const NEWSLETTER_EVENT_PROVIDERS = Object.freeze({
  subscribe: new Set(['website']),
  listmonk_sync: new Set(['listmonk']),
  error: new Set(['listmonk']),
  draft_generated: new Set(['openai', 'deterministic']),
});
const LISTMONK_EVENT_STATUSES = new Set(['submitted', 'already-subscribed']);
const LISTMONK_EVENT_REASONS = new Set(['listmonk_not_configured', 'listmonk_list_not_configured']);
const CAMPAIGN_EVENT_STATUSES = new Set(['draft', 'scheduled', 'running', 'paused', 'finished', 'cancelled', 'skipped']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function invalidNewsletterEvent() {
  return new NewsletterError('Newsletter event was invalid.', {
    status: 500,
    code: 'newsletter_event_invalid',
  });
}

function minimizedNewsletterEvent(event) {
  const eventType = typeof event?.eventType === 'string' ? event.eventType : '';
  const provider = typeof event?.provider === 'string' ? event.provider : '';
  if (!NEWSLETTER_EVENT_PROVIDERS[eventType]?.has(provider)) throw invalidNewsletterEvent();

  const subscriberEvent = eventType !== 'draft_generated';
  const subscriberId = event?.subscriberId == null ? null : validUuid(event.subscriberId);
  if ((subscriberEvent && !subscriberId) || (!subscriberEvent && event?.subscriberId != null)) {
    throw invalidNewsletterEvent();
  }
  const providerEventId = event?.providerEventId == null ? null : validUuid(event.providerEventId);
  if (event?.providerEventId != null && !providerEventId) throw invalidNewsletterEvent();

  const input = event?.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload
    : {};
  let payload;
  if (eventType === 'draft_generated') {
    const issueId = validUuid(input.issueId);
    if (!issueId || !CADENCES.has(input.cadence)) throw invalidNewsletterEvent();
    payload = {
      issueId,
      cadence: input.cadence,
      campaignId: Number.isInteger(input.campaignId) && input.campaignId > 0 ? input.campaignId : null,
      campaignStatus: CAMPAIGN_EVENT_STATUSES.has(input.campaignStatus) ? input.campaignStatus : null,
      recovered: input.recovered === true,
    };
  } else if (eventType === 'listmonk_sync') {
    payload = {
      ok: input.ok === true,
      status: LISTMONK_EVENT_STATUSES.has(input.status) ? input.status : null,
      skipped: input.skipped === true,
      reason: LISTMONK_EVENT_REASONS.has(input.reason) ? input.reason : null,
    };
  } else if (eventType === 'error') {
    payload = {
      code: 'newsletter_provider_operation_failed',
      message: 'Newsletter provider operation failed.',
    };
  } else {
    // Subscriber identity and preference data belong in the protected
    // subscriber record, not duplicated in event JSON.
    payload = {};
  }

  return {
    subscriber_id: subscriberId,
    event_type: eventType,
    provider,
    provider_event_id: providerEventId,
    payload,
  };
}

export async function recordNewsletterEvent(env, event, fetchImpl = fetch) {
  const rows = await supabaseRest(
    env,
    'newsletter_delivery_events',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: minimizedNewsletterEvent(event),
    },
    fetchImpl,
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

export function listmonkConfig(env) {
  const baseUrl = envValue(env, 'LISTMONK_BASE_URL')?.replace(/\/+$/, '');
  if (!baseUrl) return null;
  return {
    baseUrl,
    listUuid: envValue(env, 'LISTMONK_NEWSLETTER_LIST_UUID'),
    weeklyListUuid: envValue(env, 'LISTMONK_WEEKLY_LIST_UUID'),
    biweeklyListUuid: envValue(env, 'LISTMONK_BIWEEKLY_LIST_UUID'),
    listId: Number(envValue(env, 'LISTMONK_NEWSLETTER_LIST_ID')),
    weeklyListId: Number(envValue(env, 'LISTMONK_WEEKLY_LIST_ID')),
    biweeklyListId: Number(envValue(env, 'LISTMONK_BIWEEKLY_LIST_ID')),
    username: envValue(env, 'LISTMONK_API_USERNAME'),
    token: envValue(env, 'LISTMONK_API_TOKEN'),
    templateId: Number(envValue(env, 'LISTMONK_DEFAULT_TEMPLATE_ID')),
  };
}

function listmonkListForCadence(config, cadence) {
  if (cadence === 'biweekly') {
    return {
      uuid: config.biweeklyListUuid ?? config.listUuid,
      id: Number.isInteger(config.biweeklyListId) && config.biweeklyListId > 0 ? config.biweeklyListId : config.listId,
    };
  }
  return {
    uuid: config.weeklyListUuid ?? config.listUuid,
    id: Number.isInteger(config.weeklyListId) && config.weeklyListId > 0 ? config.weeklyListId : config.listId,
  };
}

export function canCreateListmonkCampaign(env, cadence) {
  const config = listmonkConfig(env);
  const list = config ? listmonkListForCadence(config, cadence) : null;
  return Boolean(
    config?.username
    && config?.token
    && Number.isInteger(list?.id)
    && list.id > 0,
  );
}

function listmonkAuthHeaders(config) {
  if (!config.username || !config.token) return {};
  return {
    Authorization: `token ${config.username}:${config.token}`,
  };
}

async function providerJson(response, { signal, maxBytes }) {
  return readBoundedResponseJson(response, { signal, maxBytes });
}

export async function syncSubscriberToListmonk(env, subscriber, fetchImpl = fetch) {
  const config = listmonkConfig(env);
  if (!config) return { ok: false, skipped: true, reason: 'listmonk_not_configured' };
  const list = listmonkListForCadence(config, subscriber.cadence);

  let endpoint;
  let payload;
  let headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

  if (list.uuid) {
    endpoint = `${config.baseUrl}/api/public/subscription`;
    payload = {
      email: subscriber.email,
      name: subscriber.name || '',
      list_uuids: [list.uuid],
    };
  } else if (Number.isInteger(list.id) && list.id > 0 && config.username && config.token) {
    endpoint = `${config.baseUrl}/api/subscribers`;
    headers = { ...headers, ...listmonkAuthHeaders(config) };
    payload = {
      email: subscriber.email,
      name: subscriber.name || '',
      status: 'enabled',
      lists: [list.id],
      preconfirm_subscriptions: false,
    };
  } else {
    return { ok: false, skipped: true, reason: 'listmonk_list_not_configured' };
  }

  const outbound = await newsletterFetch(fetchImpl, endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: subscriber.signal,
  }, NEWSLETTER_OUTBOUND_LIMITS.listmonk);
  const data = await providerJson(outbound.response, {
    signal: outbound.signal,
    maxBytes: NEWSLETTER_OUTBOUND_LIMITS.listmonk.maxBytes,
  });

  if (!outbound.response.ok) {
    const detail = JSON.stringify(data ?? {});
    if (outbound.response.status === 409 || /already|duplicate|exists/i.test(detail)) {
      return { ok: true, status: 'already-subscribed' };
    }
    throw new NewsletterError('Listmonk subscription failed.', {
      status: 502,
      code: 'listmonk_request_failed',
    });
  }

  return { ok: true, status: 'submitted' };
}

export async function createListmonkCampaign(env, draft, fetchImpl = fetch) {
  const config = listmonkConfig(env);
  const list = config ? listmonkListForCadence(config, draft.cadence) : null;
  if (!config?.username || !config?.token || !Number.isInteger(list?.id) || list.id <= 0) {
    return { ok: false, skipped: true, reason: 'listmonk_campaign_not_configured' };
  }
  const fromEmail = envValue(env, 'NEWSLETTER_FROM_EMAIL');
  const deterministicName = draft.periodStart && draft.periodEnd
    ? `longmontai-${draft.cadence}-${draft.periodStart}-${draft.periodEnd}`
    : draft.name;
  const body = {
    name: draft.campaignIdentity ?? deterministicName,
    subject: draft.subject,
    lists: [list.id],
    from_email: fromEmail,
    content_type: 'html',
    messenger: 'email',
    type: 'regular',
    tags: ['longmontai', draft.cadence],
    body: draft.html,
    altbody: draft.text,
    ...(Number.isInteger(config.templateId) && config.templateId > 0 ? { template_id: config.templateId } : {}),
  };
  const outbound = await newsletterFetch(fetchImpl, `${config.baseUrl}/api/campaigns`, {
    method: 'POST',
    headers: {
      ...listmonkAuthHeaders(config),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: draft.signal,
  }, NEWSLETTER_OUTBOUND_LIMITS.listmonkCampaign);
  const data = await providerJson(outbound.response, {
    signal: outbound.signal,
    maxBytes: NEWSLETTER_OUTBOUND_LIMITS.listmonkCampaign.maxBytes,
  });
  if (!outbound.response.ok) {
    throw new NewsletterError('Listmonk campaign creation failed.', {
      status: 502,
      code: 'listmonk_campaign_failed',
    });
  }
  const campaignId = data?.data?.id ?? data?.id;
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw new NewsletterError('Listmonk campaign response did not include a valid campaign id.', {
      status: 502,
      code: 'listmonk_campaign_response_invalid',
    });
  }
  return { ok: true, status: 'draft', campaignId, data };
}

function campaignRows(data) {
  const candidates = [data?.data?.results, data?.data, data?.results];
  return candidates.find(Array.isArray) ?? [];
}

export async function recoverListmonkCampaign(env, campaignIdentity, fetchImpl = fetch) {
  const config = listmonkConfig(env);
  if (!config?.username || !config?.token) {
    return { ok: false, skipped: true, reason: 'listmonk_campaign_not_configured' };
  }
  const outbound = await newsletterFetch(
    fetchImpl,
    `${config.baseUrl}/api/campaigns?query=${encodeURIComponent(campaignIdentity)}`,
    {
      method: 'GET',
      headers: { ...listmonkAuthHeaders(config), Accept: 'application/json' },
    },
    NEWSLETTER_OUTBOUND_LIMITS.listmonk,
  );
  const data = await providerJson(outbound.response, {
    signal: outbound.signal,
    maxBytes: NEWSLETTER_OUTBOUND_LIMITS.listmonk.maxBytes,
  });
  if (!outbound.response.ok) {
    throw new NewsletterError('Listmonk campaign recovery failed.', {
      status: 502,
      code: 'listmonk_campaign_recovery_failed',
    });
  }
  const campaign = campaignRows(data).find((entry) => entry?.name === campaignIdentity);
  if (!campaign || !Number.isInteger(campaign.id) || campaign.id <= 0) {
    return { ok: false, skipped: false, reason: 'campaign_recovery_pending', identity: campaignIdentity };
  }
  return {
    ok: true,
    status: campaign.status ?? 'draft',
    recovered: true,
    campaignId: campaign.id,
    data: { data: campaign },
  };
}

async function generationRpc(env, name, body, fetchImpl) {
  const result = await supabaseRest(
    env,
    `rpc/${name}`,
    { method: 'POST', body },
    fetchImpl,
  );
  return Array.isArray(result) ? result[0] : result;
}

export async function claimNewsletterGeneration(env, claim, fetchImpl = fetch) {
  return generationRpc(env, 'newsletter_claim_generation', {
    p_cadence: claim.cadence,
    p_period_start: claim.periodStart,
    p_period_end: claim.periodEnd,
    p_lease_seconds: 900,
  }, fetchImpl);
}

export async function prepareNewsletterGeneration(env, claim, draft, fetchImpl = fetch) {
  return generationRpc(env, 'newsletter_prepare_generation', {
    p_issue_id: claim.issueId,
    p_owner: claim.ownerToken,
    p_draft: draft,
    p_items: draft.items ?? [],
  }, fetchImpl);
}

export async function markNewsletterCampaignAttempt(env, claim, fetchImpl = fetch) {
  await generationRpc(env, 'newsletter_mark_campaign_attempt', {
    p_issue_id: claim.issueId,
    p_owner: claim.ownerToken,
  }, fetchImpl);
}

export async function releaseNewsletterCampaignRecovery(env, claim, error, fetchImpl = fetch) {
  await generationRpc(env, 'newsletter_release_campaign_recovery', {
    p_issue_id: claim.issueId,
    p_owner: claim.ownerToken,
    p_error: error instanceof Error ? error.message : String(error),
  }, fetchImpl);
}

export async function completeNewsletterGeneration(env, claim, campaign, fetchImpl = fetch) {
  return generationRpc(env, 'newsletter_complete_generation', {
    p_issue_id: claim.issueId,
    p_owner: claim.ownerToken,
    p_campaign_id: campaign.ok ? campaign.campaignId ?? null : null,
    p_campaign_status: campaign.ok ? campaign.status ?? 'draft' : null,
  }, fetchImpl);
}

export async function createNewsletterIssue(env, draft, fetchImpl = fetch) {
  return generationRpc(env, 'newsletter_create_issue_with_items', {
    p_draft: draft,
    p_items: draft.items ?? [],
  }, fetchImpl);
}

export async function sendResendNotification(env, message, fetchImpl = fetch) {
  const apiKey = envValue(env, 'RESEND_API_KEY');
  const from = envValue(env, 'NEWSLETTER_FROM_EMAIL');
  const to = envValue(env, 'NEWSLETTER_OWNER_EMAIL');
  if (!apiKey || !from || !to) return { ok: false, skipped: true, reason: 'resend_not_configured' };

  const outbound = await newsletterFetch(fetchImpl, 'https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'workflow', value: 'longmontai-newsletter' }],
    }),
    signal: message.signal,
  }, NEWSLETTER_OUTBOUND_LIMITS.resend);
  const data = await providerJson(outbound.response, {
    signal: outbound.signal,
    maxBytes: NEWSLETTER_OUTBOUND_LIMITS.resend.maxBytes,
  });
  if (!outbound.response.ok) {
    throw new NewsletterError('Resend notification failed.', {
      status: 502,
      code: 'resend_request_failed',
    });
  }
  return { ok: true, data };
}
