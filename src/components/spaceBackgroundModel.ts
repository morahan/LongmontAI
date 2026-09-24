// Maximum pool; all responsive tiers share deterministic prefixes.
export const AMBIENT_STAR_COUNT = 1120;
// Kept as the historical density reference for consumers that use the exported constant.
// Actual Star Text anchor totals are phrase/event dependent.
export const CONSTELLATION_STAR_COUNT = 144;
export const MIN_GLYPH_STAR_COUNT = 37;
export const MAX_GLYPH_STAR_COUNT = 73;
export const RETAINED_AMBIENT_STAR_COUNT = 560;
export const DESKTOP_STAR_COUNT = AMBIENT_STAR_COUNT;
export const MOBILE_STAR_COUNT = 112;
export const AMBIENT_STAR_RGB = [232, 224, 220] as const;
export const AMBIENT_STAR_PALETTE = [
    { name: 'blue', rgb: [174, 207, 255] },
    { name: 'white', rgb: [240, 242, 255] },
    { name: 'yellow', rgb: [255, 235, 174] },
    { name: 'red', rgb: [255, 157, 164] },
    { name: 'orange', rgb: [255, 193, 143] },
] as const;
export const CONSTELLATION_STAR_RGB = [214, 231, 239] as const;
export const AMBIENT_STAR_RADIUS_RANGE = [0.825, 2.09] as const;
export const DESKTOP_TRAVELER_COUNT = 170;
export const MOBILE_TRAVELER_COUNT = 17;
export const TRAVELER_RADIUS_RANGE = [0.66, 1.21] as const;
export const GALAXY_CREATION_CHANCE = 0.16;
export const GALAXY_MAX_RADIUS_MULTIPLIER = 7;
export const GALAXY_INTERNAL_STAR_COUNT = 144;
export const GALAXY_DISTANT_STAR_COUNT = 18;
/** Independent 8% rolls among galaxy lifecycles, never additional travelers. */
export const GALAXY_DIRECT_APPROACH_CHANCE = 0.08;
export const GALAXY_SOMBRERO_CHANCE = 0.08;
export const GALAXY_EMBEDDED_SYSTEM_COUNT_RANGE = [2, 3] as const;
export const GALAXY_EMBEDDED_PLANET_COUNT_RANGE = [1, 2] as const;
/** Historical/default spiral arm count; individual formations deliberately vary this. */
export const GALAXY_SPIRAL_ARM_COUNT = 3;
export const GALAXY_FORMATIONS = [
    'spiral',
    'barred-spiral',
    'elliptical',
    'irregular',
    'sombrero',
] as const;
export const GALAXY_ROTATION_RATE_RANGE = [0.09, 0.15] as const;
export const GALAXY_FORMATION_RATE_MULTIPLIERS: Record<GalaxyFormation, number> = {
    spiral: 1,
    'barred-spiral': 0.92,
    elliptical: 0.78,
    irregular: 1.12,
    sombrero: 0,
};
export const UFO_BASIS_POINTS = 50;
export const COMET_BASIS_POINTS = 50;
export const UFO_SIZE_MULTIPLIER = 1.5;
export const MOBILE_BREAKPOINT = 640;
export const LARGE_BREAKPOINT = 1440;
export const SYSTEM_HOST_RADIUS_MULTIPLIER = 2;
export const NEURAL_SIGNAL_SLOT_SECONDS = 24;
export const NEURAL_SIGNAL_DURATION_RANGE = [4.2, 5] as const;
export const NEURAL_SIGNAL_FADE_SECONDS = [1.3, 1.9] as const;
export const NEURAL_SIGNAL_COLORS = ['155, 213, 239', '183, 188, 239', '151, 185, 236'] as const;
export const NEURAL_SIGNAL_MAX_CONCURRENT = 1;
export const NEURAL_SIGNAL_DESKTOP_CHANCE = 0.48;
export const NEURAL_SIGNAL_MOBILE_CHANCE = 0.30;
export const NEURAL_SIGNAL_MAX_OPACITY = 0.075;
export const NEURAL_SIGNAL_WIDTH_RANGE = [0.5, 0.72] as const;
export const NEURAL_CONTAGION_OPPORTUNITIES = 3;
export const NEURAL_CONTAGION_AFFINITY_BOOST = 4;
export const NEURAL_CONTAGION_MAX_ENTRIES = 8;
export const CONSTELLATION_INTERVAL_SECONDS = 600;
export const MORPH_SECONDS = 10;
export const HOLD_SECONDS = 10;
export const CONSTELLATION_WINDOW_SECONDS = MORPH_SECONDS * 2 + HOLD_SECONDS;
/** @deprecated Historical event window; ambient twinkle now uses independent continuous periods. */
export const TWINKLE_WINDOW_SECONDS = 120;
export const FAR_DEPTH = 1000;
export const NEAR_DEPTH = 56;
export const SYSTEM_MIN_PROGRESS = 0.34;
export const SYSTEM_MAX_PROGRESS = 0.84;
export const TRAVELER_DETAIL_THRESHOLDS = [0.28, 0.5, 0.68] as const;
export const TRAVELER_PALETTE = [
    { name: 'red', color: '#e15b64' },
    { name: 'yellow', color: '#f3cf70' },
    { name: 'orange', color: '#ee9558' },
    { name: 'white', color: '#f2f4f5' },
    { name: 'blue', color: '#70b7df' },
] as const;
export const TRAVELER_SURFACE_TEXTURES = ['bands', 'speckles', 'facets', 'swirls', 'mottled'] as const;
export const SMALL_TRAVELER_RED_CHANCE = 0.06;
export const LARGE_TRAVELER_RED_CHANCE = 0.35;
export const TRAVELER_GLOW_BLUR_RANGE = [1.5, 12] as const;
export const TRAVELER_GLOW_OPACITY_RANGE = [0.06, 0.22] as const;
export const PLANET_SURFACE_LOD_DIAMETERS = [5, 10] as const;
export const ATMOSPHERE_HALO_RADIUS_MULTIPLIER = 1.18;
export const PLANET_RING_LINE_WIDTH = 0.8;
export const PLANET_RADIUS_RANGE = [1.45, 2.3] as const;
export const PLANET_RENDER_SCALE = 0.5;
export const MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO = 0.5;
export const SYSTEM_STAR_RADIUS = 11.55;
export const MAX_PLANET_ORBIT_RADIUS = 22.35;
export const MIN_PLANET_ORBIT_PERIOD_SECONDS = 8;
export const MAX_PLANET_ORBIT_PERIOD_SECONDS = 18;
export const PLANET_COUNT_BASIS_POINTS = [4000, 2200, 1300, 850, 550, 380, 260, 180, 120, 80, 50, 30] as const;

const UINT32_RANGE = 4294967296;
const DEPTH_RANGE = FAR_DEPTH - NEAR_DEPTH;
const TAU = Math.PI * 2;
export const PLANET_ATMOSPHERE_CLASSES = [
    'gas-banded',
    'ocean-haze',
    'rocky-cratered',
    'ice',
    'volcanic',
] as const;

const PLANET_COLORS: Record<PlanetAtmosphereClass, readonly string[]> = {
    'gas-banded': ['#c99562', '#d5b477', '#ad7f67'],
    'ocean-haze': ['#4c9ec4', '#63b7ad', '#397ea6'],
    'rocky-cratered': ['#9b7662', '#b08a68', '#796b66'],
    ice: ['#b9dce5', '#d4e8e9', '#91bccc'],
    volcanic: ['#653c38', '#7d4536', '#53343b'],
};

export type RandomSource = () => number;
export type ConstellationPhaseName = 'ambient' | 'morph-in' | 'hold' | 'morph-out';
export type EasterEggState = ConstellationPhaseName;
export interface EasterEggClickSequence {
    count: number;
    x: number;
    y: number;
    timestamp: number;
}
export type DriftMode = 'wrap' | 'bounce';
export type PlanetAtmosphereClass = typeof PLANET_ATMOSPHERE_CLASSES[number];
export type TravelerColorName = typeof TRAVELER_PALETTE[number]['name'];
export type TravelerSurfaceTexture = typeof TRAVELER_SURFACE_TEXTURES[number];

export interface Point { x: number; y: number }
export interface ConstellationEdge { from: number; to: number }
export interface ConstellationGlyph { character: string; indices: number[] }
export interface ConstellationGeometry {
    phrase: ConstellationPhrase;
    points: Point[];
    edges: ConstellationEdge[];
    glyphs: ConstellationGlyph[];
}

export interface StarAura {
    radiusMultiplier: number;
    opacity: number;
    softness: number;
    rgb: readonly [number, number, number];
}

export interface StarVisualStyle {
    alpha: number;
    twinkle: number;
    strength: number;
    radius: number;
    opacity: number;
    cardinalFlare?: number;
    coreOpacity?: number;
    aura?: StarAura;
}

export interface PlanetLightingStyle {
    /** Unit vector across the projected disc toward the system star. */
    lightDirection: Point;
    /** Apparent day-side fraction: 0 at inferior conjunction, 0.5 side-on, 1 behind the star. */
    illuminatedFraction: number;
    /** Normalized dark-to-light gradient endpoints relative to the planet center. */
    shadowStart: Point;
    shadowEnd: Point;
    /** Canvas gradient stops bracketing the soft terminator. */
    terminatorStart: number;
    terminatorEnd: number;
    /** Normalized center for the day-side radial highlight. */
    highlightCenter: Point;
}

export interface DistantStar {
    x: number;
    y: number;
    size: number;
    alpha: number;
    driftMode: DriftMode;
    driftSpeed: number;
    driftAngle: number;
    twinkleSeed: number;
    hasCardinalFlare: boolean;
}

export interface Moon {
    radius: number;
    orbitRadius: number;
    phase: number;
    speed: number;
}

export interface Planet {
    orbitRadius: number;
    radius: number;
    phase: number;
    speed: number;
    inclination: number;
    tilt: number;
    color: string;
    atmosphere: PlanetAtmosphereClass;
    surfaceSeed: number;
    moons: Moon[];
    hasRing: boolean;
}

export interface OrbitingPlanet extends Planet {
    x: number;
    y: number;
    z: number;
    angle: number;
}

export interface OrbitingMoon extends Moon {
    x: number;
    y: number;
    angle: number;
}

export interface Traveler {
    seed: number;
    initialDistance: number;
    speed: number;
    size: number;
    alpha: number;
    isGalaxy?: boolean;
}

export interface SpaceScene {
    seed: number;
    stars: DistantStar[];
    travelers: Traveler[];
}

export type PlanetSurfaceDetailLevel = 0 | 1 | 2;

export interface TravelerAppearance {
    radius: number;
    detailLevel: 0 | 1 | 2 | 3;
    haloRadius: number;
    coreRadius: number;
    flareLength: number;
    colorName: TravelerColorName;
    color: string;
    texture: TravelerSurfaceTexture;
    surfaceSeed: number;
    glowBlur: number;
    glowOpacity: number;
}

export interface TravelerStarRenderPolicy {
    renderDisc: boolean;
    renderHalo: boolean;
    renderShadowGlow: boolean;
    renderFlare: boolean;
}

export interface UfoAppearance {
    radius: number;
    glowRadius: number;
    streakLength: number;
}

export type TravelerVariant = 'star' | 'ufo' | 'comet' | 'galaxy';
export type GalaxyFormation = typeof GALAXY_FORMATIONS[number];
export type GalaxyMatterKind = 'star' | 'young-star' | 'dust';
export type CometTrailParticleKind = 'asteroid' | 'stardust';

export interface CometTrailParticle {
    kind: CometTrailParticleKind;
    distance: number;
    lateralOffset: number;
    radius: number;
    opacity: number;
    rotation: number;
}

export interface CometAppearance {
    headRadius: number;
    glowRadius: number;
    trailLength: number;
    trailWidth: number;
    particles: CometTrailParticle[];
}

export interface GalaxyAppearance {
    formation: GalaxyFormation;
    outerRadius: number;
    coreRadius: number;
    armCount: number;
    flattening: number;
    barLength: number;
    rotationRate: number;
    internalStarCount: number;
}

export interface EmbeddedGalaxyPlanet {
    orbitRadius: number;
    radius: number;
    phase: number;
    speed: number;
    color: string;
}

export interface EmbeddedGalaxySystem {
    orbitRadius: number;
    phase: number;
    speed: number;
    hostRadius: number;
    hostColor: string;
    planets: EmbeddedGalaxyPlanet[];
}

export interface EmbeddedGalaxyPlanetState extends EmbeddedGalaxyPlanet, Point {
    angle: number;
    z: number;
}

export interface EmbeddedGalaxySystemState {
    host: Point;
    planets: EmbeddedGalaxyPlanetState[];
}

export interface GalaxyAnimationState {
    rotation: number;
    corePulse: number;
    dustDrift: number;
}

export interface GalaxyParticleState extends Point {
    radius: number;
    opacity: number;
    kind: GalaxyMatterKind;
}

export interface ProjectedTraveler {
    x: number;
    y: number;
    depth: number;
    progress: number;
    radius: number;
    opacity: number;
    cycle: number;
}

export interface ProminentSystemOwner {
    travelerIndex: number;
    cycle: number;
}

export interface NeuralSignal {
    fromTravelerIndex: number;
    toTravelerIndex: number;
    opacity: number;
    pulseProgress: number;
    lineWidth: number;
    bend: number;
    color: string;
    sparkles: { progress: number; opacity: number; radius: number }[];
}

export interface NeuralContagionEntry {
    travelerIndex: number;
    cycle: number;
    remainingOpportunities: number;
    lastStruckSlot: number;
}

export interface NeuralContagionState {
    entries: NeuralContagionEntry[];
    lastSignalSlot: number | null;
    lastSignalPair: readonly [number, number] | null;
    lastSignalCycles: readonly [number, number] | null;
}

export interface NeuralSignalPair {
    fromTravelerIndex: number;
    toTravelerIndex: number;
}

export interface ConstellationPhase {
    name: ConstellationPhaseName;
    event: number;
    progress: number;
    eventElapsed: number;
}

export interface StarTextIntroProgress {
    stage: 'morph-in' | 'complete';
    progress: number;
}

export interface StarTextTransitionOptions {
    targetCount: number;
    /** End-frame visibility decides whether a slot fades in place or converges to live content. */
    endpointVisible?: readonly boolean[];
}

type GlyphPoint = Point;

export const createSeededRandom = (seed: number): RandomSource => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
    };
};

const between = (random: RandomSource, minimum: number, maximum: number) =>
    minimum + random() * (maximum - minimum);

