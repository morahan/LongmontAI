import {
  NewsletterError,
  canCreateListmonkCampaign,
  claimNewsletterGeneration,
  completeNewsletterGeneration,
  createListmonkCampaign,
  markNewsletterCampaignAttempt,
  newsletterPeriod,
  normalizeCadence,
  prepareNewsletterGeneration,
  recordNewsletterEvent,
  recoverListmonkCampaign,
  releaseNewsletterCampaignRecovery,
  requireCronAuthorization,
  requireMethod,
  sendJson,
  sendResendNotification,
} from './shared.mjs';
import {
  createCuratedNewsletterDraft,
  escapeNewsletterHtml,
  sanitizeNewsletterDraft,
} from './curation.mjs';

function queryValue(request, name) {
  const value = request.query?.[name];
  return typeof value === 'string' ? value : undefined;
}

function campaignFromIssue(issue) {
  if (issue?.listmonk_campaign_id) {
    return {
      ok: true,
      status: issue.listmonk_campaign_status ?? 'draft',
      recovered: true,
      campaignId: issue.listmonk_campaign_id,
      data: { data: { id: issue.listmonk_campaign_id, name: issue.campaign_identity } },
    };
  }
  return { ok: false, skipped: true, reason: 'no_campaign', identity: issue?.campaign_identity };
}

export function createNewsletterGenerateHandler({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  draftImpl = createCuratedNewsletterDraft,
} = {}) {
  return async function newsletterGenerateHandler(request, response) {
    if (requireMethod(request, response, ['GET', 'POST'])) return;

    try {
      requireCronAuthorization(request, env);
      const operationNow = now();
      const cadence = normalizeCadence(queryValue(request, 'cadence') ?? env.NEWSLETTER_DEFAULT_CADENCE);
      const period = newsletterPeriod(cadence, operationNow);
      const claimed = await claimNewsletterGeneration(
        env,
        { cadence, periodStart: period.start, periodEnd: period.end, now: operationNow },
        fetchImpl,
      );

      if (!claimed?.outcome || !claimed.issue_id || !claimed.deterministic_campaign_identity) {
        throw new NewsletterError('Newsletter generation claim failed.', {
          status: 503,
          code: 'newsletter_generation_claim_failed',
        });
      }
      if (claimed.outcome === 'completed') {
        const campaign = campaignFromIssue(claimed.issue);
        return sendJson(response, 200, {
          ok: true,
          existing: true,
          issueId: claimed.issue_id,
          cadence,
          usedAi: Boolean(claimed.issue?.curator_model),
          campaign,
          notification: { ok: false, skipped: true, reason: 'already_completed' },
        });
      }
      if (claimed.outcome === 'in_progress') {
        throw new NewsletterError('Newsletter generation is already in progress.', {
          status: 409,
          code: 'newsletter_generation_in_progress',
        });
      }

      const claim = {
        issueId: claimed.issue_id,
        ownerToken: claimed.owner_token,
        campaignIdentity: claimed.deterministic_campaign_identity,
      };
      let draft;
      let campaign;
      let recoveredCampaign = false;

      if (claimed.outcome === 'recover_campaign') {
        recoveredCampaign = true;
        try {
          campaign = await recoverListmonkCampaign(env, claim.campaignIdentity, fetchImpl);
          if (!campaign.ok) {
            await releaseNewsletterCampaignRecovery(env, claim, new Error(campaign.reason), fetchImpl);
            throw new NewsletterError('Newsletter campaign outcome is still being recovered.', {
              status: 409,
              code: 'newsletter_campaign_recovery_pending',
            });
          }
        } catch (error) {
          if (!(error instanceof NewsletterError && error.code === 'newsletter_campaign_recovery_pending')) {
            await releaseNewsletterCampaignRecovery(env, claim, error, fetchImpl);
          }
          throw error;
        }
        draft = sanitizeNewsletterDraft({
          cadence,
          subject: claimed.issue?.subject,
          preheader: claimed.issue?.preheader,
          summary: claimed.issue?.summary,
          items: [],
          sourceUrls: claimed.issue?.source_urls ?? [],
          curatorModel: claimed.issue?.curator_model,
          usedAi: Boolean(claimed.issue?.curator_model),
        });
      } else if (claimed.outcome === 'claimed') {
        draft = sanitizeNewsletterDraft(await draftImpl({
          env,
          cadence,
          now: operationNow,
          fetchImpl,
        }));
        if (draft.periodStart !== period.start || draft.periodEnd !== period.end) {
          throw new NewsletterError('Newsletter draft period does not match its generation claim.', {
            status: 500,
            code: 'newsletter_generation_period_mismatch',
          });
        }
        await prepareNewsletterGeneration(env, claim, draft, fetchImpl);
        if (env.NEWSLETTER_CREATE_LISTMONK_CAMPAIGN === '0') {
          campaign = { ok: false, skipped: true, reason: 'campaign_disabled' };
        } else if (!canCreateListmonkCampaign(env, cadence)) {
          campaign = await createListmonkCampaign(
            env,
            { ...draft, campaignIdentity: claim.campaignIdentity },
            fetchImpl,
          );
        } else {
          await markNewsletterCampaignAttempt(env, claim, fetchImpl);
          try {
            campaign = await createListmonkCampaign(
              env,
              { ...draft, campaignIdentity: claim.campaignIdentity },
              fetchImpl,
            );
          } catch (error) {
            await releaseNewsletterCampaignRecovery(env, claim, error, fetchImpl);
            throw error;
          }
        }
      } else {
        throw new NewsletterError('Newsletter generation claim returned an unsupported state.', {
          status: 503,
          code: 'newsletter_generation_claim_failed',
        });
      }

      const issue = await completeNewsletterGeneration(env, claim, campaign, fetchImpl);
      await recordNewsletterEvent(
        env,
        {
          eventType: 'draft_generated',
          provider: draft.usedAi ? 'openai' : 'deterministic',
          payload: {
            issueId: issue?.id ?? claim.issueId,
            cadence,
            campaign,
            campaignIdentity: claim.campaignIdentity,
            curatorModel: draft.curatorModel,
          },
        },
        fetchImpl,
      );

      let notification = {
        ok: false,
        skipped: true,
        reason: recoveredCampaign ? 'campaign_recovered' : 'not_attempted',
      };
      if (env.NEWSLETTER_NOTIFY_OWNER === '1' && !recoveredCampaign) {
        notification = await sendResendNotification(
          env,
          {
            subject: `Draft ready: ${draft.subject}`,
            html: `<p>A LongmontAI newsletter draft is ready.</p><p><strong>${escapeNewsletterHtml(draft.subject)}</strong></p>${draft.html}`,
            text: `A LongmontAI newsletter draft is ready.\n\n${draft.subject}\n\n${draft.text}`,
          },
          fetchImpl,
        );
      }

      return sendJson(response, 200, {
        ok: true,
        existing: false,
        issueId: issue?.id ?? claim.issueId,
        cadence,
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
