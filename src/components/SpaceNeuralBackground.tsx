import React, { useLayoutEffect, useRef } from 'react';
import { createBlackHole, stepBlackHole, type BlackHoleState } from './blackHoleModel';
import {
    advanceEasterEggClickSequence,
    CONSTELLATION_WINDOW_SECONDS,
    FAR_DEPTH,
    NEAR_DEPTH,
    createConstellationGeometry,
    createConstellationGeometryForPhrase,
    createEasterEggTargetStyles,
    createEmbeddedGalaxySystems,
    createNeuralContagionState,
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
    getEmbeddedGalaxySystemOpacity,
    getEmbeddedGalaxySystemState,
    getNeuralSignalSlot,
    getNeuralSignals,
    getNeuralEndpointTransmission,
    getOrbitingMoon,
    getOrbitingPlanets,
    getPlanetLightingStyle,
    getPlanetRenderRadius,
    getPlanetSurfaceDetailLevel,
    PLANET_RENDER_SCALE,
    PLANET_RING_LINE_WIDTH,
    AMBIENT_STAR_COUNT,
    MAX_STAR_TEXT_ANCHOR_COUNT,
    MOBILE_BREAKPOINT,
    LARGE_BREAKPOINT,
    starDensityMultiplierForWidth,
    getStarAura,
    getAmbientCardinalFlare,
    getSolarSurface,
    getTravelerDiscOpacity,
    getSystemHostStarAppearance,
    type StarAura,
    getSimulationTime,
    getScreenWrappedVelocity,
    getStarFieldPositions,
    getStarFieldStyles,
    getStarRgb,
    getSystemOpacity,
    getSystemOwnerDiscLocalRadius,
    getSystemScale,
    getGalaxyAnimationState,
    getGalaxyAppearance,
    getGalaxyParticleState,
    getTravelerAppearance,
    getTravelerStarRenderPolicy,
    getTravelerVariant,
    getUfoAppearance,
    hasAtmosphereHalo,
    isPlanetBehindSystemStar,
    isStarRenderable,
    projectTraveler,
    remapAmbientStarsToTextSlots,
    scaleConstellationGeometry,
    selectEasterEggPhrase,
    selectProminentSystemOwner,
    shouldTriggerEasterEgg,
    syncNeuralContagionState,
    travelerCountForWidth,
    updateNeuralContagionForSignal,
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

import {
    createNebulaField,
    getNebulaDepthTransmission,
    getNebulaOffset,
    getNebulaTextTransmission,
    NEBULA_WORLD_SIZE,
    sampleNebulaTransmission,
} from './spaceNebulaModel';

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
    stylesByTier: Record<number, {
        start: StarVisualStyle[];
        target: StarVisualStyle[];
        end: StarVisualStyle[];
    }>;
    endVisibility: boolean[];
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
    ownerDiscLocalRadius: number,
) => {
    const renderedPlanet = { ...planet, radius: getPlanetRenderRadius(planet.radius, ownerDiscLocalRadius) };
    if (renderedPlanet.radius <= 0) return;
    const bodyScale = renderedPlanet.radius / (planet.radius * PLANET_RENDER_SCALE);
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
        drawMoon(ctx, getOrbitingMoon(planet, { ...moon, radius: moon.radius * bodyScale }, simulationSeconds), opacity));
};