const hashUint = (seed: number, cycle: number, channel: number) => {
    let value = (seed ^ Math.imul(cycle + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    return (value ^ (value >>> 15)) >>> 0;
};

const hashRandom = (seed: number, cycle: number, channel: number) =>
    hashUint(seed, cycle, channel) / UINT32_RANGE;

const TRAVELER_VARIANT_BASIS_POINT_RANGE = 10000;

/** One shared equiprobable roll makes the two 0.5% visitor bands disjoint by construction. */
export const getTravelerVariantForBasisPoint = (basisPoint: number): TravelerVariant => {
    const outcome = positiveModulo(Math.trunc(basisPoint), TRAVELER_VARIANT_BASIS_POINT_RANGE);
    if (outcome < UFO_BASIS_POINTS) return 'ufo';
    if (outcome < UFO_BASIS_POINTS + COMET_BASIS_POINTS) return 'comet';
    return 'star';
};

/** Exactly 50 of 10,000 equiprobable outcomes classify as spacecraft. */
export const isUfoBasisPoint = (basisPoint: number) =>
    getTravelerVariantForBasisPoint(basisPoint) === 'ufo';

/** Exactly 50 different outcomes classify as comets. */
export const isCometBasisPoint = (basisPoint: number) =>
    getTravelerVariantForBasisPoint(basisPoint) === 'comet';

/** Variant identity is stable within one depth lifecycle and intentionally reseeded next cycle. */
export const getTravelerVariant = (
    traveler: Pick<Traveler, 'seed' | 'isGalaxy'>,
    cycle: number,
): TravelerVariant => {
    if (traveler.isGalaxy) return 'galaxy';
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const acceptedRange = UINT32_RANGE - (UINT32_RANGE % TRAVELER_VARIANT_BASIS_POINT_RANGE);
    let channel = 307;
    let roll = hashUint(traveler.seed, stableCycle, channel);
    while (roll >= acceptedRange) {
        channel += 1;
        roll = hashUint(traveler.seed, stableCycle, channel);
    }
    return getTravelerVariantForBasisPoint(roll % TRAVELER_VARIANT_BASIS_POINT_RANGE);
};

export const isUfoTraveler = (traveler: Pick<Traveler, 'seed' | 'isGalaxy'>, cycle: number) =>
    getTravelerVariant(traveler, cycle) === 'ufo';

export const isCometTraveler = (traveler: Pick<Traveler, 'seed' | 'isGalaxy'>, cycle: number) =>
    getTravelerVariant(traveler, cycle) === 'comet';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Exponential speed gain along the ray from the vanishing point to the viewport edge.
 * Radius is measured against the first rectangular perimeter intersection, so every edge is 2x
 * on non-square screens while points beyond the viewport remain capped.
 */
export const getTravelerRadialSpeedMultiplier = (
    x: number,
    y: number,
    width: number,
    height: number,
) => {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const centerX = safeWidth * 0.5;
    const centerY = safeHeight * 0.45;
    const offsetX = x - centerX;
    const offsetY = y - centerY;
    const normalizedRadius = Math.max(
        offsetX >= 0 ? offsetX / (safeWidth - centerX) : -offsetX / centerX,
        offsetY >= 0 ? offsetY / (safeHeight - centerY) : -offsetY / centerY,
    );
    return 2 ** clamp01(normalizedRadius);
};

const smoothstep = (value: number) => {
    const bounded = clamp01(value);
    return bounded * bounded * (3 - 2 * bounded);
};

const positiveModulo = (value: number, modulus: number) =>
    ((value % modulus) + modulus) % modulus;

/** Web Crypto is preferred; old/locked-down browsers receive one Math.random uint32 fallback. */
export const createCryptoSeed = (
    cryptoSource: Pick<Crypto, 'getRandomValues'> | null | undefined = globalThis.crypto,
    fallbackRandom: RandomSource = Math.random,
) => {
    if (!cryptoSource?.getRandomValues) return Math.floor(fallbackRandom() * UINT32_RANGE) >>> 0;
    const words = new Uint32Array(2);
    cryptoSource.getRandomValues(words);
    return (words[0] ^ Math.imul(words[1], 0x9e3779b1)) >>> 0;
};

export const getElapsedSecondsSinceMount = (mountedAt: number, now: number) =>
    Math.max(0, now - mountedAt) / 1000;

export const starDensityMultiplierForWidth = (width: number) =>
    width < MOBILE_BREAKPOINT ? 1 : width < LARGE_BREAKPOINT ? 3 : 10;
export const starCountForWidth = (width: number) => MOBILE_STAR_COUNT * starDensityMultiplierForWidth(width);
export const retainedAmbientCountForWidth = (width: number) => starCountForWidth(width) / 2;
export const travelerCountForWidth = (width: number) => MOBILE_TRAVELER_COUNT * starDensityMultiplierForWidth(width);

/** One galaxy roll in [0, 0.16): a 20% relative reduction from the former 20% chance. */
export const isGalaxyCreationRoll = (roll: number) => roll >= 0 && roll < GALAXY_CREATION_CHANCE;

/** Every sixth moving star is eligible to carry a prominent planetary system. */
export const isSystemCarrier = (traveler: Traveler, index: number) =>
    !traveler.isGalaxy && index % 6 === 2;

const getLifecyclePhase = (eventElapsed: number, event: number): ConstellationPhase => {
    if (eventElapsed < MORPH_SECONDS) {
        return { name: 'morph-in', event, progress: smoothstep(eventElapsed / MORPH_SECONDS), eventElapsed };
    }
    if (eventElapsed < MORPH_SECONDS + HOLD_SECONDS) {
        return { name: 'hold', event, progress: 1, eventElapsed };
    }
    if (eventElapsed < CONSTELLATION_WINDOW_SECONDS) {
        return {
            name: 'morph-out',
            event,
            progress: smoothstep((eventElapsed - MORPH_SECONDS - HOLD_SECONDS) / MORPH_SECONDS),
            eventElapsed,
        };
    }
    return { name: 'ambient', event, progress: 0, eventElapsed };
};

export const getConstellationPhase = (elapsedSeconds: number): ConstellationPhase => {
    const elapsed = Math.max(0, elapsedSeconds);
    if (elapsed < CONSTELLATION_INTERVAL_SECONDS) {
        return { name: 'ambient', event: 0, progress: 0, eventElapsed: elapsed };
    }
    const event = Math.floor(elapsed / CONSTELLATION_INTERVAL_SECONDS);
    return getLifecyclePhase(elapsed - event * CONSTELLATION_INTERVAL_SECONDS, event);
};

/** An explicit trigger gets the same exact 10s in / 10s hold / 10s out lifecycle. */
export const getEasterEggPhase = (elapsedSinceTrigger: number): ConstellationPhase =>
    getLifecyclePhase(Math.max(0, elapsedSinceTrigger), 1);

/** Traveler and planet clocks exclude every constellation window, including the active partial one. */
export const getSimulationTime = (elapsedSeconds: number) => {
    const elapsed = Math.max(0, elapsedSeconds);
    if (elapsed < CONSTELLATION_INTERVAL_SECONDS) return elapsed;
    const completedEvents = Math.floor(elapsed / CONSTELLATION_INTERVAL_SECONDS) - 1;
    const inInterval = elapsed % CONSTELLATION_INTERVAL_SECONDS;
    return elapsed
        - completedEvents * CONSTELLATION_WINDOW_SECONDS
        - Math.min(inInterval, CONSTELLATION_WINDOW_SECONDS);
};

// Paired layers preserve balanced drift and near-10% flares in every tier prefix.
const morphingAmbientIndex = (index: number) => index + 2 * Math.floor(index / 2);
const ambientFlareIndexForBlock = (seed: number, generation: number, block: number) => {
    const layer = (block & 1) ^ (hashUint(seed, generation, 701) & 1);
    const candidates = Array.from({ length: 10 }, (_, offset) => block * 10 + offset)
        .filter((candidate) => (candidate % 4 >= 2 ? 1 : 0) === layer);
    return candidates[hashUint(seed, generation, 702 + block) % candidates.length];
};
export const hasAmbientCardinalFlare = (seed: number, generation: number, index: number) =>
    index === ambientFlareIndexForBlock(seed, generation, Math.floor(index / 10));

const createStarLayout = (seed: number, generation: number, count: number, channel: number) => {
    const flares = new Set(Array.from({ length: Math.ceil(count / 10) },
        (_, block) => ambientFlareIndexForBlock(seed, generation, block)));
    const modeOffset = hashUint(seed, generation, channel + 1) & 1;
    return Array.from({ length: count }, (_, index) => {
        // Per-index streams keep all shared prefix stars identical when a display temporarily needs
        // hundreds more anchors. Density changes therefore cannot perturb the ambient frame.
        const random = createSeededRandom(hashUint(seed, generation, channel + 2 + index));
        return {
            x: between(random, 0.025, 0.975),
            y: between(random, 0.025, 0.975),
            size: between(random, AMBIENT_STAR_RADIUS_RANGE[0], AMBIENT_STAR_RADIUS_RANGE[1]),
            alpha: between(random, 0.28, 0.68),
            driftMode: (index + modeOffset) % 2 === 0 ? 'wrap' : 'bounce',
            driftSpeed: between(random, 0.0007, 0.0017),
            driftAngle: between(random, 0, TAU),
            twinkleSeed: Math.floor(random() * UINT32_RANGE),
            hasCardinalFlare: flares.has(index),
        } satisfies DistantStar;
    });
};

export const createAmbientLayout = (
    seed: number,
    generation: number,
    count = AMBIENT_STAR_COUNT,
): DistantStar[] => createStarLayout(seed, generation, count, 71);

export const getDriftedStar = (star: DistantStar, elapsedSeconds: number): Point => {
    const elapsed = Math.max(0, elapsedSeconds);
    const rawX = star.x + Math.cos(star.driftAngle) * star.driftSpeed * elapsed;
    const rawY = star.y + Math.sin(star.driftAngle) * star.driftSpeed * elapsed;
    if (star.driftMode === 'wrap') {
        return { x: positiveModulo(rawX, 1), y: positiveModulo(rawY, 1) };
    }
    const reflect = (value: number) => {
        const phase = positiveModulo(value, 2);
        return phase <= 1 ? phase : 2 - phase;
    };
    return { x: reflect(rawX), y: reflect(rawY) };
};

/** Right-hand drift velocity, including the direction reversal at each bounce cusp. */
export const getScreenWrappedVelocity = (
    from: Point,
    to: Point,
    elapsedSeconds: number,
    width: number,
    height: number,
): Point => {
    const duration = Math.max(Number.EPSILON, elapsedSeconds);
    const circularDelta = (start: number, end: number, span: number) => {
        let delta = end - start;
        if (span > 0 && delta > span / 2) delta -= span;
        if (span > 0 && delta < -span / 2) delta += span;
        return delta;
    };
    return {
        x: circularDelta(from.x, to.x, width) / duration,
        y: circularDelta(from.y, to.y, height) / duration,
    };
};

export const getDriftedStarVelocity = (
    star: DistantStar,
    elapsedSeconds: number,
    width = 1,
    height = 1,
): Point => {
    const elapsed = Math.max(0, elapsedSeconds);
    const velocityX = Math.cos(star.driftAngle) * star.driftSpeed;
    const velocityY = Math.sin(star.driftAngle) * star.driftSpeed;
    if (star.driftMode === 'wrap') {
        return { x: velocityX * width, y: velocityY * height };
    }
    const reflectedVelocity = (initial: number, velocity: number) => {
        const phase = positiveModulo(initial + velocity * elapsed, 2);
        if (phase < 1e-12 || 2 - phase < 1e-12) return Math.abs(velocity);
        if (Math.abs(phase - 1) < 1e-12) return -Math.abs(velocity);
        return phase < 1 ? velocity : -velocity;
    };
    return {
        x: reflectedVelocity(star.x, velocityX) * width,
        y: reflectedVelocity(star.y, velocityY) * height,
    };
};

/** Separate seed channels preserve layout/drift randomness and never reseed on a frame or cycle. */
export const getStarTwinkleParameters = (star: Pick<DistantStar, 'twinkleSeed'>) => ({
    periodSeconds: 8 + hashRandom(star.twinkleSeed, 0, 0) * 10,
    phase: hashRandom(star.twinkleSeed, 0, 1) * TAU,
    dim: 0.82 + hashRandom(star.twinkleSeed, 0, 2) * 0.1,
    bright: 1.04 + hashRandom(star.twinkleSeed, 0, 3) * 0.08,
});

const getAmbientTwinkleBrightness = (star: DistantStar, elapsedSeconds: number) => {
    const { periodSeconds, phase, dim, bright } = getStarTwinkleParameters(star);
    const wave = (1 + Math.sin(Math.max(0, elapsedSeconds) * TAU / periodSeconds + phase)) / 2;
    return dim + (bright - dim) * wave;
};

/** Slow, independent dim/bright variation; constellation choreography retains its own styles. */
export const getTwinkleBrightness = (
    star: DistantStar,
    elapsedSeconds: number,
    prefersReducedMotion = false,
) => !prefersReducedMotion && getConstellationPhase(elapsedSeconds).name === 'ambient'
    ? getAmbientTwinkleBrightness(star, elapsedSeconds)
    : 1;

export const getConstellationStrength = (phase: ConstellationPhase) => {
    if (phase.name === 'morph-in') return phase.progress;
    if (phase.name === 'hold') return 1;
    if (phase.name === 'morph-out') return 1 - phase.progress;
    return 0;
};

/** Explicit, shared choreography: every glyph morphs for the same complete ten seconds. */
export const getStarTextIntroProgress = (eventElapsed: number): StarTextIntroProgress => {
    const elapsed = Math.max(0, eventElapsed);
    const progress = smoothstep(elapsed / MORPH_SECONDS);
    return {
        stage: elapsed < MORPH_SECONDS ? 'morph-in' : 'complete',
        progress,
    };
};

/** Line strength also starts from the exact rendered frame when a trigger restarts. */
export const getEasterEggStrength = (
    startStrength: number,
    endStrength: number,
    elapsedSinceTrigger: number,
) => {
    const phase = getEasterEggPhase(elapsedSinceTrigger);
    if (phase.name === 'morph-in') return mix(startStrength, 1, phase.progress);
    if (phase.name === 'hold') return 1;
    if (phase.name === 'morph-out') return mix(1, endStrength, phase.progress);
    return endStrength;
};

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

const starAuras = new Map<number, StarAura>();
export const getStarAura = (seed: number): StarAura => {
    const cached = starAuras.get(seed);
    if (cached) return cached;
    const warmth = hashRandom(seed, 0, 811);
    const aura: StarAura = {
        radiusMultiplier: 2.1 + hashRandom(seed, 0, 812) * 1.5,
        opacity: 0.16 + hashRandom(seed, 0, 813) * 0.16,
        softness: 0.22 + hashRandom(seed, 0, 814) * 0.34,
        rgb: [Math.round(mix(160, 255, warmth)), Math.round(mix(211, 216, warmth)),
            Math.round(mix(255, 174, warmth))],
    };
    if (starAuras.size >= 4096) starAuras.delete(starAuras.keys().next().value!);
    starAuras.set(seed, aura);
    return aura;
};

const mixStarAura = (from: StarAura, to: StarAura, amount: number): StarAura => ({
    radiusMultiplier: mix(from.radiusMultiplier, to.radiusMultiplier, amount),
    opacity: mix(from.opacity, to.opacity, amount),
    softness: mix(from.softness, to.softness, amount),
    rgb: [mix(from.rgb[0], to.rgb[0], amount), mix(from.rgb[1], to.rgb[1], amount),
        mix(from.rgb[2], to.rgb[2], amount)],
});

export const getAmbientCardinalFlare = (style: StarVisualStyle) => {
    const opacity = clamp01(style.cardinalFlare ?? 0);
    if (opacity <= 0 || style.opacity <= 0) return null;
    const rayLength = style.radius * 9;
    return { opacity, rayLength, rayWidth: Math.max(0.45, style.radius * 0.55),
        coreRadius: style.radius * 0.85,
        rays: [{ x: 0, y: -rayLength }, { x: 0, y: rayLength },
            { x: rayLength, y: 0 }, { x: -rayLength, y: 0 }] };
};

/** Pure visual style interpolation with no alpha, radius, or twinkle pops at phase boundaries. */
export const getStarVisualStyle = (
    previous: DistantStar,
    next: DistantStar,
    elapsedSeconds: number,
): StarVisualStyle => {
    const phase = getConstellationPhase(elapsedSeconds);
    const strength = getConstellationStrength(phase);
    if (phase.name === 'ambient') {
        const twinkle = getAmbientTwinkleBrightness(next, elapsedSeconds);
        return {
            alpha: next.alpha,
            twinkle,
            strength,
            radius: next.size,
            opacity: Math.min(1, next.alpha * twinkle),
        };
    }

    const styleProgress = phase.name === 'morph-out' ? phase.progress : 0;
    const alpha = mix(previous.alpha, next.alpha, styleProgress);
    const size = mix(previous.size, next.size, styleProgress);
    const eventStart = phase.event * CONSTELLATION_INTERVAL_SECONDS;
    const ambientTwinkle = phase.name === 'morph-out'
        ? getAmbientTwinkleBrightness(next, eventStart + CONSTELLATION_WINDOW_SECONDS)
        : getAmbientTwinkleBrightness(previous, eventStart - 0.000001);
    const twinkle = mix(ambientTwinkle, 1, strength);
    return {
        alpha,
        twinkle,
        strength,
        radius: size * (1 + 0.18 * strength),
        opacity: Math.min(1, alpha * twinkle * (1 + 0.28 * strength)),
    };
};

const hiddenStarStyle = (radius = 1): StarVisualStyle => ({
    alpha: 0, twinkle: 1, strength: 0, radius, opacity: 0, coreOpacity: 0,
});

const ambientVisualStyle = (
    star: DistantStar,
    elapsedSeconds: number,
    prefersReducedMotion = false,
): StarVisualStyle => {
    const twinkle = prefersReducedMotion ? 1 : getAmbientTwinkleBrightness(star, elapsedSeconds);
    return {
        alpha: star.alpha,
        twinkle,
        strength: 0,
        radius: star.size,
        opacity: Math.min(1, star.alpha * twinkle),
        coreOpacity: 1,
        cardinalFlare: star.hasCardinalFlare ? 1 : 0,
        // Independent hashing leaves radius, drift, twinkle and traveler streams untouched.
        aura: { ...getStarAura(star.twinkleSeed),
            rgb: AMBIENT_STAR_PALETTE[hashUint(star.twinkleSeed, 0, 815)
                % AMBIENT_STAR_PALETTE.length].rgb },
    };
};

export const getStarFieldStyles = (
    sceneSeed: number,
    elapsedSeconds: number,
    prefersReducedMotion = false,
    densityWidth = LARGE_BREAKPOINT,
): StarVisualStyle[] => {
    // Match the Canvas lifecycle's static time-zero frame, including redraws after resize.
    if (prefersReducedMotion) elapsedSeconds = 0;
    const phase = getConstellationPhase(elapsedSeconds);
    const ambient = createAmbientLayout(sceneSeed, phase.event);
    if (phase.name === 'ambient') {
        const hiddenEvent = Math.max(1, phase.event);
        const hiddenPhrase = selectConstellationPhrase(sceneSeed, hiddenEvent);
        const hiddenCount = getConstellationAnchorCount(hiddenPhrase, sceneSeed, hiddenEvent);
        const hiddenSource = createAmbientLayout(
            sceneSeed, Math.max(0, hiddenEvent - 1), hiddenCount,
        );
        return [
            ...Array.from({ length: MAX_STAR_TEXT_ANCHOR_COUNT }, (_, index) =>
                hiddenStarStyle(hiddenSource[index]?.size ? hiddenSource[index].size * 1.18 : 1)),
            ...ambient.map((star, index) => index < starCountForWidth(densityWidth)
                ? ambientVisualStyle(star, elapsedSeconds, prefersReducedMotion) : hiddenStarStyle(star.size)),
        ];
    }

    const phrase = selectConstellationPhrase(sceneSeed, phase.event);
    const counts = getConstellationGlyphAnchorCounts(phrase, sceneSeed, phase.event);
    const anchorCount = counts.reduce((total, count) => total + count, 0);
    const previous = createAmbientLayout(sceneSeed, Math.max(0, phase.event - 1), Math.max(anchorCount, AMBIENT_STAR_COUNT));
    const eventStart = phase.event * CONSTELLATION_INTERVAL_SECONDS;
    const intro = getStarTextIntroProgress(phase.eventElapsed);
    const ambientSources = getStarTextAmbientSources(anchorCount);
    const targetStyles = previous.slice(0, anchorCount).map((star) => ({
        alpha: star.alpha,
        twinkle: 1,
        strength: 1,
        radius: star.size * 1.18,
        opacity: Math.min(1, star.alpha * 1.28),
        coreOpacity: 1,
        aura: getStarAura(star.twinkleSeed),
    }));
    const textStyles = Array.from({ length: MAX_STAR_TEXT_ANCHOR_COUNT }, (_, index) => {
        if (index >= anchorCount) return hiddenStarStyle();
        const target = targetStyles[index];
        if (phase.name === 'morph-out') {
            const visible = 1 - phase.progress;
            return { ...target, alpha: target.alpha * visible, strength: visible,
                opacity: target.opacity * visible, coreOpacity: visible };
        }
        if (phase.name === 'hold') return target;
        const source = ambientSources[index];
        const start = source.visible && source.index < starCountForWidth(densityWidth)
            ? ambientVisualStyle(previous[source.index], eventStart - 0.000001)
            : hiddenStarStyle(previous[source.index].size * 1.18);
        const style = mixStarVisualStyle(start, target, intro.progress);
        return { ...style, strength: intro.progress };
    });

    const previousAmbient = createAmbientLayout(sceneSeed, Math.max(0, phase.event - 1));
    const transferredSources = new Set(ambientSources.filter((source) => source.visible).map((source) => source.index));
    const ambientStyles = ambient.map((star, index) => {
        const from = ambientVisualStyle(previousAmbient[index], eventStart - 0.000001);
        const to = ambientVisualStyle(star, eventStart + CONSTELLATION_WINDOW_SECONDS);
        if (index >= starCountForWidth(densityWidth)) return hiddenStarStyle(from.radius);
        const consumed = index % 4 < 2;
        const held = consumed ? hiddenStarStyle(from.radius) : from;
        if (phase.name === 'morph-out') return mixStarVisualStyle(held, to, phase.progress);
        // Short phrases fade excess sources without losing their boundary frame.
        const transferred = transferredSources.has(index);
        if (consumed && !transferred && phase.name === 'morph-in') {
            return mixStarVisualStyle(from, hiddenStarStyle(from.radius), intro.progress);
        }
        return held;
    });
    return [...textStyles, ...ambientStyles];
};

/** Shared by tests and the Canvas loop so ambient draw counts cover the rendered path. */
export const isStarRenderable = (style: StarVisualStyle) => style.opacity > 0;

export const getStarRgb = (
    strength: number,
    ambientRgb: readonly [number, number, number] = AMBIENT_STAR_RGB,
): readonly [number, number, number] => {
    const amount = clamp01(strength);
    return [
        Math.round(mix(ambientRgb[0], CONSTELLATION_STAR_RGB[0], amount)),
        Math.round(mix(ambientRgb[1], CONSTELLATION_STAR_RGB[1], amount)),
        Math.round(mix(ambientRgb[2], CONSTELLATION_STAR_RGB[2], amount)),
    ];
};

export const CONSTELLATION_PHRASES = [
    'LONGMONT AI',
    '1023.Digital',
    'Nerual Networks',
    'Attention',
    'Transformer',
    'Context',
    'Harness',
] as const;
export type ConstellationPhrase = typeof CONSTELLATION_PHRASES[number];
export const EASTER_EGG_PHRASES = CONSTELLATION_PHRASES.slice(1) as readonly ConstellationPhrase[];
export const MAX_STAR_TEXT_ANCHOR_COUNT = Math.max(...CONSTELLATION_PHRASES.map((phrase) =>
    [...phrase].filter((character) => character !== ' ').length * MAX_GLYPH_STAR_COUNT));
/** Stable slots prevent array churn at the intro/outro lifecycle boundaries. */
export const STAR_FIELD_SLOT_COUNT = MAX_STAR_TEXT_ANCHOR_COUNT + AMBIENT_STAR_COUNT;

export const EASTER_EGG_CLICK_INTERVAL_MS = 500;
export const EASTER_EGG_CLICK_DISTANCE_PX = 8;

/**
 * Count a physical click sequence without depending on synthetic/native `detail` bookkeeping.
 * Interactive, out-of-bounds, and reduced-motion clicks break the sequence rather than joining it.
 */
export const advanceEasterEggClickSequence = (
    previous: EasterEggClickSequence | null,
    click: Omit<EasterEggClickSequence, 'count'>,
    isInsideCanvas: boolean,
    isInteractiveTarget: boolean,
    prefersReducedMotion = false,
): EasterEggClickSequence | null => {
    if (!isInsideCanvas || isInteractiveTarget || prefersReducedMotion) return null;
    const continuesSequence = previous !== null
        && click.timestamp >= previous.timestamp
        && click.timestamp - previous.timestamp <= EASTER_EGG_CLICK_INTERVAL_MS
        && Math.hypot(click.x - previous.x, click.y - previous.y) <= EASTER_EGG_CLICK_DISTANCE_PX;
    return { ...click, count: continuesSequence ? previous.count + 1 : 1 };
};

/** Native detail or the independently observed physical sequence may establish the third click. */
export const shouldTriggerEasterEgg = (
    clickDetail: number,
    isInsideCanvas: boolean,
    isInteractiveTarget: boolean,
    prefersReducedMotion = false,
) => clickDetail === 3 && isInsideCanvas && !isInteractiveTarget && !prefersReducedMotion;

/** Seed chooses the first hidden phrase; subsequent triggers cycle all six without repeats. */
export const selectEasterEggPhrase = (sceneSeed: number, triggerIndex: number): ConstellationPhrase => {
    const firstIndex = hashUint(sceneSeed, 0, 313) % EASTER_EGG_PHRASES.length;
    return EASTER_EGG_PHRASES[
        positiveModulo(firstIndex + Math.max(0, Math.trunc(triggerIndex)), EASTER_EGG_PHRASES.length)
    ];
};

const CONSTELLATION_BUCKET_COUNT = 12;

/** Six of twelve equiprobable buckets are the brand; every alternative owns one bucket. */
export const getConstellationPhraseForBucket = (bucket: number): ConstellationPhrase => {
    const normalized = positiveModulo(Math.trunc(bucket), CONSTELLATION_BUCKET_COUNT);
    return normalized < 6 ? CONSTELLATION_PHRASES[0] : CONSTELLATION_PHRASES[normalized - 5];
};

/** Phrase choice is stable for an event and changes only with scene seed/event identity. */
export const selectConstellationPhrase = (sceneSeed: number, event: number): ConstellationPhrase => {
    const stableEvent = Math.max(0, Math.trunc(event));
    // The uint32 midpoint is an exact half split, without modulo bias.
    if (hashUint(sceneSeed, stableEvent, 211) < UINT32_RANGE / 2) return CONSTELLATION_PHRASES[0];
    // Rejection sampling gives all six alternatives an exactly equal uint32 domain.
    const acceptedRange = UINT32_RANGE - (UINT32_RANGE % 6);
    let channel = 212;
    let alternativeRoll = hashUint(sceneSeed, stableEvent, channel);
    while (alternativeRoll >= acceptedRange) {
        channel += 1;
        alternativeRoll = hashUint(sceneSeed, stableEvent, channel);
    }
    return CONSTELLATION_PHRASES[1 + alternativeRoll % 6];
};

// A shared 5x7 pixel alphabet provides consistent proportions and much fuller letterforms.
const GLYPHS: Record<string, string[]> = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
};

const glyphAnchorCount = (
    phrase: ConstellationPhrase,
    sceneSeed: number,
    event: number,
    glyphIndex: number,
) => MIN_GLYPH_STAR_COUNT + hashUint(
    sceneSeed ^ hashUint(phrase.length, glyphIndex, phrase.charCodeAt(glyphIndex % phrase.length)),
    Math.max(0, Math.trunc(event)),
    401 + glyphIndex,
) % (MAX_GLYPH_STAR_COUNT - MIN_GLYPH_STAR_COUNT + 1);

export const getConstellationGlyphAnchorCounts = (
    phrase: ConstellationPhrase,
    sceneSeed = 0,
    event = 1,
): number[] => [...phrase].filter((character) => character !== ' ')
    .map((_, glyphIndex) => glyphAnchorCount(phrase, sceneSeed, event, glyphIndex));

export const getConstellationAnchorCount = (
    phrase: ConstellationPhrase,
    sceneSeed = 0,
    event = 1,
) => getConstellationGlyphAnchorCounts(phrase, sceneSeed, event)
    .reduce((total, count) => total + count, 0);

type GlyphStroke = readonly GlyphPoint[];

/**
 * Convert the reviewed bitmap alphabet to a one-dimensional stroke graph. Adjacent lit cells are
 * joined once; diagonal joins are used only when an endpoint has no orthogonal continuation. This
 * retains the familiar glyph silhouettes without treating each bitmap cell as a particle cluster.
 */
const createGlyphStrokes = (rows: string[]): GlyphStroke[] => {
    const lit = (x: number, y: number) => rows[y]?.[x] === '1';
    const orthogonalDegree = (x: number, y: number) => [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ].filter(([nextX, nextY]) => lit(nextX, nextY)).length;
    const strokes: GlyphPoint[][] = [];
    for (let y = 0; y < rows.length; y += 1) {
        for (let x = 0; x < rows[y].length; x += 1) {
            if (!lit(x, y)) continue;
            if (lit(x + 1, y)) strokes.push([{ x, y }, { x: x + 1, y }]);
            if (lit(x, y + 1)) strokes.push([{ x, y }, { x, y: y + 1 }]);
            for (const direction of [-1, 1]) {
                const nextX = x + direction;
                const nextY = y + 1;
                if (lit(nextX, nextY)
                    && (orthogonalDegree(x, y) === 0 || orthogonalDegree(nextX, nextY) === 0)) {
                    strokes.push([{ x, y }, { x: nextX, y: nextY }]);
                }
            }
        }
    }
    // A single lit cell is still a visible, short stroke (used by punctuation safeguards).
    if (strokes.length === 0) {
        const point = rows.flatMap((row, y) => [...row].flatMap((cell, x) =>
            cell === '1' ? [{ x, y }] : []))[0];
        if (point) strokes.push([
            { x: point.x - 0.32, y: point.y },
            { x: point.x + 0.32, y: point.y },
        ]);
    }
    return strokes;
};

const createUniformGlyphPoints = (
    strokes: GlyphStroke[],
    count: number,
    sceneSeed: number,
    event: number,
    glyphIndex: number,
): GlyphPoint[] => {
    const dense = new Map<string, GlyphPoint>();
    strokes.forEach(([from, to]) => {
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(2, Math.ceil(length * 48));
        for (let step = 0; step <= steps; step += 1) {
            const amount = step / steps;
            const point = mixPoint(from, to, amount);
            dense.set(`${point.x.toFixed(8)},${point.y.toFixed(8)}`, point);
        }
    });
    const candidates = [...dense.values()];
    if (candidates.length < count) throw new Error('Insufficient unique glyph stroke samples');

    // Farthest-point sampling maximizes the next nearest-neighbor distance. The seeded first
    // sample changes texture between events without changing spacing quality or adding jitter.
    const selected: GlyphPoint[] = [];
    const used = new Set<number>();
    let selectedIndex = hashUint(sceneSeed ^ (glyphIndex + 1), event, 431) % candidates.length;
    while (selected.length < count) {
        used.add(selectedIndex);
        selected.push(candidates[selectedIndex]);
        let bestIndex = -1;
        let bestDistance = -1;
        for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
            if (used.has(candidateIndex)) continue;
            const candidate = candidates[candidateIndex];
            let nearest = Number.POSITIVE_INFINITY;
            for (const point of selected) {
                nearest = Math.min(nearest,
                    (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2);
            }
            if (nearest > bestDistance + 1e-12) {
                bestDistance = nearest;
                bestIndex = candidateIndex;
            }
        }
        selectedIndex = bestIndex;
    }
    return selected;
};

const connectNearestTree = (points: GlyphPoint[]): ConstellationEdge[] => points
    .slice(1)
    .map((point, offset) => {
        const to = offset + 1;
        let from = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let candidate = 0; candidate < to; candidate += 1) {
            const distance = (points[candidate].x - point.x) ** 2
                + (points[candidate].y - point.y) ** 2;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                from = candidate;
            }
        }
        return { from, to };
    });

