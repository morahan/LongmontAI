export const modelWatchSources = [
  {
    company: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    patterns: [/GPT[-\u2011\s]\d+(?:\.\d+)?(?:\s+(?:Sol|Terra|Luna))?/gi],
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
  'Muse Spark 1.1',
  'Kimi K3',
];

export const normalizeModelName = (value) => value
  .replaceAll('\u2011', '-')
  .replace(/GPT\s+(?=\d)/i, 'GPT-')
  .replaceAll('_', ' ')
  .replace(/\s+/g, ' ')
  .trim();
