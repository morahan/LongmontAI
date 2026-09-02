import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export const CADENCES = new Set(['weekly', 'biweekly']);
export const DEFAULT_CADENCE = 'weekly';

export class NewsletterError extends Error {
  constructor(message, { status = 500, code = 'newsletter_error', cause, retryAfter } = {}) {
    super(message, { cause });
    this.name = 'NewsletterError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
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
  } catch (error) {
    throw new NewsletterError('Newsletter signup is temporarily unavailable.', {
      status: 503,
      code: 'rate_limit_unavailable',
      cause: error,
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

export async function supabaseRest(env, path, { method = 'GET', body, headers = {} } = {}, fetchImpl = fetch) {
  const { url, serviceRoleKey } = supabaseConfig(env);
  const response = await fetchImpl(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new NewsletterError('Supabase request failed.', {
      status: response.status >= 400 && response.status < 500 ? 502 : response.status,
      code: 'supabase_request_failed',
      cause: new Error(typeof data?.message === 'string' ? data.message : text),
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

export async function recordNewsletterEvent(env, event, fetchImpl = fetch) {
  const rows = await supabaseRest(
    env,
    'newsletter_delivery_events',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: {
        subscriber_id: event.subscriberId ?? null,
        event_type: event.eventType,
        provider: event.provider ?? null,
        provider_event_id: event.providerEventId ?? null,
        payload: event.payload ?? {},
      },
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

function listmonkAuthHeaders(config) {
  if (!config.username || !config.token) return {};
  return {
    Authorization: `token ${config.username}:${config.token}`,
  };
}

async function providerJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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
      name: subscriber.name || subscriber.email,
      status: 'enabled',
      lists: [list.id],
      preconfirm_subscriptions: false,
      attribs: {
        cadence: subscriber.cadence,
        source: subscriber.source,
      },
    };
  } else {
    return { ok: false, skipped: true, reason: 'listmonk_list_not_configured' };
  }

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await providerJson(response);

  if (!response.ok) {
    const detail = JSON.stringify(data ?? {});
    if (response.status === 409 || /already|duplicate|exists/i.test(detail)) {
      return { ok: true, status: 'already-subscribed', data };
    }
    throw new NewsletterError('Listmonk subscription failed.', {
      status: 502,
      code: 'listmonk_request_failed',
      cause: new Error(detail),
    });
  }

  return { ok: true, status: 'submitted', data };
}

export async function createListmonkCampaign(env, draft, fetchImpl = fetch) {
  const config = listmonkConfig(env);
  const list = config ? listmonkListForCadence(config, draft.cadence) : null;
  if (!config?.username || !config?.token || !Number.isInteger(list?.id) || list.id <= 0) {
    return { ok: false, skipped: true, reason: 'listmonk_campaign_not_configured' };
  }
  const fromEmail = envValue(env, 'NEWSLETTER_FROM_EMAIL');
  const body = {
    name: draft.name,
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
  const response = await fetchImpl(`${config.baseUrl}/api/campaigns`, {
    method: 'POST',
    headers: {
      ...listmonkAuthHeaders(config),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await providerJson(response);
  if (!response.ok) {
    throw new NewsletterError('Listmonk campaign creation failed.', {
      status: 502,
      code: 'listmonk_campaign_failed',
      cause: new Error(JSON.stringify(data ?? {})),
    });
  }
  return { ok: true, status: 'draft', data };
}

export async function createNewsletterIssue(env, draft, fetchImpl = fetch) {
  const issueRows = await supabaseRest(
    env,
    'newsletter_issues',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: {
        cadence: draft.cadence,
        period_start: draft.periodStart,
        period_end: draft.periodEnd,
        status: draft.status ?? 'draft',
        subject: draft.subject,
        preheader: draft.preheader,
        summary: draft.summary,
        html_body: draft.html,
        text_body: draft.text,
        curator_model: draft.curatorModel ?? null,
        website_snapshot: draft.websiteSnapshot ?? {},
        source_urls: draft.sourceUrls ?? [],
        listmonk_campaign_id: draft.listmonkCampaignId ?? null,
        listmonk_campaign_status: draft.listmonkCampaignStatus ?? null,
      },
    },
    fetchImpl,
  );
  const issue = Array.isArray(issueRows) ? issueRows[0] : issueRows;
  if (issue?.id && Array.isArray(draft.items) && draft.items.length > 0) {
    await supabaseRest(
      env,
      'newsletter_issue_items',
      {
        method: 'POST',
        body: draft.items.map((item, index) => ({
          issue_id: issue.id,
          category: item.category,
          title: item.title,
          source_name: item.sourceName ?? null,
          source_url: item.sourceUrl ?? null,
          synthesis: item.synthesis,
          score: item.score ?? 50,
          sort_order: item.sortOrder ?? index,
          metadata: item.metadata ?? {},
        })),
      },
      fetchImpl,
    );
  }
  return issue;
}

export async function sendResendNotification(env, message, fetchImpl = fetch) {
  const apiKey = envValue(env, 'RESEND_API_KEY');
  const from = envValue(env, 'NEWSLETTER_FROM_EMAIL');
  const to = envValue(env, 'NEWSLETTER_OWNER_EMAIL');
  if (!apiKey || !from || !to) return { ok: false, skipped: true, reason: 'resend_not_configured' };

  const response = await fetchImpl('https://api.resend.com/emails', {
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
  });
  const data = await providerJson(response);
  if (!response.ok) {
    throw new NewsletterError('Resend notification failed.', {
      status: 502,
      code: 'resend_request_failed',
      cause: new Error(JSON.stringify(data ?? {})),
    });
  }
  return { ok: true, data };
}
