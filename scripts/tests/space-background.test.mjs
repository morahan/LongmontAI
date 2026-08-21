import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AMBIENT_STAR_COUNT,
  CONSTELLATION_INTERVAL_SECONDS,
  CONSTELLATION_WINDOW_SECONDS,
  DESKTOP_TRAVELER_COUNT,
  FAR_DEPTH,
  MAX_PLANET_ORBIT_RADIUS,
  MOBILE_TRAVELER_COUNT,
  NEAR_DEPTH,
  PLANET_COUNT_BASIS_POINTS,
  SYSTEM_MAX_PROGRESS,
  SYSTEM_MIN_PROGRESS,
  TWINKLE_WINDOW_SECONDS,
  chooseWeightedPlanetCount,
  createAmbientLayout,
  createConstellationGeometry,
  createCryptoSeed,
  createPlanetSystem,
  createSeededRandom,
  createSpaceScene,
  getConstellationPhase,
  getDriftedStar,
  getElapsedSecondsSinceMount,
  getOrbitingPlanets,
  getPlanetSystemExtent,
  getSimulationTime,
  getStarPosition,
  getSystemSafetyMargin,
  getTravelerDepth,
  getTwinkleBrightness,
  isSystemCarrier,
  isSystemInViewport,
  projectTraveler,
  selectProminentSystem,
  starCountForWidth,
  travelerCountForWidth,
} from '../../src/components/spaceBackgroundModel.ts';

const closeTo = (actual, expected, epsilon = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);

const circularDistance = (left, right) => {
  const direct = Math.abs(left - right);
  return Math.min(direct, 1 - direct);
};

test('crypto seeding is preferred, falls back exactly once, and explicit scene seeds remain deterministic', () => {
  let cryptoCalls = 0;
  const fakeCrypto = {
    getRandomValues(words) {
      cryptoCalls += 1;
      words[0] = 0x12345678;
      words[1] = 0xabcdef01;
      return words;
    },
  };
  const seed = createCryptoSeed(fakeCrypto);
  assert.equal(cryptoCalls, 1);
  assert.equal(seed, (0x12345678 ^ Math.imul(0xabcdef01, 0x9e3779b1)) >>> 0);

  let fallbackCalls = 0;
  const fallback = createCryptoSeed(null, () => {
    fallbackCalls += 1;
    return 0.75;
  });
  assert.equal(fallbackCalls, 1);
  assert.equal(fallback, 0xc0000000);
  assert.deepEqual(createSpaceScene(seed), createSpaceScene(seed));
  assert.notDeepEqual(createSpaceScene(seed), createSpaceScene(seed + 1));
});

test('the exact reviewed planet-count CDF uses 10,000 basis points', () => {
  assert.deepEqual(PLANET_COUNT_BASIS_POINTS, [4000, 2200, 1300, 850, 550, 380, 260, 180, 120, 80, 50, 30]);
  assert.equal(PLANET_COUNT_BASIS_POINTS.reduce((sum, value) => sum + value, 0), 10000);
  let lower = 0;
  PLANET_COUNT_BASIS_POINTS.forEach((weight, index) => {
    const midpoint = (lower + weight / 2) / 10000;
    assert.equal(chooseWeightedPlanetCount(() => midpoint), index + 1);
    lower += weight;
    if (index < PLANET_COUNT_BASIS_POINTS.length - 1) {
      assert.equal(chooseWeightedPlanetCount(() => lower / 10000), index + 2);
    }
  });
  assert.equal(chooseWeightedPlanetCount(() => 0), 1);
  assert.equal(chooseWeightedPlanetCount(() => 0.999999999), 12);
});

test('100k deterministic samples match every reviewed planet percentage within tolerance', () => {
  const random = createSeededRandom(0x51a7c0de);
  const observed = Array(12).fill(0);
  for (let index = 0; index < 100000; index += 1) observed[chooseWeightedPlanetCount(random) - 1] += 1;
  PLANET_COUNT_BASIS_POINTS.forEach((basisPoints, index) => {
    const expected = basisPoints * 10;
    assert.ok(Math.abs(observed[index] - expected) <= 500,
      `count ${index + 1}: expected ${expected}, observed ${observed[index]}`);
  });
});

