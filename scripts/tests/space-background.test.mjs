import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { createNebulaField, sampleNebulaTransmission, getNebulaDepthTransmission } from '../../src/components/spaceNebulaModel.ts';
import * as spaceModel from '../../src/components/spaceBackgroundModel.ts';
import {
  AMBIENT_STAR_COUNT,
  AMBIENT_STAR_RADIUS_RANGE,
  AMBIENT_STAR_RGB,
  ATMOSPHERE_HALO_RADIUS_MULTIPLIER,
  EASTER_EGG_CLICK_DISTANCE_PX,
  EASTER_EGG_CLICK_INTERVAL_MS,
  CONSTELLATION_INTERVAL_SECONDS,
  CONSTELLATION_PHRASES,
  CONSTELLATION_STAR_COUNT,
  CONSTELLATION_STAR_RGB,
  CONSTELLATION_WINDOW_SECONDS,
  COMET_BASIS_POINTS,
  DESKTOP_TRAVELER_COUNT,
  EASTER_EGG_PHRASES,
  FAR_DEPTH,
  GALAXY_CREATION_CHANCE,
  GALAXY_EMBEDDED_PLANET_COUNT_RANGE,
  GALAXY_EMBEDDED_SYSTEM_COUNT_RANGE,
  GALAXY_FORMATIONS,
  GALAXY_FORMATION_RATE_MULTIPLIERS,
  GALAXY_INTERNAL_STAR_COUNT,
  GALAXY_MAX_RADIUS_MULTIPLIER,
  GALAXY_ROTATION_RATE_RANGE,
  GALAXY_SPIRAL_ARM_COUNT,
  MAX_GLYPH_STAR_COUNT,
  MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO,
  MAX_PLANET_TO_HOST_RADIUS_RATIO,
  MAX_STAR_TEXT_ANCHOR_COUNT,
  MAX_PLANET_ORBIT_PERIOD_SECONDS,
  MAX_PLANET_ORBIT_RADIUS,
  MIN_GLYPH_STAR_COUNT,
  MIN_PLANET_ORBIT_PERIOD_SECONDS,
  MOBILE_TRAVELER_COUNT,
  NEAR_DEPTH,
  NEURAL_CONTAGION_AFFINITY_BOOST,
  NEURAL_CONTAGION_MAX_ENTRIES,
  NEURAL_CONTAGION_OPPORTUNITIES,
  NEURAL_SIGNAL_DESKTOP_CHANCE,
  NEURAL_SIGNAL_DURATION_RANGE,
  NEURAL_SIGNAL_MAX_CONCURRENT,
  NEURAL_SIGNAL_MAX_OPACITY,
  NEURAL_SIGNAL_MOBILE_CHANCE,
  NEURAL_SIGNAL_SLOT_SECONDS,
  NEURAL_SIGNAL_WIDTH_RANGE,
  PLANET_ATMOSPHERE_CLASSES,
  PLANET_COUNT_BASIS_POINTS,
  PLANET_RADIUS_RANGE,
  PLANET_RENDER_SCALE,
  PLANET_RING_LINE_WIDTH,
  PLANET_SURFACE_LOD_DIAMETERS,
  RETAINED_AMBIENT_STAR_COUNT,
  SYSTEM_MAX_PROGRESS,
  SYSTEM_MIN_PROGRESS,
  STAR_FIELD_SLOT_COUNT,
  SYSTEM_STAR_RADIUS,
  LARGE_TRAVELER_RED_CHANCE,
  SMALL_TRAVELER_RED_CHANCE,
  TRAVELER_DETAIL_THRESHOLDS,
  TRAVELER_GLOW_BLUR_RANGE,
  TRAVELER_GLOW_OPACITY_RANGE,
  TRAVELER_PALETTE,
  TRAVELER_RADIUS_RANGE,
  TRAVELER_SURFACE_TEXTURES,
  getStarTwinkleParameters,
  UFO_BASIS_POINTS,
  UFO_SIZE_MULTIPLIER,
  advanceEasterEggClickSequence,
  chooseMoonCount,
  chooseTravelerColor,
  chooseWeightedPlanetCount,
  createAmbientLayout,
  createConstellationGeometry,
  createConstellationGeometryForPhrase,
  createCryptoSeed,
  createEasterEggTargetStyles,
  createEmbeddedGalaxySystems,
  createNeuralContagionState,
  createPlanetSystem,
  createSeededRandom,
  createSpaceScene,
  createStarTextAmbientOrigins,
  doesSystemExitViewportBeforeCycle,
  getConstellationPhase,
  getConstellationGlyphAnchorCounts,
  getConstellationPhraseForBucket,
  getConstellationStrength,
  getCometAppearance,
  getDriftedStar,
  getDriftedStarVelocity,
  getGalaxyAnimationState,
  getGalaxyVisibleStarCount,
  getGalaxyStarReveal,
  isDirectApproachGalaxy,
  isGalaxyDirectApproachRoll,
  GALAXY_DIRECT_APPROACH_CHANCE,
  GALAXY_SOMBRERO_CHANCE,
  getGalaxyAppearance,
  getGalaxyFormation,
  getGalaxyParticleState,
  getGalaxyRotationRate,
  getEasterEggPhase,
  getEasterEggStarFieldPositions,
  getEasterEggStarFieldStyles,
  getEasterEggStrength,
  getElapsedSecondsSinceMount,
  getEmbeddedGalaxySystemOpacity,
  getEmbeddedGalaxySystemState,
  getOrbitingMoon,
  getOrbitingPlanet,
  getPlanetLightingStyle,
  getPlanetRenderRadius,
  getNeuralSignalSlot,
  getNeuralSignals,
  getOrbitingPlanets,
  getPlanetOrbitPeriod,
  getPlanetSurfaceDetailLevel,
  getPlanetSystemExtent,
  getSimulationTime,
  getScreenWrappedVelocity,
  getSeamAwareReturnVelocity,
  getStarFieldPositions,
  getStarFieldStyles,
  getStarRgb,
  getStarTextIntroProgress,
  getSystemOpacity,
  getSystemOwnerDiscLocalRadius,
  getSystemSafetyMargin,
  getSystemScale,
  getTravelerAppearance,
  getTravelerColorWeights,
  getTravelerRadialSpeedMultiplier,
  getTravelerStarRenderPolicy,
  getTravelerDepth,
  getTravelerVariant,
  getTravelerVariantForBasisPoint,
  getTwinkleBrightness,
  getUfoAppearance,
  isGalaxyCreationRoll,
  isPlanetBehindSystemStar,
  isStarRenderable,
  isSystemCarrier,
  isCometBasisPoint,
  isCometTraveler,
  isUfoBasisPoint,
  isUfoTraveler,
  isTravelerEligibleForNeuralSignal,
  isSystemInViewport,
  isSystemOverlappingViewport,
  projectTraveler,
  remapAmbientStarsToTextSlots,
  scaleConstellationGeometry,
  selectConstellationPhrase,
  selectNeuralSignalPair,
  selectEasterEggPhrase,
  selectProminentSystem,
  selectProminentSystemOwner,
  shouldTriggerEasterEgg,
  starCountForWidth,
  syncNeuralContagionState,
  updateNeuralContagionForSignal,
  travelerCountForWidth,
} from '../../src/components/spaceBackgroundModel.ts';

const closeTo = (actual, expected, epsilon = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);

const circularDistance = (left, right) => {
  const direct = Math.abs(left - right);
  return Math.min(direct, 1 - direct);
};

const angularDistance = (left, right) => {
  const direct = Math.abs(left - right) % (Math.PI * 2);
  return Math.min(direct, Math.PI * 2 - direct);
};

test('responsive tiers preserve fixed slots, seeded prefixes, and exact ambient/retained populations', () => {
  const seed = 12345;
  const scene = createSpaceScene(seed);
  for (const width of [390, 639.999, 640, 1439.999, 1440, 1920, 390, 1440, 640]) {
    const factor = width < 640 ? 1 : width < 1440 ? 3 : 10;
    assert.equal(starCountForWidth(width), 56 * factor);
    assert.equal(spaceModel.retainedAmbientCountForWidth(width), 28 * factor);
    assert.equal(travelerCountForWidth(width), 17 * factor);
    assert.deepEqual(createAmbientLayout(seed, 0, 56 * factor), scene.stars.slice(0, 56 * factor));
    assert.deepEqual(createSpaceScene(seed).travelers.slice(0, 17 * factor), scene.travelers.slice(0, 17 * factor));
    for (const time of [0, 47, 599.999, 600, 605, 610, 620, 625, 630]) {
      const styles = getStarFieldStyles(seed, time, false, width);
      const large = getStarFieldStyles(seed, time, false, 1920);
      const positions = getStarFieldPositions(seed, time, width, 800);
      const largePositions = getStarFieldPositions(seed, time, 1920, 800);
      assert.equal(styles.length, STAR_FIELD_SLOT_COUNT);
      assert.equal(positions.length, styles.length);
      positions.forEach((point, index) => {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
        // Glyphs relayout with aspect ratio; ambient identities keep normalized positions.
        if (index >= MAX_STAR_TEXT_ANCHOR_COUNT) {
          closeTo(point.x / width, largePositions[index].x / 1920);
          closeTo(point.y, largePositions[index].y);
        }
      });
      styles.slice(MAX_STAR_TEXT_ANCHOR_COUNT, MAX_STAR_TEXT_ANCHOR_COUNT + 56 * factor)
        .forEach((style, index) => assert.deepEqual(style, large[MAX_STAR_TEXT_ANCHOR_COUNT + index]));
      if (time < 600 || time >= 630) assert.equal(styles.filter(isStarRenderable).length, 56 * factor);
      if (time === 610 || time === 620) {
        const anchors = createConstellationGeometry(width, 800, seed, 1).points.length;
        assert.equal(styles.filter(isStarRenderable).length, anchors + 28 * factor);
      }
    }
  }
});

test('all tiers preserve visible scheduled and click-trigger boundary frames, including short phrases', () => {
  const visible = (positions, styles) => styles.flatMap((style, index) => style.opacity > 1e-10
    ? [{ point: positions[index], opacity: style.opacity }] : []);
  const compare = (left, right) => {
    assert.equal(left.length, right.length);
    for (const sample of left) assert.ok(right.some((other) =>
      Math.hypot(sample.point.x - other.point.x, sample.point.y - other.point.y) < 1e-4
      && Math.abs(sample.opacity - other.opacity) < 1e-5));
  };
  for (const seed of [0, 17, 777, 795936]) {
    for (const width of [390, 1000, 1920]) {
      const styles = (time) => getStarFieldStyles(seed, time, false, width);
      const positions = (time) => getStarFieldPositions(seed, time, width, 800);
      compare(visible(positions(599.999999), styles(599.999999)), visible(positions(600), styles(600)));
      compare(visible(positions(629.999999), styles(629.999999)), visible(positions(630), styles(630)));
      for (const phrase of EASTER_EGG_PHRASES) {
        const count = createConstellationGeometryForPhrase(width, 800, phrase, seed, 1).points.length;
        const remapped = remapAmbientStarsToTextSlots(positions(47), styles(47), count);
        compare(visible(positions(47), styles(47)), visible(remapped.positions, remapped.styles));
      }
    }
  }
});

test('seeded ambient cardinal flares stay near 10% in all tiers and retained layers', () => {
  for (let seed = 0; seed < 24; seed += 1) {
    for (const generation of [0, 1, 3]) {
      for (const width of [390, 1000, 1920]) {
        const stars = createAmbientLayout(seed, generation, starCountForWidth(width));
        for (const layer of [stars, stars.filter((_, index) => index % 4 >= 2)]) {
          assert.ok(Math.abs(layer.filter((star) => star.hasCardinalFlare).length - layer.length * 0.1) < 1);
          assert.equal(layer.filter((star) => star.driftMode === 'wrap').length, layer.length / 2);
        }
      }
    }
  }
  const styles = getStarFieldStyles(12345, 47);
  const later = getStarFieldStyles(12345, 80);
  styles.forEach((style, index) => {
    const flare = spaceModel.getAmbientCardinalFlare(style);
    assert.deepEqual(flare, spaceModel.getAmbientCardinalFlare(later[index]));
    if (!flare) return;
    assert.equal(flare.opacity, 1);
    assert.deepEqual(flare.rays, [{ x: 0, y: -style.radius * 9 }, { x: 0, y: style.radius * 9 },
      { x: style.radius * 9, y: 0 }, { x: -style.radius * 9, y: 0 }]);
  });
  getStarFieldStyles(12345, 610).slice(0, MAX_STAR_TEXT_ANCHOR_COUNT).forEach((style) =>
    assert.equal(spaceModel.getAmbientCardinalFlare(style), null));
  createEasterEggTargetStyles(12345, 0).forEach((style) => assert.equal(spaceModel.getAmbientCardinalFlare(style), null));
});

test('auras are varied and deterministic while cores are opaque outside lifecycle fades', () => {
  const auras = createSpaceScene(9876).travelers.map((traveler) => spaceModel.getStarAura(traveler.seed));
  for (const property of ['radiusMultiplier', 'opacity', 'softness']) {
    assert.ok(new Set(auras.map((aura) => aura[property])).size > 100);
  }
  assert.ok(new Set(auras.map(({ rgb }) => rgb.join(','))).size > 50);
  for (const width of [390, 1000, 1920]) {
    for (const time of [0, 47, 610, 630]) {
      getStarFieldStyles(9876, time, false, width).filter(isStarRenderable).forEach((style) => {
        assert.equal(style.coreOpacity, 1);
        assert.ok(style.aura.radiusMultiplier >= 2.1 && style.aura.radiusMultiplier <= 3.6);
      });
    }
  }
  for (const progress of [0.14, 0.28, 0.5, 0.68, 0.82]) assert.equal(spaceModel.getTravelerDiscOpacity(progress), 1);
  for (const boundary of [0, 0.14, 0.28, 0.5, 0.68, 0.82, 1]) {
    closeTo(spaceModel.getTravelerDiscOpacity(boundary - 1e-7), spaceModel.getTravelerDiscOpacity(boundary + 1e-7), 1e-5);
  }
});

test('solar cells and seeded texture identities evolve fluidly without rerouting travelers', () => {
  const flatten = (surface) => [surface.strength, surface.rotation, surface.prominence,
    ...surface.cells.flatMap((cell) => [cell.x, cell.y, cell.radius, cell.intensity])];
  for (const seed of [0, 17, 9876, 0xffffffff]) {
    const traveler = { seed, initialDistance: 123, speed: 20, size: 1, alpha: 0.6 };
    const samples = [2, 12, 22].map((time) => projectTraveler(traveler, time, 1920, 1080));
    for (const time of [0, 1, 20, 120, 599.99, 600, 3600]) {
      const surface = spaceModel.getSolarSurface(seed, time, 0.7);
      assert.equal(surface.cells.length, 12);
      assert.deepEqual(surface, spaceModel.getSolarSurface(seed, time, 0.7));
      surface.cells.forEach((cell) => {
        assert.ok(Math.hypot(cell.x, cell.y) < 0.84);
        assert.ok(cell.radius >= 0.075 && cell.radius <= 0.235);
        assert.ok(cell.intensity >= 0 && cell.intensity <= 1);
      });
      const next = flatten(spaceModel.getSolarSurface(seed, time + 1e-6, 0.7));
      flatten(surface).forEach((value, index) => closeTo(value, next[index], 1e-5));
    }
    assert.deepEqual(samples, [2, 12, 22].map((time) => projectTraveler(traveler, time, 1920, 1080)));
    for (const time of [600, 610, 620, 630]) assert.deepEqual(
      spaceModel.getSolarSurface(seed, getSimulationTime(time), 0.7), spaceModel.getSolarSurface(seed, 600, 0.7));
    for (const progress of [0, 0.14, 0.28, 0.5, 0.68, 0.84, 1]) {
      const ordinary = getTravelerAppearance(traveler, progress);
      const host = spaceModel.getSystemHostStarAppearance(traveler, progress);
      for (const key of ['radius', 'haloRadius', 'coreRadius', 'flareLength']) assert.equal(host[key], ordinary[key] * 2);
      for (const key of ['color', 'colorName', 'texture', 'surfaceSeed']) assert.equal(host[key], ordinary[key]);
    }
  }
});

test('mobile ambient prefixes feed every glyph without rerouting shared sources on resize', () => {
  for (const seed of [0, 17, 777, 795936]) {
    for (const phrase of CONSTELLATION_PHRASES) {
      const geometry = createConstellationGeometryForPhrase(390, 800, phrase, seed, 1);
      const positions = getStarFieldPositions(seed, 47, 390, 800);
      const styles = getStarFieldStyles(seed, 47, false, 390);
      const small = remapAmbientStarsToTextSlots(positions, styles, geometry.points.length);
      const large = remapAmbientStarsToTextSlots(positions, getStarFieldStyles(seed, 47), geometry.points.length);
      geometry.glyphs.forEach((glyph) => assert.ok(glyph.indices.some((index) => isStarRenderable(small.styles[index])),
        `${seed}/${phrase}/${glyph.character} has no mobile ambient source`));
      assert.deepEqual(small.positions, large.positions);
      small.styles.slice(0, geometry.points.length).forEach((style, index) => {
        if (isStarRenderable(style)) assert.deepEqual(style, large.styles[index]);
      });
      const target = small.styles.map((style, index) => index < geometry.points.length
        ? createEasterEggTargetStyles(seed, 0, geometry.points.length)[index]
        : index >= MAX_STAR_TEXT_ANCHOR_COUNT && (index - MAX_STAR_TEXT_ANCHOR_COUNT) % 4 >= 2
          ? style : { ...style, opacity: 0, coreOpacity: 0 });
      const options = { targetCount: geometry.points.length };
      const beforeHold = getEasterEggStarFieldStyles(small.styles, target, styles, 10 - 1e-6, options);
      const hold = getEasterEggStarFieldStyles(small.styles, target, styles, 10, options);
      beforeHold.forEach((style, index) => closeTo(style.opacity, hold[index].opacity, 1e-8));
    }
  }
});