const buildRawConstellationGeometry = (
    phrase: ConstellationPhrase,
    sceneSeed: number,
    event: number,
    includeEdges = true,
) => {
    let cursor = 0;
    let glyphIndex = 0;
    const points: GlyphPoint[] = [];
    const edges: ConstellationEdge[] = [];
    const glyphs: ConstellationGlyph[] = [];
    for (const character of phrase) {
        if (character === ' ') {
            cursor += 4;
            continue;
        }
        const rows = GLYPHS[character.toUpperCase()];
        if (!rows) throw new Error(`Unsupported constellation glyph: ${character}`);
        const strokes = createGlyphStrokes(rows).map((stroke) => stroke.map((point) => ({
            x: cursor + point.x,
            y: point.y,
        })));
        const count = glyphAnchorCount(phrase, sceneSeed, event, glyphIndex);
        const glyphPoints = createUniformGlyphPoints(
            strokes, count, sceneSeed, event, glyphIndex,
        );
        const glyphStart = points.length;
        const indices = glyphPoints.map((point) => {
            points.push(point);
            return points.length - 1;
        });
        if (includeEdges) {
            connectNearestTree(glyphPoints).forEach(({ from, to }) => edges.push({
                from: glyphStart + from,
                to: glyphStart + to,
            }));
        }
        glyphs.push({ character, indices });
        glyphIndex += 1;
        cursor += 6;
    }
    return {
        points,
        edges,
        glyphs,
        lineWidth: Math.max(1, cursor - 1),
    };
};

