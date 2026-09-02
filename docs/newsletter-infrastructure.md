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

Configure Listmonk SMTP with Resend:

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: RESEND_API_KEY
From: LongmontAI <news@longmontai.com>
```

Then create the double-opt-in public list with the CLI helper:

```bash
LISTMONK_BASE_URL=https://newsletter.longmontai.com \
LISTMONK_API_USERNAME=<api-user> \
LISTMONK_API_TOKEN=<api-token> \
npm run newsletter:setup-listmonk
```

Save the returned cadence-specific list IDs and UUIDs. The signup endpoint routes weekly subscribers to `LISTMONK_WEEKLY_LIST_UUID` and bi-weekly subscribers to `LISTMONK_BIWEEKLY_LIST_UUID`. The older `LISTMONK_NEWSLETTER_LIST_ID` / `LISTMONK_NEWSLETTER_LIST_UUID` names are still supported as a fallback single-list setup.

### Resend

Verify the sending domain in Resend and create an API key. Resend does not need a separate sender identity once the domain is verified; Listmonk sends through Resend SMTP using that API key.

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
