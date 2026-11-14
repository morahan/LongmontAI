/** Local screen-space perturbation of real star slots; no change to the background clock. */
export interface HolePoint { x: number; y: number }
export interface HoleBody extends HolePoint { vx: number; vy: number }
export interface HoleStar extends HoleBody { base: HolePoint; consumed: boolean; cycle?: number }
export interface HoleSource extends HolePoint { visible: boolean; id?: number; cycle?: number }
export interface HawkingSpark extends HoleBody { age: number; lifetime: number; returning: boolean }
export type HolePull = 'star' | 'jet' | 'galaxy';
export type HoleTravelerRole = 'ignored' | 'star' | 'galaxy';
export interface HoleGalaxySource extends HolePoint { id: number; cycle: number; visible: boolean; radius: number }
/** x/y are screen space during infall, then hole-relative so the stream follows a moving hole. */
export interface GalaxyAbsorption extends HoleBody {
    base: HolePoint;
    cycle: number;
    radius: number;
    phase: 'infall' | 'shredding' | 'consumed';
    /** Seconds in the current phase. */
    age: number;
}
export interface ShredParticle extends HolePoint { tail: HolePoint; heat: number; alpha: number }
export interface BlackHoleState {
    stars: Map<number, HoleStar>;
    sparks: HawkingSpark[];
    captures: number;
    recaptures: number;
    galaxies: Map<number, GalaxyAbsorption>;
    /** Completed galaxy absorptions, and seconds since the last one (Infinity before any). */
    feasts: number;
    feastAge: number;
    /** 0..1 scale of the playing finale, set by the size of the galaxy that fed it. */
    feastPower: number;
}
export const BLACK_HOLE_RADIUS = 185;
export const BLACK_HOLE_CORE = 5;
export const BLACK_HOLE_SHADOW_RADIUS = 13;
export const BLACK_HOLE_DISK_TILT = -0.14;
export const BLACK_HOLE_MAX_STARS = 192;
export const BLACK_HOLE_MAX_SPARKS = 16;
export const BLACK_HOLE_MAX_DELTA = 1 / 30;
export const BLACK_HOLE_LONG_PRESS_MS = 500;
export const BLACK_HOLE_LONG_PRESS_SLOP_PX = 10;
export const GALAXY_TIDAL_RADIUS = 70;
export const GALAXY_SHRED_SECONDS = 2.6;
export const GALAXY_FEAST_SECONDS = 2.4;
const GALAXY_STRETCH_RAMP_SECONDS = 0.3;
const GALAXY_STRETCH = 1.3;
const GALAXY_SQUEEZE = 0.9;
const GALAXY_SHRED_STAGGER = 0.4;
const GALAXY_SHRED_TURNS = 1.75;
const GALAXY_SHRED_FLATTEN = 0.3;
const GALAXY_SHRED_FADE_PX = 20;
const GALAXY_TAIL_SECONDS = 0.045;
const GALAXY_RELEASE_RATE = 5;
const TAU = Math.PI * 2;
/** Falloff 1 keeps a heavy galaxy moving from the radius edge, where the squared star pull stalls. */
const HOLE_PULLS: Record<HolePull, { strength: number; swirl: number; damping: number; falloff: number }> = {
    star: { strength: 2400, swirl: 0.16, damping: 3, falloff: 2 },
    jet: { strength: 460, swirl: 0, damping: 0, falloff: 2 },
    galaxy: { strength: 700, swirl: 0.3, damping: 3.5, falloff: 1 },
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
export const createBlackHole = (): BlackHoleState => ({
    stars: new Map(), sparks: [], captures: 0, recaptures: 0,
    galaxies: new Map(), feasts: 0, feastAge: Infinity, feastPower: 0,
});
/** The foreground planetary system is never the hole's to take, whatever its owner's variant. */
export const holeTravelerRole = (variant: string, ownsPlanetarySystem: boolean): HoleTravelerRole =>
    ownsPlanetarySystem ? 'ignored' : variant === 'star' || variant === 'galaxy' ? variant : 'ignored';
export const boundedHoleDelta = (dt: number) => Number.isFinite(dt)
    ? Math.max(0, Math.min(BLACK_HOLE_MAX_DELTA, dt)) : 0;

export function holeAcceleration(body: HolePoint, center: HolePoint, pull: HolePull = 'star'): HolePoint {
    const profile = HOLE_PULLS[pull];
    const dx = center.x - body.x;
    const dy = center.y - body.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance >= BLACK_HOLE_RADIUS) return { x: 0, y: 0 };
    const strength = profile.strength * (1 - distance / BLACK_HOLE_RADIUS) ** profile.falloff;
    // A small tangential component bends incoming trajectories without stable orbits.
    const swirl = profile.swirl * Math.min(1, distance / 60) ** 2;
    return {
        x: (dx - dy * swirl) / distance * strength,
        y: (dy + dx * swirl) / distance * strength,
    };
}