const drawNeuralSignal = (
    ctx: CanvasRenderingContext2D,
    from: ProjectedTraveler,
    to: ProjectedTraveler,
    signal: ReturnType<typeof getNeuralSignals>[number],
) => {
    const { opacity, pulseProgress, lineWidth, bend, color, sparkles } = signal;
    if (opacity <= 0) return;
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const controlX = (from.x + to.x) * 0.5 - deltaY * bend;
    const controlY = (from.y + to.y) * 0.5 + deltaX * bend;

    ctx.save();
    ctx.strokeStyle = `rgba(${color}, ${opacity})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
    ctx.stroke();

    const pointAt = (progress: number) => {
        const inverse = 1 - progress;
        return {
            x: inverse * inverse * from.x + 2 * inverse * progress * controlX + progress * progress * to.x,
            y: inverse * inverse * from.y + 2 * inverse * progress * controlY + progress * progress * to.y,
        };
    };
    const pulse = pointAt(pulseProgress);
    // A broad wash travels along the same smooth curve, not a sharp lightning head.
    const washRadius = Math.min(70, Math.hypot(deltaX, deltaY) * 0.28);
    const wash = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, washRadius);
    wash.addColorStop(0, `rgba(${color}, ${opacity * 0.8})`);
    wash.addColorStop(1, `rgba(${color}, 0)`);
    ctx.strokeStyle = wash;
    ctx.lineWidth = lineWidth * 2;
    ctx.stroke();

    for (const bead of [{ progress: pulseProgress, opacity: 1, radius: 5 }, ...sparkles]) {
        if (bead.opacity <= 0) continue;
        const point = pointAt(bead.progress);
        const glint = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, bead.radius);
        glint.addColorStop(0, `rgba(${color}, ${opacity * bead.opacity * 1.4})`);
        glint.addColorStop(0.4, `rgba(${color}, ${opacity * bead.opacity * 0.5})`);
        glint.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = glint;
        ctx.beginPath();
        ctx.arc(point.x, point.y, bead.radius, 0, TAU);
        ctx.fill();
    }
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
    radius: number,
    opacity: number,
    simulationSeconds: number,
    progress: number,
) => {
    const surface = getSolarSurface(appearance.surfaceSeed, simulationSeconds, progress);
    if (surface.strength <= 0) return;
    const seed = appearance.surfaceSeed;
    const textureOpacity = opacity * surface.strength * 0.245;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(surface.rotation);
    ctx.translate(-x, -y);
    for (const cell of surface.cells) {
        ctx.fillStyle = `rgba(142, 62, 22, ${textureOpacity * cell.intensity})`;
        ctx.beginPath();
        ctx.ellipse(x + cell.x * radius, y + cell.y * radius,
            cell.radius * radius, cell.radius * radius * 0.7, cell.intensity, 0, TAU);
        ctx.fill();
    }
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

const drawTravelerDisc = (
    ctx: CanvasRenderingContext2D,
    appearance: ReturnType<typeof getTravelerAppearance>,
    x: number,
    y: number,
    radius: number,
    opacity: number,
    renderShadowGlow: boolean,
    simulationSeconds: number,
    progress: number,
    transmission = 1,
) => {
    const [red, green, blue] = hexToRgb(appearance.color);
    const disc = ctx.createRadialGradient(
        x - radius * 0.22, y - radius * 0.25, 0,
        x, y, radius,
    );
    const rgb = (r: number, g: number, b: number) =>
        `rgb(${Math.round(r * transmission)}, ${Math.round(g * transmission)}, ${Math.round(b * transmission)})`;
    disc.addColorStop(0, rgb(255, 255, 255));
    disc.addColorStop(0.58 - getSolarSurface(appearance.surfaceSeed, simulationSeconds, progress).strength * 0.24,
        rgb(red, green, blue));
    disc.addColorStop(1, rgb(red * 0.58, green * 0.58, blue * 0.58));
    ctx.save();
    ctx.globalAlpha = opacity;
    if (renderShadowGlow) {
        ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, ${opacity * appearance.glowOpacity * transmission})`;
        ctx.shadowBlur = appearance.glowBlur;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.restore();
    drawTravelerSurface(ctx, appearance, x, y, radius, opacity * transmission, simulationSeconds, progress);
};

const drawStarAura = (
    ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, aura: StarAura, opacity: number,
) => {
    const haloRadius = radius * aura.radiusMultiplier;
    const rgb = aura.rgb.map(Math.round).join(', ');
    const halo = ctx.createRadialGradient(x, y, radius * 0.45, x, y, haloRadius);
    halo.addColorStop(0, `rgba(${rgb}, ${aura.opacity * opacity})`);
    halo.addColorStop(aura.softness, `rgba(${rgb}, ${aura.opacity * opacity * 0.35})`);
    halo.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, TAU);
    ctx.fill();
};

