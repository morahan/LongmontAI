import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DESKTOP_STAR_COUNT,
  MOBILE_STAR_COUNT,
  SYSTEM_CYCLE_SECONDS,
  SYSTEM_VISIBLE_SECONDS,
  createSpaceScene,
  getSystemAppearance,
  starCountForWidth,
} from '../../src/components/spaceBackgroundModel.ts';

test('seeded scenes are stable, sparse, and responsive', () => {
  const first = createSpaceScene(12345);
  const second = createSpaceScene(12345);

  assert.deepEqual(first, second);
  assert.equal(first.stars.length, DESKTOP_STAR_COUNT);
  assert.equal(starCountForWidth(1200), 45);
  assert.equal(starCountForWidth(639), 30);
  assert.equal(MOBILE_STAR_COUNT, 30);
  assert.ok(first.stars.every((star) => star.alpha <= 0.46 && star.size <= 0.9));
});

test('planetary systems stay off-center and contain only bounded detail', () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const { system } = createSpaceScene(seed);
    assert.ok(system.x <= 0.32 || system.x >= 0.68);
    assert.ok(system.y >= 0.14 && system.y <= 0.48);
    assert.ok(system.planets.length >= 1 && system.planets.length <= 2);
    assert.ok(system.planets.filter((planet) => planet.hasMoon).length <= 1);
  }
});

test('rare system appearances are singular, short, subtle, and fade out', () => {
  let activeCycles = 0;

  for (let cycle = 0; cycle < 120; cycle += 1) {
    const start = cycle * SYSTEM_CYCLE_SECONDS;
    const samples = Array.from(
      { length: SYSTEM_VISIBLE_SECONDS * 2 },
      (_, index) => getSystemAppearance(start + index / 2),
    );
    if (samples.some(Boolean)) activeCycles += 1;
    assert.equal(getSystemAppearance(start + SYSTEM_VISIBLE_SECONDS), null);
    for (const appearance of samples.filter(Boolean)) {
      assert.ok(appearance.opacity <= 0.42);
      assert.ok(appearance.scale <= 1.5);
    }
  }

  assert.ok(activeCycles >= 25 && activeCycles <= 50, `unexpected active cycle count: ${activeCycles}`);

  const activeCycle = Array.from({ length: 120 }, (_, cycle) => cycle)
    .find((cycle) => getSystemAppearance(cycle * SYSTEM_CYCLE_SECONDS + 1));
  assert.notEqual(activeCycle, undefined);
  const cycleStart = activeCycle * SYSTEM_CYCLE_SECONDS;
  const middle = getSystemAppearance(cycleStart + SYSTEM_VISIBLE_SECONDS * 0.55);
  const nearEnd = getSystemAppearance(cycleStart + SYSTEM_VISIBLE_SECONDS * 0.95);
  assert.ok(middle && nearEnd && nearEnd.opacity < middle.opacity);
});
