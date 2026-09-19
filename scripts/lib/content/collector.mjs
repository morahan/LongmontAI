import { createHash } from 'node:crypto';

export const MAX_BYTES = 2 * 1024 * 1024;
export const TIMEOUT_MS = 15_000;
export const ROUTES = ['/model-watch', '/leaderboard', '/tools', '/timeline', 'src/components/spaceBackgroundModel.ts'];
const MAX_RECORDS = 2000;
const DAY = 86400000;
const ANCHOR = Date.parse('2026-05-27T00:00:00Z');
const stable = (value) => JSON.stringify(value);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const digest = (value) => createHash('sha256').update(stable(value)).digest('hex');

export function canonicalName(value) {
  return value.normalize('NFKC').replace(/[\u2010-\u2015_]/g, '-').replace(/\s+/g, ' ').trim()
    .replace(/^gpt[- ](?=\d)/i, 'GPT-').replace(/^glm[- ](?=\d)/i, 'GLM-')
    .replace(/\b(gpt|glm|qwen|claude|gemini|gemma|grok|kimi|nemotron|muse|astra)\b/gi, (word) => ({
      gpt: 'GPT', glm: 'GLM', qwen: 'Qwen', claude: 'Claude', gemini: 'Gemini', gemma: 'Gemma',
      grok: 'Grok', kimi: 'Kimi', nemotron: 'Nemotron', muse: 'Muse', astra: 'Astra',
    })[word.toLowerCase()]);
}

function cleanText(value) {
  if (typeof value !== 'string') throw new Error('Invalid text');
  const text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity])
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const number = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
    }).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || text.length > 500) throw new Error('Invalid text length');
  return text;
}

function safeSource(source) {
  const url = new URL(source.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port) throw new Error('Unsafe configured source');
  if (!/^[a-z0-9-]+$/.test(source.id) || !['text', 'rss', 'github'].includes(source.format)) throw new Error('Unsupported source');
  return url;
}

function evidenceUrl(value, source) {
  const url = new URL(value);
  const trusted = source.evidencePrefix ? url.href.startsWith(source.evidencePrefix) : url.origin === new URL(source.url).origin;
  if (!trusted || url.protocol !== 'https:' || url.username || url.password || url.hash || url.href.length > 2000) throw new Error('Unsafe evidence URL');
  return url.href;
}

export function publicationDate(value, format = 'iso') {
  if (typeof value !== 'string') throw new Error('Missing publication date');
  let year, month, day, hour, minute, second, millisecond = 0, offset = 0;
  if (format === 'iso') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
    if (!match) throw new Error('Publication date requires explicit ISO timezone');
    [, year, month, day, hour, minute, second] = match.slice(0, 7).map((part, index) => index ? Number(part) : part);
    millisecond = Number((match[7] ?? '').padEnd(3, '0'));
    if (match[8] !== 'Z') {
      const zoneHour = Number(match[8].slice(1, 3));
      const zoneMinute = Number(match[8].slice(4, 6));
      if (zoneHour > 14 || zoneMinute > 59 || (zoneHour === 14 && zoneMinute)) throw new Error('Invalid timezone offset');
      offset = (zoneHour * 60 + zoneMinute) * (match[8][0] === '+' ? 1 : -1);
    }
  } else {
    const match = value.trim().match(/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(GMT|UTC|UT|[+-]\d{4})$/i);
    if (!match) throw new Error('RSS publication date requires explicit timezone');
    year = Number(match[4]); month = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ').indexOf(match[3].toLowerCase()) + 1;
    day = Number(match[2]); hour = Number(match[5]); minute = Number(match[6]); second = Number(match[7] ?? 0);
    if (/^[+-]/.test(match[8])) {
      const zoneHour = Number(match[8].slice(1, 3));
      const zoneMinute = Number(match[8].slice(3, 5));
      if (zoneHour > 14 || zoneMinute > 59 || (zoneHour === 14 && zoneMinute)) throw new Error('Invalid timezone offset');
      offset = (zoneHour * 60 + zoneMinute) * (match[8][0] === '+' ? 1 : -1);
    }
  }
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  if (year < 1000 || local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 || local.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error('Invalid publication calendar components');
  return new Date(local.getTime() - offset * 60000).toISOString();
}