const drawAmbientCardinalFlare = (ctx: CanvasRenderingContext2D, position: Point, style: StarVisualStyle) => {
    const flare = getAmbientCardinalFlare(style);
    if (!flare) return;
    ctx.save();
    ctx.globalAlpha = flare.opacity;
    ctx.translate(position.x, position.y);
    ctx.fillStyle = 'rgba(255, 245, 222, 0.78)';
    for (const tip of flare.rays) {
        const sideX = -tip.y / flare.rayLength * flare.rayWidth;
        const sideY = tip.x / flare.rayLength * flare.rayWidth;
        ctx.beginPath();
        ctx.moveTo(sideX, sideY);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(-sideX, -sideY);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#fff9e8';
    ctx.beginPath();
    ctx.arc(0, 0, flare.coreRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
};

const drawTravelerStar = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
    simulationSeconds: number,
    transmission: number,
) => {
    const appearance = getTravelerAppearance(traveler, projection.progress);
    const renderPolicy = getTravelerStarRenderPolicy(false);
    const { x, y } = projection;
    const [red, green, blue] = hexToRgb(appearance.color);
    if (renderPolicy.renderHalo) {
        drawStarAura(ctx, x, y, appearance.radius, getStarAura(traveler.seed), projection.opacity);
    }

    if (renderPolicy.renderFlare && appearance.flareLength > 0) {
        ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${projection.opacity * appearance.glowOpacity * 0.72})`;
        ctx.lineWidth = Math.max(0.35, appearance.radius * 0.08);
        ctx.beginPath();
        ctx.moveTo(x - appearance.flareLength, y);
        ctx.lineTo(x + appearance.flareLength, y);
        ctx.moveTo(x, y - appearance.flareLength * 0.62);
        ctx.lineTo(x, y + appearance.flareLength * 0.62);
        ctx.stroke();
    }
    if (renderPolicy.renderDisc) {
        drawTravelerDisc(
            ctx,
            appearance,
            x,
            y,
            appearance.radius,
            getTravelerDiscOpacity(projection.progress),
            renderPolicy.renderShadowGlow,
            simulationSeconds,
            projection.progress,
            transmission,
        );
    }
};

const drawGalaxy = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
    simulationSeconds: number,
) => {
    const appearance = getGalaxyAppearance(traveler, projection.progress, projection.cycle);
    // Particle motion is resolved before local-plane flattening; sky tilt stays fixed.
    const animation = getGalaxyAnimationState(traveler, projection.cycle, 0);
    const { x, y, opacity } = projection;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(animation.rotation);

    // Formation identity comes entirely from seeded point positions, colors, and density.
    for (let star = 0; star < appearance.internalStarCount; star += 1) {
        const particle = getGalaxyParticleState(
            traveler, projection.cycle, projection.progress, simulationSeconds, star, appearance,
        );
        if (particle.opacity <= 0) continue;
        const color = particle.kind === 'dust' ? '111, 86, 83'
            : particle.kind === 'young-star' ? '151, 211, 255' : '238, 242, 247';
        ctx.fillStyle = `rgba(${color}, ${opacity * particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, TAU);
        ctx.fill();
    }

    if (appearance.formation === 'spiral' || appearance.formation === 'barred-spiral') {
        ctx.fillStyle = `rgba(2, 3, 7, ${Math.min(1, opacity * 0.9)})`;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(0.72, appearance.coreRadius * 0.2), 0, TAU);
        ctx.fill();
    }

    // Miniature systems use only filled points. Planets are ordered around their moving host.
    const embeddedSystemOpacity = opacity * getEmbeddedGalaxySystemOpacity(appearance.outerRadius);
    if (embeddedSystemOpacity > 0) {
        const systems = createEmbeddedGalaxySystems(traveler, projection.cycle, appearance);
        ctx.globalAlpha = embeddedSystemOpacity;
        for (let systemIndex = 0; systemIndex < systems.length; systemIndex += 1) {
            const system = systems[systemIndex];
            const state = getEmbeddedGalaxySystemState(system, simulationSeconds);
            for (let planetIndex = 0; planetIndex < state.planets.length; planetIndex += 1) {
                const planet = state.planets[planetIndex];
                if (planet.z >= 0) continue;
                ctx.fillStyle = planet.color;
                ctx.beginPath();
                ctx.arc(planet.x, planet.y, planet.radius, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = system.hostColor;
            ctx.beginPath();
            ctx.arc(state.host.x, state.host.y, system.hostRadius, 0, TAU);
            ctx.fill();
            for (let planetIndex = 0; planetIndex < state.planets.length; planetIndex += 1) {
                const planet = state.planets[planetIndex];
                if (planet.z < 0) continue;
                ctx.fillStyle = planet.color;
                ctx.beginPath();
                ctx.arc(planet.x, planet.y, planet.radius, 0, TAU);
                ctx.fill();
            }
        }
    }
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

const drawPlanetarySystem = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
    simulationSeconds: number,
    nebulaTransmission: number,
) => {
    const opacity = getSystemOpacity(projection, traveler.alpha) * nebulaTransmission;
    if (opacity <= 0) return;
    const scale = getSystemScale(projection);
    const planets = createPlanetSystem(traveler.seed, projection.cycle);
    const orbiting = getOrbitingPlanets(planets, simulationSeconds);
    const ownerAppearance = getSystemHostStarAppearance(traveler, projection.progress);
    const ownerPolicy = getTravelerStarRenderPolicy(true);
    // Keep current-main body caps based on the ordinary host, not the doubled stellar disc.
    const ownerDiscLocalRadius = getSystemOwnerDiscLocalRadius(
        getTravelerAppearance(traveler, projection.progress).radius, scale,
    );

    ctx.save();
    ctx.translate(projection.x, projection.y);
    ctx.scale(scale, scale);

    // The textured owner disc is the occlusion boundary: negative z behind, non-negative z in front.
    orbiting.filter((planet) => isPlanetBehindSystemStar(planet.z))
        .forEach((planet) => drawPlanet(ctx, planet, simulationSeconds, opacity, scale, ownerDiscLocalRadius));
    if (ownerPolicy.renderDisc) {
        drawTravelerDisc(
            ctx,
            ownerAppearance,
            0,
            0,
            getSystemOwnerDiscLocalRadius(ownerAppearance.radius, scale),
            getTravelerDiscOpacity(projection.progress),
            ownerPolicy.renderShadowGlow,
            simulationSeconds,
            projection.progress,
            nebulaTransmission,
        );
    }
    orbiting.filter((planet) => !isPlanetBehindSystemStar(planet.z))
        .forEach((planet) => drawPlanet(ctx, planet, simulationSeconds, opacity, scale, ownerDiscLocalRadius));
    ctx.restore();
};

const SpaceNeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // The refresh seed prefers Web Crypto. A development-only query override makes Canvas
        // motion reviews repeatable without changing production randomness or the simulation clock.
        const requestedSeedValue = import.meta.env.DEV
            ? new URLSearchParams(window.location.search).get('spaceSeed')
            : null;
        const requestedSeed = requestedSeedValue === null ? Number.NaN : Number(requestedSeedValue);
        const scene = createSpaceScene(
            Number.isInteger(requestedSeed) && requestedSeed >= 0 && requestedSeed <= 0xffffffff
                ? requestedSeed
                : undefined,
        );
        const nebula = createNebulaField(scene.seed);
        const nebulaCanvas = document.createElement('canvas');
        nebulaCanvas.width = nebulaCanvas.height = nebula.size + 2;
        const nebulaCtx = nebulaCanvas.getContext('2d');
        if (nebulaCtx) {
            const image = nebulaCtx.createImageData(nebula.size + 2, nebula.size + 2);
            for (let y = 0; y < nebula.size + 2; y += 1) {
                for (let x = 0; x < nebula.size + 2; x += 1) {
                    const transmission = nebula.transmission[
                        ((y - 1 + nebula.size) % nebula.size) * nebula.size
                        + (x - 1 + nebula.size) % nebula.size
                    ];
                    const index = (y * (nebula.size + 2) + x) * 4;
                    // Black absorbing dust against barely luminous interstellar haze.
                    image.data[index] = Math.round(11 * transmission);
                    image.data[index + 1] = Math.round(14 * transmission);
                    image.data[index + 2] = Math.round(20 * transmission);
                    image.data[index + 3] = 255;
                }
            }
            nebulaCtx.putImageData(image, 0, 0);
        }
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        const mountedAt = performance.now();
        let width = 0;
        let height = 0;
        let viewportWidth = window.innerWidth;
        let animationFrameId: number | null = null;
        let isOnscreen = typeof IntersectionObserver === 'undefined';
        let pageIsVisible = !document.hidden;
        let reducedMotion = motionQuery.matches;
        let constellationGeometry: ReturnType<typeof createConstellationGeometry> | null = null;
        let constellationEvent = -1;
        let prominentSystemOwner: ProminentSystemOwner | null = null;
        let easterEgg: EasterEggTransition | null = null;
        let easterEggClickSequence: EasterEggClickSequence | null = null;
        let easterEggTriggerCount = 0;
        let neuralContagion = createNeuralContagionState();
        let blackHole: BlackHoleState | null = null;
        let holeCenter = { x: 0, y: 0 };
        let holeLastElapsed: number | null = null;
        let lastPointerType = 'mouse';
        let cursorOwner: HTMLElement | null = null;
        let previousCursor = '';
        let previousCursorPriority = '';
        const restoreCursor = () => {
            if (cursorOwner) {
                if (previousCursor) cursorOwner.style.setProperty('cursor', previousCursor, previousCursorPriority);
                else cursorOwner.style.removeProperty('cursor');
            }
            cursorOwner = null;
        };
        const hideSurfaceCursor = (target: EventTarget | null) => {
            if (target === cursorOwner) return;
            restoreCursor();
            if (!(target instanceof HTMLElement)) return;
            cursorOwner = target;
            previousCursor = target.style.getPropertyValue('cursor');
            previousCursorPriority = target.style.getPropertyPriority('cursor');
            target.style.setProperty('cursor', 'none');
        };
        const clearBlackHole = () => {
            restoreCursor();
            blackHole = null;
            holeLastElapsed = null;
            delete canvas.dataset.blackHole;
            delete canvas.dataset.blackHoleCaptures;
        };

        const clearEasterEggDataset = () => {
            delete canvas.dataset.constellationPhrase;
            delete canvas.dataset.easterEggState;
        };

        const getScheduledStarFrame = (elapsed: number, densityWidth = viewportWidth) => {
            const phase = getConstellationPhase(elapsed, scene.seed);
            if (phase.name !== 'ambient'
                && (!constellationGeometry || constellationEvent !== phase.event)) {
                constellationGeometry = createConstellationGeometry(width, height, scene.seed, phase.event);
                constellationEvent = phase.event;
            }
            const strength = getConstellationStrength(phase);
            const poolFrame = {
                phase,
                strength,
                lineLayers: constellationGeometry && phase.name !== 'ambient'
                    ? [{ geometry: constellationGeometry, strength }]
                    : [],
                positions: getStarFieldPositions(scene.seed, elapsed, width, height),
                styles: getStarFieldStyles(scene.seed, elapsed, reducedMotion),
            };
            // Geometry always uses the maximum pool; responsive styles hide only absent identities.
            return densityWidth >= LARGE_BREAKPOINT ? poolFrame : { ...poolFrame,
                styles: getStarFieldStyles(scene.seed, elapsed, reducedMotion, densityWidth) };
        };

        const getRenderedStarFrame = (elapsed: number, densityWidth = viewportWidth) => {
            if (easterEgg) {
                const age = Math.max(0, elapsed - easterEgg.startedAt);
                const phase = getEasterEggPhase(age);
                if (phase.name !== 'ambient') {
                    const tierStyles = easterEgg.stylesByTier[starDensityMultiplierForWidth(densityWidth)];
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
                            {
                                targetCount: easterEgg.geometry.points.length,
                                endpointVisible: easterEgg.endVisibility,
                            },
                        ),
                        styles: getEasterEggStarFieldStyles(
                            tierStyles.start,
                            tierStyles.target,
                            tierStyles.end,
                            age,
                            {
                                targetCount: easterEgg.geometry.points.length,
                                endpointVisible: easterEgg.endVisibility,
                            },
                        ),
                    };
                }
                easterEgg = null;
                clearEasterEggDataset();
            }
            return getScheduledStarFrame(elapsed, densityWidth);
        };

        const drawScene = (elapsed: number, renderDetails = true) => {
            if (width <= 0 || height <= 0) return;
            ctx.globalAlpha = 1;
            // The canvas owns an opaque, unmodulated black backdrop on every frame.
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            const nebulaSeconds = getSimulationTime(elapsed, scene.seed);
            const nebulaAt = (x: number, y: number) => sampleNebulaTransmission(
                nebula, x, y, nebulaSeconds, reducedMotion,
            );
            if (nebulaCtx) {
                const offset = getNebulaOffset(nebulaSeconds, reducedMotion);
                ctx.imageSmoothingEnabled = true;
                // A one-texel gutter avoids transparent seams between scaled tiles.
                for (let y = offset.y - NEBULA_WORLD_SIZE; y < height; y += NEBULA_WORLD_SIZE) {
                    for (let x = offset.x - NEBULA_WORLD_SIZE; x < width; x += NEBULA_WORLD_SIZE) {
                        ctx.drawImage(nebulaCanvas, 1, 1, nebula.size, nebula.size,
                            x, y, NEBULA_WORLD_SIZE, NEBULA_WORLD_SIZE);
                    }
                }
            }

            const frame = getRenderedStarFrame(elapsed);
            const { phase, styles, lineLayers } = frame;
            // Preserve responsive pools/clocks/variants; only unowned stars enter gravity.
            const simulationSeconds = getSimulationTime(elapsed, scene.seed);
            const travelerCount = travelerCountForWidth(viewportWidth);
            const travelers = scene.travelers.slice(0, travelerCount);
            const projections = travelers.map((traveler) =>
                projectTraveler(traveler, simulationSeconds, width, height));
            prominentSystemOwner = selectProminentSystemOwner(
                travelers, projections, width, height, prominentSystemOwner,
            );
            let positions = frame.positions;
            if (blackHole) {
                blackHole = stepBlackHole(blackHole, [
                    ...positions.map((point, index) => ({
                        ...point, visible: Boolean(styles[index] && isStarRenderable(styles[index])),
                    })),
                    ...projections.map((projection, index) => ({
                        ...projection, id: -1 - index,
                        visible: projection.opacity * getNebulaDepthTransmission(
                            nebulaAt(projection.x, projection.y),
                            (projection.depth - NEAR_DEPTH) / (FAR_DEPTH - NEAR_DEPTH),
                        ) > 0.01
                            && index !== prominentSystemOwner?.travelerIndex
                            && getTravelerVariant(travelers[index], projection.cycle) === 'star',
                    })),
                ], holeCenter, holeLastElapsed === null ? 0 : elapsed - holeLastElapsed);
                projections.forEach((projection, index) => {
                    const star = blackHole?.stars.get(-1 - index);
                    if (!star) return;
                    projection.x = star.x;
                    projection.y = star.y;
                    if (star.consumed) projection.opacity = 0;
                });
                holeLastElapsed = elapsed;
                positions = positions.map((point, index) => blackHole?.stars.get(index) ?? point);
                canvas.dataset.blackHoleCaptures = String(blackHole.captures);
            }
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
                    const fromStyle = styles[from];
                    const toStyle = styles[to];
                    // Connections follow revealed nodes; hidden target destinations never leak.
                    if (blackHole?.stars.get(from)?.consumed || blackHole?.stars.get(to)?.consumed
                        || !fromPoint || !toPoint || !fromStyle || !toStyle
                        || fromStyle.opacity <= 0 || toStyle.opacity <= 0
                        || fromStyle.strength <= 0 || toStyle.strength <= 0) return;
                    ctx.moveTo(fromPoint.x, fromPoint.y);
                    ctx.lineTo(toPoint.x, toPoint.y);
                });
                ctx.stroke();
            });

            for (let index = 0; index < positions.length; index += 1) {
                const style = styles[index];
                if (!style || !isStarRenderable(style) || blackHole?.stars.get(index)?.consumed) continue;
                const position = positions[index];
                const [red, green, blue] = getStarRgb(style.strength);
                ctx.globalAlpha = 1;
                const transmission = getNebulaTextTransmission(
                    nebulaAt(position.x, position.y), style.strength,
                );
                drawStarAura(ctx, position.x, position.y, style.radius,
                    style.aura ?? getStarAura(index), style.opacity * transmission);
                const coreOpacity = style.coreOpacity ?? style.opacity;
                const brightness = coreOpacity > 0 ? Math.min(1, style.opacity / coreOpacity) * transmission : 0;
                ctx.globalAlpha = coreOpacity;
                ctx.fillStyle = `rgb(${Math.round(red * brightness)}, ${Math.round(green * brightness)}, ${Math.round(blue * brightness)})`;
                ctx.beginPath();
                ctx.arc(position.x, position.y, style.radius, 0, TAU);
                ctx.fill();
                ctx.globalAlpha = 1;
                drawAmbientCardinalFlare(ctx, position, { ...style,
                    cardinalFlare: (style.cardinalFlare ?? 0) * transmission });
            }

            if (canvas.dataset.spaceReady !== 'true') {
                canvas.dataset.spaceReady = 'true';
                performance.mark('longmont-hero-space-ready');
            }
            if (!renderDetails) return;

            const nebulaTransmissions = projections.map((projection) => getNebulaDepthTransmission(
                nebulaAt(projection.x, projection.y),
                (projection.depth - NEAR_DEPTH) / (FAR_DEPTH - NEAR_DEPTH),
            ));

            // Filaments sit below traveler stars; their endpoints are always current projections.
            neuralContagion = syncNeuralContagionState(
                neuralContagion, projections, width, height,
            );
            const neuralSignals = getNeuralSignals(
                scene.seed, elapsed, projections, width, height, reducedMotion, neuralContagion,
            );
            if (neuralSignals[0]) {
                neuralContagion = updateNeuralContagionForSignal(
                    neuralContagion,
                    getNeuralSignalSlot(elapsed, scene.seed),
                    neuralSignals[0],
                    projections,
                    width,
                    height,
                );
            }
            neuralSignals.forEach((signal) => {
                // Attenuate only the rendered light; never recycle pairs or mutate contagion in dust.
                const endpointTransmission = Math.min(...[
                    signal.fromTravelerIndex, signal.toTravelerIndex,
                ].map((index) => getNeuralEndpointTransmission(
                    projections[index].opacity,
                    projections[index].opacity * nebulaTransmissions[index],
                )));
                drawNeuralSignal(
                    ctx,
                    projections[signal.fromTravelerIndex],
                    projections[signal.toTravelerIndex],
                    { ...signal, opacity: signal.opacity * endpointTransmission },
                );
            });

            for (let index = 0; index < travelers.length; index += 1) {
                const traveler = travelers[index];
                const originalProjection = projections[index];
                const transmission = nebulaTransmissions[index];
                // Keep geometry/owner selection/neural timing unchanged; attenuate all stellar light.
                const projection = { ...originalProjection,
                    opacity: originalProjection.opacity * transmission };
                if (projection.opacity > 0.01) {
                    const previous = projectTraveler(
                        traveler,
                        Math.max(0, simulationSeconds - 0.1),
                        width,
                        height,
                    );
                    const sameCycle = previous.cycle === projection.cycle;
                    const pulledStar = blackHole?.stars.get(-1 - index);
                    const deltaX = pulledStar ? pulledStar.vx * 0.1 : sameCycle ? projection.x - previous.x : 0;
                    const deltaY = pulledStar ? pulledStar.vy * 0.1 : sameCycle ? projection.y - previous.y : 0;
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
                        if (index !== prominentSystemOwner?.travelerIndex) {
                            drawTravelerStar(ctx, traveler, projection, simulationSeconds, transmission);
                        }
                    }
                }

                if (index === prominentSystemOwner?.travelerIndex) {
                    drawPlanetarySystem(ctx, traveler, projection, simulationSeconds, transmission);
                }
            }
            if (blackHole) {
                // Tiny paired flecks, not a broad particle fountain or continuous emitter.
                blackHole.sparks.forEach((spark, index) => {
                    ctx.globalAlpha = (1 - spark.age / spark.lifetime) * 0.8;
                    ctx.fillStyle = ['#bde9ff', '#f9d9b7', '#d7cbff'][index % 3];
                    ctx.fillRect(spark.x - 0.5, spark.y - 1, 1, spark.returning ? 1 : 2);
                });
                ctx.globalAlpha = 1;
                const rim = ctx.createRadialGradient(holeCenter.x, holeCenter.y, 3,
                    holeCenter.x, holeCenter.y, 10);
                rim.addColorStop(0, 'rgba(181, 220, 255, 0)');
                rim.addColorStop(0.45, 'rgba(181, 220, 255, 0.48)');
                rim.addColorStop(1, 'rgba(181, 220, 255, 0)');
                ctx.fillStyle = rim;
                ctx.beginPath();
                ctx.arc(holeCenter.x, holeCenter.y, 10, 0, TAU);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(holeCenter.x, holeCenter.y, 4, 0, TAU);
                ctx.fill();
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
            if (shouldAnimate()) animationFrameId = window.requestAnimationFrame(animate);
        };

        const shouldAnimate = () => !reducedMotion && pageIsVisible && isOnscreen;
        const syncAnimation = () => {
            if (shouldAnimate()) {
                if (animationFrameId === null) {
                    animationFrameId = window.requestAnimationFrame(animate);
                }
                return;
            }
            clearBlackHole();
            if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            if (reducedMotion) drawScene(0);
        };

        const handleResize = () => {
            clearBlackHole();
            const previousWidth = width;
            const previousHeight = height;
            const rect = canvas.getBoundingClientRect();
            viewportWidth = window.innerWidth;
            width = rect.width;
            height = rect.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.max(1, Math.round(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const elapsed = reducedMotion ? 0 : getElapsedSecondsSinceMount(mountedAt, performance.now());
            const resizePhase = getConstellationPhase(elapsed, scene.seed);
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
                const scaledTargets = scalePoints(easterEgg.targetPositions);
                easterEgg.geometry = createConstellationGeometryForPhrase(
                    width, height, easterEgg.phrase, scene.seed, easterEgg.densityEvent,
                );
                easterEgg.geometry.points.forEach((point, index) => {
                    scaledTargets[index] = { ...point };
                });
                easterEgg.targetPositions = scaledTargets;
            }
            drawScene(elapsed, canvas.dataset.spaceDetailReady === 'true');
        };
        const handleVisibilityChange = () => { pageIsVisible = !document.hidden; syncAnimation(); };
        const handleMotionChange = (event: MediaQueryListEvent) => {
            reducedMotion = event.matches;
            if (reducedMotion) {
                easterEgg = null;
                neuralContagion = createNeuralContagionState();
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
            clearBlackHole();

            const elapsed = getElapsedSecondsSinceMount(mountedAt, performance.now());
            const currentFrame = getRenderedStarFrame(elapsed, LARGE_BREAKPOINT);
            const phrase = selectEasterEggPhrase(scene.seed, easterEggTriggerCount);
            const densityEvent = easterEggTriggerCount + 1;
            const geometry = createConstellationGeometryForPhrase(
                width, height, phrase, scene.seed, densityEvent,
            );
            const endpointPhase = getConstellationPhase(elapsed + CONSTELLATION_WINDOW_SECONDS, scene.seed);
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
            const retainedIndices = Array.from({ length: AMBIENT_STAR_COUNT }, (_, index) => index)
                .filter((index) => index % 4 >= 2)
                .map((index) => MAX_STAR_TEXT_ANCHOR_COUNT + index);
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
            const targetPositions = fillPoints([]);
            const targetStyles = fillStyles([]);
            geometry.points.forEach((point, index) => { targetPositions[index] = { ...point }; });
            createEasterEggTargetStyles(
                scene.seed, easterEggTriggerCount, geometry.points.length,
            ).forEach((style, index) => { targetStyles[index] = { ...style }; });
            retainedIndices.forEach((sourceIndex, index) => {
                targetPositions[sourceIndex] = { ...retainedPositions[index] };
                targetStyles[sourceIndex] = { ...retainedStyles[index] };
            });
            let startPositions = fillPoints(currentFrame.positions);
            let startStyles = fillStyles(currentFrame.styles);
            const endStyles = fillStyles(rawEndStyles);
            if (currentFrame.phase.name === 'ambient') {
                const remapped = remapAmbientStarsToTextSlots(
                    startPositions, startStyles, geometry.points.length,
                );
                startPositions = remapped.positions;
                startStyles = remapped.styles;
                remapped.sourceIndices.forEach((sourceIndex) => {
                    targetStyles[sourceIndex] = { ...startStyles[sourceIndex] };
                });
            }
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
                startPositions,
                targetPositions,
                endPositions: fillPoints(rawEndPositions),
                endVelocities: fillVelocities(rawEndVelocities),
                stylesByTier: Object.fromEntries([0, MOBILE_BREAKPOINT, LARGE_BREAKPOINT].map((tierWidth) => {
                    const frame = getRenderedStarFrame(elapsed, tierWidth);
                    const tierStart = currentFrame.phase.name === 'ambient'
                        ? remapAmbientStarsToTextSlots(fillPoints(frame.positions), fillStyles(frame.styles), geometry.points.length).styles
                        : fillStyles(frame.styles);
                    const tierTarget = targetStyles.map((style, index) => index < geometry.points.length
                        ? style : retainedIndices.includes(index) ? frame.styles[index] : hiddenStyle);
                    return [starDensityMultiplierForWidth(tierWidth), {
                        start: tierStart, target: tierTarget,
                        end: fillStyles(getStarFieldStyles(scene.seed, endpointElapsed, reducedMotion, tierWidth)),
                    }];
                })),
                endVisibility: endStyles.map(isStarRenderable),
            };
            easterEggTriggerCount += 1;
            // Publish trigger state before drawing so observers see the transition immediately.
            canvas.dataset.constellationPhrase = phrase;
            canvas.dataset.easterEggState = 'morph-in';
            drawScene(elapsed);
        };
        // Passive document listeners leave selection, links, forms, and click sequences intact.
        const isHoleSurface = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const target = event.target instanceof Element ? event.target : null;
            return event.clientX >= rect.left && event.clientX <= rect.right
                && event.clientY >= rect.top && event.clientY <= rect.bottom
                && !target?.closest(`${INTERACTIVE_TARGET_SELECTOR},[contenteditable]:not([contenteditable="false"]),[role="textbox"],p,h1,h2,h3,h4,h5,h6,span,li,pre,code,blockquote`);
        };
        const handleDoubleClick = (event: MouseEvent) => {
            // The fourth click can emit another dblclick; don't undo the triple-click Easter egg.
            if (event.detail > 2 || event.button !== 0 || event.ctrlKey || event.metaKey
                || event.altKey || event.shiftKey || reducedMotion || !finePointerQuery.matches
                || lastPointerType !== 'mouse' || !shouldAnimate() || !isHoleSurface(event)) return;
            // Browsers can select the nearest heading even on blank section space.
            // Only this accepted blank-surface gesture clears that incidental selection.
            window.getSelection()?.removeAllRanges();
            if (blackHole) { clearBlackHole(); return; }
            const rect = canvas.getBoundingClientRect();
            holeCenter = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            blackHole = createBlackHole();
            holeLastElapsed = null;
            canvas.dataset.blackHole = 'active';
            hideSurfaceCursor(event.target);
        };
        const handlePointerMove = (event: PointerEvent) => {
            lastPointerType = event.pointerType;
            if (!blackHole) return;
            if (event.pointerType !== 'mouse' || !isHoleSurface(event)) { clearBlackHole(); return; }
            hideSurfaceCursor(event.target);
            const rect = canvas.getBoundingClientRect();
            holeCenter = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        };
        const handlePointerDown = (event: PointerEvent) => {
            lastPointerType = event.pointerType;
            if (event.pointerType !== 'mouse') clearBlackHole();
        };
        const handlePointerOut = (event: PointerEvent) => {
            if (!event.relatedTarget) clearBlackHole();
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') clearBlackHole();
        };
        const handlePointerCapability = () => { if (!finePointerQuery.matches) clearBlackHole(); };
        const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null
            : new IntersectionObserver(([entry]) => {
                isOnscreen = entry?.isIntersecting ?? false;
                syncAnimation();
            }, { threshold: 0.01 });

        window.addEventListener('resize', handleResize);
        window.addEventListener('blur', clearBlackHole);
        document.addEventListener('dblclick', handleDoubleClick, { passive: true });
        document.addEventListener('pointermove', handlePointerMove, { passive: true });
        document.addEventListener('pointerdown', handlePointerDown, { passive: true });
        document.addEventListener('pointerout', handlePointerOut, { passive: true });
        document.addEventListener('keydown', handleEscape);
        finePointerQuery.addEventListener('change', handlePointerCapability);
        document.addEventListener('click', handleDocumentClick, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        motionQuery.addEventListener('change', handleMotionChange);
        intersectionObserver?.observe(canvas);
        handleResize();
        syncAnimation();

        return () => {
            clearBlackHole();
            window.removeEventListener('blur', clearBlackHole);
            document.removeEventListener('dblclick', handleDoubleClick);
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('pointerout', handlePointerOut);
            document.removeEventListener('keydown', handleEscape);
            finePointerQuery.removeEventListener('change', handlePointerCapability);
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
