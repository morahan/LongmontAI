export const modelWatchSources = [
  {
    company: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    format: 'rss',
    required: true,
    patterns: [/GPT[-\u2011\s]\d+(?:\.\d+)?(?:\s+(?:Sol|Terra|Luna|Astra))?/gi],
  },
  {
    company: 'Anthropic',
    url: 'https://www.anthropic.com/news',
    patterns: [/Claude\s+(?:Fable|Mythos|Opus|Sonnet|Haiku)\s+\d+(?:\.\d+)?/gi],
  },
  {
    company: 'Google DeepMind',
    url: 'https://deepmind.google/blog/',
    patterns: [/(?:Gemini|Gemma)\s+\d+(?:\.\d+)?(?:\s+(?:Pro|Flash))?/gi],
  },
  {
    company: 'xAI',
    url: 'https://docs.x.ai/developers/models',
    patterns: [/Grok\s+\d+(?:\.\d+)?/gi],
  },
  {
    company: 'Meta AI',
    url: 'https://ai.meta.com/blog/',
    patterns: [/Muse\s+Spark(?:\s+\d+(?:\.\d+)?)?/gi, /Llama\s+\d+(?:\.\d+)?/gi],
    required: true,
  },
  {
    company: 'Moonshot AI / Kimi',
    url: 'https://www.moonshot.cn/en',
    patterns: [/Kimi\s+K\d+(?:\.\d+)?/gi],
    required: true,
  },
  {
    company: 'Z.ai',
    url: 'https://docs.z.ai/llms.txt',
    patterns: [/GLM[-\s]\d+(?:\.\d+)?(?:[-\s]Turbo)?/gi],
  },
  {
    company: 'NVIDIA Nemotron',
    url: 'https://developer.nvidia.com/topics/ai/nemotron',
    patterns: [/Nemotron\s+\d+(?:\.\d+)?(?:\s+(?:Lightning|Nano|Super|Ultra))?/gi],
  },
  {
    company: 'Meta AI Research',
    url: 'https://research.meta.ai/blog/',
    patterns: [/Muse\s+(?:Spark|Glimmer)(?:\s+\d+(?:\.\d+)?)?/gi],
  },
  {
    company: 'Alibaba Qwen',
    url: 'https://qwen.ai/api/v2/article/retrieval?type=qwen_ai&language=en-US',
    patterns: [/Qwen(?:3\.8[-\s]27B|[-\s]Image[-\s]3\.0)/gi],
  },
  {
    company: 'Google AI Models',
    url: 'https://blog.google/innovation-and-ai/models-and-research/',
    patterns: [/(?:Gemini\s+\d+(?:\.\d+)?\s+Flash|WeatherNext\s+Cyclones)/gi],
  },
  {
    company: 'Hugging Face',
    url: 'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=100',
    patterns: [/(?:GLM|Kimi|Mistral|Qwen)[-_\s]\d+(?:\.\d+)?/gi],
  },
];

export const seedModels = [
  'GPT-5.6 Sol',
  'GPT-5.6 Terra',
  'GPT-5.6 Luna',
  'Claude Fable 5',
  'Grok 4.5',
  'GLM-5.3',
  'Grok 4.6',
  'Gemini 3.7 Flash',
  'Nemotron 3.5 Lightning',
  'Muse Spark 1.1',
  'Muse Spark 1.2',
  'Muse Glimmer',
  'Qwen3.8-27B',
  'Qwen-Image 3.0',
  'WeatherNext Cyclones',
  'Kimi K3',
];

// Fixed official repository feeds: never follow URLs supplied by feed content.
export const toolReleaseSources = [
  { company: 'OpenAI Codex', url: 'https://api.github.com/repos/openai/codex/releases?per_page=10', format: 'github', category: 'tool', sampleSize: 10, evidencePrefix: 'https://github.com/openai/codex/releases/' },
  { company: 'Anthropic Claude Code', url: 'https://api.github.com/repos/anthropics/claude-code/releases?per_page=20', format: 'github', category: 'tool', sampleSize: 20, evidencePrefix: 'https://github.com/anthropics/claude-code/releases/' },
];

export const contentSources = [...modelWatchSources, ...toolReleaseSources].map((source) => ({
  ...source,
  id: source.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
  category: source.category ?? 'model',
  format: source.format ?? 'text',
}));

export const normalizeModelName = (value) => value
  .replaceAll('\u2011', '-')
  .replace(/GPT\s+(?=\d)/i, 'GPT-')
  .replaceAll('_', ' ')
  .replace(/\s+/g, ' ')
  .trim();
