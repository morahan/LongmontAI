import {
  modelWatchSources as sources,
  normalizeModelName,
  seedModels,
} from '../scripts/model-watch-sources.mjs';

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