test('ambient stars are seeded 50/50 wrap/bounce linear drifters at reviewed speeds', () => {
  const stars = createAmbientLayout(12345, 0);
  assert.equal(stars.length, 72);
  assert.equal(starCountForWidth(320), AMBIENT_STAR_COUNT);
  assert.equal(starCountForWidth(1920), AMBIENT_STAR_COUNT);
  assert.equal(stars.filter((star) => star.driftMode === 'wrap').length, 36);
  assert.equal(stars.filter((star) => star.driftMode === 'bounce').length, 36);
  assert.ok(stars.every((star) => star.driftSpeed >= 0.0007 && star.driftSpeed <= 0.0017));

  const linear = { ...stars[0], x: 0.25, y: 0.4, driftMode: 'wrap', driftAngle: 0, driftSpeed: 0.001 };
  closeTo(getDriftedStar(linear, 100).x, 0.35);
  closeTo(getDriftedStar(linear, 100).y, 0.4);
  const wrap = { ...linear, x: 0.999 };
  closeTo(getDriftedStar(wrap, 2).x, 0.001);
  assert.ok(circularDistance(getDriftedStar(wrap, 0.999).x, getDriftedStar(wrap, 1.001).x) < 0.00001);
  const bounce = { ...linear, x: 0.999, driftMode: 'bounce' };
  closeTo(getDriftedStar(bounce, 2).x, 0.999);
  closeTo(getDriftedStar(bounce, 1).x, 1);
  assert.ok(Math.abs(getDriftedStar(bounce, 0.999).x - getDriftedStar(bounce, 1.001).x) < 0.00001);
});

test('twinkles are independent random events with 40-60% minima in every <=120s cycle', () => {
  const stars = createAmbientLayout(6789, 0);
  assert.equal(TWINKLE_WINDOW_SECONDS, 120);
  for (let cycle = 0; cycle < 4; cycle += 1) {
    const samples = Array.from({ length: TWINKLE_WINDOW_SECONDS * 20 }, (_, index) =>
      getTwinkleBrightness(stars[0], cycle * TWINKLE_WINDOW_SECONDS + index / 20));
    const minimum = Math.min(...samples);
    assert.ok(minimum >= 0.4 && minimum <= 0.6, `cycle ${cycle} minimum ${minimum}`);
    assert.ok(samples.some((value) => value === 1));
    assert.ok(samples.some((value) => value < 0.99));
  }
  const simultaneous = stars.map((star) => getTwinkleBrightness(star, 47).toFixed(5));
  assert.ok(new Set(simultaneous).size > 3, 'twinkle events synchronized');
  for (const time of [600, 605, 610, 619.9, 620, 625, 629.9, 1200]) {
    assert.ok(stars.every((star) => getTwinkleBrightness(star, time) === 1));
  }
});

test('constellation phases and frozen simulation clocks have exact boundaries', () => {
  assert.equal(getConstellationPhase(599.999).name, 'ambient');
  assert.equal(getConstellationPhase(600).name, 'morph-in');
  closeTo(getConstellationPhase(605).progress, 0.5);
  assert.equal(getConstellationPhase(610).name, 'hold');
  assert.equal(getConstellationPhase(620).name, 'morph-out');
  closeTo(getConstellationPhase(625).progress, 0.5);
  assert.equal(getConstellationPhase(630).name, 'ambient');
  assert.equal(getConstellationPhase(1200).name, 'morph-in');
  assert.equal(CONSTELLATION_INTERVAL_SECONDS, 600);
  assert.equal(CONSTELLATION_WINDOW_SECONDS, 30);
  for (const [wall, simulation] of [[599, 599], [600, 600], [620, 600], [630, 600], [631, 601], [1200, 1170], [1230, 1170]]) {
    closeTo(getSimulationTime(wall), simulation);
  }
});

