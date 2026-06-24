export interface ArticleDocument {
    id: string;
    title: string;
    description: string;
    src: string;
    previewSrc: string;
}

export const articleDocuments: Record<string, ArticleDocument> = {
    'routing-the-fallout': {
        id: 'routing-the-fallout',
        title: 'Routing the Fallout',
        description: 'A focused briefing document on model routing, workflow resilience, and the Fable Fallout response.',
        src: '/documents/2026.06.24/routing-the-fallout.pdf',
        previewSrc: '/documents/2026.06.24/routing-the-fallout-preview.png',
    },
    'ai-resilience-mandate': {
        id: 'ai-resilience-mandate',
        title: 'The AI Resilience Mandate',
        description: 'A companion document on building AI workflows that survive model churn, access shocks, and cost pressure.',
        src: '/documents/2026.06.24/the-ai-resilience-mandate.pdf',
        previewSrc: '/documents/2026.06.24/the-ai-resilience-mandate-preview.png',
    },
};
