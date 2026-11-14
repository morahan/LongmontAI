import {
    BLACK_HOLE_DISK_TILT, BLACK_HOLE_RADIUS, BLACK_HOLE_SHADOW_RADIUS, GALAXY_FEAST_SECONDS,
    GALAXY_SHRED_SECONDS, galaxyFeastPower,
    type BlackHoleState, type HolePoint,
} from './blackHoleModel.ts';

const TAU = Math.PI * 2;
export const BLACK_HOLE_OPEN_SECONDS = 0.55;
export const BLACK_HOLE_FLASH_SECONDS = 0.6;
const QUASAR_JET_LENGTH = 270;
const QUASAR_KNOTS = 3;
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
        const angle = index * 2.399 + time * 2.4 * (16 / radius) ** 1.5;
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

/** Twin relativistic jets along the disk axis, ignited when a galaxy finishes falling in. */
const drawQuasarJets = (ctx: CanvasRenderingContext2D, t: number, power: number) => {
    const length = QUASAR_JET_LENGTH * (0.3 + 0.7 * power);
    const reach = length * easeOutCubic(Math.min(1, t / 0.3));
    const fade = (1 - t) ** 1.5 * (0.3 + 0.7 * power);
    const start = BLACK_HOLE_SHADOW_RADIUS * 0.6;
    if (reach <= start) return;
    ctx.lineCap = 'round';
    for (const direction of [-1, 1]) {
        const end = direction * reach;
        const sheath = ctx.createLinearGradient(0, direction * start, 0, end);
        sheath.addColorStop(0, `rgba(176, 156, 255, ${0.5 * fade})`);
        sheath.addColorStop(0.5, `rgba(112, 140, 255, ${0.2 * fade})`);
        sheath.addColorStop(1, 'rgba(90, 120, 255, 0)');
        ctx.fillStyle = sheath;
        ctx.beginPath();
        ctx.moveTo(-3, direction * start);
        ctx.lineTo(-11, end);
        ctx.lineTo(11, end);
        ctx.lineTo(3, direction * start);
        ctx.closePath();
        ctx.fill();
        const core = ctx.createLinearGradient(0, direction * start, 0, end);
        core.addColorStop(0, `rgba(250, 252, 255, ${fade})`);
        core.addColorStop(0.6, `rgba(196, 226, 255, ${0.6 * fade})`);
        core.addColorStop(1, 'rgba(160, 200, 255, 0)');
        ctx.strokeStyle = core;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, direction * start);
        ctx.lineTo(0, end);
        ctx.stroke();
        for (let knot = 0; knot < QUASAR_KNOTS; knot += 1) {
            const travel = t * 1.8 - knot * 0.2;
            const distance = start + (length - start) * travel;
            if (travel <= 0 || travel >= 1 || distance > reach) continue;
            ctx.fillStyle = `rgba(232, 244, 255, ${0.9 * fade * (1 - travel)})`;
            ctx.beginPath();
            ctx.arc(0, direction * distance, 2.4 - knot * 0.5, 0, TAU);
            ctx.fill();
        }
    }
};

/** An equatorial shock in the disk plane plus a fainter spherical bloom, both out to the gravity edge. */
const drawFeastShock = (ctx: CanvasRenderingContext2D, t: number, power: number) => {
    const shadow = BLACK_HOLE_SHADOW_RADIUS;
    const span = BLACK_HOLE_RADIUS * (0.3 + 0.7 * power);
    const fade = (1 - t) ** 1.5 * power;
    ctx.save();
    ctx.scale(1, DISK_FLATTEN);
    const radius = shadow + (span - shadow) * easeOutCubic(t);
    for (const [width, alpha] of [[14, 0.08], [3, 0.3], [1, 0.6]] as const) {
        ctx.strokeStyle = `rgba(255, 226, 186, ${alpha * fade})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.stroke();
    }
    ctx.restore();
    const bloom = shadow + span * 0.75 * easeOutCubic(Math.min(1, t * 1.3));
    for (const [width, alpha] of [[8, 0.05], [1.2, 0.16]] as const) {
        ctx.strokeStyle = `rgba(196, 210, 255, ${alpha * power * (1 - t) ** 2})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(0, 0, bloom, 0, TAU);
        ctx.stroke();
    }
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
            feed = Math.max(feed, Math.min(1, galaxy.age / GALAXY_SHRED_SECONDS) * galaxyFeastPower(galaxy.radius));
        }
    }
    const feast = state.feastAge < GALAXY_FEAST_SECONDS ? state.feastAge / GALAXY_FEAST_SECONDS : 1;
    const surge = (1 - feast) ** 2 * state.feastPower;
    const glow = opening * (1 + 0.55 * flash + 0.9 * feed + 1.4 * surge);
    const swell = 1 + 0.3 * feed + 0.35 * surge;
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
        const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
        bloom.addColorStop(0, `rgba(255, 255, 255, ${flare})`);
        bloom.addColorStop(0.3, `rgba(220, 230, 255, ${0.35 * flare})`);
        bloom.addColorStop(1, 'rgba(200, 210, 255, 0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, TAU);
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
    if (feast < 1) drawFeastShock(ctx, feast, state.feastPower);

    ctx.restore();
}
