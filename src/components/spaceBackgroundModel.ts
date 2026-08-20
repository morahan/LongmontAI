export const DESKTOP_STAR_COUNT = 45;
export const MOBILE_STAR_COUNT = 30;
export const DESKTOP_TRAVELER_COUNT = 18;
export const MOBILE_TRAVELER_COUNT = 12;
export const MOBILE_BREAKPOINT = 640;
export const TWINKLE_WINDOW_SECONDS = 120;
export const FAR_DEPTH = 1000;
export const NEAR_DEPTH = 56;

export interface DistantStar {
    x: number;
    y: number;
    size: number;
    alpha: number;
    twinkleSeed: number;
}

export interface Planet {
    orbitRadius: number;
    radius: number;
    phase: number;
    color: string;
    hasMoon: boolean;
}

export interface Traveler {
    seed: number;
    initialDistance: number;
    speed: number;
    size: number;
    alpha: number;
    planets: Planet[] | null;
}

export interface SpaceScene {
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

const UINT32_MAX = 4294967296;
const DEPTH_RANGE = FAR_DEPTH - NEAR_DEPTH;

export const createSeededRandom = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / UINT32_MAX;
    };
};

const between = (random: () => number, minimum: number, maximum: number) =>
    minimum + random() * (maximum - minimum);

const hashRandom = (seed: number, cycle: number, channel: number) => {
    let value = (seed ^ Math.imul(cycle + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    return ((value ^ (value >>> 15)) >>> 0) / UINT32_MAX;
};

const smoothstep = (value: number) => {
    const bounded = Math.max(0, Math.min(1, value));
    return bounded * bounded * (3 - 2 * bounded);
};

export const starCountForWidth = (width: number) =>
    width < MOBILE_BREAKPOINT ? MOBILE_STAR_COUNT : DESKTOP_STAR_COUNT;

export const travelerCountForWidth = (width: number) =>
    width < MOBILE_BREAKPOINT ? MOBILE_TRAVELER_COUNT : DESKTOP_TRAVELER_COUNT;

/** A deterministic, independent full -> dim -> full twinkle in each two-minute window. */
export const getTwinkleBrightness = (star: DistantStar, elapsedSeconds: number) => {
    const safeElapsed = Math.max(0, elapsedSeconds);
    const cycle = Math.floor(safeElapsed / TWINKLE_WINDOW_SECONDS);
    const cycleTime = safeElapsed - cycle * TWINKLE_WINDOW_SECONDS;
    const fallDuration = 2 + hashRandom(star.twinkleSeed, cycle, 1) * 3;
    const restDuration = 0.35 + hashRandom(star.twinkleSeed, cycle, 2) * 1.4;
    const riseDuration = 2 + hashRandom(star.twinkleSeed, cycle, 3) * 3;
    const totalDuration = fallDuration + restDuration + riseDuration;
    const start = hashRandom(star.twinkleSeed, cycle, 0) * (TWINKLE_WINDOW_SECONDS - totalDuration);
    const target = 0.4 + hashRandom(star.twinkleSeed, cycle, 4) * 0.2;
    const twinkleTime = cycleTime - start;

    if (twinkleTime < 0 || twinkleTime >= totalDuration) return 1;
    if (twinkleTime < fallDuration) {
        return 1 - (1 - target) * smoothstep(twinkleTime / fallDuration);
    }
    if (twinkleTime < fallDuration + restDuration) return target;
    return target + (1 - target) * smoothstep(
        (twinkleTime - fallDuration - restDuration) / riseDuration,
    );
};

export const getTravelerDepth = (traveler: Traveler, elapsedSeconds: number) => {
    const distance = traveler.initialDistance + Math.max(0, elapsedSeconds) * traveler.speed;
    const cycle = Math.floor(distance / DEPTH_RANGE);
    return {
        depth: FAR_DEPTH - (distance - cycle * DEPTH_RANGE),
        cycle,
    };
};

/** Reciprocal-depth projection. Lanes change deterministically each time a traveler resets. */
export const projectTraveler = (
    traveler: Traveler,
    elapsedSeconds: number,
    width: number,
    height: number,
): ProjectedTraveler => {
    const { depth, cycle } = getTravelerDepth(traveler, elapsedSeconds);
    const progress = (FAR_DEPTH - depth) / DEPTH_RANGE;
    const laneX = hashRandom(traveler.seed, cycle, 5) * 2 - 1;
    const laneY = hashRandom(traveler.seed, cycle, 6) * 2 - 1;
    const reciprocalScale = FAR_DEPTH / depth;
    const fadeIn = smoothstep(progress / 0.14);
    const fadeOut = 1 - smoothstep((progress - 0.82) / 0.18);
    const sizeScale = Math.min(3.1, 0.5 + reciprocalScale * 0.42);

    return {
        x: width * 0.5 + laneX * width * 0.43 * reciprocalScale,
        y: height * 0.46 + laneY * height * 0.43 * reciprocalScale,
        depth,
        progress,
        radius: traveler.size * sizeScale,
        opacity: traveler.alpha * fadeIn * fadeOut,
        cycle,
    };
};

/** Selects no more than one approaching carrier for visible planetary detail. */
export const selectProminentSystem = (
    travelers: Traveler[],
    projections: ProjectedTraveler[],
) => {
    let selected = -1;
    let nearestProgress = -1;

    for (let index = 0; index < travelers.length; index += 1) {
        const projection = projections[index];
        if (!travelers[index].planets || projection.progress < 0.38 || projection.progress > 0.84) continue;
        if (projection.progress > nearestProgress) {
            selected = index;
            nearestProgress = projection.progress;
        }
    }

    return selected;
};

export const createSpaceScene = (seed = 0x4c4f4e47): SpaceScene => {
    const random = createSeededRandom(seed);
    const stars = Array.from({ length: DESKTOP_STAR_COUNT }, (): DistantStar => ({
        x: random(),
        y: random(),
        size: between(random, 0.8, 1.6),
        alpha: between(random, 0.52, 0.9),
        twinkleSeed: Math.floor(random() * UINT32_MAX),
    }));

    const planetColors = ['rgba(103, 181, 214, 0.78)', 'rgba(177, 128, 203, 0.7)'];
    const travelers = Array.from({ length: DESKTOP_TRAVELER_COUNT }, (_, index): Traveler => {
        const isCarrier = index % 7 === 2;
        const planetCount = isCarrier ? (random() < 0.62 ? 1 : 2) : 0;
        const planets = isCarrier
            ? Array.from({ length: planetCount }, (__, planetIndex): Planet => ({
                orbitRadius: between(random, 8.5, 12.5) + planetIndex * 8,
                radius: between(random, 0.9, 1.55),
                phase: between(random, 0, Math.PI * 2),
                color: planetColors[planetIndex],
                hasMoon: planetIndex === planetCount - 1 && random() < 0.42,
            }))
            : null;

        return {
            seed: Math.floor(random() * UINT32_MAX),
            initialDistance: random() * DEPTH_RANGE,
            speed: between(random, 21, 31),
            size: between(random, 0.65, 1.15),
            alpha: between(random, 0.48, 0.76),
            planets,
        };
    });

    return { stars, travelers };
};
