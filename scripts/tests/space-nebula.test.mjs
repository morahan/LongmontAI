import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getNeuralEndpointTransmission, getSystemOpacity } from '../../src/components/spaceBackgroundModel.ts';
import {
  createNebulaField, getNebulaDepthTransmission, getNebulaOffset,
  getNebulaTextTransmission, NEBULA_DRIFT, NEBULA_TEXTURE_SIZE,
  NEBULA_WORLD_SIZE, sampleNebulaTransmission,
} from '../../src/components/spaceNebulaModel.ts';

const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const field = createNebulaField(12345);

test('integrated renderer keeps intrinsic geometry and applies system extinction exactly once', () => {
  const projection = { x: 300, y: 300, depth: 200, progress: 0.8, radius: 3, opacity: 0.6, cycle: 0 };
  for (const transmission of [0.025, 0.1, 0.5, 1]) {
    const rendered = { ...projection, opacity: projection.opacity * transmission };
    // Explicit carrier alpha prevents feeding already attenuated opacity back into system light.
    close(getSystemOpacity(rendered, 0.6) * transmission,
      getSystemOpacity(projection, 0.6) * transmission);
  }
  const renderer = readFileSync(new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8');
  assert.match(renderer, /getSystemOpacity\(projection, traveler\.alpha\) \* nebulaTransmission/);
  assert.match(renderer, /opacity: originalProjection\.opacity \* transmission/);
  assert.match(renderer, /selectProminentSystemOwner\(\s*travelers,\s*projections,/);
  assert.match(renderer, /styles: getStarFieldStyles\(scene\.seed, elapsed, reducedMotion\)/);
});

test('neural extinction suppresses detached filaments and smoothly preserves foreground light', () => {
  // Confirmed integrated mobile mismatch: a .026 filament outshone a .018 endpoint.
  const intrinsic = 0.3077088812863488;
  const rendered = 0.01790654723823845;
  const signal = 0.026120012552570362;
  assert.equal(signal * getNeuralEndpointTransmission(intrinsic, rendered), 0);
  for (const opacity of [0, 0.01, 0.018, 0.042689, 0.07999, 0.08]) {
    assert.equal(getNeuralEndpointTransmission(intrinsic, opacity), 0);
  }
  for (const original of [0.0801, 0.1, intrinsic, 0.6]) {
    // In-front endpoints have nebula transmission 1; existing neural opacity remains exact.
    assert.equal(getNeuralEndpointTransmission(original, original), 1);
    let previous = 0;
    for (let step = 0; step <= 1000; step += 1) {
      const factor = getNeuralEndpointTransmission(original, original * step / 1000);
      assert.ok(factor >= previous && factor <= 1);
      previous = factor;
    }
  }
  let previous = 0;
  for (let step = 0; step <= 1000; step += 1) {
    const factor = getNeuralEndpointTransmission(intrinsic, intrinsic * step / 1000);
    assert.ok(Math.abs(factor - previous) < 0.003, 'endpoint extinction popped');
    previous = factor;
  }
  assert.ok(getNeuralEndpointTransmission(intrinsic, 0.08001) < 1e-8);
  assert.equal(Math.min(getNeuralEndpointTransmission(intrinsic, rendered),
    getNeuralEndpointTransmission(0.6, 0.6)), 0, 'one visible endpoint cannot keep a detached filament alive');
  const renderer = readFileSync(new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8');
  assert.match(renderer, /opacity: signal\.opacity \* endpointTransmission/);
  assert.match(renderer, /getNeuralSignals\(\s*scene\.seed, elapsed, projections,/);
  assert.match(renderer, /const transmission = nebulaTransmissions\[index\]/);
});

test('seeded bounded field has translucent wisps and strongly absorbing banks', () => {
  assert.deepEqual(field, createNebulaField(12345));
  assert.notDeepEqual(field, createNebulaField(54321));
  assert.equal(field.transmission.length, NEBULA_TEXTURE_SIZE ** 2);
  assert.ok(NEBULA_WORLD_SIZE >= 2048, 'no duplicated banks across standard desktop width');
  assert.ok(NEBULA_TEXTURE_SIZE <= 256, 'bounded initialization and texture memory');
  for (const value of field.transmission) assert.ok(value > 0 && value <= 1);
  assert.ok(field.transmission.filter((v) => v < 0.15).length > 500);
  assert.ok(field.transmission.filter((v) => v > 0.8).length > 500);
  assert.ok(new Set(field.transmission).size > 30000, 'not a few discrete alpha bands');
});

test('sampling matches displayed texel centers and interpolates, including tile seams', () => {
  const pixel = NEBULA_WORLD_SIZE / field.size;
  for (let i = 0; i < field.size; i += 7) {
    close(sampleNebulaTransmission(field, (i + 0.5) * pixel, 0.5 * pixel, 0), field.transmission[i]);
    close(sampleNebulaTransmission(field, (i + 1) * pixel, 0.5 * pixel, 0),
      (field.transmission[i] + field.transmission[(i + 1) % field.size]) / 2);
  }
  for (const t of [0, 1, 200, 100000]) {
    close(sampleNebulaTransmission(field, 0, 155, t), sampleNebulaTransmission(field, NEBULA_WORLD_SIZE, 155, t));
    close(sampleNebulaTransmission(field, 80, 0, t), sampleNebulaTransmission(field, 80, NEBULA_WORLD_SIZE, t));
    close(sampleNebulaTransmission(field, -0.00001, 155, t), sampleNebulaTransmission(field, 0.00001, 155, t), 0.00001);
  }
});

test('slow coherent advection is continuous and reduced motion freezes the exact same field', () => {
  assert.ok(Math.hypot(NEBULA_DRIFT.x, NEBULA_DRIFT.y) < 1.3);
  for (const t of [0, 30, 600, 3600]) {
    close(sampleNebulaTransmission(field, 100 + t * NEBULA_DRIFT.x, 200 + t * NEBULA_DRIFT.y, t),
      sampleNebulaTransmission(field, 100, 200, 0));
    close(sampleNebulaTransmission(field, 100, 200, t, true), sampleNebulaTransmission(field, 100, 200, 0));
    close(sampleNebulaTransmission(field, 100, 200, t + 1 / 60), sampleNebulaTransmission(field, 100, 200, t), 0.001);
    assert.deepEqual(getNebulaOffset(t, true), { x: 0, y: 0 });
  }
});

test('Beer–Lambert depth is continuous, monotonic, unaffected foreground to opaque distance', () => {
  for (const background of [0.025, 0.1, 0.4, 0.8, 1]) {
    let previous = 1;
    for (let depth = 0; depth <= 1000; depth += 1) {
      const transmission = getNebulaDepthTransmission(background, depth / 1000);
      assert.ok(transmission <= previous + 1e-12);
      assert.ok(previous - transmission < 0.01);
      if (depth <= 160) close(transmission, 1);
      if (depth >= 880) close(transmission, background);
      previous = transmission;
    }
    close(getNebulaDepthTransmission(background, 0.52), Math.sqrt(background));
  }
});

test('static stars use full spatial occlusion while text emerges continuously and preserves intrinsic alpha', () => {
  for (let x = 0; x < NEBULA_WORLD_SIZE; x += 17) {
    const background = sampleNebulaTransmission(field, x, 300, 10);
    close(getNebulaTextTransmission(background, 0), background);
    close(getNebulaTextTransmission(background, 1), 1);
    close(getNebulaDepthTransmission(background, 1), background);
    const middle = getNebulaTextTransmission(background, 0.5);
    assert.ok(middle >= background && middle <= 1);
    close(getNebulaTextTransmission(background, 0.000001), background, 1e-10);
  }
});
