import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  addCalendarDays,
  denverCalendarDate,
  denverNoon,
  mountainTimeLabel,
  nextDenverMeetup,
} from '../../src/lib/meetupSchedule.ts';
import { pageTitle } from '../../src/lib/documentTitle.ts';
import { canonicalEditionUrl, shareEdition } from '../../src/lib/editionShare.ts';
import {
  countDistinctModels,
  isModelWatchSnapshotStatus,
} from '../../src/lib/modelWatchPresentation.ts';
import {
  newsletterSignupErrorMessage,
  readNewsletterSubscribeResponse,
  UNAVAILABLE_MESSAGE,
} from '../../src/lib/newsletterResponse.ts';
import { watchRetryingResource } from '../../src/lib/retryingWatcher.ts';
import { unavailableScheduledEditionPhase } from '../../src/lib/scheduledEditionState.ts';
import { reconcileVisibleSelection } from '../../src/lib/timelineSelection.ts';

const reference = { year: 2026, month: 5, day: 27 };
const hour = 60 * 60 * 1000;

test('Denver meetup recurrences remain local noon across DST', () => {
  const beforeFallback = denverNoon(addCalendarDays(reference, 11 * 14));
  const afterFallback = denverNoon(addCalendarDays(reference, 12 * 14));

  assert.equal(beforeFallback.toISOString(), '2026-10-28T18:00:00.000Z');
  assert.equal(afterFallback.toISOString(), '2026-11-11T19:00:00.000Z');
  assert.equal(mountainTimeLabel(beforeFallback), 'MDT');
  assert.equal(mountainTimeLabel(afterFallback), 'MST');
});

test('Denver noon also remains stable across the spring DST transition', () => {
  assert.equal(denverNoon({ year: 2027, month: 3, day: 10 }).toISOString(), '2027-03-10T19:00:00.000Z');
  assert.equal(denverNoon({ year: 2027, month: 3, day: 24 }).toISOString(), '2027-03-24T18:00:00.000Z');
});

test('meetup and invite windows roll over at their exact end boundary', () => {
  const meetup = '2026-11-11T19:00:00.000Z';
  assert.equal(nextDenverMeetup(new Date('2026-11-11T19:59:59.999Z'), reference, 14, hour).toISOString(), meetup);
  assert.equal(nextDenverMeetup(new Date('2026-11-11T20:00:00.000Z'), reference, 14, hour).toISOString(), '2026-11-25T19:00:00.000Z');
  assert.equal(nextDenverMeetup(new Date('2026-11-11T20:29:59.999Z'), reference, 14, 90 * 60 * 1000).toISOString(), meetup);
  assert.equal(nextDenverMeetup(new Date('2026-11-11T20:30:00.000Z'), reference, 14, 90 * 60 * 1000).toISOString(), '2026-11-25T19:00:00.000Z');
});

test('next meetup is based on Denver calendar time in distinct process timezones', () => {
  const helperUrl = new URL('../../src/lib/meetupSchedule.ts', import.meta.url).href;
  const program = `import { nextDenverMeetup } from ${JSON.stringify(helperUrl)}; process.stdout.write(nextDenverMeetup(new Date('2026-11-11T18:30:00.000Z'), {year:2026,month:5,day:27}, 14, 3600000).toISOString())`;
  for (const timezone of ['UTC', 'America/New_York', 'America/Denver']) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', program], {
      encoding: 'utf8',
      env: { ...process.env, TZ: timezone },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '2026-11-11T19:00:00.000Z');
  }
  assert.equal(denverCalendarDate(new Date('2026-11-11T18:30:00.000Z')).day, 11);
});

test('scheduled edition unavailable state changes only at the public release boundary', () => {
  const publishAt = Date.parse('2026-09-02T11:30:00-06:00');
  assert.equal(unavailableScheduledEditionPhase(publishAt - 1, publishAt), 'waiting');
  assert.equal(unavailableScheduledEditionPhase(publishAt, publishAt), 'retrying');
  assert.equal(unavailableScheduledEditionPhase(publishAt + 1, publishAt), 'retrying');
});

