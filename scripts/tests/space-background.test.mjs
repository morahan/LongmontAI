import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AMBIENT_STAR_COUNT,
  AMBIENT_STAR_RGB,
  CONSTELLATION_INTERVAL_SECONDS,
  CONSTELLATION_STAR_COUNT,
  CONSTELLATION_STAR_RGB,
  CONSTELLATION_WINDOW_SECONDS,
  DESKTOP_TRAVELER_COUNT,
  FAR_DEPTH,
  MAX_PLANET_ORBIT_PERIOD_SECONDS,
  MAX_PLANET_ORBIT_RADIUS,
  MIN_PLANET_ORBIT_PERIOD_SECONDS,
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
  getConstellationStrength,
  getDriftedStar,
  getElapsedSecondsSinceMount,
  getOrbitingPlanet,
  getOrbitingPlanets,
  getPlanetOrbitPeriod,
  getPlanetSystemExtent,
  getSimulationTime,
  getStarFieldStyles,
  getStarPosition,
  getStarRgb,
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

test('exactly 50 ambient stars remain visible while all 72 seeded positions are retained', () => {
  const stars = createAmbientLayout(12345, 0);
  assert.equal(AMBIENT_STAR_COUNT, 50);
  assert.equal(CONSTELLATION_STAR_COUNT, 72);
  assert.equal(stars.length, CONSTELLATION_STAR_COUNT);
  assert.equal(starCountForWidth(320), 50);
  assert.equal(starCountForWidth(1920), 50);
  assert.equal(getStarFieldStyles(12345, 47).filter(({ opacity }) => opacity > 0).length, 50);
  assert.equal(stars.filter((star) => star.driftMode === 'wrap').length, 36);
  assert.equal(stars.filter((star) => star.driftMode === 'bounce').length, 36);
  assert.ok(stars.every((star) => star.driftSpeed >= 0.0007 && star.driftSpeed <= 0.0017));
  assert.ok(stars.every((star) => star.alpha >= 0.28 && star.alpha <= 0.68));

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

test('LONGMONT AI has 72 unique, connected glyph anchors in the clear top band', () => {
  for (const { width, height } of [{ width: 1200, height: 600 }, { width: 390, height: 360 }]) {
    const { points, edges, glyphs } = createConstellationGeometry(width, height);
    assert.equal(points.length, 72);
    assert.equal(new Set(points.map(({ x, y }) => `${x},${y}`)).size, 72);
    assert.equal(glyphs.map(({ character }) => character).join(''), 'LONGMONTAI');
    assert.ok(points.every(({ x, y }) => x > 0 && x < width && y >= height * 0.03 && y < height * 0.16));
    const constellationWidth = Math.max(...points.map(({ x }) => x)) - Math.min(...points.map(({ x }) => x));
    assert.ok(constellationWidth <= width * 0.76);
    assert.ok(edges.every(({ from, to }) => from >= 0 && to < 72 && from !== to));

    const neighbors = Array.from({ length: 72 }, () => []);
    edges.forEach(({ from, to }) => {
      neighbors[from].push(to);
      neighbors[to].push(from);
    });
    assert.ok(neighbors.every((entries) => entries.length > 0), 'an isolated anchor remains');
    glyphs.forEach(({ character, indices }) => {
      const allowed = new Set(indices);
      const reached = new Set([indices[0]]);
      const queue = [indices[0]];
      while (queue.length > 0) {
        neighbors[queue.shift()].forEach((neighbor) => {
          if (allowed.has(neighbor) && !reached.has(neighbor)) {
            reached.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
      assert.equal(reached.size, indices.length, `${character} is not one connected component`);
    });
  }
});

test('constellation strength and pure star styles are continuous at every phase boundary', () => {
  assert.equal(getConstellationStrength(getConstellationPhase(600)), 0);
  assert.equal(getConstellationStrength(getConstellationPhase(610)), 1);
  assert.equal(getConstellationStrength(getConstellationPhase(620)), 1);
  assert.equal(getConstellationStrength(getConstellationPhase(630)), 0);

  const seed = 0x51a7;
  const generation0 = createAmbientLayout(seed, 0);
  const generation1 = createAmbientLayout(seed, 1);
  const atHold = getStarFieldStyles(seed, 610);
  const atMorphOut = getStarFieldStyles(seed, 620);
  const atAmbient = getStarFieldStyles(seed, 630);
  atHold.forEach((style, index) => closeTo(style.alpha, generation0[index].alpha));
  atMorphOut.forEach((style, index) => closeTo(style.alpha, generation0[index].alpha));
  atAmbient.slice(0, AMBIENT_STAR_COUNT)
    .forEach((style, index) => closeTo(style.alpha, generation1[index].alpha));
  atAmbient.slice(AMBIENT_STAR_COUNT).forEach((style) => closeTo(style.alpha, 0));

  for (const boundary of [600, 610, 620, 630]) {
    const before = getStarFieldStyles(seed, boundary - 0.000001);
    const at = getStarFieldStyles(seed, boundary);
    before.forEach((style, index) => {
      for (const property of ['alpha', 'twinkle', 'strength', 'radius', 'opacity']) {
        closeTo(style[property], at[index][property], 0.00001);
      }
    });
  }
});

test('constellation-only stars fade with strength and warm ambient RGB stays separate from text RGB', () => {
  const seed = 0x72;
  const ambient = getStarFieldStyles(seed, 599);
  const morphStart = getStarFieldStyles(seed, 600);
  const morphMiddle = getStarFieldStyles(seed, 605);
  const hold = getStarFieldStyles(seed, 610);
  const outStart = getStarFieldStyles(seed, 620);
  const outMiddle = getStarFieldStyles(seed, 625);
  const after = getStarFieldStyles(seed, 630);

  for (let index = AMBIENT_STAR_COUNT; index < CONSTELLATION_STAR_COUNT; index += 1) {
    assert.equal(ambient[index].alpha, 0);
    assert.equal(ambient[index].opacity, 0);
    assert.equal(morphStart[index].alpha, 0);
    assert.ok(morphMiddle[index].alpha > 0 && morphMiddle[index].opacity > 0);
    assert.ok(hold[index].alpha > morphMiddle[index].alpha);
    assert.ok(outStart[index].alpha > outMiddle[index].alpha);
    assert.ok(outMiddle[index].alpha > 0 && outMiddle[index].opacity > 0);
    assert.equal(after[index].alpha, 0);
    assert.equal(after[index].opacity, 0);
  }

  assert.deepEqual(getStarRgb(0), AMBIENT_STAR_RGB);
  assert.deepEqual(getStarRgb(1), CONSTELLATION_STAR_RGB);
  assert.ok(AMBIENT_STAR_RGB[0] > AMBIENT_STAR_RGB[1] && AMBIENT_STAR_RGB[1] > AMBIENT_STAR_RGB[2]);
  assert.ok(CONSTELLATION_STAR_RGB[2] > CONSTELLATION_STAR_RGB[1]
    && CONSTELLATION_STAR_RGB[1] > CONSTELLATION_STAR_RGB[0]);
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

test('pure orbital positions complete full tilted ellipses around the moving star center', () => {
  const center = { x: 417.25, y: 238.75 };
  const planet = {
    orbitRadius: 14,
    radius: 1.2,
    phase: 0.37,
    speed: (Math.PI * 2) / getPlanetOrbitPeriod(14),
    inclination: 0.38,
    tilt: -0.21,
    color: '#fff',
    moons: [],
    hasRing: false,
  };
  const period = getPlanetOrbitPeriod(planet.orbitRadius);
  const start = getOrbitingPlanet(planet, 0, center);
  const halfway = getOrbitingPlanet(planet, period / 2, center);
  const complete = getOrbitingPlanet(planet, period, center);
  const movedCenter = { x: center.x + 83, y: center.y - 29 };
  const completeAroundMovedStar = getOrbitingPlanet(planet, period, movedCenter);

  closeTo(complete.x, start.x);
  closeTo(complete.y, start.y);
  closeTo(complete.z, start.z);
  closeTo(completeAroundMovedStar.x - movedCenter.x, start.x - center.x);
  closeTo(completeAroundMovedStar.y - movedCenter.y, start.y - center.y);
  closeTo((start.x + halfway.x) / 2, center.x);
  closeTo((start.y + halfway.y) / 2, center.y);
  closeTo(halfway.z, -start.z);
});

test('radius-derived periods are distinct, monotonic, visible, and include a deterministic retrograde minority', () => {
  assert.equal(MIN_PLANET_ORBIT_PERIOD_SECONDS, 8);
  assert.equal(MAX_PLANET_ORBIT_PERIOD_SECONDS, 18);
  const radii = Array.from({ length: 12 }, (_, index) => 6.7 + index * 1.35);
  const periods = radii.map(getPlanetOrbitPeriod);
  assert.ok(periods.every((period) => period >= 8 && period <= 18));
  assert.ok(periods.every((period, index) => index === 0 || periods[index - 1] < period));
  assert.equal(new Set(periods).size, periods.length);
  assert.ok(periods.at(-1) <= 20, 'outermost orbit exceeds a prominent-system visibility window');

  const systemsByCount = new Map();
  for (let seed = 1; seed <= 10000 && systemsByCount.size < 12; seed += 1) {
    const candidate = createPlanetSystem(seed, 0);
    if (!systemsByCount.has(candidate.length)) systemsByCount.set(candidate.length, candidate);
  }
  assert.equal(systemsByCount.size, 12, 'deterministic fixtures do not cover every 1-12 planet count');
  systemsByCount.forEach((system, count) => {
    const generatedPeriods = system.map((planet) => Math.PI * 2 / Math.abs(planet.speed));
    assert.ok(generatedPeriods.every((period, index) =>
      index === 0 || generatedPeriods[index - 1] < period), `${count}-planet periods are not monotonic`);
    assert.equal(new Set(generatedPeriods.map((period) => period.toFixed(10))).size, count);
    assert.equal(system.filter((planet) => planet.speed < 0).length, Math.floor(count / 5));
    assert.ok(generatedPeriods.at(-1) <= 20, `${count}-planet outer orbit is too slow`);
    system.forEach((planet) => {
      const start = getOrbitingPlanet(planet, 0);
      const acceleratedFixture = getOrbitingPlanet(planet, 1);
      assert.ok(Math.hypot(
        acceleratedFixture.x - start.x,
        acceleratedFixture.y - start.y,
      ) > 0.4, `${count}-planet system contains imperceptible orbital motion`);
    });
  });
});

test('orbital phase freezes exactly throughout constellation windows and depth ordering remains stable', () => {
  const planets = createPlanetSystem(2468, 2);
  const beforeFreeze = getOrbitingPlanets(planets, getSimulationTime(600));
  for (const wallTime of [610, 620, 629.999, 630]) {
    assert.deepEqual(getOrbitingPlanets(planets, getSimulationTime(wallTime)), beforeFreeze);
  }
  const afterFreeze = getOrbitingPlanets(planets, getSimulationTime(631));
  assert.ok(afterFreeze.some((planet) => {
    const frozen = beforeFreeze.find((candidate) => candidate.phase === planet.phase);
    return frozen && Math.hypot(planet.x - frozen.x, planet.y - frozen.y) > 0.01;
  }));
  assert.ok(beforeFreeze.every((planet, index) => index === 0 || beforeFreeze[index - 1].z <= planet.z));

  const traveler = createSpaceScene(42).travelers[0];
  assert.equal(travelerCountForWidth(390), MOBILE_TRAVELER_COUNT);
  assert.equal(travelerCountForWidth(1200), DESKTOP_TRAVELER_COUNT);
  for (let elapsed = 0; elapsed < 1000; elapsed += 0.37) {
    const { depth } = getTravelerDepth(traveler, elapsed);
    assert.ok(depth >= NEAR_DEPTH && depth <= FAR_DEPTH);
  }
});
