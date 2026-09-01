#!/usr/bin/env node
import { createListmonkCampaign, createNewsletterIssue } from './lib/newsletter/shared.mjs';
import { createCuratedNewsletterDraft } from './lib/newsletter/curation.mjs';

const args = new Set(process.argv.slice(2));
const cadenceArg = process.argv.find((arg) => arg.startsWith('--cadence='))?.split('=')[1];
const cadence = cadenceArg === 'biweekly' ? 'biweekly' : 'weekly';
const dryRun = args.has('--dry-run');

const draft = await createCuratedNewsletterDraft({
  env: process.env,
  cadence,
  now: new Date(),
});

let campaign = { ok: false, skipped: true, reason: 'dry_run' };
let issue = null;

if (!dryRun) {
  campaign = await createListmonkCampaign(process.env, draft);
  issue = await createNewsletterIssue(process.env, {
    ...draft,
    listmonkCampaignId: campaign.ok ? campaign.data?.data?.id : null,
    listmonkCampaignStatus: campaign.ok ? 'draft' : null,
  });
}

console.log(JSON.stringify({
  ok: true,
  dryRun,
  cadence: draft.cadence,
  usedAi: draft.usedAi,
  subject: draft.subject,
  sourceCount: draft.sourceUrls.length,
  itemCount: draft.items.length,
  campaign,
  issueId: issue?.id ?? null,
}, null, 2));
