import {
  NewsletterError,
  listmonkEditionListIds,
  requireCronAuthorization,
  requireMethod,
  sendJson,
  sendListmonkEditionCampaign,
} from './shared.mjs';
import {
  editionEmailPhase,
  parseEditionDigest,
  renderEditionEmail,
} from './edition-email.mjs';

function queryValue(request, name) {
  const value = request.query?.[name];
  return typeof value === 'string' ? value : undefined;
}

export function createEditionEmailHandler({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  loadEdition,
} = {}) {
  return async function editionEmailHandler(request, response) {
    if (requireMethod(request, response, ['GET', 'POST'])) return;

    try {
      requireCronAuthorization(request, env);
      const { release, manifest, article } = await loadEdition();
      const { digest, meetupStartsAtMs } = parseEditionDigest(manifest);
      const phase = editionEmailPhase({ meetupStartsAtMs, nowMs: now().getTime() });
      const dryRun = queryValue(request, 'dryRun') === '1';
      if (phase !== 'due' && !dryRun) {
        return sendJson(response, 200, { ok: true, skipped: true, reason: phase });
      }

      const email = renderEditionEmail({
        edition: article,
        digest,
        postalAddress: env.NEWSLETTER_POSTAL_ADDRESS,
      });
      if (dryRun) {
        return sendJson(response, 200, {
          ok: true,
          phase,
          subject: email.subject,
          lists: listmonkEditionListIds(env),
        });
      }

      const campaign = await sendListmonkEditionCampaign(
        env,
        {
          identity: `longmontai-edition-${release.editionId}`,
          subject: email.subject,
          html: email.html,
          text: email.text,
          mode: env.NEWSLETTER_EDITION_EMAIL_MODE === 'draft' ? 'draft' : 'send',
        },
        fetchImpl,
      );
      if (!campaign.ok) {
        return sendJson(response, 503, {
          ok: false,
          error: campaign.reason,
          message: 'Edition email delivery is not configured.',
        });
      }
      return sendJson(response, 200, { ok: true, editionId: release.editionId, phase, campaign });
    } catch (error) {
      const status = error instanceof NewsletterError ? error.status : 500;
      const code = error instanceof NewsletterError ? error.code : 'edition_email_failed';
      // Digest errors name the offending manifest field and carry no provider
      // text, so the cron log may show them even though they are 500s.
      const describable = error instanceof NewsletterError && (status < 500 || code.startsWith('edition_'));
      const message = describable ? error.message : 'Edition email failed.';
      return sendJson(response, status, { ok: false, error: code, message });
    }
  };
}
