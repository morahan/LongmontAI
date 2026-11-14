import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACK_HOLE_RADIUS, BLACK_HOLE_MAX_STARS, BLACK_HOLE_MAX_SPARKS, BLACK_HOLE_MAX_DELTA,
  BLACK_HOLE_SHADOW_RADIUS, BLACK_HOLE_DISK_TILT, FEAST_RIPPLE_PX, GALAXY_FEAST_SECONDS,
  GALAXY_SHRED_SECONDS, GALAXY_TIDAL_RADIUS,
  advanceHoleBody, boundedHoleDelta, createBlackHole, createHawkingJets, feastRipple, holeAcceleration,
  galaxyFeastPower, galaxyTide, holeGalaxyCenter, holeTravelerRole, lensRadius, shredGalaxyParticle,
  stepBlackHole,
} from '../../src/components/blackHoleModel.ts';
import {
  BLACK_HOLE_OPEN_SECONDS, drawBlackHole,
} from '../../src/components/blackHoleRenderer.ts';

const center = { x: 300, y: 300 };
const source = (x, y, visible = true) => ({ x, y, visible });
const galaxy = (x, y, { cycle = 0, visible = true, id = -1, radius = 25, progress = 0.5, opacity = 0.6 } = {}) =>
  ({ x, y, id, cycle, visible, radius, progress, opacity });
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
  // A traveler near enough to read as a world passes in front instead of falling in; galaxies still fall.
  assert.equal(holeTravelerRole('star', false, true), 'ignored');
  assert.equal(holeTravelerRole('galaxy', false, true), 'galaxy');
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

