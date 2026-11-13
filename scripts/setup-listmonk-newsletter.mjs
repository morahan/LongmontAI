#!/usr/bin/env node
import {
  LONGMONTAI_LIST_TAG,
  NEWSLETTER_OUTBOUND_LIMITS,
  listmonkConfig,
  newsletterFetch,
  readBoundedResponseJson,
} from './lib/newsletter/shared.mjs';

const config = listmonkConfig(process.env);
const listName = process.env.LISTMONK_NEWSLETTER_LIST_NAME || 'LongmontAI AI Briefing';

if (!config?.baseUrl || !config.username || !config.token) {
  console.error('Set LISTMONK_BASE_URL, LISTMONK_API_USERNAME, and LISTMONK_API_TOKEN before running this setup script.');
  process.exit(2);
}

const auth = { Authorization: `token ${config.username}:${config.token}` };

async function listmonk(pathname, options = {}) {
  const outbound = await newsletterFetch(fetch, `${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...auth,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  }, NEWSLETTER_OUTBOUND_LIMITS.setup);
  const data = await readBoundedResponseJson(outbound.response, {
    maxBytes: NEWSLETTER_OUTBOUND_LIMITS.setup.maxBytes,
    signal: outbound.signal,
  });
  if (!outbound.response.ok) throw new Error(`Listmonk setup request failed with HTTP ${outbound.response.status}.`);
  return data;
}

async function ensureList(lists, name, cadence) {
  const match = lists.find((list) => list.name === name);
  const list = match ?? (await listmonk('/api/lists', {
    method: 'POST',
    body: JSON.stringify({
      name,
      type: 'public',
      optin: 'double',
      status: 'active',
      tags: [LONGMONTAI_LIST_TAG, 'ai-briefing', cadence],
      description: `${cadence === 'weekly' ? 'Weekly' : 'Bi-weekly'} LongmontAI AI developments briefing.`,
    }),
  })).data;
  return { list, created: !match };
}

// The edition email is a complete HTML document, so its campaign template must
// add nothing around the campaign body.
const PASS_THROUGH_TEMPLATE = { name: 'LongmontAI pass-through', type: 'campaign', body: '{{ template "content" . }}' };

async function ensurePassThroughTemplate() {
  const templates = (await listmonk('/api/templates'))?.data ?? [];
  const match = templates.find((template) => template.name === PASS_THROUGH_TEMPLATE.name);
  if (match && typeof match.body === 'string' && match.body.trim() !== PASS_THROUGH_TEMPLATE.body) {
    throw new Error(`Listmonk template "${PASS_THROUGH_TEMPLATE.name}" exists with a different body. Restore it or delete it, then rerun.`);
  }
  const template = match ?? (await listmonk('/api/templates', {
    method: 'POST',
    body: JSON.stringify(PASS_THROUGH_TEMPLATE),
  })).data;
  return { template, created: !match };
}

const existing = await listmonk('/api/lists?page=1&per_page=all');
const lists = existing?.data?.results ?? existing?.data ?? [];
const weekly = await ensureList(lists, `${listName} Weekly`, 'weekly');
const biweekly = await ensureList(lists, `${listName} Bi-weekly`, 'biweekly');
const passThrough = await ensurePassThroughTemplate();

console.log(JSON.stringify({
  ok: true,
  lists: {
    weekly: {
      created: weekly.created,
      id: weekly.list.id,
      uuid: weekly.list.uuid,
      name: weekly.list.name,
      optin: weekly.list.optin,
    },
    biweekly: {
      created: biweekly.created,
      id: biweekly.list.id,
      uuid: biweekly.list.uuid,
      name: biweekly.list.name,
      optin: biweekly.list.optin,
    },
  },
  template: {
    created: passThrough.created,
    id: passThrough.template.id,
    name: passThrough.template.name,
  },
  nextEnv: {
    LISTMONK_WEEKLY_LIST_ID: String(weekly.list.id),
    LISTMONK_WEEKLY_LIST_UUID: weekly.list.uuid,
    LISTMONK_BIWEEKLY_LIST_ID: String(biweekly.list.id),
    LISTMONK_BIWEEKLY_LIST_UUID: biweekly.list.uuid,
    LISTMONK_EDITION_TEMPLATE_ID: String(passThrough.template.id),
  },
}, null, 2));
