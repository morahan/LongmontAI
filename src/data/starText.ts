export interface StarTextAlternative {
    phrase: string;
    topic: string;
    primarySourceUrl: string;
}

export interface StarTextExcludedCandidate {
    phrase: string;
    reason: string;
}

/** Editorial registry reviewed for the current fortnight; do not add speculative releases. */
export const STAR_TEXT_EDITION = {
    id: 'edition-2026-09-02-host-then-cheap-stack',
    window: { startsOn: '2026-08-20', endsOn: '2026-09-02' },
    reviewedOn: '2026-09-02',
} as const;

export const STAR_TEXT_BRAND_PHRASE = 'LONGMONT AI' as const;

export const STAR_TEXT_ALTERNATIVES = [
    { phrase: 'GROK BOT', topic: 'Named teammate product', primarySourceUrl: 'https://x.ai/news/grok-bot-more-plans' },
    { phrase: 'SHARED COMPUTER', topic: 'Account-level Bot workspace boundary', primarySourceUrl: 'https://cursor.com/docs/grok-bot' },
    { phrase: 'APPROVALS ON SEND', topic: 'Human approval boundary for agent actions', primarySourceUrl: 'https://cursor.com/docs/grok-bot' },
    { phrase: 'GLM-5.3-FLASH', topic: 'Open-weight multimodal coding model', primarySourceUrl: 'https://z.ai/blog/glm-5.3-flash' },
    { phrase: 'PROMO CLOCK', topic: 'GLM-5.3-Flash dated API promotion', primarySourceUrl: 'https://z.ai/blog/glm-5.3-flash' },
    { phrase: 'CHEAP MULTIMODAL', topic: 'GLM-5.3-Flash cost/use-case framing', primarySourceUrl: 'https://z.ai/blog/glm-5.3-flash' },
    { phrase: 'VENDOR REPORTED', topic: 'GLM-5.3-Flash benchmark qualification', primarySourceUrl: 'https://z.ai/blog/glm-5.3-flash' },
    { phrase: 'OPEN WEIGHTS', topic: 'GLM-5.3-Flash MIT weights', primarySourceUrl: 'https://huggingface.co/zai-org/GLM-5.3-Flash' },
    { phrase: 'READ THE LICENSE', topic: 'Qwen Community License qualification', primarySourceUrl: 'https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/main/LICENSE' },
    { phrase: 'QWEN3.8-FLASH-NEXT', topic: 'Long-context open-weight agents', primarySourceUrl: 'https://huggingface.co/Qwen/Qwen3.8-Flash-Next' },
    { phrase: 'GRANITE 4.2', topic: 'Apache-2.0 enterprise SLMs', primarySourceUrl: 'https://research.ibm.com/blog/introducing-granite-4-2' },
    { phrase: 'GEMINI 3.5 TRANSCRIBE', topic: 'Speech-to-text public preview', primarySourceUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/' },
    { phrase: 'GEMINI OMNI 1.1 FLASH', topic: 'Video generation and editing', primarySourceUrl: 'https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/' },
    { phrase: 'HY4 PREVIEW', topic: 'Apache-2.0 datacenter MoE preview', primarySourceUrl: 'https://www.tencent.com/tencent-releases-and-open-sources-tencent-hy4-preview/' },
    { phrase: 'AGENTIC SEARCH', topic: 'Retrieval product on an existing index', primarySourceUrl: 'https://mistral.ai/news/agentic-search/' },
    { phrase: 'START FROM SCRATCH', topic: 'Cursor cloud-agent app workflow', primarySourceUrl: 'https://cursor.com/changelog/start-from-scratch' },
    { phrase: 'ORIGIN IS A HOST', topic: 'Cursor code-hosting distinction', primarySourceUrl: 'https://cursor.com/changelog/origin-code-hosting' },
    { phrase: 'WORK KEEPS RUNNING', topic: 'Persistent cloud-computer work', primarySourceUrl: 'https://cursor.com/docs/grok-bot' },
] as const satisfies readonly StarTextAlternative[];

/** Not in the edition's verified release ledger; never promote these into Star Text. */
export const STAR_TEXT_EXCLUDED_CANDIDATES = [
    { phrase: 'DEEPSEEK V5', reason: 'No supported public release in the scheduled edition ledger.' },
    { phrase: 'GPT-6', reason: 'The edition explicitly records no public GPT-6 release.' },
    { phrase: 'ASTRA', reason: 'The edition explicitly records no public Astra release.' },
    { phrase: 'CLAUDE FABLE 5.1', reason: 'No newsroom post, model card, or API ID in the edition.' },
] as const satisfies readonly StarTextExcludedCandidate[];

export type StarTextPhrase = typeof STAR_TEXT_BRAND_PHRASE | typeof STAR_TEXT_ALTERNATIVES[number]['phrase'];
