import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACK_HOLE_RADIUS, BLACK_HOLE_MAX_STARS, BLACK_HOLE_MAX_SPARKS,
  BLACK_HOLE_MAX_DELTA, advanceHoleBody, boundedHoleDelta, createBlackHole,
  createHawkingJets, holeAcceleration, stepBlackHole,
} from '../../src/components/blackHoleModel.ts';

const center = { x: 300, y: 300 };
const source = (x, y, visible = true) => ({ x, y, visible });

test('gravity is local, strongly inward, and curves real source slots', () => {
  assert.deepEqual(holeAcceleration({ x: 300 + BLACK_HOLE_RADIUS, y: 300 }, center), { x: 0, y: 0 });
  const acceleration = holeAcceleration({ x: 350, y: 300 }, center);
  assert.ok(acceleration.x < -1000);
  assert.ok(acceleration.y < 0);
  let state = createBlackHole();
  for (let i = 0; i < 20; i++) state = stepBlackHole(state,
    [source(400 + i * 0.1, 300), source(600, 300)], center, 1 / 60);
  assert.ok(state.stars.get(0).x < 390);
  assert.ok(state.stars.get(0).y < 300);
  assert.equal(state.stars.has(1), false, 'outside sources retain their original trajectory');
});

test('nearby moving star is consumed once, invisible slots cannot create jets', () => {
  let state = createBlackHole();
  for (let i = 0; i < 180; i++) state = stepBlackHole(state,
    [source(380 + i * 0.03, 310), source(300, 300, false)], center, 1 / 60);
  assert.equal(state.captures, 1);
  assert.equal(state.stars.get(0).consumed, true);
  assert.equal(state.stars.has(1), false);
  assert.equal(state.sparks.length, 0, 'burst expires instead of emitting indefinitely');
});

test('accretion converges instead of slingshotting nearby stars', () => {
  for (const distance of [10, 30, 50, 80, 120, 160, 180]) {
    let state = createBlackHole();
    for (let i = 0; i < 1200; i++) state = stepBlackHole(state,
      [source(center.x + distance, center.y)], center, 1 / 60);
    assert.equal(state.captures, 1, `distance ${distance} should accrete`);
  }
});

test('swept capture cannot tunnel through the core and timestep is bounded', () => {
  assert.equal(advanceHoleBody({ x: 312, y: 300, vx: -900, vy: 0 }, center, 5).captured, true);
  assert.equal(boundedHoleDelta(10), BLACK_HOLE_MAX_DELTA);
  for (const dt of [-1, NaN, Infinity]) assert.equal(boundedHoleDelta(dt), 0);
  const body = { x: 400, y: 300, vx: 0, vy: 0 };
  assert.deepEqual(advanceHoleBody(body, center, 100), advanceHoleBody(body, center, BLACK_HOLE_MAX_DELTA));
});

test('bipolar jets are narrow, include returning and escaping sparks, and expire within 0.8s', () => {
  for (let sequence = 0; sequence < 12; sequence++) {
    const jets = createHawkingJets(center, sequence);
    assert.equal(jets.length, 4);
    assert.equal(jets.filter(s => s.vy < 0).length, 2);
    for (const spark of jets) {
      assert.ok(spark.lifetime >= 0.3 && spark.lifetime <= 0.8);
      assert.ok(Math.abs(spark.vx / spark.vy) < 0.05);
      let body = spark;
      let capturedAt = null;
      for (let frame = 0; frame < Math.floor(spark.lifetime * 120); frame++) {
        const next = advanceHoleBody(body, center, 1 / 120, true);
        body = next.body;
        if (next.captured) { capturedAt = frame / 120; break; }
      }
      if (spark.returning) assert.ok(capturedAt > 0.2 && capturedAt < 0.6);
      else {
        assert.equal(capturedAt, null);
        assert.ok(Math.abs(body.y - center.y) > 65);
        assert.ok(Math.abs(body.x - center.x) < 12);
      }
    }
  }
  let state = { ...createBlackHole(), sparks: createHawkingJets(center, 1) };
  for (let frame = 0; frame < 100; frame++) state = stepBlackHole(state, [], center, 1 / 120);
  assert.equal(state.recaptures, 2);
  assert.equal(state.captures, 0, 'recapture does not recursively emit');
  assert.equal(state.sparks.length, 0);
});

test('star records and particles remain bounded during capture storms', () => {
  let state = createBlackHole();
  const sources = Array.from({ length: 1000 }, () => source(300, 300));
  for (let frame = 0; frame < 60; frame++) {
    state = stepBlackHole(state, sources, center, 1 / 60);
    assert.ok(state.stars.size <= BLACK_HOLE_MAX_STARS);
    assert.ok(state.sparks.length <= BLACK_HOLE_MAX_SPARKS);
  }
  assert.equal(state.captures, BLACK_HOLE_MAX_STARS);
  assert.equal(state.sparks.length, 0);
});

test('consumed slots recycle outside gravity, traveler cycles reset, and disappeared IDs are pruned', () => {
  let state = stepBlackHole(createBlackHole(), [source(300, 300)], center, 1 / 60);
  assert.equal(state.captures, 1);
  state = stepBlackHole(state, [source(600, 300)], center, 1 / 60);
  assert.equal(state.stars.size, 0);
  state = stepBlackHole(state, [source(300, 300)], center, 1 / 60);
  assert.equal(state.captures, 2);
  state = stepBlackHole(state, [{ ...source(300, 300), id: -1, cycle: 1 }], center, 1 / 60);
  assert.equal(state.captures, 3);
  assert.equal(state.stars.has(0), false);
  state = stepBlackHole(state, [{ ...source(300, 300), id: -1, cycle: 2 }], center, 1 / 60);
  assert.equal(state.captures, 4);
  state = stepBlackHole(state, [{ ...source(300, 300, false), id: -1, cycle: 2 }], center, 1 / 60);
  assert.equal(state.stars.size, 0);
});

test('wrapped source slots reset, but continuous consumed drift cannot emit repeatedly', () => {
  let state = stepBlackHole(createBlackHole(), [source(300, 300)], center, 1 / 60);
  for (let x = 301; x < 360; x++) state = stepBlackHole(state, [source(x, 300)], center, 1 / 60);
  assert.equal(state.captures, 1);
  assert.equal(state.stars.get(0).consumed, true);
  state = stepBlackHole(state, [source(280, 300)], center, 1 / 60);
  assert.equal(state.stars.get(0).consumed, false);
  for (let i = 0; i < 120; i++) state = stepBlackHole(state, [source(280, 300)], center, 1 / 60);
  assert.equal(state.captures, 2);
});

test('repeated traveler lifecycles sustain capture beyond the record budget', () => {
  let state = createBlackHole();
  for (let cycle = 0; cycle < 300; cycle++) {
    state = stepBlackHole(state, [{ ...source(300, 300), id: -1, cycle }], center, 1 / 60);
    assert.equal(state.stars.size, 1);
    assert.ok(state.sparks.length <= BLACK_HOLE_MAX_SPARKS);
  }
  assert.equal(state.captures, 300);
});

test('pure deterministic step does not mutate prior state and follows a moved attractor', () => {
  const initial = createBlackHole();
  const sources = [source(390, 300)];
  const state = stepBlackHole(initial, sources, center, 1 / 60);
  assert.equal(initial.stars.size, 0);
  assert.deepEqual(state, stepBlackHole(initial, sources, center, 1 / 60));
  const moved = stepBlackHole(state, sources, { x: 430, y: 300 }, 1 / 30);
  assert.ok(moved.stars.get(0).vx > state.stars.get(0).vx);
});
