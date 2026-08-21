export const AMBIENT_STAR_COUNT = 72;
export const DESKTOP_STAR_COUNT = AMBIENT_STAR_COUNT;
export const MOBILE_STAR_COUNT = AMBIENT_STAR_COUNT;
export const DESKTOP_TRAVELER_COUNT = 18;
export const MOBILE_TRAVELER_COUNT = 12;
export const MOBILE_BREAKPOINT = 640;
export const CONSTELLATION_INTERVAL_SECONDS = 600;
export const MORPH_SECONDS = 10;
export const HOLD_SECONDS = 10;
export const CONSTELLATION_WINDOW_SECONDS = MORPH_SECONDS * 2 + HOLD_SECONDS;
export const FAR_DEPTH = 1000;
export const NEAR_DEPTH = 56;
export const SYSTEM_MIN_PROGRESS = 0.34;
export const SYSTEM_MAX_PROGRESS = 0.84;
export const MAX_SYSTEM_SAFETY_MARGIN = 86;

const UINT32_MAX = 4294967296;
const DEPTH_RANGE = FAR_DEPTH - NEAR_DEPTH;
const TAU = Math.PI * 2;
const PLANET_COUNT_WEIGHTS = [3, 7, 12, 16, 18, 16, 11, 7, 4, 2, 1, 1] as const;
const PLANET_COLORS = ['#8bc5dd', '#bf9bd2', '#ddb281', '#88bca5', '#a5a9db', '#d28fa3'];

export type RandomSource = () => number;
export type ConstellationPhaseName = 'ambient' | 'morph-in' | 'hold' | 'morph-out';

export interface Point { x: number; y: number }

export interface DistantStar {
    x: number;
    y: number;
    size: number;
    alpha: number;
    driftRadiusX: number;
    driftRadiusY: number;
    driftPeriod: number;
    driftPhase: number;
    twinklePeriod: number;
    twinklePhase: number;
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

export const createSeededRandom = (seed: number): RandomSource => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / UINT32_MAX;
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
    hashUint(seed, cycle, channel) / UINT32_MAX;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
    const bounded = clamp01(value);
    return bounded * bounded * (3 - 2 * bounded);
};

export const createCryptoSeed = (cryptoSource: Pick<Crypto, 'getRandomValues'> = globalThis.crypto) => {
    if (!cryptoSource?.getRandomValues) throw new Error('A cryptographic random source is required');
    const words = new Uint32Array(2);
    cryptoSource.getRandomValues(words);
    return (words[0] ^ Math.imul(words[1], 0x9e3779b1)) >>> 0;
};

export const starCountForWidth = (_width: number) => AMBIENT_STAR_COUNT;
export const travelerCountForWidth = (width: number) =>
    width < MOBILE_BREAKPOINT ? MOBILE_TRAVELER_COUNT : DESKTOP_TRAVELER_COUNT;

export const getConstellationPhase = (elapsedSeconds: number): ConstellationPhase => {
    const elapsed = Math.max(0, elapsedSeconds);
    if (elapsed < CONSTELLATION_INTERVAL_SECONDS) {
        return { name: 'ambient', event: 0, progress: 0, eventElapsed: 0 };
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
    return Array.from({ length: AMBIENT_STAR_COUNT }, () => ({
        x: between(random, 0.025, 0.975),
        y: between(random, 0.025, 0.975),
        size: between(random, 0.65, 1.7),
        alpha: between(random, 0.38, 0.86),
        driftRadiusX: between(random, 0.002, 0.012),
        driftRadiusY: between(random, 0.002, 0.01),
        driftPeriod: between(random, 90, 240),
        driftPhase: between(random, 0, TAU),
        twinklePeriod: between(random, 5, 14),
        twinklePhase: between(random, 0, TAU),
    }));
};

export const getDriftedStar = (star: DistantStar, elapsedSeconds: number): Point => {
    const angle = star.driftPhase + Math.max(0, elapsedSeconds) * TAU / star.driftPeriod;
    return {
        x: star.x + Math.cos(angle) * star.driftRadiusX,
        y: star.y + Math.sin(angle * 0.83) * star.driftRadiusY,
    };
};

export const getTwinkleBrightness = (star: DistantStar, elapsedSeconds: number) => {
    const wave = Math.sin(star.twinklePhase + Math.max(0, elapsedSeconds) * TAU / star.twinklePeriod);
    return 0.62 + (wave + 1) * 0.19;
};

// Deliberately sparse 3x5 dot glyphs; all 72 ambient stars become one text dot.
const GLYPHS: Record<string, string[]> = {
    L: ['100', '100', '100', '100', '111'],
    O: ['010', '101', '101', '101', '010'],
    N: ['101', '100', '010', '001', '101'],
    G: ['010', '101', '100', '101', '011'],
    M: ['101', '111', '010', '101', '001'],
    T: ['111', '010', '010', '010', '010'],
    A: ['010', '101', '111', '101', '000'],
    I: ['010', '010', '010', '010', '010'],
};

const rawTextPoints = () => {
    const text = 'LONGMONT AI';
    const lineWidth = text.length * 4 - 1;
    const points: Point[] = [];
    for (let characterIndex = 0; characterIndex < text.length; characterIndex += 1) {
        const rows = GLYPHS[text[characterIndex]];
        if (!rows) continue;
        rows.forEach((row, y) => [...row].forEach((cell, x) => {
            if (cell === '1') points.push({ x: characterIndex * 4 + x, y });
        }));
    }
    return { points, lineWidth };
};

/** Returns exactly 72 viewport points arranged as one line of dotted 3x5 LONGMONT AI glyphs. */
export const createConstellationTargets = (width: number, height: number): Point[] => {
    const { points: raw, lineWidth } = rawTextPoints();
    const selected = Array.from({ length: AMBIENT_STAR_COUNT }, (_, index) =>
        raw[Math.floor(index * raw.length / AMBIENT_STAR_COUNT)]);
    const maximumWidth = Math.min(width * 0.88, height * 1.8);
    const cell = Math.max(2, maximumWidth / lineWidth);
    const rowWidth = lineWidth * cell;
    return selected.map((point) => ({
        x: width * 0.5 - rowWidth * 0.5 + point.x * cell,
        y: height * 0.27 + point.y * cell,
    }));
};

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
    return {
        x: width * 0.5 + laneX * width * 0.39 * reciprocalScale,
        y: height * 0.45 + laneY * height * 0.37 * reciprocalScale,
        depth,
        progress,
        radius: traveler.size * Math.min(3.1, 0.5 + reciprocalScale * 0.42),
        opacity: traveler.alpha * fadeIn * fadeOut,
        cycle,
    };
};

