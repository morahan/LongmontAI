import React, { useLayoutEffect, useRef } from 'react';
import {
    advanceEasterEggClickSequence,
    CONSTELLATION_WINDOW_SECONDS,
    createConstellationGeometry,
    createConstellationGeometryForPhrase,
    createEasterEggTargetStyles,
    createPlanetSystem,
    createSpaceScene,
    getConstellationPhase,
    getConstellationStrength,
    getCometAppearance,
    getEasterEggPhase,
    getEasterEggStarFieldPositions,
    getEasterEggStrength,
    getEasterEggStarFieldStyles,
    getElapsedSecondsSinceMount,
    getNeuralSignals,
    getOrbitingMoon,
    getOrbitingPlanets,
    getPlanetLightingStyle,
    getPlanetSurfaceDetailLevel,
    PLANET_RENDER_SCALE,
    PLANET_RING_LINE_WIDTH,
    RETAINED_AMBIENT_STAR_COUNT,
    SYSTEM_STAR_RADIUS,
    getSimulationTime,
    getScreenWrappedVelocity,
    getStarFieldPositions,
    getStarFieldStyles,
    getStarRgb,
    getSystemOpacity,
    getSystemScale,
    getGalaxyAppearance,
    getTravelerAppearance,
    getTravelerVariant,
    getUfoAppearance,
    hasAtmosphereHalo,
    isStarRenderable,
    projectTraveler,
    scaleConstellationGeometry,
    selectEasterEggPhrase,
    selectProminentSystemOwner,
    shouldTriggerEasterEgg,
    travelerCountForWidth,
    type ConstellationGeometry,
    type ConstellationPhrase,
    type EasterEggClickSequence,
    type OrbitingMoon,
    type Point,
    type OrbitingPlanet,
    type ProjectedTraveler,
    type ProminentSystemOwner,
    type StarVisualStyle,
    type Traveler,
} from './spaceBackgroundModel';

const TAU = Math.PI * 2;
const INTERACTIVE_TARGET_SELECTOR = [
    'a', 'button', 'input', 'select', 'textarea', 'summary', 'label',
    '[role="button"]', '[role="link"]', '[contenteditable="true"]',
].join(',');

interface LineLayer {
    geometry: ConstellationGeometry;
    strength: number;
}

interface EasterEggTransition {
    startedAt: number;
    densityEvent: number;
    phrase: ConstellationPhrase;
    startStrength: number;
    endStrength: number;
    startLineLayers: LineLayer[];
    endGeometry: ConstellationGeometry;
    geometry: ConstellationGeometry;
    startPositions: Point[];
    targetPositions: Point[];
    endPositions: Point[];
    endVelocities: Point[];
    startStyles: StarVisualStyle[];
    targetStyles: StarVisualStyle[];
    endStyles: StarVisualStyle[];
}

const drawMoon = (
    ctx: CanvasRenderingContext2D,
    moon: OrbitingMoon,
    opacity: number,
) => {
    ctx.fillStyle = `rgba(225, 236, 241, ${opacity * 0.94})`;
    ctx.strokeStyle = `rgba(130, 166, 184, ${opacity * 0.9})`;
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
};

const surfaceValue = (seed: number, channel: number) => {
    let value = (seed ^ Math.imul(channel + 1, 0x9e3779b1)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
};

/** Atmosphere marks are clipped to and scaled from the body's actual Canvas radius. */
const drawAtmosphereSurface = (
    ctx: CanvasRenderingContext2D,
    planet: OrbitingPlanet,
    detailLevel: 1 | 2,
) => {
    const { x, y, radius, surfaceSeed } = planet;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.clip();
    ctx.lineCap = 'round';

    if (planet.atmosphere === 'gas-banded') {
        const bandLimit = detailLevel === 2 ? 2 : 1;
        for (let band = -bandLimit; band <= bandLimit; band += 1) {
            ctx.strokeStyle = band % 2 === 0 ? 'rgba(255, 232, 181, 0.78)' : 'rgba(67, 37, 49, 0.68)';
            ctx.lineWidth = radius * (0.22 + surfaceValue(surfaceSeed, band + 3) * 0.1);
            ctx.beginPath();
            ctx.moveTo(x - radius, y + band * radius * 0.32);
            ctx.bezierCurveTo(
                x - radius * 0.35, y + band * radius * 0.22,
                x + radius * 0.35, y + band * radius * 0.4,
                x + radius, y + band * radius * 0.3,
            );
            ctx.stroke();
        }
    } else if (planet.atmosphere === 'ocean-haze') {
        ctx.fillStyle = 'rgba(210, 244, 241, 0.62)';
        for (let cloud = 0; cloud < detailLevel + 1; cloud += 1) {
            const cloudX = x + (surfaceValue(surfaceSeed, cloud) * 1.4 - 0.7) * radius;
            const cloudY = y + (surfaceValue(surfaceSeed, cloud + 4) * 1.2 - 0.6) * radius;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, radius * 0.58, radius * 0.16, -0.2, 0, TAU);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(247, 255, 252, 0.9)';
        ctx.lineWidth = radius * 0.18;
        ctx.beginPath();
        ctx.arc(x, y - radius * 0.08, radius * 0.72, 0.15, 2.35);
        ctx.stroke();
    } else if (planet.atmosphere === 'rocky-cratered') {
        for (let crater = 0; crater < detailLevel + 2; crater += 1) {
            const craterRadius = radius * (0.1 + surfaceValue(surfaceSeed, crater + 8) * 0.12);
            const craterX = x + (surfaceValue(surfaceSeed, crater) * 1.35 - 0.675) * radius;
            const craterY = y + (surfaceValue(surfaceSeed, crater + 4) * 1.25 - 0.625) * radius;
            ctx.fillStyle = 'rgba(37, 25, 27, 0.72)';
            ctx.strokeStyle = 'rgba(218, 175, 132, 0.62)';
            ctx.lineWidth = radius * 0.07;
            ctx.beginPath();
            ctx.arc(craterX, craterY, craterRadius, 0, TAU);
            ctx.fill();
            ctx.stroke();
        }
    } else if (planet.atmosphere === 'ice') {
        ctx.fillStyle = 'rgba(235, 253, 255, 0.36)';
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 0.48);
        ctx.strokeStyle = 'rgba(43, 112, 149, 0.9)';
        ctx.lineWidth = radius * 0.13;
        const fissureLimit = detailLevel === 2 ? 1 : 0;
        for (let fissure = -fissureLimit; fissure <= fissureLimit; fissure += 1) {
            ctx.beginPath();
            ctx.moveTo(x - radius, y + fissure * radius * 0.45);
            ctx.lineTo(x - radius * 0.25, y + (fissure * 0.3 + 0.2) * radius);
            ctx.lineTo(x + radius * 0.2, y + (fissure * 0.35 - 0.15) * radius);
            ctx.lineTo(x + radius, y + fissure * radius * 0.25);
            ctx.stroke();
        }
    } else {
        ctx.fillStyle = 'rgba(24, 17, 23, 0.76)';
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.strokeStyle = 'rgba(255, 116, 43, 1)';
        ctx.lineWidth = radius * 0.2;
        const flowLimit = detailLevel === 2 ? 1 : 0;
        for (let flow = -flowLimit; flow <= flowLimit; flow += 1) {
            ctx.beginPath();
            ctx.moveTo(x + flow * radius * 0.45, y - radius);
            ctx.bezierCurveTo(
                x - flow * radius * 0.1, y - radius * 0.35,
                x + flow * radius * 0.55, y + radius * 0.2,
                x - flow * radius * 0.2, y + radius,
            );
            ctx.stroke();
        }
    }
    ctx.restore();
};

