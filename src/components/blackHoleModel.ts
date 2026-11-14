/** Local screen-space perturbation of real star slots; no change to the background clock. */
export interface HolePoint { x: number; y: number }
export interface HoleBody extends HolePoint { vx: number; vy: number }
export interface HoleStar extends HoleBody { base: HolePoint; consumed: boolean; cycle?: number }
export interface HoleSource extends HolePoint { visible: boolean; id?: number; cycle?: number }
export interface HawkingSpark extends HoleBody { age: number; lifetime: number; returning: boolean }
export type HolePull = 'star' | 'jet' | 'galaxy';
export type HoleTravelerRole = 'ignored' | 'star' | 'galaxy';
export interface HoleGalaxySource extends HolePoint {
    id: number; cycle: number; visible: boolean; radius: number;
    /** Lifecycle progress and opacity at this instant; frozen into the absorption at capture. */
    progress: number; opacity: number;
}
/** x/y are screen space during infall, then hole-relative so the stream follows a moving hole. */
export interface GalaxyAbsorption extends HoleBody {
    cycle: number;
    radius: number;
    progress: number;
    opacity: number;
    phase: 'infall' | 'shredding' | 'consumed';
    /** Seconds in the current phase. */
    age: number;
}
/**
 * heat runs 0 (original colour) to 1 (innermost orbit); beaming scales brightness for Doppler
 * boost; front marks matter crossing in front of the shadow, which draws after the hole.
 */
