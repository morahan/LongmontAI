const sources = [
  {
    url: 'https://openai.com/news/rss.xml',
    patterns: [/GPT[-\u2011\s]\d+(?:\.\d+)?(?:\s+(?:Sol|Terra|Luna))?/gi],
  },
  {
    url: 'https://www.anthropic.com/news',
    patterns: [/Claude\s+(?:Fable|Mythos|Opus|Sonnet|Haiku)\s+\d+(?:\.\d+)?/gi],
  },
  {
    url: 'https://deepmind.google/blog/',
    patterns: [/(?:Gemini|Gemma)\s+\d+(?:\.\d+)?(?:\s+(?:Pro|Flash))?/gi],
  },
  {
    url: 'https://docs.x.ai/developers/models',
    patterns: [/Grok\s+\d+(?:\.\d+)?/gi],
  },
  {
    url: 'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=100',
    patterns: [/(?:GLM|Kimi|Mistral|Qwen)[-_\s]\d+(?:\.\d+)?/gi],
  },
];

const seedModels = ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna', 'Claude Fable 5', 'Grok 4.5'];

const normalizeModelName = (value) => value
  .replaceAll('\u2011', '-')
  .replace(/GPT\s+(?=\d)/i, 'GPT-')
  .replaceAll('_', ' ')
  .replace(/\s+/g, ' ')
  .trim();

export default async function handler(_request, response) {
  const detectedModels = new Set(seedModels);
  let successfulSources = 0;

  await Promise.all(sources.map(async (source) => {
    try {
      const sourceResponse = await fetch(source.url, {
        headers: { 'User-Agent': 'LongmontAI-ModelWatch/1.0 (+https://longmont.ai/model-watch)' },
        signal: AbortSignal.timeout(12_000),
      });

      if (!sourceResponse.ok) return;

      const body = await sourceResponse.text();
      for (const pattern of source.patterns) {
        for (const match of body.matchAll(pattern)) {
          detectedModels.add(normalizeModelName(match[0]));
        }
      }
      successfulSources += 1;
    } catch {
      // A partial result is more useful than failing the entire watch cycle.
    }
  }));

  response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  response.status(200).json({
    checkedAt: new Date().toISOString(),
    successfulSources,
    totalSources: sources.length,
    detectedModels: [...detectedModels].sort((a, b) => a.localeCompare(b)),
  });
}
