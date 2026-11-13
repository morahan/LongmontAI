import assert from 'node:assert/strict';
import test from 'node:test';

import { loadStagedEdition } from '../../api/newsletter/edition-email.mjs';
import {
  editionEmailPhase,
  parseEditionDigest,
  renderEditionEmail,
} from '../lib/newsletter/edition-email.mjs';
import { createEditionEmailHandler } from '../lib/newsletter/edition-email-handler.mjs';

const MEETUP_STARTS_AT = '2026-11-11T12:00:00-07:00';
const START_MS = Date.parse(MEETUP_STARTS_AT);
const HOUR_MS = 60 * 60 * 1000;
const EDITION_ID = 'edition-2026-11-11-test';
const IDENTITY = `longmontai-edition-${EDITION_ID}`;
const BASE_URL = 'https://listmonk.example';

function manifest(overrides = {}) {
  return {
    editionId: EDITION_ID,
    meetupStartsAt: MEETUP_STARTS_AT,
    emailDigest: {
      intro: 'Promises kept versus promises pending.',
      modelReleases: [{ name: 'Model One', detail: 'Shipped to everyone.' }],
      keyNews: [{ headline: 'Rules pending', detail: 'Still being finished.' }],
    },
    ...overrides,
  };
}

function withDigest(patch) {
  const base = manifest();
  return { ...base, emailDigest: { ...base.emailDigest, ...patch } };
}

function digestError(candidate) {
  try {
    parseEditionDigest(candidate);
  } catch (error) {
    return { name: error.name, status: error.status, code: error.code };
  }
  return null;
}

const INVALID = { name: 'NewsletterError', status: 500, code: 'edition_digest_invalid' };

test('a valid digest is normalized and keeps the meetup start', () => {
  const parsed = parseEditionDigest(withDigest({
    intro: '  Promises\n kept.  ',
    modelReleases: [{ name: 'Model\tOne', detail: ' Shipped. ', note: 'ignored' }],
  }));
  assert.deepEqual(parsed, {
    digest: {
      intro: 'Promises kept.',
      modelReleases: [{ name: 'Model One', detail: 'Shipped.' }],
      keyNews: [{ headline: 'Rules pending', detail: 'Still being finished.' }],
    },
    meetupStartsAt: MEETUP_STARTS_AT,
    meetupStartsAtMs: START_MS,
  });
});

test('a manifest without a digest block is reported as missing', () => {
  const { emailDigest: _omitted, ...bare } = manifest();
  assert.deepEqual(digestError(bare), { ...INVALID, code: 'edition_digest_missing' });
});

test('digest bounds reject instead of truncating', () => {
  const entry = { name: 'Model', detail: 'Detail.' };
  const news = { headline: 'Headline', detail: 'Detail.' };
  const rejected = {
    'intro over 400': withDigest({ intro: 'a'.repeat(401) }),
    'empty intro': withDigest({ intro: '   ' }),
    'non-string intro': withDigest({ intro: 42 }),
    'control character': withDigest({ intro: 'bad\u0000text' }),
    'no model releases': withDigest({ modelReleases: [] }),
    'nine model releases': withDigest({ modelReleases: Array(9).fill(entry) }),
    'name over 80': withDigest({ modelReleases: [{ ...entry, name: 'n'.repeat(81) }] }),
    'detail over 240': withDigest({ modelReleases: [{ ...entry, detail: 'd'.repeat(241) }] }),
    'key news not a list': withDigest({ keyNews: news }),
    'headline over 100': withDigest({ keyNews: [{ ...news, headline: 'h'.repeat(101) }] }),
    'entry not an object': withDigest({ keyNews: ['Headline'] }),
    'digest not an object': manifest({ emailDigest: 'summary' }),
    'meetup start without an offset': manifest({ meetupStartsAt: '2026-11-11T12:00:00' }),
    'meetup start missing': manifest({ meetupStartsAt: undefined }),
    'meetup start unparseable': manifest({ meetupStartsAt: '2026-13-45T12:00:00-07:00' }),
  };
  for (const [label, candidate] of Object.entries(rejected)) {
    assert.deepEqual(digestError(candidate), INVALID, label);
  }
  const atBounds = parseEditionDigest(withDigest({
    intro: 'a'.repeat(400),
    modelReleases: Array(8).fill({ name: 'n'.repeat(80), detail: 'd'.repeat(240) }),
    keyNews: [{ headline: 'h'.repeat(100), detail: 'd'.repeat(240) }],
  }));
  assert.equal(atBounds.digest.modelReleases.length, 8);
});

