export const DESKTOP_STAR_COUNT = 45;
export const MOBILE_STAR_COUNT = 30;
export const MOBILE_BREAKPOINT = 640;
export const SYSTEM_CYCLE_SECONDS = 48;
export const SYSTEM_VISIBLE_SECONDS = 15;

export interface DistantStar {
    x: number;
    y: number;
    size: number;
    alpha: number;
    driftX: number;
    driftY: number;
    twinklePhase: number;
    twinkleRate: number;
}

export interface Planet {
    orbitRadius: number;
    radius: number;
    phase: number;
    color: string;
    hasMoon: boolean;
}

export interface PlanetarySystem {
    x: number;
    y: number;
    phase: number;
    planets: Planet[];
}

export interface SpaceScene {
    stars: DistantStar[];
    system: PlanetarySystem;
}

const UINT32_MAX = 4294967296;

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

export const starCountForWidth = (width: number) =>
    width < MOBILE_BREAKPOINT ? MOBILE_STAR_COUNT : DESKTOP_STAR_COUNT;

export const createSpaceScene = (seed = 0x4c4f4e47): SpaceScene => {
    const random = createSeededRandom(seed);
    const stars = Array.from({ length: DESKTOP_STAR_COUNT }, (): DistantStar => ({
        x: random(),
        y: random(),
        size: between(random, 0.48, 1.18),
        alpha: between(random, 0.34, 0.74),
        driftX: between(random, -0.000035, 0.000035),
        driftY: between(random, -0.000025, 0.000025),
        twinklePhase: between(random, 0, Math.PI * 2),
        twinkleRate: between(random, 0.22, 0.62),
    }));

    const leftSide = random() < 0.5;
    const planetCount = random() < 0.58 ? 1 : 2;
    const planetColors = ['rgba(103, 181, 214, 0.7)', 'rgba(177, 128, 203, 0.62)'];
    const planets = Array.from({ length: planetCount }, (_, index): Planet => ({
        orbitRadius: between(random, 10, 15) + index * 10,
        radius: between(random, 1.05, 1.8),
        phase: between(random, 0, Math.PI * 2),
        color: planetColors[index],
        hasMoon: index === planetCount - 1 && random() < 0.46,
    }));

    return {
        stars,
        system: {
            x: leftSide ? between(random, 0.14, 0.32) : between(random, 0.68, 0.86),
            y: between(random, 0.14, 0.48),
            phase: between(random, 0, Math.PI * 2),
            planets,
        },
    };
};

const cycleRandom = (cycle: number) => {
    let value = (cycle + 1) * 0x9e3779b1;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    return ((value ^ (value >>> 15)) >>> 0) / UINT32_MAX;
};

export interface SystemAppearance {
    opacity: number;
    scale: number;
    orbitAngle: number;
}

export const getSystemAppearance = (elapsedSeconds: number): SystemAppearance | null => {
    const cycle = Math.floor(elapsedSeconds / SYSTEM_CYCLE_SECONDS);
    const cycleTime = elapsedSeconds - cycle * SYSTEM_CYCLE_SECONDS;

    // Leave the opening cycle as an undisturbed star field. After that, only about
    // one in three cycles contains a system, and each cycle can hold only one.
    if (cycle === 0 || cycleRandom(cycle) >= 0.34 || cycleTime >= SYSTEM_VISIBLE_SECONDS) return null;

    const progress = cycleTime / SYSTEM_VISIBLE_SECONDS;
    const fadeIn = Math.min(1, progress / 0.2);
    const fadeOut = Math.min(1, (1 - progress) / 0.34);
    const opacity = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.42;
    const easedApproach = 1 - Math.pow(1 - progress, 2);

    return {
        opacity,
        scale: 0.32 + easedApproach * 1.18,
        orbitAngle: elapsedSeconds * 0.055,
    };
};
