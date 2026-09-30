import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { watchRetryingResource } from '../../src/lib/retryingWatcher.ts';
import { unavailableScheduledEditionPhase } from '../../src/lib/scheduledEditionState.ts';

function harness() {
  let now = 0;
  let visible = true;
  let id = 0;
  const timers = new Map();
  const listeners = new Map(['visibilitychange', 'focus', 'online'].map(event => [event, new Set()]));
  const add = (event, listener) => listeners.get(event).add(listener);
  const remove = (event, listener) => listeners.get(event).delete(listener);
  return {
    timers, listeners,
    time(value) { now = value; },
    visible(value) { visible = value; },
    emit(event) { for (const listener of listeners.get(event)) listener(); },
    fire() { for (const timer of [...timers.values()]) if (timer.due <= now) timer.callback(); },
    runtime: {
      now: () => now,
      isVisible: () => visible,
      setTimeout(callback, delay) { timers.set(++id, { callback, due: now + delay }); return id; },
      clearTimeout(timer) { timers.delete(timer); },
      addDocumentListener: add, removeDocumentListener: remove,
      addWindowListener: add, removeWindowListener: remove,
    },
  };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const options = { publicationAt: 1000, retryDelays: [100, 200], maxTimerDelay: 10000 };
const storm = h => { for (let i = 0; i < 20; i++) for (const event of h.listeners.keys()) h.emit(event); };
const clean = h => {
  assert.equal(h.timers.size, 0);
  assert.ok([...h.listeners.values()].every(set => set.size === 0));
};

test('waiting changes to retrying exactly at publication', () => {
  assert.equal(unavailableScheduledEditionPhase(999, 1000), 'waiting');
  assert.equal(unavailableScheduledEditionPhase(1000, 1000), 'retrying');
  assert.equal(unavailableScheduledEditionPhase(1001, 1000), 'retrying');
  assert.equal(unavailableScheduledEditionPhase(0, NaN), 'retrying');
});

test('page wires checking/waiting/retry states into an accessible status and return link', () => {
  const source = readFileSync(new URL('../../src/pages/ScheduledEdition.tsx', import.meta.url), 'utf8');
  assert.match(source, /useState<ScheduledEditionPhase>\('checking'\)/);
  assert.match(source, /watchScheduledEdition\(setResult, setPhase\)/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /aria-labelledby="scheduled-edition-status-title"/);
  assert.match(source, /id="scheduled-edition-status-title"/);
  for (const copy of ['Edition not available yet', 'Edition temporarily unavailable', 'Checking edition availability', 'Back to editions']) assert.ok(source.includes(copy));
});

test('recovery respects publication and backoff, recovers overdue hidden timers, and stops on success', async () => {
  const h = harness();
  let attempts = 0;
  const statuses = [];
  const results = [];
  const dispose = watchRetryingResource({ ...options, runtime: h.runtime,
    attempt: async () => { attempts++; if (attempts === 2) throw new Error('network'); return attempts === 4 ? { ok: true } : null; },
    onResult: result => results.push(result),
    onUnavailable: (now, at) => statuses.push(unavailableScheduledEditionPhase(now, at)),
  });
  await settle();
  storm(h); await settle();
  assert.equal(attempts, 1);
  assert.deepEqual(statuses, ['waiting']);
  h.time(1000); h.fire(); await settle();
  assert.equal(attempts, 2);
  assert.equal(statuses.at(-1), 'retrying');
  h.time(1099); storm(h); await settle();
  assert.equal(attempts, 2);
  h.time(1100); h.visible(false); storm(h); await settle();
  assert.equal(attempts, 2);
  h.visible(true); h.emit('visibilitychange'); await settle();
  assert.equal(attempts, 3);
  h.time(1299); storm(h); await settle();
  assert.equal(attempts, 3);
  h.time(1300); h.emit('online'); await settle();
  assert.deepEqual(results, [{ ok: true }]);
  storm(h); h.fire(); await settle();
  assert.equal(attempts, 4);
  assert.equal(h.timers.size, 0);
  dispose(); clean(h);
});

for (const outcome of ['result', 'null', 'error']) {
  test(`disposal aborts and suppresses late ${outcome}, including stale timers and recovery`, async () => {
    const h = harness();
    let signal;
    let resolve;
    let reject;
    let attempts = 0;
    let callbacks = 0;
    const dispose = watchRetryingResource({ ...options, runtime: h.runtime,
      attempt: async value => { signal = value; attempts++; return new Promise((yes, no) => { resolve = yes; reject = no; }); },
      onResult: () => callbacks++, onUnavailable: () => callbacks++,
    });
    storm(h); await settle();
    assert.equal(attempts, 1, 'no overlapping requests');
    dispose(); dispose();
    assert.ok(signal.aborted);
    if (outcome === 'error') reject(new Error('late rejection'));
    else resolve(outcome === 'null' ? null : { ok: true });
    await settle(); storm(h); h.fire(); await settle();
    assert.equal(callbacks, 0); assert.equal(attempts, 1); clean(h);
  });
}

test('bounded timer delays and capped retry backoff survive repeated misses', async () => {
  const h = harness();
  const dispose = watchRetryingResource({ ...options, maxTimerDelay: 500, runtime: h.runtime,
    attempt: async () => null, onResult() {},
  });
  await settle();
  for (const [time, due] of [[0, 500], [500, 1000], [1000, 1100], [1100, 1300], [1300, 1500]]) {
    h.time(time); h.fire(); await settle();
    assert.equal([...h.timers.values()][0].due, due);
  }
  const stale = [...h.timers.values()][0].callback;
  dispose(); stale(); await settle(); clean(h);
});

test('disposal from unavailable callback does not recreate a timer', async () => {
  const h = harness();
  const dispose = watchRetryingResource({ ...options, runtime: h.runtime,
    attempt: async () => null, onResult() {}, onUnavailable: () => dispose(),
  });
  await settle(); clean(h);
});