test('scheduled watcher honors its deadline under recovery events, releases at T, and cleans up', async () => {
  let now = 0;
  let nextTimer = 1;
  const timers = new Map();
  const listeners = new Map([['visibilitychange', new Set()], ['focus', new Set()], ['online', new Set()]]);
  const runtime = {
    now: () => now,
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    isVisible: () => true,
    addDocumentListener(event, listener) { listeners.get(event).add(listener); },
    removeDocumentListener(event, listener) { listeners.get(event).delete(listener); },
    addWindowListener(event, listener) { listeners.get(event).add(listener); },
    removeWindowListener(event, listener) { listeners.get(event).delete(listener); },
  };
  const emit = (event) => { for (const listener of listeners.get(event)) listener(); };
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
  let attempts = 0;
  let released = 0;
  const cleanup = watchRetryingResource({
    publicationAt: 1_000,
    retryDelays: [100, 200],
    maxTimerDelay: 10_000,
    runtime,
    attempt: async () => (++attempts === 1 ? null : { released: true }),
    onResult: () => { released += 1; },
  });
  await settle();
  assert.equal(attempts, 1);
  for (let index = 0; index < 20; index += 1) {
    emit('focus'); emit('online'); emit('visibilitychange');
  }
  await settle();
  assert.equal(attempts, 1, 'recovery events must not bypass the publication deadline');

  now = 1_000;
  const due = [...timers.values()].filter((timer) => timer.due <= now);
  for (const timer of due) timer.callback();
  await settle();
  assert.equal(attempts, 2);
  assert.equal(released, 1);
  for (let index = 0; index < 5; index += 1) emit('focus');
  await settle();
  assert.equal(attempts, 2, 'completed watcher must not refetch');

  cleanup();
  assert.equal(timers.size, 0);
  assert.equal([...listeners.values()].every((set) => set.size === 0), true);

  let backoffAttempts = 0;
  const cleanupBackoff = watchRetryingResource({
    publicationAt: 0,
    retryDelays: [100, 200],
    maxTimerDelay: 1_000,
    runtime,
    attempt: async () => { backoffAttempts += 1; return null; },
    onResult: () => {},
  });
  await settle();
  assert.equal(backoffAttempts, 1);
  for (let index = 0; index < 20; index += 1) {
    emit('focus'); emit('online'); emit('visibilitychange');
  }
  await settle();
  assert.equal(backoffAttempts, 1, 'recovery events must preserve the 100ms retry backoff');
  now += 100;
  for (const timer of [...timers.values()].filter((entry) => entry.due <= now)) timer.callback();
  await settle();
  assert.equal(backoffAttempts, 2);
  for (let index = 0; index < 20; index += 1) {
    emit('focus'); emit('online'); emit('visibilitychange');
  }
  await settle();
  assert.equal(backoffAttempts, 2, 'recovery events must preserve the 200ms retry backoff');
  cleanupBackoff();

  let pendingSignal;
  let resolvePending;
  let lateResults = 0;
  let lateUnavailable = 0;
  const cleanupPending = watchRetryingResource({
    publicationAt: 0,
    retryDelays: [100],
    maxTimerDelay: 1_000,
    runtime,
    attempt: async (signal) => {
      pendingSignal = signal;
      return new Promise((resolve) => { resolvePending = resolve; });
    },
    onResult: () => { lateResults += 1; },
    onUnavailable: () => { lateUnavailable += 1; },
  });
  await settle();
  cleanupPending();
  resolvePending({ released: true });
  await settle();
  assert.equal(pendingSignal.aborted, true);
  assert.equal(lateResults, 0);
  assert.equal(lateUnavailable, 0);
  assert.equal(timers.size, 0);
  assert.equal([...listeners.values()].every((set) => set.size === 0), true);
});

