import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACK_HOLE_RADIUS, BLACK_HOLE_MAX_STARS, BLACK_HOLE_MAX_SPARKS, BLACK_HOLE_MAX_DELTA,
  BLACK_HOLE_SHADOW_RADIUS, GALAXY_FEAST_SECONDS, GALAXY_SHRED_SECONDS, GALAXY_TIDAL_RADIUS,
  advanceHoleBody, boundedHoleDelta, createBlackHole, createHawkingJets, holeAcceleration,
  galaxyFeastPower, holeGalaxyCenter, holeTravelerRole, shredGalaxyParticle, stepBlackHole,
} from '../../src/components/blackHoleModel.ts';
import {
  BLACK_HOLE_OPEN_SECONDS, drawBlackHole,
} from '../../src/components/blackHoleRenderer.ts';

const center = { x: 300, y: 300 };
const source = (x, y, visible = true) => ({ x, y, visible });
const galaxy = (x, y, { cycle = 0, visible = true, id = -1, radius = 25 } = {}) =>
  ({ x, y, id, cycle, visible, radius });
const feed = (state, sources, frames, hole = center) => {
  for (let frame = 0; frame < frames; frame++) state = stepBlackHole(state, [], hole, 1 / 60, sources);
  return state;
};

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
        const next = advanceHoleBody(body, center, 1 / 120, 'jet');
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

  const galaxies = [galaxy(400, 300)];
  const infall = feed(createBlackHole(), galaxies, 30);
  const snapshot = structuredClone(infall);
  const next = stepBlackHole(infall, sources, center, 1 / 60, galaxies);
  assert.deepEqual(infall, snapshot, 'galaxy step leaves the prior state untouched');
  assert.deepEqual(next, stepBlackHole(infall, sources, center, 1 / 60, galaxies));
  assert.ok(Math.hypot(next.galaxies.get(-1).x - 300, next.galaxies.get(-1).y - 300)
    < Math.hypot(infall.galaxies.get(-1).x - 300, infall.galaxies.get(-1).y - 300));
});

test('only free stars and galaxies answer the hole; the planetary system owner never does', () => {
  assert.equal(holeTravelerRole('star', false), 'star');
  assert.equal(holeTravelerRole('galaxy', false), 'galaxy');
  for (const variant of ['star', 'galaxy', 'ufo', 'comet']) assert.equal(holeTravelerRole(variant, true), 'ignored');
  for (const variant of ['ufo', 'comet', 'planet']) assert.equal(holeTravelerRole(variant, false), 'ignored');
});

test('a galaxy anywhere in reach is shredded and swallowed exactly once, slower than a star', () => {
  for (const distance of [0, 40, 100, 150, 180]) {
    let state = createBlackHole();
    let shreddingAt = null;
    let consumedAt = null;
    for (let frame = 0; frame < 60 * 12; frame++) {
      state = stepBlackHole(state, [], center, 1 / 60, [galaxy(center.x + distance, center.y)]);
      const phase = state.galaxies.get(-1).phase;
      if (phase === 'shredding' && shreddingAt === null) shreddingAt = frame / 60;
      if (phase === 'consumed' && consumedAt === null) consumedAt = frame / 60;
    }
    assert.ok(shreddingAt !== null, `distance ${distance} reaches the tidal radius`);
    assert.ok(Math.abs(consumedAt - shreddingAt - GALAXY_SHRED_SECONDS) < 0.05, `distance ${distance} shreds for the full time`);
    assert.equal(state.feasts, 1, `distance ${distance} feasts once`);
    assert.equal(state.captures, 0, 'galaxy feasts stay out of the star capture count');
    assert.equal(state.sparks.length, 0, 'galaxy feasts do not spend the star spark budget');
  }
  let star = createBlackHole();
  let starFrame = 0;
  while (star.captures === 0) {
    star = stepBlackHole(star, [source(center.x + 120, center.y)], center, 1 / 60);
    starFrame += 1;
  }
  let feast = createBlackHole();
  let galaxyFrame = 0;
  while (feast.feasts === 0) {
    feast = stepBlackHole(feast, [], center, 1 / 60, [galaxy(center.x + 120, center.y)]);
    galaxyFrame += 1;
  }
  assert.ok(galaxyFrame > starFrame + 60 * 1.5, `galaxy ${galaxyFrame} frames vs star ${starFrame}`);
});