export interface ShredParticle extends HolePoint {
    tail: HolePoint;
    heat: number;
    alpha: number;
    beaming: number;
    front: boolean;
}
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
export const GALAXY_SHRED_SECONDS = 3;
export const GALAXY_FEAST_SECONDS = 3.3;
/** Point-lens Einstein radius: matter behind the hole is imaged at or beyond it. */
export const BLACK_HOLE_EINSTEIN_RADIUS = BLACK_HOLE_SHADOW_RADIUS * 1.15;
export const FEAST_RIPPLE_PX = 6;
const FEAST_RIPPLE_SPEED = 300;
const FEAST_RIPPLE_WIDTH = 46;
/** A just-acquired galaxy eases into its tides instead of snapping to the proximity stretch. */
const GALAXY_ACQUIRE_SECONDS = 0.5;
const GALAXY_TIDE_CAP = 2.6;
const GALAXY_STRETCH = 1.7;
const GALAXY_SQUEEZE = 1.1;
/** Release window as a share of the shred; each particle then falls for the remainder. */
const GALAXY_SHRED_STAGGER = 0.55;
const GALAXY_SHRED_TURNS = 1.35;
const GALAXY_SHRED_DRIFT_TURNS = 0.3;
const GALAXY_SHRED_FLATTEN = 0.2;
const GALAXY_SHRED_FLING = 0.75;
const GALAXY_SHRED_FADE_PX = 16;
const GALAXY_SHRED_END_RADIUS = BLACK_HOLE_SHADOW_RADIUS * 0.6;
const GALAXY_REMNANT_SINK = 0.4;
const GALAXY_REMNANT_SWEEP = 1.1;
const GALAXY_TAIL_SECONDS = 0.11;
const GALAXY_RELEASE_RATE = 5;
const TAU = Math.PI * 2;
/** The galaxy pull keeps a floor at the radius edge, so anything acquired is always swallowed. */
const HOLE_PULLS: Record<HolePull, { strength: number; swirl: number; damping: number; falloff: number; floor: number }> = {
    star: { strength: 2400, swirl: 0.16, damping: 3, falloff: 2, floor: 0 },
    jet: { strength: 460, swirl: 0, damping: 0, falloff: 2, floor: 0 },
    galaxy: { strength: 420, swirl: 0.3, damping: 1.6, falloff: 1.5, floor: 0.12 },
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
export const createBlackHole = (): BlackHoleState => ({
    stars: new Map(), sparks: [], captures: 0, recaptures: 0,
    galaxies: new Map(), feasts: 0, feastAge: Infinity, feastPower: 0,
});
/**
 * The foreground is never the hole's to take: the planetary system, and any traveler close enough
 * to read as a world rather than a point of light. Those pass in front of the hole instead.
 */
export const holeTravelerRole = (
    variant: string, ownsPlanetarySystem: boolean, nearBody = false,
): HoleTravelerRole => ownsPlanetarySystem ? 'ignored'
    : variant === 'galaxy' ? 'galaxy' : variant === 'star' && !nearBody ? 'star' : 'ignored';
export const boundedHoleDelta = (dt: number) => Number.isFinite(dt)
    ? Math.max(0, Math.min(BLACK_HOLE_MAX_DELTA, dt)) : 0;

export function holeAcceleration(body: HolePoint, center: HolePoint, pull: HolePull = 'star'): HolePoint {
    const profile = HOLE_PULLS[pull];
    const dx = center.x - body.x;
    const dy = center.y - body.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance >= BLACK_HOLE_RADIUS) return { x: 0, y: 0 };
    const strength = profile.strength
        * Math.max(profile.floor, (1 - distance / BLACK_HOLE_RADIUS) ** profile.falloff);
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

/** Every swallowed galaxy earns a grand finale; size only decides how grand. */
export const galaxyFeastPower = (radius: number) => 0.6 + 0.4 * smoothstep((radius - 5) / 20);

export const holeGalaxyCenter = (galaxy: GalaxyAbsorption, center: HolePoint): HolePoint =>
    galaxy.phase === 'infall' ? { x: galaxy.x, y: galaxy.y }
        : { x: center.x + galaxy.x, y: center.y + galaxy.y };

/**
 * Tidal strength at a distance from the hole: inverse cube like a real tide, normalised to 0 at
 * the gravity edge and 1 at the tidal radius, and zero at the centre, which has no tidal axis.
 */
export const galaxyTide = (distance: number) => {
    const edge = (GALAXY_TIDAL_RADIUS / BLACK_HOLE_RADIUS) ** 3;
    const tide = ((GALAXY_TIDAL_RADIUS / Math.max(distance, 1e-6)) ** 3 - edge) / (1 - edge);
    return Math.min(GALAXY_TIDE_CAP, Math.max(0, tide)) * smoothstep(distance / 30);
};

const infallTide = (galaxy: GalaxyAbsorption, center: HolePoint) =>
    galaxyTide(Math.hypot(galaxy.x - center.x, galaxy.y - center.y))
        * smoothstep(galaxy.age / GALAXY_ACQUIRE_SECONDS);

/** Fades the galaxy's rigid details (dark core, miniature systems) as tides take hold. */
export const galaxyCohesion = (galaxy: GalaxyAbsorption, center: HolePoint) => galaxy.phase === 'infall'
    ? 1 - smoothstep(infallTide(galaxy, center) / 0.8) : 0;

/** Share of a shredding galaxy's matter already through the horizon. */
export const galaxySwallowed = (galaxy: GalaxyAbsorption) => {
    if (galaxy.phase !== 'shredding') return galaxy.phase === 'consumed' ? 1 : 0;
    const plunge = (1 - GALAXY_SHRED_STAGGER) * 0.8;
    return clamp01((galaxy.age / GALAXY_SHRED_SECONDS - plunge) / (1 - plunge));
};

/** Point-lens primary image radius; always at or beyond the Einstein radius, so never in the shadow. */
export const lensRadius = (radius: number) =>
    (radius + Math.sqrt(radius * radius + 4 * BLACK_HOLE_EINSTEIN_RADIUS ** 2)) / 2;

const preHeat = (tide: number) => 0.3 * Math.min(1, tide / GALAXY_TIDE_CAP);

/** A body point under tides: stretched along the hole axis and squeezed across it. */
const tidalPoint = (offset: HolePoint, along: number, across: number, tide: number): HolePoint => {
    const distance = Math.hypot(offset.x, offset.y);
    const axisX = distance > 1e-6 ? -offset.x / distance : 1;
    const axisY = distance > 1e-6 ? -offset.y / distance : 0;
    const a = along * (1 + GALAXY_STRETCH * tide);
    const c = across / (1 + GALAXY_SQUEEZE * tide);
    return { x: offset.x + axisX * a - axisY * c, y: offset.y + axisY * a + axisX * c };
};

/**
 * Tidal disruption of one galaxy particle. `local` is its sky-oriented offset from the galaxy
 * centre and `jitter` in [0, 1) a per-particle hash. Infall stretches the body along the hole
 * axis with an inverse-cube tide. Shredding keeps the tidally locked remnant orbiting and sinking
 * while near-side matter peels off first; far-side matter is flung outward into a fainter tail
 * before it falls back. Released matter spirals in with Kepler-like winding, flattens into the
 * tilted disk, heats, is Doppler beamed, and is lensed around the shadow when it passes behind.
 */
export function shredGalaxyParticle(
    galaxy: GalaxyAbsorption,
    center: HolePoint,
    local: HolePoint,
    jitter: number,
): ShredParticle {
    if (galaxy.phase === 'infall') {
        const offset = { x: galaxy.x - center.x, y: galaxy.y - center.y };
        const tide = infallTide(galaxy, center);
        const distance = Math.hypot(offset.x, offset.y);
        const axisX = distance > 1e-6 ? -offset.x / distance : 1;
        const axisY = distance > 1e-6 ? -offset.y / distance : 0;
        const body = tidalPoint(offset, local.x * axisX + local.y * axisY, local.y * axisX - local.x * axisY, tide);
        const at = { x: center.x + body.x, y: center.y + body.y };
        return { ...at, tail: at, heat: preHeat(tide), alpha: 1, beaming: 1, front: false };
    }
    const startDistance = Math.hypot(galaxy.x, galaxy.y);
    const axisX = startDistance > 1e-6 ? -galaxy.x / startDistance : 1;
    const axisY = startDistance > 1e-6 ? -galaxy.y / startDistance : 0;
    const along = local.x * axisX + local.y * axisY;
    const across = local.y * axisX - local.x * axisY;
    const startAngle = Math.atan2(galaxy.y, galaxy.x);
    const remnant = (s: number) => {
        const radius = startDistance * (1 - GALAXY_REMNANT_SINK * s * s);
        const angle = startAngle - GALAXY_REMNANT_SWEEP * s;
        const tide = galaxyTide(radius);
        return { tide, point: tidalPoint({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) }, along, across, tide) };
    };
    const side = Math.max(-1, Math.min(1, along / Math.max(1e-6, galaxy.radius)));
    const releaseAt = GALAXY_SHRED_STAGGER * (0.72 * (1 - side) / 2 + 0.28 * clamp01(jitter));
    const released = remnant(releaseAt);
    const releaseHeat = preHeat(released.tide);
    const cos = Math.cos(BLACK_HOLE_DISK_TILT);
    const sin = Math.sin(BLACK_HOLE_DISK_TILT);
    const diskX = released.point.x * cos + released.point.y * sin;
    const diskY = released.point.y * cos - released.point.x * sin;
    const r0 = Math.hypot(diskX, diskY);
    const theta0 = Math.atan2(diskY, diskX);
    const rEnd = GALAXY_SHRED_END_RADIUS;
    const winding = Math.max(1e-6, (r0 / rEnd) - 1);
    const fling = GALAXY_SHRED_FLING * Math.max(0, -side);
    const fade = Math.min(GALAXY_SHRED_FADE_PX, r0 - BLACK_HOLE_SHADOW_RADIUS);
    const fall = 1 - GALAXY_SHRED_STAGGER;
    const at = (age: number) => {
        const s = clamp01(age / GALAXY_SHRED_SECONDS);
        if (s <= releaseAt) {
            const { tide, point } = remnant(s);
            return { x: point.x, y: point.y, heat: preHeat(tide), alpha: 1, beaming: 1, front: false };
        }
        const p = clamp01((s - releaseAt) / fall);
        const settled = rEnd + (r0 - rEnd) * (1 - p * p);
        const bump = 6.75 * p * (1 - p) ** 2;
        const radius = settled * (1 + fling * bump);
        // Kepler-like: angular speed climbs as the orbit tightens; flung matter lags behind.
        const angle = theta0 - TAU * (GALAXY_SHRED_DRIFT_TURNS * p
            + GALAXY_SHRED_TURNS * (r0 / radius - 1) / winding);
        const flat = smoothstep(p / 0.6);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle) * (1 + (GALAXY_SHRED_FLATTEN - 1) * flat);
        // The far half (negative disk y) is imaged around the shadow rather than hidden by it.
        const behind = flat * smoothstep(-Math.sin(angle) * 2.5);
        const projected = Math.hypot(x, y);
        const front = flat > 0.3 && Math.sin(angle) > 0;
        // Near-horizon matter in front is deeply redshifted, so it only veils the shadow faintly.
        const veil = front ? 0.12 + 0.88 * smoothstep((projected - BLACK_HOLE_SHADOW_RADIUS * 0.8)
            / (BLACK_HOLE_SHADOW_RADIUS * 0.4)) : 1;
        const lensed = projected > 1e-6 ? (projected + behind * (lensRadius(projected) - projected)) / projected : 1;
        const lx = x * lensed;
        const ly = y * lensed;
        return {
            x: lx * cos - ly * sin,
            y: lx * sin + ly * cos,
            heat: releaseHeat + (1 - releaseHeat) * p ** 1.2,
            alpha: (fade > 0 ? clamp01((settled - BLACK_HOLE_SHADOW_RADIUS) / fade) : 1 - p)
                * (1 - 0.5 * Math.min(1, fling * bump)) * veil,
            // Approaching (left) limb brightens, receding limb dims, as in the disk.
            beaming: 1 - 0.6 * flat * Math.cos(angle),
            front,
        };
    };
    const age = galaxy.phase === 'consumed' ? GALAXY_SHRED_SECONDS : galaxy.age;
    const now = at(age);
    const before = at(Math.max(0, age - GALAXY_TAIL_SECONDS));
    return {
        x: center.x + now.x,
        y: center.y + now.y,
        tail: { x: center.x + before.x, y: center.y + before.y },
        heat: now.heat,
        alpha: now.alpha,
        beaming: now.beaming,
        front: now.front,
    };
}