test('the email is due from the meetup start until 24 hours later', () => {
  const phase = (offsetMs) => editionEmailPhase({ meetupStartsAtMs: START_MS, nowMs: START_MS + offsetMs });
  assert.equal(phase(-1), 'not_due');
  assert.equal(phase(0), 'due');
  assert.equal(phase(24 * HOUR_MS - 1), 'due');
  assert.equal(phase(24 * HOUR_MS), 'expired');
});

test('the rendered email carries both lists, the article link, and the sign-off', () => {
  const { digest } = parseEditionDigest(manifest());
  const email = renderEditionEmail({
    edition: { id: EDITION_ID, title: 'Promised weights', date: '2026-11-11' },
    digest,
    postalAddress: 'PO Box 1, Longmont, CO 80501',
  });
  const articleUrl = `https://longmontai.com/edition/${EDITION_ID}`;
  const closing = 'Cultivated by Michael Morahan and polished with Superintelligence.';

  assert.equal(email.subject, 'Longmont AI meetup edition: Promised weights');
  assert.equal(email.preheader, 'Promises kept versus promises pending.');
  for (const expected of [
    'MEETUP EDITION · November 11, 2026',
    'Model releases',
    '<strong style="color:#FFFFFF;font-weight:700;">Model One</strong>',
    'Shipped to everyone.',
    'Key news',
    'Rules pending',
    'Still being finished.',
    `<a href="${articleUrl}"`,
    'Read the full article',
    `>${articleUrl}</a>`,
    closing,
    '<a href="{{ UnsubscribeURL }}"',
    'https://www.meetup.com/longmontai',
    'PO Box 1, Longmont, CO 80501',
  ]) {
    assert.ok(email.html.includes(expected), `html is missing ${expected}`);
  }
  assert.equal(email.html.match(/<ul /g).length, 2);
  assert.ok(email.html.indexOf(closing) > email.html.lastIndexOf(articleUrl));

  for (const expected of [
    '- Model One: Shipped to everyone.',
    '- Rules pending: Still being finished.',
    articleUrl,
    closing,
    'Unsubscribe: {{ UnsubscribeURL }}',
  ]) {
    assert.ok(email.text.includes(expected), `text is missing ${expected}`);
  }
});