type RawConstellationGeometry = ReturnType<typeof buildRawConstellationGeometry>;
const rawGeometryCache = new Map<string, RawConstellationGeometry>();
const rawConstellationGeometry = (
    phrase: ConstellationPhrase,
    sceneSeed: number,
    event: number,
    includeEdges: boolean,
): RawConstellationGeometry => {
    const key = `${phrase}|${sceneSeed}|${event}|${includeEdges ? 1 : 0}`;
    const cached = rawGeometryCache.get(key);
    if (cached) return cached;
    const geometry = buildRawConstellationGeometry(phrase, sceneSeed, event, includeEdges);
    rawGeometryCache.set(key, geometry);
    return geometry;
};

const projectConstellationGeometry = (
    width: number,
    height: number,
    phrase: ConstellationPhrase,
    sceneSeed: number,
    event: number,
    includeEdges: boolean,
): ConstellationGeometry => {
    const raw = rawConstellationGeometry(phrase, sceneSeed, event, includeEdges);
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const maximumWidth = safeWidth * 0.84;
    const maximumHeight = safeHeight * 0.22;
    const cell = Math.min(maximumWidth / raw.lineWidth, maximumHeight / 6);
    const rowWidth = raw.lineWidth * cell;
    const centerY = safeWidth < safeHeight ? safeHeight * 0.45 : safeHeight * 0.34;
    return {
        phrase,
        points: raw.points.map((point) => ({
            x: safeWidth * 0.5 - rowWidth * 0.5 + point.x * cell,
            y: centerY + (point.y - 3) * cell,
        })),
        edges: raw.edges,
        glyphs: raw.glyphs,
    };
};

export const createConstellationGeometryForPhrase = (
    width: number,
    height: number,
    phrase: ConstellationPhrase,
    sceneSeed = 0,
    event = 1,
): ConstellationGeometry => projectConstellationGeometry(
    width, height, phrase, sceneSeed, event, true,
);

export const scaleConstellationGeometry = (
    geometry: ConstellationGeometry,
    scaleX: number,
    scaleY: number,
): ConstellationGeometry => ({
    ...geometry,
    points: geometry.points.map(({ x, y }) => ({ x: x * scaleX, y: y * scaleY })),
    edges: geometry.edges.map((edge) => ({ ...edge })),
    glyphs: geometry.glyphs.map((glyph) => ({ ...glyph, indices: [...glyph.indices] })),
});

export const createConstellationGeometry = (
    width: number,
    height: number,
    sceneSeed = 0,
    event = 1,
): ConstellationGeometry => createConstellationGeometryForPhrase(
    width,
    height,
    selectConstellationPhrase(sceneSeed, event),
    sceneSeed,
    event,
);

export const createConstellationTargets = (
    width: number,
    height: number,
    sceneSeed = 0,
    event = 1,
): Point[] => projectConstellationGeometry(
    width,
    height,
    selectConstellationPhrase(sceneSeed, event),
    sceneSeed,
    event,
    false,
).points;

const mixPoint = (from: Point, to: Point, amount: number): Point => ({
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
});

const getDistributedTextSourceSlots = (targetCount: number) => {
    const count = Math.max(0, Math.trunc(targetCount));
    const visibleSourceCount = Math.min(
        AMBIENT_STAR_COUNT - RETAINED_AMBIENT_STAR_COUNT,
        count,
    );
    const sourceByDestination = Array<number>(count).fill(-1);
    // Distribute the mobile prefix across the entire phrase first, then fill remaining slots
    // at larger tiers. Shared stars never switch glyph destinations at a breakpoint.
    let assigned = 0;
    for (const tierCount of [MOBILE_STAR_COUNT / 2, MOBILE_STAR_COUNT * 3 / 2, RETAINED_AMBIENT_STAR_COUNT]) {
        const stageCount = Math.min(tierCount, visibleSourceCount) - assigned;
        const available = sourceByDestination.map((source, index) => source < 0 ? index : -1)
            .filter((index) => index >= 0);
        for (let index = 0; index < stageCount; index += 1) {
            const destination = available[Math.floor((index + 0.5) * available.length / stageCount)];
            sourceByDestination[destination] = assigned + index;
        }
        assigned += stageCount;
    }
    let hiddenSource = visibleSourceCount;
    return sourceByDestination.map((source) => source >= 0 ? source : hiddenSource++);
};

const getStarTextAmbientSources = (targetCount: number) => {
    const visibleSourceCount = Math.min(
        AMBIENT_STAR_COUNT - RETAINED_AMBIENT_STAR_COUNT,
        Math.max(0, targetCount),
    );
    return getDistributedTextSourceSlots(targetCount).map((sourceSlot) => ({
        index: sourceSlot < visibleSourceCount
            ? morphingAmbientIndex(sourceSlot)
            : positiveModulo(sourceSlot * 17 + 7, AMBIENT_STAR_COUNT),
        visible: sourceSlot < visibleSourceCount,
    }));
};

/**
 * Deterministically fan ambient positions across every destination glyph. Existing visible stars
 * occupy evenly distributed destination slots; extra nodes share ambient origins but start hidden.
 */
export const createStarTextAmbientOrigins = (
    ambientSources: Point[],
    targetCount: number,
): Point[] => {
    const count = Math.max(0, Math.trunc(targetCount));
    const fallback = ambientSources[0] ?? { x: 0, y: 0 };
    return getStarTextAmbientSources(count).map((source) =>
        ({ ...(ambientSources[source.index % Math.max(1, ambientSources.length)] ?? fallback) }));
};

/** Transfer ambient sources into text slots without changing the rendered trigger frame. */
export const remapAmbientStarsToTextSlots = (
    positions: Point[],
    styles: StarVisualStyle[],
    targetCount: number,
    ambientStartIndex = MAX_STAR_TEXT_ANCHOR_COUNT,
): { positions: Point[]; styles: StarVisualStyle[]; sourceIndices: number[] } => {
    const remappedPositions = positions.map((point) => ({ ...point }));
    const remappedStyles = styles.map((style) => ({ ...style }));
    const ambientSourceIndices = styles
        .map((style, index) => ({ style, index }))
        .filter(({ style, index }) => index >= ambientStartIndex
            && style.strength === 0 && style.opacity > 0)
        .map(({ index }) => index);
    const sources = getStarTextAmbientSources(targetCount);
    const sourceIndices = sources.filter((source) => source.visible)
        .map((source) => ambientStartIndex + source.index)
        .filter((index) => styles[index]?.opacity > 0);
    if (ambientSourceIndices.length > 0) {
        sources.forEach((source, destinationIndex) => {
            const sourceIndex = ambientStartIndex + source.index;
            remappedPositions[destinationIndex] = { ...positions[sourceIndex] };
            remappedStyles[destinationIndex] = source.visible
                ? { ...styles[sourceIndex] }
                : hiddenStarStyle(styles[sourceIndex].radius);
        });
    }
    sourceIndices.forEach((sourceIndex) => {
        remappedStyles[sourceIndex] = hiddenStarStyle(styles[sourceIndex].radius);
    });
    return { positions: remappedPositions, styles: remappedStyles, sourceIndices };
};


const quarticPoint = (controls: readonly Point[], amount: number): Point => {
    const t = clamp01(amount);
    const inverse = 1 - t;
    return {
        x: inverse ** 4 * controls[0].x + 4 * inverse ** 3 * t * controls[1].x
            + 6 * inverse ** 2 * t ** 2 * controls[2].x
            + 4 * inverse * t ** 3 * controls[3].x + t ** 4 * controls[4].x,
        y: inverse ** 4 * controls[0].y + 4 * inverse ** 3 * t * controls[1].y
            + 6 * inverse ** 2 * t ** 2 * controls[2].y
            + 4 * inverse * t ** 3 * controls[3].y + t ** 4 * controls[4].y,
    };
};

export const getSeamAwareReturnVelocity = (
    endpoint: Point,
    requestedVelocity: Point,
    width: number,
    height: number,
): Point => {
    const boundedComponent = (position: number, velocity: number, span: number) => {
        // The backward endpoint control must remain on-screen. Close to a wrap seam, exact
        // Euclidean C1 continuity is impossible without approaching from outside the canvas;
        // attenuate only that incompatible component and let ambient motion accelerate inward.
        const available = velocity >= 0 ? position : span - position;
        const maximum = Math.max(0, available) * 4 / MORPH_SECONDS;
        return Math.sign(velocity) * Math.min(Math.abs(velocity), maximum);
    };
    return {
        x: boundedComponent(endpoint.x, requestedVelocity.x, width),
        y: boundedComponent(endpoint.y, requestedVelocity.y, height),
    };
};

const curvedReturnPoint = (
    from: Point,
    to: Point,
    amount: number,
    seed: number,
    index: number,
    width: number,
    height: number,
    endVelocity: Point = { x: 0, y: 0 },
) => {
    const minimumX = Math.min(width * 0.025, to.x);
    const maximumX = Math.max(width * 0.975, to.x);
    const minimumY = Math.min(height * 0.025, to.y);
    const maximumY = Math.max(height * 0.975, to.y);
    const clampPoint = (point: Point): Point => ({
        x: Math.max(minimumX, Math.min(maximumX, point.x)),
        y: Math.max(minimumY, Math.min(maximumY, point.y)),
    });
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const bend = (hashRandom(seed, index, 463) * 2 - 1)
        * Math.min(Math.min(width, height) * 0.075, distance * 0.24);
    const middle = clampPoint({
        x: (from.x + to.x) * 0.5 - deltaY / distance * bend,
        y: (from.y + to.y) * 0.5 + deltaX / distance * bend,
    });
    const boundedVelocity = getSeamAwareReturnVelocity(
        to, endVelocity, width, height,
    );
    const beforeEnd = {
        x: to.x - boundedVelocity.x * MORPH_SECONDS / 4,
        y: to.y - boundedVelocity.y * MORPH_SECONDS / 4,
    };
    // Repeated first control gives zero hold-boundary velocity. Away from a wrap seam the
    // penultimate control exactly matches scheduled velocity; at a seam it stays in bounds.
    return quarticPoint([from, from, middle, beforeEnd, to], amount);
};

/**
 * Pure three-endpoint interpolation lets an active transition restart from its rendered frame.
 * Stars without constellation targets (such as the retained ambient layer) stay in place until
 * morph-out, rather than disappearing or producing undefined coordinates.
 */
export const getEasterEggStarFieldPositions = (
    start: Point[],
    targets: Point[],
    end: Point[],
    elapsedSinceTrigger: number,
    _endVelocities: Point[] = [],
    _viewport?: Point,
    options?: StarTextTransitionOptions,
): Point[] => {
    const phase = getEasterEggPhase(elapsedSinceTrigger);
    if (!options) {
        const targetFor = (point: Point, index: number) => targets[index] ?? point;
        if (phase.name === 'morph-in') {
            return start.map((point, index) => mixPoint(point, targetFor(point, index), phase.progress));
        }
        if (phase.name === 'hold') return start.map(targetFor);
        if (phase.name === 'morph-out') {
            const amount = (phase.eventElapsed - MORPH_SECONDS - HOLD_SECONDS) / MORPH_SECONDS;
            const xs = [...start, ...targets, ...end].map(({ x }) => x);
            const ys = [...start, ...targets, ...end].map(({ y }) => y);
            const width = Math.max(1, _viewport?.x ?? 0, ...xs);
            const height = Math.max(1, _viewport?.y ?? 0, ...ys);
            return start.map((point, index) => curvedReturnPoint(
                targetFor(point, index), end[index] ?? point, amount,
                0x51a7e99, index, width, height, _endVelocities[index],
            ));
        }
        return end;
    }
    const targetCount = Math.min(options.targetCount, targets.length);
    const targetFor = (point: Point, index: number) => targets[index] ?? point;
    if (phase.name === 'morph-in') {
        return start.map((point, index) => index < targetCount
            ? mixPoint(point, targetFor(point, index), phase.progress)
            : point);
    }
    if (phase.name === 'hold') return start.map(targetFor);
    const endpointIsVisible = (index: number) => options.endpointVisible?.[index] ?? false;
    if (phase.name === 'morph-out') {
        return start.map((point, index) => {
            const target = targetFor(point, index);
            if (endpointIsVisible(index) || index >= targetCount) {
                return mixPoint(target, end[index] ?? point, phase.progress);
            }
            return target;
        });
    }
    return start.map((point, index) => index < targetCount && !endpointIsVisible(index)
        ? targetFor(point, index)
        : end[index] ?? point);
};

const mixStarVisualStyle = (
    from: StarVisualStyle,
    to: StarVisualStyle,
    amount: number,
): StarVisualStyle => amount <= 0 ? { ...from } : amount >= 1 ? { ...to } : ({
    alpha: mix(from.alpha, to.alpha, amount),
    twinkle: mix(from.twinkle, to.twinkle, amount),
    strength: mix(from.strength, to.strength, amount),
    radius: mix(from.radius, to.radius, amount),
    opacity: mix(from.opacity, to.opacity, amount),
    ...(from.coreOpacity !== undefined || to.coreOpacity !== undefined
        ? { coreOpacity: mix(from.coreOpacity ?? from.opacity, to.coreOpacity ?? to.opacity, amount) } : {}),
    ...(from.cardinalFlare !== undefined || to.cardinalFlare !== undefined
        ? { cardinalFlare: mix(from.cardinalFlare ?? 0, to.cardinalFlare ?? 0, amount) } : {}),
    ...(from.aura || to.aura ? { aura: mixStarAura(from.aura ?? to.aura!, to.aura ?? from.aura!, amount) } : {}),
});

