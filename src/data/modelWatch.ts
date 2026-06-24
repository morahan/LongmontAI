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

export const coreSourceCount = modelWatchSources.filter((source) => source.priority === 'Core').length;
export const openWeightSourceCount = modelWatchSources.filter((source) => source.priority === 'Open-weight').length;
export const regionCount = new Set(modelWatchSources.map((source) => source.region)).size;