test('authored text cannot inject markup or Listmonk template actions', () => {
  const { digest } = parseEditionDigest(withDigest({
    intro: 'Tom & Jerry <script>alert(1)</script> {{ .Subscriber.Email }}',
    keyNews: [{ headline: '{{ template "x" }}', detail: 'a < b' }],
  }));
  const email = renderEditionEmail({
    edition: { id: EDITION_ID, title: 'Weights <b> & {{ TrackView }}', date: '2026-01-05' },
    digest,
    postalAddress: '{{ L.T }} <i>',
  });

  assert.ok(email.html.includes('Tom &amp; Jerry &lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(email.html.includes('a &lt; b'));
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<b>'));
  assert.ok(!email.html.includes('<i>'));
  for (const rendered of [email.html, email.text, email.subject]) {
    assert.deepEqual(rendered.match(/\{\{[^}]*\}\}/g) ?? [], rendered === email.subject ? [] : ['{{ UnsubscribeURL }}']);
  }
  assert.ok(email.html.includes('January 5, 2026'));
  assert.ok(!email.html.includes('PO Box'));
});

function listmonkEnv(overrides = {}) {
  return {
    CRON_SECRET: 'cron-secret',
    LISTMONK_BASE_URL: BASE_URL,
    LISTMONK_API_USERNAME: 'api',
    LISTMONK_API_TOKEN: 'token',
    LISTMONK_WEEKLY_LIST_ID: '3',
    LISTMONK_BIWEEKLY_LIST_ID: '4',
    LISTMONK_NEWSLETTER_LIST_ID: '3',
    LISTMONK_EDITION_TEMPLATE_ID: '9',
    NEWSLETTER_FROM_EMAIL: 'LongmontAI <news@longmontai.com>',
    RESEND_API_KEY: 'resend-key',
    ...overrides,
  };
}

const LONGMONTAI_LISTS = {
  3: { tags: ['longmontai'], subscriber_statuses: { confirmed: 30, unconfirmed: 4 } },
  4: { tags: ['longmontai'], subscriber_statuses: { confirmed: 10 } },
};

// A minimal Listmonk, plus Resend's usage endpoint. Campaigns live in memory so
// a second run sees what the first one left behind.
function fakeListmonk(campaigns = [], lists = LONGMONTAI_LISTS, usage = { daily: { used: 5, limit: 100 }, monthly: { used: 200, limit: 3000 } }) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const { host, pathname, searchParams } = new URL(url);
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ method, pathname, body, authorization: options.headers?.Authorization });
    if (host === 'api.resend.com' && pathname === '/usage') {
      return Response.json({ object: 'usage', emails: usage });
    }
    if (method === 'GET' && pathname === '/api/campaigns') {
      const query = searchParams.get('query');
      return Response.json({ data: { results: campaigns.filter((campaign) => campaign.name.includes(query)) } });
    }
    if (method === 'POST' && pathname === '/api/campaigns') {
      const campaign = { id: campaigns.length + 41, status: 'draft', ...body };
      campaigns.push(campaign);
      return Response.json({ data: campaign });
    }
    const listMatch = /^\/api\/lists\/(\d+)$/.exec(pathname);
    if (method === 'GET' && listMatch && lists[listMatch[1]]) {
      return Response.json({ data: { id: Number(listMatch[1]), ...lists[listMatch[1]] } });
    }
    const statusMatch = /^\/api\/campaigns\/(\d+)\/status$/.exec(pathname);
    if (method === 'PUT' && statusMatch) {
      const campaign = campaigns.find((entry) => entry.id === Number(statusMatch[1]));
      campaign.status = body.status;
      return Response.json({ data: campaign });
    }
    return Response.json({ message: 'not found' }, { status: 404 });
  };
  return { fetchImpl, calls, campaigns, writes: () => calls.filter((call) => call.method !== 'GET') };
}

function loadEdition(edition = manifest()) {
  return async () => ({
    release: { editionId: EDITION_ID },
    manifest: edition,
    article: { id: EDITION_ID, title: 'Promised weights', date: '2026-11-11' },
  });
}

async function invoke(handler, { authorized = true, method = 'GET', query = {} } = {}) {
  const result = { headers: {} };
  const response = {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.status = code; return this; },
    json(payload) { result.body = payload; return this; },
  };
  await handler({
    method,
    query,
    headers: authorized ? { authorization: 'Bearer cron-secret' } : {},
  }, response);
  return result;
}

function handlerAt(offsetMs, { env = listmonkEnv(), listmonk = fakeListmonk(), edition } = {}) {
  const handler = createEditionEmailHandler({
    env,
    fetchImpl: listmonk.fetchImpl,
    now: () => new Date(START_MS + offsetMs),
    loadEdition: loadEdition(edition),
  });
  return { handler, listmonk };
}

test('a request without the cron bearer is rejected before anything is read', async () => {
  let loaded = false;
  const listmonk = fakeListmonk();
  const handler = createEditionEmailHandler({
    env: listmonkEnv(),
    fetchImpl: listmonk.fetchImpl,
    now: () => new Date(START_MS),
    loadEdition: async () => { loaded = true; return loadEdition()(); },
  });
  const result = await invoke(handler, { authorized: false });
  assert.equal(result.status, 401);
  assert.equal(result.body.error, 'unauthorized');
  assert.equal(loaded, false);
  assert.equal(listmonk.calls.length, 0);
});