export const getEasterEggStarFieldStyles = (
    start: StarVisualStyle[],
    targets: StarVisualStyle[],
    end: StarVisualStyle[],
    elapsedSinceTrigger: number,
    options?: StarTextTransitionOptions,
): StarVisualStyle[] => {
    const phase = getEasterEggPhase(elapsedSinceTrigger);
    const targetFor = (style: StarVisualStyle, index: number) => targets[index] ?? style;
    if (!options) {
        if (phase.name === 'morph-in') {
            return start.map((style, index) => mixStarVisualStyle(
                style, targetFor(style, index), phase.progress,
            ));
        }
        if (phase.name === 'hold') return start.map(targetFor);
        if (phase.name === 'morph-out') {
            return start.map((style, index) => mixStarVisualStyle(
                targetFor(style, index), end[index] ?? style, phase.progress,
            ));
        }
        return end;
    }
    const targetCount = Math.min(options.targetCount, targets.length);
    if (phase.name === 'morph-in') {
        // Retained styles are identical; surplus ambient and old-phrase slots fade smoothly
        // instead of vanishing at the hold boundary when a short phrase uses fewer sources.
        return start.map((style, index) => mixStarVisualStyle(
            style, targetFor(style, index), phase.progress,
        ));
    }
    if (phase.name === 'hold') return start.map(targetFor);
    const endpointIsVisible = (index: number) => options.endpointVisible?.[index] ?? false;
    const fadeHiddenTextStyle = (
        target: StarVisualStyle,
        endpoint: StarVisualStyle,
        amount: number,
    ): StarVisualStyle => ({
        ...target,
        alpha: mix(target.alpha, endpoint.alpha, amount),
        strength: mix(target.strength, endpoint.strength, amount),
        opacity: mix(target.opacity, endpoint.opacity, amount),
        ...(target.coreOpacity !== undefined || endpoint.coreOpacity !== undefined
            ? { coreOpacity: mix(target.coreOpacity ?? target.opacity, endpoint.coreOpacity ?? endpoint.opacity, amount) } : {}),
    });
    if (phase.name === 'morph-out') {
        return start.map((style, index) => {
            const target = targetFor(style, index);
            const endpoint = end[index] ?? hiddenStarStyle(style.radius);
            return index < targetCount && !endpointIsVisible(index)
                ? fadeHiddenTextStyle(target, endpoint, phase.progress)
                : mixStarVisualStyle(target, endpoint, phase.progress);
        });
    }
    return start.map((style, index) => {
        const target = targetFor(style, index);
        const endpoint = end[index] ?? hiddenStarStyle(style.radius);
        return index < targetCount && !endpointIsVisible(index)
            ? fadeHiddenTextStyle(target, endpoint, 1)
            : endpoint;
    });
};

/** Matches the scheduled constellation's cool color, 18% radius, and 28% opacity lift. */
export const createEasterEggTargetStyles = (
    sceneSeed: number,
    triggerIndex: number,
    count = getConstellationAnchorCount(
        selectEasterEggPhrase(sceneSeed, triggerIndex), sceneSeed, triggerIndex + 1,
    ),
): StarVisualStyle[] => createAmbientLayout(sceneSeed, triggerIndex + 1, count).map((star) => ({
        alpha: star.alpha,
        twinkle: 1,
        strength: 1,
        radius: star.size * 1.18,
        opacity: Math.min(1, star.alpha * 1.28),
        coreOpacity: 1,
        aura: getStarAura(star.twinkleSeed),
    }));

export const getStarFieldPositions = (
    sceneSeed: number,
    elapsedSeconds: number,
    width: number,
    height: number,
): Point[] => {
    const phase = getConstellationPhase(elapsedSeconds);
    const ambientLayout = createAmbientLayout(sceneSeed, phase.event);
    const currentDriftTime = phase.event === 0
        ? elapsedSeconds
        : Math.max(0, phase.eventElapsed - CONSTELLATION_WINDOW_SECONDS);
    const ambientPositions = ambientLayout.map((star) => {
        const point = getDriftedStar(star, currentDriftTime);
        return { x: point.x * width, y: point.y * height };
    });

    if (phase.name === 'ambient') {
        const hiddenGeometry = createConstellationGeometry(
            width, height, sceneSeed, Math.max(1, phase.event),
        );
        const fallback = hiddenGeometry.points[0] ?? { x: width * 0.5, y: height * 0.5 };
        return [
            ...Array.from({ length: MAX_STAR_TEXT_ANCHOR_COUNT }, (_, index) =>
                ({ ...(hiddenGeometry.points[index] ?? fallback) })),
            ...ambientPositions,
        ];
    }

    const geometry = createConstellationGeometry(width, height, sceneSeed, phase.event);
    const targets = geometry.points;
    const previous = createAmbientLayout(
        sceneSeed, Math.max(0, phase.event - 1), Math.max(targets.length, AMBIENT_STAR_COUNT),
    );
    const previousAmbient = createAmbientLayout(sceneSeed, Math.max(0, phase.event - 1));
    const previousDriftTime = phase.event <= 1
        ? CONSTELLATION_INTERVAL_SECONDS
        : CONSTELLATION_INTERVAL_SECONDS - CONSTELLATION_WINDOW_SECONDS;
    const intro = getStarTextIntroProgress(phase.eventElapsed);
    const textSources = getStarTextAmbientSources(targets.length);
    const fallback = targets[0] ?? { x: width * 0.5, y: height * 0.5 };
    const textPositions = Array.from({ length: MAX_STAR_TEXT_ANCHOR_COUNT }, (_, index) => {
        if (index >= targets.length) return { ...fallback };
        if (phase.name === 'hold' || phase.name === 'morph-out') return { ...targets[index] };
        const source = textSources[index];
        const point = getDriftedStar(previous[source.index], previousDriftTime);
        return mixPoint(
            { x: point.x * width, y: point.y * height },
            targets[index],
            intro.progress,
        );
    });
    const backgroundPositions = ambientPositions.map((point, index) => {
        const previousPoint = getDriftedStar(previousAmbient[index], previousDriftTime);
        const from = { x: previousPoint.x * width, y: previousPoint.y * height };
        if (phase.name === 'morph-out') return mixPoint(from, point, phase.progress);
        return from;
    });
    return [...textPositions, ...backgroundPositions];
};

export const getStarPosition = (
    sceneSeed: number,
    starIndex: number,
    elapsedSeconds: number,
    width: number,
    height: number,
): Point => {
    const positions = getStarFieldPositions(sceneSeed, elapsedSeconds, width, height);
    return positions[getConstellationPhase(elapsedSeconds).name === 'ambient'
        ? MAX_STAR_TEXT_ANCHOR_COUNT + starIndex
        : starIndex];
};

const travelerSpeedMultiplierAtDepth = (seed: number, cycle: number, depth: number) => {
    const laneX = hashRandom(seed, cycle, 5) * 2 - 1;
    const laneY = hashRandom(seed, cycle, 6) * 2 - 1;
    const reciprocalScale = FAR_DEPTH / depth;
    return getTravelerRadialSpeedMultiplier(
        0.5 + laneX * 0.39 * reciprocalScale,
        0.45 + laneY * 0.37 * reciprocalScale,
        1,
        1,
    );
};

/** Cached deterministic quadrature keeps the position-dependent clock cheap in the RAF loop. */
const TRAVELER_SPEED_TABLE_STEPS = 256;
const travelerSpeedTables = new Map<string, Float64Array>();
const getTravelerSpeedTable = (traveler: Traveler, cycle: number) => {
    const key = `${traveler.seed}:${cycle}`;
    const cached = travelerSpeedTables.get(key);
    if (cached) return cached;
    const table = new Float64Array(TRAVELER_SPEED_TABLE_STEPS + 1);
    const step = DEPTH_RANGE / TRAVELER_SPEED_TABLE_STEPS;
    let previous = 1 / travelerSpeedMultiplierAtDepth(traveler.seed, cycle, FAR_DEPTH);
    for (let index = 1; index <= TRAVELER_SPEED_TABLE_STEPS; index += 1) {
        const distance = step * index;
        const current = 1 / travelerSpeedMultiplierAtDepth(
            traveler.seed, cycle, FAR_DEPTH - distance,
        );
        table[index] = table[index - 1] + (previous + current) * step * 0.5;
        previous = current;
    }
    if (travelerSpeedTables.size >= 4096) {
        travelerSpeedTables.delete(travelerSpeedTables.keys().next().value!);
    }
    travelerSpeedTables.set(key, table);
    return table;
};

const travelerBudgetAtDistance = (table: Float64Array, distance: number) => {
    const tablePosition = clamp01(distance / DEPTH_RANGE) * TRAVELER_SPEED_TABLE_STEPS;
    const index = Math.min(TRAVELER_SPEED_TABLE_STEPS - 1, Math.floor(tablePosition));
    return mix(table[index], table[index + 1], tablePosition - index);
};

// Scalar cycle boundaries avoid replaying every historical quadrature table each RAF.
const travelerCycleBudgets = new Map<number, number[]>();
const getTravelerCycleBudgets = (traveler: Traveler) => {
    const cached = travelerCycleBudgets.get(traveler.seed);
    if (cached) return cached;
    const budgets = [0];
    if (travelerCycleBudgets.size >= 512) travelerCycleBudgets.delete(travelerCycleBudgets.keys().next().value!);
    travelerCycleBudgets.set(traveler.seed, budgets);
    return budgets;
};

export const getTravelerDepth = (traveler: Traveler, simulationSeconds: number) => {
    const initialDistance = Math.max(0, traveler.initialDistance);
    let cycle = Math.floor(initialDistance / DEPTH_RANGE);
    let localDistance = initialDistance - cycle * DEPTH_RANGE;
    const distanceBudget = Math.max(0, simulationSeconds) * Math.max(0, traveler.speed);
    if (traveler.speed <= 0 || distanceBudget === 0) {
        return { depth: FAR_DEPTH - localDistance, cycle };
    }

    const budgets = getTravelerCycleBudgets(traveler);
    const appendCycle = () => {
        const table = getTravelerSpeedTable(traveler, budgets.length - 1);
        budgets.push(budgets[budgets.length - 1] + table[TRAVELER_SPEED_TABLE_STEPS]);
    };
    while (budgets.length <= cycle) appendCycle();
    const absoluteBudget = budgets[cycle]
        + travelerBudgetAtDistance(getTravelerSpeedTable(traveler, cycle), localDistance) + distanceBudget;
    while (budgets[budgets.length - 1] <= absoluteBudget) appendCycle();
    let first = cycle;
    let last = budgets.length - 1;
    while (first + 1 < last) {
        const middle = Math.floor((first + last) / 2);
        if (budgets[middle] <= absoluteBudget) first = middle;
        else last = middle;
    }
    cycle = first;
    const table = getTravelerSpeedTable(traveler, cycle);
    const targetBudget = absoluteBudget - budgets[cycle];
    let lower = 0;
    let upper = TRAVELER_SPEED_TABLE_STEPS;
    while (lower + 1 < upper) {
        const middle = Math.floor((lower + upper) * 0.5);
        if (table[middle] <= targetBudget) lower = middle;
        else upper = middle;
    }
    const budgetSpan = table[upper] - table[lower];
    const fraction = budgetSpan > 0 ? (targetBudget - table[lower]) / budgetSpan : 0;
    localDistance = (lower + fraction) * DEPTH_RANGE / TRAVELER_SPEED_TABLE_STEPS;
    return { depth: FAR_DEPTH - localDistance, cycle };
};

export const getTravelerDiscOpacity = (progress: number) =>
    smoothstep(progress / 0.14) * (1 - smoothstep((progress - 0.82) / 0.18));
export const SOLAR_SURFACE_CELL_COUNT = 12;

/** Seeded, continuous solar dynamics on the frozen simulation clock. */
export const getSolarSurface = (seed: number, simulationSeconds: number, progress: number) => {
    const time = Math.max(0, simulationSeconds);
    const strength = smoothstep((progress - TRAVELER_DETAIL_THRESHOLDS[0]) / 0.4);
    const rotation = time * 0.09 + hashRandom(seed, 0, 511) * TAU;
    const cells = Array.from({ length: SOLAR_SURFACE_CELL_COUNT }, (_, index) => {
        const phase = hashRandom(seed, index, 512) * TAU;
        const angle = phase + time * (0.04 + hashRandom(seed, index, 513) * 0.035);
        const distance = 0.15 + hashRandom(seed, index, 514) * 0.65 + Math.sin(time * 0.23 + phase) * 0.035;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance,
            radius: 0.1 + hashRandom(seed, index, 515) * 0.11 + Math.sin(time * 0.37 + phase) * 0.025,
            intensity: 0.5 + Math.sin(time * 0.31 + phase) * 0.5 };
    });
    return { strength, rotation, cells,
        prominence: 0.5 + Math.sin(time * 0.19 + hashRandom(seed, 0, 516) * TAU) * 0.5 };
};

/** Intrinsically larger travelers trend red; all non-red palette entries share the remainder. */
export const getTravelerColorWeights = (size: number) => {
    const sizeProgress = clamp01(
        (size - TRAVELER_RADIUS_RANGE[0]) / (TRAVELER_RADIUS_RANGE[1] - TRAVELER_RADIUS_RANGE[0]),
    );
    const red = mix(SMALL_TRAVELER_RED_CHANCE, LARGE_TRAVELER_RED_CHANCE, smoothstep(sizeProgress));
    const other = (1 - red) / (TRAVELER_PALETTE.length - 1);
    return [red, other, other, other, other] as const;
};

export const chooseTravelerColor = (size: number, roll: number) => {
    const weights = getTravelerColorWeights(size);
    let cursor = clamp01(roll);
    for (let index = 0; index < weights.length; index += 1) {
        cursor -= weights[index];
        if (cursor < 0 || index === weights.length - 1) return TRAVELER_PALETTE[index];
    }
    return TRAVELER_PALETTE[TRAVELER_PALETTE.length - 1];
};

/** Near travelers grow into resolved stellar discs with stable seeded color and surface identity. */
export const getTravelerAppearance = (traveler: Traveler, progress: number): TravelerAppearance => {
    const proximity = smoothstep(progress);
    const radius = traveler.size * (0.55 + proximity * 5.45);
    const detailLevel: 0 | 1 | 2 | 3 = progress >= TRAVELER_DETAIL_THRESHOLDS[2]
        ? 3
        : progress >= TRAVELER_DETAIL_THRESHOLDS[1]
            ? 2
            : progress >= TRAVELER_DETAIL_THRESHOLDS[0] ? 1 : 0;
    const selectedColor = chooseTravelerColor(traveler.size, hashRandom(traveler.seed, 0, 401));
    return {
        radius,
        detailLevel,
        haloRadius: radius * (1.65 + smoothstep(progress / 0.68) * 0.54),
        coreRadius: radius * (0.4 + smoothstep((progress - 0.28) / 0.4) * 0.18),
        flareLength: radius * 2.6 * smoothstep((progress - 0.5) / 0.18),
        colorName: selectedColor.name,
        color: selectedColor.color,
        texture: TRAVELER_SURFACE_TEXTURES[
            hashUint(traveler.seed, 0, 402) % TRAVELER_SURFACE_TEXTURES.length
        ],
        surfaceSeed: hashUint(traveler.seed, 0, 403),
        glowBlur: mix(TRAVELER_GLOW_BLUR_RANGE[0], TRAVELER_GLOW_BLUR_RANGE[1], proximity),
        glowOpacity: mix(TRAVELER_GLOW_OPACITY_RANGE[0], TRAVELER_GLOW_OPACITY_RANGE[1], proximity),
    };
};

