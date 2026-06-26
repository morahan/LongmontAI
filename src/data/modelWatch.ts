export type SourceMethod =
  | 'RSS'
  | 'HTML'
  | 'Release notes'
  | 'Hugging Face'
  | 'GitHub'
  | 'Model registry';

export interface ModelWatchSource {
  company: string;
  region: string;
  lane: string;
  source: string;
  method: SourceMethod;
  url: string;
  backupUrl?: string;
  signals: string[];
  priority: 'Core' | 'Open-weight' | 'Regional';
}

export interface ModelWatchUpdateType {
  label: string;
  description: string;
  keywords: string[];
}

export interface ModelWatchPipelineStep {
  label: string;
  detail: string;
}

export interface ModelWatchSnapshot {
  company: string;
  update: string;
  date: string;
  lane: string;
  url: string;
}

export type ModelBenchmarkKey =
  | 'sweBenchVerified'
  | 'sweBenchPro'
  | 'terminalBench'
  | 'frontierCode'
  | 'hle'
  | 'browseComp'
  | 'deepSearchQa'
  | 'sweBenchMultilingual'
  | 'gpqaDiamond'
  | 'aaIndex'
  | 'costPerTask'
  | 'inputCost'
  | 'outputCost';

export interface ModelBenchmarkDefinition {
  key: ModelBenchmarkKey;
  label: string;
  unit: '%' | 'score' | 'index' | '$/task' | '$/M tokens';
  higherIsBetter: boolean;
  description: string;
}

export interface ModelBenchmarkScore {
  value: number;
  note?: string;
}

export interface ModelWatchModel {
  id: string;
  name: string;
  provider: string;
  lane: string;
  releaseDate: string;
  releaseDateSort?: string;
  sourceLabel: string;
  sourceUrl: string;
  benchmarks: Partial<Record<ModelBenchmarkKey, ModelBenchmarkScore>>;
}

