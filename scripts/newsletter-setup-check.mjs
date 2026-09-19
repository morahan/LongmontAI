#!/usr/bin/env node
import {
  NEWSLETTER_OUTBOUND_LIMITS,
  cancelNewsletterBody,
  listmonkConfig,
  newsletterFetch,
  supabaseRest,
} from './lib/newsletter/shared.mjs';

const strict = process.argv.includes('--strict');
const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

async function checkSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    record('supabase', false, 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    return;
  }
  try {
    await supabaseRest(process.env, 'newsletter_subscribers?select=id&limit=1');
    record('supabase', true, 'newsletter_subscribers is reachable through server credentials.');
  } catch {
    record('supabase', false, 'Supabase newsletter check failed.');
  }
}

async function checkListmonk() {
  const config = listmonkConfig(process.env);
  if (!config) {
    record('listmonk', false, 'LISTMONK_BASE_URL is not set.');
    return;
  }
  try {
    const outbound = await newsletterFetch(fetch, `${config.baseUrl}/api/public/lists`, {
      headers: { Accept: 'application/json' },
    }, NEWSLETTER_OUTBOUND_LIMITS.setup);
    cancelNewsletterBody(outbound.response.body);
    record('listmonk', outbound.response.ok, outbound.response.ok ? 'public list endpoint is reachable.' : `HTTP ${outbound.response.status}`);
  } catch {
    record('listmonk', false, 'Listmonk newsletter check failed.');
  }
}

async function checkResend() {
  if (!process.env.RESEND_API_KEY) {
    record('resend', false, 'RESEND_API_KEY is not set.');
    return;
  }
  try {
    const outbound = await newsletterFetch(fetch, 'https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, Accept: 'application/json' },
    }, NEWSLETTER_OUTBOUND_LIMITS.setup);
    cancelNewsletterBody(outbound.response.body);
    record('resend', outbound.response.ok, outbound.response.ok ? 'Resend domains endpoint is reachable.' : `HTTP ${outbound.response.status}`);
  } catch {
    record('resend', false, 'Resend newsletter check failed.');
  }
}

await Promise.all([checkSupabase(), checkListmonk(), checkResend()]);

for (const check of checks) {
  console.log(`${check.ok ? 'ok' : 'missing'} ${check.name}: ${check.detail}`);
}

if (strict && checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
