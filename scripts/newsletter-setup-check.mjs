#!/usr/bin/env node
import { listmonkConfig, supabaseRest } from './lib/newsletter/shared.mjs';

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
  } catch (error) {
    record('supabase', false, error instanceof Error ? error.message : String(error));
  }
}

async function checkListmonk() {
  const config = listmonkConfig(process.env);
  if (!config) {
    record('listmonk', false, 'LISTMONK_BASE_URL is not set.');
    return;
  }
  try {
    const response = await fetch(`${config.baseUrl}/api/public/lists`, { headers: { Accept: 'application/json' } });
    record('listmonk', response.ok, response.ok ? 'public list endpoint is reachable.' : `${response.status} ${response.statusText}`);
  } catch (error) {
    record('listmonk', false, error instanceof Error ? error.message : String(error));
  }
}

async function checkResend() {
  if (!process.env.RESEND_API_KEY) {
    record('resend', false, 'RESEND_API_KEY is not set.');
    return;
  }
  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, Accept: 'application/json' },
    });
    record('resend', response.ok, response.ok ? 'Resend domains endpoint is reachable.' : `${response.status} ${response.statusText}`);
  } catch (error) {
    record('resend', false, error instanceof Error ? error.message : String(error));
  }
}

await Promise.all([checkSupabase(), checkListmonk(), checkResend()]);

for (const check of checks) {
  console.log(`${check.ok ? 'ok' : 'missing'} ${check.name}: ${check.detail}`);
}

if (strict && checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
