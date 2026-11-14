import {
    BLACK_HOLE_DISK_TILT, BLACK_HOLE_RADIUS, BLACK_HOLE_SHADOW_RADIUS, GALAXY_FEAST_SECONDS,
    GALAXY_SHRED_SECONDS, galaxyFeastPower, galaxySwallowed,
    type BlackHoleState, type HolePoint,
} from './blackHoleModel.ts';

const TAU = Math.PI * 2;
export const BLACK_HOLE_OPEN_SECONDS = 0.55;
export const BLACK_HOLE_FLASH_SECONDS = 0.6;
const QUASAR_JET_LENGTH = 420;
const QUASAR_JET_PUNCH = 0.16;
const QUASAR_KNOTS = 5;
const PLUNGE_FLASH = 0.14;
const RIPPLE_SPEED = 300;
const DISK_FLATTEN = 0.17;
const DISK_INNER_RADIUS = 15.5;
const DISK_OUTER_RADIUS = 48;
const DISK_STREAK_COUNT = 18;
const SPARK_COLORS = ['189, 233, 255', '249, 217, 183', '215, 203, 255'] as const;

export interface BlackHoleView {
    /** Seconds since the hole opened; drives the bloom-in. */
    age: number;
    /** Background clock in seconds; drives disk rotation and shimmer. */
    time: number;
    /** Seconds since the most recent capture, or Infinity before the first one. */
    flashAge: number;
}

const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Relativistic beaming: the approaching (left) limb is brighter and whiter than the receding one. */
const dopplerStroke = (ctx: CanvasRenderingContext2D, extent: number, rgb: string, alpha: number) => {
    const gradient = ctx.createLinearGradient(-extent, 0, extent, 0);
    gradient.addColorStop(0, `rgba(255, 252, 244, ${Math.min(1, alpha * 1.35)})`);
    gradient.addColorStop(0.45, `rgba(${rgb}, ${alpha})`);
    gradient.addColorStop(1, `rgba(214, 96, 48, ${alpha * 0.3})`);
    return gradient;
};

/** Infalling bodies stretch into tails pointing back along their path. */
const drawInfallStreaks = (ctx: CanvasRenderingContext2D, state: BlackHoleState, center: HolePoint) => {
    ctx.lineCap = 'round';
    ctx.lineWidth = 1;
    for (const star of state.stars.values()) {
        if (star.consumed) continue;
        const speed = Math.hypot(star.vx, star.vy);
        const distance = Math.hypot(star.x - center.x, star.y - center.y);
        if (speed < 30 || distance >= BLACK_HOLE_RADIUS) continue;
        const length = Math.min(30, speed * 0.05);
        const tailX = star.x - star.vx / speed * length;
        const tailY = star.y - star.vy / speed * length;
        const alpha = Math.min(0.75, speed / 420) * (1 - distance / BLACK_HOLE_RADIUS) ** 0.5;
        const tail = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
        tail.addColorStop(0, `rgba(255, 238, 214, ${alpha})`);
        tail.addColorStop(1, 'rgba(255, 170, 110, 0)');
        ctx.strokeStyle = tail;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
    }
};

