import { readFile, writeFile } from 'node:fs/promises';
import {
  modelWatchSources as sources,
  normalizeModelName,
  seedModels,
} from './model-watch-sources.mjs';

const outputPath = new URL('../src/data/modelWatch.generated.json', import.meta.url);

const previous = JSON.parse(await readFile(outputPath, 'utf8'));
const detectedModels = new Set([...seedModels, ...(previous.detectedModels ?? [])]);
let successfulSources = 0;
const failedRequiredSources = [];

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
    if (source.required) {
      failedRequiredSources.push(source.company);
    }
  }
}

if (failedRequiredSources.length > 0) {
  throw new Error(`Required Model Watch sources failed: ${failedRequiredSources.join(', ')}`);
}

const result = {
  checkedAt: new Date().toISOString(),
  successfulSources,
  totalSources: sources.length,
  detectedModels: [...detectedModels].sort((a, b) => a.localeCompare(b)),
};

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`tracked ${result.detectedModels.length} model names`);
