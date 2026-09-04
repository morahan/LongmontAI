import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
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
  MAX_STAR_TEXT_ANCHOR_COUNT,
  MAX_PLANET_ORBIT_PERIOD_SECONDS,
  MAX_PLANET_ORBIT_RADIUS,
  MIN_GLYPH_STAR_COUNT,
  MIN_PLANET_ORBIT_PERIOD_SECONDS,
  MOBILE_TRAVELER_COUNT,
  NEAR_DEPTH,
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
  STAR_TEXT_BURST_SECONDS,
  STAR_TEXT_FIRST_GLYPH_SECONDS,
  SYSTEM_STAR_RADIUS,
  LARGE_TRAVELER_RED_CHANCE,
  SMALL_TRAVELER_RED_CHANCE,
  TRAVELER_DETAIL_THRESHOLDS,
  TRAVELER_GLOW_BLUR_RANGE,
  TRAVELER_GLOW_OPACITY_RANGE,
  TRAVELER_PALETTE,
  TRAVELER_RADIUS_RANGE,
  TRAVELER_SURFACE_TEXTURES,
  TWINKLE_WINDOW_SECONDS,
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
  createPlanetSystem,
  createSeededRandom,
  createSpaceScene,
  createStarTextBurstOrigins,
  doesSystemExitViewportBeforeCycle,
  getConstellationPhase,
  getConstellationGlyphAnchorCounts,
  getConstellationPhraseForBucket,
  getConstellationStrength,
  getCometAppearance,
  getDriftedStar,
  getDriftedStarVelocity,
  getGalaxyAnimationState,
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
  remapAmbientStarsToFirstGlyphSlots,
  scaleConstellationGeometry,
  selectConstellationPhrase,
  selectEasterEggPhrase,
  selectProminentSystem,
  selectProminentSystemOwner,
  shouldTriggerEasterEgg,
  starCountForWidth,
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