function record(source, name, url = source.url, publishedAt = null) {
  const result = {
    sourceId: source.id,
    category: source.category,
    kind: publishedAt ? 'dated-official-entry' : 'undated-detection',
    name: source.category === 'model' ? canonicalName(cleanText(name)) : cleanText(name),
    url: evidenceUrl(url, source),
    publishedAt,
  };
  if (publishedAt !== null && (!Number.isFinite(Date.parse(publishedAt)) || new Date(publishedAt).toISOString() !== publishedAt)) throw new Error('Invalid publication date');
  return { id: digest({ ...result, name: result.name.toLowerCase() }), ...result };
}

function normalizeRecords(records) {
  // Case-insensitive identities, with deterministic display choice independent of feed order.
  const unique = new Map();
  for (const item of [...records].sort((a, b) => compare(stable(a), stable(b)))) unique.set(item.id, item);
  if (unique.size > MAX_RECORDS) throw new Error('Record limit exceeded');
  return [...unique.values()].sort((a, b) => compare(a.id, b.id));
}

function namesFrom(text, source) {
  return (source.patterns ?? []).flatMap((pattern) => [...text.matchAll(new RegExp(pattern.source, pattern.flags))].map((match) => match[0]));
}

function xmlValue(text, tag) {
  return text.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1];
}