test('other methods are refused', async () => {
  const { handler, listmonk } = handlerAt(0);
  const result = await invoke(handler, { method: 'DELETE' });
  assert.equal(result.status, 405);
  assert.equal(listmonk.calls.length, 0);
});

test('before the meetup and after the window the handler skips without calling Listmonk', async () => {
  for (const [offsetMs, reason] of [[-HOUR_MS, 'not_due'], [24 * HOUR_MS, 'expired']]) {
    const { handler, listmonk } = handlerAt(offsetMs);
    const result = await invoke(handler);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ok: true, skipped: true, reason });
    assert.equal(listmonk.calls.length, 0);
  }
});

test('a due edition creates one campaign for every list and starts it', async () => {
  const { handler, listmonk } = handlerAt(0);
  const result = await invoke(handler);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    editionId: EDITION_ID,
    phase: 'due',
    campaign: { ok: true, campaignId: 41, status: 'running', created: true, started: true },
  });
  assert.deepEqual(listmonk.calls.map((call) => `${call.method} ${call.pathname}`), [
    'GET /api/campaigns',
    'GET /api/lists/3',
    'GET /api/lists/4',
    'POST /api/campaigns',
    'GET /usage',
    'PUT /api/campaigns/41/status',
  ]);
  const created = listmonk.calls[3].body;
  assert.equal(created.name, IDENTITY);
  assert.equal(created.subject, 'Longmont AI meetup edition: Promised weights');
  assert.deepEqual(created.lists, [3, 4]);
  assert.deepEqual(created.tags, ['longmontai', 'edition']);
  assert.equal(created.template_id, 9);
  assert.equal(created.from_email, 'LongmontAI <news@longmontai.com>');
  assert.equal(created.content_type, 'html');
  assert.ok(created.body.includes('{{ UnsubscribeURL }}'));
  assert.ok(created.altbody.includes('{{ UnsubscribeURL }}'));
  assert.deepEqual(listmonk.calls[5].body, { status: 'running' });
  assert.equal(listmonk.calls[4].authorization, 'Bearer resend-key');
  assert.ok(listmonk.calls.filter((call) => call.pathname.startsWith('/api/'))
    .every((call) => call.authorization === 'token api:token'));
});

test('a list another site owns on the shared Listmonk stops the send before anything is written', async () => {
  const sharedServer = fakeListmonk([], { 3: LONGMONTAI_LISTS[3], 4: { tags: ['studio-updates'] } });
  const fresh = await invoke(handlerAt(0, { listmonk: sharedServer }).handler);
  assert.equal(fresh.status, 409);
  assert.equal(fresh.body.error, 'listmonk_list_not_longmontai');
  assert.match(fresh.body.message, /list 4/);

  const withDraft = fakeListmonk([{ id: 7, name: IDENTITY, status: 'draft' }], { 3: LONGMONTAI_LISTS[3] });
  const resumed = await invoke(handlerAt(HOUR_MS, { listmonk: withDraft }).handler);
  assert.equal(resumed.status, 502);
  assert.equal(resumed.body.error, 'listmonk_list_lookup_failed');

  assert.equal(sharedServer.writes().length + withDraft.writes().length, 0);
});

test('a send that would eat into the Resend reserve stays a draft until the quota allows it', async () => {
  const nearlySpent = { daily: { used: 45, limit: 100 }, monthly: { used: 200, limit: 3000 } };
  const listmonk = fakeListmonk([], LONGMONTAI_LISTS, nearlySpent);
  const blocked = await invoke(handlerAt(0, { listmonk }).handler);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.error, 'resend_quota_insufficient');
  assert.match(blocked.body.message, /needs 40 sends plus a reserve of 20, but Resend has 55 left/);
  assert.deepEqual(listmonk.writes().map((call) => `${call.method} ${call.pathname}`), ['POST /api/campaigns']);
  assert.equal(listmonk.campaigns[0].status, 'draft');

  const smallerReserve = listmonkEnv({ NEWSLETTER_RESEND_RESERVE: '10' });
  const sent = await invoke(handlerAt(HOUR_MS, { env: smallerReserve, listmonk }).handler);
  assert.deepEqual(sent.body.campaign, { ok: true, campaignId: 41, status: 'running', created: false, started: true });

  const monthSpent = fakeListmonk([], LONGMONTAI_LISTS, { daily: { used: 0, limit: null }, monthly: { used: 2950, limit: 3000 } });
  const monthly = await invoke(handlerAt(0, { listmonk: monthSpent }).handler);
  assert.equal(monthly.body.error, 'resend_quota_insufficient');
});

