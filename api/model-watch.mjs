import snapshot from '../src/data/modelWatch.generated.json' with { type: 'json' };

export default function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  if (request.method === 'HEAD') return response.status(200).end();
  return response.status(200).json(snapshot);
}
