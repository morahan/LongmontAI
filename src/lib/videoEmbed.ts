// Recognition only: the media handler remains authoritative for release time,
// revision and allowlist membership. Never accept arbitrary URL-shaped tokens.
const MEDIA_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;
const EDITION_ID = /^edition-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;
const ENDPOINT = '/api/scheduled-media?';

export function videoMime(src: string): 'video/mp4' | 'video/webm' | null {
    let mediaPath: string;
    if (src.startsWith(ENDPOINT)) {
        const params = new URLSearchParams(src.slice(ENDPOINT.length));
        const edition = params.get('edition') ?? '';
        const revision = params.get('revision') ?? '';
        mediaPath = params.get('path') ?? '';
        if (!EDITION_ID.test(edition) || !/^[a-f0-9]{24}$/.test(revision) || !MEDIA_PATH.test(mediaPath)) return null;
        const canonical = `${ENDPOINT}edition=${encodeURIComponent(edition)}&revision=${revision}&path=${encodeURIComponent(mediaPath)}`;
        // Exact round trip rejects duplicates, extras, fragments, malformed or
        // repeated encoding, alternate key order and ambiguous separators.
        if (src !== canonical) return null;
    } else {
        // Preserve local static token paths, without schemes, traversal or queries.
        mediaPath = src.startsWith('/') ? src.slice(1) : src;
        if (!/^[a-z0-9./-]+$/i.test(src) || !MEDIA_PATH.test(mediaPath)) return null;
    }
    // Normalize only for MIME recognition, never for URL validation or output.
    const normalizedPath = mediaPath.toLowerCase();
    if (normalizedPath.endsWith('.mp4')) return 'video/mp4';
    if (normalizedPath.endsWith('.webm')) return 'video/webm';
    return null;
}
