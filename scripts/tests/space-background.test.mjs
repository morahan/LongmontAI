import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AMBIENT_STAR_COUNT,
  CONSTELLATION_INTERVAL_SECONDS,
  CONSTELLATION_WINDOW_SECONDS,
  DESKTOP_TRAVELER_COUNT,
  FAR_DEPTH,
  MOBILE_TRAVELER_COUNT,
  NEAR_DEPTH,
  createAmbientLayout,
  createConstellationTargets,
  createCryptoSeed,
  createPlanetSystem,
  createSeededRandom,
  createSpaceScene,
  getConstellationPhase,
  getDriftedStar,
  getOrbitingPlanets,
  getSimulationTime,
  getStarPosition,
  getTravelerDepth,
  getTwinkleBrightness,
  projectTraveler,
  starCountForWidth,
  travelerCountForWidth,
} from '../../src/components/spaceBackgroundModel.ts';

const closeTo = (actual, expected, epsilon = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);

test('a refresh seed comes from Web Crypto and deterministic seeds reproduce all scene state', () => {
  let calls = 0;
  const fakeCrypto = {
    getRandomValues(words) {
      calls += 1;
      words[0] = 0x12345678;
      words[1] = 0xabcdef01;
      return words;
    },
  };
  const seed = createCryptoSeed(fakeCrypto);
  assert.equal(calls, 1);
  assert.equal(seed, (0x12345678 ^ Math.imul(0xabcdef01, 0x9e3779b1)) >>> 0);
  assert.deepEqual(createSpaceScene(seed), createSpaceScene(seed));
  assert.notDeepEqual(createSpaceScene(seed), createSpaceScene(seed + 1));
});

test('every viewport receives exactly 72 bounded, slow-drifting, independently twinkling stars', () => {
  const stars = createAmbientLayout(12345, 0);
  assert.equal(stars.length, AMBIENT_STAR_COUNT);
  assert.equal(starCountForWidth(320), 72);
  assert.equal(starCountForWidth(1920), 72);
  assert.ok(stars.every((star) =>
    star.x >= 0.025 && star.x <= 0.975 &&
    star.y >= 0.025 && star.y <= 0.975 &&
    star.driftPeriod >= 90 && star.driftPeriod <= 240 &&
    star.driftRadiusX <= 0.012 && star.driftRadiusY <= 0.01
  ));

  for (const star of stars) {
    for (let second = 0; second <= 480; second += 3) {
      const point = getDriftedStar(star, second);
      assert.ok(Math.abs(point.x - star.x) <= star.driftRadiusX + 1e-12);
      assert.ok(Math.abs(point.y - star.y) <= star.driftRadiusY + 1e-12);
      const brightness = getTwinkleBrightness(star, second);
      assert.ok(brightness >= 0.62 && brightness <= 1);
    }
  }
  const simultaneous = stars.map((star) => getTwinkleBrightness(star, 7).toFixed(5));
  assert.ok(new Set(simultaneous).size > 50, 'twinkles should not synchronize');
});

test('constellation phase boundaries are exact at 600, 1200, and every later interval', () => {
  assert.deepEqual(getConstellationPhase(599.999).name, 'ambient');
  assert.deepEqual(getConstellationPhase(600).name, 'morph-in');
  closeTo(getConstellationPhase(605).progress, 0.5);
  assert.equal(getConstellationPhase(610).name, 'hold');
  assert.equal(getConstellationPhase(619.999).name, 'hold');
  assert.equal(getConstellationPhase(620).name, 'morph-out');
  closeTo(getConstellationPhase(625).progress, 0.5);
  assert.equal(getConstellationPhase(630).name, 'ambient');
  assert.equal(getConstellationPhase(1200).name, 'morph-in');
  assert.equal(getConstellationPhase(1810).name, 'hold');
  assert.equal(CONSTELLATION_WINDOW_SECONDS, 30);
  assert.equal(CONSTELLATION_INTERVAL_SECONDS, 600);
});

test('traveler and planet simulation time freezes for each full 30 second lifecycle', () => {
  closeTo(getSimulationTime(599), 599);
  closeTo(getSimulationTime(600), 600);
  closeTo(getSimulationTime(609), 600);
  closeTo(getSimulationTime(620), 600);
  closeTo(getSimulationTime(630), 600);
  closeTo(getSimulationTime(631), 601);
  closeTo(getSimulationTime(1199), 1169);
  closeTo(getSimulationTime(1200), 1170);
  closeTo(getSimulationTime(1230), 1170);
  closeTo(getSimulationTime(1231), 1171);
});