export const getSystemHostStarAppearance = (traveler: Traveler, progress: number): TravelerAppearance => {
    const ordinary = getTravelerAppearance(traveler, progress);
    return { ...ordinary, radius: ordinary.radius * SYSTEM_HOST_RADIUS_MULTIPLIER,
        haloRadius: ordinary.haloRadius * SYSTEM_HOST_RADIUS_MULTIPLIER,
        coreRadius: ordinary.coreRadius * SYSTEM_HOST_RADIUS_MULTIPLIER,
        flareLength: ordinary.flareLength * SYSTEM_HOST_RADIUS_MULTIPLIER };
};

const GALAXY_DUST_DRIFT_MULTIPLIERS: Record<GalaxyFormation, number> = {
    spiral: 0.32,
    'barred-spiral': -0.22,
    elliptical: 0.12,
    irregular: -0.16,
    sombrero: 0,
};

/** Stable half-open rare-event threshold; identity changes only at lifecycle boundaries. */
export const isGalaxyDirectApproachRoll = (roll: number) =>
    roll >= 0 && roll < GALAXY_DIRECT_APPROACH_CHANCE;

export const isDirectApproachGalaxy = (traveler: Pick<Traveler, 'seed' | 'isGalaxy'>, cycle: number) =>
    Boolean(traveler.isGalaxy) && isGalaxyDirectApproachRoll(
        hashRandom(traveler.seed, Math.max(0, Math.trunc(cycle)), 529),
    );

/** Sombreros occupy 8% of cycles; the remaining four formations share the rest. */
export const getGalaxyFormation = (seed: number, cycle = 0): GalaxyFormation => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    return hashRandom(seed, stableCycle, 530) < GALAXY_SOMBRERO_CHANCE ? 'sombrero'
        : GALAXY_FORMATIONS[hashUint(seed, stableCycle, 521) % 4];
};

/** Fixed index ordering spreads the reveal across all arms and clumps without reshuffling. */
export const getGalaxyVisibleStarCount = (progress: number) =>
    mix(GALAXY_DISTANT_STAR_COUNT, GALAXY_INTERNAL_STAR_COUNT, smoothstep(clamp01(progress) / 0.82));

export const getGalaxyStarReveal = (progress: number, index: number) =>
    smoothstep((getGalaxyVisibleStarCount(progress)
        + 8 * smoothstep(clamp01(progress) / 0.82) - index) / 8);

/** Formation-specific magnitudes and seeded direction keep the population varied but legible. */
export const getGalaxyRotationRate = (seed: number, cycle = 0) => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const formation = getGalaxyFormation(seed, stableCycle);
    if (formation === 'sombrero') return 0;
    const magnitude = mix(
        GALAXY_ROTATION_RATE_RANGE[0],
        GALAXY_ROTATION_RATE_RANGE[1],
        hashRandom(seed, stableCycle, 524),
    ) * GALAXY_FORMATION_RATE_MULTIPLIERS[formation];
    return magnitude * (hashUint(seed, stableCycle, 525) % 2 === 0 ? -1 : 1);
};

/** Galaxies stay recognizable without ever exceeding seven times the replaced moving-star radius. */
export const getGalaxyAppearance = (
    traveler: Traveler,
    progress: number,
    cycle = 0,
): GalaxyAppearance => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const formation = getGalaxyFormation(traveler.seed, stableCycle);
    const starRadius = getTravelerAppearance(traveler, progress).radius;
    const outerRadius = Math.min(
        starRadius * GALAXY_MAX_RADIUS_MULTIPLIER,
        starRadius * (6.8 + smoothstep(progress) * 0.2),
    );
    const profiles: Record<GalaxyFormation, Pick<GalaxyAppearance,
        'coreRadius' | 'armCount' | 'flattening' | 'barLength'>> = {
        spiral: { coreRadius: 0.14, armCount: 3 + hashUint(traveler.seed, stableCycle, 522) % 2,
            flattening: 0.62, barLength: 0 },
        'barred-spiral': { coreRadius: 0.13, armCount: 2,
            flattening: 0.54, barLength: 0.48 },
        elliptical: { coreRadius: 0.3, armCount: 0,
            flattening: 0.7 + hashRandom(traveler.seed, stableCycle, 523) * 0.16,
            barLength: 0 },
        irregular: { coreRadius: 0.11, armCount: 0,
            flattening: 0.82, barLength: 0 },
        sombrero: { coreRadius: 0.28, armCount: 0,
            flattening: 0.16, barLength: 0 },
    };
    const profile = profiles[formation];
    return {
        formation,
        outerRadius,
        coreRadius: outerRadius * profile.coreRadius,
        armCount: profile.armCount,
        flattening: profile.flattening,
        barLength: outerRadius * profile.barLength,
        rotationRate: getGalaxyRotationRate(traveler.seed, stableCycle),
        internalStarCount: GALAXY_INTERNAL_STAR_COUNT,
    };
};

/** Visible whole-formation motion plus independent core and dust rhythms, all on simulation time. */
export const getGalaxyAnimationState = (
    traveler: Pick<Traveler, 'seed'>,
    cycle: number,
    simulationSeconds: number,
): GalaxyAnimationState => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const elapsed = Math.max(0, simulationSeconds);
    const formation = getGalaxyFormation(traveler.seed, stableCycle);
    const rotationRate = getGalaxyRotationRate(traveler.seed, stableCycle);
    return {
        rotation: hashRandom(traveler.seed, stableCycle, 526) * TAU + elapsed * rotationRate,
        corePulse: 0.92 + 0.08 * Math.sin(
            elapsed * (0.34 + hashRandom(traveler.seed, stableCycle, 527) * 0.18)
            + hashRandom(traveler.seed, stableCycle, 528) * TAU,
        ),
        dustDrift: elapsed * rotationRate * GALAXY_DUST_DRIFT_MULTIPLIERS[formation],
    };
};

/**
 * Bounded local-space matter for Canvas rendering. Coherent centered revolution preserves
 * the formation; Sombrero bulges alone churn independently within a stationary filled disk.
 */
export const getGalaxyParticleState = (
    traveler: Traveler,
    cycle: number,
    progress: number,
    simulationSeconds: number,
    index: number,
    resolvedAppearance?: GalaxyAppearance,
): GalaxyParticleState => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const particleIndex = positiveModulo(Math.trunc(index), GALAXY_INTERNAL_STAR_COUNT);
    const appearance = resolvedAppearance ?? getGalaxyAppearance(traveler, progress, stableCycle);
    const elapsed = Math.max(0, simulationSeconds);
    const unit = hashRandom(traveler.seed, stableCycle, 540 + particleIndex * 4);
    const jitter = hashRandom(traveler.seed, stableCycle, 541 + particleIndex * 4) - 0.5;
    const phase = hashRandom(traveler.seed, stableCycle, 542 + particleIndex * 4) * TAU;
    const twinklePhase = hashRandom(traveler.seed, stableCycle, 543 + particleIndex * 4) * TAU;
    let radial = 0;
    let angle = phase;
    let kind: GalaxyMatterKind = particleIndex % 9 === 0 ? 'dust' : 'star';

    if (appearance.formation === 'spiral' || appearance.formation === 'barred-spiral') {
        radial = 0.16 + Math.sqrt(unit) * 0.76;
        const arm = particleIndex % appearance.armCount;
        angle = arm * TAU / appearance.armCount + radial * TAU * 1.35 + jitter * 0.46;
        if (particleIndex % 7 === 1) kind = 'young-star';
        if (appearance.formation === 'barred-spiral' && radial < 0.38) {
            angle = (particleIndex & 1) * Math.PI + jitter * 0.22;
        }
    } else if (appearance.formation === 'elliptical') {
        radial = 0.08 + unit ** 0.72 * 0.82;
        kind = particleIndex % 11 === 0 ? 'dust' : 'star';
    } else if (appearance.formation === 'sombrero') {
        // A filled edge-on disk, not an annulus. Interleaved central points form a round bulge.
        const bulge = particleIndex % 3 === 0;
        radial = bulge ? unit ** 0.8 * 0.28 : Math.sqrt(unit) * 0.92;
        if (bulge) angle += elapsed * (0.12 + unit * 0.08);
        kind = 'star';
    } else {
        const clump = particleIndex % 4;
        const clumpAngle = hashRandom(traveler.seed, stableCycle, 610 + clump) * TAU;
        const clumpRadius = 0.18 + hashRandom(traveler.seed, stableCycle, 620 + clump) * 0.42;
        const localRadius = 0.04 + unit * 0.15;
        const localAngle = phase;
        const rawX = Math.cos(clumpAngle) * clumpRadius + Math.cos(localAngle) * localRadius;
        const rawY = Math.sin(clumpAngle) * clumpRadius + Math.sin(localAngle) * localRadius;
        radial = Math.min(0.82, Math.hypot(rawX, rawY));
        angle = Math.atan2(rawY, rawX);
        kind = particleIndex % 9 === 0 ? 'dust'
            : particleIndex % 4 === 0 ? 'young-star' : 'star';
    }

    // Revolve in the same centered local plane BEFORE flattening; Canvas only applies
    // the fixed seeded sky orientation. No double rotation or counter-rotating bars.
    angle += elapsed * appearance.rotationRate;
    const flattening = appearance.formation === 'sombrero' && particleIndex % 3 === 0
        ? 0.85 : appearance.flattening;
    const normalizedRadius = Math.min(0.94, Math.max(0.0, radial));
    const pulse = 0.84 + 0.16 * Math.sin(elapsed * (0.55 + unit * 0.38) + twinklePhase);
    return {
        x: Math.cos(angle) * normalizedRadius * appearance.outerRadius,
        y: Math.sin(angle) * normalizedRadius * appearance.outerRadius * flattening,
        radius: Math.min(0.68, appearance.outerRadius * 0.04, Math.max(
            0.12,
            appearance.outerRadius * (kind === 'dust' ? 0.009 : 0.011),
        )),
        opacity: (kind === 'dust' ? 0.32 : 0.58) * pulse * getGalaxyStarReveal(progress, particleIndex),
        kind,
    };
};

const EMBEDDED_GALAXY_HOST_COLORS = ['#fff3cf', '#d9efff', '#ffd7a8'] as const;
const EMBEDDED_GALAXY_PLANET_COLORS = ['#79b8d8', '#d2946f', '#9fc88c', '#b59bd6'] as const;

/** Stable miniature systems remain comfortably inside the galaxy's seven-star-radius silhouette. */
export const createEmbeddedGalaxySystems = (
    traveler: Pick<Traveler, 'seed'>,
    cycle: number,
    appearance: Pick<GalaxyAppearance, 'outerRadius' | 'flattening'>,
): EmbeddedGalaxySystem[] => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const outerRadius = Number.isFinite(appearance.outerRadius)
        ? Math.max(0, appearance.outerRadius) : 0;
    const flattening = Number.isFinite(appearance.flattening)
        ? Math.max(0.45, Math.min(1, appearance.flattening)) : 0.45;
    const systemCount = GALAXY_EMBEDDED_SYSTEM_COUNT_RANGE[0]
        + hashUint(traveler.seed, stableCycle, 701)
        % (GALAXY_EMBEDDED_SYSTEM_COUNT_RANGE[1] - GALAXY_EMBEDDED_SYSTEM_COUNT_RANGE[0] + 1);
    return Array.from({ length: systemCount }, (_, systemIndex) => {
        const channel = 710 + systemIndex * 31;
        const direction = hashUint(traveler.seed, stableCycle, channel + 3) % 2 === 0 ? -1 : 1;
        const planetCount = GALAXY_EMBEDDED_PLANET_COUNT_RANGE[0]
            + hashUint(traveler.seed, stableCycle, channel + 4)
            % (GALAXY_EMBEDDED_PLANET_COUNT_RANGE[1] - GALAXY_EMBEDDED_PLANET_COUNT_RANGE[0] + 1);
        return {
            orbitRadius: outerRadius * flattening
                * (0.27 + hashRandom(traveler.seed, stableCycle, channel) * 0.24),
            phase: hashRandom(traveler.seed, stableCycle, channel + 1) * TAU,
            speed: direction * (0.2 + hashRandom(traveler.seed, stableCycle, channel + 2) * 0.11),
            hostRadius: Math.min(outerRadius * 0.04, Math.max(0.22, outerRadius * 0.03)),
            hostColor: EMBEDDED_GALAXY_HOST_COLORS[
                hashUint(traveler.seed, stableCycle, channel + 5) % EMBEDDED_GALAXY_HOST_COLORS.length
            ],
            planets: Array.from({ length: planetCount }, (_, planetIndex) => ({
                orbitRadius: outerRadius * flattening
                    * (0.052 + planetIndex * 0.035
                        + hashRandom(traveler.seed, stableCycle, channel + 6 + planetIndex * 5) * 0.014),
                radius: Math.min(outerRadius * 0.025, Math.max(0.13, outerRadius * (0.012
                    + hashRandom(traveler.seed, stableCycle, channel + 7 + planetIndex * 5) * 0.006))),
                phase: hashRandom(traveler.seed, stableCycle, channel + 8 + planetIndex * 5) * TAU,
                speed: (planetIndex % 2 === 0 ? 1 : -1)
                    * (1.35 + hashRandom(traveler.seed, stableCycle, channel + 9 + planetIndex * 5) * 1.1),
                color: EMBEDDED_GALAXY_PLANET_COLORS[
                    hashUint(traveler.seed, stableCycle, channel + 10 + planetIndex * 5)
                    % EMBEDDED_GALAXY_PLANET_COLORS.length
                ],
            })),
        } satisfies EmbeddedGalaxySystem;
    });
};

/** Planet coordinates are host-relative, so moving hosts and their bound orbits share one clock. */
export const getEmbeddedGalaxySystemState = (
    system: EmbeddedGalaxySystem,
    simulationSeconds: number,
): EmbeddedGalaxySystemState => {
    const elapsed = Number.isFinite(simulationSeconds) ? Math.max(0, simulationSeconds) : 0;
    const hostAngle = system.phase + elapsed * system.speed;
    const host = {
        x: Math.cos(hostAngle) * system.orbitRadius,
        y: Math.sin(hostAngle) * system.orbitRadius,
    };
    return {
        host,
        planets: system.planets.map((planet) => {
            const angle = planet.phase + elapsed * planet.speed;
            return {
                ...planet,
                angle,
                z: Math.sin(angle),
                x: host.x + Math.cos(angle) * planet.orbitRadius,
                y: host.y + Math.sin(angle) * planet.orbitRadius,
            };
        }),
    };
};

/** Miniature systems fade in only once their sub-pixel planets can resolve as distinct points. */
export const getEmbeddedGalaxySystemOpacity = (outerRadius: number) =>
    clamp01(((Number.isFinite(outerRadius) ? Math.max(0, outerRadius) : 0) - 4) / 5);

/** System owners retain their resolved disc while suppressing every surrounding luminosity layer. */
export const getTravelerStarRenderPolicy = (ownsPlanetarySystem: boolean): TravelerStarRenderPolicy => ({
    renderDisc: true,
    renderHalo: !ownsPlanetarySystem,
    renderShadowGlow: !ownsPlanetarySystem,
    renderFlare: !ownsPlanetarySystem,
});

/** UFO silhouette radius is exactly 1.5x the star it replaces at the same approach depth. */
export const getUfoAppearance = (traveler: Traveler, progress: number): UfoAppearance => {
    const radius = getTravelerAppearance(traveler, progress).radius * UFO_SIZE_MULTIPLIER;
    return {
        radius,
        glowRadius: radius * 2.4,
        streakLength: Math.max(6, radius * 5),
    };
};

