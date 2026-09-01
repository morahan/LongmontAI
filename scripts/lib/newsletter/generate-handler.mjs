import {
  NewsletterError,
  createListmonkCampaign,
  createNewsletterIssue,
  recordNewsletterEvent,
  requireCronAuthorization,
  requireMethod,
  sendJson,
  sendResendNotification,
} from './shared.mjs';
import { createCuratedNewsletterDraft } from './curation.mjs';

function queryValue(request, name) {
  const value = request.query?.[name];
  return typeof value === 'string' ? value : undefined;
}

export function createNewsletterGenerateHandler({ env = process.env, fetchImpl = fetch, now = () => new Date() } = {}) {
  return async function newsletterGenerateHandler(request, response) {
    if (requireMethod(request, response, ['GET', 'POST'])) return;

    try {
      requireCronAuthorization(request, env);
      const cadence = queryValue(request, 'cadence') === 'biweekly' ? 'biweekly' : (env.NEWSLETTER_DEFAULT_CADENCE || 'weekly');
      const draft = await createCuratedNewsletterDraft({
        env,
        cadence,
        now: now(),
        fetchImpl,
      });

      let campaign = { ok: false, skipped: true, reason: 'not_attempted' };
      if (env.NEWSLETTER_CREATE_LISTMONK_CAMPAIGN !== '0') {
        campaign = await createListmonkCampaign(env, draft, fetchImpl);
      }

      const issue = await createNewsletterIssue(
        env,
        {
          ...draft,
          listmonkCampaignId: campaign.ok ? campaign.data?.data?.id : null,
          listmonkCampaignStatus: campaign.ok ? 'draft' : null,
        },
        fetchImpl,
      );

      await recordNewsletterEvent(
        env,
        {
          eventType: 'draft_generated',
          provider: draft.usedAi ? 'openai' : 'deterministic',
          payload: {
            issueId: issue?.id,
            cadence: draft.cadence,
            campaign,
            curatorModel: draft.curatorModel,
          },
        },
        fetchImpl,
      );

      let notification = { ok: false, skipped: true, reason: 'not_attempted' };
      if (env.NEWSLETTER_NOTIFY_OWNER === '1') {
        notification = await sendResendNotification(
          env,
          {
            subject: `Draft ready: ${draft.subject}`,
            html: `<p>A LongmontAI newsletter draft is ready.</p><p><strong>${draft.subject}</strong></p>${draft.html}`,
            text: `A LongmontAI newsletter draft is ready.\n\n${draft.subject}\n\n${draft.text}`,
          },
          fetchImpl,
        );
      }

      return sendJson(response, 200, {
        ok: true,
        issueId: issue?.id,
        cadence: draft.cadence,
        usedAi: draft.usedAi,
        campaign,
        notification,
      });
    } catch (error) {
      const status = error instanceof NewsletterError ? error.status : 500;
      const code = error instanceof NewsletterError ? error.code : 'newsletter_generate_failed';
      const message = status < 500 && error instanceof Error ? error.message : 'Newsletter generation failed.';
      return sendJson(response, status, { ok: false, error: code, message });
    }
  };
}