export const modelWatchSources: ModelWatchSource[] = [
  {
    company: 'OpenAI',
    region: 'United States',
    lane: 'Frontier, API, open models',
    source: 'News RSS and release pages',
    method: 'RSS',
    url: 'https://openai.com/news/rss.xml',
    backupUrl: 'https://openai.com/news/',
    signals: ['GPT releases', 'open model releases', 'API availability', 'model retirements'],
    priority: 'Core',
  },
  {
    company: 'Anthropic',
    region: 'United States',
    lane: 'Claude frontier models',
    source: 'Newsroom',
    method: 'HTML',
    url: 'https://www.anthropic.com/news',
    signals: ['Claude model launches', 'safety/access changes', 'developer platform updates'],
    priority: 'Core',
  },
  {
    company: 'Google DeepMind',
    region: 'United States / United Kingdom',
    lane: 'Gemini, Gemma, world models',
    source: 'DeepMind news',
    method: 'HTML',
    url: 'https://deepmind.google/blog/',
    backupUrl: 'https://blog.google/technology/ai/',
    signals: ['Gemini releases', 'Gemma open models', 'Veo/Imagen/Genie updates'],
    priority: 'Core',
  },
  {
    company: 'xAI',
    region: 'United States',
    lane: 'Grok models and API',
    source: 'xAI News',
    method: 'HTML',
    url: 'https://x.ai/news',
    backupUrl: 'https://docs.x.ai/docs/models',
    signals: ['Grok releases', 'Grok API models', 'voice/image/video model updates'],
    priority: 'Core',
  },
  {
    company: 'Meta AI',
    region: 'United States',
    lane: 'Llama and open research models',
    source: 'AI at Meta Blog',
    method: 'HTML',
    url: 'https://ai.meta.com/blog/',
    backupUrl: 'https://www.llama.com/',
    signals: ['Llama releases', 'SAM releases', 'open-source model drops'],
    priority: 'Open-weight',
  },
  {
    company: 'Mistral AI',
    region: 'France',
    lane: 'Frontier and open-weight models',
    source: 'News and model docs',
    method: 'HTML',
    url: 'https://mistral.ai/news/',
    backupUrl: 'https://docs.mistral.ai/models/overview/',
    signals: ['Mistral model launches', 'open-weight versions', 'model deprecations'],
    priority: 'Core',
  },
  {
    company: 'Cohere',
    region: 'Canada',
    lane: 'Command and enterprise models',
    source: 'Blog',
    method: 'HTML',
    url: 'https://cohere.com/blog',
    backupUrl: 'https://docs.cohere.com/docs/models',
    signals: ['Command releases', 'embed/rerank releases', 'API model support'],
    priority: 'Regional',
  },
  {
    company: 'Alibaba Qwen',
    region: 'China',
    lane: 'Open-weight and hosted Qwen models',
    source: 'Qwen blog and Hugging Face org',
    method: 'Hugging Face',
    url: 'https://huggingface.co/Qwen',
    backupUrl: 'https://qwen.ai/blog',
    signals: ['Qwen model cards', 'new collections', 'GitHub/modelscope links'],
    priority: 'Open-weight',
  },
  {
    company: 'DeepSeek',
    region: 'China',
    lane: 'Open-weight reasoning and coding models',
    source: 'Hugging Face org and API docs news',
    method: 'Hugging Face',
    url: 'https://huggingface.co/deepseek-ai',
    backupUrl: 'https://api-docs.deepseek.com/news/',
    signals: ['DeepSeek model cards', 'reasoning releases', 'API model updates'],
    priority: 'Open-weight',
  },
  {
    company: 'Z.ai',
    region: 'China',
    lane: 'GLM open-weight models',
    source: 'Hugging Face org and articles',
    method: 'Hugging Face',
    url: 'https://huggingface.co/zai-org',
    backupUrl: 'https://github.com/zai-org',
    signals: ['GLM releases', 'long-context models', 'MIT-licensed drops'],
    priority: 'Open-weight',
  },
  {
    company: 'MiniMax',
    region: 'China',
    lane: 'LLM, video, speech, music',
    source: 'MiniMax News and model pages',
    method: 'HTML',
    url: 'https://www.minimax.io/news',
    backupUrl: 'https://www.minimax.io/models',
    signals: ['MiniMax M-series', 'Hailuo video', 'speech/music model updates'],
    priority: 'Regional',
  },
  {
    company: 'Moonshot AI / Kimi',
    region: 'China',
    lane: 'Kimi long-context and reasoning models',
    source: 'Kimi official site and Hugging Face',
    method: 'HTML',
    url: 'https://www.moonshot.cn/',
    backupUrl: 'https://huggingface.co/moonshotai',
    signals: ['Kimi model launches', 'open-weight drops', 'long-context updates'],
    priority: 'Regional',
  },
  {
    company: 'Tencent Hunyuan',
    region: 'China',
    lane: 'Hunyuan multimodal models',
    source: 'Tencent Hunyuan and Hugging Face',
    method: 'Hugging Face',
    url: 'https://huggingface.co/tencent',
    backupUrl: 'https://hunyuan.tencent.com/',
    signals: ['Hunyuan model cards', 'video/3D releases', 'API support'],
    priority: 'Regional',
  },
  {
    company: 'Baidu ERNIE',
    region: 'China',
    lane: 'ERNIE hosted and open models',
    source: 'Baidu AI Cloud model pages',
    method: 'HTML',
    url: 'https://cloud.baidu.com/product/wenxinworkshop',
    backupUrl: 'https://huggingface.co/baidu',
    signals: ['ERNIE releases', 'PaddlePaddle model drops', 'API support'],
    priority: 'Regional',
  },
  {
    company: '01.AI',
    region: 'China',
    lane: 'Yi open-weight models',
    source: 'Hugging Face and GitHub',
    method: 'Hugging Face',
    url: 'https://huggingface.co/01-ai',
    backupUrl: 'https://github.com/01-ai',
    signals: ['Yi model cards', 'new checkpoints', 'license changes'],
    priority: 'Open-weight',
  },
  {
    company: 'NVIDIA',
    region: 'United States',
    lane: 'Nemotron and open model families',
    source: 'Hugging Face org',
    method: 'Hugging Face',
    url: 'https://huggingface.co/nvidia',
    backupUrl: 'https://developer.nvidia.com/blog/tag/nemotron/',
    signals: ['Nemotron releases', 'NIM availability', 'reasoning model cards'],
    priority: 'Open-weight',
  },
  {
    company: 'IBM Research',
    region: 'United States',
    lane: 'Granite open models',
    source: 'Hugging Face org and research blog',
    method: 'Hugging Face',
    url: 'https://huggingface.co/ibm-granite',
    backupUrl: 'https://research.ibm.com/blog',
    signals: ['Granite model cards', 'enterprise model releases', 'license updates'],
    priority: 'Open-weight',
  },
  {
    company: 'Microsoft',
    region: 'United States',
    lane: 'Phi small open models',
    source: 'Hugging Face org and Azure AI blog',
    method: 'Hugging Face',
    url: 'https://huggingface.co/microsoft',
    backupUrl: 'https://azure.microsoft.com/blog/topics/ai/',
    signals: ['Phi releases', 'small model updates', 'Azure model availability'],
    priority: 'Open-weight',
  },
  {
    company: 'Allen AI',
    region: 'United States',
    lane: 'OLMo open language models',
    source: 'Blog and Hugging Face org',
    method: 'Hugging Face',
    url: 'https://huggingface.co/allenai',
    backupUrl: 'https://allenai.org/blog',
    signals: ['OLMo releases', 'training data/model card updates', 'eval reports'],
    priority: 'Open-weight',
  },
  {
    company: 'TII',
    region: 'United Arab Emirates',
    lane: 'Falcon open models',
    source: 'Falcon LLM and Hugging Face',
    method: 'Hugging Face',
    url: 'https://huggingface.co/tiiuae',
    backupUrl: 'https://falconllm.tii.ae/',
    signals: ['Falcon releases', 'open-weight updates', 'multilingual checkpoints'],
    priority: 'Open-weight',
  },
  {
    company: 'Nous Research',
    region: 'United States',
    lane: 'Hermes open fine-tunes',
    source: 'Hugging Face org',
    method: 'Hugging Face',
    url: 'https://huggingface.co/NousResearch',
    backupUrl: 'https://nousresearch.com/blog/',
    signals: ['Hermes model cards', 'alignment/fine-tune releases', 'agent model updates'],
    priority: 'Open-weight',
  },
];