const drawPlanetRing = (
    ctx: CanvasRenderingContext2D,
    planet: OrbitingPlanet,
    startAngle: number,
    endAngle: number,
) => {
    ctx.strokeStyle = 'rgba(222, 231, 235, 0.84)';
    ctx.lineWidth = PLANET_RING_LINE_WIDTH;
    ctx.beginPath();
    ctx.ellipse(
        planet.x,
        planet.y,
        planet.radius * 1.85,
        planet.radius * 0.55,
        planet.tilt,
        startAngle,
        endAngle,
    );
    ctx.stroke();
};

const drawPlanet = (
    ctx: CanvasRenderingContext2D,
    planet: OrbitingPlanet,
    simulationSeconds: number,
    opacity: number,
    systemScale: number,
) => {
    const renderedPlanet = { ...planet, radius: planet.radius * PLANET_RENDER_SCALE };
    ctx.save();
    ctx.globalAlpha = opacity;
    if (renderedPlanet.hasRing) drawPlanetRing(ctx, renderedPlanet, Math.PI, TAU);

    if (hasAtmosphereHalo(renderedPlanet.atmosphere)) {
        ctx.strokeStyle = renderedPlanet.atmosphere === 'ice'
            ? 'rgba(190, 235, 246, 0.34)'
            : 'rgba(130, 215, 235, 0.3)';
        ctx.lineWidth = renderedPlanet.radius * 0.12;
        ctx.beginPath();
        ctx.arc(renderedPlanet.x, renderedPlanet.y, renderedPlanet.radius * 1.12, 0, TAU);
        ctx.stroke();
    }

    ctx.fillStyle = renderedPlanet.color;
    ctx.beginPath();
    ctx.arc(renderedPlanet.x, renderedPlanet.y, renderedPlanet.radius, 0, TAU);
    ctx.fill();
    const surfaceDetail = getPlanetSurfaceDetailLevel(renderedPlanet.radius, systemScale);
    if (surfaceDetail === 1 || surfaceDetail === 2) {
        drawAtmosphereSurface(ctx, renderedPlanet, surfaceDetail);
    }

    const lighting = getPlanetLightingStyle(renderedPlanet);
    const shadowStartX = renderedPlanet.x + lighting.shadowStart.x * renderedPlanet.radius;
    const shadowStartY = renderedPlanet.y + lighting.shadowStart.y * renderedPlanet.radius;
    const shadowEndX = renderedPlanet.x + lighting.shadowEnd.x * renderedPlanet.radius;
    const shadowEndY = renderedPlanet.y + lighting.shadowEnd.y * renderedPlanet.radius;
    const shadow = ctx.createLinearGradient(shadowStartX, shadowStartY, shadowEndX, shadowEndY);
    shadow.addColorStop(0, 'rgba(10, 15, 24, 0.68)');
    shadow.addColorStop(lighting.terminatorStart, 'rgba(10, 15, 24, 0.64)');
    shadow.addColorStop(lighting.terminatorEnd, 'rgba(10, 15, 24, 0)');
    shadow.addColorStop(1, 'rgba(10, 15, 24, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(renderedPlanet.x, renderedPlanet.y, renderedPlanet.radius, 0, TAU);
    ctx.fill();

    const highlightX = renderedPlanet.x + lighting.highlightCenter.x * renderedPlanet.radius;
    const highlightY = renderedPlanet.y + lighting.highlightCenter.y * renderedPlanet.radius;
    const highlight = ctx.createRadialGradient(
        highlightX, highlightY, renderedPlanet.radius * 0.04,
        highlightX, highlightY, renderedPlanet.radius * 1.18,
    );
    highlight.addColorStop(0, `rgba(242, 251, 251, ${0.16 + lighting.illuminatedFraction * 0.26})`);
    highlight.addColorStop(0.42, 'rgba(255, 255, 255, 0)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(renderedPlanet.x, renderedPlanet.y, renderedPlanet.radius, 0, TAU);
    ctx.fill();
    if (renderedPlanet.hasRing) drawPlanetRing(ctx, renderedPlanet, 0, Math.PI);
    ctx.restore();
    planet.moons.forEach((moon) =>
        drawMoon(ctx, getOrbitingMoon(planet, moon, simulationSeconds), opacity));
};

const drawNeuralSignal = (
    ctx: CanvasRenderingContext2D,
    from: ProjectedTraveler,
    to: ProjectedTraveler,
    opacity: number,
    pulseProgress: number,
    lineWidth: number,
    bend: number,
) => {
    if (opacity <= 0) return;
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const controlX = (from.x + to.x) * 0.5 - deltaY * bend;
    const controlY = (from.y + to.y) * 0.5 + deltaX * bend;

    ctx.save();
    ctx.strokeStyle = `rgba(116, 202, 236, ${opacity})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
    ctx.stroke();

    const inverse = 1 - pulseProgress;
    const pulseX = inverse * inverse * from.x
        + 2 * inverse * pulseProgress * controlX
        + pulseProgress * pulseProgress * to.x;
    const pulseY = inverse * inverse * from.y
        + 2 * inverse * pulseProgress * controlY
        + pulseProgress * pulseProgress * to.y;
    const glint = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 4.5);
    glint.addColorStop(0, `rgba(218, 246, 255, ${opacity * 1.7})`);
    glint.addColorStop(0.35, `rgba(133, 215, 242, ${opacity * 0.7})`);
    glint.addColorStop(1, 'rgba(99, 190, 226, 0)');
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.arc(pulseX, pulseY, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
};

const hexToRgb = (color: string) => {
    const value = Number.parseInt(color.slice(1), 16);
    return [(value >>> 16) & 255, (value >>> 8) & 255, value & 255] as const;
};

/** Seeded marks are always clipped to the stellar disc and strengthen only as it resolves. */
const drawTravelerSurface = (
    ctx: CanvasRenderingContext2D,
    appearance: ReturnType<typeof getTravelerAppearance>,
    x: number,
    y: number,
    opacity: number,
) => {
    if (appearance.detailLevel === 0) return;
    const radius = appearance.radius;
    const seed = appearance.surfaceSeed;
    const textureOpacity = opacity * (0.08 + appearance.detailLevel * 0.055);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = `rgba(24, 31, 43, ${textureOpacity})`;
    ctx.fillStyle = `rgba(255, 255, 255, ${textureOpacity * 0.8})`;
    ctx.lineWidth = Math.max(0.24, radius * 0.075);
    ctx.lineCap = 'round';

    if (appearance.texture === 'bands') {
        for (let band = -2; band <= 2; band += 1) {
            const offset = band * radius * 0.34;
            ctx.beginPath();
            ctx.moveTo(x - radius, y + offset);
            ctx.bezierCurveTo(x - radius * 0.35, y + offset - radius * 0.14,
                x + radius * 0.35, y + offset + radius * 0.14, x + radius, y + offset);
            ctx.stroke();
        }
    } else if (appearance.texture === 'speckles') {
        for (let spot = 0; spot < 7; spot += 1) {
            const angle = surfaceValue(seed, spot) * TAU;
            const distance = Math.sqrt(surfaceValue(seed, spot + 9)) * radius * 0.72;
            ctx.beginPath();
            ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance,
                radius * (0.045 + surfaceValue(seed, spot + 18) * 0.065), 0, TAU);
            ctx.fill();
        }
    } else if (appearance.texture === 'facets') {
        for (let facet = 0; facet < 5; facet += 1) {
            const angle = (facet / 5 + surfaceValue(seed, facet) * 0.08) * TAU;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            ctx.stroke();
        }
    } else if (appearance.texture === 'swirls') {
        for (let arc = 0; arc < 3; arc += 1) {
            ctx.beginPath();
            ctx.arc(x + (arc - 1) * radius * 0.18, y, radius * (0.3 + arc * 0.16),
                surfaceValue(seed, arc) * TAU, surfaceValue(seed, arc) * TAU + Math.PI * 1.25);
            ctx.stroke();
        }
    } else {
        for (let patch = 0; patch < 5; patch += 1) {
            const angle = surfaceValue(seed, patch) * TAU;
            const distance = surfaceValue(seed, patch + 6) * radius * 0.62;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance,
                radius * (0.12 + surfaceValue(seed, patch + 12) * 0.16), radius * 0.09,
                angle, 0, TAU);
            ctx.fill();
        }
    }
    ctx.restore();
};

const drawTravelerStar = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
) => {
    const appearance = getTravelerAppearance(traveler, projection.progress);
    const { x, y } = projection;
    const [red, green, blue] = hexToRgb(appearance.color);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, appearance.haloRadius);
    halo.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${projection.opacity * appearance.glowOpacity})`);
    halo.addColorStop(0.45, `rgba(${red}, ${green}, ${blue}, ${projection.opacity * appearance.glowOpacity * 0.34})`);
    halo.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, appearance.haloRadius, 0, TAU);
    ctx.fill();

    if (appearance.detailLevel === 3) {
        ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${projection.opacity * appearance.glowOpacity * 0.72})`;
        ctx.lineWidth = Math.max(0.35, appearance.radius * 0.08);
        ctx.beginPath();
        ctx.moveTo(x - appearance.flareLength, y);
        ctx.lineTo(x + appearance.flareLength, y);
        ctx.moveTo(x, y - appearance.flareLength * 0.62);
        ctx.lineTo(x, y + appearance.flareLength * 0.62);
        ctx.stroke();
    }
    const disc = ctx.createRadialGradient(
        x - appearance.radius * 0.22, y - appearance.radius * 0.25, 0,
        x, y, appearance.radius,
    );
    disc.addColorStop(0, `rgba(255, 255, 255, ${projection.opacity})`);
    disc.addColorStop(appearance.detailLevel >= 2 ? 0.34 : 0.58,
        `rgba(${red}, ${green}, ${blue}, ${projection.opacity})`);
    disc.addColorStop(1, `rgba(${Math.round(red * 0.58)}, ${Math.round(green * 0.58)}, ${Math.round(blue * 0.58)}, ${projection.opacity * 0.9})`);
    ctx.save();
    ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, ${projection.opacity * appearance.glowOpacity})`;
    ctx.shadowBlur = appearance.glowBlur;
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, appearance.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
    drawTravelerSurface(ctx, appearance, x, y, projection.opacity);
};