test('an unreadable Resend usage answer blocks the send', async () => {
  const listmonk = fakeListmonk([], LONGMONTAI_LISTS, { daily: {} });
  const result = await invoke(handlerAt(0, { listmonk }).handler);
  assert.equal(result.status, 502);
  assert.equal(result.body.error, 'resend_usage_unavailable');
  assert.ok(!listmonk.writes().some((call) => call.method === 'PUT'));
});

test('the retry crons do nothing once the campaign is running', async () => {
  const listmonk = fakeListmonk();
  await invoke(handlerAt(0, { listmonk }).handler);
  const writesAfterFirstRun = listmonk.writes().length;

  for (const offsetMs of [HOUR_MS, 2 * HOUR_MS]) {
    const result = await invoke(handlerAt(offsetMs, { listmonk }).handler);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.campaign, {
      ok: true, campaignId: 41, status: 'running', created: false, started: false,
    });
  }
  assert.equal(listmonk.writes().length, writesAfterFirstRun);
  assert.equal(listmonk.campaigns.length, 1);
});

test('a finished campaign is left alone', async () => {
  const listmonk = fakeListmonk([{ id: 7, name: IDENTITY, status: 'finished' }]);
  const result = await invoke(handlerAt(HOUR_MS, { listmonk }).handler);
  assert.deepEqual(result.body.campaign, {
    ok: true, campaignId: 7, status: 'finished', created: false, started: false,
  });
  assert.equal(listmonk.writes().length, 0);
});

test('a draft left by a crashed run is started without a second create', async () => {
  const listmonk = fakeListmonk([
    { id: 6, name: `${IDENTITY}-older-sibling`, status: 'draft' },
    { id: 7, name: IDENTITY, status: 'draft' },
  ]);
  const result = await invoke(handlerAt(HOUR_MS, { listmonk }).handler);

  assert.deepEqual(result.body.campaign, {
    ok: true, campaignId: 7, status: 'running', created: false, started: true,
  });
  assert.deepEqual(listmonk.writes().map((call) => `${call.method} ${call.pathname}`), [
    'PUT /api/campaigns/7/status',
  ]);
  assert.equal(listmonk.campaigns.find((campaign) => campaign.id === 6).status, 'draft');
});

test('draft mode creates the campaign once and never starts it', async () => {
  const listmonk = fakeListmonk();
  const env = listmonkEnv({ NEWSLETTER_EDITION_EMAIL_MODE: 'draft', RESEND_API_KEY: '' });
  const first = await invoke(handlerAt(0, { env, listmonk }).handler);
  const second = await invoke(handlerAt(HOUR_MS, { env, listmonk }).handler);

  assert.deepEqual(first.body.campaign, {
    ok: true, campaignId: 41, status: 'draft', created: true, started: false,
  });
  assert.deepEqual(second.body.campaign, {
    ok: true, campaignId: 41, status: 'draft', created: false, started: false,
  });
  assert.deepEqual(listmonk.writes().map((call) => `${call.method} ${call.pathname}`), ['POST /api/campaigns']);
});