export const modelWatchUpdateTypes: ModelWatchUpdateType[] = [
  {
    label: 'New Model',
    description: 'A named foundation, reasoning, multimodal, coding, voice, video, or embedding model ships.',
    keywords: ['introducing', 'release', 'launch', 'new model', 'available now'],
  },
  {
    label: 'Open Weights',
    description: 'Weights, model cards, checkpoints, or permissive licenses become available.',
    keywords: ['open-weight', 'open source', 'hugging face', 'model card', 'MIT', 'Apache'],
  },
  {
    label: 'API Availability',
    description: 'A model appears in API docs, provider catalogs, pricing pages, or hosted model registries.',
    keywords: ['API', 'model id', 'pricing', 'console', 'developer'],
  },
  {
    label: 'Capability Change',
    description: 'Context length, tool use, coding, multimodal, speed, cost, or benchmark claims materially change.',
    keywords: ['context', 'coding', 'agent', 'multimodal', 'latency', 'benchmark'],
  },
  {
    label: 'Retirement',
    description: 'A model is deprecated, replaced, region-limited, recalled, or moved behind a new access tier.',
    keywords: ['deprecated', 'retired', 'sunset', 'replaced', 'restricted', 'suspend'],
  },
];

export const modelWatchPipeline: ModelWatchPipelineStep[] = [
  {
    label: 'Collect',
    detail: 'Poll RSS first, then official news HTML, then Hugging Face org activity, GitHub releases, ModelScope, and docs model registries.',
  },
  {
    label: 'Classify',
    detail: 'Keep only posts that include a named model, model ID, capability delta, pricing/access change, retirement, or downloadable weights.',
  },
  {
    label: 'Summarize',
    detail: 'Store title, date, company, model names, source URL, update type, weight/license status, and a two-sentence human-readable brief.',
  },
  {
    label: 'Verify',
    detail: 'Prefer primary sources. Cross-check open-weight claims against Hugging Face or GitHub model cards before publishing.',
  },
];