test('planetary data matches current-main digests and rare visitors never become enlarged hosts', () => {
  for (const [seed, digest] of [
    [0, '1f2912c262933618a4b0ed0d5e7c728dea316242534c70231c1b0fd0d5baf1f7'],
    [17, '05d28cee2320d75b44c9369a383889683d0adbe5ea14fdb82ed833bdc7c34126'],
    [9876, 'fdbccbdde48a7395527248777af0f795aa0eb82cfc0f6a86d320b41ccdecb095'],
  ]) assert.equal(createHash('sha256').update(JSON.stringify(createPlanetSystem(seed, 3))).digest('hex'), digest);
  for (const variant of ['ufo', 'comet']) {
    let seed = 0;
    while (getTravelerVariant({ seed }, 0) !== variant) seed += 1;
    const traveler = { seed, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
    const travelers = [{ ...traveler, isGalaxy: true }, { ...traveler, isGalaxy: true }, traveler];
    const projection = { x: 200, y: 200, depth: 400, progress: 0.5, radius: 2, opacity: 0.6, cycle: 0 };
    assert.equal(isSystemCarrier(traveler, 2), true);
    assert.equal(isSystemInViewport(traveler, projection, 1000, 600), true);
    assert.equal(selectProminentSystem(travelers, travelers.map(() => projection), 1000, 600), -1);
  }
});

test('opaque photospheres preserve nebula extinction without influencing simulation or emergence', () => {
  const source = readFileSync(new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('const drawTravelerDisc = (');
  const compiled = stripTypeScriptTypes(source.slice(start, source.indexOf('\n};', start) + 3));
  const gradients = [];
  const alphas = [];
  const surfaceOpacities = [];
  const draw = runInNewContext(`${compiled}\ndrawTravelerDisc;`, {
    ...spaceModel, TAU: Math.PI * 2, hexToRgb: () => [220, 180, 140],
    drawTravelerSurface: (_, appearance, x, y, radius, opacity) => surfaceOpacities.push(opacity),
  });
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'createRadialGradient'
      ? () => ({ addColorStop: (_, color) => gradients.push(color) }) : () => {},
    set: (_, key, value) => { if (key === 'globalAlpha') alphas.push(value); return true; },
  });
  const traveler = { seed: 17, initialDistance: 123, speed: 20, size: 1, alpha: 0.6 };
  const appearance = getTravelerAppearance(traveler, 0.7);
  for (const transmission of [0.025, 0.3, 1]) draw(ctx, appearance, 0, 0, appearance.radius, 1, false, 12, 0.7, transmission);
  assert.deepEqual(alphas, [1, 1, 1]);
  assert.deepEqual(surfaceOpacities, [0.025, 0.3, 1]);
  assert.ok(gradients.every((color) => color.startsWith('rgb(') && !color.startsWith('rgba(')));
  assert.equal(gradients[0], 'rgb(6, 6, 6)');
  assert.equal(gradients[6], 'rgb(255, 255, 255)');
  const field = createNebulaField(12345);
  const times = Array.from({ length: 120 }, (_, index) => index / 10);
  const baseline = times.map((time) => projectTraveler(traveler, time, 1920, 1080));
  const transmissions = baseline.map((projection, index) => getNebulaDepthTransmission(
    sampleNebulaTransmission(field, projection.x, projection.y, times[index]),
    (projection.depth - NEAR_DEPTH) / (FAR_DEPTH - NEAR_DEPTH)));
  assert.ok(new Set(transmissions).size > 20);
  assert.deepEqual(times.map((time) => projectTraveler(traveler, time, 1920, 1080)), baseline);
  for (const dust of [0.025, 0.3, 1]) assert.equal(getNebulaDepthTransmission(dust, 0), 1);
  assert.match(source, /ctx\.fillStyle = '#000000';/);
  assert.match(source, /ctx\.drawImage\(nebulaCanvas/);
  assert.match(source, /opacity \* appearance\.glowOpacity \* transmission/);
});

test('cached cycle budgets preserve source quadrature independently of query order', () => {
  const fixtures = [
    [0, [[125, 948.7518865015396, 5], [900, 954.2082140609372, 34], [3600, 534.6701578571401, 129]]],
    [17, [[125, 263.77221419482464, 4], [900, 110.32613105040423, 32], [3600, 318.7159566117349, 132]]],
    [9876, [[125, 183.46750782635434, 4], [900, 171.7327480942057, 31], [3600, 983.0692557912671, 132]]],
  ];
  for (const [seed, samples] of fixtures) {
    const traveler = { seed, initialDistance: 123, speed: 20, size: 1, alpha: 0.6 };
    for (const [time, depth, cycle] of [...samples].reverse().concat(samples)) {
      const actual = getTravelerDepth(traveler, time);
      closeTo(actual.depth, depth, 1e-7);
      assert.equal(actual.cycle, cycle);
    }
  }
});

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

test('large ambient pool has 560 stars while Star Text retains 280', () => {
  const stars = createAmbientLayout(12345, 0);
  assert.equal(AMBIENT_STAR_COUNT, 560);
  assert.equal(RETAINED_AMBIENT_STAR_COUNT, 280);
  assert.equal(stars.length, AMBIENT_STAR_COUNT);
  assert.equal(starCountForWidth(320), 56);
  assert.equal(starCountForWidth(1920), 560);
  assert.equal(getStarFieldStyles(12345, 47).filter(isStarRenderable).length, 560);

  const anchorCount = createConstellationGeometry(1200, 600, 12345, 1).points.length;
  const hold = getStarFieldStyles(12345, 610);
  assert.equal(hold.length, STAR_FIELD_SLOT_COUNT);
  const holdBackground = hold.slice(MAX_STAR_TEXT_ANCHOR_COUNT);
  assert.ok(holdBackground.filter(isStarRenderable).length <= RETAINED_AMBIENT_STAR_COUNT);
  assert.ok(holdBackground.some(isStarRenderable));
  assert.ok(holdBackground.every(({ strength }) => strength === 0));
  assert.equal(stars.filter((star) => star.driftMode === 'wrap').length, 280);
  assert.equal(stars.filter((star) => star.driftMode === 'bounce').length, 280);
  assert.ok(stars.every((star) => star.driftSpeed >= 0.0007 && star.driftSpeed <= 0.0017));
  assert.deepEqual(AMBIENT_STAR_RADIUS_RANGE, [0.825, 2.09]);
  assert.ok(stars.every((star) => star.size >= 0.825 && star.size <= 2.09));

  const linear = { ...stars[0], x: 0.25, y: 0.4, driftMode: 'wrap', driftAngle: 0, driftSpeed: 0.001 };
  closeTo(getDriftedStar(linear, 100).x, 0.35);
  closeTo(getDriftedStar(linear, 100).y, 0.4);
  const wrap = { ...linear, x: 0.999 };
  closeTo(getDriftedStar(wrap, 2).x, 0.001);
  assert.ok(circularDistance(getDriftedStar(wrap, 0.999).x, getDriftedStar(wrap, 1.001).x) < 0.00001);
  closeTo(getDriftedStarVelocity(wrap, 1, 1200, 600).x, 1.2);
  const bounce = { ...linear, x: 0.999, driftMode: 'bounce' };
  closeTo(getDriftedStar(bounce, 1).x, 1);
  closeTo(getDriftedStar(bounce, 2).x, 0.999);
  assert.ok(Math.abs(getDriftedStar(bounce, 0.999).x - getDriftedStar(bounce, 1.001).x) < 0.00001);
  closeTo(getDriftedStarVelocity(bounce, 1, 1200, 600).x, -1.2);
  closeTo(getDriftedStarVelocity({ ...bounce, x: 0, driftAngle: Math.PI }, 0, 1200, 600).x, 1.2);
});

test('production ambient stars transfer into deterministic origins distributed across every glyph', () => {
  const seed = 0x51a7;
  const elapsed = 180;
  const width = 1200;
  const height = 600;
  const positions = getStarFieldPositions(seed, elapsed, width, height);
  const styles = getStarFieldStyles(seed, elapsed);
  const geometry = createConstellationGeometryForPhrase(width, height, 'Attention', seed, 1);
  const remapped = remapAmbientStarsToTextSlots(
    positions, styles, geometry.points.length,
  );
  assert.equal(remapped.sourceIndices.length, AMBIENT_STAR_COUNT - RETAINED_AMBIENT_STAR_COUNT);
  assert.ok(remapped.sourceIndices.every((index) => index >= MAX_STAR_TEXT_ANCHOR_COUNT));

  const visibleFrame = (framePositions, frameStyles) => frameStyles
    .map((style, index) => ({ style, point: framePositions[index] }))
    .filter(({ style }) => isStarRenderable(style))
    .map(({ style, point }) => `${point.x.toFixed(8)},${point.y.toFixed(8)},${style.opacity.toFixed(8)}`)
    .sort();
  assert.deepEqual(
    visibleFrame(remapped.positions, remapped.styles),
    visibleFrame(positions, styles),
    'slot transfer changed the rendered trigger frame',
  );

  const targetCount = geometry.points.length;
  const targetPositions = positions.map((point, index) =>
    ({ ...(geometry.points[index] ?? point) }));
  const targetStyles = styles.map((style, index) => index < targetCount
    ? createEasterEggTargetStyles(seed, 0, targetCount)[index]
    : style);
  const options = { targetCount };
  const atStart = getEasterEggStarFieldPositions(
    remapped.positions, targetPositions, positions, 0, [], undefined, options,
  );
  const atStartStyles = getEasterEggStarFieldStyles(
    remapped.styles, targetStyles, styles, 0, options,
  );
  assert.deepEqual(
    visibleFrame(atStart, atStartStyles),
    visibleFrame(positions, styles),
    'all-glyph distribution changed the trigger boundary frame',
  );
  const ambientPositionKeys = new Set(positions.slice(MAX_STAR_TEXT_ANCHOR_COUNT)
    .map(({ x, y }) => `${x},${y}`));
  assert.ok(atStart.slice(0, targetCount)
    .every(({ x, y }) => ambientPositionKeys.has(`${x},${y}`)));
  geometry.glyphs.forEach((glyph) => {
    assert.ok(glyph.indices.some((index) => isStarRenderable(atStartStyles[index])),
      `${glyph.character} received no existing ambient star`);
  });
});

test('each star has stable independent speed, phase and subtle dim/bright bounds', () => {
  const stars = createAmbientLayout(6789, 0);
  const parameters = stars.map(getStarTwinkleParameters);
  assert.deepEqual(parameters, createAmbientLayout(6789, 0).map(getStarTwinkleParameters));
  assert.deepEqual(createAmbientLayout(6789, 0, 1120).slice(0, AMBIENT_STAR_COUNT), stars);
  for (const key of ['periodSeconds', 'phase', 'dim', 'bright']) {
    assert.equal(new Set(parameters.map((value) => value[key])).size, stars.length, key);
  }
  stars.forEach((star, index) => {
    const { periodSeconds, phase, dim, bright } = parameters[index];
    assert.ok(periodSeconds >= 8 && periodSeconds <= 18);
    assert.ok(phase >= 0 && phase < Math.PI * 2);
    assert.ok(dim >= 0.82 && dim <= 0.92);
    assert.ok(bright >= 1.04 && bright <= 1.12);
    const samples = Array.from({ length: 1201 }, (_, step) => {
      const time = step / 20;
      const value = getTwinkleBrightness(star, time);
      assert.ok(value >= dim && value <= bright);
      closeTo(value, getTwinkleBrightness(star, time));
      closeTo(value, getTwinkleBrightness(star, time + periodSeconds));
      return value;
    });
    closeTo(Math.min(...samples), dim, 0.0001);
    closeTo(Math.max(...samples), bright, 0.0001);
    closeTo(getTwinkleBrightness(star, -1), getTwinkleBrightness(star, 0));
  });
  for (const time of [0, 1, 47, 120, 240]) {
    const values = stars.map((star) => getTwinkleBrightness(star, time));
    assert.ok(new Set(values.map((value) => value.toFixed(5))).size > 60);
    const slopes = stars.map((star, index) => getTwinkleBrightness(star, time + 0.01) - values[index]);
    assert.ok(slopes.filter((value) => value > 0).length > 15);
    assert.ok(slopes.filter((value) => value < 0).length > 15);
  }
});

test('twinkle is smooth across frames and old window boundaries, and reaches rendered opacity only', () => {
  const seed = 6789;
  const stars = createAmbientLayout(seed, 0);
  for (const time of [0, 8, 18, 119.999, 120, 239.999, 240, 479.999]) {
    const styles = getStarFieldStyles(seed, time).slice(MAX_STAR_TEXT_ANCHOR_COUNT);
    stars.forEach((star, index) => {
      const value = getTwinkleBrightness(star, time);
      // Maximum sine slope is (1.12 - 0.82) * PI / 8 per second.
      assert.ok(Math.abs(getTwinkleBrightness(star, time + 1 / 60) - value) < 0.002);
      closeTo(styles[index].twinkle, value);
      closeTo(styles[index].opacity, star.alpha * value);
      assert.equal(styles[index].alpha, star.alpha);
      assert.equal(styles[index].radius, star.size);
      assert.equal(styles[index].strength, 0);
    });
  }
  for (const time of [600, 605, 610, 619.9, 620, 625, 629.9, 1200]) {
    assert.ok(stars.every((star) => getTwinkleBrightness(star, time) === 1));
  }
});

test('reduced motion disables twinkle and preserves a static ambient frame across redraw times', () => {
  const seed = 6789;
  const stars = createAmbientLayout(seed, 0);
  const staticStyles = getStarFieldStyles(seed, 0, true);
  for (const time of [0, 1, 47, 120, 600, 625, 630, 10000]) {
    assert.deepEqual(getStarFieldStyles(seed, time, true), staticStyles);
    assert.ok(stars.every((star) => getTwinkleBrightness(star, time, true) === 1));
  }
  staticStyles.slice(MAX_STAR_TEXT_ANCHOR_COUNT).forEach((style, index) => {
    assert.equal(style.twinkle, 1);
    assert.equal(style.opacity, stars[index].alpha);
    assert.equal(style.radius, stars[index].size);
  });
  const component = readFileSync(new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8');
  assert.match(component, /styles: getStarFieldStyles\(scene\.seed, elapsed, reducedMotion\)/);
  assert.match(component, /const shouldAnimate = \(\) => !reducedMotion && pageIsVisible && isOnscreen/);
  assert.match(component, /if \(reducedMotion\) drawScene\(0\)/);
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

test('only a non-interactive in-bounds triple click triggers the Easter egg', () => {
  assert.equal(shouldTriggerEasterEgg(1, true, false), false);
  assert.equal(shouldTriggerEasterEgg(2, true, false), false);
  assert.equal(shouldTriggerEasterEgg(3, true, false), true);
  assert.equal(shouldTriggerEasterEgg(3, false, false), false);
  assert.equal(shouldTriggerEasterEgg(3, true, true), false);
  assert.equal(shouldTriggerEasterEgg(3, true, false, true), false);
  assert.equal(shouldTriggerEasterEgg(4, true, false), false);
});

test('three separately observed nearby clicks work when native detail remains one', () => {
  assert.equal(EASTER_EGG_CLICK_INTERVAL_MS, 500);
  assert.equal(EASTER_EGG_CLICK_DISTANCE_PX, 8);
  const click = (previous, timestamp, x = 400, y = 220, inside = true, interactive = false, reduced = false) =>
    advanceEasterEggClickSequence(previous, { timestamp, x, y }, inside, interactive, reduced);

  const first = click(null, 1000);
  const second = click(first, 1160, 404, 223);
  const third = click(second, 1325, 400, 220);
  assert.deepEqual([first.count, second.count, third.count], [1, 2, 3]);
  assert.equal(shouldTriggerEasterEgg(Math.max(1, third.count), true, false), true);

  assert.equal(click(second, 1325, 400, 220, true, true), null);
  assert.equal(click(second, 1325, 400, 220, false), null);
  assert.equal(click(second, 1325, 400, 220, true, false, true), null);
  assert.equal(click(second, 1160 + EASTER_EGG_CLICK_INTERVAL_MS + 1).count, 1);
  assert.equal(click(second, 1325, second.x + EASTER_EGG_CLICK_DISTANCE_PX + 1).count, 1);
});

test('Easter eggs cycle deterministically through every hidden phrase and never select LONGMONT AI', () => {
  assert.deepEqual(EASTER_EGG_PHRASES, CONSTELLATION_PHRASES.slice(1));
  for (const seed of [0, 1, 0x51a7, 0xffffffff]) {
    const firstCycle = Array.from({ length: 6 }, (_, trigger) => selectEasterEggPhrase(seed, trigger));
    assert.equal(new Set(firstCycle).size, 6);
    assert.deepEqual([...firstCycle].sort(), [...EASTER_EGG_PHRASES].sort());
    assert.ok(firstCycle.every((phrase) => phrase !== 'LONGMONT AI'));
    assert.deepEqual(
      Array.from({ length: 6 }, (_, trigger) => selectEasterEggPhrase(seed, trigger + 6)),
      firstCycle,
    );
  }
});

test('Easter-egg lifecycle gives every glyph one shared exact 10s morph, hold, and fade', () => {
  assert.deepEqual(getStarTextIntroProgress(0), {
    stage: 'morph-in', progress: 0,
  });
  assert.equal(getStarTextIntroProgress(3.999).stage, 'morph-in');
  closeTo(getStarTextIntroProgress(5).progress, 0.5);
  assert.deepEqual(getStarTextIntroProgress(10), {
    stage: 'complete', progress: 1,
  });
  assert.equal(getEasterEggPhase(0).name, 'morph-in');
  closeTo(getEasterEggPhase(5).progress, 0.5);
  assert.equal(getEasterEggPhase(9.999).name, 'morph-in');
  assert.equal(getEasterEggPhase(10).name, 'hold');
  assert.equal(getEasterEggPhase(19.999).name, 'hold');
  assert.equal(getEasterEggPhase(20).name, 'morph-out');
  closeTo(getEasterEggPhase(25).progress, 0.5);
  assert.equal(getEasterEggPhase(29.999).name, 'morph-out');
  assert.equal(getEasterEggPhase(30).name, 'ambient');
  closeTo(getEasterEggStrength(0.37, 0.22, 0), 0.37);
  closeTo(getEasterEggStrength(0.37, 0.22, 5), 0.685);
  closeTo(getEasterEggStrength(0.37, 0.22, 10), 1);
  closeTo(getEasterEggStrength(0.37, 0.22, 20), 1);
  closeTo(getEasterEggStrength(0.37, 0.22, 25), 0.61);
  closeTo(getEasterEggStrength(0.37, 0.22, 30), 0.22);
});

test('scheduled and Easter intros share all-glyph progress and exact morph boundaries', () => {
  const seed = 777;
  const width = 1200;
  const height = 600;
  const geometry = createConstellationGeometry(width, height, seed, 1);
  const targetCount = geometry.points.length;
  const ambientPositions = getStarFieldPositions(seed, 120, width, height);
  const ambientStyles = getStarFieldStyles(seed, 120);
  const remapped = remapAmbientStarsToTextSlots(
    ambientPositions, ambientStyles, targetCount,
  );
  const targetPositions = remapped.positions.map((point, index) =>
    ({ ...(geometry.points[index] ?? point) }));
  const scheduledHoldStyles = getStarFieldStyles(seed, 610);
  const targetStyles = remapped.styles.map((style, index) =>
    ({ ...(scheduledHoldStyles[index] ?? style) }));
  const options = { targetCount };

  for (const age of [0, 0.001, 2.5, 5, 7.5, 9.999, 10]) {
    const scheduledStyles = getStarFieldStyles(seed, 600 + age);
    const easterStyles = getEasterEggStarFieldStyles(
      remapped.styles, targetStyles, ambientStyles, age, options,
    );
    const expected = age < 10 ? getConstellationPhase(600 + age).progress : 1;
    geometry.glyphs.forEach((glyph) => glyph.indices.forEach((index) => {
      closeTo(scheduledStyles[index].strength, expected);
      closeTo(easterStyles[index].strength, expected);
    }));
  }

  assert.deepEqual(
    getEasterEggStarFieldPositions(
      remapped.positions, targetPositions, ambientPositions, 10, [], undefined, options,
    ).slice(0, targetCount),
    geometry.points,
  );
  assert.deepEqual(
    getStarFieldPositions(seed, 610, width, height).slice(0, targetCount),
    geometry.points,
  );
});

test('every phrase and seed uses identical position, opacity, strength, and geometry progress', () => {
  const width = 1200;
  const height = 600;
  const seeds = [0, 1, 0x51a7, 0xffffffff];
  const ages = [0, 0.001, 2.5, 4, 5, 7.5, 9.999, 10];

  for (const seed of seeds) {
    for (const [phraseIndex, phrase] of CONSTELLATION_PHRASES.entries()) {
      const event = phraseIndex + 1;
      const geometry = createConstellationGeometryForPhrase(
        width, height, phrase, seed, event,
      );
      const ambientPositions = getStarFieldPositions(seed, 120, width, height);
      const ambientStyles = getStarFieldStyles(seed, 120);
      const remapped = remapAmbientStarsToTextSlots(
        ambientPositions, ambientStyles, geometry.points.length,
      );
      const targets = remapped.positions.map((point, index) =>
        ({ ...(geometry.points[index] ?? point) }));
      const targetStyles = remapped.styles.map((style) => ({ ...style }));
      createEasterEggTargetStyles(seed, event - 1, geometry.points.length)
        .forEach((style, index) => { targetStyles[index] = style; });
      const options = { targetCount: geometry.points.length };
      const origins = getEasterEggStarFieldPositions(
        remapped.positions, targets, ambientPositions, 0, [], undefined, options,
      );
      const originStyles = getEasterEggStarFieldStyles(
        remapped.styles, targetStyles, ambientStyles, 0, options,
      );

      for (const age of ages) {
        const progress = getEasterEggPhase(age).progress;
        const positions = getEasterEggStarFieldPositions(
          remapped.positions, targets, ambientPositions, age, [], undefined, options,
        );
        const styles = getEasterEggStarFieldStyles(
          remapped.styles, targetStyles, ambientStyles, age, options,
        );
        geometry.glyphs.forEach((glyph) => glyph.indices.forEach((index) => {
          closeTo(positions[index].x,
            origins[index].x + (targets[index].x - origins[index].x) * progress);
          closeTo(positions[index].y,
            origins[index].y + (targets[index].y - origins[index].y) * progress);
          closeTo(styles[index].opacity,
            originStyles[index].opacity
              + (targetStyles[index].opacity - originStyles[index].opacity) * progress);
          closeTo(styles[index].strength, progress);
        }));
      }
      assert.deepEqual(
        getEasterEggStarFieldPositions(
          remapped.positions, targets, ambientPositions, 10, [], undefined, options,
        ).slice(0, geometry.points.length),
        geometry.points,
        `${phrase}/${seed} missed exact full geometry`,
      );
    }
  }
});

test('production model and Canvas contain no staged-glyph compatibility path', () => {
  const modelSource = readFileSync(
    new URL('../../src/components/spaceBackgroundModel.ts', import.meta.url), 'utf8',
  );
  const componentSource = readFileSync(
    new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8',
  );
  for (const [name, source] of [['model', modelSource], ['component', componentSource]]) {
    assert.doesNotMatch(source, /first[\s_-]*glyph|glyph[\s_-]*first|burst/i,
      `${name} restored staged-glyph runtime naming`);
  }
  assert.match(componentSource,
    /remapAmbientStarsToTextSlots\([\s\n]*startPositions, startStyles, geometry\.points\.length,/);
  assert.match(componentSource, /remapped\.sourceIndices\.forEach/);
  assert.match(componentSource,
    /\{ geometry: easterEgg\.geometry, strength: phase\.progress \}/,
    'Canvas line reveal does not use the shared lifecycle progress');
});

test('production transition options preserve the exact frame when retriggered mid-event', () => {
  const width = 1200;
  const height = 600;
  const seed = 0x72a7;
  for (const elapsed of [600, 605, 610, 615, 620, 625]) {
    const startPositions = getStarFieldPositions(seed, elapsed, width, height);
    const startStyles = getStarFieldStyles(seed, elapsed);
    const geometry = createConstellationGeometryForPhrase(
      width, height, 'Attention', seed, 2,
    );
    const targetPositions = startPositions.map((point, index) =>
      ({ ...(geometry.points[index] ?? point) }));
    const targetStyles = startStyles.map((style) => ({ ...style }));
    createEasterEggTargetStyles(seed, 1, geometry.points.length)
      .forEach((style, index) => { targetStyles[index] = style; });
    const options = { targetCount: geometry.points.length };
    assert.deepEqual(
      getEasterEggStarFieldPositions(
        startPositions, targetPositions, startPositions, 0, [], undefined, options,
      ),
      startPositions,
      `positions changed on trigger at ${elapsed}`,
    );
    assert.deepEqual(
      getEasterEggStarFieldStyles(
        startStyles, targetStyles, startStyles, 0, options,
      ),
      startStyles,
      `styles changed on trigger at ${elapsed}`,
    );
  }
});

test('Easter-egg endpoints and active-transition restarts preserve exact rendered frames', () => {
  const starFieldCount = CONSTELLATION_STAR_COUNT + RETAINED_AMBIENT_STAR_COUNT;
  const start = Array.from({ length: starFieldCount }, (_, index) =>
    ({ x: index + 0.25, y: index * 2 + 0.5 }));
  const targets = Array.from({ length: CONSTELLATION_STAR_COUNT }, (_, index) =>
    ({ x: 500 - index, y: 100 + index }));
  const end = Array.from({ length: starFieldCount }, (_, index) =>
    ({ x: index * 3, y: 800 - index }));
  const style = (offset, length = starFieldCount) => Array.from({ length }, (_, index) => ({
    alpha: 0.2 + offset + index / 1000,
    twinkle: 0.5 + offset,
    strength: offset,
    radius: 1 + offset,
    opacity: 0.3 + offset,
  }));
  const startStyles = style(0);
  const targetStyles = style(0.2, CONSTELLATION_STAR_COUNT);
  const endStyles = style(0.4);
  const holdPositions = [...targets, ...start.slice(CONSTELLATION_STAR_COUNT)];
  const holdStyles = [...targetStyles, ...startStyles.slice(CONSTELLATION_STAR_COUNT)];

  assert.deepEqual(getEasterEggStarFieldPositions(start, targets, end, 0), start);
  assert.deepEqual(getEasterEggStarFieldPositions(start, targets, end, 10), holdPositions);
  assert.deepEqual(getEasterEggStarFieldPositions(start, targets, end, 20), holdPositions);
  assert.deepEqual(getEasterEggStarFieldPositions(start, targets, end, 30), end);
  assert.deepEqual(getEasterEggStarFieldStyles(startStyles, targetStyles, endStyles, 0), startStyles);
  assert.deepEqual(getEasterEggStarFieldStyles(startStyles, targetStyles, endStyles, 10), holdStyles);
  assert.deepEqual(getEasterEggStarFieldStyles(startStyles, targetStyles, endStyles, 30), endStyles);

  const endpointVelocities = start.map((_, index) => ({
    x: (index % 5 - 2) * 0.17,
    y: (index % 7 - 3) * 0.11,
  }));
  const epsilon = 0.00001;
  const justBeforeEnd = getEasterEggStarFieldPositions(
    start, targets, end, 30 - epsilon, endpointVelocities, { x: 1000, y: 1000 },
  );
  end.forEach((point, index) => {
    closeTo((point.x - justBeforeEnd[index].x) / epsilon, endpointVelocities[index].x, 0.001);
    closeTo((point.y - justBeforeEnd[index].y) / epsilon, endpointVelocities[index].y, 0.001);
  });

  const renderedAtRestart = getEasterEggStarFieldPositions(start, targets, end, 4.25);
  const renderedStylesAtRestart = getEasterEggStarFieldStyles(startStyles, targetStyles, endStyles, 4.25);
  const nextPhrase = createConstellationGeometryForPhrase(1200, 600, EASTER_EGG_PHRASES[1]);
  assert.ok(nextPhrase.points.length >= MIN_GLYPH_STAR_COUNT);
  assert.ok(nextPhrase.edges.length > 0);
  assert.deepEqual(
    getEasterEggStarFieldPositions(renderedAtRestart, nextPhrase.points, end, 0),
    renderedAtRestart,
  );
  assert.deepEqual(
    getEasterEggStarFieldStyles(renderedStylesAtRestart, targetStyles, endStyles, 0),
    renderedStylesAtRestart,
  );
});

test('Easter choreography moves every glyph concurrently and keeps a fade-only outro', () => {
  const geometry = createConstellationGeometryForPhrase(1200, 600, 'Attention', 0x51a7, 2);
  const targetCount = geometry.points.length;
  const total = targetCount + 5;
  const ambient = Array.from({ length: AMBIENT_STAR_COUNT }, (_, index) =>
    ({ x: 20 + index * 13, y: 30 + (index * 29) % 500 }));
  const origins = createStarTextAmbientOrigins(ambient, targetCount);
  const start = [...origins, ...Array.from({ length: 5 }, (_, index) => ({ x: index, y: index }))];
  const end = Array.from({ length: total }, (_, index) => ({ x: 1000 - index, y: 500 - index }));
  const targets = [...geometry.points, ...start.slice(targetCount)];
  const style = (opacity) => ({ alpha: opacity, twinkle: 1, strength: opacity,
    radius: 1.2, opacity });
  const startStyles = [
    ...Array.from({ length: targetCount }, () => style(0)),
    ...Array.from({ length: total - targetCount }, () => style(0.5)),
  ];
  const targetStyles = [
    ...Array.from({ length: targetCount }, () => style(1)),
    ...Array.from({ length: total - targetCount }, () => style(0.5)),
  ];
  const endStyles = Array.from({ length: total }, (_, index) => index < targetCount
    ? { alpha: 0, twinkle: 0.25, strength: 0, radius: 0.37, opacity: 0 }
    : style(0.7));
  const options = { targetCount, endpointVisible: endStyles.map(isStarRenderable) };

  const early = getEasterEggStarFieldPositions(start, targets, end, 2, [], undefined, options);
  const earlyStyles = getEasterEggStarFieldStyles(
    startStyles, targetStyles, endStyles, 2, options,
  );
  const sharedProgress = getEasterEggPhase(2).progress;
  geometry.glyphs.forEach((glyph) => {
    assert.ok(glyph.indices.every((index) => earlyStyles[index].strength > 0));
    assert.ok(glyph.indices.some((index) => Math.hypot(
      early[index].x - start[index].x, early[index].y - start[index].y,
    ) > 1));
    glyph.indices.forEach((index) => closeTo(earlyStyles[index].strength, sharedProgress));
  });
  assert.deepEqual(
    getEasterEggStarFieldPositions(start, targets, end, 10, [], undefined, options),
    targets,
  );
  const outMiddle = getEasterEggStarFieldPositions(start, targets, end, 25, [], undefined, options);
  assert.deepEqual(outMiddle.slice(0, targetCount), targets.slice(0, targetCount));
  for (const age of [20, 22.5, 25, 27.5, 29.999, 30]) {
    const outStyles = getEasterEggStarFieldStyles(
      startStyles, targetStyles, endStyles, age, options,
    );
    outStyles.slice(0, targetCount).forEach((outStyle) => {
      closeTo(outStyle.radius, 1.2);
      closeTo(outStyle.twinkle, 1);
    });
  }
  const outMiddleStyles = getEasterEggStarFieldStyles(
    startStyles, targetStyles, endStyles, 25, options,
  );
  outMiddleStyles.slice(0, targetCount).forEach(({ opacity }) => closeTo(opacity, 0.5));
  const fadedStyles = getEasterEggStarFieldStyles(
    startStyles, targetStyles, endStyles, 30, options,
  );
  fadedStyles.slice(0, targetCount).forEach((fadedStyle) => {
    assert.equal(fadedStyle.alpha, 0);
    assert.equal(fadedStyle.opacity, 0);
    assert.equal(fadedStyle.strength, 0);
    assert.equal(fadedStyle.radius, 1.2);
    assert.equal(fadedStyle.twinkle, 1);
  });
  assert.deepEqual(fadedStyles.slice(targetCount), endStyles.slice(targetCount));
});

test('Easter outro converges to scheduled endpoint frames, including trigger wall time 580', () => {
  const width = 1200;
  const height = 600;
  const seed = 0x72a7;
  const hidden = { alpha: 0, twinkle: 1, strength: 0, radius: 1, opacity: 0 };
  const createProductionTransition = (triggerElapsed) => {
    const geometry = createConstellationGeometryForPhrase(
      width, height, 'Attention', seed, 1,
    );
    const rawStartPositions = getStarFieldPositions(seed, triggerElapsed, width, height);
    const rawStartStyles = getStarFieldStyles(seed, triggerElapsed);
    const retainedIndices = rawStartStyles
      .map((style, index) => ({ style, index }))
      .filter(({ style }) => style.strength === 0 && style.opacity > 0)
      .slice(-RETAINED_AMBIENT_STAR_COUNT)
      .map(({ index }) => index);
    const targetPositions = rawStartPositions.map((point) => ({ ...point }));
    const targetStyles = rawStartStyles.map(() => ({ ...hidden }));
    geometry.points.forEach((point, index) => { targetPositions[index] = { ...point }; });
    createEasterEggTargetStyles(seed, 0, geometry.points.length)
      .forEach((style, index) => { targetStyles[index] = { ...style }; });
    retainedIndices.forEach((index) => { targetStyles[index] = { ...rawStartStyles[index] }; });

    let startPositions = rawStartPositions;
    let startStyles = rawStartStyles;
    if (getConstellationPhase(triggerElapsed).name === 'ambient') {
      const remapped = remapAmbientStarsToTextSlots(
        rawStartPositions, rawStartStyles, geometry.points.length,
      );
      startPositions = remapped.positions;
      startStyles = remapped.styles;
      remapped.sourceIndices
        .forEach((index) => { targetStyles[index] = { ...startStyles[index] }; });
    }
    const endpoint = triggerElapsed + CONSTELLATION_WINDOW_SECONDS;
    const endPositions = getStarFieldPositions(seed, endpoint, width, height);
    const endStyles = getStarFieldStyles(seed, endpoint);
    const options = {
      targetCount: geometry.points.length,
      endpointVisible: endStyles.map(isStarRenderable),
    };
    return { geometry, startPositions, startStyles, targetPositions, targetStyles,
      endPositions, endStyles, options };
  };

  let checkedVisible = 0;
  for (const triggerElapsed of [0, 120, 550, 560, 570, 580, 590, 600, 605, 610, 615, 620, 625]) {
    const transition = createProductionTransition(triggerElapsed);
    const before = getEasterEggStarFieldPositions(
      transition.startPositions, transition.targetPositions, transition.endPositions,
      29.999, [], { x: width, y: height }, transition.options,
    );
    const at = getEasterEggStarFieldPositions(
      transition.startPositions, transition.targetPositions, transition.endPositions,
      30, [], { x: width, y: height }, transition.options,
    );
    const beforeStyles = getEasterEggStarFieldStyles(
      transition.startStyles, transition.targetStyles, transition.endStyles,
      29.999, transition.options,
    );
    const atStyles = getEasterEggStarFieldStyles(
      transition.startStyles, transition.targetStyles, transition.endStyles,
      30, transition.options,
    );
    transition.options.endpointVisible.forEach((visible, index) => {
      if (!visible) return;
      assert.deepEqual(at[index], transition.endPositions[index]);
      assert.deepEqual(atStyles[index], transition.endStyles[index]);
      assert.ok(Math.hypot(at[index].x - before[index].x, at[index].y - before[index].y) < 0.01,
        `trigger ${triggerElapsed} visible slot ${index} position popped`);
      for (const property of ['alpha', 'twinkle', 'strength', 'radius', 'opacity']) {
        closeTo(beforeStyles[index][property], atStyles[index][property], 0.00001);
      }
      checkedVisible += 1;
    });
    for (let index = 0; index < transition.geometry.points.length; index += 1) {
      if (transition.options.endpointVisible[index]) continue;
      assert.deepEqual(before[index], transition.targetPositions[index]);
      assert.deepEqual(at[index], transition.targetPositions[index]);
      assert.equal(beforeStyles[index].radius, transition.targetStyles[index].radius);
      assert.equal(atStyles[index].radius, transition.targetStyles[index].radius);
      assert.equal(beforeStyles[index].twinkle, transition.targetStyles[index].twinkle);
      assert.equal(atStyles[index].twinkle, transition.targetStyles[index].twinkle);
      for (const property of ['alpha', 'strength', 'opacity']) {
        closeTo(atStyles[index][property], transition.endStyles[index][property]);
      }
    }
    for (let index = transition.geometry.points.length; index < atStyles.length; index += 1) {
      assert.deepEqual(atStyles[index], transition.endStyles[index]);
    }
  }
  assert.ok(checkedVisible > 1000, `only ${checkedVisible} live endpoint slots checked`);

  const overlap = createProductionTransition(580);
  const holdEndpointVisible = overlap.endStyles
    .slice(0, overlap.geometry.points.length).filter(isStarRenderable).length;
  assert.ok(holdEndpointVisible > 0, 'trigger 580 fixture no longer ends in scheduled hold');
});

test('screen-wrapped endpoint sampling rejects a full-screen wrap as physical velocity', () => {
  const width = 1200;
  const height = 600;
  const elapsed = 581.601153;
  const delta = 0.001;
  const ambientIndex = MAX_STAR_TEXT_ANCHOR_COUNT + 1;
  const before = getStarFieldPositions(0, elapsed, width, height)[ambientIndex];
  const after = getStarFieldPositions(0, elapsed + delta, width, height)[ambientIndex];
  assert.ok(after.y - before.y > height * 0.99, 'fixture no longer crosses the y wrap seam');
  const velocity = getScreenWrappedVelocity(before, after, delta, width, height);
  closeTo(velocity.x, 0.6250094093, 0.0001);
  closeTo(velocity.y, -0.8335609414, 0.0001);
  assert.ok(Math.abs(velocity.x) < 3 && Math.abs(velocity.y) < 3);
});

test('Easter returns stay finite and in bounds across wrapped endpoint samples', () => {
  const width = 1200;
  const height = 600;
  const sampleDelta = 0.001;
  const derivativeDelta = 0.00001;
  const endpoints = [581.601153, ...Array.from({ length: 20 }, (_, index) => 40 + index * 26.7)];
  let parityChecks = 0;
  endpoints.forEach((endpoint, fixtureIndex) => {
    const seed = fixtureIndex === 0 ? 0 : fixtureIndex;
    const start = getStarFieldPositions(seed, Math.max(0, endpoint - 30), width, height);
    const end = getStarFieldPositions(seed, endpoint, width, height);
    const after = getStarFieldPositions(seed, endpoint + sampleDelta, width, height);
    const targets = createConstellationGeometry(width, height, seed, 1).points.slice(0, start.length);
    const velocities = end.map((point, index) => getScreenWrappedVelocity(
      point, after[index] ?? point, sampleDelta, width, height,
    ));
    for (const age of [20, 22.5, 25, 27.5, 29.5, 29.999]) {
      getEasterEggStarFieldPositions(
        start, targets, end, age, velocities, { x: width, y: height },
      ).forEach(({ x, y }, index) => {
          assert.ok(Number.isFinite(x) && Number.isFinite(y), `non-finite ${fixtureIndex}/${age}/${index}`);
          assert.ok(x >= 0 && x <= width && y >= 0 && y <= height,
            `out of bounds ${fixtureIndex}/${age}/${index}: ${x},${y}`);
        });
    }
    const incoming = getEasterEggStarFieldPositions(
      start, targets, end, 30 - derivativeDelta, velocities, { x: width, y: height },
    );
    end.forEach((point, index) => {
      const rawX = (after[index]?.x ?? point.x) - point.x;
      const rawY = (after[index]?.y ?? point.y) - point.y;
      if (Math.abs(rawX) > width / 2 || Math.abs(rawY) > height / 2) return;
      const bounded = getSeamAwareReturnVelocity(
        point, velocities[index], width, height,
      );
      if (bounded.x !== velocities[index].x || bounded.y !== velocities[index].y) return;
      closeTo((point.x - incoming[index].x) / derivativeDelta, velocities[index].x, 0.01);
      closeTo((point.y - incoming[index].y) / derivativeDelta, velocities[index].y, 0.01);
      parityChecks += 1;
    });
  });
  assert.ok(parityChecks > 1000, `only ${parityChecks} non-seam velocity checks`);
});

test('seam-aware Easter return attenuates the seed 149 edge derivative without leaving canvas', () => {
  const width = 1200;
  const height = 600;
  const endpoint = 348.2;
  const sampleDelta = 0.001;
  const seed = 149;
  const starIndex = MAX_STAR_TEXT_ANCHOR_COUNT + 57;
  const start = getStarFieldPositions(seed, endpoint - 30, width, height);
  const end = getStarFieldPositions(seed, endpoint, width, height);
  const after = getStarFieldPositions(seed, endpoint + sampleDelta, width, height);
  const targets = createConstellationGeometry(width, height, seed, 1).points.slice(0, start.length);
  const velocities = end.map((point, index) => getScreenWrappedVelocity(
    point, after[index] ?? point, sampleDelta, width, height,
  ));
  closeTo(end[starIndex].x, 0.0046035425, 1e-8);
  assert.ok(velocities[starIndex].x > 1.79);
  const attenuated = getSeamAwareReturnVelocity(
    end[starIndex], velocities[starIndex], width, height,
  );
  closeTo(attenuated.x, end[starIndex].x * 4 / 10, 1e-12);
  assert.ok(attenuated.x < velocities[starIndex].x * 0.01);

  let minimumX = Infinity;
  for (let age = 20; age <= 30; age += 0.02) {
    const point = getEasterEggStarFieldPositions(
      start, targets, end, age, velocities, { x: width, y: height },
    )[starIndex];
    minimumX = Math.min(minimumX, point.x);
    assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height,
      `${age}: ${point.x},${point.y}`);
  }
  assert.ok(minimumX >= 0, `curve escaped to ${minimumX}`);
  assert.deepEqual(getEasterEggStarFieldPositions(
    start, targets, end, 30, velocities, { x: width, y: height },
  ), end);
});

test('broad Easter seam sweep keeps every sampled trajectory finite and in bounds', () => {
  const width = 1200;
  const height = 600;
  const sampleDelta = 0.001;
  let checked = 0;
  for (let seed = 0; seed < 160; seed += 1) {
    const endpoint = 35 + (seed * 17.381) % 540;
    const start = getStarFieldPositions(seed, Math.max(0, endpoint - 30), width, height);
    const end = getStarFieldPositions(seed, endpoint, width, height);
    const after = getStarFieldPositions(seed, endpoint + sampleDelta, width, height);
    const targets = createConstellationGeometry(width, height, seed, 1).points.slice(0, start.length);
    const velocities = end.map((point, index) => getScreenWrappedVelocity(
      point, after[index] ?? point, sampleDelta, width, height,
    ));
    for (const age of [20, 23, 26, 28, 29.5, 29.9, 29.99]) {
      getEasterEggStarFieldPositions(
        start, targets, end, age, velocities, { x: width, y: height },
      ).forEach(({ x, y }, index) => {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
        assert.ok(x >= 0 && x <= width && y >= 0 && y <= height,
          `seed ${seed} age ${age} star ${index}: ${x},${y}`);
        checked += 1;
      });
    }
  }
  assert.equal(checked, 160 * 7 * STAR_FIELD_SLOT_COUNT);
});

test('Easter target styles retain every constellation anchor and scheduled selection remains unchanged', () => {
  const phrase = selectEasterEggPhrase(0x51a7, 3);
  const expectedCount = getConstellationGlyphAnchorCounts(phrase, 0x51a7, 4)
    .reduce((sum, count) => sum + count, 0);
  const styles = createEasterEggTargetStyles(0x51a7, 3);
  assert.equal(styles.length, expectedCount);
  assert.ok(styles.every(({ strength, twinkle, opacity }) =>
    strength === 1 && twinkle === 1 && opacity > 0));
  for (let event = 1; event <= 20; event += 1) {
    assert.equal(
      createConstellationGeometry(1200, 600, 0x51a7, event).phrase,
      selectConstellationPhrase(0x51a7, event),
    );
  }
});

test('constellation phrase buckets preserve spelling and exact 50/50 then equal-alternative semantics', () => {
  assert.deepEqual(CONSTELLATION_PHRASES, [
    'LONGMONT AI',
    '1023.Digital',
    'Nerual Networks',
    'Attention',
    'Transformer',
    'Context',
    'Harness',
  ]);
  const buckets = Array.from({ length: 12 }, (_, bucket) => getConstellationPhraseForBucket(bucket));
  assert.equal(buckets.filter((phrase) => phrase === 'LONGMONT AI').length, 6);
  CONSTELLATION_PHRASES.slice(1).forEach((phrase) => {
    assert.equal(buckets.filter((candidate) => candidate === phrase).length, 1, phrase);
  });
  assert.equal(getConstellationPhraseForBucket(12), 'LONGMONT AI');
  assert.equal(getConstellationPhraseForBucket(-1), 'Harness');
});

test('event selection is stable and every phrase is reachable from deterministic seed/event identity', () => {
  const observed = new Set();
  for (let seed = 0; seed < 64; seed += 1) {
    for (let event = 1; event < 64; event += 1) {
      const selected = selectConstellationPhrase(seed, event);
      assert.equal(selectConstellationPhrase(seed, event), selected);
      observed.add(selected);
    }
  }
  assert.deepEqual([...observed].sort(), [...CONSTELLATION_PHRASES].sort());
});

test('every glyph receives deterministic variable density with unique readable anchors', () => {
  const sceneSeed = 0x51a7;
  const eventByPhrase = new Map();
  for (let event = 1; event < 1000 && eventByPhrase.size < CONSTELLATION_PHRASES.length; event += 1) {
    const phrase = selectConstellationPhrase(sceneSeed, event);
    if (!eventByPhrase.has(phrase)) eventByPhrase.set(phrase, event);
  }
  assert.equal(eventByPhrase.size, CONSTELLATION_PHRASES.length);

  for (const phrase of CONSTELLATION_PHRASES) {
    for (const { width, height, minimumY } of [
      { width: 1200, height: 600, minimumY: 0.2 },
      { width: 390, height: 844, minimumY: 0.34 },
    ]) {
      const { points, edges, glyphs, phrase: renderedPhrase } = createConstellationGeometry(
        width,
        height,
        sceneSeed,
        eventByPhrase.get(phrase),
      );
      assert.equal(renderedPhrase, phrase);
      assert.equal(glyphs.map(({ character }) => character).join(''), phrase.replaceAll(' ', ''));
      const expectedCounts = getConstellationGlyphAnchorCounts(
        phrase, sceneSeed, eventByPhrase.get(phrase),
      );
      assert.deepEqual(glyphs.map(({ indices }) => indices.length), expectedCounts);
      assert.ok(expectedCounts.every((count) =>
        count >= MIN_GLYPH_STAR_COUNT && count <= MAX_GLYPH_STAR_COUNT));
      assert.equal(points.length, expectedCounts.reduce((sum, count) => sum + count, 0));
      assert.equal(new Set(points.map(({ x, y }) => `${x},${y}`)).size, points.length);
      assert.ok(points.every(({ x, y }) =>
        x > width * 0.05 && x < width * 0.95 && y > height * minimumY && y < height * 0.58),
      `${phrase} escaped ${width}x${height} safe bounds`);
      assert.ok(edges.length > 0, 'glyph strokes must have rendered lines');
      assert.ok(edges.every(({ from, to }) =>
        from >= 0 && from < points.length && to >= 0 && to < points.length && from !== to));

      const neighbors = Array.from({ length: points.length }, () => []);
      edges.forEach(({ from, to }) => {
        neighbors[from].push(to);
        neighbors[to].push(from);
      });
      for (const glyph of glyphs) {
        const glyphSet = new Set(glyph.indices);
        assert.ok(glyph.indices.every((index) => neighbors[index].length > 0));
        assert.ok(glyph.indices.every((index) => neighbors[index].every((neighbor) => glyphSet.has(neighbor))),
          `${phrase}/${glyph.character} has a cross-glyph edge`);
        // Disconnected source-graph components must not be joined merely to force
        // a spanning tree. Stroke containment and coverage are checked below.

        const nearest = glyph.indices.map((index) => Math.min(...glyph.indices
          .filter((candidate) => candidate !== index)
          .map((candidate) => Math.hypot(
            points[index].x - points[candidate].x,
            points[index].y - points[candidate].y,
          ))));
        const mean = nearest.reduce((sum, distance) => sum + distance, 0) / nearest.length;
        const deviation = Math.sqrt(nearest.reduce(
          (sum, distance) => sum + (distance - mean) ** 2, 0,
        ) / nearest.length);
        const xs = glyph.indices.map((index) => points[index].x);
        const ys = glyph.indices.map((index) => points[index].y);
        const span = Math.max(1, Math.hypot(Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys)));
        assert.ok(Math.min(...nearest) / span > 0.0125,
          `${phrase}/${glyph.character} contains a duplicate halo`);
        assert.ok(deviation / mean < 0.34,
          `${phrase}/${glyph.character} nearest-neighbor spacing is clustered`);
      }
    }
  }
});

// Read the actual private source graph without adding a production testing API.
const sourceGlyphGraph = runInNewContext(`${stripTypeScriptTypes(readFileSync(
  new URL('../../src/components/spaceBackgroundModel.ts', import.meta.url), 'utf8',
)).replace(/^export /gm, '')}\n({ GLYPHS, createGlyphStrokes });`);

const liesOnStroke = (point, [start, end]) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const px = point.x - start.x;
  const py = point.y - start.y;
  const dot = px * dx + py * dy;
  return Math.abs(px * dy - py * dx) < 1e-7
    && dot >= -1e-7 && dot <= dx * dx + dy * dy + 1e-7;
};

const glyphSpacePoints = (geometry, width, height) => {
  const lineWidth = [...geometry.phrase].reduce((sum, char) => sum + (char === ' ' ? 4 : 6), 0) - 1;
  const cell = Math.min(width * 0.84 / lineWidth, height * 0.22 / 6);
  const centerY = height * (width < height ? 0.45 : 0.34);
  return geometry.points.map(({ x, y }) => ({
    x: (x - width * 0.5 + lineWidth * cell * 0.5) / cell,
    y: (y - centerY) / cell + 3,
  }));
};

test('all phrase edges follow source strokes and only join local consecutive samples', () => {
  for (const phrase of CONSTELLATION_PHRASES) {
    for (let seed = 0; seed < 64; seed += 1) {
      const event = seed * 7 + 1;
      const [width, height] = seed % 2 ? [390, 844] : [1200, 600];
      const geometry = createConstellationGeometryForPhrase(width, height, phrase, seed, event);
      assert.deepEqual(geometry,
        createConstellationGeometryForPhrase(width, height, phrase, seed, event));
      const points = glyphSpacePoints(geometry, width, height);
      assert.deepEqual(geometry.glyphs.map(({ indices }) => indices.length),
        getConstellationGlyphAnchorCounts(phrase, seed, event));
      assert.equal(new Set(points.map(({ x, y }) => `${x},${y}`)).size, points.length);
      const degree = points.map(() => 0);
      const edgeKeys = new Set();
      let cursor = 0;
      let glyphIndex = 0;
      for (const character of phrase) {
        if (character === ' ') { cursor += 4; continue; }
        const glyph = geometry.glyphs[glyphIndex++];
        const indices = new Set(glyph.indices);
        const strokes = sourceGlyphGraph.createGlyphStrokes(
          sourceGlyphGraph.GLYPHS[character.toUpperCase()],
        ).map((stroke) => stroke.map(({ x, y }) => ({ x: x + cursor, y })));
        for (const { from, to } of geometry.edges.filter((edge) => indices.has(edge.from))) {
          const label = `${phrase}/${character} seed=${seed} event=${event} edge=${from},${to}`;
          assert.ok(indices.has(to), `${label}: bridged letters`);
          assert.notEqual(from, to, label);
          const key = [from, to].sort((a, b) => a - b).join(',');
          assert.ok(!edgeKeys.has(key), `${label}: duplicate edge`);
          edgeKeys.add(key);
          degree[from] += 1;
          degree[to] += 1;
          const a = points[from];
          const b = points[to];
          assert.ok(strokes.some((stroke) => liesOnStroke(a, stroke) && liesOnStroke(b, stroke)),
            `${label}: edge not contained by one actual source stroke`);
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) <= Math.SQRT2 + 1e-7,
            `${label}: exceeded one bitmap segment`);
          assert.ok(!glyph.indices.some((index) => index !== from && index !== to
            && liesOnStroke(points[index], [a, b])), `${label}: skipped a local neighbor`);
        }
        // Every source segment must be covered end-to-end, not just a safe subset.
        for (const [start, end] of strokes) {
          const local = glyph.indices.filter((index) => liesOnStroke(points[index], [start, end]))
            .sort((a, b) => Math.hypot(points[a].x - start.x, points[a].y - start.y)
              - Math.hypot(points[b].x - start.x, points[b].y - start.y));
          assert.ok(local.length >= 2, `${phrase}/${character}: missing stroke`);
          closeTo(points[local[0]].x, start.x);
          closeTo(points[local[0]].y, start.y);
          closeTo(points[local.at(-1)].x, end.x);
          closeTo(points[local.at(-1)].y, end.y);
          for (let index = 1; index < local.length; index += 1) {
            assert.ok(edgeKeys.has([local[index - 1], local[index]].sort((a, b) => a - b).join(',')),
              `${phrase}/${character}: missing local connection`);
          }
        }
        cursor += 6;
      }
      assert.equal(edgeKeys.size, geometry.edges.length, 'unowned edge');
      assert.ok(degree.every((value) => value > 0), `${phrase}/${seed}: isolated star`);
    }
  }
});

