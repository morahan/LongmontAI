#!/usr/bin/env node
import { listmonkConfig } from './lib/newsletter/shared.mjs';

const config = listmonkConfig(process.env);
const listName = process.env.LISTMONK_NEWSLETTER_LIST_NAME || 'LongmontAI AI Briefing';

if (!config?.baseUrl || !config.username || !config.token) {
  console.error('Set LISTMONK_BASE_URL, LISTMONK_API_USERNAME, and LISTMONK_API_TOKEN before running this setup script.');
  process.exit(2);
}

const auth = { Authorization: `token ${config.username}:${config.token}` };

async function listmonk(pathname, options = {}) {
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...auth,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
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
      tags: ['longmontai', 'ai-briefing', cadence],
      description: `${cadence === 'weekly' ? 'Weekly' : 'Bi-weekly'} LongmontAI AI developments briefing.`,
    }),
  })).data;
  return { list, created: !match };
}

const existing = await listmonk('/api/lists?page=1&per_page=all');
const lists = existing?.data?.results ?? existing?.data ?? [];
const weekly = await ensureList(lists, `${listName} Weekly`, 'weekly');
const biweekly = await ensureList(lists, `${listName} Bi-weekly`, 'biweekly');

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
  nextEnv: {
    LISTMONK_WEEKLY_LIST_ID: String(weekly.list.id),
    LISTMONK_WEEKLY_LIST_UUID: weekly.list.uuid,
    LISTMONK_BIWEEKLY_LIST_ID: String(biweekly.list.id),
    LISTMONK_BIWEEKLY_LIST_UUID: biweekly.list.uuid,
  },
}, null, 2));
