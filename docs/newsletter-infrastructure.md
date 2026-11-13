# LongmontAI Newsletter Infrastructure

LongmontAI now has the repo-side plumbing for an AI-curated newsletter loop:

- Svelte signup UI embedded in the existing Vite/React site at `/newsletter` and on the home page.
- Vercel API endpoint `/api/newsletter/subscribe` for server-side subscriber capture.
- Supabase migration with RLS-forced newsletter tables and no browser-role table grants.
- Listmonk audience sync through `/api/public/subscription` or admin API credentials.
- Cron-protected `/api/newsletter/generate` for AI-assisted draft generation.
- Resend support as Listmonk SMTP, plus optional owner notifications through the Resend HTTP API.

## Required Services

### Supabase

This repo was initialized with Supabase CLI files, but it is not linked to a LongmontAI Supabase project yet.

Create or link the correct project, then apply the migration:

```bash
supabase projects create longmont-ai --org-id <org-id> --region us-west-2 --db-password '<generated-password>'
supabase link --project-ref <project-ref> --password '<database-password>'
supabase db push
```

If you already created a Supabase project in the dashboard, skip `projects create` and use `supabase link`.

### Listmonk

Listmonk should own subscription preferences, opt-in, unsubscribes, and newsletter campaign state.

LongmontAI uses 1023.Digital's Listmonk server at `https://lists.1023.digital`. It already sends through Resend SMTP (`smtp.resend.com`, user `resend`), so LongmontAI adds no server and no SMTP settings. The 1023.Digital site keeps its own lists on the same server.

Sharing rules:

- **LongmontAI owns only what it creates.** That is the lists tagged `longmontai`, the `LongmontAI pass-through` template, and campaigns named `longmontai-*`. Leave instance-wide settings alone (SMTP, the opt-in email, site name, default from address), because 1023.Digital's newsletter depends on them.
- **Give LongmontAI its own API user.** Create it in Listmonk under Users, so its token can be revoked without touching 1023.Digital.
- **The edition email only sends to tagged lists.** Before it creates or starts a campaign, it reads each target list and refuses (409 `listmonk_list_not_longmontai`) unless the list carries the `longmontai` tag. A mistyped list ID cannot mail 1023.Digital's subscribers.
- **The lists are public.** The signup endpoint uses Listmonk's public double opt-in API, which also adds someone already subscribed to a 1023.Digital list. Public lists also appear on `https://lists.1023.digital/subscription/form`.
- **Branding is shared.** Listmonk's opt-in confirmation email and its unsubscribe and preferences pages use the server's 1023Digital branding. LongmontAI's own campaigns carry LongmontAI branding.

Create the double opt-in public lists and the template with the CLI helper:

```bash
LISTMONK_BASE_URL=https://lists.1023.digital \
LISTMONK_API_USERNAME=<api-user> \
LISTMONK_API_TOKEN=<api-token> \
npm run newsletter:setup-listmonk
```

Save the returned cadence-specific list IDs and UUIDs. The signup endpoint routes weekly subscribers to `LISTMONK_WEEKLY_LIST_UUID` and bi-weekly subscribers to `LISTMONK_BIWEEKLY_LIST_UUID`. The older `LISTMONK_NEWSLETTER_LIST_ID` / `LISTMONK_NEWSLETTER_LIST_UUID` names are still supported as a fallback single-list setup.

### Resend

Listmonk sends through 1023.Digital's Resend account. Add `longmontai.com` to that account as a second sending domain (see DNS for Resend below). Do not rotate or reuse the 1023.Digital site's `RESEND_API_KEY`, because the 1023.Digital project inquiry form sends with it over Resend's HTTP API.

The inquiry form and Listmonk share the account's sending quota and rate limit. A meetup email uses one send per subscriber. Before the list approaches the plan's daily limit, raise the Resend plan, or the inquiry notifications fail that day. Keep Listmonk's message rate (Settings, Performance) under Resend's per-second limit.

## Vercel Environment