/** One half of the tilted disk; the far half is drawn before the shadow, the near half after it. */
const drawDiskHalf = (ctx: CanvasRenderingContext2D, near: boolean, time: number, glow: number, swell: number) => {
    ctx.save();
    ctx.scale(swell, swell);
    ctx.beginPath();
    ctx.rect(-DISK_OUTER_RADIUS - 8, near ? 0 : -DISK_OUTER_RADIUS, (DISK_OUTER_RADIUS + 8) * 2, DISK_OUTER_RADIUS);
    ctx.clip();
    // Circles under a flattened transform give a true projected disk.
    ctx.scale(1, DISK_FLATTEN);
    ctx.beginPath();
    ctx.arc(0, 0, DISK_OUTER_RADIUS, 0, TAU);
    ctx.arc(0, 0, DISK_INNER_RADIUS, 0, TAU, true);
    ctx.clip();
    // Inner gas is hottest: white-gold cooling to ember red at the rim.
    const heat = ctx.createRadialGradient(0, 0, DISK_INNER_RADIUS, 0, 0, DISK_OUTER_RADIUS);
    heat.addColorStop(0, `rgba(255, 244, 226, ${Math.min(1, 0.78 * glow)})`);
    heat.addColorStop(0.16, `rgba(255, 214, 150, ${0.58 * glow})`);
    heat.addColorStop(0.42, `rgba(255, 158, 84, ${0.36 * glow})`);
    heat.addColorStop(0.72, `rgba(214, 92, 52, ${0.16 * glow})`);
    heat.addColorStop(1, 'rgba(160, 50, 40, 0)');
    ctx.fillStyle = heat;
    ctx.fillRect(-DISK_OUTER_RADIUS, -DISK_OUTER_RADIUS, DISK_OUTER_RADIUS * 2, DISK_OUTER_RADIUS * 2);
    // Relativistic beaming: the approaching (left) limb outshines the receding one.
    const beam = ctx.createRadialGradient(-24, 0, 0, -24, 0, 30);
    beam.addColorStop(0, `rgba(255, 250, 238, ${Math.min(1, 0.62 * glow)})`);
    beam.addColorStop(1, 'rgba(255, 220, 170, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(-DISK_OUTER_RADIUS, -DISK_OUTER_RADIUS, DISK_OUTER_RADIUS * 2, DISK_OUTER_RADIUS * 2);
    // Keplerian shimmer: inner clumps lap the outer ones.
    ctx.lineCap = 'round';
    for (let index = 0; index < DISK_STREAK_COUNT; index += 1) {
        const radius = DISK_INNER_RADIUS + 1 + (index * 7.3) % 28;
        // Same orbital sense as the beaming: the left limb moves toward the viewer.
        const angle = index * 2.399 - time * 2.4 * (16 / radius) ** 1.5;
        const twinkle = 0.55 + 0.45 * Math.sin(time * 1.7 + index * 1.9);
        ctx.strokeStyle = dopplerStroke(ctx, DISK_OUTER_RADIUS, '255, 236, 200',
            0.34 * twinkle * glow * (1 - (radius - DISK_INNER_RADIUS) / 40));
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, radius, angle, angle + 0.3 + (index % 4) * 0.16);
        ctx.stroke();
    }
    ctx.restore();
};

/** Twin relativistic jets punch out along the disk axis, ending in hotspots inside swelling lobes. */
const drawQuasarJets = (ctx: CanvasRenderingContext2D, t: number, power: number) => {
    const length = QUASAR_JET_LENGTH * (0.45 + 0.55 * power);
    const reach = length * easeOutCubic(Math.min(1, t / QUASAR_JET_PUNCH));
    const fade = (1 - t) ** 1.3 * (0.55 + 0.45 * power);
    const start = BLACK_HOLE_SHADOW_RADIUS * 0.6;
    if (reach <= start) return;
    ctx.lineCap = 'round';
    for (const direction of [-1, 1]) {
        const end = direction * reach;
        const sheath = ctx.createLinearGradient(0, direction * start, 0, end);
        sheath.addColorStop(0, `rgba(176, 156, 255, ${0.55 * fade})`);
        sheath.addColorStop(0.6, `rgba(112, 140, 255, ${0.22 * fade})`);
        sheath.addColorStop(1, `rgba(90, 120, 255, ${0.08 * fade})`);
        ctx.fillStyle = sheath;
        ctx.beginPath();
        ctx.moveTo(-3.5, direction * start);
        ctx.lineTo(-14, end);
        ctx.lineTo(14, end);
        ctx.lineTo(3.5, direction * start);
        ctx.closePath();
        ctx.fill();
        const core = ctx.createLinearGradient(0, direction * start, 0, end);
        core.addColorStop(0, `rgba(250, 252, 255, ${fade})`);
        core.addColorStop(0.7, `rgba(196, 226, 255, ${0.7 * fade})`);
        core.addColorStop(1, `rgba(160, 200, 255, ${0.25 * fade})`);
        ctx.strokeStyle = core;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, direction * start);
        ctx.lineTo(0, end);
        ctx.stroke();
        for (let knot = 0; knot < QUASAR_KNOTS; knot += 1) {
            const travel = (t * 2.2 - knot * 0.16) % 1;
            const distance = start + (reach - start) * travel;
            if (t * 2.2 < knot * 0.16 || travel >= 1) continue;
            ctx.fillStyle = `rgba(236, 246, 255, ${0.95 * fade * (1 - 0.6 * travel)})`;
            ctx.beginPath();
            ctx.arc(0, direction * distance, 2.6 - knot * 0.3, 0, TAU);
            ctx.fill();
        }
        // The jet head rams the intergalactic medium: a hotspot inside a swelling radio lobe.
        const lobe = 10 + 34 * power * easeOutCubic(Math.min(1, t / 0.6));
        const lobeGlow = ctx.createRadialGradient(0, end, 0, 0, end, lobe);
        lobeGlow.addColorStop(0, `rgba(244, 238, 255, ${0.85 * fade})`);
        lobeGlow.addColorStop(0.25, `rgba(186, 160, 255, ${0.32 * fade})`);
        lobeGlow.addColorStop(1, 'rgba(120, 110, 255, 0)');
        ctx.fillStyle = lobeGlow;
        ctx.beginPath();
        ctx.arc(0, end, lobe, 0, TAU);
        ctx.fill();
    }
};

