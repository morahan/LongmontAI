export interface SlideshowSlide {
    title: string;
    src: string;
}

export interface SlideshowDeck {
    id: string;
    title: string;
    description: string;
    sourceUrl: string;
    slides: SlideshowSlide[];
}

function createSlides(basePath: string, titles: string[]): SlideshowSlide[] {
    return titles.map((title, index) => ({
        title,
        src: `${basePath}/slide-${String(index + 1).padStart(2, '0')}.png`,
    }));
}

export const slideshowDecks: Record<string, SlideshowDeck> = {
    'ai-avalanche': {
        id: 'ai-avalanche',
        title: 'The 2026 AI Avalanche',
        description: 'A frontier-model briefing on routing, orchestration, agent safety, infrastructure, IP pressure, and national AI policy.',
        sourceUrl: '/slideshows/2026.04.29/ai-avalanche/the-2026-ai-avalanche.pptx',
        slides: createSlides('/slideshows/2026.04.29/ai-avalanche', [
            'Benchmark Comparison: Minimax, Claude, Codex, GLM, Kimi',
            'The Frontier Tier Matrix',
            'The Efficiency Routing Tier',
            'The Specialist Override',
            'The Paradigm Shift: From Models to Orchestration',
            'The Blueprint for Autonomous Production',
            'The Agentic Immune System',
            'The Horizon: World Modeling',
            'The Physical Reality of Reasoning',
            'The AI Factory Upgraded',
            'Collision with the Real World: IP Realities',
            'The Regulatory Shield: National AI Policy',
            'The 2026 Strategic Playbook',
        ]),
    },
    'scaling-ai': {
        id: 'scaling-ai',
        title: 'The Physical Reality of AI: 2026 State of the Union',
        description: 'A research synthesis on software adoption, synthetic data, compute supply chains, data-center limits, hardware efficiency, talent flows, and strategic scaling constraints.',
        sourceUrl: '/slideshows/2026.04.29/scaling-ai/scaling-ai-into-reality.pptx',
        slides: createSlides('/slideshows/2026.04.29/scaling-ai', [
            'The Physical Reality of AI: 2026 State of the Union',
            'Software scaling has achieved historic velocity and reach',
            'Capabilities exhibit a jagged frontier between digital reasoning and physical grounding',
            'Scientific and clinical applications shift toward full workflow replacement',
            'The era of brute-force data scraping is approaching a terminal wall',
            'Synthetic data is highly effective for refinement, but fails as a primary foundation',
            'Global AI compute capacity is compounding at 3.3x annually',
            'The expanding compute footprint relies on a singular supply chain vulnerability',
            'Data center infrastructure is hitting the absolute limits of the power grid',
            'The emulation bottleneck: optimizing AI power draw is currently too slow to be practical',
            'MIT EnergAIzer maps software patterns directly to power draw',
            'Achieving 8% error rates through dynamic hardware correction',
            'The U.S. leads in deployment and capital, but the performance gap has closed',
            'U.S. talent acquisition faces an 89% migration cliff',
            'A 50-point expectation gap divides the builders from the public',
            'The trilemma of scaling: the era of brute-force AI is ending',
            'Strategic imperatives for the physical reality of AI',
        ]),
    },
};
