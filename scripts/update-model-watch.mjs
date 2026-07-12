import { readFile, writeFile } from 'node:fs/promises';

const outputPath = new URL('../src/data/modelWatch.generated.json', import.meta.url);
const sources = [
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
    company: 'Hugging Face',
    url: 'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=100',
    patterns: [/(?:GLM|Kimi|Mistral|Qwen)[-_\s]\d+(?:\.\d+)?/gi],
  },
];

const normalizeModelName = (value) => value
  .replaceAll('\u2011', '-')
  .replace(/GPT\s+(?=\d)/i, 'GPT-')
  .replaceAll('_', ' ')
  .replace(/\s+/g, ' ')
  .trim();

const previous = JSON.parse(await readFile(outputPath, 'utf8'));
const detectedModels = new Set(previous.detectedModels ?? []);
let successfulSources = 0;

for (const source of sources) {
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'LongmontAI-ModelWatch/1.0 (+https://longmont.ai/model-watch)' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const body = await response.text();
    for (const pattern of source.patterns) {
      for (const match of body.matchAll(pattern)) {
        detectedModels.add(normalizeModelName(match[0]));
      }
    }
    successfulSources += 1;
    console.log(`ok ${source.company}`);
  } catch (error) {
    console.warn(`failed ${source.company}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const result = {
  checkedAt: new Date().toISOString(),
  successfulSources,
  totalSources: sources.length,
  detectedModels: [...detectedModels].sort((a, b) => a.localeCompare(b)),
};

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`tracked ${result.detectedModels.length} model names`);