export const modelWatchSnapshots: ModelWatchSnapshot[] = [
  {
    company: 'OpenAI',
    update: 'GPT-5.5 release page lists product availability, API follow-up, and agentic coding capabilities.',
    date: 'Apr 23, 2026',
    lane: 'Frontier',
    url: 'https://openai.com/index/introducing-gpt-5-5/',
  },
  {
    company: 'Anthropic',
    update: 'Claude Opus 4.8 appeared in the Anthropic newsroom as an Opus-class model upgrade.',
    date: 'May 28, 2026',
    lane: 'Frontier',
    url: 'https://www.anthropic.com/news/claude-opus-4-8',
  },
  {
    company: 'Google DeepMind',
    update: 'Gemma 4 12B was listed as a unified multimodal open model update.',
    date: 'June 2026',
    lane: 'Open-weight',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemma-4-12b/',
  },
  {
    company: 'xAI',
    update: 'Grok 4 release page remains a model-release source, with xAI News tracking model and API updates.',
    date: 'Jul 9, 2025',
    lane: 'Frontier',
    url: 'https://x.ai/news/grok-4',
  },
  {
    company: 'Mistral AI',
    update: 'Mistral OCR 4 shipped as a document-intelligence model update.',
    date: 'Jun 23, 2026',
    lane: 'Specialist',
    url: 'https://mistral.ai/news/ocr-4/',
  },
  {
    company: 'Z.ai',
    update: 'GLM-5.2 was published as an MIT-licensed long-horizon model with 1M-token context.',
    date: 'Jun 17, 2026',
    lane: 'Open-weight',
    url: 'https://huggingface.co/blog/zai-org/glm-52-blog',
  },
];

export const modelBenchmarkDefinitions: ModelBenchmarkDefinition[] = [
  {
    key: 'sweBenchVerified',
    label: 'SWE-bench Verified',
    unit: '%',
    higherIsBetter: true,
    description: 'Software engineering issue-resolution score where the feed includes a reported SWE-bench result.',
  },
  {
    key: 'sweBenchPro',
    label: 'SWE-Bench Pro',
    unit: '%',
    higherIsBetter: true,
    description: 'Harder software engineering benchmark used in the June 2026 model-watch notes.',
  },
  {
    key: 'terminalBench',
    label: 'Terminal-Bench',
    unit: '%',
    higherIsBetter: true,
    description: 'Terminal-based coding task score when reported for a model.',
  },
  {
    key: 'frontierCode',
    label: 'FrontierCode',
    unit: 'score',
    higherIsBetter: true,
    description: 'Agentic coding benchmark score from the June model-watch notes where available.',
  },
  {
    key: 'hle',
    label: "Humanity's Last Exam",
    unit: '%',
    higherIsBetter: true,
    description: 'General hard-reasoning benchmark reported in the model comparison notes.',
  },
  {
    key: 'browseComp',
    label: 'BrowseComp',
    unit: '%',
    higherIsBetter: true,
    description: 'Web browsing and agentic retrieval benchmark from the Kimi comparison table.',
  },
  {
    key: 'deepSearchQa',
    label: 'DeepSearchQA',
    unit: '%',
    higherIsBetter: true,
    description: 'Deep search benchmark from the Kimi comparison table.',
  },
  {
    key: 'sweBenchMultilingual',
    label: 'SWE-bench Multilingual',
    unit: '%',
    higherIsBetter: true,
    description: 'Multilingual software engineering benchmark from the Kimi comparison table.',
  },
  {
    key: 'gpqaDiamond',
    label: 'GPQA Diamond',
    unit: '%',
    higherIsBetter: true,
    description: 'Graduate-level science reasoning benchmark where reported.',
  },
  {
    key: 'aaIndex',
    label: 'AA Intelligence Index',
    unit: 'index',
    higherIsBetter: true,
    description: 'Artificial Analysis intelligence index value from the June 2026 notes.',
  },
  {
    key: 'costPerTask',
    label: 'Cost per SWE task',
    unit: '$/task',
    higherIsBetter: false,
    description: 'Average cost per standardized SWE-bench task solved; lower is better.',
  },
  {
    key: 'inputCost',
    label: 'Input price',
    unit: '$/M tokens',
    higherIsBetter: false,
    description: 'Reported input-token API price; lower is better.',
  },
  {
    key: 'outputCost',
    label: 'Output price',
    unit: '$/M tokens',
    higherIsBetter: false,
    description: 'Reported output-token API price; lower is better.',
  },
];