test('edition sharing uses a canonical URL and reports supported outcomes without raw errors', async () => {
  const url = canonicalEditionUrl('https://longmontai.com/other', 'edition-2026-09-02');
  assert.equal(url, 'https://longmontai.com/edition/edition-2026-09-02');
  let shared;
  assert.equal(await shareEdition({ share: async (data) => { shared = data; } }, 'Released title', url), 'shared');
  assert.deepEqual(shared, { title: 'Released title', url });
  let copied;
  assert.equal(await shareEdition({ clipboard: { writeText: async (value) => { copied = value; } } }, 'Released title', url), 'copied');
  assert.equal(copied, url);
  assert.equal(await shareEdition({ share: async () => { throw new Error('private marker'); } }, 'Released title', url), 'failed');
  assert.equal(await shareEdition({}, 'Released title', url), 'failed');
});

test('Model Watch validates snapshot payloads and counts case/separator variants once', () => {
  const valid = { checkedAt: '2026-08-19T15:59:26.904Z', successfulSources: 12, totalSources: 12, detectedModels: ['GLM-5', 'Qwen-Image 3.0'] };
  assert.equal(isModelWatchSnapshotStatus(valid), true);
  assert.equal(isModelWatchSnapshotStatus({ ...valid, detectedModels: 'GLM-5' }), false);
  assert.equal(isModelWatchSnapshotStatus({ ...valid, successfulSources: 13 }), false);
  assert.equal(isModelWatchSnapshotStatus({ ...valid, checkedAt: 'not-a-date' }), false);
  assert.equal(countDistinctModels(['glm-5', 'GLM-5', 'Qwen-Image 3.0', 'qwen_image-3.0']), 2);
});

test('document titles are plain deterministic text', () => {
  assert.equal(pageTitle(), 'LongmontAI');
  assert.equal(pageTitle('Model Watch'), 'Model Watch | LongmontAI');
  assert.equal(pageTitle('<img src=x>'), '<img src=x> | LongmontAI');
});

test('timeline selection is reconciled to the visible result set', () => {
  const old = { id: 'future' };
  const visible = [{ id: 'turing' }, { id: 'dartmouth' }];
  assert.equal(reconcileVisibleSelection(old, visible)?.id, 'turing');
  assert.equal(reconcileVisibleSelection(visible[1], visible)?.id, 'dartmouth');
  assert.equal(reconcileVisibleSelection(old, []), null);
});

test('newsletter response preserves expected JSON messages and masks gateway bodies', async () => {
  await assert.rejects(
    readNewsletterSubscribeResponse(new Response('<h1>Bad Gateway</h1>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    })),
    new RegExp(UNAVAILABLE_MESSAGE.replaceAll('.', '\\.'), 'i'),
  );
  await assert.rejects(
    readNewsletterSubscribeResponse(new Response('{', {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })),
    new RegExp(UNAVAILABLE_MESSAGE.replaceAll('.', '\\.'), 'i'),
  );
  await assert.rejects(
    readNewsletterSubscribeResponse(new Response(JSON.stringify({ ok: false, error: 'invalid_email', message: 'provider marker' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })),
    (error) => {
      assert.equal(error.message, 'Enter a valid email address.');
      assert.equal(newsletterSignupErrorMessage(error), 'Enter a valid email address.');
      return true;
    },
  );
  for (const code of ['toString', 'constructor', '__proto__']) {
    await assert.rejects(
      readNewsletterSubscribeResponse(new Response(JSON.stringify({ ok: false, error: code, message: 'untrusted provider copy' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })),
      (error) => {
        assert.equal(error.message, UNAVAILABLE_MESSAGE);
        assert.equal(newsletterSignupErrorMessage(error), UNAVAILABLE_MESSAGE);
        return true;
      },
    );
  }
  await assert.rejects(
    readNewsletterSubscribeResponse(new Response(JSON.stringify({ ok: false, error: 'unknown', message: 'internal provider marker' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })),
    new RegExp(UNAVAILABLE_MESSAGE.replaceAll('.', '\\.'), 'i'),
  );
  assert.equal(newsletterSignupErrorMessage(new TypeError('network internals marker')), UNAVAILABLE_MESSAGE);
  assert.equal((await readNewsletterSubscribeResponse(new Response(JSON.stringify({ ok: true, status: 'accepted' }), {
    status: 202,
    headers: { 'content-type': 'application/json' },
  }))).status, 'accepted');
});
