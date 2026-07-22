export type ChineseModelProvider =
    | 'MiniMax'
    | 'DeepSeek'
    | 'Moonshot / Kimi'
    | 'Alibaba / Qwen'
    | 'Zhipu / GLM'
    | '01.AI / Yi';

export interface ChineseModelRelease {
    date: string;
    provider: ChineseModelProvider;
    release: string;
    source: string;
}

export const chineseModelProviders: ChineseModelProvider[] = [
    'MiniMax',
    'DeepSeek',
    'Moonshot / Kimi',
    'Alibaba / Qwen',
    'Zhipu / GLM',
    '01.AI / Yi',
];

export const chineseModelReleases: ChineseModelRelease[] = [
    { date: '2025-10-27', provider: 'MiniMax', release: 'MiniMax-M2', source: 'Official MiniMax release notes' },
    { date: '2025-10-28', provider: 'MiniMax', release: 'MiniMax-Hailuo-2.3 / 2.3-Fast', source: 'Official MiniMax release notes' },
    { date: '2025-12-22', provider: 'MiniMax', release: 'MiniMax-M2.1', source: 'Official MiniMax release notes' },
    { date: '2026-02-01', provider: 'MiniMax', release: 'MiniMax-M2.5', source: 'Official MiniMax release notes (month-level in docs)' },
    { date: '2026-03-18', provider: 'MiniMax', release: 'MiniMax-M2.7', source: 'Official MiniMax release notes' },
    { date: '2026-06-01', provider: 'MiniMax', release: 'MiniMax-M3', source: 'Official MiniMax release notes' },
    { date: '2024-01-01', provider: 'DeepSeek', release: 'DeepSeek-MoE series', source: 'Wikipedia timeline, month-level' },
    { date: '2024-04-03', provider: 'DeepSeek', release: 'DeepSeek-Math', source: 'Wikipedia timeline' },
    { date: '2024-05-01', provider: 'DeepSeek', release: 'DeepSeek-V2', source: 'Wikipedia timeline, month-level' },
    { date: '2024-12-13', provider: 'DeepSeek', release: 'DeepSeek-VL2', source: 'LLM24 listing' },
    { date: '2024-12-25', provider: 'DeepSeek', release: 'DeepSeek-V3', source: 'LLM24 listing' },
    { date: '2025-01-20', provider: 'DeepSeek', release: 'DeepSeek-R1 / R1-Zero / Distill series', source: 'LLM24 listing' },
    { date: '2025-03-25', provider: 'DeepSeek', release: 'DeepSeek-V3 0324', source: 'LLM24 listing' },
    { date: '2025-05-28', provider: 'DeepSeek', release: 'DeepSeek-R1-0528', source: 'LLM24 listing' },
    { date: '2026-04-23', provider: 'DeepSeek', release: 'DeepSeek-V4 Pro / V4 Flash', source: 'LLM24 listing' },
    { date: '2023-10-09', provider: 'Moonshot / Kimi', release: 'Kimi Chat', source: 'LLM Timeline' },
    { date: '2025-01-20', provider: 'Moonshot / Kimi', release: 'Kimi k1.5', source: 'LLM Timeline' },
    { date: '2025-04-14', provider: 'Moonshot / Kimi', release: 'Kimi-VL', source: 'Wikipedia / LLM Timeline' },
    { date: '2025-06-17', provider: 'Moonshot / Kimi', release: 'Kimi-Dev', source: 'LLM Timeline' },
    { date: '2025-07-11', provider: 'Moonshot / Kimi', release: 'Kimi K2', source: 'LLM Timeline' },
    { date: '2026-01-27', provider: 'Moonshot / Kimi', release: 'Kimi K2.5', source: 'LLM Timeline' },
    { date: '2026-04-20', provider: 'Moonshot / Kimi', release: 'Kimi K2.6', source: 'LLM Timeline' },
    { date: '2026-06-12', provider: 'Moonshot / Kimi', release: 'Kimi K2.7 Code', source: 'LLM Timeline' },
    { date: '2026-07-16', provider: 'Moonshot / Kimi', release: 'Kimi K3', source: 'LLM Timeline' },
    { date: '2023-08-01', provider: 'Alibaba / Qwen', release: 'Qwen-7B era', source: 'Qwen timeline sources, month-level' },
    { date: '2024-11-01', provider: 'Alibaba / Qwen', release: 'QwQ-32B-Preview', source: 'Presenc timeline, month-level' },
    { date: '2024-12-25', provider: 'Alibaba / Qwen', release: 'QvQ-72B-Preview', source: 'Presenc timeline' },
    { date: '2025-01-29', provider: 'Alibaba / Qwen', release: 'Qwen 2.5-Max', source: 'Presenc timeline' },
    { date: '2025-01-01', provider: 'Alibaba / Qwen', release: 'Qwen 2.5-VL series', source: 'Presenc timeline, month-level' },
    { date: '2025-04-28', provider: 'Alibaba / Qwen', release: 'Qwen 3 family', source: 'Presenc timeline / GitHub' },
    { date: '2026-02-16', provider: 'Alibaba / Qwen', release: 'Qwen 3.5 / 3.5-Plus', source: 'Presenc timeline' },
    { date: '2026-04-01', provider: 'Alibaba / Qwen', release: 'Qwen 3.5-Omni / 3.6-Plus', source: 'Presenc timeline, month-level' },
    { date: '2024-06-05', provider: 'Zhipu / GLM', release: 'GLM-4', source: 'Presenc timeline' },
    { date: '2025-04-01', provider: 'Zhipu / GLM', release: 'GLM-4-32B-0414 series', source: 'Presenc timeline, month-level' },
    { date: '2025-07-01', provider: 'Zhipu / GLM', release: 'GLM-4.5 / 4.5 Air', source: 'Presenc timeline, month-level' },
    { date: '2025-08-11', provider: 'Zhipu / GLM', release: 'GLM-4.5V', source: 'Presenc timeline' },
    { date: '2025-09-01', provider: 'Zhipu / GLM', release: 'GLM-4.6', source: 'Presenc timeline, month-level' },
    { date: '2025-12-01', provider: 'Zhipu / GLM', release: 'GLM-4.6V / 4.7', source: 'Presenc timeline, month-level' },
    { date: '2026-02-11', provider: 'Zhipu / GLM', release: 'GLM-5', source: 'Presenc timeline' },
    { date: '2026-04-08', provider: 'Zhipu / GLM', release: 'GLM-5.1 open-source', source: 'Presenc timeline' },
    { date: '2023-11-01', provider: '01.AI / Yi', release: 'Yi-34B / Yi-6B', source: 'Presenc timeline, month-level' },
    { date: '2024-06-01', provider: '01.AI / Yi', release: 'Yi-Large', source: 'Presenc timeline, mid-2024 approximate' },
    { date: '2024-09-01', provider: '01.AI / Yi', release: 'Yi-Coder', source: 'Presenc timeline, month-level' },
    { date: '2024-10-16', provider: '01.AI / Yi', release: 'Yi-Lightning', source: 'Presenc timeline' },
    { date: '2024-10-01', provider: '01.AI / Yi', release: 'Yi-Lightning-Lite', source: 'Presenc timeline, month-level' },
];