export const modelWatchModels: ModelWatchModel[] = [
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'Anthropic',
    lane: 'Frontier agentic coding',
    releaseDate: 'Jun 9, 2026',
    releaseDateSort: '2026-06-09',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {
      sweBenchPro: { value: 80, note: 'Reported as roughly 80% in the June 10 notes.' },
      frontierCode: { value: 29.3 },
      hle: { value: 53 },
      aaIndex: { value: 65 },
      inputCost: { value: 10 },
      outputCost: { value: 50 },
    },
  },
  {
    id: 'gpt-5-5',
    name: 'GPT-5.5',
    provider: 'OpenAI',
    lane: 'Frontier general and coding',
    releaseDate: 'Apr 23, 2026',
    releaseDateSort: '2026-04-23',
    sourceLabel: 'Model Watch snapshot',
    sourceUrl: 'https://openai.com/index/introducing-gpt-5-5/',
    benchmarks: {
      sweBenchVerified: { value: 88.7 },
    },
  },
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    provider: 'Anthropic',
    lane: 'Agentic coding value pick',
    releaseDate: 'May 28, 2026',
    releaseDateSort: '2026-05-28',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {
      inputCost: { value: 5 },
      outputCost: { value: 25 },
    },
  },
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google DeepMind',
    lane: 'Long-context reasoning',
    releaseDate: 'Feb 19, 2026',
    releaseDateSort: '2026-02-19',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {
      gpqaDiamond: { value: 94.3 },
    },
  },
  {
    id: 'grok-4-3',
    name: 'Grok 4.3',
    provider: 'xAI',
    lane: 'Live-data frontier model',
    releaseDate: 'Apr 17, 2026',
    releaseDateSort: '2026-04-17',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {
      inputCost: { value: 1.25 },
      outputCost: { value: 2.5 },
    },
  },
  {
    id: 'minimax-m3',
    name: 'MiniMax M3',
    provider: 'MiniMax',
    lane: 'Agentic coding entrant',
    releaseDate: 'Jun 11, 2026',
    releaseDateSort: '2026-06-11',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {},
  },
  {
    id: 'kimi-k2-6',
    name: 'Kimi K2.6',
    provider: 'Moonshot AI',
    lane: 'Open-weight coding',
    releaseDate: 'Apr 20, 2026',
    releaseDateSort: '2026-04-20',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {},
  },
  {
    id: 'glm-5-1',
    name: 'GLM-5.1',
    provider: 'Z.ai',
    lane: 'Open-weight long-horizon coding',
    releaseDate: 'Apr 8, 2026',
    releaseDateSort: '2026-04-08',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {},
  },
  {
    id: 'qwen-3-6-35b-a3b',
    name: 'Qwen 3.6 35B-A3B',
    provider: 'Alibaba Qwen',
    lane: 'Open-weight local MoE',
    releaseDate: 'Apr 15, 2026',
    releaseDateSort: '2026-04-15',
    sourceLabel: 'June 2026 Model Watch',
    sourceUrl: '/edition/edition-2026-06-10-ai-landscape',
    benchmarks: {
      sweBenchPro: { value: 49.5 },
      terminalBench: { value: 51.5 },
    },
  },
  {
    id: 'glm-5-2',
    name: 'GLM-5.2',
    provider: 'Z.ai',
    lane: 'Open-weight long-context coding',
    releaseDate: 'Jun 17, 2026',
    releaseDateSort: '2026-06-17',
    sourceLabel: 'Model Watch snapshot',
    sourceUrl: 'https://huggingface.co/blog/zai-org/glm-52-blog',
    benchmarks: {},
  },
  {
    id: 'gemma-4-12b',
    name: 'Gemma 4 12B',
    provider: 'Google DeepMind',
    lane: 'Open-weight multimodal',
    releaseDate: 'Jun 3, 2026',
    releaseDateSort: '2026-06-03',
    sourceLabel: 'Model Watch snapshot',
    sourceUrl: 'https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemma-4-12b/',
    benchmarks: {},
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    lane: 'Frontier live-data model',
    releaseDate: 'Jul 9, 2025',
    releaseDateSort: '2025-07-09',
    sourceLabel: 'Model Watch snapshot',
    sourceUrl: 'https://x.ai/news/grok-4',
    benchmarks: {},
  },
  {
    id: 'mistral-ocr-4',
    name: 'Mistral OCR 4',
    provider: 'Mistral AI',
    lane: 'Document intelligence',
    releaseDate: 'Jun 23, 2026',
    releaseDateSort: '2026-06-23',
    sourceLabel: 'Model Watch snapshot',
    sourceUrl: 'https://mistral.ai/news/ocr-4/',
    benchmarks: {},
  },
  {
    id: 'claude-4-5-opus',
    name: 'Claude 4.5 Opus',
    provider: 'Anthropic',
    lane: 'Premium coding',
    releaseDate: 'Nov 24, 2025',
    releaseDateSort: '2025-11-24',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 76.8, note: 'Standardized mini-SWE-agent result.' },
      hle: { value: 43.2, note: 'Kimi launch comparison table.' },
      browseComp: { value: 57.8, note: 'Kimi launch comparison table.' },
      deepSearchQa: { value: 76.1, note: 'Kimi launch comparison table.' },
      sweBenchMultilingual: { value: 77.5, note: 'Kimi launch comparison table.' },
      costPerTask: { value: 0.75 },
      inputCost: { value: 15 },
      outputCost: { value: 75 },
    },
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'Google DeepMind',
    lane: 'Balanced coding',
    releaseDate: 'Dec 17, 2025',
    releaseDateSort: '2025-12-17',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 75.8 },
      costPerTask: { value: 0.36 },
      inputCost: { value: 0.15 },
      outputCost: { value: 0.6 },
    },
  },
  {
    id: 'minimax-m2-5',
    name: 'MiniMax M2.5',
    provider: 'MiniMax',
    lane: 'Low-cost coding',
    releaseDate: 'Feb 17, 2026',
    releaseDateSort: '2026-02-17',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 75.8 },
      costPerTask: { value: 0.07 },
      inputCost: { value: 0.1 },
      outputCost: { value: 0.3 },
    },
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    lane: 'Premium coding',
    releaseDate: 'Feb 5, 2026',
    releaseDateSort: '2026-02-05',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 75.6 },
      costPerTask: { value: 0.55 },
      inputCost: { value: 15 },
      outputCost: { value: 75 },
    },
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    provider: 'Z.ai',
    lane: 'Open-weight coding',
    releaseDate: 'Feb 11, 2026',
    releaseDateSort: '2026-02-11',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 72.8 },
      costPerTask: { value: 0.53 },
      inputCost: { value: 0.5 },
      outputCost: { value: 2 },
    },
  },
  {
    id: 'gpt-5-2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    lane: 'Frontier general and coding',
    releaseDate: 'Dec 11, 2025',
    releaseDateSort: '2025-12-11',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 72.8, note: 'Standardized mini-SWE-agent result.' },
      hle: { value: 45.5, note: 'Kimi launch comparison table.' },
      browseComp: { value: 65.8, note: 'Kimi launch comparison table.' },
      deepSearchQa: { value: 71.3, note: 'Kimi launch comparison table.' },
      sweBenchMultilingual: { value: 72, note: 'Kimi launch comparison table.' },
      costPerTask: { value: 0.47 },
      inputCost: { value: 2.5 },
      outputCost: { value: 10 },
    },
  },
  {
    id: 'claude-4-5-sonnet',
    name: 'Claude 4.5 Sonnet',
    provider: 'Anthropic',
    lane: 'Mid-tier coding',
    releaseDate: 'Sep 29, 2025',
    releaseDateSort: '2025-09-29',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 71.4 },
      costPerTask: { value: 0.66 },
      inputCost: { value: 3 },
      outputCost: { value: 15 },
    },
  },
  {
    id: 'kimi-k2-5',
    name: 'Kimi K2.5',
    provider: 'Moonshot AI',
    lane: 'Agentic search and coding',
    releaseDate: 'Jan 27, 2026',
    releaseDateSort: '2026-01-27',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 70.8, note: 'Standardized mini-SWE-agent result.' },
      hle: { value: 50.2, note: 'Kimi launch comparison table.' },
      browseComp: { value: 74.9, note: 'Kimi launch comparison table.' },
      deepSearchQa: { value: 77.1, note: 'Kimi launch comparison table.' },
      sweBenchMultilingual: { value: 73, note: 'Kimi launch comparison table.' },
      costPerTask: { value: 0.15 },
      inputCost: { value: 0.6 },
      outputCost: { value: 3 },
    },
  },
  {
    id: 'deepseek-v3-2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    lane: 'Budget reasoning and coding',
    releaseDate: 'Dec 1, 2025',
    releaseDateSort: '2025-12-01',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 70 },
      costPerTask: { value: 0.45 },
      inputCost: { value: 0.27 },
      outputCost: { value: 1.1 },
    },
  },
  {
    id: 'claude-4-5-haiku',
    name: 'Claude 4.5 Haiku',
    provider: 'Anthropic',
    lane: 'Budget Anthropic',
    releaseDate: 'Oct 15, 2025',
    releaseDateSort: '2025-10-15',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 66.6 },
      costPerTask: { value: 0.33 },
      inputCost: { value: 1 },
      outputCost: { value: 5 },
    },
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    lane: 'Budget OpenAI',
    releaseDate: 'Aug 7, 2025',
    releaseDateSort: '2025-08-07',
    sourceLabel: 'Feb 18 comparison',
    sourceUrl: '/edition/edition-2026-02-18-ai-frontier-updates',
    benchmarks: {
      sweBenchVerified: { value: 56.2 },
      costPerTask: { value: 0.05 },
      inputCost: { value: 0.15 },
      outputCost: { value: 0.6 },
    },
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'Google DeepMind',
    lane: 'Agentic and terminal coding',
    releaseDate: 'Nov 18, 2025',
    releaseDateSort: '2025-11-18',
    sourceLabel: 'Nov 26 and Feb 18 comparisons',
    sourceUrl: '/edition/edition-2025-11-26-combined',
    benchmarks: {
      terminalBench: { value: 54.2 },
      hle: { value: 45.8, note: 'Kimi launch comparison table.' },
      browseComp: { value: 59.2, note: 'Kimi launch comparison table.' },
      deepSearchQa: { value: 63.2, note: 'Kimi launch comparison table.' },
      sweBenchVerified: { value: 76.2, note: 'Kimi launch comparison table; not the standardized mini-SWE-agent result.' },
      sweBenchMultilingual: { value: 65.8, note: 'Kimi launch comparison table.' },
    },
  },
];

export const coreSourceCount = modelWatchSources.filter((source) => source.priority === 'Core').length;
export const openWeightSourceCount = modelWatchSources.filter((source) => source.priority === 'Open-weight').length;
export const regionCount = new Set(modelWatchSources.map((source) => source.region)).size;