test('a due edition answers 503 with the reason when delivery is not configured', async () => {
  const cases = {
    listmonk_campaign_not_configured: { LISTMONK_API_TOKEN: '' },
    listmonk_list_not_configured: {
      LISTMONK_WEEKLY_LIST_ID: '', LISTMONK_BIWEEKLY_LIST_ID: '', LISTMONK_NEWSLETTER_LIST_ID: '',
    },
    newsletter_from_email_not_configured: { NEWSLETTER_FROM_EMAIL: '' },
    listmonk_template_not_configured: { LISTMONK_EDITION_TEMPLATE_ID: '' },
    resend_usage_not_configured: { RESEND_API_KEY: '' },
  };
  for (const [reason, overrides] of Object.entries(cases)) {
    const { handler, listmonk } = handlerAt(0, { env: listmonkEnv(overrides) });
    const result = await invoke(handler);
    assert.equal(result.status, 503, reason);
    assert.equal(result.body.error, reason);
    assert.equal(listmonk.calls.length, 0, reason);
  }
  const unprovisioned = await invoke(handlerAt(0, { env: { CRON_SECRET: 'cron-secret' } }).handler);
  assert.equal(unprovisioned.status, 503);
  assert.equal(unprovisioned.body.error, 'listmonk_campaign_not_configured');
});

test('a due edition without a usable digest fails loudly and sends nothing', async () => {
  const { emailDigest: _omitted, ...bare } = manifest();
  const missing = handlerAt(0, { edition: bare });
  const missingResult = await invoke(missing.handler);
  assert.equal(missingResult.status, 500);
  assert.equal(missingResult.body.error, 'edition_digest_missing');

  const invalid = handlerAt(0, { edition: withDigest({ keyNews: [] }) });
  const invalidResult = await invoke(invalid.handler);
  assert.equal(invalidResult.status, 500);
  assert.equal(invalidResult.body.error, 'edition_digest_invalid');
  assert.match(invalidResult.body.message, /emailDigest\.keyNews/);
  assert.equal(missing.listmonk.calls.length + invalid.listmonk.calls.length, 0);
});

test('a Listmonk failure surfaces as 502 and the next run finishes the job', async () => {
  const listmonk = fakeListmonk();
  let failStart = true;
  const flaky = async (url, options = {}) => {
    if (failStart && options.method === 'PUT') {
      listmonk.calls.push({ method: 'PUT', pathname: new URL(url).pathname });
      return Response.json({ message: 'boom' }, { status: 500 });
    }
    return listmonk.fetchImpl(url, options);
  };
  const run = (offsetMs) => invoke(createEditionEmailHandler({
    env: listmonkEnv(),
    fetchImpl: flaky,
    now: () => new Date(START_MS + offsetMs),
    loadEdition: loadEdition(),
  }));

  const crashed = await run(0);
  assert.equal(crashed.status, 502);
  assert.deepEqual(crashed.body, {
    ok: false, error: 'listmonk_campaign_start_failed', message: 'Edition email failed.',
  });

  failStart = false;
  const retried = await run(HOUR_MS);
  assert.deepEqual(retried.body.campaign, {
    ok: true, campaignId: 41, status: 'running', created: false, started: true,
  });
  assert.equal(listmonk.campaigns.length, 1);
});

test('a dry run reports the plan in any phase and sends nothing', async () => {
  for (const [offsetMs, phase] of [[-HOUR_MS, 'not_due'], [0, 'due'], [24 * HOUR_MS, 'expired']]) {
    const { handler, listmonk } = handlerAt(offsetMs);
    const result = await invoke(handler, { query: { dryRun: '1' } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      ok: true,
      phase,
      subject: 'Longmont AI meetup edition: Promised weights',
      lists: [3, 4],
    });
    assert.equal(listmonk.calls.length, 0);
  }
  const unauthorized = await invoke(handlerAt(0).handler, { authorized: false, query: { dryRun: '1' } });
  assert.equal(unauthorized.status, 401);
});

test('the staged edition ships with a digest that renders', async () => {
  const { release, manifest: staged, article } = await loadStagedEdition();
  assert.equal(staged.editionId, release.editionId);
  const { digest } = parseEditionDigest(staged);
  const email = renderEditionEmail({ edition: article, digest });
  assert.ok(email.html.includes(`https://longmontai.com/edition/${release.editionId}`));
});
