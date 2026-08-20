import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DESKTOP_STAR_COUNT,
  DESKTOP_TRAVELER_COUNT,
  FAR_DEPTH,
  MOBILE_STAR_COUNT,
  MOBILE_TRAVELER_COUNT,
  NEAR_DEPTH,
  SYSTEM_MAX_PROGRESS,
  SYSTEM_MIN_PROGRESS,
  TWINKLE_WINDOW_SECONDS,
  createSpaceScene,
  getSystemSafetyMargin,
  getTravelerDepth,
  getTwinkleBrightness,
  isSystemInViewport,
  projectTraveler,
  selectProminentSystem,
  starCountForWidth,
  travelerCountForWidth,
} from '../../src/components/spaceBackgroundModel.ts';

test('seeded two-layer scenes are stable and responsive', () => {
  const first = createSpaceScene(12345);
  const second = createSpaceScene(12345);

  assert.deepEqual(first, second);
  assert.equal(first.stars.length, DESKTOP_STAR_COUNT);
  assert.equal(first.travelers.length, DESKTOP_TRAVELER_COUNT);
  assert.equal(starCountForWidth(1200), 45);
  assert.equal(starCountForWidth(639), 30);
  assert.equal(travelerCountForWidth(1200), 18);
  assert.equal(travelerCountForWidth(639), 12);
  assert.equal(MOBILE_STAR_COUNT, 30);
  assert.equal(MOBILE_TRAVELER_COUNT, 12);
  assert.ok(first.stars.every((star) =>
    star.alpha >= 0.52 && star.alpha <= 0.9 && star.size >= 0.8 && star.size <= 1.6
  ));
  assert.ok(first.stars.every((star) => !('driftX' in star) && !('driftY' in star)));
});

test('twinkles independently return from a new 40-60% target each cycle', () => {
  const stars = createSpaceScene(6789).stars;
  const minima = [];

  for (let cycle = 0; cycle < 3; cycle += 1) {
    const cycleSamples = Array.from(
      { length: TWINKLE_WINDOW_SECONDS * 20 },
      (_, sample) => getTwinkleBrightness(stars[0], cycle * TWINKLE_WINDOW_SECONDS + sample / 20),
    );
    const minimum = Math.min(...cycleSamples);
    minima.push(minimum);
    assert.ok(minimum >= 0.4 && minimum <= 0.6, `unexpected dim target: ${minimum}`);
    assert.ok(cycleSamples.some((value) => value === 1));
  }

  assert.ok(new Set(minima.map((value) => value.toFixed(4))).size > 1);

  const sampledAtSameTime = stars.map((star) => getTwinkleBrightness(star, 47));
  assert.ok(new Set(sampledAtSameTime.map((value) => value.toFixed(4))).size > 1);
});

test('travelers advance by elapsed time, reset at bounded depth, and project reciprocally', () => {
  const traveler = createSpaceScene(42).travelers[0];
  const start = getTravelerDepth(traveler, 0);
  const later = getTravelerDepth(traveler, 1);
  assert.ok(
    later.cycle > start.cycle || later.depth < start.depth,
    `traveler did not approach: ${start.depth} -> ${later.depth}`,
  );

  for (let elapsed = 0; elapsed < 300; elapsed += 0.37) {
    const { depth } = getTravelerDepth(traveler, elapsed);
    assert.ok(depth >= NEAR_DEPTH && depth <= FAR_DEPTH);
  }

  const nearTraveler = { ...traveler, initialDistance: 760, speed: 1 };
  const farTraveler = { ...traveler, initialDistance: 100, speed: 1 };
  const near = projectTraveler(nearTraveler, 0, 1000, 600);
  const far = projectTraveler(farTraveler, 0, 1000, 600);
  const nearDistance = Math.hypot(near.x - 500, near.y - 276);
  const farDistance = Math.hypot(far.x - 500, far.y - 276);
  assert.ok(nearDistance > farDistance);
  assert.ok(near.radius > far.radius);
});

test('a deterministic minority carry bounded, normally discernible systems', () => {
  const scene = createSpaceScene(9876);
  const carriers = scene.travelers.filter((traveler) => traveler.planets);
  assert.ok(carriers.length >= 2 && carriers.length < scene.travelers.length / 3);
  assert.ok(carriers.every((traveler) =>
    traveler.planets.length >= 1 &&
    traveler.planets.length <= 2 &&
    traveler.planets.filter((planet) => planet.hasMoon).length <= 1
  ));

  const normalProjection = {
    x: 600,
    y: 350,
    depth: 500,
    progress: 0.6,
    radius: 1.5,
    opacity: 0.6,
    cycle: 0,
  };
  const margin = getSystemSafetyMargin(carriers[0], normalProjection);
  assert.ok(margin * 2 >= 24, `system detail too small at normal scale: ${margin * 2}px`);
  assert.ok(margin <= 40, `system safety margin is unbounded: ${margin}`);
});

test('an offscreen nearer carrier never suppresses an eligible visible system', () => {
  const carriers = createSpaceScene(9876).travelers.filter((traveler) => traveler.planets).slice(0, 2);
  const projections = [
    { x: -20, y: 300, depth: 200, progress: 0.8, radius: 2, opacity: 0.5, cycle: 0 },
    { x: 240, y: 300, depth: 400, progress: 0.6, radius: 1.5, opacity: 0.6, cycle: 0 },
  ];

  assert.equal(isSystemInViewport(carriers[0], projections[0], 800, 600), false);
  assert.equal(isSystemInViewport(carriers[1], projections[1], 800, 600), true);
  assert.equal(selectProminentSystem(carriers, projections, 800, 600), 1);
});

test('desktop and mobile selection always chooses the nearest eligible visible carrier', () => {
  const scene = createSpaceScene(9876);
  const viewports = [
    { width: 1440, height: 800, count: DESKTOP_TRAVELER_COUNT },
    { width: 390, height: 844, count: MOBILE_TRAVELER_COUNT },
  ];

  for (const { width, height, count } of viewports) {
    const travelers = scene.travelers.slice(0, count);
    for (let elapsed = 0; elapsed < 600; elapsed += 0.25) {
      const projections = travelers.map((traveler) =>
        projectTraveler(traveler, elapsed, width, height));
      const eligibleVisible = travelers
        .map((traveler, index) => ({ traveler, projection: projections[index], index }))
        .filter(({ traveler, projection }) =>
          projection.progress >= SYSTEM_MIN_PROGRESS &&
          projection.progress <= SYSTEM_MAX_PROGRESS &&
          isSystemInViewport(traveler, projection, width, height)
        )
        .sort((a, b) => b.projection.progress - a.projection.progress);
      const selected = selectProminentSystem(travelers, projections, width, height);

      assert.equal(
        selected,
        eligibleVisible[0]?.index ?? -1,
        `wrong ${width}x${height} selection at ${elapsed}s`,
      );
      if (selected !== -1) {
        assert.equal(isSystemInViewport(travelers[selected], projections[selected], width, height), true);
      }
    }
  }
});
