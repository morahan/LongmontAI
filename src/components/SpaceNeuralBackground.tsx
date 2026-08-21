import React, { useLayoutEffect, useRef } from 'react';
import {
    createConstellationGeometry,
    createPlanetSystem,
    createSpaceScene,
    getConstellationPhase,
    getConstellationStrength,
    getElapsedSecondsSinceMount,
    getOrbitingPlanets,
    getPlanetSurfaceDetailLevel,
    getSimulationTime,
    getStarFieldPositions,
    getStarFieldStyles,
    getStarRgb,
    getSystemScale,
    getTravelerAppearance,
    hasAtmosphereHalo,
    isStarRenderable,
    projectTraveler,
    selectProminentSystem,
    travelerCountForWidth,
    type Moon,
    type OrbitingPlanet,
    type ProjectedTraveler,
    type Traveler,
} from './spaceBackgroundModel';

const TAU = Math.PI * 2;

const drawMoon = (
    ctx: CanvasRenderingContext2D,
    planet: OrbitingPlanet,
    moon: Moon,
    simulationSeconds: number,
    opacity: number,
) => {
    const angle = moon.phase + simulationSeconds * moon.speed;
    ctx.fillStyle = `rgba(219, 229, 234, ${opacity * 0.75})`;
    ctx.beginPath();
    ctx.arc(
        planet.x + Math.cos(angle) * moon.orbitRadius,
        planet.y + Math.sin(angle) * moon.orbitRadius * 0.55,
        moon.radius,
        0,
        TAU,
    );
    ctx.fill();
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
            ctx.strokeStyle = band % 2 === 0 ? 'rgba(255, 225, 174, 0.42)' : 'rgba(91, 53, 59, 0.34)';
            ctx.lineWidth = radius * (0.16 + surfaceValue(surfaceSeed, band + 3) * 0.08);
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
        ctx.fillStyle = 'rgba(159, 224, 231, 0.3)';
        for (let cloud = 0; cloud < detailLevel + 1; cloud += 1) {
            const cloudX = x + (surfaceValue(surfaceSeed, cloud) * 1.4 - 0.7) * radius;
            const cloudY = y + (surfaceValue(surfaceSeed, cloud + 4) * 1.2 - 0.6) * radius;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, radius * 0.58, radius * 0.16, -0.2, 0, TAU);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(238, 252, 250, 0.58)';
        ctx.lineWidth = radius * 0.13;
        ctx.beginPath();
        ctx.arc(x, y - radius * 0.08, radius * 0.72, 0.15, 2.35);
        ctx.stroke();
    } else if (planet.atmosphere === 'rocky-cratered') {
        for (let crater = 0; crater < detailLevel + 2; crater += 1) {
            const craterRadius = radius * (0.1 + surfaceValue(surfaceSeed, crater + 8) * 0.12);
            ctx.fillStyle = 'rgba(43, 31, 32, 0.4)';
            ctx.beginPath();
            ctx.arc(
                x + (surfaceValue(surfaceSeed, crater) * 1.35 - 0.675) * radius,
                y + (surfaceValue(surfaceSeed, crater + 4) * 1.25 - 0.625) * radius,
                craterRadius,
                0,
                TAU,
            );
            ctx.fill();
        }
    } else if (planet.atmosphere === 'ice') {
        ctx.strokeStyle = 'rgba(70, 130, 158, 0.58)';
        ctx.lineWidth = radius * 0.08;
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
        ctx.fillStyle = 'rgba(31, 24, 29, 0.5)';
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.strokeStyle = 'rgba(255, 105, 46, 0.86)';
        ctx.lineWidth = radius * 0.12;
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

const drawPlanet = (
    ctx: CanvasRenderingContext2D,
    planet: OrbitingPlanet,
    simulationSeconds: number,
    opacity: number,
    systemScale: number,
) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    if (planet.hasRing) {
        ctx.strokeStyle = 'rgba(202, 214, 222, 0.58)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(planet.x, planet.y, planet.radius * 1.85, planet.radius * 0.55, planet.tilt, 0, TAU);
        ctx.stroke();
    }

    if (hasAtmosphereHalo(planet.atmosphere)) {
        ctx.strokeStyle = planet.atmosphere === 'ice'
            ? 'rgba(190, 235, 246, 0.34)'
            : 'rgba(130, 215, 235, 0.3)';
        ctx.lineWidth = planet.radius * 0.12;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius * 1.12, 0, TAU);
        ctx.stroke();
    }

    ctx.fillStyle = planet.color;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, TAU);
    ctx.fill();
    const surfaceDetail = getPlanetSurfaceDetailLevel(planet.radius, systemScale);
    if (surfaceDetail === 1 || surfaceDetail === 2) {
        drawAtmosphereSurface(ctx, planet, surfaceDetail);
    }

    const distanceFromSun = Math.hypot(planet.x, planet.y) || 1;
    const lightX = planet.x - (planet.x / distanceFromSun) * planet.radius * 0.35;
    const lightY = planet.y - (planet.y / distanceFromSun) * planet.radius * 0.35;
    const shading = ctx.createRadialGradient(
        lightX, lightY, planet.radius * 0.05,
        lightX, lightY, planet.radius * 1.5,
    );
    shading.addColorStop(0, 'rgba(242, 251, 251, 0.55)');
    shading.addColorStop(0.38, 'rgba(255, 255, 255, 0)');
    shading.addColorStop(1, 'rgba(10, 15, 24, 0.78)');
    ctx.fillStyle = shading;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
    planet.moons.forEach((moon) => drawMoon(ctx, planet, moon, simulationSeconds, opacity));
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