/** Seeded local-space debris drifts continuously while widening along the motion-opposed wake. */
export const getCometAppearance = (
    traveler: Traveler,
    cycle: number,
    progress: number,
): CometAppearance => {
    const stableCycle = Math.max(0, Math.trunc(cycle));
    const boundedProgress = clamp01(progress);
    const headRadius = getTravelerAppearance(traveler, boundedProgress).radius * 1.35;
    const trailLength = Math.max(18, headRadius * 12);
    const trailWidth = Math.max(3.5, headRadius * 2.8);
    const random = createSeededRandom(hashUint(traveler.seed, stableCycle, 401));
    const createParticle = (
        kind: CometTrailParticleKind,
        index: number,
        count: number,
    ): CometTrailParticle => {
        const baseDistance = (index + 0.55 + random() * 0.35) / count;
        const distanceFraction = baseDistance * (0.88 + boundedProgress * 0.12);
        const wakeAge = smoothstep(distanceFraction);
        const lateralBias = random() * 2 - 1;
        const flutterPhase = random() * TAU;
        const flutterRate = 0.65 + random() * 0.65;
        const spread = trailWidth * (0.12 + wakeAge * 0.88);
        const flutter = Math.sin(flutterPhase + boundedProgress * TAU * flutterRate);
        const asteroid = kind === 'asteroid';
        const radiusRoll = random();
        const baseOpacity = asteroid ? 0.48 + random() * 0.34 : 0.2 + random() * 0.42;
        const opacityPulse = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(
            flutterPhase + boundedProgress * TAU * (0.8 + flutterRate * 0.35),
        ));
        const rotation = positiveModulo(
            random() * TAU + boundedProgress * TAU * (0.45 + random() * 1.1),
            TAU,
        );
        return {
            kind,
            distance: trailLength * distanceFraction,
            lateralOffset: spread * (lateralBias * 0.72 + flutter * 0.28),
            radius: asteroid
                ? Math.max(0.35, headRadius * (0.13 + radiusRoll * 0.16))
                : Math.max(0.1, headRadius * (0.035 + radiusRoll * 0.045)),
            opacity: baseOpacity * opacityPulse * (1 - wakeAge * 0.28),
            rotation,
        };
    };
    return {
        headRadius,
        glowRadius: headRadius * 3.1,
        trailLength,
        trailWidth,
        particles: [
            ...Array.from({ length: 6 }, (_, index) => createParticle('asteroid', index, 6)),
            ...Array.from({ length: 18 }, (_, index) => createParticle('stardust', index, 18)),
        ],
    };
};

export const projectTraveler = (
    traveler: Traveler,
    simulationSeconds: number,
    width: number,
    height: number,
): ProjectedTraveler => {
    const { depth, cycle } = getTravelerDepth(traveler, simulationSeconds);
    const progress = (FAR_DEPTH - depth) / DEPTH_RANGE;
    const directApproach = isDirectApproachGalaxy(traveler, cycle);
    const laneX = directApproach ? 0 : hashRandom(traveler.seed, cycle, 5) * 2 - 1;
    const laneY = directApproach ? 0 : hashRandom(traveler.seed, cycle, 6) * 2 - 1;
    const reciprocalScale = FAR_DEPTH / depth;
    const fadeIn = smoothstep(progress / 0.14);
    const fadeOut = 1 - smoothstep((progress - 0.82) / 0.18);
    const appearance = getTravelerAppearance(traveler, progress);
    return {
        x: width * 0.5 + laneX * width * 0.39 * reciprocalScale,
        y: height * (directApproach ? 0.5 : 0.45) + laneY * height * 0.37 * reciprocalScale,
        depth,
        progress,
        radius: appearance.radius,
        opacity: traveler.alpha * fadeIn * fadeOut,
        cycle,
    };
};

/** Only visible moving-traveler projections may participate in a neural signal. */
export const isTravelerEligibleForNeuralSignal = (
    projection: ProjectedTraveler | undefined,
    width: number,
    height: number,
) => Boolean(projection
    && projection.opacity > 0.08
    && projection.x >= 0
    && projection.x <= width
    && projection.y >= 0
    && projection.y <= height);

const isSensibleNeuralPair = (
    left: ProjectedTraveler,
    right: ProjectedTraveler,
    width: number,
    height: number,
) => {
    const distance = Math.hypot(right.x - left.x, right.y - left.y);
    const minimumDistance = Math.min(72, Math.max(36, Math.min(width, height) * 0.09));
    const maximumDistance = Math.hypot(width, height) * 0.48;
    return distance >= minimumDistance && distance <= maximumDistance;
};

/** Approach every eligibility boundary at zero light, before hard offscreen suppression. */
export const getNeuralPairVisibility = (
    left: ProjectedTraveler, right: ProjectedTraveler, width: number, height: number,
) => {
    const minimumDistance = Math.min(72, Math.max(36, Math.min(width, height) * 0.09));
    const maximumDistance = Math.hypot(width, height) * 0.48;
    const distance = Math.hypot(right.x - left.x, right.y - left.y);
    const edgeBand = Math.min(80, Math.min(width, height) * 0.12);
    const endpointFade = (point: ProjectedTraveler) => smoothstep(
        Math.min(point.x, width - point.x, point.y, height - point.y) / edgeBand,
    ) * smoothstep((point.opacity - 0.08) / 0.27);
    return Math.min(endpointFade(left), endpointFade(right))
        * smoothstep((distance - minimumDistance) / 32)
        * smoothstep((maximumDistance - distance) / 80);
};

/** Render-only extinction: preserve intrinsic scheduling while fading before an endpoint is hidden.
 * The ratio replaces (rather than doubles) the intrinsic opacity fade already in the signal.
 */
export const getNeuralEndpointTransmission = (intrinsicOpacity: number, renderedOpacity: number) => {
    const intrinsicFade = smoothstep((intrinsicOpacity - 0.08) / 0.27);
    if (intrinsicFade <= 0) return 0;
    return Math.min(1, smoothstep((renderedOpacity - 0.08) / 0.27) / intrinsicFade);
};

export const getNeuralSignalEnvelope = (elapsed: number, duration: number) =>
    smoothstep(elapsed / NEURAL_SIGNAL_FADE_SECONDS[0])
    * smoothstep((duration - elapsed) / NEURAL_SIGNAL_FADE_SECONDS[1]);

/** Two fixed beads bloom once as the eased light passes; no per-frame random flicker. */
export const getNeuralSignalSparkles = (progress: number) => [0.34, 0.68].map((position) => ({
    progress: position,
    opacity: 0.65 * smoothstep(1 - Math.abs(progress - position) / 0.26),
    radius: 2.6,
}));

/** A small value object keeps recent traveler affinity bounded and independent from React. */
export const createNeuralContagionState = (): NeuralContagionState => ({
    entries: [],
    lastSignalSlot: null,
    lastSignalPair: null,
    lastSignalCycles: null,
});

const isCurrentContagionEntry = (
    entry: NeuralContagionEntry,
    projections: ProjectedTraveler[],
    width: number,
    height: number,
) => entry.remainingOpportunities > 0
    && projections[entry.travelerIndex]?.cycle === entry.cycle
    && isTravelerEligibleForNeuralSignal(projections[entry.travelerIndex], width, height);

/** Remove hidden or recycled travelers immediately instead of retaining stale index identities. */
export const syncNeuralContagionState = (
    state: NeuralContagionState,
    projections: ProjectedTraveler[],
    width: number,
    height: number,
): NeuralContagionState => {
    const entries = state.entries.filter((entry) =>
        isCurrentContagionEntry(entry, projections, width, height));
    return entries.length === state.entries.length
        ? state
        : { ...state, entries };
};

const getContagionAffinity = (
    state: NeuralContagionState | undefined,
    travelerIndex: number,
    projection: ProjectedTraveler,
) => {
    const entry = state?.entries.find((candidate) =>
        candidate.travelerIndex === travelerIndex && candidate.cycle === projection.cycle);
    return entry ? entry.remainingOpportunities / NEURAL_CONTAGION_OPPORTUNITIES : 0;
};

const isLockedNeuralPairCurrent = (
    state: NeuralContagionState,
    slot: number,
    projections: ProjectedTraveler[],
    width: number,
    height: number,
) => {
    if (state.lastSignalSlot !== slot || !state.lastSignalPair || !state.lastSignalCycles) return false;
    const [from, to] = state.lastSignalPair;
    return projections[from]?.cycle === state.lastSignalCycles[0]
        && projections[to]?.cycle === state.lastSignalCycles[1]
        && isTravelerEligibleForNeuralSignal(projections[from], width, height)
        && isTravelerEligibleForNeuralSignal(projections[to], width, height)
        && isSensibleNeuralPair(projections[from], projections[to], width, height);
};

/**
 * Select from every sensible pair with baseline weight one. Recent endpoints add a temporary
 * weight, so ordinary pairs always retain a non-zero chance and contagion cannot hard-lock.
 */
export const selectNeuralSignalPair = (
    sceneSeed: number,
    slot: number,
    projections: ProjectedTraveler[],
    width: number,
    height: number,
    contagionState?: NeuralContagionState,
): NeuralSignalPair | null => {
    if (contagionState && isLockedNeuralPairCurrent(
        contagionState, slot, projections, width, height,
    )) {
        return {
            fromTravelerIndex: contagionState.lastSignalPair![0],
            toTravelerIndex: contagionState.lastSignalPair![1],
        };
    }
    // An event whose locked endpoint went stale disappears rather than jumping to a new pair.
    if (contagionState?.lastSignalSlot === slot) return null;

    const pairs: Array<NeuralSignalPair & { weight: number }> = [];
    let totalWeight = 0;
    for (let from = 0; from < projections.length; from += 1) {
        if (!isTravelerEligibleForNeuralSignal(projections[from], width, height)) continue;
        for (let to = from + 1; to < projections.length; to += 1) {
            if (!isTravelerEligibleForNeuralSignal(projections[to], width, height)
                || !isSensibleNeuralPair(projections[from], projections[to], width, height)) continue;
            const weight = 1 + NEURAL_CONTAGION_AFFINITY_BOOST * (
                getContagionAffinity(contagionState, from, projections[from])
                + getContagionAffinity(contagionState, to, projections[to])
            );
            pairs.push({ fromTravelerIndex: from, toTravelerIndex: to, weight });
            totalWeight += weight;
        }
    }
    if (pairs.length === 0) return null;

    let cursor = hashRandom(sceneSeed, Math.max(0, Math.trunc(slot)), 304) * totalWeight;
    for (const pair of pairs) {
        cursor -= pair.weight;
        if (cursor < 0) return {
            fromTravelerIndex: pair.fromTravelerIndex,
            toTravelerIndex: pair.toTravelerIndex,
        };
    }
    const fallback = pairs[pairs.length - 1];
    return { fromTravelerIndex: fallback.fromTravelerIndex, toTravelerIndex: fallback.toTravelerIndex };
};

/**
 * Decay one opportunity and reinforce both endpoints exactly once per logical signal slot.
 * Oldest/weakest entries are discarded first if a chain spreads beyond the small fixed cap.
 */
export const updateNeuralContagionForSignal = (
    state: NeuralContagionState,
    slot: number,
    signal: Pick<NeuralSignal, 'fromTravelerIndex' | 'toTravelerIndex'>,
    projections: ProjectedTraveler[],
    width: number,
    height: number,
): NeuralContagionState => {
    const stableSlot = Math.max(0, Math.trunc(slot));
    if (state.lastSignalSlot === stableSlot) return state;

    const eligibleEndpoints = [signal.fromTravelerIndex, signal.toTravelerIndex]
        .filter((travelerIndex, index, values) => values.indexOf(travelerIndex) === index)
        .filter((travelerIndex) =>
            isTravelerEligibleForNeuralSignal(projections[travelerIndex], width, height));
    if (eligibleEndpoints.length !== 2) return syncNeuralContagionState(
        state, projections, width, height,
    );

    const entries = state.entries
        .filter((entry) => isCurrentContagionEntry(entry, projections, width, height))
        .map((entry) => ({ ...entry, remainingOpportunities: entry.remainingOpportunities - 1 }))
        .filter((entry) => entry.remainingOpportunities > 0);
    for (const travelerIndex of eligibleEndpoints) {
        const projection = projections[travelerIndex];
        const existing = entries.findIndex((entry) =>
            entry.travelerIndex === travelerIndex && entry.cycle === projection.cycle);
        const reinforced: NeuralContagionEntry = {
            travelerIndex,
            cycle: projection.cycle,
            remainingOpportunities: NEURAL_CONTAGION_OPPORTUNITIES,
            lastStruckSlot: stableSlot,
        };
        if (existing >= 0) entries[existing] = reinforced;
        else entries.push(reinforced);
    }
    entries.sort((left, right) => right.remainingOpportunities - left.remainingOpportunities
        || right.lastStruckSlot - left.lastStruckSlot
        || left.travelerIndex - right.travelerIndex);

    return {
        entries: entries.slice(0, NEURAL_CONTAGION_MAX_ENTRIES),
        lastSignalSlot: stableSlot,
        lastSignalPair: [signal.fromTravelerIndex, signal.toTravelerIndex],
        lastSignalCycles: [
            projections[signal.fromTravelerIndex].cycle,
            projections[signal.toTravelerIndex].cycle,
        ],
    };
};

export const getNeuralSignalSlot = (elapsedSeconds: number) =>
    Math.floor(getSimulationTime(elapsedSeconds) / NEURAL_SIGNAL_SLOT_SECONDS);

/**
 * Deterministic sparse schedule with optional bounded endpoint affinity. Pair indices always
 * address current traveler projections, while a recorded event keeps its pair stable across RAFs.
 */
export const getNeuralSignals = (
    sceneSeed: number,
    elapsedSeconds: number,
    projections: ProjectedTraveler[],
    width: number,
    height: number,
    reducedMotion = false,
    contagionState?: NeuralContagionState,
): NeuralSignal[] => {
    if (reducedMotion
        || width <= 0
        || height <= 0
        || getConstellationPhase(elapsedSeconds).name !== 'ambient') return [];

    const simulationSeconds = getSimulationTime(elapsedSeconds);
    const slot = getNeuralSignalSlot(elapsedSeconds);
    const isMobile = width < MOBILE_BREAKPOINT;
    const chance = isMobile ? NEURAL_SIGNAL_MOBILE_CHANCE : NEURAL_SIGNAL_DESKTOP_CHANCE;
    if (hashRandom(sceneSeed, slot, 301) >= chance) return [];

    const duration = mix(
        NEURAL_SIGNAL_DURATION_RANGE[0],
        NEURAL_SIGNAL_DURATION_RANGE[1],
        hashRandom(sceneSeed, slot, 302),
    );
    const slotElapsed = simulationSeconds - slot * NEURAL_SIGNAL_SLOT_SECONDS;
    const start = 1.25 + hashRandom(sceneSeed, slot, 303)
        * (NEURAL_SIGNAL_SLOT_SECONDS - duration - 2.5);
    const signalElapsed = slotElapsed - start;
    if (signalElapsed < 0 || signalElapsed >= duration) return [];

    const pair = selectNeuralSignalPair(
        sceneSeed, slot, projections, width, height, contagionState,
    );
    if (!pair) return [];
    const { fromTravelerIndex, toTravelerIndex } = pair;

    const pulseProgress = smoothstep(signalElapsed / duration);
    return [{
        fromTravelerIndex,
        toTravelerIndex,
        opacity: NEURAL_SIGNAL_MAX_OPACITY * getNeuralSignalEnvelope(signalElapsed, duration)
            * getNeuralPairVisibility(projections[fromTravelerIndex], projections[toTravelerIndex], width, height),
        pulseProgress,
        lineWidth: mix(NEURAL_SIGNAL_WIDTH_RANGE[0], NEURAL_SIGNAL_WIDTH_RANGE[1],
            hashRandom(sceneSeed, slot, 305)),
        bend: (hashRandom(sceneSeed, slot, 306) * 2 - 1) * 0.12,
        color: NEURAL_SIGNAL_COLORS[hashUint(sceneSeed, slot, 307) % NEURAL_SIGNAL_COLORS.length],
        sparkles: getNeuralSignalSparkles(pulseProgress),
    }];
};