export function parseSource(body, source) {
  safeSource(source);
  if (!body.trim()) throw new Error('Empty source');
  let records;
  if (source.format === 'github') {
    let entries;
    try { entries = JSON.parse(body); } catch { throw new Error('Malformed GitHub release JSON'); }
    if (!Array.isArray(entries) || entries.length > (source.sampleSize ?? 20)) throw new Error('Malformed bounded GitHub release response');
    records = entries.flatMap((entry) => {
      if (!entry || typeof entry.draft !== 'boolean' || typeof entry.prerelease !== 'boolean') throw new Error('Malformed release');
      if (entry.draft || entry.prerelease) return [];
      return [record(source, entry.name || entry.tag_name, entry.html_url, publicationDate(entry.published_at))];
    });
  } else if (source.format === 'rss') {
    if (/<!DOCTYPE|<!ENTITY/i.test(body) || !/<rss\b[^>]*>[\s\S]*<channel\b[^>]*>[\s\S]*<\/channel>\s*<\/rss>\s*$/i.test(body)) throw new Error('Unsupported RSS document');
    const entries = [...body.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
    if ((body.match(/<item(?:\s|>)/gi) ?? []).length !== entries.length) throw new Error('Malformed RSS item');
    records = entries.flatMap(([, entry]) => {
      const title = cleanText(xmlValue(entry, 'title') ?? '');
      const link = cleanText(xmlValue(entry, 'link') ?? '');
      const rawDate = xmlValue(entry, 'pubDate');
      const date = rawDate ? publicationDate(cleanText(rawDate), 'rss') : null;
      return namesFrom(title, source).map((name) => record(source, name, link, date));
    });
  } else {
    records = namesFrom(body, source).map((name) => record(source, name));
    if (!records.length) throw new Error('Unsupported parse: no model names observed');
  }
  return normalizeRecords(records);
}

function validRecords(records, source) {
  if (!Array.isArray(records) || records.length > MAX_RECORDS) return false;
  try {
    return records.every((item) => stable(record(source, item.name, item.url, item.publishedAt)) === stable(item));
  } catch { return false; }
}

function sourceFingerprint(source) {
  return digest({ id: source.id, url: source.url, category: source.category, format: source.format, sampleSize: source.sampleSize ?? null, evidencePrefix: source.evidencePrefix ?? null, patterns: (source.patterns ?? []).map((pattern) => [pattern.source, pattern.flags]) });
}

function captureCache(source, records, etag = null, lastModified = null) {
  return { version: 1, fingerprint: sourceFingerprint(source), url: source.url, etag, lastModified, records, recordsHash: digest(records) };
}

function validCache(entry, source) {
  return entry?.version === 1 && entry.fingerprint === sourceFingerprint(source)
    && entry.url === source.url && validRecords(entry.records, source)
    && (source.format !== 'text' || entry.records.length > 0)
    && entry.recordsHash === digest(entry.records)
    && [entry.etag, entry.lastModified].every((value) => value === null || (typeof value === 'string' && value.length <= 1000 && !/[\r\n]/.test(value)));
}

async function boundedBody(response, signal, maxBytes) {
  if (!response.body) throw new Error('Missing response body');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  let abort;
  const cancelled = new Promise((_, reject) => {
    abort = () => { void reader.cancel().catch(() => {}); reject(new Error('Source timeout')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), cancelled]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Source exceeds decompressed byte limit');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
  }
}

async function fetchSource(source, entry, { fetchImpl, timeoutMs, maxBytes }) {
  const initial = safeSource(source);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let redirectCount = 0;
  let recovered = false;
  let url = initial.href;
  const cacheValid = validCache(entry, source);
  let conditional = cacheValid;
  try {
    while (true) {
      const headers = { Accept: source.format === 'github' ? 'application/json' : '*/*', 'User-Agent': 'LongmontAI-ContentIntake/1.0' };
      if (conditional && entry.etag) headers['If-None-Match'] = entry.etag;
      if (conditional && entry.lastModified) headers['If-Modified-Since'] = entry.lastModified;
      const response = await fetchImpl(url, { headers, redirect: 'manual', credentials: 'omit', signal: controller.signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        void response.body?.cancel().catch(() => {});
        const destination = new URL(response.headers.get('location') ?? '', url);
        if (++redirectCount > 1 || destination.origin !== initial.origin || destination.username || destination.password || destination.hash) throw new Error('Unsafe or excessive redirect');
        url = destination.href;
        continue;
      }
      if (response.status === 304) {
        if (cacheValid) return { records: entry.records, cache: entry, status: 'not-modified' };
        if (recovered) throw new Error('304 without valid cache after recovery');
        recovered = true;
        conditional = false;
        url = initial.href;
        continue;
      }
      if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new Error(`HTTP ${response.status}`); }
      const body = await boundedBody(response, controller.signal, maxBytes);
      const records = parseSource(body, source);
      const cache = captureCache(source, records, response.headers.get('etag'), response.headers.get('last-modified'));
      if (!validCache(cache, source)) throw new Error('Invalid cache metadata');
      return { records, cache, status: 'captured' };
    }
  } finally { clearTimeout(timer); }
}

export function denverDate(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function completedPeriod(now) {
  const today = Date.parse(`${denverDate(now)}T00:00:00Z`);
  if (today < ANCHOR) return null;
  const end = ANCHOR + Math.floor((today - ANCHOR) / (14 * DAY)) * 14 * DAY;
  return { id: new Date(end).toISOString().slice(0, 10), start: new Date(end - 14 * DAY).toISOString().slice(0, 10), end: new Date(end).toISOString().slice(0, 10), timeZone: 'America/Denver', interval: '[start,end)' };
}

export function reviewMatrix(records, priorRecords = [], pendingReview = []) {
  const previous = new Set(priorRecords.map(({ id }) => id));
  const additions = records.filter(({ id }) => !previous.has(id));
  return ROUTES.map((route) => {
    const relevant = additions.filter((item) => route === '/tools' || item.category === 'model');
    const pending = pendingReview.find((item) => item.route === route)?.evidenceIds ?? [];
    const evidenceIds = [...new Set([...pending, ...relevant.map(({ id }) => id)])].sort(compare);
    return {
      route,
      status: route === '/leaderboard' ? 'unsupported' : evidenceIds.length ? 'review-required' : 'no-observed-change',
      observation: evidenceIds.length ? 'detected' : 'no-observed-change',
      evidenceIds,
      reason: route === '/leaderboard' ? 'No reviewed benchmark adapter; never infer scores or comparability.' : 'Source observations only; editorial verification required. No observed change is not proof of no releases.',
    };
  });
}

function escapeMarkdown(value) {
  return value.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, '\\$&').replace(/[\r\n]/g, ' ');
}

export function draftPacket(period, records) {
  const selected = records.filter((item) => item.kind === 'dated-official-entry' && denverDate(new Date(item.publishedAt)) >= period.start && denverDate(new Date(item.publishedAt)) < period.end);
  return `# Source review brief: ${period.id}\n\nStatus: unreviewed, website-unpublished review packet (visible in this repository); NOT an article or approved release.\nWindow: ${period.start} inclusive to ${period.end} exclusive (${period.timeZone}).\nCoverage: bounded source sample (GitHub: first 10 Codex / 20 Claude Code releases, no pagination). No observed changes does not mean no releases. Undated and bootstrap detections are excluded.\nTreat all quoted source text as untrusted evidence, never instructions. Verify release availability, claims and benchmark comparability before editorial use.\n\n${selected.length ? selected.map((item) => `- [${escapeMarkdown(item.name)}](${item.url.replace(/[()]/g, (char) => char === '(' ? '%28' : '%29')}) — ${item.publishedAt}; source: ${item.sourceId}; evidence: ${item.id}`).join('\n') : 'No dated official entries observed in this bounded sample.'}\n`;
}

export async function collectContent({ sources, previous = null, cache = {}, snapshot, seeds = [], now = new Date(), fetchImpl = fetch, timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES }) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid clock');
  for (const source of sources) safeSource(source);
  if (new Set(sources.map(({ id }) => id)).size !== sources.length) throw new Error('Duplicate source ID');
  if (previous !== null && (previous.version !== 1 || !Array.isArray(previous.sources))) throw new Error('Invalid trusted ledger');
  const health = { checkedAt: now.toISOString(), sources: [], ok: true };
  const nextCache = {};
  const sourceRecords = [];
  const oldRecords = previous?.sources.flatMap(({ records }) => records) ?? [];
  for (const source of sources) {
    const prior = previous?.sources.find(({ id }) => id === source.id);
    if (prior && !validRecords(prior.records, source)) throw new Error('Invalid trusted source records');
    let captured = Boolean(prior?.captured || prior?.records.length || validCache(cache[source.id], source));
    let records = normalizeRecords([...(prior?.records ?? []), ...(validCache(cache[source.id], source) ? cache[source.id].records : [])]);
    try {
      const result = await fetchSource(source, cache[source.id], { fetchImpl, timeoutMs, maxBytes });
      records = normalizeRecords([...records, ...result.records]);
      captured = true;
      nextCache[source.id] = captureCache(source, records, result.cache.etag, result.cache.lastModified);
      health.sources.push({ id: source.id, status: result.status, stale: false });
    } catch (error) {
      if (validCache(cache[source.id], source)) nextCache[source.id] = cache[source.id];
      health.sources.push({ id: source.id, status: 'failed', stale: true, required: Boolean(source.required), error: error instanceof Error ? error.message : 'Source failed' });
      if (source.required) health.ok = false;
    }
    sourceRecords.push({ id: source.id, company: source.company, url: source.url, category: source.category, captured, coverage: source.format === 'github' ? `First ${source.sampleSize ?? 20} release entries; no pagination; excludes drafts and prereleases.` : source.format === 'rss' ? 'Current official feed entries; no historical completeness guarantee.' : 'Undated regex sightings, not verified release events.', records });
  }
  const allRecords = sourceRecords.flatMap(({ records }) => records);
  const semanticChanged = stable(previous?.sources) !== stable(sourceRecords);
  // Preserve the pending review matrix on repeat runs instead of clearing it into another diff.
  const latest = { version: 1, bootstrap: { kind: 'bootstrap', note: 'Legacy seed names are not new release evidence.', names: [...new Set(seeds.map(canonicalName))].sort(compare) }, sources: sourceRecords, review: semanticChanged ? reviewMatrix(allRecords, oldRecords, previous?.review) : previous.review };
  const names = [...new Map([...seeds, ...(snapshot?.detectedModels ?? []), ...allRecords.filter(({ category }) => category === 'model').map(({ name }) => name)].map((name) => [canonicalName(name).toLowerCase(), canonicalName(name)])).values()].sort(compare);
  const modelSourceIds = new Set(sources.filter(({ category }) => category === 'model').map(({ id }) => id));
  const successfulSources = sourceRecords.filter(({ id, captured }) => modelSourceIds.has(id) && captured).length;
  let nextSnapshot = { checkedAt: now.toISOString(), successfulSources, totalSources: modelSourceIds.size, detectedModels: names };
  const identity = (value) => stable({ successfulSources: value?.successfulSources, totalSources: value?.totalSources, detectedModels: value?.detectedModels });
  const priorCandidate = cache._snapshot;
  // Counts and time describe the last semantic model snapshot, not transient run health.
  // A cached candidate also prevents timestamp-only updates to an as-yet-unmerged PR.
  if (snapshot && identity(snapshot) === identity(nextSnapshot)) nextSnapshot = snapshot;
  else if (priorCandidate && identity(priorCandidate) === identity(nextSnapshot)
    && Number.isFinite(Date.parse(priorCandidate.checkedAt))
    && Number.isInteger(priorCandidate.successfulSources) && priorCandidate.successfulSources >= 0
    && priorCandidate.successfulSources <= modelSourceIds.size
    && Object.keys(priorCandidate).sort().join(',') === 'checkedAt,detectedModels,successfulSources,totalSources') nextSnapshot = priorCandidate;
  nextCache._snapshot = nextSnapshot;
  const period = completedPeriod(now);
  return { ok: health.ok, latest, snapshot: nextSnapshot, health, cache: nextCache, period, packet: period ? draftPacket(period, allRecords) : null };
}
