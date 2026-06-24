import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    z: number;
    px: number; // Previous projection X for tail effects
    py: number; // Previous projection Y
}

interface NeuralNode extends Particle {
    colorType: 'cyan' | 'purple';
    radius: number;
}

const SpaceNeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = 0;
        let height = 0;

        // Configuration
        const STAR_COUNT = 100;
        const NODE_COUNT = 45;
        const BASE_SPEED = 0.6;
        const CONNECTION_DIST = 200; // 3D distance threshold
        const ROTATION_SPEED = 0.0004; // Gentle rotation per frame

        const stars: Particle[] = [];
        const nodes: NeuralNode[] = [];

        // Helper to reset a particle to the distance (Z = 1000)
        const resetStar = (star: Particle) => {
            star.z = 1000;
            // Distribute widely in X/Y so they appear to come from the center
            star.x = (Math.random() - 0.5) * 1600;
            star.y = (Math.random() - 0.5) * 1600;
            star.px = 0;
            star.py = 0;
        };

        const resetNode = (node: NeuralNode) => {
            node.z = 1000;
            node.x = (Math.random() - 0.5) * 1400;
            node.y = (Math.random() - 0.5) * 1400;
            node.colorType = Math.random() > 0.4 ? 'cyan' : 'purple';
            node.radius = Math.random() * 1.5 + 1.5;
            node.px = 0;
            node.py = 0;
        };

        // Initialize stars
        for (let i = 0; i < STAR_COUNT; i++) {
            const star = { x: 0, y: 0, z: 0, px: 0, py: 0 };
            resetStar(star);
            // Randomly pre-distribute Z to avoid spawning a wall of stars initially
            star.z = Math.random() * 1000;
            stars.push(star);
        }

        // Initialize nodes
        for (let i = 0; i < NODE_COUNT; i++) {
            const node: NeuralNode = { x: 0, y: 0, z: 0, px: 0, py: 0, colorType: 'cyan', radius: 2 };
            resetNode(node);
            node.z = Math.random() * 1000;
            nodes.push(node);
        }

        // Resize handler
        const handleResize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // Color accessors
        const getColorStr = (type: 'cyan' | 'purple', alpha: number) => {
            return type === 'cyan' 
                ? `rgba(6, 182, 212, ${alpha})` // Tailwind cyan-500
                : `rgba(168, 85, 247, ${alpha})`; // Tailwind purple-500
        };

        // Animation Loop
        const animate = () => {
            // Draw space background with very slight transparency to leave short tails if desired,
            // or clean repaint. Repainting clean is much better for contrast and legibility.
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            // Subtle background radial glow in center
            const centerGlow = ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, Math.max(width, height) * 0.4
            );
            centerGlow.addColorStop(0, 'rgba(8, 47, 73, 0.15)'); // deep cyan/blue tint
            centerGlow.addColorStop(0.5, 'rgba(76, 29, 149, 0.05)'); // deep purple tint
            centerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGlow;
            ctx.fillRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;
            const fov = 450; // Field of view depth scaling factor

            // Cos/Sin for slow spiral rotation
            const cosVal = Math.cos(ROTATION_SPEED);
            const sinVal = Math.sin(ROTATION_SPEED);

            // 1. Update and Draw Stars
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            for (let i = 0; i < STAR_COUNT; i++) {
                const star = stars[i];

                // Travel forward
                star.z -= BASE_SPEED;

                // Slowly rotate
                const rx = star.x * cosVal - star.y * sinVal;
                const ry = star.x * sinVal + star.y * cosVal;
                star.x = rx;
                star.y = ry;

                if (star.z <= 0) {
                    resetStar(star);
                    continue;
                }

                // Project 3D to 2D
                const sx = centerX + (star.x / star.z) * fov;
                const sy = centerY + (star.y / star.z) * fov;

                // Check boundary
                if (sx < 0 || sx > width || sy < 0 || sy > height) {
                    resetStar(star);
                    continue;
                }

                // Star size increases as it gets closer
                const size = (1 - star.z / 1000) * 1.5 + 0.3;
                const alpha = (1 - star.z / 1000) * 0.8;

                ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`; // very soft blue/white
                ctx.beginPath();
                ctx.arc(sx, sy, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // 2. Update and Project Nodes
            for (let i = 0; i < NODE_COUNT; i++) {
                const node = nodes[i];

                // Travel forward
                node.z -= BASE_SPEED * 0.85; // Nodes travel slightly slower for multi-layer parallax

                // Slowly rotate
                const rx = node.x * cosVal - node.y * sinVal;
                const ry = node.x * sinVal + node.y * cosVal;
                node.x = rx;
                node.y = ry;

                if (node.z <= 0) {
                    resetNode(node);
                    continue;
                }

                // Project 3D to 2D
                const sx = centerX + (node.x / node.z) * fov;
                const sy = centerY + (node.y / node.z) * fov;

                // Check boundary
                if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) {
                    resetNode(node);
                    continue;
                }

                node.px = sx;
                node.py = sy;
            }

            // 3. Draw Connections between Nodes (3D Distance checks)
            for (let i = 0; i < NODE_COUNT; i++) {
                const nodeA = nodes[i];
                if (nodeA.z <= 10 || nodeA.px === 0) continue;

                for (let j = i + 1; j < NODE_COUNT; j++) {
                    const nodeB = nodes[j];
                    if (nodeB.z <= 10 || nodeB.px === 0) continue;

                    // Calculate 3D distance
                    const dx = nodeA.x - nodeB.x;
                    const dy = nodeA.y - nodeB.y;
                    const dz = nodeA.z - nodeB.z;
                    const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist3D < CONNECTION_DIST) {
                        // Opacity drops as distance approaches the limit, and also fades if node is too close or too far
                        const fadeFactor = Math.min(
                            1 - dist3D / CONNECTION_DIST,
                            nodeA.z / 300, // fade out when close to viewport
                            nodeB.z / 300,
                            (1000 - nodeA.z) / 400, // fade in at spawn distance
                            (1000 - nodeB.z) / 400
                        );
                        
                        const opacity = Math.max(0, fadeFactor * 0.22);

                        if (opacity > 0) {
                            ctx.beginPath();
                            ctx.moveTo(nodeA.px, nodeA.py);
                            ctx.lineTo(nodeB.px, nodeB.py);

                            // Create a subtle gradient from node A to node B
                            const grad = ctx.createLinearGradient(nodeA.px, nodeA.py, nodeB.px, nodeB.py);
                            grad.addColorStop(0, getColorStr(nodeA.colorType, opacity));
                            grad.addColorStop(1, getColorStr(nodeB.colorType, opacity));

                            ctx.strokeStyle = grad;
                            ctx.lineWidth = (1 - (nodeA.z + nodeB.z) / 2000) * 0.7 + 0.3;
                            ctx.stroke();
                        }
                    }
                }
            }

            // 4. Draw Nodes themselves
            for (let i = 0; i < NODE_COUNT; i++) {
                const node = nodes[i];
                if (node.z <= 10 || node.px === 0) continue;

                // Fade node out if it gets too close or is too far
                const fadeFactor = Math.min(
                    node.z / 200,
                    (1000 - node.z) / 200
                );
                const alpha = Math.max(0, fadeFactor * 0.85);
                const size = (1 - node.z / 1000) * node.radius + 0.5;

                // Draw node circle
                ctx.fillStyle = getColorStr(node.colorType, alpha);
                ctx.beginPath();
                ctx.arc(node.px, node.py, size, 0, Math.PI * 2);
                ctx.fill();

                // Draw outer glowing halo (softly)
                ctx.fillStyle = getColorStr(node.colorType, alpha * 0.2);
                ctx.beginPath();
                ctx.arc(node.px, node.py, size * 2.8, 0, Math.PI * 2);
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            aria-hidden="true"
        />
    );
};

export default SpaceNeuralBackground;