test('monotonic elapsed time includes long RAF gaps while reduced motion can render time zero', () => {
  closeTo(getElapsedSecondsSinceMount(1000, 1000), 0);
  closeTo(getElapsedSecondsSinceMount(1000, 601000), 600);
  closeTo(getElapsedSecondsSinceMount(1000, 631000), 630);
  closeTo(getElapsedSecondsSinceMount(2000, 1000), 0);
});

test('LONGMONT AI has 72 unique legible anchors and faint-line adjacency geometry', () => {
  const { points, edges } = createConstellationGeometry(1200, 600);
  assert.equal(points.length, 72);
  assert.equal(new Set(points.map(({ x, y }) => `${x},${y}`)).size, 72);
  assert.ok(points.every(({ x, y }) => x > 0 && x < 1200 && y > 0 && y < 600));
  assert.ok(edges.length >= 45);
  assert.ok(edges.every(({ from, to }) => from >= 0 && to < 72 && from !== to));
  const uniqueX = [...new Set(points.map(({ x }) => x))].sort((left, right) => left - right);
  const cell = Math.min(...uniqueX.slice(1).map((x, index) => x - uniqueX[index]));
  const minimumX = uniqueX[0];
  const occupiedCharacterBands = new Set(points.map(({ x }) =>
    Math.floor(Math.round((x - minimumX) / cell) / 4)));
  assert.deepEqual([...occupiedCharacterBands].sort((left, right) => left - right), [0, 1, 2, 3, 4, 5, 6, 7, 9, 10]);
});

test('morph boundaries are continuous and morph-out lands on a newly seeded star field', () => {
  const width = 1200;
  const height = 600;
  const seed = 777;
  const targets = createConstellationGeometry(width, height).points;
  for (let index = 0; index < 72; index += 1) {
    assert.deepEqual(getStarPosition(seed, index, 610, width, height), targets[index]);
    assert.deepEqual(getStarPosition(seed, index, 619.9, width, height), targets[index]);
    const boundary = getStarPosition(seed, index, 600, width, height);
    const before = getStarPosition(seed, index, 599.999999, width, height);
    assert.ok(Math.hypot(boundary.x - before.x, boundary.y - before.y) < 0.001);
    const after = getStarPosition(seed, index, 630, width, height);
    const regenerated = getDriftedStar(createAmbientLayout(seed, 1)[index], 0);
    closeTo(after.x, regenerated.x * width);
    closeTo(after.y, regenerated.y * height);
  }
  assert.notDeepEqual(createAmbientLayout(seed, 0), createAmbientLayout(seed, 1));
});

test('only the deterministic minority of travelers can carry visible systems', () => {
  const scene = createSpaceScene(9876);
  const carrierIndices = scene.travelers.map((traveler, index) =>
    isSystemCarrier(traveler, index) ? index : -1).filter((index) => index >= 0);
  assert.deepEqual(carrierIndices, [2, 8, 14]);
  assert.equal(scene.travelers.slice(0, MOBILE_TRAVELER_COUNT)
    .filter((traveler, index) => isSystemCarrier(traveler, index)).length, 2);

  const projections = scene.travelers.map((_, index) => ({
    x: 500,
    y: 300,
    depth: 400,
    progress: SYSTEM_MIN_PROGRESS + index * 0.02,
    radius: 1,
    opacity: 0.6,
    cycle: 0,
  }));
  assert.equal(selectProminentSystem(scene.travelers, projections, 1000, 600), 14);
});

