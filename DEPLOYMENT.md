# Vercel Deployment Guide

## Automatic Deployment Setup

This project is configured to automatically deploy to Vercel on every push to the `main` branch.

### Initial Setup

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

2. **Import Your Repository**
   - Click "Add New Project" in Vercel dashboard
   - Select "Import Git Repository"
   - Choose `morahan/LongmontAI`
   - Vercel will automatically detect the Vite configuration

3. **Configure Project Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Deploy**
   - Click "Deploy"
   - Wait for the initial build to complete
   - Your site will be live at `https://longmontai.vercel.app` (or similar)

### Scheduled edition predeployment

An approved scheduled edition is packaged into the Vercel Functions before its
publication time. Server request time is the unlock clock; no cron, browser,
or author machine mutates the release at the boundary. Before deploying, run:

```bash
npm run release:check
npm run verify:local
```

Local preparation or staging is **not** deployment. `blog-update` reports
`production: unverified` even after successful `--stage`; a passed deadline on
a local active package does not prove publication. Use `docs/blog-editor.md`
for guarded rollover and the separate reviewed static-publication path for an
overdue draft. Retained registered published drafts are local historical content,
not automatically new overdue releases. Recipe state reports require the current
11:50 Denver policy: historical 11:30 exceptions (including Sep 2) fail recipe
inspection rather than receiving a classification. Preserve their original
identity/time and use `release:check` for active-package integrity.

Scheduling is complete only after required checks and reviewed shipping succeed
and the production client's locator and `publishAt` match the intended edition.
A PR preview or a successful local `release:check` is not that receipt. Before
the deadline, inspect the deployed public client locator, not private article
content (the scheduled API intentionally returns a generic 404). At/after the
deadline, verify the intended article identity and actual media bytes/types;
SPA fallback HTML with HTTP 200 is not a valid article or deck verification.
For overdue static publication, verify the registered article and assets rather
than requiring the scheduled API pointer to move to that historical edition.

There is no edition delivery monitor or independent heartbeat in this repair.
Manual production verification is still required; automated readiness/deadline
monitoring is deferred. GitHub account/billing failures can prevent required
checks from starting; account recovery and successful checks remain external
prerequisites, never grounds to bypass the reviewed publication path.

Embargo responses are generic non-cacheable 404s. Released JSON has at most 60
seconds of shared freshness, while allowlisted media is immutable under an
edition-and-revision URL. Only `src/generated/scheduled-release/**` is included
as private function data. A failed or unavailable required scanner blocks the
normal commit/push workflow; never bypass hooks.

### Automatic Deployments

Once connected, Vercel will automatically:
- ✅ Deploy every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Show deployment status in GitHub

### Custom Domain (Optional)

To use a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Update your DNS settings as instructed

## Current Deployment

Your site will be available at:
- Production: `https://longmontai.vercel.app`
- Every push will trigger a new deployment

## Troubleshooting

If deployment fails:
1. Check the build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify the build works locally: `npm run build`