test('T edges stay on its top bar or stem, never crossbar-to-stem chords', () => {
  for (let seed = 0; seed < 32; seed += 1) {
    const phrase = 'Attention';
    const geometry = createConstellationGeometryForPhrase(1200, 600, phrase, seed, seed + 1);
    const points = glyphSpacePoints(geometry, 1200, 600);
    geometry.glyphs.forEach((glyph, glyphIndex) => {
      if (glyph.character.toUpperCase() !== 'T') return;
      const indices = new Set(glyph.indices);
      const edges = geometry.edges.filter(({ from }) => indices.has(from));
      let bar = 0;
      let stem = 0;
      for (const { from, to } of edges) {
        assert.ok(indices.has(to));
        const a = { x: points[from].x - glyphIndex * 6, y: points[from].y };
        const b = { x: points[to].x - glyphIndex * 6, y: points[to].y };
        const onBar = liesOnStroke(a, [{ x: 0, y: 0 }, { x: 4, y: 0 }])
          && liesOnStroke(b, [{ x: 0, y: 0 }, { x: 4, y: 0 }]);
        const onStem = liesOnStroke(a, [{ x: 2, y: 0 }, { x: 2, y: 6 }])
          && liesOnStroke(b, [{ x: 2, y: 0 }, { x: 2, y: 6 }]);
        assert.ok(onBar || onStem, `T shortcut at seed ${seed}: ${JSON.stringify({ a, b })}`);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) <= 1 + 1e-7);
        bar += Number(onBar);
        stem += Number(onStem);
      }
      assert.ok(bar > 0 && stem > 0, 'T must retain both readable strokes');
    });
  }
});

