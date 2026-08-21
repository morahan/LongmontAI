export const AMBIENT_STAR_COUNT = 35;
export const CONSTELLATION_STAR_COUNT = 72;
export const DESKTOP_STAR_COUNT = AMBIENT_STAR_COUNT;
export const MOBILE_STAR_COUNT = AMBIENT_STAR_COUNT;
export const AMBIENT_STAR_RGB = [232, 224, 220] as const;
export const CONSTELLATION_STAR_RGB = [214, 231, 239] as const;
export const DESKTOP_TRAVELER_COUNT = 22;
export const MOBILE_TRAVELER_COUNT = 14;
export const MOBILE_BREAKPOINT = 640;
export const CONSTELLATION_INTERVAL_SECONDS = 600;
export const MORPH_SECONDS = 10;
export const HOLD_SECONDS = 10;
export const CONSTELLATION_WINDOW_SECONDS = MORPH_SECONDS * 2 + HOLD_SECONDS;
export const TWINKLE_WINDOW_SECONDS = 120;
export const FAR_DEPTH = 1000;
export const NEAR_DEPTH = 56;
export const SYSTEM_MIN_PROGRESS = 0.34;
export const SYSTEM_MAX_PROGRESS = 0.84;
export const TRAVELER_DETAIL_THRESHOLDS = [0.28, 0.5, 0.68] as const;
export const PLANET_SURFACE_LOD_DIAMETERS = [2.5, 4] as const;
export const ATMOSPHERE_HALO_RADIUS_MULTIPLIER = 1.18;
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
export type DriftMode = 'wrap' | 'bounce';
export type PlanetAtmosphereClass = typeof PLANET_ATMOSPHERE_CLASSES[number];

export interface Point { x: number; y: number }
export interface ConstellationEdge { from: number; to: number }
export interface ConstellationGlyph { character: string; indices: number[] }

