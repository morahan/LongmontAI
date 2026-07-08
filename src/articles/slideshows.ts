export interface SlideshowSlide {
    title: string;
    src: string;
}

export interface SlideshowEmbed {
    kind: 'pptx';
    src: string;
}

export interface SlideshowDeck {
    id: string;
    title: string;
    description: string;
    sourceUrl: string;
    slides?: SlideshowSlide[];
    embed?: SlideshowEmbed;
}

function createSlides(basePath: string, titles: string[]): SlideshowSlide[] {
    return titles.map((title, index) => ({
        title,
        src: `${basePath}/slide-${String(index + 1).padStart(2, '0')}.png`,
    }));
}

export const slideshowDecks: Record<string, SlideshowDeck> = {
    'agent-economy': {
        id: 'agent-economy',
        title: 'The Agent Economy Gets Real',
        description: 'A May 27 briefing on agent marketplaces, token economics, model routing, spec-driven workflows, AI science, safety, and compute infrastructure.',
        sourceUrl: '/slideshows/2026.05.27/agent-economy/the-agent-economy-gets-real.pptx',
        slides: createSlides('/slideshows/2026.05.27/agent-economy', [
            'The Agent Economy Gets Real',
            'Frontier models are now a routing problem',
            'Token demand is becoming industrial-scale throughput',
            'Agents are turning into a labor market',
            'Coding agents are becoming an operating stack',
            'Specs are the new product surface',
            'AI science crosses from headline to verification',
            'Alignment progress is becoming measurable product work',
            'Compute is the board the whole game is played on',
            'Data centers are moving into the space race',
            'Frontier labs are now macroeconomic actors',
            'Price-performance becomes a strategy, not a footnote',
            'The human job moves upstream',
            'Build with agents. Price the loop. Verify the output.',
        ]),
    },
    'custom-apps': {
        id: 'custom-apps',
        title: 'The Best 25 Minute Lesson for Making Custom Apps Using AI',
        description: 'A hands-on primer covering the 3 levels of AI productivity, chatboxes vs. project folders, APIs explained via analogy, and a live business review puller built with Google Antigravity.',
        sourceUrl: '/slideshows/2026.05.27/custom-apps/finalized-presentation.pdf',
        slides: createSlides('/slideshows/2026.05.27/custom-apps', [
            'The Best 25 Minute Lesson for Making Custom Apps Using AI',
            "Today's Agenda",
            'What Are the 3 Levels of AI Productivity?',
            'What Is an AI Chatbox?',
            'What Is a Project Folder?',
            'The Production System',
            'What Is an API? The Cook\'s Ticket Analogy',
            'The Project: Live Build — Business Review Puller',
            'Scaling Your Success',
            'Ask, Lecture, or Hire',
        ]),
    },
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
    'ai-landscape-june-2026': {
        id: 'ai-landscape-june-2026',
        title: 'The AI Landscape — June 2026',
        description: 'A one-page state-of-play for the June 10 meetup: frontier models, coding harnesses, agent frameworks, and the open-weights frontier — captured one day after Claude Fable 5 landed.',
        sourceUrl: '/slideshows/2026.06.10/ai-landscape/ai-landscape-june-2026.pptx',
        embed: {
            kind: 'pptx',
            src: '/slideshows/2026.06.10/ai-landscape/ai-landscape-june-2026.pptx',
        },
    },
    'minimax-m3-frontier': {
        id: 'minimax-m3-frontier',
        title: 'MiniMax M3: At the Frontier',
        description: 'A deep dive on MiniMax M3 — the top-tier agentic coding entrant that dropped just before the June 10 meetup.',
        sourceUrl: '/slideshows/2026.06.10/minimax-m3/minimax-m3-frontier.pptx',
        embed: {
            kind: 'pptx',
            src: '/slideshows/2026.06.10/minimax-m3/minimax-m3-frontier.pptx',
        },
    },
    'fable-fallout': {
        id: 'fable-fallout',
        title: 'Routing, Budgets, and Verification',
        description: 'A June 24 visual briefing on Fable access risk, token maxxing, Claude Code workflow harnesses, GLM routing, and verification discipline.',
        sourceUrl: '/slideshows/2026.06.24/fable-fallout/fable-fallout-briefing.pptx',
        slides: createSlides('/slideshows/2026.06.24/fable-fallout', [
            'Routing the Fallout',
            'Inference got cheaper',
            'Work got hungrier',
            'A top model can become a fragile dependency',
            'The workflow is the product surface',
            'Verification becomes a workflow',
            'Route the model, not the belief',
            'Proof before publish',
            'Coding tools are becoming infrastructure bets',
        ]),
    },
    'models-as-munitions': {
        id: 'models-as-munitions',
        title: 'Models as Munitions',
        description: 'A July 8 visual briefing on frontier model controls, autonomous ransomware, China access risk, harness leverage, local fallbacks, and the builder playbook for Longmont.',
        sourceUrl: '/slideshows/2026.07.08/models-as-munitions/models-as-munitions-briefing.pptx',
        slides: createSlides('/slideshows/2026.07.08/models-as-munitions', [
            'Models as Munitions',
            'Best model and deployable model are now different questions',
            'The same self-correction loop now works offensively',
            'Frontier launches are becoming national-security events',
            'Even the open-model hedge can become policy exposed',
            'Harnesses became the performance lever',
            'Fugu turns routing into an API',
            'Local proof matters when access moves',
            'Agentic workloads are a different cost curve',
            'Five moves for builders this week',
            'The folder becomes the evidence layer',
            'Route the model. Patch the doors. Keep a local copy.',
        ]),
    },
};