test('finale scales with galaxy size and a speck cannot cut a big feast short', () => {
  assert.ok(galaxyFeastPower(4) < 0.2);
  assert.equal(galaxyFeastPower(30), 1);
  const eat = (state, options) => {
    const feasts = state.feasts;
    while (state.feasts === feasts) state = stepBlackHole(state, [], center, 1 / 60, [galaxy(320, 300, options)]);
    return state;
  };
  const big = eat(createBlackHole(), { radius: 30 });
  assert.equal(big.feastPower, 1);
  const pair = [galaxy(320, 300, { radius: 30 }), galaxy(280, 300, { id: -2, radius: 4 })];
  let interrupted = feed(createBlackHole(), pair.slice(0, 1), 30);
  while (interrupted.feasts < 2) interrupted = stepBlackHole(interrupted, [], center, 1 / 60, pair);
  assert.equal(interrupted.feastPower, 1, 'the quasar keeps playing');
  assert.ok(interrupted.feastAge > 0);
  const speck = eat(feed(big, [], Math.ceil(GALAXY_FEAST_SECONDS * 60)), { id: -2, radius: 4 });
  assert.equal(speck.feastAge, 0);
  assert.equal(speck.feastPower, galaxyFeastPower(4));
});

test('feast clock starts at the feast and advances with bounded frame time', () => {
  let state = createBlackHole();
  assert.equal(state.feastAge, Infinity);
  while (state.feasts === 0) state = stepBlackHole(state, [], center, 1 / 60, [galaxy(320, 300)]);
  assert.equal(state.feastAge, 0);
  state = stepBlackHole(state, [], center, 1 / 60, [galaxy(320, 300)]);
  assert.ok(Math.abs(state.feastAge - 1 / 60) < 1e-9);
  state = stepBlackHole(state, [], center, 10, [galaxy(320, 300)]);
  assert.ok(Math.abs(state.feastAge - 1 / 60 - BLACK_HOLE_MAX_DELTA) < 1e-9);
  assert.equal(state.feasts, 1);
});

test('a consumed galaxy stays gone when the hole moves on, and returns only with a new cycle', () => {
  let state = feed(createBlackHole(), [galaxy(320, 300)], 60 * 5);
  assert.equal(state.galaxies.get(-1).phase, 'consumed');
  const away = { x: 900, y: 900 };
  state = feed(state, [galaxy(320, 300)], 120, away);
  assert.equal(state.galaxies.get(-1).phase, 'consumed');
  assert.equal(state.feasts, 1);
  state = feed(state, [galaxy(320, 300, { cycle: 1 })], 1);
  assert.equal(state.galaxies.get(-1).phase, 'infall');
  state = feed(state, [galaxy(320, 300, { cycle: 1 })], 60 * 5);
  assert.equal(state.feasts, 2);
  state = feed(state, [], 1);
  assert.equal(state.galaxies.size, 0, 'a vanished source is forgotten');
});

test('invisible galaxies are never taken and a galaxy left behind mid-fall is released', () => {
  const hidden = feed(createBlackHole(), [galaxy(320, 300, { visible: false })], 60 * 6);
  assert.equal(hidden.galaxies.size, 0);
  assert.equal(hidden.feasts, 0);

  let state = feed(createBlackHole(), [galaxy(450, 300)], 6);
  assert.equal(state.galaxies.get(-1).phase, 'infall');
  state = feed(state, [galaxy(450, 300)], 120, { x: 0, y: 0 });
  assert.equal(state.galaxies.has(-1), false);
  assert.equal(state.feasts, 0);
});

test('the shredding stream rides along with a moving hole', () => {
  let state = createBlackHole();
  while (state.galaxies.get(-1)?.phase !== 'shredding') state = feed(state, [galaxy(330, 300)], 1);
  const before = holeGalaxyCenter(state.galaxies.get(-1), center);
  const moved = { x: center.x + 80, y: center.y - 40 };
  state = feed(state, [galaxy(330, 300)], 1, moved);
  const after = holeGalaxyCenter(state.galaxies.get(-1), moved);
  assert.equal(state.galaxies.get(-1).phase, 'shredding');
  assert.ok(Math.abs(after.x - before.x - 80) < 1e-9 && Math.abs(after.y - before.y + 40) < 1e-9);
});