/** Substeps plus swept capture avoid skipping the tiny core, even after a stalled frame. */
export function advanceHoleBody(body: HoleBody, center: HolePoint, dt: number, pull: HolePull = 'star') {
    const result = { ...body };
    let captured = Math.hypot(result.x - center.x, result.y - center.y) <= BLACK_HOLE_CORE;
    const delta = boundedHoleDelta(dt);
    const steps = Math.max(1, Math.ceil(delta * 120));
    for (let step = 0; step < steps && !captured; step += 1) {
        const h = delta / steps;
        const acceleration = holeAcceleration(result, center, pull);
        // Accretion dissipates energy/angular momentum; otherwise swirl only slingshots stars.
        const damping = Math.exp(-HOLE_PULLS[pull].damping * h);
        result.vx = result.vx * damping + acceleration.x * h;
        result.vy = result.vy * damping + acceleration.y * h;
        const speed = Math.hypot(result.vx, result.vy);
        if (speed > 900) { result.vx *= 900 / speed; result.vy *= 900 / speed; }
        const dx = result.vx * h;
        const dy = result.vy * h;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
            ((center.x - result.x) * dx + (center.y - result.y) * dy) / lengthSquared));
        captured = Math.hypot(result.x + t * dx - center.x,
            result.y + t * dy - center.y) <= BLACK_HOLE_CORE;
        result.x += dx;
        result.y += dy;
    }
    return { body: result, captured };
}

export function createHawkingJets(center: HolePoint, sequence: number): HawkingSpark[] {
    return [-1, 1].flatMap((direction) => [true, false].map((returning) => ({
        x: center.x + (sequence % 3 - 1) * 0.6,
        y: center.y + direction * 7,
        vx: (sequence % 5 - 2) * (returning ? 1 : 4),
        vy: direction * (returning ? 65 : 280 + sequence % 3 * 15),
        age: 0,
        lifetime: returning ? 0.65 : 0.45 + sequence % 4 * 0.08,
        returning,
    })));
}

/** Distant specks earn a flicker; only a galaxy with real screen presence ignites the full quasar. */
export const galaxyFeastPower = (radius: number) => 0.15 + 0.85 * smoothstep((radius - 5) / 20);

export const holeGalaxyCenter = (galaxy: GalaxyAbsorption, center: HolePoint): HolePoint =>
    galaxy.phase === 'infall' ? { x: galaxy.x, y: galaxy.y }
        : { x: center.x + galaxy.x, y: center.y + galaxy.y };

/** Fades the galaxy's rigid details (dark core, miniature systems) as tides take hold. */
export const galaxyCohesion = (galaxy: GalaxyAbsorption) => galaxy.phase === 'infall'
    ? 1 - smoothstep(galaxy.age / GALAXY_STRETCH_RAMP_SECONDS) : 0;

/**
 * Tidal disruption of one galaxy particle. `local` is its sky-oriented offset from the galaxy
 * centre; `order` in [0, 1) staggers when it is stripped. Infall spaghettifies along the
 * galaxy-to-hole axis; shredding winds that same stretched position into the disk plane.
 */
