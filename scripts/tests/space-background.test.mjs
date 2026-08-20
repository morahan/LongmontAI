import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DESKTOP_STAR_COUNT,
  DESKTOP_TRAVELER_COUNT,
  FAR_DEPTH,
  MOBILE_STAR_COUNT,
  MOBILE_TRAVELER_COUNT,
  NEAR_DEPTH,
  TWINKLE_WINDOW_SECONDS,
  createSpaceScene,
  getTravelerDepth,
  getTwinkleBrightness,
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

test('a deterministic minority carry bounded systems and only one can be prominent', () => {
  const scene = createSpaceScene(9876);
  const carriers = scene.travelers.filter((traveler) => traveler.planets);
  assert.ok(carriers.length >= 2 && carriers.length < scene.travelers.length / 3);
  assert.ok(carriers.every((traveler) =>
    traveler.planets.length >= 1 &&
    traveler.planets.length <= 2 &&
    traveler.planets.filter((planet) => planet.hasMoon).length <= 1
  ));

  for (let elapsed = 0; elapsed < 240; elapsed += 0.5) {
    const projections = scene.travelers.map((traveler) =>
      projectTraveler(traveler, elapsed, 1200, 700));
    const selected = selectProminentSystem(scene.travelers, projections);
    assert.ok(selected === -1 || scene.travelers[selected].planets);
    if (selected !== -1) {
      assert.ok(projections[selected].progress >= 0.38 && projections[selected].progress <= 0.84);
    }
  }
});
