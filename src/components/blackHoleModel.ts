/** Local screen-space perturbation of real star slots; no change to the background clock. */
export interface HolePoint { x: number; y: number }
export interface HoleBody extends HolePoint { vx: number; vy: number }
export interface HoleStar extends HoleBody { base: HolePoint; consumed: boolean; cycle?: number }
export interface HoleSource extends HolePoint { visible: boolean; id?: number; cycle?: number }
export interface HawkingSpark extends HoleBody { age: number; lifetime: number; returning: boolean }
export interface BlackHoleState {
    stars: Map<number, HoleStar>;
    sparks: HawkingSpark[];
    captures: number;
    recaptures: number;
}
export const BLACK_HOLE_RADIUS = 185;
export const BLACK_HOLE_CORE = 5;
export const BLACK_HOLE_MAX_STARS = 192;
export const BLACK_HOLE_MAX_SPARKS = 32;
export const BLACK_HOLE_MAX_DELTA = 1 / 30;
export const createBlackHole = (): BlackHoleState => ({
    stars: new Map(), sparks: [], captures: 0, recaptures: 0,
});
export const boundedHoleDelta = (dt: number) => Number.isFinite(dt)
    ? Math.max(0, Math.min(BLACK_HOLE_MAX_DELTA, dt)) : 0;

export function holeAcceleration(body: HolePoint, center: HolePoint, jet = false): HolePoint {
    const dx = center.x - body.x;
    const dy = center.y - body.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance >= BLACK_HOLE_RADIUS) return { x: 0, y: 0 };
    const strength = (jet ? 460 : 2400) * (1 - distance / BLACK_HOLE_RADIUS) ** 2;
    // A small tangential component bends incoming trajectories without stable orbits.
    const swirl = jet ? 0 : 0.16 * Math.min(1, distance / 60) ** 2;
    return {
        x: (dx - dy * swirl) / distance * strength,
        y: (dy + dx * swirl) / distance * strength,
    };
}

/** Substeps plus swept capture avoid skipping the tiny core, even after a stalled frame. */
export function advanceHoleBody(body: HoleBody, center: HolePoint, dt: number, jet = false) {
    const result = { ...body };
    let captured = Math.hypot(result.x - center.x, result.y - center.y) <= BLACK_HOLE_CORE;
    const delta = boundedHoleDelta(dt);
    const steps = Math.max(1, Math.ceil(delta * 120));
    for (let step = 0; step < steps && !captured; step += 1) {
        const h = delta / steps;
        const acceleration = holeAcceleration(result, center, jet);
        // Accretion dissipates energy/angular momentum; otherwise swirl only slingshots stars.
        const damping = jet ? 1 : Math.exp(-3 * h);
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

/** Pure state step. Invisible sources cannot feed jets; recycled slots rejoin outside gravity. */
export function stepBlackHole(
    previous: BlackHoleState,
    sources: readonly HoleSource[],
    center: HolePoint,
    dt: number,
): BlackHoleState {
    const delta = boundedHoleDelta(dt);
    const sourceIds = new Set(sources.map((source, index) => source.id ?? index));
    const stars = new Map([...previous.stars].filter(([id]) => sourceIds.has(id)));
    let captures = previous.captures;
    let recaptures = previous.recaptures;
    const sparks: HawkingSpark[] = [];
    for (const spark of previous.sparks.slice(0, BLACK_HOLE_MAX_SPARKS)) {
        if (spark.age + delta >= spark.lifetime) continue;
        const next = advanceHoleBody(spark, center, delta, true);
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
            if (sparks.length <= BLACK_HOLE_MAX_SPARKS - 4) sparks.push(...createHawkingJets(center, captures));
        }
    });
    return { stars, sparks, captures, recaptures };
}