test('resizing constellation line geometry preserves topology and scales every point', () => {
  const geometry = createConstellationGeometry(1200, 600, 0x51a7, 7);
  const resized = scaleConstellationGeometry(geometry, 0.5, 1.4);
  assert.notEqual(resized, geometry);
  assert.deepEqual(resized.edges, geometry.edges);
  assert.deepEqual(resized.glyphs, geometry.glyphs);
  resized.points.forEach((point, index) => {
    closeTo(point.x, geometry.points[index].x * 0.5);
    closeTo(point.y, geometry.points[index].y * 1.4);
  });
  assert.ok(resized.edges.every(({ from, to }) => resized.points[from] && resized.points[to]));
});

test('glyph density varies independently by seed/event and reaches both inclusive endpoints', () => {
  const observed = new Set();
  let variedWithinPhrase = false;
  for (let seed = 0; seed < 128; seed += 1) {
    for (let event = 1; event < 128; event += 1) {
      const counts = getConstellationGlyphAnchorCounts('LONGMONT AI', seed, event);
      assert.deepEqual(counts, getConstellationGlyphAnchorCounts('LONGMONT AI', seed, event));
      counts.forEach((count) => observed.add(count));
      if (new Set(counts).size > 1) variedWithinPhrase = true;
    }
  }
  assert.equal(variedWithinPhrase, true);
  assert.ok(observed.has(MIN_GLYPH_STAR_COUNT), 'inclusive 37 endpoint unreachable');
  assert.ok(observed.has(MAX_GLYPH_STAR_COUNT), 'inclusive 73 endpoint unreachable');
  assert.ok(observed.size > 30, `only ${observed.size} densities reached`);
});

test('constellation strength and pure star styles are continuous at every phase boundary', () => {
  assert.equal(getConstellationStrength(getConstellationPhase(600)), 0);
  assert.equal(getConstellationStrength(getConstellationPhase(610)), 1);
  assert.equal(getConstellationStrength(getConstellationPhase(620)), 1);
  assert.equal(getConstellationStrength(getConstellationPhase(630)), 0);

  const seed = 0x51a7;
  const anchorCount = createConstellationGeometry(1200, 600, seed, 1).points.length;
  const generation0 = createAmbientLayout(seed, 0, anchorCount);
  const generation1 = createAmbientLayout(seed, 1);
  const atHold = getStarFieldStyles(seed, 610);
  const atMorphOut = getStarFieldStyles(seed, 620);
  const atAmbient = getStarFieldStyles(seed, 630);
  atHold.slice(0, anchorCount)
    .forEach((style, index) => closeTo(style.alpha, generation0[index].alpha));
  atMorphOut.slice(0, anchorCount)
    .forEach((style, index) => closeTo(style.alpha, generation0[index].alpha));
  assert.equal(atAmbient.length, STAR_FIELD_SLOT_COUNT);
  assert.ok(atAmbient.slice(0, MAX_STAR_TEXT_ANCHOR_COUNT).every(({ opacity }) => opacity === 0));
  atAmbient.slice(MAX_STAR_TEXT_ANCHOR_COUNT)
    .forEach((style, index) => closeTo(style.alpha, generation1[index].alpha));

  for (const boundary of [610, 620, 630]) {
    const before = getStarFieldStyles(seed, boundary - 0.000001);
    const at = getStarFieldStyles(seed, boundary);
    before.forEach((style, index) => {
      for (const property of ['alpha', 'twinkle', 'strength', 'radius', 'opacity']) {
        closeTo(style[property], at[index][property], 0.00001);
      }
    });
  }
});

test('constellation-only stars fade with strength while retained background stays warm and legible', () => {
  const seed = 0x72;
  const ambient = getStarFieldStyles(seed, 599);
  const morphStart = getStarFieldStyles(seed, 600);
  const morphMiddle = getStarFieldStyles(seed, 605);
  const hold = getStarFieldStyles(seed, 610);
  const outStart = getStarFieldStyles(seed, 620);
  const outMiddle = getStarFieldStyles(seed, 625);
  const after = getStarFieldStyles(seed, 630);

  const anchorCount = createConstellationGeometry(1200, 600, seed, 1).points.length;
  assert.equal(ambient.length, STAR_FIELD_SLOT_COUNT);
  assert.equal(after.length, STAR_FIELD_SLOT_COUNT);
  const geometry = createConstellationGeometry(1200, 600, seed, 1);
  const boundaryProgresses = geometry.glyphs.map((glyph) =>
    new Set(glyph.indices.map((index) => morphStart[index].strength)));
  assert.ok(boundaryProgresses.every((progresses) =>
    progresses.size === 1 && progresses.has(0)));
  assert.ok(geometry.glyphs.every((glyph) =>
    glyph.indices.some((index) => morphStart[index].opacity > 0)),
  'existing ambient stars were not distributed across every glyph');
  const early = getStarFieldStyles(seed, 604);
  const expectedEarlyProgress = getConstellationPhase(604).progress;
  geometry.glyphs.forEach((glyph) => {
    assert.ok(glyph.indices.every((index) => early[index].opacity > 0));
    glyph.indices.forEach((index) => closeTo(early[index].strength, expectedEarlyProgress));
  });
  const expectedMiddleProgress = getConstellationPhase(605).progress;
  assert.ok(morphMiddle.slice(0, anchorCount)
    .every(({ opacity, strength }) => opacity > 0 && Math.abs(strength - expectedMiddleProgress) < 1e-8));
  assert.ok(hold.slice(0, anchorCount).every(({ strength }) => strength === 1));
  assert.ok(outStart.slice(0, anchorCount).every((style, index) =>
    style.opacity >= outMiddle[index].opacity));
  assert.ok(outMiddle.slice(0, anchorCount).every(({ opacity }) => opacity > 0));
  assert.ok(after.slice(0, MAX_STAR_TEXT_ANCHOR_COUNT).every(({ opacity }) => opacity === 0));

  const heldAmbient = hold.slice(MAX_STAR_TEXT_ANCHOR_COUNT);
  assert.ok(heldAmbient.filter(isStarRenderable).length <= RETAINED_AMBIENT_STAR_COUNT);
  assert.ok(heldAmbient.filter(isStarRenderable).length > 0);
  assert.ok(heldAmbient.every(({ strength }) => strength === 0));
  assert.equal(RETAINED_AMBIENT_STAR_COUNT, AMBIENT_STAR_COUNT / 2);

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
  const targets = createConstellationGeometry(width, height, seed, 1).points;
  assert.deepEqual(
    getStarFieldPositions(seed, 610, width, height).slice(0, targets.length),
    targets,
  );
  assert.equal(createConstellationGeometry(width, height, seed, 1).phrase,
    selectConstellationPhrase(seed, 1));
  const geometry = createConstellationGeometry(width, height, seed, 1);
  const ambientAtBoundary = createAmbientLayout(seed, 0).map((star) => {
    const point = getDriftedStar(star, CONSTELLATION_INTERVAL_SECONDS);
    return { x: point.x * width, y: point.y * height };
  });
  const origins = createStarTextAmbientOrigins(ambientAtBoundary, targets.length);
  const morphStartAll = getStarFieldPositions(seed, 600, width, height);
  assert.deepEqual(morphStartAll.slice(0, targets.length), origins);
  for (const time of [600.001, 604, 607, 609.999]) {
    const sample = getStarFieldPositions(seed, time, width, height);
    geometry.glyphs.forEach((glyph) => assert.ok(glyph.indices.some((index) =>
      Math.hypot(sample[index].x - origins[index].x, sample[index].y - origins[index].y) > 0)));
  }
  const holdPositions = getStarFieldPositions(seed, 610, width, height);
  const lateHoldPositions = getStarFieldPositions(seed, 619.9, width, height);
  for (let index = 0; index < targets.length; index += 1) {
    assert.deepEqual(holdPositions[index], targets[index]);
    assert.deepEqual(lateHoldPositions[index], targets[index]);
  }
  const morphStart = getStarFieldPositions(seed, 600, width, height);
  const beforeMorph = getStarFieldPositions(seed, 599.999999, width, height);
  const afterMorph = getStarFieldPositions(seed, 630, width, height);
  const beforeAmbient = beforeMorph.slice(MAX_STAR_TEXT_ANCHOR_COUNT);
  morphStart.slice(0, targets.length).forEach(({ x, y }) => {
    assert.ok(beforeAmbient.some((point) => Math.hypot(point.x - x, point.y - y) < 0.0001));
  });
  for (let index = 0; index < AMBIENT_STAR_COUNT; index += 1) {
    const regenerated = getDriftedStar(createAmbientLayout(seed, 1)[index], 0);
    closeTo(afterMorph[MAX_STAR_TEXT_ANCHOR_COUNT + index].x, regenerated.x * width);
    closeTo(afterMorph[MAX_STAR_TEXT_ANCHOR_COUNT + index].y, regenerated.y * height);
  }
  assert.notDeepEqual(createAmbientLayout(seed, 0), createAmbientLayout(seed, 1));
});

test('scheduled outro is fade-only for text while ambient crossfades without boundary pops', () => {
  const width = 1200;
  const height = 600;
  const seed = 777;
  const epsilon = 0.001;
  const atHold = getStarFieldPositions(seed, 620, width, height);
  const justAfterHold = getStarFieldPositions(seed, 620 + epsilon, width, height);
  const justBeforeAmbient = getStarFieldPositions(seed, 630 - epsilon, width, height);
  const atAmbient = getStarFieldPositions(seed, 630, width, height);
  const justAfterAmbient = getStarFieldPositions(seed, 630 + epsilon, width, height);

  assert.ok(Math.hypot(
    justAfterHold[0].x - atHold[0].x,
    justAfterHold[0].y - atHold[0].y,
  ) < 0.001, 'hold-to-return velocity is not eased to zero');
  const incomingVelocity = {
    x: (atAmbient[0].x - justBeforeAmbient[0].x) / epsilon,
    y: (atAmbient[0].y - justBeforeAmbient[0].y) / epsilon,
  };
  const ambientVelocity = {
    x: (justAfterAmbient[0].x - atAmbient[0].x) / epsilon,
    y: (justAfterAmbient[0].y - atAmbient[0].y) / epsilon,
  };
  closeTo(incomingVelocity.x, ambientVelocity.x, 0.02);
  closeTo(incomingVelocity.y, ambientVelocity.y, 0.02);

  const anchorCount = createConstellationGeometry(width, height, seed, 1).points.length;
  const outStartStyles = getStarFieldStyles(seed, 620);
  const outMiddleStyles = getStarFieldStyles(seed, 625);
  const beforeBoundaryStyles = getStarFieldStyles(seed, 630 - epsilon);
  const atBoundaryStyles = getStarFieldStyles(seed, 630);
  for (const time of [622.5, 625, 627.5, 629.999]) {
    const sample = getStarFieldPositions(seed, time, width, height);
    sample.slice(0, anchorCount).forEach((point, index) => assert.deepEqual(point, atHold[index]));
    sample.forEach(({ x, y }, index) => {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      assert.ok(x >= 0 && x <= width && y >= 0 && y <= height,
        `point ${index} escaped at ${time}`);
    });
  }
  assert.ok(outStartStyles.slice(0, anchorCount).every((style, index) =>
    style.opacity > outMiddleStyles[index].opacity));
  assert.ok(beforeBoundaryStyles.slice(0, anchorCount).every(({ opacity }) => opacity < 1e-5));
  assert.ok(atBoundaryStyles.slice(0, anchorCount).every(({ opacity }) => opacity === 0));
  assert.equal(atHold.length, atAmbient.length);
  for (let index = MAX_STAR_TEXT_ANCHOR_COUNT; index < STAR_FIELD_SLOT_COUNT; index += 1) {
    assert.ok(Math.hypot(
      justBeforeAmbient[index].x - atAmbient[index].x,
      justBeforeAmbient[index].y - atAmbient[index].y,
    ) < 0.01, `ambient slot ${index} popped at boundary`);
  }
});

test('ordinary wrap and bounce behavior resumes exactly after every fade boundary', () => {
  const width = 1200;
  const height = 600;
  const epsilon = 0.0001;
  let checked = 0;
  let wraps = 0;
  let bounces = 0;
  for (let seed = 0; seed < 100; seed += 1) {
    const at = getStarFieldPositions(seed, 630, width, height);
    const after = getStarFieldPositions(seed, 630 + epsilon, width, height);
    const ambient = createAmbientLayout(seed, 1);
    for (let index = 0; index < AMBIENT_STAR_COUNT; index += 1) {
      const slot = MAX_STAR_TEXT_ANCHOR_COUNT + index;
      const expected = getDriftedStarVelocity(ambient[index], 0, width, height);
      const resumed = {
        x: (after[slot].x - at[slot].x) / epsilon,
        y: (after[slot].y - at[slot].y) / epsilon,
      };
      closeTo(resumed.x, expected.x, 0.005);
      closeTo(resumed.y, expected.y, 0.005);
      assert.ok(at[slot].x >= 0 && at[slot].x <= width);
      assert.ok(at[slot].y >= 0 && at[slot].y <= height);
      if (ambient[index].driftMode === 'wrap') wraps += 1;
      else bounces += 1;
      checked += 1;
    }
  }
  assert.equal(checked, 100 * AMBIENT_STAR_COUNT);
  assert.equal(wraps, checked / 2);
  assert.equal(bounces, checked / 2);
});

test('radial traveler speed uses a clamped endpoint-preserving exponential curve', () => {
  const width = 1200;
  const height = 600;
  const center = { x: width * 0.5, y: height * 0.45 };
  closeTo(getTravelerRadialSpeedMultiplier(center.x, center.y, width, height), 1);

  for (const perimeter of [
    { x: 0, y: center.y },
    { x: width, y: center.y },
    { x: center.x, y: 0 },
    { x: center.x, y: height },
    { x: width, y: height },
  ]) {
    closeTo(getTravelerRadialSpeedMultiplier(perimeter.x, perimeter.y, width, height), 2);
  }

  const samples = [0, 0.25, 0.5, 0.75, 1].map((radius) =>
    getTravelerRadialSpeedMultiplier(
      center.x + (width - center.x) * radius,
      center.y,
      width,
      height,
    ));
  samples.forEach((multiplier, index) => closeTo(multiplier, 2 ** (index / 4)));
  closeTo(samples[2], Math.sqrt(2));
  assert.notEqual(samples[2], 1.5, 'half-radius speed must not be linear');
  assert.ok(samples.every((value, index) => index === 0 || value > samples[index - 1]));
  closeTo(getTravelerRadialSpeedMultiplier(-500, center.y, width, height), 2);
  closeTo(getTravelerRadialSpeedMultiplier(width * 2, height * 2, width, height), 2);
});