export function shredGalaxyParticle(
    galaxy: GalaxyAbsorption,
    center: HolePoint,
    local: HolePoint,
    order: number,
): ShredParticle {
    const infall = galaxy.phase === 'infall';
    const offsetX = infall ? galaxy.x - center.x : galaxy.x;
    const offsetY = infall ? galaxy.y - center.y : galaxy.y;
    const distance = Math.hypot(offsetX, offsetY);
    const axisX = distance > 1e-6 ? -offsetX / distance : 1;
    const axisY = distance > 1e-6 ? -offsetY / distance : 0;
    // No stretch at the gravity edge, nor for a galaxy centred on the hole, which has no tidal axis.
    const stretch = smoothstep((BLACK_HOLE_RADIUS - distance) / (BLACK_HOLE_RADIUS - GALAXY_TIDAL_RADIUS))
        * smoothstep(distance / 30)
        * (infall ? clamp01(galaxy.age / GALAXY_STRETCH_RAMP_SECONDS) : 1);
    const along = (local.x * axisX + local.y * axisY) * (1 + GALAXY_STRETCH * stretch);
    const across = (local.y * axisX - local.x * axisY) / (1 + GALAXY_SQUEEZE * stretch);
    const startX = offsetX + axisX * along - axisY * across;
    const startY = offsetY + axisY * along + axisX * across;
    if (infall) {
        const point = { x: center.x + startX, y: center.y + startY };
        return { ...point, tail: point, heat: 0, alpha: 1 };
    }
    const cos = Math.cos(BLACK_HOLE_DISK_TILT);
    const sin = Math.sin(BLACK_HOLE_DISK_TILT);
    const diskX = startX * cos + startY * sin;
    const diskY = startY * cos - startX * sin;
    const startRadius = Math.hypot(diskX, diskY);
    const startAngle = Math.atan2(diskY, diskX);
    const spiral = (age: number) => {
        const progress = clamp01((age / GALAXY_SHRED_SECONDS - clamp01(order) * GALAXY_SHRED_STAGGER)
            / (1 - GALAXY_SHRED_STAGGER));
        const radius = startRadius * (1 - progress * progress);
        // Same rotational sense as the swirl; winding quickens as the orbit tightens.
        const angle = startAngle - GALAXY_SHRED_TURNS * TAU * progress ** 2.4;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle) * (1 + (GALAXY_SHRED_FLATTEN - 1) * smoothstep(progress));
        return { progress, radius, x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos };
    };
    const age = galaxy.phase === 'consumed' ? GALAXY_SHRED_SECONDS : galaxy.age;
    const now = spiral(age);
    const before = spiral(Math.max(0, age - GALAXY_TAIL_SECONDS));
    const fade = Math.min(GALAXY_SHRED_FADE_PX, startRadius - BLACK_HOLE_SHADOW_RADIUS);
    return {
        x: now.x,
        y: now.y,
        tail: { x: before.x, y: before.y },
        heat: now.progress,
        alpha: fade > 0 ? clamp01((now.radius - BLACK_HOLE_SHADOW_RADIUS) / fade) : 1 - now.progress,
    };
}

/** Infall, a fixed-length shred, then consumed until the source's lifecycle turns over. */
function stepGalaxies(
    previous: BlackHoleState,
    sources: readonly HoleGalaxySource[],
    center: HolePoint,
    delta: number,
) {
    const galaxies = new Map<number, GalaxyAbsorption>();
    let feasts = previous.feasts;
    let feastAge = previous.feastAge + delta;
    let feastPower = previous.feastPower;
    for (const source of sources) {
        if (!source.visible) continue;
        const prior = previous.galaxies.get(source.id);
        let galaxy = prior?.cycle === source.cycle ? prior : undefined;
        if (galaxy?.phase === 'consumed') { galaxies.set(source.id, galaxy); continue; }
        if (galaxy?.phase === 'shredding') {
            const consumed = galaxy.age + delta >= GALAXY_SHRED_SECONDS;
            if (consumed) {
                feasts += 1;
                const power = galaxyFeastPower(galaxy.radius);
                // A speck arriving mid-finale must not cut a bigger galaxy's quasar short.
                if (power >= feastPower * Math.max(0, 1 - feastAge / GALAXY_FEAST_SECONDS)) {
                    feastAge = 0;
                    feastPower = power;
                }
            }
            galaxies.set(source.id, consumed ? { ...galaxy, phase: 'consumed', age: 0 }
                : { ...galaxy, age: galaxy.age + delta });
            continue;
        }
        const base = { x: source.x, y: source.y };
        if (!galaxy) {
            if (Math.hypot(source.x - center.x, source.y - center.y) >= BLACK_HOLE_RADIUS) continue;
            galaxy = { ...base, vx: 0, vy: 0, base, cycle: source.cycle, radius: source.radius,
                phase: 'infall', age: 0 };
        }
        const dx = source.x - galaxy.base.x;
        const dy = source.y - galaxy.base.y;
        const continuous = Math.hypot(dx, dy) < 40;
        const body = { ...galaxy, base, age: galaxy.age + delta,
            x: galaxy.x + (continuous ? dx : 0), y: galaxy.y + (continuous ? dy : 0) };
        if (Math.hypot(body.x - center.x, body.y - center.y) >= BLACK_HOLE_RADIUS) {
            // The hole moved away: ease back onto the source track before letting go, so no pop.
            const ease = Math.exp(-GALAXY_RELEASE_RATE * delta);
            const x = source.x + (body.x - source.x) * ease;
            const y = source.y + (body.y - source.y) * ease;
            if (Math.hypot(x - source.x, y - source.y) >= 0.5) {
                galaxies.set(source.id, { ...body, x, y, vx: 0, vy: 0 });
            }
            continue;
        }
        const next = { ...body, ...advanceHoleBody(body, center, delta, 'galaxy').body };
        const offset = { x: next.x - center.x, y: next.y - center.y };
        galaxies.set(source.id, Math.hypot(offset.x, offset.y) <= GALAXY_TIDAL_RADIUS
            && next.age >= GALAXY_STRETCH_RAMP_SECONDS
            ? { ...next, ...offset, vx: 0, vy: 0, phase: 'shredding', age: 0 } : next);
    }
    return { galaxies, feasts, feastAge, feastPower };
}