test('ambient remains 70 while variable Star Text retains 35 ambient stars', () => {
  const stars = createAmbientLayout(12345, 0);
  assert.equal(AMBIENT_STAR_COUNT, 70);
  assert.equal(RETAINED_AMBIENT_STAR_COUNT, 35);
  assert.equal(stars.length, AMBIENT_STAR_COUNT);
  assert.equal(starCountForWidth(320), 70);
  assert.equal(starCountForWidth(1920), 70);
  assert.equal(getStarFieldStyles(12345, 47).filter(isStarRenderable).length, 70);

  const anchorCount = createConstellationGeometry(1200, 600, 12345, 1).points.length;
  const hold = getStarFieldStyles(12345, 610);
  assert.equal(hold.length, STAR_FIELD_SLOT_COUNT);
  const holdBackground = hold.slice(MAX_STAR_TEXT_ANCHOR_COUNT);
  assert.ok(holdBackground.filter(isStarRenderable).length <= RETAINED_AMBIENT_STAR_COUNT);
  assert.ok(holdBackground.some(isStarRenderable));
  assert.ok(holdBackground.every(({ strength }) => strength === 0));
  assert.equal(stars.filter((star) => star.driftMode === 'wrap').length, 35);
  assert.equal(stars.filter((star) => star.driftMode === 'bounce').length, 35);
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

test('production ambient slots transfer into Easter first-glyph slots without hidden starts or duplicates', () => {
  const seed = 0x51a7;
  const elapsed = 180;
  const width = 1200;
  const height = 600;
  const positions = getStarFieldPositions(seed, elapsed, width, height);
  const styles = getStarFieldStyles(seed, elapsed);
  const geometry = createConstellationGeometryForPhrase(width, height, 'Attention', seed, 1);
  const firstGlyphCount = geometry.glyphs[0].indices.length;
  const remapped = remapAmbientStarsToFirstGlyphSlots(
    positions, styles, firstGlyphCount,
  );
  assert.equal(remapped.sourceIndices.length, AMBIENT_STAR_COUNT);
  assert.ok(remapped.sourceIndices.every((index) => index >= MAX_STAR_TEXT_ANCHOR_COUNT));

  const transferredCount = Math.min(firstGlyphCount, AMBIENT_STAR_COUNT);
  for (let index = 0; index < transferredCount; index += 1) {
    const sourceIndex = remapped.sourceIndices[index];
    assert.deepEqual(remapped.positions[index], positions[sourceIndex]);
    assert.deepEqual(remapped.styles[index], styles[sourceIndex]);
    assert.equal(remapped.styles[sourceIndex].opacity, 0);
  }
  assert.ok(remapped.styles.slice(transferredCount, firstGlyphCount)
    .every(({ opacity }) => opacity === 0));

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

  const targetPositions = positions.map((point, index) =>
    ({ ...(geometry.points[index] ?? point) }));
  const targetStyles = styles.map((style, index) => index < geometry.points.length
    ? createEasterEggTargetStyles(seed, 0, geometry.points.length)[index]
    : style);
  const options = { firstGlyphCount, targetCount: geometry.points.length };
  const firstStage = getEasterEggStarFieldPositions(
    remapped.positions, targetPositions, positions, 2, [], undefined, options,
  );
  const firstStageStyles = getEasterEggStarFieldStyles(
    remapped.styles, targetStyles, styles, 2, options,
  );
  assert.ok(firstStageStyles.slice(0, firstGlyphCount).every(isStarRenderable));
  assert.ok(firstStageStyles.slice(firstGlyphCount, geometry.points.length)
    .every(({ opacity }) => opacity === 0));
  assert.ok(firstStage.slice(0, firstGlyphCount).some((point, index) =>
    Math.hypot(point.x - remapped.positions[index].x,
      point.y - remapped.positions[index].y) > 1));
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

test('Easter-egg lifecycle has explicit first-glyph/burst timing inside exact 10s in, hold, and fade', () => {
  assert.equal(STAR_TEXT_FIRST_GLYPH_SECONDS, 4);
  assert.equal(STAR_TEXT_BURST_SECONDS, 6);
  assert.deepEqual(getStarTextIntroProgress(0), { stage: 'first-glyph', firstGlyph: 0, burst: 0 });
  assert.equal(getStarTextIntroProgress(3.999).stage, 'first-glyph');
  assert.deepEqual(getStarTextIntroProgress(4), { stage: 'burst', firstGlyph: 1, burst: 0 });
  closeTo(getStarTextIntroProgress(7).burst, 0.5);
  assert.deepEqual(getStarTextIntroProgress(10), { stage: 'complete', firstGlyph: 1, burst: 1 });
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
  assert.equal(nextPhrase.edges.length, nextPhrase.points.length - nextPhrase.glyphs.length);
  assert.deepEqual(
    getEasterEggStarFieldPositions(renderedAtRestart, nextPhrase.points, end, 0),
    renderedAtRestart,
  );
  assert.deepEqual(
    getEasterEggStarFieldStyles(renderedStylesAtRestart, targetStyles, endStyles, 0),
    renderedStylesAtRestart,
  );
});

test('Easter choreography shares first-glyph origins, exact burst geometry, and fade-only outro', () => {
  const geometry = createConstellationGeometryForPhrase(1200, 600, 'Attention', 0x51a7, 2);
  const targetCount = geometry.points.length;
  const firstGlyphCount = geometry.glyphs[0].indices.length;
  const total = targetCount + 5;
  const start = Array.from({ length: total }, (_, index) => ({ x: index * 1.7, y: index * 0.9 }));
  const end = Array.from({ length: total }, (_, index) => ({ x: 1000 - index, y: 500 - index }));
  const targets = [...geometry.points, ...start.slice(targetCount)];
  const style = (opacity) => ({ alpha: opacity, twinkle: 1, strength: opacity,
    radius: 1.2, opacity });
  const startStyles = Array.from({ length: total }, () => style(0.5));
  const targetStyles = [
    ...Array.from({ length: targetCount }, () => style(1)),
    ...Array.from({ length: total - targetCount }, () => style(0.5)),
  ];
  const endStyles = Array.from({ length: total }, (_, index) => index < targetCount
    ? { alpha: 0, twinkle: 0.25, strength: 0, radius: 0.37, opacity: 0 }
    : style(0.7));
  const options = { firstGlyphCount, targetCount,
    endpointVisible: endStyles.map(isStarRenderable) };

  const firstStage = getEasterEggStarFieldPositions(start, targets, end, 3, [], undefined, options);
  assert.ok(firstStage.slice(firstGlyphCount, targetCount)
    .every((point, index) => point === start[firstGlyphCount + index]));
  const burstStart = getEasterEggStarFieldPositions(start, targets, end, 4, [], undefined, options);
  const origins = createStarTextBurstOrigins(targets, firstGlyphCount, targetCount);
  assert.deepEqual(burstStart.slice(firstGlyphCount, targetCount), origins.slice(firstGlyphCount));
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
      const remapped = remapAmbientStarsToFirstGlyphSlots(
        rawStartPositions, rawStartStyles, geometry.glyphs[0].indices.length,
      );
      startPositions = remapped.positions;
      startStyles = remapped.styles;
      remapped.sourceIndices.slice(0, geometry.glyphs[0].indices.length)
        .forEach((index) => { targetStyles[index] = { ...startStyles[index] }; });
    }
    const endpoint = triggerElapsed + CONSTELLATION_WINDOW_SECONDS;
    const endPositions = getStarFieldPositions(seed, endpoint, width, height);
    const endStyles = getStarFieldStyles(seed, endpoint);
    const options = {
      firstGlyphCount: geometry.glyphs[0].indices.length,
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
      assert.equal(edges.length, points.length - glyphs.length,
        'lines must connect inside glyphs without bridging future letters');
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
        const reached = new Set([glyph.indices[0]]);
        const queue = [glyph.indices[0]];
        while (queue.length > 0) {
          neighbors[queue.shift()].forEach((neighbor) => {
            if (!reached.has(neighbor)) { reached.add(neighbor); queue.push(neighbor); }
          });
        }
        assert.equal(reached.size, glyph.indices.length, `${phrase}/${glyph.character} disconnected`);

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
  const firstGlyphCount = geometry.glyphs[0].indices.length;
  assert.ok(morphStart.slice(0, firstGlyphCount).every(({ opacity }) => opacity > 0));
  assert.ok(morphStart.slice(firstGlyphCount, anchorCount).every(({ opacity }) => opacity === 0));
  const firstComplete = getStarFieldStyles(seed, 604);
  assert.ok(firstComplete.slice(0, firstGlyphCount).every(({ strength }) => strength === 1));
  assert.ok(firstComplete.slice(firstGlyphCount, anchorCount).every(({ opacity }) => opacity === 0));
  assert.ok(morphMiddle.slice(firstGlyphCount, anchorCount).every(({ opacity }) => opacity > 0));
  assert.ok(hold.slice(0, anchorCount).every(({ strength }) => strength === 1));
  assert.ok(outStart.slice(0, anchorCount).every((style, index) =>
    style.opacity >= outMiddle[index].opacity));
  assert.ok(outMiddle.slice(0, anchorCount).every(({ opacity }) => opacity > 0));
  assert.ok(after.slice(0, MAX_STAR_TEXT_ANCHOR_COUNT).every(({ opacity }) => opacity === 0));

  const heldAmbient = hold.slice(MAX_STAR_TEXT_ANCHOR_COUNT);
  assert.ok(heldAmbient.filter(isStarRenderable).length <= RETAINED_AMBIENT_STAR_COUNT);
  assert.ok(heldAmbient.filter(isStarRenderable).length > 0);
  assert.ok(heldAmbient.every(({ strength }) => strength === 0));
  assert.ok(RETAINED_AMBIENT_STAR_COUNT < anchorCount / 2,
    'background density overwhelms the letter allocation');

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
  const firstCount = geometry.glyphs[0].indices.length;
  const origins = createStarTextBurstOrigins(targets, firstCount);
  const burstStart = getStarFieldPositions(seed, 604, width, height);
  burstStart.slice(firstCount, targets.length).forEach((point, offset) =>
    assert.deepEqual(point, origins[firstCount + offset]));
  const burstMiddle = getStarFieldPositions(seed, 607, width, height);
  assert.ok(burstMiddle.slice(firstCount, targets.length).some((point, offset) =>
    Math.hypot(point.x - origins[firstCount + offset].x,
      point.y - origins[firstCount + offset].y) > 1));
  const holdPositions = getStarFieldPositions(seed, 610, width, height);
  const lateHoldPositions = getStarFieldPositions(seed, 619.9, width, height);
  for (let index = 0; index < targets.length; index += 1) {
    assert.deepEqual(holdPositions[index], targets[index]);
    assert.deepEqual(lateHoldPositions[index], targets[index]);
  }
  const morphStart = getStarFieldPositions(seed, 600, width, height);
  const beforeMorph = getStarFieldPositions(seed, 599.999999, width, height);
  const afterMorph = getStarFieldPositions(seed, 630, width, height);
  const firstGlyphCount = createConstellationGeometry(width, height, seed, 1)
    .glyphs[0].indices.length;
  for (let index = 0; index < firstGlyphCount; index += 1) {
    assert.ok(Math.hypot(
      morphStart[index].x - beforeMorph[MAX_STAR_TEXT_ANCHOR_COUNT + index].x,
      morphStart[index].y - beforeMorph[MAX_STAR_TEXT_ANCHOR_COUNT + index].y,
    ) < 0.001);
  }
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

test('ordinary wrap and bounce behavior resumes exactly after 7,000 fade boundaries', () => {
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
  assert.equal(checked, 7000);
  assert.equal(wraps, 3500);
  assert.equal(bounces, 3500);
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
  assert.equal(samples[5].flareLength, 0);
  assert.ok(samples[6].flareLength > samples[6].radius * 2);

  const projected = projectTraveler(traveler, 0, 1000, 600);
  closeTo(projected.radius, getTravelerAppearance(traveler, projected.progress).radius);
});

test('galaxy creation uses the exact 10% half-open threshold', () => {
  assert.equal(GALAXY_CREATION_CHANCE, 0.1);
  assert.equal(isGalaxyCreationRoll(0), true);
  assert.equal(isGalaxyCreationRoll(0.099999999), true);
  assert.equal(isGalaxyCreationRoll(0.1), false);
  assert.equal(isGalaxyCreationRoll(0.999999999), false);
  assert.equal(isGalaxyCreationRoll(-0.000001), false);

  const outcomes = Array.from({ length: 10000 }, (_, index) =>
    isGalaxyCreationRoll(index / 10000));
  assert.equal(outcomes.filter(Boolean).length, 1000);

  const scene = createSpaceScene(0x51a7c0de);
  assert.ok(scene.travelers.every(({ isGalaxy }) => typeof isGalaxy === 'boolean'));
  assert.deepEqual(scene, createSpaceScene(0x51a7c0de));
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
  assert.equal(LARGE_TRAVELER_RED_CHANCE, 0.7);
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
    [TRAVELER_RADIUS_RANGE[0], SMALL_TRAVELER_RED_CHANCE, 0x51a70001],
    [TRAVELER_RADIUS_RANGE[1], LARGE_TRAVELER_RED_CHANCE, 0x51a70002],
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
  assert.equal(GALAXY_INTERNAL_STAR_COUNT, 72);
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
    ['spiral', 'barred-spiral', 'elliptical', 'irregular']);
  assert.deepEqual(GALAXY_ROTATION_RATE_RANGE, [0.09, 0.15]);
  assert.deepEqual(GALAXY_FORMATION_RATE_MULTIPLIERS, {
    spiral: 1,
    'barred-spiral': 0.92,
    elliptical: 0.78,
    irregular: 1.12,
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

test('every galaxy formation turns meaningfully in five seconds with visible differential matter motion', () => {
  const seedByFormation = new Map();
  const directionsByFormation = new Map(GALAXY_FORMATIONS.map((formation) => [formation, new Set()]));
  for (let seed = 0; seed < 4096; seed += 1) {
    const formation = getGalaxyFormation(seed, 0);
    if (!seedByFormation.has(formation)) seedByFormation.set(formation, seed);
    directionsByFormation.get(formation).add(Math.sign(getGalaxyRotationRate(seed, 0)));
  }

  for (const formation of GALAXY_FORMATIONS) {
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
      assert.ok(atZero.opacity > 0 && atZero.opacity <= 1);
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

test('one equiprobable basis-point roll reserves disjoint exact 3% UFO and comet bands', () => {
  assert.equal(UFO_BASIS_POINTS, 300);
  assert.equal(COMET_BASIS_POINTS, 300);
  const variants = Array.from({ length: 10000 }, (_, basisPoint) =>
    getTravelerVariantForBasisPoint(basisPoint));
  assert.equal(variants.filter((variant) => variant === 'ufo').length, 300);
  assert.equal(variants.filter((variant) => variant === 'comet').length, 300);
  assert.equal(variants.filter((variant) => variant === 'star').length, 9400);
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

test('comet trails have deterministic distinct particles inside bounded motion-opposed geometry', () => {
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

test('moving star radii and traveler counts rise exactly 10% from their reviewed baselines', () => {
  const scene = createSpaceScene(9876);
  assert.equal(AMBIENT_STAR_COUNT, 70);
  assert.deepEqual(TRAVELER_RADIUS_RANGE, [0.66, 1.21]);
  assert.ok(scene.travelers.every((traveler) =>
    traveler.size >= TRAVELER_RADIUS_RANGE[0] && traveler.size <= TRAVELER_RADIUS_RANGE[1]));
  assert.equal(DESKTOP_TRAVELER_COUNT, Math.round(22 * 1.1));
  assert.equal(MOBILE_TRAVELER_COUNT, Math.round(14 * 1.1));
  assert.equal(scene.travelers.length, 24);
  assert.equal(scene.travelers.slice(0, MOBILE_TRAVELER_COUNT).length, 15);
  assert.equal(travelerCountForWidth(639), 15);
  assert.equal(travelerCountForWidth(640), 24);
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
  assert.deepEqual(NEURAL_SIGNAL_DURATION_RANGE, [2.4, 3.2]);
  assert.equal(NEURAL_SIGNAL_MAX_CONCURRENT, 1);
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
  assert.deepEqual(carrierIndices, [2, 8, 14, 20]);
  const mobileTravelers = scene.travelers.slice(0, MOBILE_TRAVELER_COUNT);
  assert.deepEqual(mobileTravelers.map((traveler, index) =>
    isSystemCarrier(traveler, index) ? index : -1).filter((index) => index >= 0), [2, 8, 14]);

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
  ), 14);
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

test('planet bodies remain half-sized while prominent system stars are exactly 10% larger', () => {
  assert.deepEqual(PLANET_RADIUS_RANGE, [1.45, 2.3]);
  assert.equal(PLANET_RENDER_SCALE, 0.5);
  assert.equal(SYSTEM_STAR_RADIUS, 11.55);
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
  const appearance = getTravelerAppearance(traveler, projection.progress);
  const expected = Math.max(
    getPlanetSystemExtent(createPlanetSystem(traveler.seed, 0)) * getSystemScale(projection),
    SYSTEM_STAR_RADIUS * getSystemScale(projection),
    appearance.haloRadius,
    appearance.flareLength,
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
  assert.equal(travelerCountForWidth(1200), DESKTOP_TRAVELER_COUNT);
  for (let elapsed = 0; elapsed < 1000; elapsed += 0.37) {
    const { depth } = getTravelerDepth(traveler, elapsed);
    assert.ok(depth >= NEAR_DEPTH && depth <= FAR_DEPTH);
  }
});
