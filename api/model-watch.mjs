// Load only the deployed artifact. Missing/invalid JSON must also fail closed,
// without falling back to a producer, upstream fetch or an invented timestamp.
const snapshot = await import('../src/data/modelWatch.generated.json', { with: { type: 'json' } })
  .then((module) => module.default)
  .catch(() => null);

const isValidSnapshot = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(',') !== 'checkedAt,detectedModels,successfulSources,totalSources') return false;
  if (typeof value.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.checkedAt)) return false;
  const timestamp = Date.parse(value.checkedAt);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value.checkedAt) return false;
  if (!Number.isSafeInteger(value.successfulSources) || !Number.isSafeInteger(value.totalSources)
    || value.successfulSources < 0 || value.totalSources < value.successfulSources) return false;
  return Array.isArray(value.detectedModels) && value.detectedModels.every((name) => (
    typeof name === 'string' && name.length > 0 && name.length <= 200
    && name === name.trim() && !/[\u0000-\u001f\u007f]/.test(name)
  ));
};

export default function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Intentionally narrow the legacy all-method endpoint to read-only retrieval.
  // Query/body/environment never influence capture time, counts or freshness.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!isValidSnapshot(snapshot)) {
    response.setHeader('Cache-Control', 'no-store');
    response.status(503);
    return request.method === 'HEAD' ? response.end() : response.json({ ok: false, error: 'snapshot_unavailable' });
  }
  response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  response.status(200);
  return request.method === 'HEAD' ? response.end() : response.json(snapshot);
}