const drawGalaxy = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
    simulationSeconds: number,
) => {
    const appearance = getGalaxyAppearance(traveler, projection.progress);
    const { x, y, opacity } = projection;
    const rotation = surfaceValue(traveler.seed, projection.cycle) * TAU
        + simulationSeconds * 0.055;

    const halo = ctx.createRadialGradient(x, y, 0, x, y, appearance.outerRadius);
    halo.addColorStop(0, `rgba(245, 226, 198, ${opacity * 0.5})`);
    halo.addColorStop(0.38, `rgba(126, 177, 221, ${opacity * 0.2})`);
    halo.addColorStop(1, 'rgba(77, 119, 180, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, appearance.outerRadius, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = `rgba(171, 205, 235, ${opacity * 0.23})`;
    ctx.lineWidth = Math.max(0.25, appearance.outerRadius * 0.045);
    for (let arm = 0; arm < appearance.armCount; arm += 1) {
        ctx.beginPath();
        for (let step = 0; step <= 18; step += 1) {
            const radialProgress = step / 18;
            const radius = appearance.coreRadius
                + radialProgress * (appearance.outerRadius - appearance.coreRadius) * 0.9;
            const angle = arm * TAU / appearance.armCount + radialProgress * TAU * 1.45;
            const armX = Math.cos(angle) * radius;
            const armY = Math.sin(angle) * radius * 0.58;
            if (step === 0) ctx.moveTo(armX, armY);
            else ctx.lineTo(armX, armY);
        }
        ctx.stroke();
    }

    for (let star = 0; star < appearance.internalStarCount; star += 1) {
        const arm = star % appearance.armCount;
        const radialProgress = (Math.floor(star / appearance.armCount) + 0.45
            + surfaceValue(traveler.seed, star + 41) * 0.5)
            / Math.ceil(appearance.internalStarCount / appearance.armCount);
        const radius = appearance.coreRadius
            + radialProgress * (appearance.outerRadius - appearance.coreRadius) * 0.88;
        const angle = arm * TAU / appearance.armCount
            + radialProgress * TAU * 1.45
            + (surfaceValue(traveler.seed, star + 83) - 0.5) * 0.42;
        ctx.fillStyle = `rgba(232, 242, 255, ${opacity * (0.55
            + surfaceValue(traveler.seed, star + 127) * 0.45)})`;
        ctx.beginPath();
        ctx.arc(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius * 0.58,
            Math.max(0.18, Math.min(0.58, appearance.outerRadius * 0.035)),
            0,
            TAU,
        );
        ctx.fill();
    }

    ctx.fillStyle = `rgba(2, 3, 8, ${Math.min(1, opacity * 1.3)})`;
    ctx.beginPath();
    ctx.arc(0, 0, appearance.coreRadius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 205, 133, ${opacity * 0.9})`;
    ctx.lineWidth = Math.max(0.3, appearance.coreRadius * 0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, appearance.coreRadius * 1.75, appearance.coreRadius * 0.52, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
};

const drawUfo = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
    deltaX: number,
    deltaY: number,
) => {
    const appearance = getUfoAppearance(traveler, projection.progress);
    const distance = Math.hypot(deltaX, deltaY);
    const directionX = distance > 0 ? deltaX / distance : 1;
    const directionY = distance > 0 ? deltaY / distance : 0;
    const angle = Math.atan2(directionY, directionX);
    const { x, y, opacity } = projection;

    // A luminous exhaust line extends directly opposite the current motion vector.
    const streak = ctx.createLinearGradient(
        x - directionX * appearance.streakLength,
        y - directionY * appearance.streakLength,
        x,
        y,
    );
    streak.addColorStop(0, 'rgba(93, 213, 255, 0)');
    streak.addColorStop(1, `rgba(167, 235, 255, ${opacity * 0.72})`);
    ctx.strokeStyle = streak;
    ctx.lineWidth = Math.max(0.7, appearance.radius * 0.42);
    ctx.beginPath();
    ctx.moveTo(x - directionX * appearance.streakLength, y - directionY * appearance.streakLength);
    ctx.lineTo(x, y);
    ctx.stroke();

    const glow = ctx.createRadialGradient(x, y, 0, x, y, appearance.glowRadius);
    glow.addColorStop(0, `rgba(127, 225, 255, ${opacity * 0.5})`);
    glow.addColorStop(1, 'rgba(74, 178, 231, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, appearance.glowRadius, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(206, 230, 239, ${opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, appearance.radius, appearance.radius * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(102, 205, 236, ${opacity * 0.95})`;
    ctx.beginPath();
    ctx.ellipse(
        appearance.radius * 0.12,
        -appearance.radius * 0.28,
        appearance.radius * 0.42,
        appearance.radius * 0.34,
        0,
        Math.PI,
        TAU,
    );
    ctx.fill();
    ctx.strokeStyle = `rgba(246, 253, 255, ${opacity})`;
    ctx.lineWidth = Math.max(0.3, appearance.radius * 0.1);
    ctx.beginPath();
    ctx.moveTo(-appearance.radius * 0.72, appearance.radius * 0.08);
    ctx.lineTo(appearance.radius * 0.72, appearance.radius * 0.08);
    ctx.stroke();
    ctx.restore();
};

const drawComet = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
    deltaX: number,
    deltaY: number,
    fallbackDirection: Point,
) => {
    const appearance = getCometAppearance(traveler, projection.cycle, projection.progress);
    const motionDistance = Math.hypot(deltaX, deltaY);
    const fallbackDistance = Math.hypot(fallbackDirection.x, fallbackDirection.y);
    const directionX = motionDistance > 0
        ? deltaX / motionDistance
        : fallbackDistance > 0 ? fallbackDirection.x / fallbackDistance : 1;
    const directionY = motionDistance > 0
        ? deltaY / motionDistance
        : fallbackDistance > 0 ? fallbackDirection.y / fallbackDistance : 0;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const { x, y, opacity } = projection;

    ctx.save();
    const tail = ctx.createLinearGradient(
        x - directionX * appearance.trailLength,
        y - directionY * appearance.trailLength,
        x,
        y,
    );
    tail.addColorStop(0, 'rgba(105, 174, 205, 0)');
    tail.addColorStop(0.5, `rgba(142, 211, 234, ${opacity * 0.16})`);
    tail.addColorStop(1, `rgba(218, 244, 250, ${opacity * 0.68})`);
    ctx.strokeStyle = tail;
    ctx.lineCap = 'round';
    ctx.lineWidth = appearance.trailWidth;
    ctx.beginPath();
    ctx.moveTo(x - directionX * appearance.trailLength, y - directionY * appearance.trailLength);
    ctx.lineTo(x, y);
    ctx.stroke();

    appearance.particles.forEach((particle) => {
        const particleX = x - directionX * particle.distance
            + perpendicularX * particle.lateralOffset;
        const particleY = y - directionY * particle.distance
            + perpendicularY * particle.lateralOffset;
        if (particle.kind === 'asteroid') {
            ctx.save();
            ctx.translate(particleX, particleY);
            ctx.rotate(particle.rotation);
            ctx.fillStyle = `rgba(143, 132, 126, ${opacity * particle.opacity})`;
            ctx.strokeStyle = `rgba(221, 211, 199, ${opacity * particle.opacity * 0.72})`;
            ctx.lineWidth = Math.max(0.2, particle.radius * 0.16);
            ctx.beginPath();
            ctx.moveTo(particle.radius, 0);
            ctx.lineTo(-particle.radius * 0.35, particle.radius * 0.82);
            ctx.lineTo(-particle.radius, -particle.radius * 0.18);
            ctx.lineTo(particle.radius * 0.12, -particle.radius * 0.74);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.fillStyle = `rgba(205, 235, 244, ${opacity * particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particle.radius, 0, TAU);
            ctx.fill();
        }
    });

    const glow = ctx.createRadialGradient(x, y, 0, x, y, appearance.glowRadius);
    glow.addColorStop(0, `rgba(255, 251, 229, ${opacity})`);
    glow.addColorStop(0.28, `rgba(177, 226, 242, ${opacity * 0.62})`);
    glow.addColorStop(1, 'rgba(91, 177, 215, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, appearance.glowRadius, 0, TAU);
    ctx.fill();

    const head = ctx.createRadialGradient(
        x - appearance.headRadius * 0.24,
        y - appearance.headRadius * 0.28,
        0,
        x,
        y,
        appearance.headRadius,
    );
    head.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    head.addColorStop(0.48, `rgba(239, 247, 235, ${opacity})`);
    head.addColorStop(1, `rgba(102, 184, 216, ${opacity * 0.88})`);
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(x, y, appearance.headRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
};

const drawSun = (ctx: CanvasRenderingContext2D, opacity: number) => {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, SYSTEM_STAR_RADIUS);
    glow.addColorStop(0, `rgba(245, 250, 255, ${opacity})`);
    glow.addColorStop(0.28, `rgba(160, 218, 238, ${opacity * 0.4})`);
    glow.addColorStop(1, 'rgba(106, 182, 211, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, SYSTEM_STAR_RADIUS, 0, TAU);
    ctx.fill();
};

const drawPlanetarySystem = (
    ctx: CanvasRenderingContext2D,
    projection: ProjectedTraveler,
    travelerSeed: number,
    travelerOpacity: number,
    simulationSeconds: number,
) => {
    const opacity = getSystemOpacity(projection, travelerOpacity);
    if (opacity <= 0) return;
    const scale = getSystemScale(projection);
    const planets = createPlanetSystem(travelerSeed, projection.cycle);
    const orbiting = getOrbitingPlanets(planets, simulationSeconds);

    ctx.save();
    ctx.translate(projection.x, projection.y);
    ctx.scale(scale, scale);

    // Negative z is behind the sun. Positive z is painted over it.
    orbiting.filter((planet) => planet.z < 0)
        .forEach((planet) => drawPlanet(ctx, planet, simulationSeconds, opacity, scale));
    drawSun(ctx, opacity);
    orbiting.filter((planet) => planet.z >= 0)
        .forEach((planet) => drawPlanet(ctx, planet, simulationSeconds, opacity, scale));
    ctx.restore();
};

const SpaceNeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // The refresh seed prefers Web Crypto and has a one-sample legacy fallback.
        const scene = createSpaceScene();
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const mountedAt = performance.now();
        let width = 0;
        let height = 0;
        let animationFrameId: number | null = null;
        let isOnscreen = typeof IntersectionObserver === 'undefined';
        let pageIsVisible = !document.hidden;
        let reducedMotion = motionQuery.matches;
        let backdropGlow: CanvasGradient | null = null;
        let constellationGeometry: ReturnType<typeof createConstellationGeometry> | null = null;
        let constellationEvent = -1;
        let prominentSystemOwner: ProminentSystemOwner | null = null;
        let easterEgg: EasterEggTransition | null = null;
        let easterEggClickSequence: EasterEggClickSequence | null = null;
        let easterEggTriggerCount = 0;

        const clearEasterEggDataset = () => {
            delete canvas.dataset.constellationPhrase;
            delete canvas.dataset.easterEggState;
        };

        const getScheduledStarFrame = (elapsed: number) => {
            const phase = getConstellationPhase(elapsed);
            if (phase.name !== 'ambient'
                && (!constellationGeometry || constellationEvent !== phase.event)) {
                constellationGeometry = createConstellationGeometry(width, height, scene.seed, phase.event);
                constellationEvent = phase.event;
            }
            const strength = getConstellationStrength(phase);
            return {
                phase,
                strength,
                lineLayers: constellationGeometry && phase.name !== 'ambient'
                    ? [{ geometry: constellationGeometry, strength }]
                    : [],
                positions: getStarFieldPositions(scene.seed, elapsed, width, height),
                styles: getStarFieldStyles(scene.seed, elapsed),
            };
        };

        const getRenderedStarFrame = (elapsed: number) => {
            if (easterEgg) {
                const age = Math.max(0, elapsed - easterEgg.startedAt);
                const phase = getEasterEggPhase(age);
                if (phase.name !== 'ambient') {
                    const lineLayers: LineLayer[] = phase.name === 'morph-in'
                        ? [
                            ...easterEgg.startLineLayers.map((layer) => ({
                                ...layer,
                                strength: layer.strength * (1 - phase.progress),
                            })),
                            { geometry: easterEgg.geometry, strength: phase.progress },
                        ]
                        : phase.name === 'hold'
                            ? [{ geometry: easterEgg.geometry, strength: 1 }]
                            : [
                                { geometry: easterEgg.geometry, strength: 1 - phase.progress },
                                {
                                    geometry: easterEgg.endGeometry,
                                    strength: easterEgg.endStrength * phase.progress,
                                },
                            ];
                    return {
                        geometry: easterEgg.geometry,
                        phase,
                        strength: getEasterEggStrength(
                            easterEgg.startStrength,
                            easterEgg.endStrength,
                            age,
                        ),
                        lineLayers,
                        positions: getEasterEggStarFieldPositions(
                            easterEgg.startPositions,
                            easterEgg.targetPositions,
                            easterEgg.endPositions,
                            age,
                            easterEgg.endVelocities,
                            { x: width, y: height },
                        ),
                        styles: getEasterEggStarFieldStyles(
                            easterEgg.startStyles,
                            easterEgg.targetStyles,
                            easterEgg.endStyles,
                            age,
                        ),
                    };
                }
                easterEgg = null;
                clearEasterEggDataset();
            }
            return getScheduledStarFrame(elapsed);
        };

        const drawScene = (elapsed: number, renderDetails = true) => {
            if (width <= 0 || height <= 0) return;
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            if (backdropGlow) {
                ctx.fillStyle = backdropGlow;
                ctx.fillRect(0, 0, width, height);
            }

            const frame = getRenderedStarFrame(elapsed);
            const { phase, positions, styles, lineLayers } = frame;
            if (easterEgg) {
                canvas.dataset.constellationPhrase = easterEgg.phrase;
                canvas.dataset.easterEggState = phase.name;
            }
            lineLayers.forEach(({ geometry, strength }) => {
                const lineOpacity = 0.15 * strength;
                if (lineOpacity <= 0) return;
                ctx.strokeStyle = `rgba(176, 217, 235, ${lineOpacity})`;
                ctx.lineWidth = 0.55;
                ctx.beginPath();
                geometry.edges.forEach(({ from, to }) => {
                    const fromPoint = positions[from];
                    const toPoint = positions[to];
                    if (!fromPoint || !toPoint) return;
                    ctx.moveTo(fromPoint.x, fromPoint.y);
                    ctx.lineTo(toPoint.x, toPoint.y);
                });
                ctx.stroke();
            });

            for (let index = 0; index < positions.length; index += 1) {
                const style = styles[index];
                if (!style || !isStarRenderable(style)) continue;
                const position = positions[index];
                const [red, green, blue] = getStarRgb(style.strength);
                ctx.globalAlpha = 1;
                ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${style.opacity})`;
                ctx.beginPath();
                ctx.arc(position.x, position.y, style.radius, 0, TAU);
                ctx.fill();
            }

            if (canvas.dataset.spaceReady !== 'true') {
                canvas.dataset.spaceReady = 'true';
                performance.mark('longmont-hero-space-ready');
            }
            if (!renderDetails) return;

            // These clocks stop for all 30 seconds of every constellation lifecycle.
            const simulationSeconds = getSimulationTime(elapsed);
            const travelerCount = travelerCountForWidth(width);
            const travelers = scene.travelers.slice(0, travelerCount);
            const projections = travelers.map((traveler) =>
                projectTraveler(traveler, simulationSeconds, width, height));
            prominentSystemOwner = selectProminentSystemOwner(
                travelers,
                projections,
                width,
                height,
                prominentSystemOwner,
            );

            // Filaments sit below traveler stars; their endpoints are always current projections.
            getNeuralSignals(scene.seed, elapsed, projections, width, height, reducedMotion)
                .forEach((signal) => drawNeuralSignal(
                    ctx,
                    projections[signal.fromTravelerIndex],
                    projections[signal.toTravelerIndex],
                    signal.opacity,
                    signal.pulseProgress,
                    signal.lineWidth,
                    signal.bend,
                ));

            for (let index = 0; index < travelers.length; index += 1) {
                const traveler = travelers[index];
                const projection = projections[index];
                if (projection.opacity > 0.01) {
                    const previous = projectTraveler(
                        traveler,
                        Math.max(0, simulationSeconds - 0.1),
                        width,
                        height,
                    );
                    const sameCycle = previous.cycle === projection.cycle;
                    const deltaX = sameCycle ? projection.x - previous.x : 0;
                    const deltaY = sameCycle ? projection.y - previous.y : 0;
                    const variant = getTravelerVariant(traveler, projection.cycle);
                    if (variant === 'galaxy') {
                        drawGalaxy(ctx, traveler, projection, simulationSeconds);
                    } else if (variant === 'ufo') {
                        drawUfo(ctx, traveler, projection, deltaX, deltaY);
                    } else if (variant === 'comet') {
                        drawComet(ctx, traveler, projection, deltaX, deltaY, {
                            x: projection.x - width * 0.5,
                            y: projection.y - height * 0.45,
                        });
                    } else {
                        if (sameCycle) {
                            const distance = Math.hypot(deltaX, deltaY);
                            if (distance > 0.35) {
                                const tailScale = Math.min(1, 5 / distance);
                                ctx.strokeStyle = `rgba(184, 218, 233, ${projection.opacity * 0.14})`;
                                ctx.lineWidth = Math.max(0.35, projection.radius * 0.45);
                                ctx.beginPath();
                                ctx.moveTo(projection.x - deltaX * tailScale, projection.y - deltaY * tailScale);
                                ctx.lineTo(projection.x, projection.y);
                                ctx.stroke();
                            }
                        }
                        drawTravelerStar(ctx, traveler, projection);
                    }
                }

                if (index === prominentSystemOwner?.travelerIndex) {
                    drawPlanetarySystem(ctx, projection, traveler.seed, traveler.alpha, simulationSeconds);
                }
            }
            ctx.globalAlpha = 1;
            if (canvas.dataset.spaceDetailReady !== 'true') {
                canvas.dataset.spaceDetailReady = 'true';
                performance.mark('longmont-hero-space-detail-ready');
            }
        };

        // RAF may pause while hidden, but its monotonic timestamp still includes hidden time.
        const animate = (timestamp: number) => {
            animationFrameId = null;
            drawScene(getElapsedSecondsSinceMount(mountedAt, timestamp));
            animationFrameId = window.requestAnimationFrame(animate);
        };

        const shouldAnimate = () => !reducedMotion && pageIsVisible && isOnscreen;
        const syncAnimation = () => {
            if (shouldAnimate()) {
                if (animationFrameId === null) {
                    animationFrameId = window.requestAnimationFrame(animate);
                }
                return;
            }
            if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            if (reducedMotion) drawScene(0);
        };

        const handleResize = () => {
            const previousWidth = width;
            const previousHeight = height;
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.max(1, Math.round(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            backdropGlow = ctx.createRadialGradient(
                width * 0.5, height * 0.42, 0,
                width * 0.5, height * 0.42, Math.max(width, height) * 0.62,
            );
            backdropGlow.addColorStop(0, 'rgba(19, 49, 68, 0.1)');
            backdropGlow.addColorStop(0.52, 'rgba(35, 25, 59, 0.035)');
            backdropGlow.addColorStop(1, 'rgba(5, 5, 8, 0)');
            const elapsed = reducedMotion ? 0 : getElapsedSecondsSinceMount(mountedAt, performance.now());
            const resizePhase = getConstellationPhase(elapsed);
            constellationEvent = resizePhase.event;
            constellationGeometry = resizePhase.name === 'ambient'
                ? null
                : createConstellationGeometry(width, height, scene.seed, constellationEvent);
            if (easterEgg && previousWidth > 0 && previousHeight > 0) {
                const scalePoints = (points: Point[]) => points.map(({ x, y }) => ({
                    x: x * width / previousWidth,
                    y: y * height / previousHeight,
                }));
                const scaleX = width / previousWidth;
                const scaleY = height / previousHeight;
                easterEgg.startPositions = scalePoints(easterEgg.startPositions);
                easterEgg.endPositions = scalePoints(easterEgg.endPositions);
                easterEgg.endVelocities = easterEgg.endVelocities.map(({ x, y }) => ({
                    x: x * scaleX,
                    y: y * scaleY,
                }));
                easterEgg.startLineLayers = easterEgg.startLineLayers.map((layer) => ({
                    ...layer,
                    geometry: scaleConstellationGeometry(layer.geometry, scaleX, scaleY),
                }));
                easterEgg.endGeometry = scaleConstellationGeometry(
                    easterEgg.endGeometry, scaleX, scaleY,
                );
                const oldAnchorCount = easterEgg.geometry.points.length;
                const retainedTargets = scalePoints(
                    easterEgg.targetPositions.slice(oldAnchorCount),
                );
                easterEgg.geometry = createConstellationGeometryForPhrase(
                    width, height, easterEgg.phrase, scene.seed, easterEgg.densityEvent,
                );
                easterEgg.targetPositions = [
                    ...easterEgg.geometry.points,
                    ...retainedTargets,
                ];
            }
            drawScene(elapsed, false);
        };
        const handleVisibilityChange = () => { pageIsVisible = !document.hidden; syncAnimation(); };
        const handleMotionChange = (event: MediaQueryListEvent) => {
            reducedMotion = event.matches;
            if (reducedMotion) {
                easterEgg = null;
                clearEasterEggDataset();
            }
            syncAnimation();
        };
        const handleDocumentClick = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const isInsideCanvas = rect.width > 0 && rect.height > 0
                && event.clientX >= rect.left && event.clientX <= rect.right
                && event.clientY >= rect.top && event.clientY <= rect.bottom;
            const target = event.target instanceof Element ? event.target : null;
            const isInteractiveTarget = Boolean(target?.closest(INTERACTIVE_TARGET_SELECTOR));
            easterEggClickSequence = advanceEasterEggClickSequence(
                easterEggClickSequence,
                { x: event.clientX, y: event.clientY, timestamp: event.timeStamp },
                isInsideCanvas,
                isInteractiveTarget,
                reducedMotion,
            );
            const observedClickDetail = Math.max(event.detail, easterEggClickSequence?.count ?? 0);
            if (!shouldTriggerEasterEgg(
                observedClickDetail,
                isInsideCanvas,
                isInteractiveTarget,
                reducedMotion,
            )) return;
            easterEggClickSequence = null;

            const elapsed = getElapsedSecondsSinceMount(mountedAt, performance.now());
            const currentFrame = getRenderedStarFrame(elapsed);
            const phrase = selectEasterEggPhrase(scene.seed, easterEggTriggerCount);
            const densityEvent = easterEggTriggerCount + 1;
            const geometry = createConstellationGeometryForPhrase(
                width, height, phrase, scene.seed, densityEvent,
            );
            const endpointPhase = getConstellationPhase(elapsed + CONSTELLATION_WINDOW_SECONDS);
            const rawEndPositions = getStarFieldPositions(
                scene.seed, elapsed + CONSTELLATION_WINDOW_SECONDS, width, height,
            );
            const endpointElapsed = elapsed + CONSTELLATION_WINDOW_SECONDS;
            const velocitySampleSeconds = 0.001;
            const afterEndPositions = getStarFieldPositions(
                scene.seed, endpointElapsed + velocitySampleSeconds, width, height,
            );
            const rawEndVelocities = rawEndPositions.map((point, index) =>
                getScreenWrappedVelocity(
                    point,
                    afterEndPositions[index] ?? point,
                    velocitySampleSeconds,
                    width,
                    height,
                ));
            const rawEndStyles = getStarFieldStyles(scene.seed, endpointElapsed);
            const retainedIndices = currentFrame.styles
                .map((style, index) => ({ style, index }))
                .filter(({ style }) => style.strength === 0 && style.opacity > 0)
                .slice(-RETAINED_AMBIENT_STAR_COUNT)
                .map(({ index }) => index);
            const retainedPositions = retainedIndices.map((index) => currentFrame.positions[index]);
            const retainedStyles = retainedIndices.map((index) => ({
                ...currentFrame.styles[index], strength: 0,
            }));
            const totalCount = Math.max(
                currentFrame.positions.length,
                geometry.points.length + retainedPositions.length,
                rawEndPositions.length,
            );
            const fallbackPoint = currentFrame.positions[0] ?? { x: width * 0.5, y: height * 0.5 };
            const hiddenStyle: StarVisualStyle = {
                alpha: 0, twinkle: 1, strength: 0, radius: 1, opacity: 0,
            };
            const fillPoints = (points: Point[]) => Array.from(
                { length: totalCount },
                (_, index) => ({ ...(points[index] ?? currentFrame.positions[index] ?? fallbackPoint) }),
            );
            const fillStyles = (styles: StarVisualStyle[]) => Array.from(
                { length: totalCount },
                (_, index) => ({ ...(styles[index] ?? hiddenStyle) }),
            );
            const fillVelocities = (velocities: Point[]) => Array.from(
                { length: totalCount },
                (_, index) => ({ ...(velocities[index] ?? { x: 0, y: 0 }) }),
            );
            const targetPositions = [
                ...geometry.points,
                ...retainedPositions,
            ];
            const targetStyles = [
                ...createEasterEggTargetStyles(scene.seed, easterEggTriggerCount, geometry.points.length),
                ...retainedStyles,
            ];
            easterEgg = {
                startedAt: elapsed,
                densityEvent,
                phrase,
                startStrength: currentFrame.strength,
                endStrength: getConstellationStrength(endpointPhase),
                startLineLayers: currentFrame.lineLayers,
                endGeometry: createConstellationGeometry(
                    width,
                    height,
                    scene.seed,
                    endpointPhase.event,
                ),
                geometry,
                startPositions: fillPoints(currentFrame.positions),
                targetPositions: fillPoints(targetPositions),
                endPositions: fillPoints(rawEndPositions),
                endVelocities: fillVelocities(rawEndVelocities),
                startStyles: fillStyles(currentFrame.styles),
                targetStyles: fillStyles(targetStyles),
                endStyles: fillStyles(rawEndStyles),
            };
            easterEggTriggerCount += 1;
            // Publish trigger state before drawing so observers see the transition immediately.
            canvas.dataset.constellationPhrase = phrase;
            canvas.dataset.easterEggState = 'morph-in';
            drawScene(elapsed);
        };
        const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null
            : new IntersectionObserver(([entry]) => {
                isOnscreen = entry?.isIntersecting ?? false;
                syncAnimation();
            }, { threshold: 0.01 });

        window.addEventListener('resize', handleResize);
        document.addEventListener('click', handleDocumentClick, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        motionQuery.addEventListener('change', handleMotionChange);
        intersectionObserver?.observe(canvas);
        handleResize();
        syncAnimation();

        return () => {
            if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
            intersectionObserver?.disconnect();
            motionQuery.removeEventListener('change', handleMotionChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('click', handleDocumentClick);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full pointer-events-none select-none"
            aria-hidden="true"
            style={{ pointerEvents: 'none' }}
        />
    );
};

export default SpaceNeuralBackground;