/**
 * Finale shockwave in space-time: displaces a drawn point radially inside an expanding ring.
 * Display only, and the identical point back whenever no finale is playing.
 */
export function feastRipple<T extends HolePoint>(state: BlackHoleState, center: HolePoint, point: T): T {
    const t = state.feastAge / GALAXY_FEAST_SECONDS;
    if (!(t >= 0 && t < 1) || state.feastPower <= 0) return point;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) return point;
    const ring = BLACK_HOLE_SHADOW_RADIUS + FEAST_RIPPLE_SPEED * state.feastAge;
    const u = (distance - ring) / FEAST_RIPPLE_WIDTH;
    if (Math.abs(u) > 3) return point;
    // A unit-peak Gaussian-derivative wavelet: the crest pushes out, the trough behind pulls in.
    const wave = u * Math.exp((1 - u * u) / 2);
    const push = FEAST_RIPPLE_PX * state.feastPower * (1 - t) ** 1.5 * wave;
    return { ...point, x: point.x + dx / distance * push, y: point.y + dy / distance * push };
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
        const prior = previous.galaxies.get(source.id);
        // A capture in progress outlives its source fading out or recycling: near galaxies move
        // fast and leave the scene within seconds, and the hole must still finish them.
        let galaxy = prior && (prior.cycle === source.cycle || prior.phase !== 'consumed') ? prior : undefined;
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
            if (!consumed) galaxies.set(source.id, { ...galaxy, age: galaxy.age + delta });
            // Nothing to remember once the source has moved on to its next lifecycle.
            else if (galaxy.cycle === source.cycle) galaxies.set(source.id, { ...galaxy, phase: 'consumed', age: 0 });
            continue;
        }
        if (!galaxy) {
            if (!source.visible
                || Math.hypot(source.x - center.x, source.y - center.y) >= BLACK_HOLE_RADIUS) continue;
            galaxy = { x: source.x, y: source.y, vx: 0, vy: 0, cycle: source.cycle, radius: source.radius,
                progress: source.progress, opacity: source.opacity, phase: 'infall', age: 0 };
        }
        // Captured: the source's own drift no longer applies, so only the hole leaving can free it.
        const body = { ...galaxy, age: galaxy.age + delta };
        if (Math.hypot(body.x - center.x, body.y - center.y) >= BLACK_HOLE_RADIUS) {
            // The hole moved away: ease back onto the source track before letting go, so no pop.
            if (!source.visible || galaxy.cycle !== source.cycle) continue;
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
            && next.age >= GALAXY_ACQUIRE_SECONDS
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