test('systems independently cap at two moons and two rings and use compact stratified radii', () => {
  let sawTwoOfEach = false;
  for (let seed = 1; seed <= 10000; seed += 1) {
    const planets = createPlanetSystem(seed, 0);
    const moons = planets.reduce((total, planet) => total + planet.moons.length, 0);
    const rings = planets.filter((planet) => planet.hasRing).length;
    assert.ok(moons <= 2, `seed ${seed} generated ${moons} moons`);
    assert.ok(rings <= 2, `seed ${seed} generated ${rings} rings`);
    assert.ok(planets.every((planet) => planet.orbitRadius < MAX_PLANET_ORBIT_RADIUS));
    if (moons === 2 && rings === 2) sawTwoOfEach = true;
  }
  assert.equal(sawTwoOfEach, true);
  assert.notDeepEqual(createPlanetSystem(0xface, 4), createPlanetSystem(0xface, 5));
});

test('system safety margins are exact, uncapped, and include bodies, moons, and rings', () => {
  const planets = [{
    orbitRadius: 20,
    radius: 2,
    phase: 0,
    speed: 1,
    inclination: 0.4,
    tilt: 0,
    color: '#fff',
    moons: [{ radius: 0.4, orbitRadius: 4.5, phase: 0, speed: 1 }],
    hasRing: true,
  }];
  closeTo(getPlanetSystemExtent(planets), 24.9);
  const traveler = createSpaceScene(44).travelers[2];
  const projection = { x: 200, y: 200, depth: 300, progress: 0.8, radius: 2, opacity: 0.5, cycle: 0 };
  const expected = getPlanetSystemExtent(createPlanetSystem(traveler.seed, 0)) * (0.48 + 0.8 * 1.08) + 0.5;
  closeTo(getSystemSafetyMargin(traveler, projection), expected);
});

test('desktop and mobile visibility sweeps select only nearest eligible in-bounds carriers', () => {
  const scene = createSpaceScene(9876);
  for (const { width, height, count } of [
    { width: 1440, height: 800, count: DESKTOP_TRAVELER_COUNT },
    { width: 390, height: 844, count: MOBILE_TRAVELER_COUNT },
  ]) {
    const travelers = scene.travelers.slice(0, count);
    for (let elapsed = 0; elapsed < 900; elapsed += 0.5) {
      const projections = travelers.map((traveler) => projectTraveler(traveler, elapsed, width, height));
      const eligible = travelers.map((traveler, index) => ({ traveler, projection: projections[index], index }))
        .filter(({ traveler, projection, index }) =>
          isSystemCarrier(traveler, index) &&
          projection.progress >= SYSTEM_MIN_PROGRESS &&
          projection.progress <= SYSTEM_MAX_PROGRESS &&
          isSystemInViewport(traveler, projection, width, height))
        .sort((left, right) => right.projection.progress - left.projection.progress);
      const selected = selectProminentSystem(travelers, projections, width, height);
      assert.equal(selected, eligible[0]?.index ?? -1, `${width}x${height} at ${elapsed}`);
      if (selected >= 0) assert.equal(isSystemInViewport(travelers[selected], projections[selected], width, height), true);
    }
  }
});

test('planets orbit on tilted ellipses in painter-sorted z order and travelers stay depth-bounded', () => {
  const planets = createPlanetSystem(2468, 2);
  const start = getOrbitingPlanets(planets, 100);
  const later = getOrbitingPlanets(planets, 101);
  assert.ok(start.every((planet, index) => index === 0 || start[index - 1].z <= planet.z));
  assert.ok(start.some((planet) => {
    const moved = later.find((candidate) => candidate.phase === planet.phase && candidate.orbitRadius === planet.orbitRadius);
    return moved && Math.hypot(moved.x - planet.x, moved.y - planet.y) > 0.001;
  }));
  const traveler = createSpaceScene(42).travelers[0];
  assert.equal(travelerCountForWidth(390), MOBILE_TRAVELER_COUNT);
  assert.equal(travelerCountForWidth(1200), DESKTOP_TRAVELER_COUNT);
  for (let elapsed = 0; elapsed < 1000; elapsed += 0.37) {
    const { depth } = getTravelerDepth(traveler, elapsed);
    assert.ok(depth >= NEAR_DEPTH && depth <= FAR_DEPTH);
  }
});