export const chooseWeightedPlanetCount = (random: RandomSource) => {
    const total = PLANET_COUNT_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
    let cursor = random() * total;
    for (let index = 0; index < PLANET_COUNT_WEIGHTS.length; index += 1) {
        cursor -= PLANET_COUNT_WEIGHTS[index];
        if (cursor < 0) return index + 1;
    }
    return 12;
};

/** Planet systems are regenerated solely from traveler seed + lifecycle cycle. */
export const createPlanetSystem = (travelerSeed: number, cycle: number): Planet[] => {
    const random = createSeededRandom(hashUint(travelerSeed, cycle, 43));
    const count = chooseWeightedPlanetCount(random);
    let accessoriesRemaining = 2;
    return Array.from({ length: count }, (_, index) => {
        const radius = between(random, 0.75, 1.7);
        const moons: Moon[] = [];
        const wantsMoon = accessoriesRemaining > 0 && random() < 0.22;
        if (wantsMoon) {
            moons.push({
                radius: between(random, 0.22, 0.42),
                orbitRadius: radius + between(random, 1.5, 2.5),
                phase: between(random, 0, TAU),
                speed: between(random, 0.7, 1.5),
            });
            accessoriesRemaining -= 1;
        }
        const hasRing = accessoriesRemaining > 0 && random() < 0.16;
        if (hasRing) accessoriesRemaining -= 1;
        return {
            orbitRadius: 9 + index * 5.25 + between(random, 0, 2.2),
            radius,
            phase: between(random, 0, TAU),
            speed: between(random, 0.035, 0.1) / Math.sqrt(index + 1),
            inclination: between(random, 0.28, 0.46),
            tilt: between(random, -0.28, 0.28),
            color: PLANET_COLORS[Math.floor(random() * PLANET_COLORS.length)],
            moons,
            hasRing,
        };
    });
};

/** Computes real orbital positions and painter-orders far-side planets before near-side planets. */
export const getOrbitingPlanets = (planets: Planet[], simulationSeconds: number): OrbitingPlanet[] =>
    planets.map((planet) => {
        const angle = planet.phase + Math.max(0, simulationSeconds) * planet.speed;
        const z = Math.sin(angle);
        const localX = Math.cos(angle) * planet.orbitRadius;
        const localY = z * planet.orbitRadius * planet.inclination;
        return {
            ...planet,
            angle,
            x: localX * Math.cos(planet.tilt) - localY * Math.sin(planet.tilt),
            y: localX * Math.sin(planet.tilt) + localY * Math.cos(planet.tilt),
            z,
        };
    }).sort((left, right) => left.z - right.z);

export const getSystemScale = (projection: ProjectedTraveler) => 0.48 + projection.progress * 1.08;

export const getSystemSafetyMargin = (_traveler: Traveler, projection: ProjectedTraveler) => {
    const planets = createPlanetSystem(_traveler.seed, projection.cycle);
    const extent = planets.reduce((largest, planet) => Math.max(largest, planet.orbitRadius + planet.radius + 4), 7);
    return Math.min(MAX_SYSTEM_SAFETY_MARGIN, extent * getSystemScale(projection) + 1);
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
        if (!projection || projection.progress < SYSTEM_MIN_PROGRESS || projection.progress > SYSTEM_MAX_PROGRESS
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
        seed: Math.floor(random() * UINT32_MAX),
        initialDistance: random() * DEPTH_RANGE,
        speed: between(random, 18, 28),
        size: between(random, 0.6, 1.1),
        alpha: between(random, 0.42, 0.72),
    }));
    return { seed, stars: createAmbientLayout(seed, 0), travelers };
};