test('actual traveler motion gains radial speed without bending or breaking depth cycles', () => {
  const width = 1200;
  const height = 600;
  const center = { x: width * 0.5, y: height * 0.45 };
  const traveler = { seed: 17, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  const delta = 0.0001;
  const radialSpeeds = [2, 12, 22].map((time) => {
    const before = projectTraveler(traveler, time, width, height);
    const after = projectTraveler(traveler, time + delta, width, height);
    assert.equal(after.cycle, before.cycle);
    const beforeOffset = { x: before.x - center.x, y: before.y - center.y };
    const movement = { x: after.x - before.x, y: after.y - before.y };
    closeTo(beforeOffset.x * movement.y - beforeOffset.y * movement.x, 0, 1e-7);
    const normalizedMultiplier = getTravelerRadialSpeedMultiplier(
      before.x, before.y, width, height,
    );
    const measuredDepthSpeed = (before.depth - after.depth) / delta;
    closeTo(measuredDepthSpeed / traveler.speed, normalizedMultiplier, 0.002);
    return Math.hypot(movement.x, movement.y) / delta;
  });
  assert.ok(radialSpeeds[1] > radialSpeeds[0]);
  assert.ok(radialSpeeds[2] > radialSpeeds[1]);

  let cycleBoundary = 0;
  while (projectTraveler(traveler, cycleBoundary, width, height).cycle === 0) cycleBoundary += 0.1;
  const beforeBoundary = projectTraveler(traveler, cycleBoundary - 0.1, width, height);
  const afterBoundary = projectTraveler(traveler, cycleBoundary, width, height);
  assert.equal(beforeBoundary.cycle, 0);
  assert.equal(afterBoundary.cycle, 1);
  assert.ok(beforeBoundary.depth >= NEAR_DEPTH && beforeBoundary.depth <= FAR_DEPTH);
  assert.ok(afterBoundary.depth >= NEAR_DEPTH && afterBoundary.depth <= FAR_DEPTH);
  assert.deepEqual(afterBoundary, projectTraveler(traveler, cycleBoundary, width, height));
});

test('travelers grow strongly on approach and reveal detail at exact monotonic thresholds', () => {
  const traveler = { seed: 17, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  assert.deepEqual(TRAVELER_DETAIL_THRESHOLDS, [0.28, 0.5, 0.68]);
  const samples = [0, 0.279999, 0.28, 0.499999, 0.5, 0.679999, 0.68, 1]
    .map((progress) => getTravelerAppearance(traveler, progress));
  assert.deepEqual(samples.map(({ detailLevel }) => detailLevel), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.ok(samples.every(({ radius }, index) => index === 0 || radius >= samples[index - 1].radius));
  assert.ok(samples.at(-1).radius > samples[0].radius * 10, 'near traveler is not visibly larger');
  assert.ok(samples.every(({ haloRadius, radius }) => haloRadius > radius));
  assert.equal(samples[4].flareLength, 0);
  assert.ok(samples[5].flareLength > 0);
  assert.ok(samples[6].flareLength > samples[6].radius * 2);

  const projected = projectTraveler(traveler, 0, 1000, 600);
  closeTo(projected.radius, getTravelerAppearance(traveler, projected.progress).radius);
});

test('galaxy creation uses [0, 0.16), a 20% relative reduction from 20%', () => {
  assert.equal(GALAXY_CREATION_CHANCE, 0.16);
  closeTo(GALAXY_CREATION_CHANCE, 0.20 * 0.80);
  assert.equal(isGalaxyCreationRoll(0), true);
  assert.equal(isGalaxyCreationRoll(0.1), true);
  assert.equal(isGalaxyCreationRoll(0.159999999), true);
  assert.equal(isGalaxyCreationRoll(0.16), false);
  assert.equal(isGalaxyCreationRoll(0.160000001), false);
  assert.equal(isGalaxyCreationRoll(0.2), false);
  assert.equal(isGalaxyCreationRoll(0.999999999), false);
  assert.equal(isGalaxyCreationRoll(1), false);
  assert.equal(isGalaxyCreationRoll(-0.000001), false);

  const outcomes = Array.from({ length: 10000 }, (_, index) =>
    isGalaxyCreationRoll(index / 10000));
  assert.equal(outcomes.filter(Boolean).length, 1600);
  assert.ok(outcomes.slice(0, 1600).every((outcome) => outcome === true));
  assert.ok(outcomes.slice(1600).every((outcome) => outcome === false));

  const scene = createSpaceScene(0x51a7c0de);
  assert.ok(scene.travelers.every(({ isGalaxy }) => typeof isGalaxy === 'boolean'));
  assert.deepEqual(scene, createSpaceScene(0x51a7c0de));
});

test('starscape source contracts an opaque black backdrop and disc-clipped star patterns', () => {
  const componentSource = readFileSync(
    new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8',
  );
  const cssSource = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
  const drawScene = componentSource.slice(
    componentSource.indexOf('const drawScene ='),
    componentSource.indexOf('// RAF may pause while hidden'),
  );
  const travelerSurface = componentSource.slice(
    componentSource.indexOf('const drawTravelerSurface ='),
    componentSource.indexOf('const drawTravelerDisc ='),
  );
  const homeScene = cssSource.slice(
    cssSource.indexOf('.home-hero-scene'),
    cssSource.indexOf('.home-hero {'),
  );
  const planetarySystem = componentSource.slice(
    componentSource.indexOf('const drawPlanetarySystem ='),
    componentSource.indexOf('const SpaceNeuralBackground'),
  );

  assert.match(drawScene, /ctx\.globalAlpha = 1;\s*\/\/ The canvas owns[\s\S]*?ctx\.fillStyle = '#000000';\s*ctx\.fillRect\(0, 0, width, height\);/);
  assert.doesNotMatch(componentSource, /backdropGlow/);
  assert.doesNotMatch(homeScene, /gradient|radial-gradient|rgba\(/i);
  assert.match(homeScene, /\.home-hero-scene[\s\S]*?background: #000000;/);

  assert.match(travelerSurface, /ctx\.save\(\);\s*ctx\.beginPath\(\);\s*ctx\.arc\(x, y, radius, 0, TAU\);\s*ctx\.clip\(\);/);
  assert.match(componentSource, /drawTravelerSurface\(ctx, appearance, x, y, radius, opacity \* transmission, simulationSeconds, progress\);/);
  assert.match(planetarySystem, /drawTravelerDisc\(\s*ctx,\s*ownerAppearance,/);

  const traveler = { seed: 0x51a7, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  const resolving = getTravelerAppearance(traveler, 0.5);
  const resolved = getTravelerAppearance(traveler, 0.9);
  assert.equal(resolving.texture, resolved.texture);
  assert.equal(resolving.surfaceSeed, resolved.surfaceSeed);
  assert.ok(resolved.detailLevel > 0);
  assert.deepEqual(getTravelerStarRenderPolicy(true), {
    renderDisc: true, renderHalo: false, renderShadowGlow: false, renderFlare: false,
  });
});

test('traveler palette and surface textures are seeded, stable, and diverse', () => {
  assert.deepEqual(TRAVELER_PALETTE.map(({ name }) => name), ['red', 'yellow', 'orange', 'white', 'blue']);
  assert.deepEqual(TRAVELER_SURFACE_TEXTURES, ['bands', 'speckles', 'facets', 'swirls', 'mottled']);
  const seenColors = new Set();
  const seenTextures = new Set();
  for (let seed = 0; seed < 512; seed += 1) {
    const traveler = {
      seed,
      initialDistance: 0,
      speed: 20,
      size: TRAVELER_RADIUS_RANGE[0]
        + (TRAVELER_RADIUS_RANGE[1] - TRAVELER_RADIUS_RANGE[0]) * (seed % 101) / 100,
      alpha: 0.6,
    };
    const far = getTravelerAppearance(traveler, 0.1);
    const near = getTravelerAppearance(traveler, 0.9);
    assert.equal(far.colorName, near.colorName);
    assert.equal(far.color, near.color);
    assert.equal(far.texture, near.texture);
    assert.equal(far.surfaceSeed, near.surfaceSeed);
    assert.deepEqual(getTravelerAppearance(traveler, 0.9), near);
    seenColors.add(near.colorName);
    seenTextures.add(near.texture);
  }
  assert.deepEqual([...seenColors].sort(), TRAVELER_PALETTE.map(({ name }) => name).sort());
  assert.deepEqual([...seenTextures].sort(), [...TRAVELER_SURFACE_TEXTURES].sort());
});

test('small and large traveler colors follow their weighted palette with coherent interpolation', () => {
  assert.equal(SMALL_TRAVELER_RED_CHANCE, 0.06);
  assert.equal(LARGE_TRAVELER_RED_CHANCE, 0.35);
  assert.equal(LARGE_TRAVELER_RED_CHANCE, 0.7 / 2);
  const smallWeights = getTravelerColorWeights(TRAVELER_RADIUS_RANGE[0]);
  const largeWeights = getTravelerColorWeights(TRAVELER_RADIUS_RANGE[1]);
  const middleWeights = getTravelerColorWeights(
    (TRAVELER_RADIUS_RANGE[0] + TRAVELER_RADIUS_RANGE[1]) / 2,
  );
  closeTo(smallWeights[0], SMALL_TRAVELER_RED_CHANCE);
  closeTo(largeWeights[0], LARGE_TRAVELER_RED_CHANCE);
  closeTo(middleWeights[0], (SMALL_TRAVELER_RED_CHANCE + LARGE_TRAVELER_RED_CHANCE) / 2);
  for (const weights of [smallWeights, middleWeights, largeWeights]) {
    closeTo(weights.reduce((sum, weight) => sum + weight, 0), 1);
    weights.slice(1).forEach((weight) => closeTo(weight, (1 - weights[0]) / 4));
  }

  for (const progress of [0.25, 0.75]) {
    const size = TRAVELER_RADIUS_RANGE[0]
      + (TRAVELER_RADIUS_RANGE[1] - TRAVELER_RADIUS_RANGE[0]) * progress;
    const weights = getTravelerColorWeights(size);
    closeTo(weights[0], 0.06 + (0.35 - 0.06) * progress ** 2 * (3 - 2 * progress));
    weights.slice(1).forEach((weight) => closeTo(weight, (1 - weights[0]) / 4));
  }

  const largeSize = TRAVELER_RADIUS_RANGE[1];
  assert.equal(chooseTravelerColor(largeSize, 0.35 - Number.EPSILON).name, 'red');
  assert.equal(chooseTravelerColor(largeSize, 0.35).name, 'yellow');
  const exactCounts = new Map(TRAVELER_PALETTE.map(({ name }) => [name, 0]));
  for (let index = 0; index < 10000; index += 1) {
    const { name } = chooseTravelerColor(largeSize, (index + 0.5) / 10000);
    exactCounts.set(name, exactCounts.get(name) + 1);
  }
  assert.deepEqual([...exactCounts.values()], [3500, 1625, 1625, 1625, 1625]);

  const sample = (size, seed) => {
    const random = createSeededRandom(seed);
    const counts = new Map(TRAVELER_PALETTE.map(({ name }) => [name, 0]));
    for (let index = 0; index < 100000; index += 1) {
      const { name } = chooseTravelerColor(size, random());
      counts.set(name, counts.get(name) + 1);
    }
    return counts;
  };
  for (const [size, redChance, seed] of [
    [TRAVELER_RADIUS_RANGE[0], 0.06, 0x51a70001],
    [TRAVELER_RADIUS_RANGE[1], 0.35, 0x51a70002],
  ]) {
    const counts = sample(size, seed);
    assert.ok(Math.abs(counts.get('red') / 100000 - redChance) < 0.006);
    const expectedOther = (1 - redChance) / 4;
    for (const { name } of TRAVELER_PALETTE.slice(1)) {
      assert.ok(Math.abs(counts.get(name) / 100000 - expectedOther) < 0.006,
        `${name} frequency ${counts.get(name) / 100000} missed ${expectedOther}`);
    }
  }
});

test('system-owning traveler stars suppress every glow layer while ordinary stars retain them', () => {
  assert.deepEqual(getTravelerStarRenderPolicy(true), {
    renderDisc: true,
    renderHalo: false,
    renderShadowGlow: false,
    renderFlare: false,
  });
  assert.deepEqual(getTravelerStarRenderPolicy(false), {
    renderDisc: true,
    renderHalo: true,
    renderShadowGlow: true,
    renderFlare: true,
  });
  assert.equal(isPlanetBehindSystemStar(-Number.EPSILON), true);
  assert.equal(isPlanetBehindSystemStar(0), false);
  assert.equal(isPlanetBehindSystemStar(Number.EPSILON), false);

  const appearanceRadius = 6.75;
  for (const systemScale of [0.55, 1, 2.25, 4]) {
    const localRadius = getSystemOwnerDiscLocalRadius(appearanceRadius, systemScale);
    closeTo(localRadius * systemScale, appearanceRadius);
    assert.notEqual(localRadius, SYSTEM_STAR_RADIUS, 'owner disc reused the old fixed halo extent');
  }
  assert.equal(getSystemOwnerDiscLocalRadius(appearanceRadius, 0), 0);
  assert.equal(getSystemOwnerDiscLocalRadius(Number.NaN, 1), 0);
});

test('traveler approach glow grows monotonically while blur and opacity remain subtle and bounded', () => {
  const traveler = { seed: 17, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  const appearances = Array.from({ length: 101 }, (_, index) =>
    getTravelerAppearance(traveler, index / 100));
  assert.deepEqual(TRAVELER_GLOW_BLUR_RANGE, [1.5, 12]);
  assert.deepEqual(TRAVELER_GLOW_OPACITY_RANGE, [0.06, 0.22]);
  for (let index = 0; index < appearances.length; index += 1) {
    const appearance = appearances[index];
    assert.ok(appearance.glowBlur >= TRAVELER_GLOW_BLUR_RANGE[0]
      && appearance.glowBlur <= TRAVELER_GLOW_BLUR_RANGE[1]);
    assert.ok(appearance.glowOpacity >= TRAVELER_GLOW_OPACITY_RANGE[0]
      && appearance.glowOpacity <= TRAVELER_GLOW_OPACITY_RANGE[1]);
    if (index > 0) {
      assert.ok(appearance.glowBlur >= appearances[index - 1].glowBlur);
      assert.ok(appearance.glowOpacity >= appearances[index - 1].glowOpacity);
    }
  }
  closeTo(appearances[0].glowBlur, TRAVELER_GLOW_BLUR_RANGE[0]);
  closeTo(appearances.at(-1).glowBlur, TRAVELER_GLOW_BLUR_RANGE[1]);
  closeTo(appearances[0].glowOpacity, TRAVELER_GLOW_OPACITY_RANGE[0]);
  closeTo(appearances.at(-1).glowOpacity, TRAVELER_GLOW_OPACITY_RANGE[1]);
});

test('galaxies compose with traveler variants and stay within seven moving-star radii', () => {
  const traveler = { seed: 17, initialDistance: 0, speed: 20, size: 1.21, alpha: 0.6, isGalaxy: true };
  assert.equal(GALAXY_MAX_RADIUS_MULTIPLIER, 7);
  assert.equal(GALAXY_INTERNAL_STAR_COUNT, 144);
  assert.ok(GALAXY_INTERNAL_STAR_COUNT > 36);
  assert.ok(GALAXY_SPIRAL_ARM_COUNT >= 2);
  assert.equal(getTravelerVariant(traveler, 0), 'galaxy');
  assert.equal(getTravelerVariant(traveler, 99), 'galaxy');
  assert.equal(isUfoTraveler(traveler, 0), false);
  assert.equal(isCometTraveler(traveler, 0), false);
  assert.equal(isSystemCarrier(traveler, 2), false);

  for (const progress of [0, 0.28, 0.5, 0.68, 1]) {
    const star = getTravelerAppearance(traveler, progress);
    const galaxy = getGalaxyAppearance(traveler, progress, 2);
    assert.deepEqual(galaxy, getGalaxyAppearance(traveler, progress, 2));
    assert.ok(galaxy.outerRadius <= star.radius * GALAXY_MAX_RADIUS_MULTIPLIER + 1e-12);
    assert.ok(galaxy.outerRadius > star.radius);
    assert.ok(galaxy.coreRadius > 0 && galaxy.coreRadius < galaxy.outerRadius);
    assert.ok(galaxy.flattening > 0 && galaxy.flattening <= 1);
    assert.equal(galaxy.internalStarCount, GALAXY_INTERNAL_STAR_COUNT);
  }

  const ordinary = { ...traveler, isGalaxy: false };
  const galaxyProjection = projectTraveler(traveler, 12.5, 1000, 600);
  assert.deepEqual(galaxyProjection, projectTraveler(ordinary, 12.5, 1000, 600),
    'galaxy identity must not alter traveler motion or lifecycle');
});

test('reality-inspired galaxy formations are deterministic, distinct, and all reachable', () => {
  assert.deepEqual(GALAXY_FORMATIONS,
    ['spiral', 'barred-spiral', 'elliptical', 'irregular', 'sombrero']);
  assert.deepEqual(GALAXY_ROTATION_RATE_RANGE, [0.09, 0.15]);
  assert.deepEqual(GALAXY_FORMATION_RATE_MULTIPLIERS, {
    spiral: 1,
    'barred-spiral': 0.92,
    elliptical: 0.78,
    irregular: 1.12,
    sombrero: 0,
  });
  const seedByFormation = new Map();
  for (let seed = 0; seed < 1024; seed += 1) {
    const formation = getGalaxyFormation(seed, 0);
    assert.equal(getGalaxyFormation(seed, 0), formation);
    if (!seedByFormation.has(formation)) seedByFormation.set(formation, seed);
  }
  assert.deepEqual([...seedByFormation.keys()].sort(), [...GALAXY_FORMATIONS].sort());

  const profiles = new Map();
  for (const formation of GALAXY_FORMATIONS) {
    const traveler = { seed: seedByFormation.get(formation), initialDistance: 0,
      speed: 20, size: 1, alpha: 0.6, isGalaxy: true };
    const appearance = getGalaxyAppearance(traveler, 0.8, 0);
    assert.equal(appearance.formation, formation);
    const pointLikeMatter = Array.from({ length: appearance.internalStarCount }, (_, index) =>
      getGalaxyParticleState(traveler, 0, 0.8, 0, index, appearance))
      .filter(({ kind }) => kind !== 'dust');
    assert.ok(pointLikeMatter.length > 36,
      `${formation} has only ${pointLikeMatter.length} visible point-like stars`);
    profiles.set(formation, appearance);
  }
  assert.ok(profiles.get('spiral').armCount >= 3);
  assert.equal(profiles.get('barred-spiral').armCount, 2);
  assert.ok(profiles.get('barred-spiral').barLength > 0);
  assert.ok(profiles.get('elliptical').coreRadius > profiles.get('spiral').coreRadius);
  assert.equal(profiles.get('irregular').armCount, 0);
  assert.notEqual(profiles.get('elliptical').flattening, profiles.get('barred-spiral').flattening);
  assert.ok([...profiles.values()].every((appearance) => !('ringRadius' in appearance)));

  const modelSource = readFileSync(new URL('../../src/components/spaceBackgroundModel.ts', import.meta.url), 'utf8');
  const canvasSource = readFileSync(new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8');
  assert.equal(modelSource.includes('ringRadius'), false);
  assert.equal(canvasSource.includes("appearance.formation === 'ring'"), false);
  assert.equal(canvasSource.includes('appearance.ringRadius'), false);
  const drawGalaxySource = canvasSource.slice(
    canvasSource.indexOf('const drawGalaxy ='),
    canvasSource.indexOf('const drawUfo ='),
  );
  for (const forbiddenMorphology of [
    'createRadialGradient', 'createLinearGradient', '.ellipse(', '.stroke()',
    '.moveTo(', '.lineTo(', '.bezierCurveTo(', '.quadraticCurveTo(',
  ]) {
    assert.equal(drawGalaxySource.includes(forbiddenMorphology), false,
      `drawGalaxy retained ring-like morphology: ${forbiddenMorphology}`);
  }
  assert.equal(drawGalaxySource.includes('.filter('), false,
    'embedded system depth ordering allocates filter arrays each frame');
  assert.equal(drawGalaxySource.includes('hostGlow'), false,
    'embedded host retained a per-frame glow gradient');
  assert.ok(canvasSource.includes('drawPlanetRing'), 'ordinary planet-ring behavior was removed');
});

test('galaxy reveal is sparse at distance, monotonic, continuous, and fully populated nearby', () => {
  assert.equal(getGalaxyVisibleStarCount(0), 18);
  assert.equal(getGalaxyVisibleStarCount(1), 144);
  for (let index = 0; index < 144; index += 1) {
    let previous = 0;
    for (let step = 0; step <= 1000; step += 1) {
      const fade = getGalaxyStarReveal(step / 1000, index);
      assert.ok(fade >= previous && fade <= 1);
      if (step > 0) assert.ok(fade - previous < 0.05, 'reveal popped');
      previous = fade;
    }
    assert.equal(getGalaxyStarReveal(1, index), 1);
  }
});

test('rare direct galaxy cycles are reachable, stable, centered and preserve lifecycle', () => {
  assert.equal(GALAXY_DIRECT_APPROACH_CHANCE, 0.08);
  assert.equal(isGalaxyDirectApproachRoll(-0.01), false);
  assert.equal(isGalaxyDirectApproachRoll(0), true);
  assert.equal(isGalaxyDirectApproachRoll(0.07999999), true);
  assert.equal(isGalaxyDirectApproachRoll(0.08), false);
  assert.equal(isGalaxyDirectApproachRoll(1), false);
  let direct = 0;
  for (let seed = 0; seed < 4096; seed += 1) {
    const traveler = { seed, initialDistance: 0, speed: 20, size: 1.21, alpha: 0.6, isGalaxy: true };
    if (isDirectApproachGalaxy(traveler, 0)) direct += 1;
    for (const time of [0, 1, 5, 12, 25, 50, 100]) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        const projected = projectTraveler(traveler, time, width, height);
        const ordinary = projectTraveler({ ...traveler, isGalaxy: false }, time, width, height);
        if (ordinary.cycle === 0) {
          const start = projectTraveler({ ...traveler, isGalaxy: false }, 0, width, height);
          closeTo((ordinary.y - height * 0.45) * ordinary.depth,
            (start.y - height * 0.45) * start.depth);
        }
        const special = isDirectApproachGalaxy(traveler, projected.cycle);
        assert.equal(special, isDirectApproachGalaxy(traveler, projected.cycle + 0.5));
        assert.equal(isDirectApproachGalaxy({ ...traveler, isGalaxy: false }, projected.cycle), false);
        if (special) {
          assert.equal(projected.x, width / 2);
          assert.equal(projected.y, height / 2);
        } else assert.deepEqual(projected, ordinary);
        for (const key of ['depth', 'progress', 'opacity', 'radius', 'cycle'])
          assert.equal(projected[key], ordinary[key]);
      }
    }
  }
  assert.ok(direct > 240 && direct < 420, `unexpected rare population ${direct}`);
});

test('Sombrero filled disk and central bulge keep stable orientation with central-only churn', () => {
  assert.equal(GALAXY_SOMBRERO_CHANCE, 0.08);
  let count = 0;
  for (let seed = 0; seed < 4096; seed += 1) {
    if (getGalaxyFormation(seed, 0) !== 'sombrero') continue;
    count += 1;
    const traveler = { seed, initialDistance: 0, speed: 20, size: 1.21, alpha: 0.6, isGalaxy: true };
    const appearance = getGalaxyAppearance(traveler, 1);
    assert.equal(appearance.armCount, 0);
    assert.equal(appearance.rotationRate, 0);
    assert.equal(getGalaxyAnimationState(traveler, 0, 0).rotation,
      getGalaxyAnimationState(traveler, 0, 50).rotation);
    let innerDisk = 0;
    let outerDisk = 0;
    for (let index = 0; index < 144; index += 1) {
      const before = getGalaxyParticleState(traveler, 0, 1, 0, index);
      const after = getGalaxyParticleState(traveler, 0, 1, 5, index);
      if (index % 3 === 0) {
        assert.ok(Math.hypot(before.x, before.y) <= appearance.outerRadius * 0.28);
        assert.notEqual(before.x, after.x);
      } else {
        assert.equal(before.x, after.x);
        assert.equal(before.y, after.y);
        assert.ok(Math.abs(before.y) <= appearance.outerRadius * 0.16);
        const radius = Math.hypot(before.x, before.y / appearance.flattening) / appearance.outerRadius;
        if (radius < 0.4) innerDisk += 1;
        if (radius > 0.7) outerDisk += 1;
      }
    }
    assert.ok(innerDisk > 0 && outerDisk > 0, 'disk must be filled, not an annulus');
  }
  assert.ok(count > 240 && count < 420);
});

test('enlarged galaxies include every rendered point and miniature body within the hard 7x cap', () => {
  for (let seed = 0; seed < 64; seed += 1) {
    const traveler = { seed, initialDistance: 0, speed: 20, size: 0.66, alpha: 0.6, isGalaxy: true };
    for (const progress of [0, 0.1, 0.3, 0.5, 0.8, 1]) {
      const appearance = getGalaxyAppearance(traveler, progress);
      const radius = getTravelerAppearance(traveler, progress).radius;
      assert.ok(appearance.outerRadius >= radius * 6.8);
      for (const time of [0, 5, 50]) {
        for (let index = 0; index < 144; index += 1) {
          const point = getGalaxyParticleState(traveler, 0, progress, time, index);
          assert.ok(Math.hypot(point.x, point.y) + point.radius <= radius * 7);
        }
        for (const system of createEmbeddedGalaxySystems(traveler, 0, appearance)) {
          const state = getEmbeddedGalaxySystemState(system, time);
          assert.ok(Math.hypot(state.host.x, state.host.y) + system.hostRadius <= radius * 7);
          for (const planet of state.planets)
            assert.ok(Math.hypot(planet.x, planet.y) + planet.radius <= radius * 7);
        }
      }
    }
  }
});

test('embedded galaxy systems are deterministic, bounded, orbiting, and host-relative', () => {
  assert.deepEqual(GALAXY_EMBEDDED_SYSTEM_COUNT_RANGE, [2, 3]);
  assert.deepEqual(GALAXY_EMBEDDED_PLANET_COUNT_RANGE, [1, 2]);
  assert.equal(getEmbeddedGalaxySystemOpacity(Number.NaN), 0);
  assert.equal(getEmbeddedGalaxySystemOpacity(4), 0);
  assert.equal(getEmbeddedGalaxySystemOpacity(9), 1);
  assert.ok(getEmbeddedGalaxySystemOpacity(6) > 0 && getEmbeddedGalaxySystemOpacity(6) < 1);

  const observedSystemCounts = new Set();
  const observedPlanetCounts = new Set();
  for (let seed = 0; seed < 128; seed += 1) {
    const traveler = { seed, initialDistance: 0, speed: 20, size: 1.1,
      alpha: 0.6, isGalaxy: true };
    const appearance = getGalaxyAppearance(traveler, 0.82, 2);
    const systems = createEmbeddedGalaxySystems(traveler, 2, appearance);
    assert.deepEqual(systems, createEmbeddedGalaxySystems(traveler, 2, appearance));
    const zeroSized = createEmbeddedGalaxySystems(traveler, 2,
      { outerRadius: 0, flattening: Number.NaN });
    assert.ok(zeroSized.every((system) => system.orbitRadius === 0 && system.hostRadius === 0
      && system.planets.every((planet) => planet.orbitRadius === 0 && planet.radius === 0)));
    observedSystemCounts.add(systems.length);
    assert.ok(systems.length >= 2 && systems.length <= 3);

    systems.forEach((system) => {
      observedPlanetCounts.add(system.planets.length);
      assert.ok(system.planets.length >= 1 && system.planets.length <= 2);
      assert.ok(system.orbitRadius > 0);
      assert.ok(system.orbitRadius + system.hostRadius < appearance.outerRadius);
      const atZero = getEmbeddedGalaxySystemState(system, 0);
      const later = getEmbeddedGalaxySystemState(system, 4);
      closeTo(Math.hypot(atZero.host.x, atZero.host.y), system.orbitRadius);
      closeTo(Math.hypot(later.host.x, later.host.y), system.orbitRadius);
      assert.ok(Math.hypot(later.host.x - atZero.host.x, later.host.y - atZero.host.y)
        > system.hostRadius, 'host star did not visibly move around galaxy center');

      const hostPeriod = Math.PI * 2 / Math.abs(system.speed);
      const returnedHost = getEmbeddedGalaxySystemState(system, hostPeriod).host;
      closeTo(returnedHost.x, atZero.host.x);
      closeTo(returnedHost.y, atZero.host.y);
      system.planets.forEach((planet, planetIndex) => {
        const stateAtZero = atZero.planets[planetIndex];
        const stateLater = later.planets[planetIndex];
        assert.ok(stateAtZero.z >= -1 && stateAtZero.z <= 1);
        assert.ok(stateLater.z >= -1 && stateLater.z <= 1);
        closeTo(Math.hypot(stateAtZero.x - atZero.host.x, stateAtZero.y - atZero.host.y),
          planet.orbitRadius);
        closeTo(Math.hypot(stateLater.x - later.host.x, stateLater.y - later.host.y),
          planet.orbitRadius);
        assert.ok(Math.hypot(stateLater.x - stateAtZero.x, stateLater.y - stateAtZero.y) > 0.01);
        assert.ok(Math.hypot(stateLater.x, stateLater.y) + planet.radius < appearance.outerRadius);

        const planetPeriod = Math.PI * 2 / Math.abs(planet.speed);
        const periodStart = getEmbeddedGalaxySystemState(system, 0);
        const periodEnd = getEmbeddedGalaxySystemState(system, planetPeriod);
        closeTo(periodEnd.planets[planetIndex].x - periodEnd.host.x,
          periodStart.planets[planetIndex].x - periodStart.host.x);
        closeTo(periodEnd.planets[planetIndex].y - periodEnd.host.y,
          periodStart.planets[planetIndex].y - periodStart.host.y);
      });
    });
  }
  assert.deepEqual([...observedSystemCounts].sort(), [2, 3]);
  assert.deepEqual([...observedPlanetCounts].sort(), [1, 2]);

  const traveler = { seed: 0x51a7, initialDistance: 0, speed: 20, size: 1.1,
    alpha: 0.6, isGalaxy: true };
  const appearance = getGalaxyAppearance(traveler, 0.82, 0);
  const system = createEmbeddedGalaxySystems(traveler, 0, appearance)[0];
  assert.deepEqual(
    getEmbeddedGalaxySystemState(system, getSimulationTime(620)),
    getEmbeddedGalaxySystemState(system, getSimulationTime(600)),
    'embedded system did not freeze with the shared simulation clock',
  );
  assert.deepEqual(getEmbeddedGalaxySystemState(system, 0), getEmbeddedGalaxySystemState(system, 0),
    'reduced-motion time zero must be deterministic');
});

test('non-Sombrero formations revolve coherently in their centered flattened plane', () => {
  const seedByFormation = new Map();
  const directionsByFormation = new Map(GALAXY_FORMATIONS.map((formation) => [formation, new Set()]));
  for (let seed = 0; seed < 4096; seed += 1) {
    const formation = getGalaxyFormation(seed, 0);
    if (!seedByFormation.has(formation)) seedByFormation.set(formation, seed);
    directionsByFormation.get(formation).add(Math.sign(getGalaxyRotationRate(seed, 0)));
  }

  for (const formation of GALAXY_FORMATIONS.filter((value) => value !== 'sombrero')) {
    assert.deepEqual([...directionsByFormation.get(formation)].sort(), [-1, 1],
      `${formation} does not vary rotation direction`);
    const traveler = { seed: seedByFormation.get(formation), initialDistance: 0,
      speed: 20, size: 1.1, alpha: 0.6, isGalaxy: true };
    const appearance = getGalaxyAppearance(traveler, 0.75, 0);
    const atZero = getGalaxyAnimationState(traveler, 0, 0);
    const atFive = getGalaxyAnimationState(traveler, 0, 5);
    const formationDisplacement = Math.abs(atFive.rotation - atZero.rotation);
    assert.ok(formationDisplacement >= 0.35,
      `${formation} turns only ${formationDisplacement} radians in five seconds`);
    closeTo(formationDisplacement, Math.abs(appearance.rotationRate) * 5);

    let visiblyDifferential = 0;
    for (let index = 0; index < appearance.internalStarCount; index += 1) {
      const before = getGalaxyParticleState(traveler, 0, 0.75, 0, index, appearance);
      const after = getGalaxyParticleState(traveler, 0, 0.75, 5, index, appearance);
      const beforeAngle = Math.atan2(before.y / appearance.flattening, before.x);
      const afterAngle = Math.atan2(after.y / appearance.flattening, after.x);
      const delta = appearance.rotationRate * 5;
      closeTo(after.x, before.x * Math.cos(delta) - before.y / appearance.flattening * Math.sin(delta));
      closeTo(after.y, (before.x * Math.sin(delta) + before.y / appearance.flattening * Math.cos(delta)) * appearance.flattening);
      closeTo(Math.hypot(before.x, before.y / appearance.flattening),
        Math.hypot(after.x, after.y / appearance.flattening));
      if (angularDistance(beforeAngle, afterAngle) >= 0.07) visiblyDifferential += 1;
    }
    assert.ok(visiblyDifferential >= appearance.internalStarCount / 2,
      `${formation} has differential motion in only ${visiblyDifferential} particles`);
  }
});

test('galaxy matter is deterministic, bounded, gently animated, and frozen by simulation time', () => {
  let movingParticles = 0;
  for (let seed = 0; seed < 128; seed += 1) {
    const traveler = { seed, initialDistance: 0, speed: 20, size: 1.1, alpha: 0.6, isGalaxy: true };
    const appearance = getGalaxyAppearance(traveler, 0.75, 1);
    for (let index = 0; index < appearance.internalStarCount; index += 1) {
      const atZero = getGalaxyParticleState(traveler, 1, 0.75, 0, index);
      const later = getGalaxyParticleState(traveler, 1, 0.75, 12, index);
      assert.deepEqual(atZero, getGalaxyParticleState(traveler, 1, 0.75, 0, index));
      assert.ok(Number.isFinite(atZero.x) && Number.isFinite(atZero.y));
      assert.ok(Math.hypot(atZero.x, atZero.y) <= appearance.outerRadius + 1e-12);
      assert.ok(['star', 'young-star', 'dust'].includes(atZero.kind));
      assert.ok(atZero.radius >= 0.12 && atZero.radius <= 0.68,
        `galaxy point radius ${atZero.radius} is not tightly bounded`);
      assert.ok(atZero.radius < appearance.outerRadius * 0.1);
      assert.ok(atZero.opacity >= 0 && atZero.opacity <= 1);
      if (Math.hypot(later.x - atZero.x, later.y - atZero.y) > 1e-5
        || Math.abs(later.opacity - atZero.opacity) > 1e-5) movingParticles += 1;
    }
  }
  assert.ok(movingParticles > 4000, `only ${movingParticles} particles animated`);

  const traveler = { seed: 99, initialDistance: 0, speed: 20, size: 1, alpha: 0.6, isGalaxy: true };
  const beforeFreeze = getGalaxyAnimationState(traveler, 0, getSimulationTime(600));
  const duringFreeze = getGalaxyAnimationState(traveler, 0, getSimulationTime(620));
  assert.deepEqual(duringFreeze, beforeFreeze, 'constellation simulation clock did not freeze galaxy');
  assert.deepEqual(
    getGalaxyParticleState(traveler, 0, 0.7, getSimulationTime(620), 3),
    getGalaxyParticleState(traveler, 0, 0.7, getSimulationTime(600), 3),
  );
  assert.deepEqual(getGalaxyAnimationState(traveler, 0, 0), getGalaxyAnimationState(traveler, 0, 0),
    'reduced-motion time zero must be stable');
  assert.notDeepEqual(getGalaxyAnimationState(traveler, 0, 20), getGalaxyAnimationState(traveler, 0, 0));
});

test('one equiprobable basis-point roll reserves disjoint exact 0.5% UFO and comet bands', () => {
  assert.equal(UFO_BASIS_POINTS, 50);
  assert.equal(COMET_BASIS_POINTS, 50);
  const variants = Array.from({ length: 10000 }, (_, basisPoint) =>
    getTravelerVariantForBasisPoint(basisPoint));
  assert.equal(variants.filter((variant) => variant === 'ufo').length, 50);
  assert.equal(variants.filter((variant) => variant === 'comet').length, 50);
  assert.equal(variants.filter((variant) => variant === 'star').length, 9900);
  variants.forEach((variant, basisPoint) => {
    assert.equal(isUfoBasisPoint(basisPoint), variant === 'ufo');
    assert.equal(isCometBasisPoint(basisPoint), variant === 'comet');
    assert.equal(isUfoBasisPoint(basisPoint) && isCometBasisPoint(basisPoint), false);
  });
  assert.equal(getTravelerVariantForBasisPoint(-1), 'star');
  assert.equal(getTravelerVariantForBasisPoint(10000 + UFO_BASIS_POINTS), 'comet');
});

test('traveler variants are lifecycle-stable, mutually exclusive, cycle-seeded, and reachable', () => {
  const observed = new Set();
  let lifecycleChange = false;
  for (let seed = 0; seed < 2048; seed += 1) {
    const traveler = { seed };
    const firstCycle = getTravelerVariant(traveler, 0);
    assert.equal(getTravelerVariant(traveler, 0), firstCycle);
    assert.equal(isUfoTraveler(traveler, 0), firstCycle === 'ufo');
    assert.equal(isCometTraveler(traveler, 0), firstCycle === 'comet');
    assert.equal(isUfoTraveler(traveler, 0) && isCometTraveler(traveler, 0), false);
    observed.add(firstCycle);
    if (getTravelerVariant(traveler, 1) !== firstCycle) lifecycleChange = true;
  }
  assert.deepEqual(observed, new Set(['star', 'ufo', 'comet']));
  assert.equal(lifecycleChange, true);

  const scene = createSpaceScene(0x51a7c0de);
  scene.travelers.forEach((traveler) => {
    assert.equal(getTravelerVariant(traveler, 4), getTravelerVariant(traveler, 4));
  });
});

test('comet debris animates deterministically and gradually widens behind its motion', () => {
  const traveler = { seed: 0x51a7, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  const trail = getCometAppearance(traveler, 3, 0.68);
  assert.deepEqual(trail, getCometAppearance(traveler, 3, 0.68));
  assert.notDeepEqual(trail, getCometAppearance(traveler, 4, 0.68));
  assert.ok(trail.headRadius > getTravelerAppearance(traveler, 0.68).radius);
  assert.ok(trail.glowRadius > trail.headRadius);
  assert.ok(trail.trailLength >= 18);
  assert.ok(trail.trailWidth >= 3.5);
  assert.equal(trail.particles.filter(({ kind }) => kind === 'asteroid').length, 6);
  assert.equal(trail.particles.filter(({ kind }) => kind === 'stardust').length, 18);
  trail.particles.forEach((particle) => {
    assert.ok(particle.distance > 0 && particle.distance <= trail.trailLength);
    assert.ok(Math.abs(particle.lateralOffset) <= trail.trailWidth);
    assert.ok(particle.radius >= 0.1 && particle.radius <= Math.max(0.35, trail.headRadius * 0.3));
    assert.ok(particle.opacity > 0 && particle.opacity <= 1);
    assert.ok(particle.rotation >= 0 && particle.rotation < Math.PI * 2);
  });
  const largestAsteroid = Math.max(...trail.particles
    .filter(({ kind }) => kind === 'asteroid').map(({ radius }) => radius));
  const largestDust = Math.max(...trail.particles
    .filter(({ kind }) => kind === 'stardust').map(({ radius }) => radius));
  assert.ok(largestAsteroid > largestDust * 1.5, 'fragments are not visibly distinct from stardust');

  const next = getCometAppearance(traveler, 3, 0.6801);
  const normalized = (appearance, particle) => ({
    distance: particle.distance / appearance.trailLength,
    lateralOffset: particle.lateralOffset / appearance.trailWidth,
    rotation: particle.rotation,
    opacity: particle.opacity,
  });
  const currentParticle = normalized(trail, trail.particles[0]);
  const nextParticle = normalized(next, next.particles[0]);
  assert.notDeepEqual(nextParticle, currentParticle,
    'particle-local geometry stayed rigid as traveler progress advanced');
  assert.ok(Math.abs(nextParticle.distance - currentParticle.distance) > 1e-8);
  assert.ok(Math.abs(nextParticle.lateralOffset - currentParticle.lateralOffset) > 1e-8);
  assert.ok(Math.abs(nextParticle.rotation - currentParticle.rotation) > 1e-8);
  assert.ok(Math.abs(nextParticle.opacity - currentParticle.opacity) > 1e-8);
  assert.ok(Math.abs(nextParticle.distance - currentParticle.distance) < 0.001);
  assert.ok(Math.abs(nextParticle.lateralOffset - currentParticle.lateralOffset) < 0.001);
  assert.ok(Math.abs(nextParticle.rotation - currentParticle.rotation) < 0.001);
  assert.ok(Math.abs(nextParticle.opacity - currentParticle.opacity) < 0.001);

  for (const seed of [0x51a7, 1, 2, 3, 99]) {
    const seededTrail = getCometAppearance({ ...traveler, seed }, 3, 0.68);
    const byAge = [...seededTrail.particles].sort((left, right) => left.distance - right.distance);
    const third = Math.floor(byAge.length / 3);
    const meanWakeWidth = (particles) => particles.reduce(
      (sum, particle) => sum + Math.abs(particle.lateralOffset) / seededTrail.trailWidth,
      0,
    ) / particles.length;
    assert.ok(meanWakeWidth(byAge.slice(-third)) > meanWakeWidth(byAge.slice(0, third)) * 2,
      `seed ${seed} did not widen its older trailing debris`);
  }
});

test('UFO visual radius is exactly 1.5x its corresponding moving-star radius at every depth', () => {
  const traveler = { seed: 17, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  assert.equal(UFO_SIZE_MULTIPLIER, 1.5);
  for (const progress of [0, 0.28, 0.5, 0.68, 1]) {
    const star = getTravelerAppearance(traveler, progress);
    const ufo = getUfoAppearance(traveler, progress);
    closeTo(ufo.radius, star.radius * 1.5);
    assert.ok(ufo.glowRadius > ufo.radius);
    assert.ok(ufo.streakLength >= 6);
  }
});

test('16% galaxy probability preserves moving radii and responsive traveler counts', () => {
  const scene = createSpaceScene(9876);
  assert.equal(AMBIENT_STAR_COUNT, 560);
  assert.deepEqual(TRAVELER_RADIUS_RANGE, [0.66, 1.21]);
  assert.ok(scene.travelers.every((traveler) =>
    traveler.size >= TRAVELER_RADIUS_RANGE[0] && traveler.size <= TRAVELER_RADIUS_RANGE[1]));
  assert.equal(DESKTOP_TRAVELER_COUNT, 170);
  assert.equal(MOBILE_TRAVELER_COUNT, 17);
  assert.equal(scene.travelers.length, 170);
  assert.equal(scene.travelers.slice(0, MOBILE_TRAVELER_COUNT).length, 17);
  assert.equal(travelerCountForWidth(639), 17);
  assert.equal(travelerCountForWidth(640), 51);
  assert.equal(travelerCountForWidth(1440), 170);
});

test('neural signals use a deterministic sparse schedule with bounded fades, pulse, and mobile density', () => {
  const desktopWidth = 1200;
  const mobileWidth = 390;
  const height = 700;
  const projectionsFor = (count, width) => Array.from({ length: count }, (_, index) => ({
    x: 35 + (index % 5) * ((width - 70) / 4),
    y: 70 + Math.floor(index / 5) * 125,
    depth: 400,
    progress: 0.4,
    radius: 2,
    opacity: 0.6,
    cycle: 0,
  }));
  const desktop = projectionsFor(DESKTOP_TRAVELER_COUNT, desktopWidth);
  const mobile = projectionsFor(MOBILE_TRAVELER_COUNT, mobileWidth);
  const seed = 0x51a7cafe;

  assert.equal(NEURAL_SIGNAL_SLOT_SECONDS, 24);
  assert.deepEqual(NEURAL_SIGNAL_DURATION_RANGE, [4.2, 5]);
  assert.equal(NEURAL_SIGNAL_MAX_OPACITY, 0.075);
  assert.equal(NEURAL_SIGNAL_MAX_CONCURRENT, 1);
  assert.equal(NEURAL_SIGNAL_DESKTOP_CHANCE, 0.48);
  assert.equal(NEURAL_SIGNAL_MOBILE_CHANCE, 0.30);
  closeTo(NEURAL_SIGNAL_DESKTOP_CHANCE / 0.32, 1.5);
  closeTo(NEURAL_SIGNAL_MOBILE_CHANCE / 0.20, 1.5);
  assert.ok(NEURAL_SIGNAL_MOBILE_CHANCE < NEURAL_SIGNAL_DESKTOP_CHANCE);
  assert.deepEqual(NEURAL_SIGNAL_WIDTH_RANGE, [0.5, 0.72]);

  let desktopActive = 0;
  let mobileActive = 0;
  let longestIdleRun = 0;
  let idleRun = 0;
  const observedOpacities = [];
  for (let time = 0; time < 590; time += 0.1) {
    const desktopSignals = getNeuralSignals(seed, time, desktop, desktopWidth, height);
    const mobileSignals = getNeuralSignals(seed, time, mobile, mobileWidth, height);
    assert.deepEqual(desktopSignals, getNeuralSignals(seed, time, desktop, desktopWidth, height));
    assert.ok(desktopSignals.length <= NEURAL_SIGNAL_MAX_CONCURRENT);
    assert.ok(mobileSignals.length <= NEURAL_SIGNAL_MAX_CONCURRENT);
    if (desktopSignals.length === 0) {
      idleRun += 1;
      longestIdleRun = Math.max(longestIdleRun, idleRun);
    } else {
      idleRun = 0;
      desktopActive += 1;
      const signal = desktopSignals[0];
      observedOpacities.push(signal.opacity);
      assert.ok(['155, 213, 239', '183, 188, 239', '151, 185, 236'].includes(signal.color));
      assert.equal(signal.sparkles.length, 2);
      assert.ok(Math.abs(signal.bend) <= 0.12);
      assert.ok(signal.opacity >= 0 && signal.opacity <= NEURAL_SIGNAL_MAX_OPACITY);
      assert.ok(signal.pulseProgress >= 0 && signal.pulseProgress <= 1);
      assert.ok(signal.lineWidth >= NEURAL_SIGNAL_WIDTH_RANGE[0]
        && signal.lineWidth <= NEURAL_SIGNAL_WIDTH_RANGE[1]);
    }
    if (mobileSignals.length > 0) mobileActive += 1;
  }
  assert.ok(desktopActive > 0, 'deterministic fixture never schedules a signal');
  assert.ok(longestIdleRun >= 150, `longest calm gap was only ${longestIdleRun / 10}s`);
  assert.ok(observedOpacities.some((opacity) => opacity > 0 && opacity < NEURAL_SIGNAL_MAX_OPACITY * 0.7),
    'fade ramps were not observed');
  assert.ok(mobileActive <= desktopActive, `${mobileActive} mobile samples exceeded ${desktopActive} desktop`);
});

test('neural light eases through long fades, restrained colors and two continuous soft sparkles', async () => {
  const { getNeuralSignalEnvelope, getNeuralSignalSparkles, NEURAL_SIGNAL_COLORS,
    NEURAL_SIGNAL_FADE_SECONDS, getNeuralPairVisibility } = await import('../../src/components/spaceBackgroundModel.ts');
  assert.deepEqual(NEURAL_SIGNAL_FADE_SECONDS, [1.3, 1.9]);
  assert.deepEqual(NEURAL_SIGNAL_COLORS, ['155, 213, 239', '183, 188, 239', '151, 185, 236']);
  for (const duration of NEURAL_SIGNAL_DURATION_RANGE) {
    for (const time of [-1, 0, duration, duration + 1]) assert.equal(getNeuralSignalEnvelope(time, duration), 0);
    assert.ok(getNeuralSignalEnvelope(0.01, duration) < 0.0002);
    assert.ok(getNeuralSignalEnvelope(duration - 0.01, duration) < 0.0001);
    assert.ok(getNeuralSignalEnvelope(1, duration) < 1);
    assert.ok(getNeuralSignalEnvelope(duration - 1, duration) < 0.6);
  }
  let previous = getNeuralSignalSparkles(0);
  assert.ok(previous.every((sparkle) => sparkle.opacity === 0));
  for (let step = 1; step <= 1000; step += 1) {
    const beads = getNeuralSignalSparkles(step / 1000);
    assert.equal(beads.length, 2);
    beads.forEach((bead, index) => {
      assert.equal(bead.progress, [0.34, 0.68][index]);
      assert.equal(bead.radius, 2.6);
      assert.ok(bead.opacity >= 0 && bead.opacity <= 0.65);
      assert.ok(Math.abs(bead.opacity - previous[index].opacity) < 0.004);
    });
    previous = beads;
  }
  assert.ok(previous.every((sparkle) => sparkle.opacity === 0));
  const left = { x: 200, y: 200, opacity: 0.6 };
  const right = { x: 400, y: 200, opacity: 0.6 };
  const visibility = (a, b = right) => getNeuralPairVisibility(a, b, 1000, 600);
  assert.equal(visibility(left), 1);
  for (const x of [-1, 0]) assert.equal(visibility({ ...left, x }), 0);
  assert.ok(visibility({ ...left, x: 0.01 }) < 0.000001);
  assert.equal(visibility({ ...left, opacity: 0.08 }), 0);
  assert.ok(visibility({ ...left, opacity: 0.08001 }) < 0.000001);
  const min = 54;
  const max = Math.hypot(1000, 600) * 0.48;
  for (const distance of [min, max]) {
    assert.ok(visibility(left, { ...right, x: left.x + distance }) < 1e-20);
  }
  assert.ok(visibility(left, { ...right, x: left.x + min + 0.01 }) < 0.000001);
  assert.ok(visibility(left, { ...right, x: left.x + max - 0.01 }) < 0.000001);
});

test('neural events keep color and eased light continuous for their full four-to-five second lifetime', () => {
  const projections = [200, 400].map((x) => ({
    x, y: 200, depth: 400, progress: 0.4, radius: 2, opacity: 0.6, cycle: 0,
  }));
  let previous;
  let start;
  let completed = 0;
  for (let tick = 0; tick < 12000; tick += 1) {
    const time = tick / 100;
    const signal = getNeuralSignals(0x51a7cafe, time, projections, 1000, 600)[0];
    if (signal && !previous) {
      start = time;
      assert.ok(signal.opacity < 0.00002);
      assert.ok(signal.pulseProgress < 0.00002);
    }
    if (signal && previous) {
      assert.equal(signal.color, previous.color);
      assert.equal(signal.bend, previous.bend);
      assert.ok(signal.pulseProgress >= previous.pulseProgress);
      assert.ok(signal.pulseProgress - previous.pulseProgress < 0.004);
      assert.ok(Math.abs(signal.opacity - previous.opacity) < 0.001);
    }
    if (!signal && previous) {
      assert.ok(time - start >= 4.19 && time - start <= 5.01);
      assert.ok(previous.opacity < 0.00002);
      assert.ok(previous.pulseProgress > 0.99998);
      completed += 1;
    }
    previous = signal;
  }
  assert.ok(completed > 0);
});

test('recent neural endpoints receive bounded decaying affinity without excluding ordinary pairs', () => {
  const width = 1000;
  const height = 600;
  const projections = [
    { x: 140, y: 170 }, { x: 360, y: 170 }, { x: 140, y: 390 }, { x: 360, y: 390 },
  ].map((point) => ({ ...point, depth: 400, progress: 0.4, radius: 2, opacity: 0.6, cycle: 0 }));
  const empty = createNeuralContagionState();
  const struck = updateNeuralContagionForSignal(
    empty, 0, { fromTravelerIndex: 0, toTravelerIndex: 1 }, projections, width, height,
  );

  assert.equal(NEURAL_CONTAGION_AFFINITY_BOOST, 4);
  assert.equal(NEURAL_CONTAGION_OPPORTUNITIES, 3);
  assert.equal(NEURAL_CONTAGION_MAX_ENTRIES, 8);
  assert.deepEqual(struck.entries.map(({ travelerIndex }) => travelerIndex), [0, 1]);
  assert.ok(struck.entries.every(({ remainingOpportunities }) =>
    remainingOpportunities === NEURAL_CONTAGION_OPPORTUNITIES));

  let unbiasedParticipation = 0;
  let contagiousParticipation = 0;
  let ordinaryAlternative = 0;
  const samples = 4096;
  for (let sample = 0; sample < samples; sample += 1) {
    const seed = sample * 7919;
    const slot = 1 + sample % 97;
    const unbiased = selectNeuralSignalPair(seed, slot, projections, width, height, empty);
    const contagious = selectNeuralSignalPair(seed, slot, projections, width, height, struck);
    if (unbiased.fromTravelerIndex === 0 || unbiased.toTravelerIndex === 0) unbiasedParticipation += 1;
    if (contagious.fromTravelerIndex === 0 || contagious.toTravelerIndex === 0) contagiousParticipation += 1;
    if (![contagious.fromTravelerIndex, contagious.toTravelerIndex].includes(0)
      && ![contagious.fromTravelerIndex, contagious.toTravelerIndex].includes(1)) {
      ordinaryAlternative += 1;
    }
  }
  assert.ok(contagiousParticipation > unbiasedParticipation * 1.2,
    `${contagiousParticipation} affinity samples vs ${unbiasedParticipation} baseline`);
  assert.ok(ordinaryAlternative > 0, 'baseline-weight alternative pairs became impossible');

  const repeated = updateNeuralContagionForSignal(
    struck, 0, { fromTravelerIndex: 0, toTravelerIndex: 1 }, projections, width, height,
  );
  assert.equal(repeated, struck, 'one RAF-visible event reinforced more than once');

  let decayed = struck;
  for (let slot = 1; slot <= NEURAL_CONTAGION_OPPORTUNITIES; slot += 1) {
    decayed = updateNeuralContagionForSignal(
      decayed, slot, { fromTravelerIndex: 2, toTravelerIndex: 3 }, projections, width, height,
    );
  }
  assert.ok(decayed.entries.every(({ travelerIndex }) => travelerIndex !== 0 && travelerIndex !== 1),
    'old affinity survived its opportunity limit');

  const many = Array.from({ length: 14 }, (_, index) => ({
    x: 80 + (index % 7) * 125,
    y: 120 + Math.floor(index / 7) * 220,
    depth: 400, progress: 0.4, radius: 2, opacity: 0.6, cycle: 0,
  }));
  let bounded = createNeuralContagionState();
  for (let slot = 0; slot < 7; slot += 1) {
    bounded = updateNeuralContagionForSignal(
      bounded, slot, { fromTravelerIndex: slot * 2, toTravelerIndex: slot * 2 + 1 },
      many, width, height,
    );
    assert.ok(bounded.entries.length <= NEURAL_CONTAGION_MAX_ENTRIES);
  }
});

test('neural contagion resets recycled and stale travelers and locks one logical event across RAFs', () => {
  const width = 1000;
  const height = 600;
  const projections = [
    { x: 100, y: 150 }, { x: 300, y: 150 }, { x: 500, y: 150 }, { x: 700, y: 150 },
  ].map((point) => ({ ...point, depth: 400, progress: 0.4, radius: 2, opacity: 0.6, cycle: 2 }));
  const state = updateNeuralContagionForSignal(
    createNeuralContagionState(), 9,
    { fromTravelerIndex: 0, toTravelerIndex: 1 }, projections, width, height,
  );
  const locked = selectNeuralSignalPair(0x51a7, 9, projections, width, height, state);
  assert.deepEqual(locked, { fromTravelerIndex: 0, toTravelerIndex: 1 });
  assert.deepEqual(selectNeuralSignalPair(0xdeadbeef, 9, projections, width, height, state), locked,
    'same logical event changed endpoints with a different RAF call');

  const recycled = projections.map((projection) => ({ ...projection }));
  recycled[0].cycle += 1;
  const afterCycle = syncNeuralContagionState(state, recycled, width, height);
  assert.ok(afterCycle.entries.every(({ travelerIndex }) => travelerIndex !== 0));
  assert.equal(selectNeuralSignalPair(0x51a7, 9, recycled, width, height, afterCycle), null,
    'a recycled locked endpoint caused a replacement jump');

  const stale = recycled.map((projection) => ({ ...projection }));
  stale[1].opacity = 0.08;
  const afterStale = syncNeuralContagionState(afterCycle, stale, width, height);
  assert.equal(afterStale.entries.length, 0);

  assert.equal(getNeuralSignalSlot(48.1), 2);
  assert.equal(getNeuralSignalSlot(605), 25, 'frozen simulation advanced the signal slot');
});

test('neural endpoints are exclusively live eligible travelers and constellation/reduced-motion states suppress them', () => {
  const width = 1000;
  const height = 600;
  const scene = createSpaceScene(0xabc123);
  const travelerCount = travelerCountForWidth(width);
  const travelers = scene.travelers.slice(0, travelerCount);
  const eligibilityFixture = {
    x: 100, y: 100, depth: 400, progress: 0.4, radius: 2, opacity: 0.5, cycle: 0,
  };
  assert.equal(isTravelerEligibleForNeuralSignal(eligibilityFixture, width, height), true);
  assert.equal(isTravelerEligibleForNeuralSignal({ ...eligibilityFixture, opacity: 0.08 }, width, height), false);
  assert.equal(isTravelerEligibleForNeuralSignal({ ...eligibilityFixture, x: -0.01 }, width, height), false);
  assert.equal(isTravelerEligibleForNeuralSignal(undefined, width, height), false);

  let activeSample;
  for (let elapsed = 0; elapsed < 590 && !activeSample; elapsed += 0.05) {
    const simulation = getSimulationTime(elapsed);
    const projections = travelers.map((traveler) => projectTraveler(traveler, simulation, width, height));
    const signals = getNeuralSignals(scene.seed, elapsed, projections, width, height);
    if (signals.length > 0) activeSample = { elapsed, projections, signal: signals[0] };
  }
  assert.ok(activeSample, 'real traveler projections never produced a deterministic signal fixture');
  const { projections, signal } = activeSample;
  assert.notEqual(signal.fromTravelerIndex, signal.toTravelerIndex);
  for (const index of [signal.fromTravelerIndex, signal.toTravelerIndex]) {
    assert.ok(index >= 0 && index < travelerCount);
    assert.equal(isTravelerEligibleForNeuralSignal(projections[index], width, height), true);
  }
  const ineligible = projections.map((projection) => ({ ...projection }));
  ineligible[signal.fromTravelerIndex].x = -1;
  const replacement = getNeuralSignals(scene.seed, activeSample.elapsed, ineligible, width, height);
  assert.ok(replacement.every((candidate) =>
    candidate.fromTravelerIndex !== signal.fromTravelerIndex
    && candidate.toTravelerIndex !== signal.fromTravelerIndex));

  const frozen = travelers.map((traveler) => projectTraveler(
    traveler, getSimulationTime(600), width, height));
  for (const elapsed of [600, 605, 610, 620, 629.999]) {
    assert.equal(getSimulationTime(elapsed), 600);
    assert.deepEqual(travelers.map((traveler) => projectTraveler(
      traveler, getSimulationTime(elapsed), width, height)), frozen);
    assert.deepEqual(getNeuralSignals(scene.seed, elapsed, frozen, width, height), []);
  }
  assert.deepEqual(getNeuralSignals(scene.seed, activeSample.elapsed, projections, width, height, true), []);
});

test('system opacity reveals once and remains stable past the selection cutoff', () => {
  const projectionAt = (progress, opacity = 0.72) => ({
    x: 500,
    y: 300,
    depth: 200,
    progress,
    radius: 5,
    opacity,
    cycle: 0,
  });
  assert.equal(getSystemOpacity(projectionAt(SYSTEM_MIN_PROGRESS - 0.001)), 0);
  closeTo(getSystemOpacity(projectionAt(SYSTEM_MIN_PROGRESS + 0.06)), 0.36);
  const stableSamples = [SYSTEM_MIN_PROGRESS + 0.12, 0.78, 0.84, 0.9, 0.99]
    .map((progress) => getSystemOpacity(projectionAt(progress)));
  stableSamples.forEach((opacity) => closeTo(opacity, 0.72));
  closeTo(getSystemOpacity(projectionAt(0.9, 0), 0.36), 0.36);

});

test('sticky ownership lasts through partial clipping and ends only after the system clears the screen', () => {
  const width = 1440;
  const height = 800;
  const travelers = createSpaceScene(1).travelers;
  const projection = {
    x: 0,
    y: height * 0.5,
    depth: 100,
    progress: 0.9,
    radius: 5,
    opacity: 0,
    cycle: 0,
  };
  const margin = getSystemSafetyMargin(travelers[2], projection);
  const projections = Array(travelers.length);
  projections[2] = { ...projection, x: -margin * 0.5 };
  const currentOwner = { travelerIndex: 2, cycle: 0 };

  assert.equal(isSystemInViewport(travelers[2], projections[2], width, height), false);
  assert.equal(isSystemOverlappingViewport(travelers[2], projections[2], width, height), true);
  assert.deepEqual(
    selectProminentSystemOwner(travelers, projections, width, height, currentOwner),
    currentOwner,
  );
  assert.ok(getSystemOpacity(projections[2], travelers[2].alpha) > 0);

  projections[2] = { ...projection, x: -margin - 0.01 };
  assert.equal(isSystemOverlappingViewport(travelers[2], projections[2], width, height), false);
  assert.equal(selectProminentSystemOwner(travelers, projections, width, height, currentOwner), null);
});

test('traveler trajectories remain straight and collinear through every reveal threshold', () => {
  const width = 1440;
  const height = 800;
  const center = { x: width * 0.5, y: height * 0.45 };
  const traveler = { seed: 17, initialDistance: 0, speed: 20, size: 1, alpha: 0.6 };
  const progresses = [
    TRAVELER_DETAIL_THRESHOLDS[0] - 0.000001,
    TRAVELER_DETAIL_THRESHOLDS[0],
    SYSTEM_MIN_PROGRESS - 0.000001,
    SYSTEM_MIN_PROGRESS,
    TRAVELER_DETAIL_THRESHOLDS[1],
    TRAVELER_DETAIL_THRESHOLDS[2],
    (SYSTEM_MIN_PROGRESS + SYSTEM_MAX_PROGRESS) / 2,
    SYSTEM_MAX_PROGRESS,
  ];
  let firstCycleEnd = 0;
  while (projectTraveler(traveler, firstCycleEnd, width, height).cycle === 0) firstCycleEnd += 0.1;
  const elapsedForProgress = (target) => {
    let lower = 0;
    let upper = firstCycleEnd - 0.1000001;
    for (let iteration = 0; iteration < 48; iteration += 1) {
      const middle = (lower + upper) * 0.5;
      if (projectTraveler(traveler, middle, width, height).progress < target) lower = middle;
      else upper = middle;
    }
    return (lower + upper) * 0.5;
  };
  const projections = progresses.map((progress) => projectTraveler(
    traveler,
    elapsedForProgress(progress),
    width,
    height,
  ));
  const direction = {
    x: projections[0].x - center.x,
    y: projections[0].y - center.y,
  };

  projections.forEach((projection, index) => {
    closeTo(projection.progress, progresses[index]);
    assert.equal(projection.cycle, 0);
    const offset = { x: projection.x - center.x, y: projection.y - center.y };
    closeTo(direction.x * offset.y - direction.y * offset.x, 0, 1e-8);
    assert.ok(direction.x * offset.x + direction.y * offset.y > 0);
  });
});

test('the expanded deterministic carrier minority still selects one nearest useful system', () => {
  const scene = createSpaceScene(9876);
  const carrierIndices = scene.travelers.map((traveler, index) =>
    isSystemCarrier(traveler, index) ? index : -1).filter((index) => index >= 0);
  // The 16% roll makes slot 14 a galaxy; galaxies remain excluded from carriers.
  assert.equal(scene.travelers[14].isGalaxy, true);
  assert.deepEqual(carrierIndices, [2, 8, 20, 26, 32, 38, 50, 56, 62, 74, 80, 92, 98,
    104, 110, 116, 122, 128, 140, 146, 152, 158, 164]);
  assert.ok(carrierIndices.every((index) => index % 6 === 2 && !scene.travelers[index].isGalaxy));
  const mobileTravelers = scene.travelers.slice(0, MOBILE_TRAVELER_COUNT);
  assert.deepEqual(mobileTravelers.map((traveler, index) =>
    isSystemCarrier(traveler, index) ? index : -1).filter((index) => index >= 0), [2, 8]);

  const projections = scene.travelers.map((_, index) => ({
    x: 400,
    y: 300,
    depth: 400,
    progress: SYSTEM_MIN_PROGRESS + index * 0.02,
    radius: 1,
    opacity: 0.6,
    cycle: 0,
  }));
  assert.equal(selectProminentSystem(scene.travelers, projections, 1000, 600), 20);
  assert.equal(selectProminentSystem(
    mobileTravelers,
    projections.slice(0, MOBILE_TRAVELER_COUNT),
    1000,
    600,
  ), 8);
});

test('planet atmosphere taxonomy is diverse, deterministic, and cycle-seeded', () => {
  assert.deepEqual(PLANET_ATMOSPHERE_CLASSES,
    ['gas-banded', 'ocean-haze', 'rocky-cratered', 'ice', 'volcanic']);
  const observed = new Set();
  const colorsByAtmosphere = new Map();
  let diverseSystem;
  for (let seed = 1; seed <= 500; seed += 1) {
    const system = createPlanetSystem(seed, 3);
    assert.deepEqual(system, createPlanetSystem(seed, 3));
    system.forEach((planet) => {
      assert.ok(PLANET_ATMOSPHERE_CLASSES.includes(planet.atmosphere));
      assert.ok(Number.isInteger(planet.surfaceSeed) && planet.surfaceSeed >= 0);
      observed.add(planet.atmosphere);
      if (!colorsByAtmosphere.has(planet.atmosphere)) colorsByAtmosphere.set(planet.atmosphere, new Set());
      colorsByAtmosphere.get(planet.atmosphere).add(planet.color);
    });
    if (!diverseSystem && system.length >= PLANET_ATMOSPHERE_CLASSES.length) diverseSystem = system;
  }
  assert.deepEqual([...observed].sort(), [...PLANET_ATMOSPHERE_CLASSES].sort());
  assert.equal(colorsByAtmosphere.size, PLANET_ATMOSPHERE_CLASSES.length);
  assert.ok(diverseSystem, 'no deterministic multi-atmosphere fixture found');
  assert.equal(new Set(diverseSystem.slice(0, 5).map(({ atmosphere }) => atmosphere)).size, 5);
  assert.notDeepEqual(createPlanetSystem(0xface, 3), createPlanetSystem(0xface, 4));
});

test('planet bodies remain half-sized while active host stellar geometry doubles', () => {
  assert.deepEqual(PLANET_RADIUS_RANGE, [1.45, 2.3]);
  assert.equal(PLANET_RENDER_SCALE, 0.5);
  assert.equal(spaceModel.SYSTEM_HOST_RADIUS_MULTIPLIER, 2);
  assert.deepEqual(PLANET_SURFACE_LOD_DIAMETERS, [5, 10]);
  assert.equal(getPlanetSurfaceDetailLevel(2, 1.2), 0);
  assert.equal(getPlanetSurfaceDetailLevel(2.5, 1), 1);
  assert.equal(getPlanetSurfaceDetailLevel(5, 1), 2);
  closeTo(getSystemScale({ progress: SYSTEM_MIN_PROGRESS }), 0.55);
  closeTo(getSystemScale({ progress: SYSTEM_MAX_PROGRESS }), 4);
  const midpointScale = getSystemScale({ progress: (SYSTEM_MIN_PROGRESS + SYSTEM_MAX_PROGRESS) / 2 });
  assert.ok(midpointScale > 2 && midpointScale < 3);

  const closestScale = getSystemScale({ progress: SYSTEM_MAX_PROGRESS });
  for (let seed = 1; seed <= 1000; seed += 1) {
    createPlanetSystem(seed, 0).forEach((planet) => {
      assert.ok(planet.radius >= PLANET_RADIUS_RANGE[0] && planet.radius <= PLANET_RADIUS_RANGE[1]);
      const cssDiameter = planet.radius * PLANET_RENDER_SCALE * closestScale * 2;
      assert.ok(cssDiameter >= 5.8, `seed ${seed} body is only ${cssDiameter}px`);
      assert.ok(cssDiameter <= 9.2, `seed ${seed} body is ${cssDiameter}px`);
      assert.equal(getPlanetSurfaceDetailLevel(planet.radius * PLANET_RENDER_SCALE, closestScale), 1);
    });
  }
});

test('planet body sizing respects tiny hosts and perspective without a minimum-size override', () => {
  assert.equal(MAX_PLANET_TO_HOST_RADIUS_RATIO, 0.75);
  for (const size of [0.001, TRAVELER_RADIUS_RANGE[0], 0.5, TRAVELER_RADIUS_RANGE[1]]) {
    for (let step = 0; step <= 100; step += 1) {
      const progress = step / 100;
      const host = getTravelerAppearance({ size, seed: 17 }, progress);
      const scale = getSystemScale({ progress });
      const localHost = getSystemOwnerDiscLocalRadius(host.radius, scale);
      closeTo(localHost * scale, host.radius);
      for (const radius of [...PLANET_RADIUS_RANGE, 0.00001]) {
        const rendered = getPlanetRenderRadius(radius, localHost);
        assert.ok(rendered > 0 && rendered * scale < host.radius);
        assert.ok(rendered <= radius * PLANET_RENDER_SCALE);
        assert.ok(rendered * scale <= host.radius * MAX_PLANET_TO_HOST_RADIUS_RATIO + 1e-12);
        if (radius * PLANET_RENDER_SCALE <= localHost * MAX_PLANET_TO_HOST_RADIUS_RATIO) {
          assert.equal(rendered, radius * PLANET_RENDER_SCALE, 'already smaller bodies stay unchanged');
        }
      }
    }
  }
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.equal(getPlanetRenderRadius(2, invalid), 0);
    assert.equal(getPlanetRenderRadius(invalid, 2), 0);
  }
  assert.equal(getPlanetRenderRadius(2, 1), 0.75, 'equal-sized bodies must shrink too');
  assert.equal(getPlanetRenderRadius(20, 1), 0.75);
  assert.equal(getPlanetRenderRadius(1, 1), 0.5, 'smaller bodies stay unchanged');
});

test('canvas doubles the host disc but retains ordinary-host caps for both orbital halves and moons', () => {
  const source = readFileSync(new URL('../../src/components/SpaceNeuralBackground.tsx', import.meta.url), 'utf8');
  const declarations = ['drawPlanet', 'drawPlanetarySystem'].map((name) => {
    const start = source.indexOf(`const ${name} = (`);
    assert.ok(start >= 0);
    return source.slice(start, source.indexOf('\n};', start) + 3);
  }).join('\n');
  const compiled = stripTypeScriptTypes(declarations);
  for (const size of [0.001, TRAVELER_RADIUS_RANGE[0], TRAVELER_RADIUS_RANGE[1]]) {
    for (const progress of [0.4, 0.65, 1]) {
      const traveler = { size, seed: 17, alpha: 1 };
      const projection = { progress, cycle: 0, x: 0, y: 0, opacity: 1 };
      const hostRadius = getTravelerAppearance(traveler, progress).radius;
      const scale = getSystemScale(projection);
      const bodies = [];
      const moons = [];
      let drawnHost;
      let drawnHostOpacity;
      const moonOpacities = [];
      const nebulaTransmission = 0.3;
      const ctx = new Proxy({}, {
        get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient'
          ? () => ({ addColorStop() {} })
          : key === 'arc' ? (x, y, radius) => bodies.push(radius * scale) : () => {},
      });
      const draw = runInNewContext(`${compiled}\ndrawPlanetarySystem;`, {
        ...spaceModel,
        TAU: Math.PI * 2,
        drawAtmosphereSurface() {},
        drawPlanetRing() {},
        drawMoon: (_, moon, opacity) => {
          moons.push(moon.radius * scale);
          moonOpacities.push(opacity);
        },
        drawTravelerDisc: (_, appearance, x, y, radius, opacity) => {
          drawnHost = radius * scale;
          drawnHostOpacity = opacity;
        },
        // Force both painter-order halves, with no atmosphere to obscure body arc measurements.
        getOrbitingPlanets: () => [-1, 1].map((z) => ({
          radius: PLANET_RADIUS_RANGE[1], x: z * 10, y: 0, z,
          atmosphere: 'rocky-cratered', color: '#ffffff', surfaceSeed: 1,
          moons: [{ radius: 0.5, orbitRadius: 2, phase: 0, speed: 1, inclination: 0.5 }],
        })),
      });
      draw(ctx, traveler, projection, 1, nebulaTransmission);
      closeTo(drawnHost, hostRadius * 2);
      const expectedOpacity = getSystemOpacity(projection, traveler.alpha) * nebulaTransmission;
      closeTo(drawnHostOpacity, spaceModel.getTravelerDiscOpacity(progress));
      moonOpacities.forEach((opacity) => closeTo(opacity, expectedOpacity));
      assert.equal(bodies.length, 6, 'both planets draw their body, shadow, and highlight arcs');
      assert.ok(bodies.every((radius) => radius > 0 && radius < drawnHost
        && radius <= hostRadius * MAX_PLANET_TO_HOST_RADIUS_RATIO + 1e-12));
      assert.equal(moons.length, 2);
      assert.ok(moons.every((radius) => radius <= bodies[0] * MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO));
    }
  }
});

test('every generated moon stays at most half its rendered parent radius at every system scale', () => {
  assert.equal(MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO, 0.5);
  const systemScales = Array.from({ length: 101 }, (_, index) => getSystemScale({
    progress: SYSTEM_MIN_PROGRESS
      + (SYSTEM_MAX_PROGRESS - SYSTEM_MIN_PROGRESS) * index / 100,
  }));
  let moonCount = 0;
  let smallestRatio = Infinity;
  let largestRatio = 0;

  for (let seed = 1; seed <= 5000; seed += 1) {
    for (const cycle of [0, 7]) {
      createPlanetSystem(seed, cycle).forEach((planet) => {
        const renderedParentRadiusBeforeSystemScale = planet.radius * PLANET_RENDER_SCALE;
        planet.moons.forEach((moon) => {
          moonCount += 1;
          const ratio = moon.radius / renderedParentRadiusBeforeSystemScale;
          smallestRatio = Math.min(smallestRatio, ratio);
          largestRatio = Math.max(largestRatio, ratio);
          assert.ok(ratio <= MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO + 1e-12,
            `seed ${seed} cycle ${cycle} moon ratio ${ratio} exceeds the cap`);

          systemScales.forEach((systemScale) => {
            const renderedMoonRadius = moon.radius * systemScale;
            const renderedParentRadius = renderedParentRadiusBeforeSystemScale * systemScale;
            assert.ok(renderedMoonRadius
              <= renderedParentRadius * MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO + 1e-12);
            assert.ok(renderedMoonRadius * 2
              <= renderedParentRadius * 2 * MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO + 1e-12);
          });
        });
      });
    }
  }

  assert.ok(moonCount > 1000, `only sampled ${moonCount} moons`);
  assert.ok(smallestRatio < 0.3, `smallest moon ratio ${smallestRatio} was not visibly varied`);
  assert.ok(largestRatio > 0.49, `largest moon ratio ${largestRatio} did not approach the cap`);
});

test('per-planet moon outcomes use exact mutually exclusive probability boundaries', () => {
  const outcome = (...samples) => {
    let index = 0;
    return chooseMoonCount(() => samples[index++]);
  };

  assert.equal(outcome(0), 0);
  assert.equal(outcome(0.814999999), 0);
  assert.equal(outcome(0.815), 1);
  assert.equal(outcome(0.914999999), 1);
  assert.equal(outcome(0.915), 2);
  assert.equal(outcome(0.964999999), 2);
  assert.equal(outcome(0.965, 0), 3);
  assert.equal(outcome(0.989999999, 0.999999999), 5);
  assert.equal(outcome(0.99, 0), 5);
  assert.equal(outcome(0.999999999, 0.999999999), 7);

  const counts = Array(8).fill(0);
  for (let index = 0; index < 10000; index += 1) {
    counts[chooseMoonCount((() => {
      const samples = [(index + 0.5) / 10000, 0.5];
      return () => samples.shift();
    })())] += 1;
  }
  assert.equal(counts[0], 8150);
  assert.equal(counts.slice(1).reduce((total, count) => total + count, 0), 1850);
});

test('planet moon generation reaches 0-7 independently with no system cap and legible orbital tiers', () => {
  const observedCounts = new Set();
  let largestSystemMoonTotal = 0;
  let sawMultipleMoonBearingPlanets = false;
  for (let seed = 1; seed <= 10000; seed += 1) {
    const planets = createPlanetSystem(seed, 0);
    assert.deepEqual(planets, createPlanetSystem(seed, 0));
    const totalMoons = planets.reduce((total, planet) => total + planet.moons.length, 0);
    largestSystemMoonTotal = Math.max(largestSystemMoonTotal, totalMoons);
    if (planets.filter((planet) => planet.moons.length > 0).length > 1) {
      sawMultipleMoonBearingPlanets = true;
    }
    assert.ok(planets.filter((planet) => planet.hasRing).length <= 2);
    assert.ok(planets.every((planet) => planet.orbitRadius < MAX_PLANET_ORBIT_RADIUS));
    planets.forEach((planet) => {
      observedCounts.add(planet.moons.length);
      assert.ok(planet.moons.length <= 7);
      planet.moons.forEach((moon, index) => {
        if (index === 0) return;
        assert.ok(moon.orbitRadius - planet.moons[index - 1].orbitRadius >= 1.08 - 1e-12);
        assert.ok(Math.abs(planet.moons[index - 1].speed) - Math.abs(moon.speed) >= 0.06 - 1e-12);
      });
      if (planet.moons.length > 1) {
        const phases = planet.moons
          .map((moon) => ((moon.phase / (Math.PI * 2)) % 1 + 1) % 1)
          .sort((left, right) => left - right);
        const gaps = phases.map((phase, index) =>
          (phases[(index + 1) % phases.length] - phase + 1) % 1);
        assert.ok(Math.min(...gaps) >= 1 / phases.length - 0.2 / (Math.PI * 2) - 1e-12);
      }
    });
  }
  assert.deepEqual([...observedCounts].sort((left, right) => left - right), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sawMultipleMoonBearingPlanets, true);
  assert.ok(largestSystemMoonTotal > 7, `largest generated system had only ${largestSystemMoonTotal} moons`);
  assert.notDeepEqual(createPlanetSystem(0xface, 4), createPlanetSystem(0xface, 5));
});

test('system safety margins are exact and include bodies, moons, rings, atmospheres, and stellar flares', () => {
  const planets = [{
    orbitRadius: 20,
    radius: 2,
    phase: 0,
    speed: 1,
    inclination: 0.4,
    tilt: 0,
    color: '#fff',
    atmosphere: 'ocean-haze',
    surfaceSeed: 9,
    moons: [{ radius: 0.4, orbitRadius: 4.5, phase: 0, speed: 1 }],
    hasRing: true,
  }];
  closeTo(getPlanetSystemExtent(planets), 24.9);
  closeTo(getPlanetSystemExtent([{ ...planets[0], moons: [] }]),
    20 + 2 * PLANET_RENDER_SCALE * 1.85 + PLANET_RING_LINE_WIDTH * 0.5);
  closeTo(getPlanetSystemExtent([{ ...planets[0], moons: [], hasRing: false }]),
    20 + 2 * PLANET_RENDER_SCALE * ATMOSPHERE_HALO_RADIUS_MULTIPLIER);
  const traveler = createSpaceScene(44).travelers[2];
  const projection = { x: 200, y: 200, depth: 300, progress: 0.8, radius: 2, opacity: 0.5, cycle: 0 };
  const appearance = spaceModel.getSystemHostStarAppearance(traveler, projection.progress);
  const expected = Math.max(
    getPlanetSystemExtent(createPlanetSystem(traveler.seed, 0)) * getSystemScale(projection),
    appearance.radius,
  ) + 0.5;
  closeTo(getSystemSafetyMargin(traveler, projection), expected);
});

test('desktop and mobile visibility sweeps select only nearest eligible in-bounds carriers', () => {
  const scene = createSpaceScene(9876);
  for (const { width, height, count } of [
    { width: 1440, height: 800, count: DESKTOP_TRAVELER_COUNT },
    { width: 390, height: 844, count: MOBILE_TRAVELER_COUNT },
  ]) {
    const travelers = scene.travelers.slice(0, count);
    let visibleSystemSamples = 0;
    const selectedCarriers = new Set();
    for (let elapsed = 0; elapsed < 900; elapsed += 0.5) {
      const projections = travelers.map((traveler) => projectTraveler(traveler, elapsed, width, height));
      const eligible = travelers.map((traveler, index) => ({ traveler, projection: projections[index], index }))
        .filter(({ traveler, projection, index }) =>
          isSystemCarrier(traveler, index) &&
          getTravelerVariant(traveler, projection.cycle) === 'star' &&
          projection.progress >= SYSTEM_MIN_PROGRESS &&
          projection.progress <= SYSTEM_MAX_PROGRESS &&
          doesSystemExitViewportBeforeCycle(traveler, projection, width, height) &&
          isSystemInViewport(traveler, projection, width, height))
        .sort((left, right) => right.projection.progress - left.projection.progress);
      const selected = selectProminentSystem(travelers, projections, width, height);
      assert.equal(selected, eligible[0]?.index ?? -1, `${width}x${height} at ${elapsed}`);
      if (selected >= 0) {
        visibleSystemSamples += 1;
        selectedCarriers.add(selected);
        assert.equal(isSystemInViewport(travelers[selected], projections[selected], width, height), true);
        assert.equal(
          doesSystemExitViewportBeforeCycle(travelers[selected], projections[selected], width, height),
          true,
        );
      }
    }
    assert.ok(visibleSystemSamples > 0, `${width}x${height} never reveals a near system`);
    assert.ok(selectedCarriers.size > 0, `${width}x${height} has no useful carrier`);
  }
});

test('planet lighting faces the local star and exposes canonical orbit phases', () => {
  const rightSide = getPlanetLightingStyle({ x: 12, y: 0, z: 0 });
  const leftSide = getPlanetLightingStyle({ x: -12, y: 0, z: 0 });
  const farSide = getPlanetLightingStyle({ x: 0, y: -4, z: -1 });
  const nearSide = getPlanetLightingStyle({ x: 0, y: 4, z: 1 });

  assert.deepEqual(rightSide.lightDirection, { x: -1, y: 0 });
  assert.deepEqual(leftSide.lightDirection, { x: 1, y: 0 });
  closeTo(rightSide.illuminatedFraction, 0.5);
  closeTo(leftSide.illuminatedFraction, 0.5);
  closeTo(farSide.illuminatedFraction, 1);
  closeTo(nearSide.illuminatedFraction, 0);
  assert.ok(farSide.illuminatedFraction > rightSide.illuminatedFraction);
  assert.ok(rightSide.illuminatedFraction > nearSide.illuminatedFraction);

  for (const fixture of [rightSide, leftSide, farSide, nearSide]) {
    closeTo(fixture.shadowStart.x, -fixture.lightDirection.x);
    closeTo(fixture.shadowStart.y, -fixture.lightDirection.y);
    closeTo(fixture.shadowEnd.x, fixture.lightDirection.x);
    closeTo(fixture.shadowEnd.y, fixture.lightDirection.y);
    assert.ok(fixture.terminatorStart >= 0 && fixture.terminatorStart <= 1);
    assert.ok(fixture.terminatorEnd >= 0 && fixture.terminatorEnd <= 1);
    assert.ok(fixture.terminatorStart <= fixture.terminatorEnd);
  }
});

test('planet lighting is continuous, bounded, deterministic, and has a stable center fallback', () => {
  let previous;
  for (let index = 0; index <= 1000; index += 1) {
    const z = -1.2 + index * 2.4 / 1000;
    const style = getPlanetLightingStyle({ x: 7.5, y: -3.25, z });
    assert.deepEqual(style, getPlanetLightingStyle({ x: 7.5, y: -3.25, z }));
    assert.ok(style.illuminatedFraction >= 0 && style.illuminatedFraction <= 1);
    if (previous) {
      assert.ok(Math.abs(style.illuminatedFraction - previous.illuminatedFraction) <= 0.00121);
      assert.ok(Math.abs(style.terminatorStart - previous.terminatorStart) <= 0.00121);
      assert.ok(Math.abs(style.terminatorEnd - previous.terminatorEnd) <= 0.00121);
    }
    previous = style;
  }

  const fallback = getPlanetLightingStyle({ x: 0, y: 0, z: 0 });
  assert.deepEqual(fallback.lightDirection, { x: -1, y: 0 });
  closeTo(fallback.illuminatedFraction, 0.5);
  assert.ok(Object.values(fallback).flatMap((value) =>
    typeof value === 'object' ? Object.values(value) : [value]).every(Number.isFinite));

  const planet = {
    orbitRadius: 14,
    radius: 2,
    phase: 0.4,
    speed: -0.7,
    inclination: 0.42,
    tilt: -0.27,
    color: '#fff',
    atmosphere: 'ice',
    surfaceSeed: 3,
    moons: [],
    hasRing: false,
  };
  for (const time of [0, 0.5, 2, 5]) {
    const orbiting = getOrbitingPlanet(planet, time);
    const style = getPlanetLightingStyle(orbiting);
    closeTo(style.lightDirection.x * orbiting.x + style.lightDirection.y * orbiting.y,
      -Math.hypot(orbiting.x, orbiting.y));
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

test('moon orbit translation follows its moving parent planet rather than the system star', () => {
  const planet = {
    orbitRadius: 12,
    radius: 2,
    phase: 0.2,
    speed: 0.4,
    inclination: 0.35,
    tilt: -0.1,
    color: '#fff',
    atmosphere: 'ice',
    surfaceSeed: 1,
    moons: [],
    hasRing: false,
  };
  const moon = { radius: 0.5, orbitRadius: 4.2, phase: 0.7, speed: 1.1 };
  const parentAtStart = getOrbitingPlanet(planet, 0);
  const parentLater = getOrbitingPlanet(planet, 2.5);
  const moonAtStart = getOrbitingMoon(parentAtStart, moon, 0);
  const moonLater = getOrbitingMoon(parentLater, moon, 2.5);
  const localAtStart = getOrbitingMoon({ x: 0, y: 0 }, moon, 0);
  const localLater = getOrbitingMoon({ x: 0, y: 0 }, moon, 2.5);

  closeTo((moonLater.x - moonAtStart.x) - (localLater.x - localAtStart.x),
    parentLater.x - parentAtStart.x);
  closeTo((moonLater.y - moonAtStart.y) - (localLater.y - localAtStart.y),
    parentLater.y - parentAtStart.y);

  const translatedParent = { ...parentLater, x: parentLater.x + 83, y: parentLater.y - 29 };
  const translatedMoon = getOrbitingMoon(translatedParent, moon, 2.5);
  closeTo(translatedMoon.x - moonLater.x, 83);
  closeTo(translatedMoon.y - moonLater.y, -29);
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

test('orbital phase and deterministic surface detail freeze throughout constellation windows', () => {
  const planets = createPlanetSystem(2468, 2);
  const beforeFreeze = getOrbitingPlanets(planets, getSimulationTime(600));
  for (const wallTime of [610, 620, 629.999, 630]) {
    assert.deepEqual(getOrbitingPlanets(planets, getSimulationTime(wallTime)), beforeFreeze);
  }
  const frozenMoon = { radius: 0.5, orbitRadius: 4, phase: 0.3, speed: 1.2 };
  const frozenMoonPosition = getOrbitingMoon(
    getOrbitingPlanet(planets[0], getSimulationTime(600)),
    frozenMoon,
    getSimulationTime(600),
  );
  for (const wallTime of [610, 620, 629.999, 630]) {
    assert.deepEqual(getOrbitingMoon(
      getOrbitingPlanet(planets[0], getSimulationTime(wallTime)),
      frozenMoon,
      getSimulationTime(wallTime),
    ), frozenMoonPosition);
  }

  const afterFreeze = getOrbitingPlanets(planets, getSimulationTime(631));
  assert.ok(afterFreeze.some((planet) => {
    const frozen = beforeFreeze.find((candidate) => candidate.phase === planet.phase);
    return frozen && Math.hypot(planet.x - frozen.x, planet.y - frozen.y) > 0.01;
  }));
  assert.ok(beforeFreeze.every((planet, index) => index === 0 || beforeFreeze[index - 1].z <= planet.z));

  const traveler = createSpaceScene(42).travelers[0];
  assert.equal(travelerCountForWidth(390), MOBILE_TRAVELER_COUNT);
  assert.equal(travelerCountForWidth(1200), 51);
  for (let elapsed = 0; elapsed < 1000; elapsed += 0.37) {
    const { depth } = getTravelerDepth(traveler, elapsed);
    assert.ok(depth >= NEAR_DEPTH && depth <= FAR_DEPTH);
  }
});