test('tidal disruption stretches, then winds every particle into the shadow with no pop', () => {
  const locals = Array.from({ length: 48 }, (_, index) => ({
    point: { x: Math.cos(index * 2.4) * (4 + index % 7 * 3), y: Math.sin(index * 2.4) * (4 + index % 5 * 3) },
    order: (index * 0.618034) % 1,
  }));
  const edge = { x: center.x + BLACK_HOLE_RADIUS, y: center.y, vx: 0, vy: 0, base: center, cycle: 0, phase: 'infall', age: 5 };
  for (const { point } of locals) {
    const particle = shredGalaxyParticle(edge, center, point, 0.5);
    assert.ok(Math.abs(particle.x - edge.x - point.x) < 1e-9 && Math.abs(particle.y - edge.y - point.y) < 1e-9,
      'no tidal stretch at the edge of reach');
  }
  const near = { ...edge, x: center.x + GALAXY_TIDAL_RADIUS + 1 };
  const radial = shredGalaxyParticle(near, center, { x: 10, y: 0 }, 0.5);
  const across = shredGalaxyParticle(near, center, { x: 0, y: 10 }, 0.5);
  assert.ok(Math.abs(radial.x - near.x) > 15, 'stretched along the fall');
  assert.ok(Math.abs(across.y - near.y) < 7, 'squeezed across it');
  assert.equal(radial.heat, 0);

  const offset = { x: GALAXY_TIDAL_RADIUS - 2, y: 9 };
  const lastInfall = { ...edge, x: center.x + offset.x, y: center.y + offset.y };
  const shredding = { ...edge, ...offset, phase: 'shredding', age: 0 };
  for (const { point, order } of locals) {
    const from = shredGalaxyParticle(lastInfall, center, point, order);
    const to = shredGalaxyParticle(shredding, center, point, order);
    assert.ok(Math.hypot(from.x - to.x, from.y - to.y) < 1e-9, 'infall hands over to shredding without a pop');
    assert.equal(to.alpha, 1);
    let previous = to;
    for (let age = 1 / 60; age <= GALAXY_SHRED_SECONDS + 1e-9; age += 1 / 60) {
      const particle = shredGalaxyParticle({ ...shredding, age }, center, point, order);
      assert.ok(Math.hypot(particle.x - previous.x, particle.y - previous.y) < 20, 'stream stays continuous');
      assert.ok(particle.heat >= previous.heat && particle.heat <= 1);
      previous = particle;
    }
    const end = shredGalaxyParticle({ ...shredding, age: GALAXY_SHRED_SECONDS }, center, point, order);
    assert.ok(Math.hypot(end.x - center.x, end.y - center.y) <= BLACK_HOLE_SHADOW_RADIUS);
    assert.equal(end.alpha, 0);
    assert.equal(end.heat, 1);
  }
});

test('renderer paints an opaque shadow at the pointer and leaves the canvas state balanced', () => {
  const calls = [];
  let depth = 0;
  let fillStyle = '';
  let composite = 'source-over';
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get: (_, key) => {
      if (key === 'fillStyle') return fillStyle;
      if (key === 'globalCompositeOperation') return composite;
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      return (...args) => {
        if (key === 'save') depth += 1;
        if (key === 'restore') depth -= 1;
        calls.push({ key, args, fillStyle, composite });
      };
    },
    set: (_, key, value) => {
      if (key === 'fillStyle') fillStyle = value;
      if (key === 'globalCompositeOperation') composite = value;
      return true;
    },
  });
  let state = createBlackHole();
  for (let i = 0; i < 240; i++) state = stepBlackHole(state,
    [source(380 + i * 0.03, 310), source(360, 250), source(340, 330)], center, 1 / 60);
  assert.ok(state.sparks.length + state.captures > 0);
  let shredding = createBlackHole();
  while (shredding.galaxies.get(-1)?.phase !== 'shredding') shredding = feed(shredding, [galaxy(330, 300)], 1);
  shredding = feed(shredding, [galaxy(330, 300)], 60);
  const feasting = { ...shredding, feasts: 1, feastAge: GALAXY_FEAST_SECONDS * 0.4, feastPower: 1 };
  const strokesBeyond = (radius) => calls.filter(({ key, args }) => key === 'arc' && args[2] > radius).length;
  for (const [scene, age] of [[state, 0], [state, BLACK_HOLE_OPEN_SECONDS / 2], [state, 4], [shredding, 4], [feasting, 4]]) {
    calls.length = 0;
    drawBlackHole(ctx, scene, center, { age, time: 12.5, flashAge: age === 4 ? 0.2 : Infinity });
    assert.equal(depth, 0);
    assert.deepEqual(calls.find(({ key }) => key === 'translate').args, [center.x, center.y]);
    const fills = calls.map((call, index) => ({ ...call, index })).filter(({ key }) => key === 'fill');
    const shadow = fills.find((call) => call.fillStyle === '#000' && call.composite === 'source-over');
    assert.ok(shadow, 'shadow occludes whatever is behind it');
    assert.deepEqual(calls[shadow.index - 1].args.slice(0, 3), [0, 0, BLACK_HOLE_SHADOW_RADIUS]);
    assert.equal(strokesBeyond(100) > 0, scene === feasting, 'only a feast reaches out toward the gravity edge');
  }
});