test('all 72 stars morph into bounded LONGMONT AI targets then out to a regenerated layout', () => {
  const width = 1200;
  const height = 600;
  const seed = 777;
  const targets = createConstellationTargets(width, height);
  assert.equal(targets.length, 72);
  assert.ok(targets.every(({ x, y }) => x > 0 && x < width && y > 0 && y < height));
  assert.ok(new Set(targets.map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`)).size >= 68);

  for (let index = 0; index < 72; index += 1) {
    assert.deepEqual(getStarPosition(seed, index, 610, width, height), targets[index]);
    assert.deepEqual(getStarPosition(seed, index, 619.9, width, height), targets[index]);
    const before = getStarPosition(seed, index, 600, width, height);
    const continuous = getStarPosition(seed, index, 599.999999, width, height);
    closeTo(before.x, continuous.x, 0.0001);
    closeTo(before.y, continuous.y, 0.0001);
    const after = getStarPosition(seed, index, 630, width, height);
    const generated = createAmbientLayout(seed, 1)[index];
    const drifted = getDriftedStar(generated, 0);
    closeTo(after.x, drifted.x * width);
    closeTo(after.y, drifted.y * height);
  }
  assert.notDeepEqual(createAmbientLayout(seed, 0), createAmbientLayout(seed, 1));
});

test('weighted systems cover 1-12 planets and never exceed two moons plus rings', () => {
  const counts = new Map();
  for (let seed = 1; seed <= 5000; seed += 1) {
    const planets = createPlanetSystem(seed, 0);
    counts.set(planets.length, (counts.get(planets.length) ?? 0) + 1);
    assert.ok(planets.length >= 1 && planets.length <= 12);
    const accessories = planets.reduce(
      (total, planet) => total + planet.moons.length + Number(planet.hasRing),
      0,
    );
    assert.ok(accessories <= 2, `seed ${seed} generated ${accessories} accessories`);
    assert.ok(planets.every((planet) => planet.moons.length <= 1));
  }
  assert.deepEqual([...counts.keys()].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.ok(counts.get(5) > counts.get(12) * 8, 'planet counts should follow weights, not uniform choice');
});

test('planet systems regenerate deterministically per traveler lifecycle cycle', () => {
  const first = createPlanetSystem(0xface, 4);
  assert.deepEqual(first, createPlanetSystem(0xface, 4));
  assert.notDeepEqual(first, createPlanetSystem(0xface, 5));
});

test('planets truly orbit and are painter-sorted from negative to positive z', () => {
  const planets = createPlanetSystem(2468, 2);
  const start = getOrbitingPlanets(planets, 100);
  const later = getOrbitingPlanets(planets, 101);
  assert.equal(start.length, planets.length);
  assert.ok(start.every((planet, index) => index === 0 || start[index - 1].z <= planet.z));
  assert.ok(start.every((planet) => {
    const localX = planet.x * Math.cos(planet.tilt) + planet.y * Math.sin(planet.tilt);
    const localY = -planet.x * Math.sin(planet.tilt) + planet.y * Math.cos(planet.tilt);
    return Math.abs(
      (localX ** 2) / (planet.orbitRadius ** 2) +
      (localY ** 2) / ((planet.orbitRadius * planet.inclination) ** 2) - 1,
    ) < 1e-8;
  }));
  assert.ok(start.some((planet) => {
    const moved = later.find((candidate) => candidate.phase === planet.phase && candidate.orbitRadius === planet.orbitRadius);
    return moved && Math.hypot(moved.x - planet.x, moved.y - planet.y) > 0.001;
  }));
});

test('travelers stay depth-bounded, project reciprocally, and retain responsive counts', () => {
  const scene = createSpaceScene(42);
  const traveler = scene.travelers[0];
  assert.equal(scene.travelers.length, DESKTOP_TRAVELER_COUNT);
  assert.equal(travelerCountForWidth(390), MOBILE_TRAVELER_COUNT);
  assert.equal(travelerCountForWidth(1200), DESKTOP_TRAVELER_COUNT);
  for (let elapsed = 0; elapsed < 1000; elapsed += 0.37) {
    const { depth } = getTravelerDepth(traveler, elapsed);
    assert.ok(depth >= NEAR_DEPTH && depth <= FAR_DEPTH);
  }

  const laneStableTraveler = { ...traveler, initialDistance: 100, speed: 1 };
  const far = projectTraveler(laneStableTraveler, 0, 1000, 600);
  const near = projectTraveler({ ...laneStableTraveler, initialDistance: 760 }, 0, 1000, 600);
  assert.ok(Math.hypot(near.x - 500, near.y - 270) > Math.hypot(far.x - 500, far.y - 270));
  assert.ok(near.radius > far.radius);
});

test('seeded random values remain in the half-open unit interval', () => {
  const random = createSeededRandom(0xffffffff);
  for (let index = 0; index < 10000; index += 1) {
    const value = random();
    assert.ok(value >= 0 && value < 1);
  }
});