test('every finale is grand, scales with galaxy size, and a speck cannot cut a big feast short', () => {
  for (let radius = 0; radius <= 60; radius += 0.5) {
    assert.ok(galaxyFeastPower(radius) >= 0.6 && galaxyFeastPower(radius) <= 1, `radius ${radius}`);
    assert.ok(galaxyFeastPower(radius + 0.5) >= galaxyFeastPower(radius));
  }
  assert.ok(galaxyFeastPower(9.5) > 0.6 && galaxyFeastPower(9.5) < 0.75);
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

const locals = Array.from({ length: 48 }, (_, index) => ({
  point: { x: Math.cos(index * 2.4) * (2 + index % 7 * 1.2), y: Math.sin(index * 2.4) * (2 + index % 5 * 1.2) },
  jitter: (index * 0.618034) % 1,
}));
const speck = { x: center.x + BLACK_HOLE_RADIUS, y: center.y, vx: 0, vy: 0, cycle: 0, radius: 9.5, phase: 'infall', age: 5 };
const shredAt = (offset) => ({ ...speck, ...offset, phase: 'shredding', age: 0 });
const holeRadius = (point) => Math.hypot(point.x - center.x, point.y - center.y);

test('tides grow steeply with proximity: stretched along the fall, squeezed across it', () => {
  for (const { point } of locals) {
    const particle = shredGalaxyParticle(speck, center, point, 0.5);
    assert.ok(Math.abs(particle.x - speck.x - point.x) < 1e-9 && Math.abs(particle.y - speck.y - point.y) < 1e-9,
      'no tidal stretch at the edge of reach');
  }
  assert.equal(galaxyTide(BLACK_HOLE_RADIUS), 0);
  assert.ok(galaxyTide(GALAXY_TIDAL_RADIUS) > 0.99);
  assert.ok(galaxyTide(100) > 4 * galaxyTide(150), 'inverse-cube tide, not a linear ramp');
  const near = { ...speck, x: center.x + GALAXY_TIDAL_RADIUS + 1 };
  const radial = shredGalaxyParticle(near, center, { x: 8, y: 0 }, 0.5);
  const across = shredGalaxyParticle(near, center, { x: 0, y: 8 }, 0.5);
  assert.ok(Math.abs(radial.x - near.x) > 18, 'stretched along the fall');
  assert.ok(Math.abs(across.y - near.y) < 4.5, 'squeezed across it');
  const fresh = shredGalaxyParticle({ ...near, age: 0 }, center, { x: 8, y: 0 }, 0.5);
  assert.ok(Math.abs(fresh.x - near.x - 8) < 1e-9, 'a just-acquired galaxy eases into its tides');
});

test('shredding hands over without a pop, unspools into a lensed stream, and every particle crosses the horizon', () => {
  const offset = { x: GALAXY_TIDAL_RADIUS - 2, y: 9 };
  const lastInfall = { ...speck, x: center.x + offset.x, y: center.y + offset.y };
  const shredding = shredAt(offset);
  for (const { point, jitter } of locals) {
    const from = shredGalaxyParticle(lastInfall, center, point, jitter);
    const to = shredGalaxyParticle(shredding, center, point, jitter);
    assert.ok(Math.hypot(from.x - to.x, from.y - to.y) < 1e-9, 'infall hands over to shredding without a pop');
    assert.equal(to.alpha, 1);
    assert.equal(to.heat, from.heat);
    let previous = to;
    for (let age = 1 / 60; age <= GALAXY_SHRED_SECONDS + 1e-9; age += 1 / 60) {
      const particle = shredGalaxyParticle({ ...shredding, age }, center, point, jitter);
      if (particle.alpha > 0.02 && previous.alpha > 0.02) {
        assert.ok(Math.hypot(particle.x - previous.x, particle.y - previous.y) < 20, 'visible stream stays continuous');
        assert.ok(Math.hypot(particle.x - particle.tail.x, particle.y - particle.tail.y) < 60, 'streaks stay bounded');
      }
      assert.ok(particle.heat >= previous.heat - 1e-12 && particle.heat <= 1, 'matter only heats up');
      if (particle.alpha > 0.02 && !particle.front) {
        assert.ok(holeRadius(particle) > BLACK_HOLE_SHADOW_RADIUS, 'visible matter behind the hole is lensed around the shadow');
      }
      previous = particle;
    }
    const end = shredGalaxyParticle({ ...shredding, age: GALAXY_SHRED_SECONDS }, center, point, jitter);
    assert.ok(holeRadius(end) <= BLACK_HOLE_SHADOW_RADIUS * 1.2);
    assert.equal(end.alpha, 0);
    assert.equal(end.heat, 1);
    assert.deepEqual(end, shredGalaxyParticle({ ...shredding, phase: 'consumed', age: 7 }, center, point, jitter));
  }

  const nearSide = { x: -8, y: 0 };
  const farSide = { x: 8, y: 0 };
  const early = { ...shredding, age: GALAXY_SHRED_SECONDS * 0.25 };
  assert.ok(shredGalaxyParticle(early, center, nearSide, 0.5).heat
    > shredGalaxyParticle(early, center, farSide, 0.5).heat, 'near-side matter is stripped first');
  const releaseRadius = holeRadius(shredGalaxyParticle({ ...shredding, age: GALAXY_SHRED_SECONDS * 0.4 }, center, farSide, 0.5));
  const flung = Math.max(...Array.from({ length: 60 }, (_, step) => holeRadius(shredGalaxyParticle(
    { ...shredding, age: GALAXY_SHRED_SECONDS * (0.4 + step / 100) }, center, farSide, 0.5))));
  assert.ok(flung > releaseRadius + 10, 'far-side matter is flung outward before it falls back');

  const mid = { ...shredding, age: GALAXY_SHRED_SECONDS * 0.55 };
  const angles = locals.map(({ point, jitter }) => shredGalaxyParticle(mid, center, point, jitter))
    .filter((particle) => particle.alpha > 0.05)
    .map((particle) => Math.atan2(particle.y - center.y, particle.x - center.x))
    .sort((a, b) => a - b);
  const gaps = angles.map((angle, index) => (angles[(index + 1) % angles.length] - angle + Math.PI * 2) % (Math.PI * 2));
  assert.ok(Math.PI * 2 - Math.max(...gaps) > Math.PI * 0.8, 'the stream wraps a good part of a turn at once');
  const late = shredGalaxyParticle({ ...shredding, age: GALAXY_SHRED_SECONDS * 0.95 }, center, farSide, 0.9);
  assert.ok(late.heat > 0.9);
  assert.ok(Math.hypot(late.x - late.tail.x, late.y - late.tail.y) > 3, 'inner matter streaks');
  const cold = locals.map(({ point, jitter }) => shredGalaxyParticle(mid, center, point, jitter));
  assert.deepEqual(cold, locals.map(({ point, jitter }) => shredGalaxyParticle(mid, center, point, jitter)), 'deterministic');
});

test('the stream beams like the disk: approaching left limb bright, receding right limb dim', () => {
  const shredding = { ...shredAt({ x: GALAXY_TIDAL_RADIUS - 2, y: 0 }), age: GALAXY_SHRED_SECONDS * 0.9 };
  const particles = locals.map(({ point, jitter }) => shredGalaxyParticle(shredding, center, point, jitter))
    .filter((particle) => particle.alpha > 0.05);
  const tilt = (particle) => (particle.x - center.x) * Math.cos(BLACK_HOLE_DISK_TILT)
    + (particle.y - center.y) * Math.sin(BLACK_HOLE_DISK_TILT);
  for (const particle of particles) {
    if (tilt(particle) < -8) assert.ok(particle.beaming > 1);
    if (tilt(particle) > 8) assert.ok(particle.beaming < 1);
  }
});

test('the point lens never images matter inside the shadow and fades to no bending far out', () => {
  let previous = -Infinity;
  for (let radius = 0; radius <= 400; radius += 0.25) {
    const imaged = lensRadius(radius);
    assert.ok(imaged > BLACK_HOLE_SHADOW_RADIUS && imaged >= radius && imaged > previous);
    previous = imaged;
  }
  assert.ok(lensRadius(400) - 400 < 1);
});

test('any visible galaxy whose centre enters the radius is swallowed exactly once, even drifting outward', () => {
  const drift = 30;
  for (let ring = 0; ring <= 12; ring++) {
    const radius = ring === 12 ? BLACK_HOLE_RADIUS - 0.5 : ring * 15;
    for (let spoke = 0; spoke < 12; spoke++) {
      const angle = spoke * Math.PI / 6 + ring * 0.37;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      let state = createBlackHole();
      let consumedAt = null;
      for (let frame = 0; frame < 60 * 9; frame++) {
        const out = radius + drift * frame / 60;
        state = stepBlackHole(state, [], center, 1 / 60,
          [galaxy(center.x + direction.x * out, center.y + direction.y * out, { radius: 9.5 })]);
        if (consumedAt === null && state.galaxies.get(-1)?.phase === 'consumed') consumedAt = frame / 60;
      }
      assert.ok(consumedAt !== null && consumedAt < 7, `radius ${radius} spoke ${spoke} consumed at ${consumedAt}`);
      assert.equal(state.feasts, 1, `radius ${radius} spoke ${spoke} feasts once`);
    }
  }
});

test('the space-time ripple is idle without a finale, bounded, travels out, and decays', () => {
  const idle = createBlackHole();
  const point = { x: 520, y: 300, extra: 'kept' };
  assert.equal(feastRipple(idle, center, point), point);
  assert.equal(feastRipple({ ...idle, feastAge: GALAXY_FEAST_SECONDS, feastPower: 1 }, center, point), point);
  for (const power of [0.6, 1]) {
    const peaks = [];
    for (let age = 0; age < GALAXY_FEAST_SECONDS; age += 0.1) {
      const state = { ...idle, feastAge: age, feastPower: power };
      let peak = 0;
      let at = 0;
      for (let distance = 0; distance <= 1200; distance += 2) {
        const moved = feastRipple(state, center, { x: center.x + distance, y: center.y });
        assert.ok(Math.abs(moved.y - center.y) < 1e-9, 'displacement is radial');
        const push = Math.abs(moved.x - center.x - distance);
        assert.ok(push <= FEAST_RIPPLE_PX * power + 1e-9);
        if (push > peak) { peak = push; at = distance; }
      }
      peaks.push({ peak, at });
    }
    assert.ok(peaks[0].peak > 0.8 * FEAST_RIPPLE_PX * power, 'the shock is strong at first');
    assert.ok(peaks.at(-1).at > 600, 'the ripple crosses several hundred px');
    assert.ok(peaks.at(-1).peak < peaks[0].peak * 0.1, 'the ripple decays');
  }
  const playing = { ...idle, feastAge: 0.4, feastPower: 1 };
  const snapshot = structuredClone(playing);
  const moved = feastRipple(playing, center, point);
  assert.equal(moved.extra, 'kept');
  assert.deepEqual(playing, snapshot, 'display only: physics state is untouched');
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

test('a captured galaxy is finished even if its source fades out or recycles mid-fall', () => {
  // Near galaxies cross the hole fast and leave the scene within seconds of capture.
  for (const leave of ['fade', 'recycle']) {
    for (const startDistance of [60, 120, 180]) {
      let state = stepBlackHole(createBlackHole(), [], center, 1 / 60,
        [galaxy(center.x + startDistance, center.y, { progress: 0.8, opacity: 0.7 })]);
      const captured = state.galaxies.get(-1);
      assert.equal(captured.phase, 'infall');
      let phases = new Set();
      for (let frame = 1; frame < 60 * 12; frame += 1) {
        // The source races off screen, then fades or starts a new lifecycle far away.
        const gone = frame > 30;
        const source = gone && leave === 'recycle'
          ? galaxy(center.x + 900, center.y + 500, { cycle: 1, progress: 0, opacity: 0 , visible: false })
          : galaxy(center.x + startDistance + frame * 2, center.y, { visible: !gone, progress: 0.99, opacity: 0.01 });
        state = stepBlackHole(state, [], center, 1 / 60, [source]);
        const now = state.galaxies.get(-1);
        if (now) {
          phases.add(now.phase);
          // The look is frozen at capture, not dragged along by the departing source.
          assert.equal(now.progress, 0.8);
          assert.equal(now.opacity, 0.7);
          assert.equal(now.cycle, 0);
        }
      }
      const label = `${leave} from ${startDistance}px`;
      assert.equal(state.feasts, 1, label);
      assert.ok(phases.has('shredding'), label);
      // A faded source of the same lifecycle stays swallowed; a recycled one is free to return.
      assert.equal(state.galaxies.get(-1)?.phase, leave === 'fade' ? 'consumed' : undefined, label);
    }
  }
});