/** Pure state step. Invisible sources cannot feed jets; recycled slots rejoin outside gravity. */
export function stepBlackHole(
    previous: BlackHoleState,
    sources: readonly HoleSource[],
    center: HolePoint,
    dt: number,
    galaxySources: readonly HoleGalaxySource[] = [],
): BlackHoleState {
    const delta = boundedHoleDelta(dt);
    const sourceIds = new Set(sources.map((source, index) => source.id ?? index));
    const stars = new Map([...previous.stars].filter(([id]) => sourceIds.has(id)));
    let captures = previous.captures;
    let recaptures = previous.recaptures;
    const sparks: HawkingSpark[] = [];
    for (const spark of previous.sparks.slice(0, BLACK_HOLE_MAX_SPARKS)) {
        if (spark.age + delta >= spark.lifetime) continue;
        const next = advanceHoleBody(spark, center, delta, 'jet');
        if (next.captured) { recaptures += 1; continue; }
        sparks.push({ ...spark, ...next.body, age: spark.age + delta });
    }
    sources.forEach((source, sourceIndex) => {
        const index = source.id ?? sourceIndex;
        let star = stars.get(index);
        if (!source.visible || (star && (star.cycle !== source.cycle
            || Math.hypot(source.x - star.base.x, source.y - star.base.y) > 40))) {
            stars.delete(index);
            star = undefined;
        }
        if (!source.visible) return;
        if (star?.consumed) {
            // Rejoin only outside the gravity footprint; new traveler cycles can feed it again.
            if (Math.hypot(source.x - center.x, source.y - center.y) > BLACK_HOLE_RADIUS) stars.delete(index);
            else stars.set(index, { ...star, base: source });
            return;
        }
        if (!star) {
            if (stars.size >= BLACK_HOLE_MAX_STARS
                || Math.hypot(source.x - center.x, source.y - center.y) >= BLACK_HOLE_RADIUS) return;
            star = { ...source, base: source, vx: 0, vy: 0, consumed: false };
        }
        // Keep the original drift while adding gravity. Ignore wrap/constellation teleports.
        const dx = source.x - star.base.x;
        const dy = source.y - star.base.y;
        const continuous = Math.hypot(dx, dy) < 40;
        const body = { ...star, x: star.x + (continuous ? dx : 0), y: star.y + (continuous ? dy : 0) };
        const next = advanceHoleBody(body, center, delta);
        stars.set(index, { ...next.body, base: source, consumed: next.captured, cycle: source.cycle });
        if (next.captured) {
            captures += 1;
            // Recaptured sparks do not spawn more sparks: no runaway cascade.
            if (captures % 2 === 0 && sparks.length <= BLACK_HOLE_MAX_SPARKS - 4) {
                sparks.push(...createHawkingJets(center, captures));
            }
        }
    });
    return { stars, sparks, captures, recaptures, ...stepGalaxies(previous, galaxySources, center, delta) };
}