/** An equatorial shock in the disk plane, a spherical bloom, and the visible space-time ripple front. */
const drawFeastShock = (ctx: CanvasRenderingContext2D, age: number, power: number) => {
    const t = age / GALAXY_FEAST_SECONDS;
    const shadow = BLACK_HOLE_SHADOW_RADIUS;
    const span = BLACK_HOLE_RADIUS * (0.6 + 0.8 * power);
    const fade = (1 - t) ** 1.5 * power;
    ctx.save();
    ctx.scale(1, DISK_FLATTEN);
    const radius = shadow + (span - shadow) * easeOutCubic(Math.min(1, t * 1.4));
    for (const [width, alpha] of [[18, 0.1], [4, 0.34], [1.2, 0.7]] as const) {
        ctx.strokeStyle = `rgba(255, 226, 186, ${alpha * fade})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.stroke();
    }
    ctx.restore();
    const bloom = shadow + span * 0.7 * easeOutCubic(Math.min(1, t * 1.6));
    for (const [width, alpha] of [[10, 0.06], [1.4, 0.2]] as const) {
        ctx.strokeStyle = `rgba(196, 210, 255, ${alpha * power * (1 - t) ** 2})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, bloom, 0, TAU);
        ctx.stroke();
    }
    const ripple = shadow + RIPPLE_SPEED * age;
    for (const [width, alpha] of [[12, 0.035], [1, 0.12]] as const) {
        ctx.strokeStyle = `rgba(200, 215, 255, ${alpha * power * (1 - t) ** 1.5})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, ripple, 0, TAU);
        ctx.stroke();
    }
};

/** The last matter crosses the photon ring: a ring-hugging flash before the jets fire. */
const drawPlungeFlash = (ctx: CanvasRenderingContext2D, age: number, power: number) => {
    const flash = (1 - age / PLUNGE_FLASH) ** 2 * power;
    const shadow = BLACK_HOLE_SHADOW_RADIUS;
    const ring = ctx.createRadialGradient(0, 0, shadow, 0, 0, shadow + 26);
    ring.addColorStop(0, `rgba(255, 255, 255, ${flash})`);
    ring.addColorStop(0.2, `rgba(214, 232, 255, ${0.6 * flash})`);
    ring.addColorStop(1, 'rgba(160, 190, 255, 0)');
    ctx.fillStyle = ring;
    // An annulus: the gradient would otherwise paint its inner colour across the shadow.
    ctx.beginPath();
    ctx.arc(0, 0, shadow + 26, 0, TAU);
    ctx.arc(0, 0, shadow, 0, TAU, true);
    ctx.fill();
};

/**
 * Shadow, photon ring, lensed halo, and a tilted Doppler-beamed accretion disk.
 * A shredding galaxy feeds the disk; a finished one ignites a brief quasar.
 * Display only: capture physics stays in blackHoleModel.
 */
export function drawBlackHole(
    ctx: CanvasRenderingContext2D,
    state: BlackHoleState,
    center: HolePoint,
    view: BlackHoleView,
) {
    const opening = Math.max(0, Math.min(1, view.age / BLACK_HOLE_OPEN_SECONDS));
    const scale = Math.max(0.001, easeOutBack(opening));
    const flash = view.flashAge < BLACK_HOLE_FLASH_SECONDS
        ? (1 - view.flashAge / BLACK_HOLE_FLASH_SECONDS) ** 2 : 0;
    let feed = 0;
    for (const galaxy of state.galaxies.values()) {
        if (galaxy.phase === 'shredding') {
            // The disk brightens as matter arrives and grows with what has actually gone in.
            const arrived = 0.35 * Math.min(1, galaxy.age / GALAXY_SHRED_SECONDS) + 0.65 * galaxySwallowed(galaxy);
            feed = Math.max(feed, arrived * galaxyFeastPower(galaxy.radius));
        }
    }
    const feast = state.feastAge < GALAXY_FEAST_SECONDS ? state.feastAge / GALAXY_FEAST_SECONDS : 1;
    const surge = (1 - feast) ** 2 * state.feastPower;
    const afterglow = (1 - feast) ** 0.6 * state.feastPower;
    const glow = opening * (1 + 0.55 * flash + 1.1 * feed + 1.6 * surge + 0.6 * afterglow);
    const swell = 1 + 0.4 * feed + 0.35 * surge + 0.25 * afterglow;
    const shadow = BLACK_HOLE_SHADOW_RADIUS;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawInfallStreaks(ctx, state, center);

    ctx.translate(center.x, center.y);
    ctx.rotate(BLACK_HOLE_DISK_TILT);
    ctx.scale(scale, scale);

    // Slowly iridescent haze so the hole feels alive even with nothing falling in.
    const breath = 1 + 0.05 * Math.sin(view.time * 1.3);
    const hue = 222 + 36 * Math.sin(view.time * 0.37);
    const haze = ctx.createRadialGradient(0, 0, shadow, 0, 0, 78 * breath);
    haze.addColorStop(0, `hsla(${hue}, 95%, 72%, ${0.13 * glow})`);
    haze.addColorStop(0.4, `hsla(${hue + 48}, 90%, 66%, ${0.05 * glow})`);
    haze.addColorStop(1, 'hsla(260, 90%, 60%, 0)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(0, 0, 78 * breath, 0, TAU);
    ctx.fill();

    const flare = (1 - Math.min(1, feast / 0.35)) ** 2 * state.feastPower;
    if (flare > 0) {
        const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
        bloom.addColorStop(0, `rgba(255, 255, 255, ${flare})`);
        bloom.addColorStop(0.3, `rgba(220, 230, 255, ${0.35 * flare})`);
        bloom.addColorStop(1, 'rgba(200, 210, 255, 0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(0, 0, 90, 0, TAU);
        ctx.fill();
    }

    drawDiskHalf(ctx, false, view.time, glow, swell);

    // The disk's far side, bent over and under the shadow by gravity.
    const halo = ctx.createRadialGradient(0, 0, shadow, 0, 0, shadow + 13);
    halo.addColorStop(0, `rgba(255, 238, 206, ${Math.min(1, 0.8 * glow)})`);
    halo.addColorStop(0.22, `rgba(255, 200, 132, ${0.4 * glow})`);
    halo.addColorStop(0.6, `rgba(236, 130, 80, ${0.1 * glow})`);
    halo.addColorStop(1, 'rgba(200, 90, 60, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, shadow + 13, 0, TAU);
    ctx.fill();

    // Polar jets, in the disk frame so they stay perpendicular to it and emerge from behind the shadow.
    ctx.lineCap = 'round';
    state.sparks.forEach((spark, index) => {
        const x = spark.x - center.x;
        const y = spark.y - center.y;
        const fade = 1 - spark.age / spark.lifetime;
        const rgb = SPARK_COLORS[index % SPARK_COLORS.length];
        for (const [width, alpha] of [[3.2, 0.16], [1.1, 0.85]] as const) {
            ctx.strokeStyle = `rgba(${rgb}, ${alpha * fade})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - spark.vx * 0.035, y - spark.vy * 0.035);
            ctx.stroke();
        }
    });
    if (feast < 1) drawQuasarJets(ctx, feast, state.feastPower);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, shadow, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = dopplerStroke(ctx, shadow, '255, 250, 240', Math.min(1, 0.9 * glow));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, shadow + 0.6, 0, TAU);
    ctx.stroke();

    drawDiskHalf(ctx, true, view.time, glow, swell);

    if (flash > 0) {
        const radius = shadow + 4 + 48 * view.flashAge / BLACK_HOLE_FLASH_SECONDS;
        for (const [width, alpha] of [[7, 0.07], [1.2, 0.2]] as const) {
            ctx.strokeStyle = `rgba(210, 228, 255, ${alpha * flash})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, TAU);
            ctx.stroke();
        }
    }
    if (state.feastAge < PLUNGE_FLASH) drawPlungeFlash(ctx, state.feastAge, state.feastPower);
    if (feast < 1) drawFeastShock(ctx, state.feastAge, state.feastPower);

    ctx.restore();
}