export const getPlanetSurfaceDetailLevel = (
    radius: number,
    systemScale: number,
): PlanetSurfaceDetailLevel => {
    const diameter = Math.max(0, radius) * Math.max(0, systemScale) * 2;
    if (diameter >= PLANET_SURFACE_LOD_DIAMETERS[1]) return 2;
    if (diameter >= PLANET_SURFACE_LOD_DIAMETERS[0]) return 1;
    return 0;
};

export const hasAtmosphereHalo = (atmosphere: PlanetAtmosphereClass) =>
    atmosphere === 'gas-banded' || atmosphere === 'ocean-haze' || atmosphere === 'ice';

/**
 * Pure projected lighting geometry for a planet orbiting a star at the supplied center.
 * Positive z is toward the observer, so near-side bodies are crescents while negative-z
 * bodies expose progressively more of their star-facing hemisphere.
 */
export const getPlanetLightingStyle = (
    planet: Pick<OrbitingPlanet, 'x' | 'y' | 'z'>,
    starCenter: Point = { x: 0, y: 0 },
): PlanetLightingStyle => {
    const toStarX = starCenter.x - planet.x;
    const toStarY = starCenter.y - planet.y;
    const projectedDistance = Math.hypot(toStarX, toStarY);
    // Exact conjunction has no projected starward direction; keep its radially symmetric
    // phase deterministic with a stable axis rather than introducing frame-to-frame noise.
    const lightDirection = projectedDistance > 1e-9
        ? { x: toStarX / projectedDistance, y: toStarY / projectedDistance }
        : { x: -1, y: 0 };
    const illuminatedFraction = clamp01((1 - planet.z) * 0.5);
    const terminator = 1 - illuminatedFraction;
    const softness = 0.07;
    return {
        lightDirection,
        illuminatedFraction,
        shadowStart: { x: -lightDirection.x, y: -lightDirection.y },
        shadowEnd: lightDirection,
        terminatorStart: clamp01(terminator - softness),
        terminatorEnd: clamp01(terminator + softness),
        highlightCenter: {
            x: lightDirection.x * 0.38,
            y: lightDirection.y * 0.38,
        },
    };
};

export const chooseWeightedPlanetCount = (random: RandomSource) => {
    let cursor = random() * 10000;
    for (let index = 0; index < PLANET_COUNT_BASIS_POINTS.length; index += 1) {
        cursor -= PLANET_COUNT_BASIS_POINTS[index];
        if (cursor < 0) return index + 1;
    }
    return 12;
};

/** Mutually exclusive per-planet moon bands: 81.5% none and 18.5% moon-bearing. */
export const chooseMoonCount = (random: RandomSource) => {
    const outcome = random();
    if (outcome < 0.815) return 0;
    if (outcome < 0.915) return 1;
    if (outcome < 0.965) return 2;
    if (outcome < 0.99) return 3 + Math.floor(random() * 3);
    return 5 + Math.floor(random() * 3);
};

/** Radius-derived periods keep every visible system legible while preserving clear inner/outer speed tiers. */
export const getPlanetOrbitPeriod = (orbitRadius: number) => Math.min(
    MAX_PLANET_ORBIT_PERIOD_SECONDS,
    Math.max(MIN_PLANET_ORBIT_PERIOD_SECONDS, 4 + Math.max(0, orbitRadius) * 0.62),
);

/** Planet systems are regenerated solely from traveler seed + lifecycle cycle. */
export const createPlanetSystem = (travelerSeed: number, cycle: number): Planet[] => {
    const random = createSeededRandom(hashUint(travelerSeed, cycle, 43));
    const count = chooseWeightedPlanetCount(random);
    let ringsRemaining = 2;
    const atmosphereOffset = hashUint(travelerSeed, cycle, 97) % PLANET_ATMOSPHERE_CLASSES.length;
    return Array.from({ length: count }, (_, index) => {
        const radius = between(random, PLANET_RADIUS_RANGE[0], PLANET_RADIUS_RANGE[1]);
        const moonCount = chooseMoonCount(random);
        const moonPhase = between(random, 0, TAU);
        const maxMoonRadius = radius
            * PLANET_RENDER_SCALE
            * MAX_MOON_TO_RENDERED_PLANET_RADIUS_RATIO;
        const moons: Moon[] = Array.from({ length: moonCount }, (_, moonIndex) => ({
            // Relative sizing stays varied without allowing moons to overwhelm smaller parents.
            radius: between(random, maxMoonRadius * 0.55, maxMoonRadius),
            // Strict radial tiers and stratified phases keep dense seven-moon systems readable.
            orbitRadius: radius + 1.8 + moonIndex * 1.2 + between(random, 0, 0.12),
            phase: moonPhase
                + moonIndex * TAU / Math.max(1, moonCount)
                + between(random, -0.1, 0.1),
            // Non-overlapping speed bands preserve visible relative motion across concentric tracks.
            speed: (moonIndex % 3 === 2 ? -1 : 1)
                * (1.5 - moonIndex * 0.12 + between(random, 0, 0.06)),
        }));
        const hasRing = ringsRemaining > 0 && random() < 0.16;
        if (hasRing) ringsRemaining -= 1;
        const orbitRadius = 6.7 + index * 1.35 + between(random, 0, 0.8);
        const atmosphere = PLANET_ATMOSPHERE_CLASSES[
            (atmosphereOffset + index) % PLANET_ATMOSPHERE_CLASSES.length
        ];
        return {
            orbitRadius,
            radius,
            phase: between(random, 0, TAU),
            // Every fifth body is retrograde: deterministic, uncommon, and independent of frame timing.
            speed: (index % 5 === 4 ? -1 : 1) * TAU / getPlanetOrbitPeriod(orbitRadius),
            inclination: between(random, 0.28, 0.46),
            tilt: between(random, -0.28, 0.28),
            color: PLANET_COLORS[atmosphere][Math.floor(random() * PLANET_COLORS[atmosphere].length)],
            atmosphere,
            surfaceSeed: hashUint(travelerSeed, cycle, 131 + index),
            moons,
            hasRing,
        };
    });
};

/**
 * Pure projected position around an explicit center. Visual fixtures can sample 0, period / 4,
 * period / 2, and period at once instead of waiting in real time.
 */
export const getOrbitingPlanet = (
    planet: Planet,
    simulationSeconds: number,
    center: Point = { x: 0, y: 0 },
): OrbitingPlanet => {
    const angle = planet.phase + Math.max(0, simulationSeconds) * planet.speed;
    const z = Math.sin(angle);
    const localX = Math.cos(angle) * planet.orbitRadius;
    const localY = z * planet.orbitRadius * planet.inclination;
    return {
        ...planet,
        angle,
        x: center.x + localX * Math.cos(planet.tilt) - localY * Math.sin(planet.tilt),
        y: center.y + localX * Math.sin(planet.tilt) + localY * Math.cos(planet.tilt),
        z,
    };
};

/** A moon is translated by its parent planet's current position, not by the system star. */
export const getOrbitingMoon = (
    parent: Pick<OrbitingPlanet, 'x' | 'y'>,
    moon: Moon,
    simulationSeconds: number,
): OrbitingMoon => {
    const angle = moon.phase + Math.max(0, simulationSeconds) * moon.speed;
    return {
        ...moon,
        angle,
        x: parent.x + Math.cos(angle) * moon.orbitRadius,
        y: parent.y + Math.sin(angle) * moon.orbitRadius * 0.55,
    };
};

/** The central stellar disc occludes only planets on the negative-z half of their orbit. */
export const isPlanetBehindSystemStar = (z: number) => z < 0;

/** Computes orbital positions and painter-orders far-side planets before near-side planets. */
export const getOrbitingPlanets = (
    planets: Planet[],
    simulationSeconds: number,
    center: Point = { x: 0, y: 0 },
): OrbitingPlanet[] => planets
    .map((planet) => getOrbitingPlanet(planet, simulationSeconds, center))
    .sort((left, right) => left.z - right.z);

/** Systems reveal smoothly, then stay opaque until their rendered bounds leave the viewport. */
export const getSystemOpacity = (
    projection: ProjectedTraveler,
    carrierOpacity = projection.opacity,
) => {
    const reveal = smoothstep((projection.progress - SYSTEM_MIN_PROGRESS) / 0.12);
    return carrierOpacity * reveal;
};

/** Systems stay compact on reveal, then resolve rapidly into a legible close encounter. */
export const getSystemScale = (projection: ProjectedTraveler) => {
    const approach = smoothstep(
        (projection.progress - SYSTEM_MIN_PROGRESS) / (SYSTEM_MAX_PROGRESS - SYSTEM_MIN_PROGRESS),
    );
    return 0.55 + approach * 3.45;
};

/** Converts the owner's screen-space body radius into the currently scaled system coordinate space. */
export const getSystemOwnerDiscLocalRadius = (appearanceRadius: number, systemScale: number) => {
    if (!Number.isFinite(appearanceRadius)
        || !Number.isFinite(systemScale)
        || appearanceRadius <= 0
        || systemScale <= 0) return 0;
    return appearanceRadius / systemScale;
};

/** Keeps planet bodies visibly smaller than their unchanged host disc. */
export const MAX_PLANET_TO_HOST_RADIUS_RATIO = 0.75;

/** Cap only the body, in system-local coordinates; no pixel floor may override the host limit. */
export const getPlanetRenderRadius = (planetRadius: number, ownerDiscLocalRadius: number) => {
    if (!Number.isFinite(planetRadius) || !Number.isFinite(ownerDiscLocalRadius)
        || planetRadius <= 0 || ownerDiscLocalRadius <= 0) return 0;
    return Math.min(planetRadius * PLANET_RENDER_SCALE,
        ownerDiscLocalRadius * MAX_PLANET_TO_HOST_RADIUS_RATIO);
};

export const getPlanetSystemExtent = (planets: Planet[]) => planets.reduce((largest, planet) => {
    const renderedRadius = planet.radius * PLANET_RENDER_SCALE;
    const atmosphereRadius = hasAtmosphereHalo(planet.atmosphere)
        ? renderedRadius * ATMOSPHERE_HALO_RADIUS_MULTIPLIER
        : renderedRadius;
    const bodyExtent = planet.orbitRadius + atmosphereRadius;
    const moonExtent = planet.moons.reduce(
        (extent, moon) => Math.max(extent, planet.orbitRadius + moon.orbitRadius + moon.radius),
        bodyExtent,
    );
    const ringExtent = planet.hasRing
        ? planet.orbitRadius + renderedRadius * 1.85 + PLANET_RING_LINE_WIDTH * 0.5
        : bodyExtent;
    return Math.max(largest, bodyExtent, moonExtent, ringExtent);
}, 7);

/** Exact rendered system extent: planets, stellar halo, and flares all remain in the viewport. */
export const getSystemSafetyMargin = (traveler: Traveler, projection: ProjectedTraveler) => {
    const systemExtent = getPlanetSystemExtent(createPlanetSystem(traveler.seed, projection.cycle))
        * getSystemScale(projection);
    const appearance = getSystemHostStarAppearance(traveler, projection.progress);
    // Current-main hosts suppress glows; only the doubled disc contributes stellar bounds.
    const starExtent = appearance.radius;
    return Math.max(systemExtent, starExtent) + 0.5;
};

export const isSystemInViewport = (
    traveler: Traveler,
    projection: ProjectedTraveler,
    width: number,
    height: number,
) => {
    if (width <= 0 || height <= 0) return false;
    const margin = getSystemSafetyMargin(traveler, projection);
    return projection.x >= margin && projection.x <= width - margin
        && projection.y >= margin && projection.y <= height - margin;
};

export const isSystemOverlappingViewport = (
    traveler: Traveler,
    projection: ProjectedTraveler,
    width: number,
    height: number,
) => {
    if (width <= 0 || height <= 0) return false;
    const margin = getSystemSafetyMargin(traveler, projection);
    return projection.x + margin >= 0 && projection.x - margin <= width
        && projection.y + margin >= 0 && projection.y - margin <= height;
};

/** Carrier paths must clear the viewport before their depth cycle resets to the far field. */
export const doesSystemExitViewportBeforeCycle = (
    traveler: Traveler,
    projection: ProjectedTraveler,
    width: number,
    height: number,
) => {
    if (width <= 0 || height <= 0 || projection.depth <= 0) return false;
    const centerX = width * 0.5;
    const centerY = height * 0.45;
    const nearScale = projection.depth / NEAR_DEPTH;
    const nearProjection: ProjectedTraveler = {
        ...projection,
        x: centerX + (projection.x - centerX) * nearScale,
        y: centerY + (projection.y - centerY) * nearScale,
        depth: NEAR_DEPTH,
        progress: 1,
    };
    return !isSystemOverlappingViewport(traveler, nearProjection, width, height);
};

export const selectProminentSystem = (
    travelers: Traveler[],
    projections: ProjectedTraveler[],
    width: number,
    height: number,
) => {
    let selected = -1;
    let nearestProgress = -1;
    for (let index = 0; index < travelers.length; index += 1) {
        const projection = projections[index];
        if (!isSystemCarrier(travelers[index], index)
            || !projection
            || getTravelerVariant(travelers[index], projection.cycle) !== 'star'
            || projection.progress < SYSTEM_MIN_PROGRESS
            || projection.progress > SYSTEM_MAX_PROGRESS
            || !doesSystemExitViewportBeforeCycle(travelers[index], projection, width, height)
            || !isSystemInViewport(travelers[index], projection, width, height)) continue;
        if (projection.progress > nearestProgress) {
            selected = index;
            nearestProgress = projection.progress;
        }
    }
    return selected;
};

/** An owned system remains mounted until its complete rendered bounds leave the viewport. */
export const selectProminentSystemOwner = (
    travelers: Traveler[],
    projections: ProjectedTraveler[],
    width: number,
    height: number,
    currentOwner: ProminentSystemOwner | null,
): ProminentSystemOwner | null => {
    if (currentOwner) {
        const projection = projections[currentOwner.travelerIndex];
        const traveler = travelers[currentOwner.travelerIndex];
        if (traveler
            && projection?.cycle === currentOwner.cycle
            && isSystemOverlappingViewport(traveler, projection, width, height)) {
            return currentOwner;
        }
    }

    const travelerIndex = selectProminentSystem(travelers, projections, width, height);
    if (travelerIndex < 0) return null;
    return { travelerIndex, cycle: projections[travelerIndex].cycle };
};

export const createSpaceScene = (seed = createCryptoSeed()): SpaceScene => {
    const random = createSeededRandom(seed);
    const travelers = Array.from({ length: DESKTOP_TRAVELER_COUNT }, (): Traveler => ({
        seed: Math.floor(random() * UINT32_RANGE),
        initialDistance: random() * DEPTH_RANGE,
        speed: between(random, 18, 28),
        size: between(random, TRAVELER_RADIUS_RANGE[0], TRAVELER_RADIUS_RANGE[1]),
        alpha: between(random, 0.42, 0.72),
        isGalaxy: isGalaxyCreationRoll(random()),
    }));
    return { seed, stars: createAmbientLayout(seed, 0), travelers };
};
