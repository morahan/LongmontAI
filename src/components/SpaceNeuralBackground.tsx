import React, { useLayoutEffect, useRef } from 'react';
import {
    CONSTELLATION_WINDOW_SECONDS,
    createConstellationGeometry,
    createConstellationGeometryForPhrase,
    createEasterEggTargetStyles,
    createPlanetSystem,
    createSpaceScene,
    getConstellationPhase,
    getConstellationStrength,
    getEasterEggPhase,
    getEasterEggStarFieldPositions,
    getEasterEggStrength,
    getEasterEggStarFieldStyles,
    getElapsedSecondsSinceMount,
    getNeuralSignals,
    getOrbitingMoon,
    getOrbitingPlanets,
    getPlanetSurfaceDetailLevel,
    PLANET_RENDER_SCALE,
    PLANET_RING_LINE_WIDTH,
    SYSTEM_STAR_RADIUS,
    getSimulationTime,
    getStarFieldPositions,
    getStarFieldStyles,
    getStarRgb,
    getSystemOpacity,
    getSystemScale,
    getTravelerAppearance,
    getUfoAppearance,
    hasAtmosphereHalo,
    isStarRenderable,
    isUfoTraveler,
    projectTraveler,
    selectEasterEggPhrase,
    selectProminentSystemOwner,
    shouldTriggerEasterEgg,
    travelerCountForWidth,
    type ConstellationGeometry,
    type ConstellationPhrase,
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
    phrase: ConstellationPhrase;
    startStrength: number;
    endStrength: number;
    startLineLayers: LineLayer[];
    endGeometry: ConstellationGeometry;
    geometry: ConstellationGeometry;
    startPositions: Point[];
    targetPositions: Point[];
    endPositions: Point[];
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

    const distanceFromSun = Math.hypot(renderedPlanet.x, renderedPlanet.y) || 1;
    const lightX = renderedPlanet.x - (renderedPlanet.x / distanceFromSun) * renderedPlanet.radius * 0.35;
    const lightY = renderedPlanet.y - (renderedPlanet.y / distanceFromSun) * renderedPlanet.radius * 0.35;
    const shading = ctx.createRadialGradient(
        lightX, lightY, renderedPlanet.radius * 0.05,
        lightX, lightY, renderedPlanet.radius * 1.5,
    );
    shading.addColorStop(0, 'rgba(242, 251, 251, 0.42)');
    shading.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
    shading.addColorStop(1, 'rgba(10, 15, 24, 0.6)');
    ctx.fillStyle = shading;
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

const drawTravelerStar = (
    ctx: CanvasRenderingContext2D,
    traveler: Traveler,
    projection: ProjectedTraveler,
) => {
    const appearance = getTravelerAppearance(traveler, projection.progress);
    const { x, y } = projection;
    if (appearance.detailLevel === 0) {
        ctx.fillStyle = `rgba(224, 242, 254, ${projection.opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, appearance.radius, 0, TAU);
        ctx.fill();
        return;
    }
    if (appearance.detailLevel >= 1) {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, appearance.haloRadius);
        halo.addColorStop(0, `rgba(238, 249, 255, ${projection.opacity * 0.72})`);
        halo.addColorStop(0.42, `rgba(128, 205, 235, ${projection.opacity * 0.2})`);
        halo.addColorStop(1, 'rgba(80, 156, 201, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, appearance.haloRadius, 0, TAU);
        ctx.fill();
    }
    if (appearance.detailLevel === 3) {
        ctx.strokeStyle = `rgba(194, 231, 247, ${projection.opacity * 0.24})`;
        ctx.lineWidth = Math.max(0.35, appearance.radius * 0.08);
        ctx.beginPath();
        ctx.moveTo(x - appearance.flareLength, y);
        ctx.lineTo(x + appearance.flareLength, y);
        ctx.moveTo(x, y - appearance.flareLength * 0.62);
        ctx.lineTo(x, y + appearance.flareLength * 0.62);
        ctx.stroke();
    }
    const disc = ctx.createRadialGradient(
        x - appearance.radius * 0.22,
        y - appearance.radius * 0.25,
        0,
        x,
        y,
        appearance.radius,
    );
    disc.addColorStop(0, `rgba(255, 255, 255, ${projection.opacity})`);
    disc.addColorStop(appearance.detailLevel >= 2 ? 0.38 : 0.62, `rgba(224, 242, 254, ${projection.opacity})`);
    disc.addColorStop(1, `rgba(109, 190, 226, ${projection.opacity * 0.78})`);
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, appearance.radius, 0, TAU);
    ctx.fill();

    if (appearance.detailLevel >= 2) {
        ctx.fillStyle = `rgba(117, 185, 215, ${projection.opacity * 0.32})`;
        for (let spot = 0; spot < 3; spot += 1) {
            const spotAngle = surfaceValue(traveler.seed, spot) * TAU;
            const distance = surfaceValue(traveler.seed, spot + 4) * appearance.coreRadius;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(spotAngle) * distance,
                y + Math.sin(spotAngle) * distance,
                appearance.radius * (0.055 + surfaceValue(traveler.seed, spot + 8) * 0.05),
                0,
                TAU,
            );
            ctx.fill();
        }
    }
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
        let easterEggTriggerCount = 0;

        const clearEasterEggDataset = () => {
            delete canvas.dataset.constellationPhrase;
            delete canvas.dataset.easterEggState;
        };

        const getScheduledStarFrame = (elapsed: number) => {
            const phase = getConstellationPhase(elapsed);
            if (!constellationGeometry || constellationEvent !== phase.event) {
                constellationGeometry = createConstellationGeometry(width, height, scene.seed, phase.event);
                constellationEvent = phase.event;
            }
            return {
                geometry: constellationGeometry,
                phase,
                strength: getConstellationStrength(phase),
                lineLayers: [{
                    geometry: constellationGeometry,
                    strength: getConstellationStrength(phase),
                }],
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
                    ctx.moveTo(positions[from].x, positions[from].y);
                    ctx.lineTo(positions[to].x, positions[to].y);
                });
                ctx.stroke();
            });

            for (let index = 0; index < positions.length; index += 1) {
                const style = styles[index];
                if (!isStarRenderable(style)) continue;
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
                    if (isUfoTraveler(traveler, projection.cycle)) {
                        drawUfo(ctx, traveler, projection, deltaX, deltaY);
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
            constellationEvent = getConstellationPhase(elapsed).event;
            constellationGeometry = createConstellationGeometry(width, height, scene.seed, constellationEvent);
            if (easterEgg && previousWidth > 0 && previousHeight > 0) {
                const scalePoints = (points: Point[]) => points.map(({ x, y }) => ({
                    x: x * width / previousWidth,
                    y: y * height / previousHeight,
                }));
                easterEgg.startPositions = scalePoints(easterEgg.startPositions);
                easterEgg.endPositions = scalePoints(easterEgg.endPositions);
                easterEgg.geometry = createConstellationGeometryForPhrase(width, height, easterEgg.phrase);
                easterEgg.targetPositions = easterEgg.geometry.points;
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
            if (!shouldTriggerEasterEgg(
                event.detail,
                isInsideCanvas,
                isInteractiveTarget,
                reducedMotion,
            )) return;

            const elapsed = getElapsedSecondsSinceMount(mountedAt, performance.now());
            const currentFrame = getRenderedStarFrame(elapsed);
            const phrase = selectEasterEggPhrase(scene.seed, easterEggTriggerCount);
            const geometry = createConstellationGeometryForPhrase(width, height, phrase);
            const endpointPhase = getConstellationPhase(elapsed + CONSTELLATION_WINDOW_SECONDS);
            easterEgg = {
                startedAt: elapsed,
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
                startPositions: currentFrame.positions.map((point) => ({ ...point })),
                targetPositions: geometry.points,
                endPositions: getStarFieldPositions(
                    scene.seed,
                    elapsed + CONSTELLATION_WINDOW_SECONDS,
                    width,
                    height,
                ),
                startStyles: currentFrame.styles.map((style) => ({ ...style })),
                targetStyles: createEasterEggTargetStyles(scene.seed, easterEggTriggerCount),
                endStyles: getStarFieldStyles(scene.seed, elapsed + CONSTELLATION_WINDOW_SECONDS),
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