const drawSun = (ctx: CanvasRenderingContext2D, opacity: number) => {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
    glow.addColorStop(0, `rgba(245, 250, 255, ${opacity})`);
    glow.addColorStop(0.28, `rgba(160, 218, 238, ${opacity * 0.4})`);
    glow.addColorStop(1, 'rgba(106, 182, 211, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
};

const drawPlanetarySystem = (
    ctx: CanvasRenderingContext2D,
    projection: ProjectedTraveler,
    travelerSeed: number,
    simulationSeconds: number,
) => {
    const detailFade = Math.min(
        1,
        Math.max(0, (projection.progress - 0.34) / 0.12),
        Math.max(0, (0.86 - projection.progress) / 0.14),
    );
    const opacity = projection.opacity * detailFade;
    const scale = getSystemScale(projection);
    const planets = createPlanetSystem(travelerSeed, projection.cycle);
    const orbiting = getOrbitingPlanets(planets, simulationSeconds);

    ctx.save();
    ctx.translate(projection.x, projection.y);
    ctx.scale(scale, scale);

    planets.forEach((planet) => {
        ctx.strokeStyle = `rgba(151, 189, 211, ${opacity * 0.17})`;
        ctx.lineWidth = 0.45 / scale;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.orbitRadius, planet.orbitRadius * planet.inclination, planet.tilt, 0, TAU);
        ctx.stroke();
    });

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

        const drawScene = (elapsed: number, renderDetails = true) => {
            if (width <= 0 || height <= 0) return;
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            if (backdropGlow) {
                ctx.fillStyle = backdropGlow;
                ctx.fillRect(0, 0, width, height);
            }

            const phase = getConstellationPhase(elapsed);
            const strength = getConstellationStrength(phase);
            const styles = getStarFieldStyles(scene.seed, elapsed);
            const positions = getStarFieldPositions(scene.seed, elapsed, width, height);
            const lineOpacity = 0.15 * strength;
            if (lineOpacity > 0 && constellationGeometry) {
                ctx.strokeStyle = `rgba(176, 217, 235, ${lineOpacity})`;
                ctx.lineWidth = 0.55;
                ctx.beginPath();
                constellationGeometry.edges.forEach(({ from, to }) => {
                    ctx.moveTo(positions[from].x, positions[from].y);
                    ctx.lineTo(positions[to].x, positions[to].y);
                });
                ctx.stroke();
            }

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
            const prominentSystem = selectProminentSystem(travelers, projections, width, height);

            for (let index = 0; index < travelers.length; index += 1) {
                const traveler = travelers[index];
                const projection = projections[index];
                if (projection.opacity <= 0.01) continue;
                const previous = projectTraveler(
                    traveler,
                    Math.max(0, simulationSeconds - 0.1),
                    width,
                    height,
                );
                if (previous.cycle === projection.cycle) {
                    const deltaX = projection.x - previous.x;
                    const deltaY = projection.y - previous.y;
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
                if (index === prominentSystem) {
                    drawPlanetarySystem(ctx, projection, traveler.seed, simulationSeconds);
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
            constellationGeometry = createConstellationGeometry(width, height);
            drawScene(reducedMotion ? 0 : getElapsedSecondsSinceMount(mountedAt, performance.now()), false);
        };
        const handleVisibilityChange = () => { pageIsVisible = !document.hidden; syncAnimation(); };
        const handleMotionChange = (event: MediaQueryListEvent) => { reducedMotion = event.matches; syncAnimation(); };
        const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null
            : new IntersectionObserver(([entry]) => {
                isOnscreen = entry?.isIntersecting ?? false;
                syncAnimation();
            }, { threshold: 0.01 });

        window.addEventListener('resize', handleResize);
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
