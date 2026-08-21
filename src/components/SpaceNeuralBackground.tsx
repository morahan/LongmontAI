import React, { useEffect, useRef } from 'react';
import {
    createConstellationGeometry,
    createPlanetSystem,
    createSpaceScene,
    getConstellationPhase,
    getConstellationStrength,
    getElapsedSecondsSinceMount,
    getOrbitingPlanets,
    getSimulationTime,
    getStarFieldPositions,
    getStarFieldStyles,
    getSystemScale,
    projectTraveler,
    selectProminentSystem,
    starCountForWidth,
    travelerCountForWidth,
    type Moon,
    type OrbitingPlanet,
    type ProjectedTraveler,
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

const drawPlanet = (
    ctx: CanvasRenderingContext2D,
    planet: OrbitingPlanet,
    simulationSeconds: number,
    opacity: number,
) => {
    ctx.globalAlpha = opacity;
    if (planet.hasRing) {
        ctx.strokeStyle = 'rgba(202, 214, 222, 0.58)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(planet.x, planet.y, planet.radius * 1.85, planet.radius * 0.55, planet.tilt, 0, TAU);
        ctx.stroke();
    }

    const distanceFromSun = Math.hypot(planet.x, planet.y) || 1;
    const lightX = planet.x - (planet.x / distanceFromSun) * planet.radius * 0.32;
    const lightY = planet.y - (planet.y / distanceFromSun) * planet.radius * 0.32;
    const shading = ctx.createRadialGradient(
        lightX,
        lightY,
        planet.radius * 0.08,
        lightX,
        lightY,
        planet.radius * 1.45,
    );
    shading.addColorStop(0, '#eef8fb');
    shading.addColorStop(0.32, planet.color);
    shading.addColorStop(1, 'rgba(18, 26, 38, 0.92)');
    ctx.fillStyle = shading;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, TAU);
    ctx.fill();
    planet.moons.forEach((moon) => drawMoon(ctx, planet, moon, simulationSeconds, opacity));
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
        .forEach((planet) => drawPlanet(ctx, planet, simulationSeconds, opacity));
    drawSun(ctx, opacity);
    orbiting.filter((planet) => planet.z >= 0)
        .forEach((planet) => drawPlanet(ctx, planet, simulationSeconds, opacity));
    ctx.restore();
};

const SpaceNeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
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

        const drawScene = (elapsed: number) => {
            if (width <= 0 || height <= 0) return;
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            const glow = ctx.createRadialGradient(
                width * 0.5, height * 0.42, 0,
                width * 0.5, height * 0.42, Math.max(width, height) * 0.62,
            );
            glow.addColorStop(0, 'rgba(19, 49, 68, 0.1)');
            glow.addColorStop(0.52, 'rgba(35, 25, 59, 0.035)');
            glow.addColorStop(1, 'rgba(5, 5, 8, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            const phase = getConstellationPhase(elapsed);
            const strength = getConstellationStrength(phase);
            const styles = getStarFieldStyles(scene.seed, elapsed);
            const positions = getStarFieldPositions(scene.seed, elapsed, width, height);
            const constellation = createConstellationGeometry(width, height);
            const lineOpacity = 0.15 * strength;
            if (lineOpacity > 0) {
                ctx.strokeStyle = `rgba(176, 217, 235, ${lineOpacity})`;
                ctx.lineWidth = 0.55;
                ctx.beginPath();
                constellation.edges.forEach(({ from, to }) => {
                    ctx.moveTo(positions[from].x, positions[from].y);
                    ctx.lineTo(positions[to].x, positions[to].y);
                });
                ctx.stroke();
            }

            const starCount = starCountForWidth(width);
            for (let index = 0; index < starCount; index += 1) {
                const style = styles[index];
                const position = positions[index];
                ctx.globalAlpha = 1;
                ctx.fillStyle = `rgba(214, 231, 239, ${style.opacity})`;
                ctx.beginPath();
                ctx.arc(position.x, position.y, style.radius, 0, TAU);
                ctx.fill();
            }

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

                ctx.fillStyle = `rgba(224, 242, 254, ${projection.opacity})`;
                ctx.beginPath();
                ctx.arc(projection.x, projection.y, projection.radius, 0, TAU);
                ctx.fill();
                if (index === prominentSystem) {
                    drawPlanetarySystem(ctx, projection, traveler.seed, simulationSeconds);
                }
            }
            ctx.globalAlpha = 1;
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
            drawScene(reducedMotion ? 0 : getElapsedSecondsSinceMount(mountedAt, performance.now()));
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