export interface StarVisualStyle {
    alpha: number;
    twinkle: number;
    strength: number;
    radius: number;
    opacity: number;
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

export interface Traveler {
    seed: number;
    initialDistance: number;
    speed: number;
    size: number;
    alpha: number;
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

export interface ConstellationPhase {
    name: ConstellationPhaseName;
    event: number;
    progress: number;
    eventElapsed: number;
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

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
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

export const starCountForWidth = (_width: number) => AMBIENT_STAR_COUNT;
export const travelerCountForWidth = (width: number) =>
    width < MOBILE_BREAKPOINT ? MOBILE_TRAVELER_COUNT : DESKTOP_TRAVELER_COUNT;

/** Exactly indices 2, 8, and 14 of the desktop field are eligible system carriers. */
export const isSystemCarrier = (_traveler: Traveler, index: number) => index % 6 === 2;

export const getConstellationPhase = (elapsedSeconds: number): ConstellationPhase => {
    const elapsed = Math.max(0, elapsedSeconds);
    if (elapsed < CONSTELLATION_INTERVAL_SECONDS) {
        return { name: 'ambient', event: 0, progress: 0, eventElapsed: elapsed };
    }
    const event = Math.floor(elapsed / CONSTELLATION_INTERVAL_SECONDS);
    const eventElapsed = elapsed - event * CONSTELLATION_INTERVAL_SECONDS;
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

export const createAmbientLayout = (seed: number, generation: number): DistantStar[] => {
    const random = createSeededRandom(hashUint(seed, generation, 71));
    const modes: DriftMode[] = Array.from(
        { length: CONSTELLATION_STAR_COUNT },
        (_, index) => index < CONSTELLATION_STAR_COUNT / 2 ? 'wrap' : 'bounce',
    );
    for (let index = modes.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [modes[index], modes[swapIndex]] = [modes[swapIndex], modes[index]];
    }
    return Array.from({ length: CONSTELLATION_STAR_COUNT }, (_, index) => ({
        x: between(random, 0.025, 0.975),
        y: between(random, 0.025, 0.975),
        size: between(random, 0.65, 1.7),
        alpha: between(random, 0.28, 0.68),
        driftMode: modes[index],
        driftSpeed: between(random, 0.0007, 0.0017),
        driftAngle: between(random, 0, TAU),
        twinkleSeed: Math.floor(random() * UINT32_RANGE),
    }));
};

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

const getAmbientTwinkleBrightness = (star: DistantStar, elapsedSeconds: number) => {
    const elapsed = Math.max(0, elapsedSeconds);
    const cycle = Math.floor(elapsed / TWINKLE_WINDOW_SECONDS);
    const cycleTime = elapsed - cycle * TWINKLE_WINDOW_SECONDS;
    const fallDuration = 2 + hashRandom(star.twinkleSeed, cycle, 1) * 3;
    const restDuration = 0.35 + hashRandom(star.twinkleSeed, cycle, 2) * 1.4;
    const riseDuration = 2 + hashRandom(star.twinkleSeed, cycle, 3) * 3;
    const totalDuration = fallDuration + restDuration + riseDuration;
    const start = hashRandom(star.twinkleSeed, cycle, 0) * (TWINKLE_WINDOW_SECONDS - totalDuration);
    const target = 0.4 + hashRandom(star.twinkleSeed, cycle, 4) * 0.2;
    const eventTime = cycleTime - start;
    if (eventTime < 0 || eventTime >= totalDuration) return 1;
    if (eventTime < fallDuration) return 1 - (1 - target) * smoothstep(eventTime / fallDuration);
    if (eventTime < fallDuration + restDuration) return target;
    return target + (1 - target) * smoothstep(
        (eventTime - fallDuration - restDuration) / riseDuration,
    );
};

/** One independently seeded full-dim-full event per <=120s cycle. */
export const getTwinkleBrightness = (star: DistantStar, elapsedSeconds: number) =>
    getConstellationPhase(elapsedSeconds).name === 'ambient'
        ? getAmbientTwinkleBrightness(star, elapsedSeconds)
        : 1;

export const getConstellationStrength = (phase: ConstellationPhase) => {
    if (phase.name === 'morph-in') return phase.progress;
    if (phase.name === 'hold') return 1;
    if (phase.name === 'morph-out') return 1 - phase.progress;
    return 0;
};

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

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

export const getStarFieldStyles = (sceneSeed: number, elapsedSeconds: number): StarVisualStyle[] => {
    const phase = getConstellationPhase(elapsedSeconds);
    const previous = createAmbientLayout(sceneSeed, Math.max(0, phase.event - 1));
    const next = createAmbientLayout(sceneSeed, phase.event);
    return next.map((star, index) => {
        const style = getStarVisualStyle(previous[index], star, elapsedSeconds);
        if (index < AMBIENT_STAR_COUNT) return style;
        return {
            ...style,
            alpha: style.alpha * style.strength,
            opacity: style.opacity * style.strength,
        };
    });
};

/** Shared by tests and the Canvas loop so ambient draw counts cover the rendered path. */
export const isStarRenderable = (style: StarVisualStyle) => style.opacity > 0;

export const getStarRgb = (strength: number): readonly [number, number, number] => {
    const amount = clamp01(strength);
    return [
        Math.round(mix(AMBIENT_STAR_RGB[0], CONSTELLATION_STAR_RGB[0], amount)),
        Math.round(mix(AMBIENT_STAR_RGB[1], CONSTELLATION_STAR_RGB[1], amount)),
        Math.round(mix(AMBIENT_STAR_RGB[2], CONSTELLATION_STAR_RGB[2], amount)),
    ];
};

// These sparse 3x5 forms contain exactly one unique anchor per generated star.
const GLYPHS: Record<string, string[]> = {
    L: ['100', '100', '100', '100', '110'],
    O: ['010', '101', '101', '101', '010'],
    N: ['101', '100', '010', '001', '101'],
    G: ['010', '101', '100', '101', '011'],
    M: ['101', '111', '101', '101', '000'],
    T: ['111', '010', '010', '010', '010'],
    A: ['010', '101', '111', '101', '000'],
    I: ['010', '010', '010', '010', '000'],
};

const rawConstellationGeometry = () => {
    const text = 'LONGMONT AI';
    const lineWidth = text.length * 4 - 1;
    const points: GlyphPoint[] = [];
    const glyphs: ConstellationGlyph[] = [];
    for (let glyph = 0; glyph < text.length; glyph += 1) {
        const rows = GLYPHS[text[glyph]];
        if (!rows) continue;
        const indices: number[] = [];
        rows.forEach((row, y) => [...row].forEach((cell, x) => {
            if (cell !== '1') return;
            indices.push(points.length);
            points.push({ x: glyph * 4 + x, y });
        }));
        glyphs.push({ character: text[glyph], indices });
    }

    // A nearest-neighbor tree per glyph guarantees one connected component, including sparse Ns.
    const edges: ConstellationEdge[] = [];
    glyphs.forEach(({ indices }) => {
        const connected = new Set([indices[0]]);
        const remaining = new Set(indices.slice(1));
        while (remaining.size > 0) {
            let nearestFrom = indices[0];
            let nearestTo = [...remaining][0];
            let nearestDistance = Number.POSITIVE_INFINITY;
            connected.forEach((from) => remaining.forEach((to) => {
                const dx = points[from].x - points[to].x;
                const dy = points[from].y - points[to].y;
                const distance = dx * dx + dy * dy;
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestFrom = from;
                    nearestTo = to;
                }
            }));
            edges.push({ from: nearestFrom, to: nearestTo });
            connected.add(nearestTo);
            remaining.delete(nearestTo);
        }
    });
    return { points, edges, glyphs, lineWidth };
};

export const createConstellationGeometry = (width: number, height: number) => {
    const raw = rawConstellationGeometry();
    if (raw.points.length !== CONSTELLATION_STAR_COUNT) {
        throw new Error(`LONGMONT AI requires ${CONSTELLATION_STAR_COUNT} unique anchors`);
    }
    const maximumWidth = Math.min(width * 0.76, height * 1.2);
    const cell = Math.max(2, maximumWidth / raw.lineWidth);
    const rowWidth = raw.lineWidth * cell;
    return {
        points: raw.points.map((point) => ({
            x: width * 0.5 - rowWidth * 0.5 + point.x * cell,
            y: height * 0.03 + point.y * cell,
        })),
        edges: raw.edges,
        glyphs: raw.glyphs,
    };
};

export const createConstellationTargets = (width: number, height: number): Point[] =>
    createConstellationGeometry(width, height).points;

const mixPoint = (from: Point, to: Point, amount: number): Point => ({
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
});

export const getStarFieldPositions = (
    sceneSeed: number,
    elapsedSeconds: number,
    width: number,
    height: number,
): Point[] => {
    const phase = getConstellationPhase(elapsedSeconds);
    const current = createAmbientLayout(sceneSeed, phase.event);
    const previous = createAmbientLayout(sceneSeed, Math.max(0, phase.event - 1));
    const targets = createConstellationTargets(width, height);
    const currentDriftTime = phase.event === 0
        ? elapsedSeconds
        : Math.max(0, phase.eventElapsed - CONSTELLATION_WINDOW_SECONDS);
    const previousDriftTime = phase.event <= 1
        ? CONSTELLATION_INTERVAL_SECONDS
        : CONSTELLATION_INTERVAL_SECONDS - CONSTELLATION_WINDOW_SECONDS;

    return current.map((star, index) => {
        const currentPoint = getDriftedStar(star, currentDriftTime);
        const previousPoint = getDriftedStar(previous[index], previousDriftTime);
        const pixelCurrent = { x: currentPoint.x * width, y: currentPoint.y * height };
        const pixelPrevious = { x: previousPoint.x * width, y: previousPoint.y * height };
        if (phase.name === 'morph-in') return mixPoint(pixelPrevious, targets[index], phase.progress);
        if (phase.name === 'hold') return targets[index];
        if (phase.name === 'morph-out') return mixPoint(targets[index], pixelCurrent, phase.progress);
        return pixelCurrent;
    });
};

export const getStarPosition = (
    sceneSeed: number,
    starIndex: number,
    elapsedSeconds: number,
    width: number,
    height: number,
): Point => getStarFieldPositions(sceneSeed, elapsedSeconds, width, height)[starIndex];

export const getTravelerDepth = (traveler: Traveler, simulationSeconds: number) => {
    const distance = traveler.initialDistance + Math.max(0, simulationSeconds) * traveler.speed;
    const cycle = Math.floor(distance / DEPTH_RANGE);
    return { depth: FAR_DEPTH - (distance - cycle * DEPTH_RANGE), cycle };
};

/** Near travelers grow into resolved stellar discs with deterministic detail stages. */
export const getTravelerAppearance = (traveler: Traveler, progress: number): TravelerAppearance => {
    const proximity = smoothstep(progress);
    const radius = traveler.size * (0.55 + proximity * 5.45);
    const detailLevel: 0 | 1 | 2 | 3 = progress >= TRAVELER_DETAIL_THRESHOLDS[2]
        ? 3
        : progress >= TRAVELER_DETAIL_THRESHOLDS[1]
            ? 2
            : progress >= TRAVELER_DETAIL_THRESHOLDS[0] ? 1 : 0;
    return {
        radius,
        detailLevel,
        haloRadius: radius * (1.8 + detailLevel * 0.24),
        coreRadius: radius * (detailLevel >= 2 ? 0.48 : 0.34),
        flareLength: detailLevel === 3 ? radius * 2.6 : 0,
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
    const laneX = hashRandom(traveler.seed, cycle, 5) * 2 - 1;
    const laneY = hashRandom(traveler.seed, cycle, 6) * 2 - 1;
    const reciprocalScale = FAR_DEPTH / depth;
    const fadeIn = smoothstep(progress / 0.14);
    const fadeOut = 1 - smoothstep((progress - 0.82) / 0.18);
    const appearance = getTravelerAppearance(traveler, progress);
    return {
        x: width * 0.5 + laneX * width * 0.39 * reciprocalScale,
        y: height * 0.45 + laneY * height * 0.37 * reciprocalScale,
        depth,
        progress,
        radius: appearance.radius,
        opacity: traveler.alpha * fadeIn * fadeOut,
        cycle,
    };
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

export const chooseWeightedPlanetCount = (random: RandomSource) => {
    let cursor = random() * 10000;
    for (let index = 0; index < PLANET_COUNT_BASIS_POINTS.length; index += 1) {
        cursor -= PLANET_COUNT_BASIS_POINTS[index];
        if (cursor < 0) return index + 1;
    }
    return 12;
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
    let moonsRemaining = 2;
    let ringsRemaining = 2;
    const atmosphereOffset = hashUint(travelerSeed, cycle, 97) % PLANET_ATMOSPHERE_CLASSES.length;
    return Array.from({ length: count }, (_, index) => {
        const radius = between(random, 1.45, 2.3);
        const moons: Moon[] = [];
        if (moonsRemaining > 0 && random() < 0.22) {
            moons.push({
                radius: between(random, 0.22, 0.42),
                orbitRadius: radius + between(random, 1.5, 2.5),
                phase: between(random, 0, TAU),
                speed: between(random, 0.7, 1.5),
            });
            moonsRemaining -= 1;
        }
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

/** Computes orbital positions and painter-orders far-side planets before near-side planets. */
export const getOrbitingPlanets = (
    planets: Planet[],
    simulationSeconds: number,
    center: Point = { x: 0, y: 0 },
): OrbitingPlanet[] => planets
    .map((planet) => getOrbitingPlanet(planet, simulationSeconds, center))
    .sort((left, right) => left.z - right.z);

export const getSystemScale = (projection: ProjectedTraveler) => 0.48 + projection.progress * 1.08;

export const getPlanetSystemExtent = (planets: Planet[]) => planets.reduce((largest, planet) => {
    const atmosphereRadius = hasAtmosphereHalo(planet.atmosphere)
        ? planet.radius * ATMOSPHERE_HALO_RADIUS_MULTIPLIER
        : planet.radius;
    const bodyExtent = planet.orbitRadius + atmosphereRadius;
    const moonExtent = planet.moons.reduce(
        (extent, moon) => Math.max(extent, planet.orbitRadius + moon.orbitRadius + moon.radius),
        bodyExtent,
    );
    const ringExtent = planet.hasRing
        ? planet.orbitRadius + planet.radius * 1.85 + 0.275
        : bodyExtent;
    return Math.max(largest, bodyExtent, moonExtent, ringExtent);
}, 7);

/** Exact rendered system extent: planets, stellar halo, and flares all remain in the viewport. */
export const getSystemSafetyMargin = (traveler: Traveler, projection: ProjectedTraveler) => {
    const systemExtent = getPlanetSystemExtent(createPlanetSystem(traveler.seed, projection.cycle))
        * getSystemScale(projection);
    const appearance = getTravelerAppearance(traveler, projection.progress);
    const starExtent = Math.max(appearance.haloRadius, appearance.flareLength);
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
            || projection.progress < SYSTEM_MIN_PROGRESS
            || projection.progress > SYSTEM_MAX_PROGRESS
            || !isSystemInViewport(travelers[index], projection, width, height)) continue;
        if (projection.progress > nearestProgress) {
            selected = index;
            nearestProgress = projection.progress;
        }
    }
    return selected;
};

export const createSpaceScene = (seed = createCryptoSeed()): SpaceScene => {
    const random = createSeededRandom(seed);
    const travelers = Array.from({ length: DESKTOP_TRAVELER_COUNT }, (): Traveler => ({
        seed: Math.floor(random() * UINT32_RANGE),
        initialDistance: random() * DEPTH_RANGE,
        speed: between(random, 18, 28),
        size: between(random, 0.6, 1.1),
        alpha: between(random, 0.42, 0.72),
    }));
    return { seed, stars: createAmbientLayout(seed, 0), travelers };
};