Use Vercel CLI to add production secrets:

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add LISTMONK_BASE_URL production
vercel env add LISTMONK_WEEKLY_LIST_UUID production
vercel env add LISTMONK_WEEKLY_LIST_ID production
vercel env add LISTMONK_BIWEEKLY_LIST_UUID production
vercel env add LISTMONK_BIWEEKLY_LIST_ID production
vercel env add LISTMONK_API_USERNAME production
vercel env add LISTMONK_API_TOKEN production
vercel env add RESEND_API_KEY production
vercel env add NEWSLETTER_FROM_EMAIL production
vercel env add NEWSLETTER_ALLOWED_ORIGINS production
vercel env add NEWSLETTER_RATE_LIMIT_SECRET production
vercel env add CRON_SECRET production
vercel env add OPENAI_API_KEY production
```

Optional:

```bash
vercel env add NEWSLETTER_OWNER_EMAIL production
vercel env add NEWSLETTER_NOTIFY_OWNER production
vercel env add NEWSLETTER_CURATOR_MODEL production
```

## Signup security

Production signup requests must include an exact `http` or `https` `Origin` listed in `NEWSLETTER_ALLOWED_ORIGINS`. Missing, `null`, malformed, and foreign origins are rejected. `NEWSLETTER_ALLOW_MISSING_ORIGIN=1` is a local-development-only escape hatch; it defaults off and is ignored when `NODE_ENV=production`.

The endpoint code accepts client identity only from Vercel's platform-owned `x-vercel-forwarded-for` header. It never trusts `x-forwarded-for`, `x-real-ip`, or a configurable/custom header, accepts exactly one valid IP, and fails closed when that identity is unavailable. Set `NEWSLETTER_RATE_LIMIT_SECRET` to an independently generated value of at least 32 bytes. It is used only as an HMAC key; Supabase stores keyed digests, never raw client IPs or emails, in the forced-RLS `newsletter_signup_rate_limits` table.

The database RPC atomically enforces fixed-window limits before subscriber writes or Listmonk calls: five attempts per normalized email per hour and ten attempts per client IP per ten minutes. A denial returns `429`, `Cache-Control: no-store`, and a bounded `Retry-After`. Missing configuration, invalid identity, and database errors fail closed. Apply `20260825090000_newsletter_signup_rate_limit.sql` before enabling the production endpoint. Periodically delete expired counter buckets according to the site's retention policy; the endpoint does not require raw identity data for cleanup.

## Operating Model

The weekly cron runs Mondays at 15:07 UTC. It collects LongmontAI website/article context, Model Watch status, monitored source highlights, and then uses the OpenAI Responses API when `OPENAI_API_KEY` is available. Without that key, it creates a deterministic draft from the same source bundle.

By default the system creates a Listmonk draft campaign, not a live send. Keep review-on-draft as the default until source quality and deliverability are proven.

## Meetup edition email

Subscribers on every configured list get one email at the start of each meetup. It summarizes the edition published that day: an intro, a bullet list of model releases, a bullet list of key news, and a link to the full article.

- **Content.** Each release manifest (`src/articles/drafts/*.release.json`) carries an authored `emailDigest` block with `intro`, `modelReleases` (`name`, `detail`) and `keyNews` (`headline`, `detail`), one to eight entries per list. No model writes the email at send time. `scripts/tests/newsletter-edition-email.test.mjs` fails when the staged edition has no valid digest.
- **Preview.** `just newsletter-preview src/articles/drafts/<edition>.release.json` writes the HTML to `output/edition-email/` and prints the text version. It sends nothing.
- **Trigger.** Vercel cron calls `/api/newsletter/edition-email` at 18:00, 19:00 and 20:00 UTC every day. Noon in Denver is 18:00 UTC in summer and 19:00 UTC in winter. The handler sends only between the manifest's `meetupStartsAt` and 24 hours after it, so the other runs are no-ops or retries.
- **Idempotency.** The campaign is named `longmontai-edition-<editionId>`. Each run looks that name up in Listmonk, creates the campaign if it is absent, and starts it only while it is a draft. A second run cannot mail the list twice.
- **Rehearsal.** `NEWSLETTER_EDITION_EMAIL_MODE=draft` creates the campaign without starting it. Use it for the first meetup, send yourself a test from the Listmonk UI, and trigger the endpoint twice to confirm the second response says `created: false`. Then set the mode to `send`.
- **Dry run.** `curl -H "Authorization: Bearer $CRON_SECRET" "https://longmontai.com/api/newsletter/edition-email?dryRun=1"` returns the phase, subject and list IDs without calling Listmonk.
- **Template.** The email is a complete HTML document. `npm run newsletter:setup-listmonk` creates the `LongmontAI pass-through` template and prints `LISTMONK_EDITION_TEMPLATE_ID`. The weekly drafts keep `LISTMONK_DEFAULT_TEMPLATE_ID`, because they rely on Listmonk's wrapper for their unsubscribe footer.
- **Required env.** `CRON_SECRET`, `LISTMONK_BASE_URL`, `LISTMONK_API_USERNAME`, `LISTMONK_API_TOKEN`, at least one list ID, `LISTMONK_EDITION_TEMPLATE_ID` and `NEWSLETTER_FROM_EMAIL`. A due edition with any of these missing answers 503 with the reason. This path does not use Supabase or OpenAI.
- **Footer.** Set `NEWSLETTER_POSTAL_ADDRESS` to show a mailing address. US bulk-mail rules expect one.

### DNS for Resend

`longmontai.com` DNS is hosted at Squarespace. The root domain already has Mailgun MX and SPF records and a DMARC policy of `p=reject` with strict alignment. Add the records Resend shows for the domain (a DKIM TXT at `resend._domainkey` and MX plus SPF TXT at `send`) and leave the Mailgun records alone. Verify `longmontai.com` itself in 1023.Digital's Resend account, not a subdomain, so the DKIM signature matches the `news@longmontai.com` sender exactly. A mismatch is rejected under the current DMARC policy.

## Provider data disclosures

Outbound payloads are purpose-limited. API keys, service-role keys, Listmonk tokens, cron credentials, request headers, client IPs, and browser metadata are never placed in provider request bodies or newsletter event payloads.

- **OpenAI Responses API:** receives the requested output schema plus a bounded curation projection: cadence and period, recent article title/summary/public URL/source links, aggregate Model Watch health and detected model names, matched live-source highlights, and the three public LongmontAI review surfaces. It does not receive repository paths, collection/provider errors, timestamps and internal metadata, the complete website snapshot, the monitored-source inventory, subscriber data, or credentials.
- **Listmonk subscriber sync:** receives only normalized email, optional display name, and the required cadence list UUID for the public double-opt-in endpoint. The authenticated fallback receives those identity fields, the required list ID, `status: enabled`, and `preconfirm_subscriptions: false` so confirmation is not bypassed. It does not receive signup source, cadence attributes, page/client metadata, IP addresses, or internal subscriber records. Draft campaign creation separately receives the reviewed newsletter subject, HTML/plain-text bodies, sending identity, selected list ID, and required campaign settings.
- **Resend HTTP owner notice:** receives the configured sender and owner routing addresses, a workflow tag, issue ID, a short HTML-escaped summary, and the fixed first-party review pointer `https://longmontai.com/newsletter`. It does not receive the complete newsletter HTML/text, item inventory, source snapshot, campaign identity, subscriber data, or credentials. Listmonk's separately configured Resend SMTP transport receives campaign mail only when an operator later sends an approved draft.
- **Supabase:** stores subscriber consent and newsletter workflow records under the migration's forced-RLS/service-role controls. Delivery-event JSON is limited to operational status identifiers and does not duplicate credentials or subscriber profile metadata.

## Verification

The newsletter contract suite deliberately includes migrated-Postgres concurrency and privilege checks. Docker Desktop and the local Supabase stack are required; unavailable infrastructure is a test failure rather than a skip. Reset the disposable local database before running it:

```bash
supabase start
supabase db reset --local --no-seed
npm run test:newsletter
npm run newsletter:draft -- --dry-run
npm run build
npm run newsletter:check -- --strict
```

`newsletter:check -- --strict` requires live production secrets and should fail until Supabase, Listmonk, and Resend are all configured.
