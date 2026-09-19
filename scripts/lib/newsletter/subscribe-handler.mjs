import {
  NewsletterError,
  enforceNewsletterSignupRateLimit,
  headerValue,
  isValidEmail,
  normalizeCadence,
  normalizeEmail,
  patchSubscriber,
  requireAllowedOrigin,
  requireJsonRequest,
  readJsonBody,
  recordNewsletterEvent,
  requireMethod,
  sanitizeText,
  sendJson,
  syncSubscriberToListmonk,
  trustedClientIp,
  upsertSubscriber,
} from './shared.mjs';

function clientMetadata(request, payload) {
  return {
    page: sanitizeText(payload.page, 120) || '/',
    userAgent: sanitizeText(headerValue(request, 'user-agent'), 240),
    referrer: sanitizeText(headerValue(request, 'referer'), 240),
  };
}

export function createNewsletterSubscribeHandler({ env = process.env, fetchImpl = fetch, now = () => new Date() } = {}) {
  return async function newsletterSubscribeHandler(request, response) {
    if (requireMethod(request, response, ['POST'])) return;

    try {
      requireAllowedOrigin(request, env);
      requireJsonRequest(request);
      const payload = await readJsonBody(request);
      const email = normalizeEmail(payload.email);
      if (!isValidEmail(email)) {
        throw new NewsletterError('Enter a valid email address.', { status: 400, code: 'invalid_email' });
      }

      const requestTime = now();
      await enforceNewsletterSignupRateLimit(
        env,
        { ip: trustedClientIp(request), email, now: requestTime },
        fetchImpl,
      );
      if (sanitizeText(payload.company, 120)) {
        return sendJson(response, 202, { ok: true, status: 'accepted' });
      }

      const name = sanitizeText(payload.name, 120) || null;
      const cadence = normalizeCadence(payload.cadence);
      const source = sanitizeText(payload.source, 80) || 'website';
      const subscriber = await upsertSubscriber(
        env,
        {
          email,
          name,
          cadence,
          source,
          consentedAt: requestTime.toISOString(),
          metadata: clientMetadata(request, payload),
        },
        fetchImpl,
      );

      await recordNewsletterEvent(
        env,
        {
          subscriberId: subscriber?.id,
          eventType: 'subscribe',
          provider: 'website',
          payload: { cadence, source },
        },
        fetchImpl,
      );

      let listmonk = { ok: false, skipped: true, reason: 'not_attempted' };
      try {
        listmonk = await syncSubscriberToListmonk(env, { email, name, cadence, source }, fetchImpl);
        await patchSubscriber(
          env,
          subscriber?.id,
          {
            listmonk_subscription_status: listmonk.ok ? listmonk.status : listmonk.reason,
            listmonk_last_synced_at: listmonk.ok ? now().toISOString() : null,
            sync_error: listmonk.ok || listmonk.skipped ? null : listmonk.reason,
          },
          fetchImpl,
        );
        await recordNewsletterEvent(
          env,
          {
            subscriberId: subscriber?.id,
            eventType: 'listmonk_sync',
            provider: 'listmonk',
            payload: listmonk,
          },
          fetchImpl,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await patchSubscriber(env, subscriber?.id, { sync_error: message }, fetchImpl);
        await recordNewsletterEvent(
          env,
          {
            subscriberId: subscriber?.id,
            eventType: 'error',
            provider: 'listmonk',
            payload: { message },
          },
          fetchImpl,
        );
        listmonk = { ok: false, skipped: false, reason: 'sync_failed' };
      }

      return sendJson(response, 202, {
        ok: true,
        status: listmonk.ok ? 'confirmation_pending' : 'captured',
        cadence,
      });
    } catch (error) {
      const status = error instanceof NewsletterError ? error.status : 500;
      const code = error instanceof NewsletterError ? error.code : 'newsletter_subscribe_failed';
      const message = status < 500 && error instanceof Error ? error.message : 'Newsletter signup is temporarily unavailable.';
      const headers = status === 429 && error instanceof NewsletterError
        ? { 'Retry-After': String(error.retryAfter) }
        : {};
      return sendJson(response, status, { ok: false, error: code, message }, headers);
    }
  };
}
