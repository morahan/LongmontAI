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
    'efficiency-frontier': {
        id: 'efficiency-frontier',
        title: 'The Efficiency Frontier',
        description: 'A July 22 visual briefing on capability, cost, model routing, and the memory constraints reshaping the AI supply chain.',
        sourceUrl: '/slideshows/2026.07.22/efficiency-frontier/efficiency-frontier-briefing.pptx',
        slides: createSlides('/slideshows/2026.07.22/efficiency-frontier', [
            'The Efficiency Frontier',
            'A leaderboard is a signal, not a selection',
            'The same benchmark, stripped of the glow',
            'Output tokens make the price ladder concrete',
            'The frontier is moving beyond code',
            'Long runs turn model choice into an operating decision',
            'Smaller can mean dramatically cheaper without being less useful',
            'The workflow can dominate the model bill',
            'A working demo is not the same thing as a working system',
            'The rate card changes the routing conversation',
            'Reasoning level changes the complete cost matrix',
            'The baseline tiers are a usable routing menu',
            'A simple multiplier makes tradeoffs memorable',
            'AI demand is showing up in the physical economy',
            'Higher component costs can reach the price tag',
            'Micron mobile and client margins have surged',
            'The revenue flow shows where the upside lands',
            'Memory revenue is climbing at a new scale',
            'Each generation asks for more memory',
            'Measure the whole system. Then route the work.',
        ]),
    },
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
        sourceUrl: '/slideshows/2026.04.15/ai-avalanche/the-2026-ai-avalanche.pptx',
        slides: createSlides('/slideshows/2026.04.15/ai-avalanche', [
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
        description: 'A curated July 8 briefing on autonomous ransomware, frontier-model release gates, and the orchestration evidence that matters to local builders.',
        sourceUrl: '/slideshows/2026.07.08/models-as-munitions/models-as-munitions-briefing.pptx',
        slides: [
            {
                title: 'Models as Munitions',
                src: '/slideshows/2026.07.08/models-as-munitions/slide-01.png',
            },
            {
                title: 'JADEPUFFER made autonomous ransomware real',
                src: '/slideshows/2026.07.08/models-as-munitions/assets/jadepuffer-agentic-ransomware.png',
            },
            {
                title: 'Safety margins now shape frontier-model release gates',
                src: '/slideshows/2026.07.08/models-as-munitions/assets/gpt-5.6-safety-margins.png',
            },
            {
                title: 'Zenith: 2.06 average rank and 92% dominance',
                src: '/slideshows/2026.07.08/models-as-munitions/assets/zenith-frontier-swe.png',
            },
            {
                title: 'Fugu Ultra: 86.6 on CharXiv and 73.7 on SWE-Bench Pro',
                src: '/slideshows/2026.07.08/models-as-munitions/assets/fugu-key-benchmarks.png',
            },
            {
                title: 'Route the model. Patch the doors. Keep a local copy.',
                src: '/slideshows/2026.07.08/models-as-munitions/slide-12.png',
            },
        ],
    },
};
