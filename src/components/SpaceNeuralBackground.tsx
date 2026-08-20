import React, { useEffect, useRef } from 'react';
import {
    createSpaceScene,
    getSystemScale,
    getTwinkleBrightness,
    projectTraveler,
    selectProminentSystem,
    starCountForWidth,
    travelerCountForWidth,
    type Planet,
    type ProjectedTraveler,
} from './spaceBackgroundModel';

const TAU = Math.PI * 2;

const drawPlanetarySystem = (
    ctx: CanvasRenderingContext2D,
    projection: ProjectedTraveler,
    planets: Planet[],
    elapsedSeconds: number,
) => {
    const detailFade = Math.min(
        1,
        Math.max(0, (projection.progress - 0.38) / 0.12),
        Math.max(0, (0.84 - projection.progress) / 0.14),
    );
    const opacity = projection.opacity * detailFade;
    const scale = getSystemScale(projection);

    ctx.save();
    ctx.translate(projection.x, projection.y);
    ctx.scale(scale, scale);

    for (const planet of planets) {
        ctx.strokeStyle = `rgba(151, 189, 211, ${opacity * 0.2})`;
        ctx.lineWidth = 0.45 / scale;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.orbitRadius, planet.orbitRadius * 0.34, -0.18, 0, TAU);
        ctx.stroke();
    }

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
    glow.addColorStop(0, `rgba(238, 248, 255, ${opacity})`);
    glow.addColorStop(0.28, `rgba(160, 218, 238, ${opacity * 0.34})`);
    glow.addColorStop(1, 'rgba(106, 182, 211, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();

    for (const planet of planets) {
        const angle = planet.phase + elapsedSeconds * 0.24 / Math.sqrt(planet.orbitRadius);
        const planetX = Math.cos(angle) * planet.orbitRadius;
        const planetY = Math.sin(angle) * planet.orbitRadius * 0.34;

        ctx.fillStyle = planet.color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planet.radius, 0, TAU);
        ctx.fill();

        if (planet.hasMoon) {
            const moonAngle = angle * 2.7 + 1.2;
            const moonOrbit = planet.radius + 2;
            ctx.strokeStyle = `rgba(190, 211, 222, ${opacity * 0.2})`;
            ctx.lineWidth = 0.35 / scale;
            ctx.beginPath();
            ctx.arc(planetX, planetY, moonOrbit, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = `rgba(211, 222, 228, ${opacity * 0.72})`;
            ctx.beginPath();
            ctx.arc(
                planetX + Math.cos(moonAngle) * moonOrbit,
                planetY + Math.sin(moonAngle) * moonOrbit,
                0.42,
                0,
                TAU,
            );
            ctx.fill();
        }
    }

    ctx.restore();
};

const SpaceNeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const scene = createSpaceScene();
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        let width = 0;
        let height = 0;
        let elapsedSeconds = 0;
        let previousTimestamp: number | null = null;
        let animationFrameId: number | null = null;
        let isOnscreen = typeof IntersectionObserver === 'undefined';
        let pageIsVisible = !document.hidden;
        let reducedMotion = motionQuery.matches;

        const drawScene = (elapsed: number) => {
            if (width <= 0 || height <= 0) return;

            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            const glow = ctx.createRadialGradient(
                width * 0.5,
                height * 0.42,
                0,
                width * 0.5,
                height * 0.42,
                Math.max(width, height) * 0.62,
            );
            glow.addColorStop(0, 'rgba(19, 49, 68, 0.1)');
            glow.addColorStop(0.52, 'rgba(35, 25, 59, 0.035)');
            glow.addColorStop(1, 'rgba(5, 5, 8, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            // Layer one: fixed coordinates. Only each star's independent twinkle changes.
            const starCount = starCountForWidth(width);
            for (let index = 0; index < starCount; index += 1) {
                const star = scene.stars[index];
                const brightness = getTwinkleBrightness(star, elapsed);
                ctx.fillStyle = `rgba(214, 231, 239, ${star.alpha * brightness})`;
                ctx.beginPath();
                ctx.arc(star.x * width, star.y * height, star.size, 0, TAU);
                ctx.fill();
            }

            // Layer two: a small elapsed-time field using reciprocal-depth projection.
            const travelerCount = travelerCountForWidth(width);
            const travelers = scene.travelers.slice(0, travelerCount);
            const projections = travelers.map((traveler) =>
                projectTraveler(traveler, elapsed, width, height));
            const prominentSystem = selectProminentSystem(
                travelers,
                projections,
                width,
                height,
            );

            for (let index = 0; index < travelers.length; index += 1) {
                const traveler = travelers[index];
                const projection = projections[index];
                if (projection.opacity <= 0.01) continue;

                const previous = projectTraveler(traveler, Math.max(0, elapsed - 0.1), width, height);
                if (previous.cycle === projection.cycle) {
                    const deltaX = projection.x - previous.x;
                    const deltaY = projection.y - previous.y;
                    const distance = Math.hypot(deltaX, deltaY);
                    if (distance > 0.35) {
                        const tailScale = Math.min(1, 5 / distance);
                        ctx.strokeStyle = `rgba(184, 218, 233, ${projection.opacity * 0.16})`;
                        ctx.lineWidth = Math.max(0.35, projection.radius * 0.45);
                        ctx.beginPath();
                        ctx.moveTo(
                            projection.x - deltaX * tailScale,
                            projection.y - deltaY * tailScale,
                        );
                        ctx.lineTo(projection.x, projection.y);
                        ctx.stroke();
                    }
                }

                ctx.fillStyle = `rgba(224, 242, 254, ${projection.opacity})`;
                ctx.beginPath();
                ctx.arc(projection.x, projection.y, projection.radius, 0, TAU);
                ctx.fill();

                if (index === prominentSystem && traveler.planets) {
                    drawPlanetarySystem(ctx, projection, traveler.planets, elapsed);
                }
            }
        };

        const animate = (timestamp: number) => {
            animationFrameId = null;
            if (previousTimestamp !== null) {
                elapsedSeconds += Math.min((timestamp - previousTimestamp) / 1000, 0.25);
            }
            previousTimestamp = timestamp;
            drawScene(elapsedSeconds);
            animationFrameId = window.requestAnimationFrame(animate);
        };

        const shouldAnimate = () => !reducedMotion && pageIsVisible && isOnscreen;

        const syncAnimation = () => {
            if (shouldAnimate()) {
                if (animationFrameId === null) {
                    previousTimestamp = null;
                    animationFrameId = window.requestAnimationFrame(animate);
                }
                return;
            }

            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            previousTimestamp = null;
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
            drawScene(reducedMotion ? 0 : elapsedSeconds);
        };

        const handleVisibilityChange = () => {
            pageIsVisible = !document.hidden;
            syncAnimation();
        };

        const handleMotionChange = (event: MediaQueryListEvent) => {
            reducedMotion = event.matches;
            syncAnimation();
        };

        const intersectionObserver = typeof IntersectionObserver === 'undefined'
            ? null
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
