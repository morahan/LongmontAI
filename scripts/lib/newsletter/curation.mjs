import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { modelWatchSources } from '../../model-watch-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTICLE_URL_PATTERN = /https?:\/\/[^\s)"'<>]+/g;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function periodForCadence(cadence, now) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = cadence === 'biweekly' ? 14 : 7;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: isoDate(start), end: isoDate(end) };
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[line.slice(0, separator).trim()] = value;
  }
  return { data, body: match[2] };
}

function sourceUrlsFromMarkdown(markdown) {
  return Array.from(new Set(markdown.match(ARTICLE_URL_PATTERN) ?? []))
    .map((url) => url.replace(/[),.;]+$/, ''))
    .slice(0, 24);
}

async function readRecentArticles(root, now, limit = 6) {
  const articleDir = path.join(root, 'src/articles');
  const files = (await readdir(articleDir))
    .filter((file) => /^20\d{2}\.\d{2}\.\d{2}.*\.md$/.test(file));
  const articles = [];
  for (const file of files) {
    const raw = await readFile(path.join(articleDir, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const publishTime = Date.parse(data.publishAt ?? `${data.date ?? ''}T00:00:00Z`);
    if (!Number.isFinite(publishTime) || publishTime > now.getTime()) continue;
    articles.push({
      id: data.id,
      date: data.date,
      title: data.title,
      summary: data.summary,
      path: `src/articles/${file}`,
      sourceUrls: sourceUrlsFromMarkdown(body),
      headings: Array.from(body.matchAll(/^#{2,3}\s+(.+)$/gm)).map((match) => match[1]).slice(0, 8),
    });
  }
  return articles
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, limit);
}

async function readModelWatchStatus(root) {
  try {
    return JSON.parse(await readFile(path.join(root, 'src/data/modelWatch.generated.json'), 'utf8'));
  } catch {
    return { checkedAt: null, successfulSources: 0, totalSources: modelWatchSources.length, detectedModels: [] };
  }
}

async function fetchSourceHighlights(fetchImpl, limit = 8) {
  const highlights = [];
  const selectedSources = modelWatchSources.slice(0, limit);
  await Promise.all(selectedSources.map(async (source) => {
    try {
      const response = await fetchImpl(source.url, {
        headers: { 'User-Agent': 'LongmontAI-Newsletter/1.0 (+https://longmontai.com/newsletter)' },
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body = (await response.text()).slice(0, 80_000);
      const matches = new Set();
      for (const pattern of source.patterns ?? []) {
        for (const match of body.matchAll(pattern)) matches.add(match[0].replace(/\s+/g, ' ').trim());
      }
      highlights.push({
        company: source.company,
        url: source.url,
        matches: [...matches].slice(0, 8),
        ok: true,
      });
    } catch (error) {
      highlights.push({
        company: source.company,
        url: source.url,
        matches: [],
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }));
  return highlights.sort((left, right) => left.company.localeCompare(right.company));
}

export async function collectWebsiteSignals({
  root = ROOT,
  now = new Date(),
  fetchImpl = fetch,
  fetchLiveSources = true,
} = {}) {
  const [articles, modelWatchStatus, sourceHighlights] = await Promise.all([
    readRecentArticles(root, now),
    readModelWatchStatus(root),
    fetchLiveSources ? fetchSourceHighlights(fetchImpl) : Promise.resolve([]),
  ]);

  const ownedSourceUrls = new Set([
    'https://longmontai.com/',
    'https://longmontai.com/model-watch',
    'https://longmontai.com/leaderboard',
    'https://longmontai.com/timeline',
    ...articles.flatMap((article) => article.sourceUrls),
  ]);

  return {
    collectedAt: now.toISOString(),
    website: {
      home: 'https://longmontai.com/',
      modelWatch: 'https://longmontai.com/model-watch',
      leaderboard: 'https://longmontai.com/leaderboard',
      timeline: 'https://longmontai.com/timeline',
      recentArticles: articles,
    },
    modelWatchStatus,
    monitoredSources: modelWatchSources.map((source) => ({
      company: source.company,
      url: source.url,
      required: Boolean(source.required),
    })),
    sourceHighlights,
    sourceUrls: [...ownedSourceUrls, ...sourceHighlights.map((source) => source.url)]
      .filter(Boolean)
      .slice(0, 80),
  };
}

function item(category, title, synthesis, sourceName, sourceUrl, score, sortOrder) {
  return { category, title, synthesis, sourceName, sourceUrl, score, sortOrder };
}

export function deterministicDraftFromSignals(signals, { cadence = 'weekly', now = new Date() } = {}) {
  const period = periodForCadence(cadence, now);
  const modelNames = signals.modelWatchStatus.detectedModels?.slice(-8).reverse() ?? [];
  const article = signals.website.recentArticles[0];
  const healthySources = `${signals.modelWatchStatus.successfulSources}/${signals.modelWatchStatus.totalSources}`;
  const sourceHighlight = signals.sourceHighlights.find((source) => source.matches.length > 0);
  const subject = `LongmontAI AI briefing: ${modelNames[0] ?? 'frontier model watch'}`;
  const preheader = `${healthySources} monitored sources healthy; latest website recap included.`;
  const items = [
    item(
      'models',
      modelNames.length ? `Models to watch: ${modelNames.slice(0, 4).join(', ')}` : 'Models to watch',
      'LongmontAI Model Watch is the primary owned signal for release tracking and source health.',
      'LongmontAI Model Watch',
      'https://longmontai.com/model-watch',
      88,
      0,
    ),
    item(
      'benchmarks',
      'Benchmark movement stays on the watchlist',
      'The newsletter should promote only comparable benchmark claims and route ambiguous claims back to the leaderboard for review.',
      'LongmontAI Leaderboard',
      'https://longmontai.com/leaderboard',
      76,
      1,
    ),
    item(
      'breakthroughs',
      article?.title ?? 'Latest LongmontAI edition',
      article?.summary ?? 'Recent LongmontAI editions remain an input to the curation loop.',
      'LongmontAI Editions',
      article?.id ? `https://longmontai.com/edition/${article.id}` : 'https://longmontai.com/',
      72,
      2,
    ),
    item(
      'watchlist',
      sourceHighlight ? `${sourceHighlight.company} source signals` : 'External AI source sweep',
      sourceHighlight?.matches.length
        ? `Detected references: ${sourceHighlight.matches.slice(0, 5).join(', ')}.`
        : 'The live source sweep ran without enough structured matches to promote a claim automatically.',
      sourceHighlight?.company ?? 'LongmontAI source monitor',
      sourceHighlight?.url ?? 'https://longmontai.com/model-watch',
      68,
      3,
    ),
  ];
  return sanitizeNewsletterDraft({
    cadence,
    periodStart: period.start,
    periodEnd: period.end,
    name: `LongmontAI ${cadence} AI briefing ${period.end}`,
    subject,
    preheader,
    summary: `An AI-ready draft synthesized from LongmontAI's website archive, Model Watch, monitored model sources, and benchmark surfaces for ${period.start} through ${period.end}.`,
    items,
    sourceUrls: signals.sourceUrls,
    websiteSnapshot: signals,
    curatorModel: null,
    usedAi: false,
  });
}

function normalizePlainText(value, maxLength) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(normalized).slice(0, maxLength).join('');
}

export function escapeNewsletterHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const FIRST_PARTY_PATHS = new Set(['/', '/model-watch', '/leaderboard', '/timeline', '/newsletter']);
const TRUSTED_URL_FALLBACK = 'https://longmontai.com/';

function decodedUrlForInspection(value) {
  let decoded = value;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) return decoded;
    decoded = next;
  }
  if (/%[0-9a-f]{2}/i.test(decoded)) throw new Error('URL encoding depth exceeded.');
  return decoded;
}

export function validatedNewsletterUrl(value) {
  const normalized = String(value ?? '').normalize('NFKC').trim();
  if (!normalized || normalized.length > 500 || /[\p{Cc}\p{Cf}]/u.test(normalized) || normalized.includes('\\')) {
    return null;
  }

  let inspected;
  try {
    inspected = decodedUrlForInspection(normalized).trim();
  } catch {
    return null;
  }
  if (
    /[\p{Cc}\p{Cf}]/u.test(inspected)
    || /^(?:javascript|data|file)\s*:/i.test(inspected)
    || inspected.startsWith('//')
    || inspected.includes('\\')
  ) {
    return null;
  }

  if (inspected.startsWith('/')) {
    const pathOnly = inspected.split(/[?#]/, 1)[0];
    const allowedEdition = /^\/edition\/[A-Za-z0-9._~-]+$/.test(pathOnly);
    if ((!FIRST_PARTY_PATHS.has(pathOnly) && !allowedEdition) || inspected !== pathOnly) return null;
    return new URL(pathOnly, 'https://longmontai.com').href;
  }

  let url;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  return url.href;
}

function safeItemUrl(value, fallback) {
  return validatedNewsletterUrl(value) ?? validatedNewsletterUrl(fallback) ?? TRUSTED_URL_FALLBACK;
}

export function sanitizeNewsletterDraft(candidate, fallback = candidate) {
  const fallbackItems = Array.isArray(fallback?.items) ? fallback.items : [];
  const candidateItems = Array.isArray(candidate?.items) && candidate.items.length > 0
    ? candidate.items.slice(0, 8)
    : fallbackItems.slice(0, 8);
  const categories = ['models', 'benchmarks', 'breakthroughs', 'agents', 'tools', 'policy', 'community', 'watchlist'];
  const items = candidateItems.map((entry, index) => {
    const fallbackEntry = fallbackItems[index % Math.max(1, fallbackItems.length)] ?? {};
    return {
      category: categories.includes(entry?.category) ? entry.category : (fallbackEntry.category ?? 'watchlist'),
      title: normalizePlainText(entry?.title ?? fallbackEntry.title, 180),
      synthesis: normalizePlainText(entry?.synthesis ?? fallbackEntry.synthesis, 600),
      sourceName: normalizePlainText(entry?.sourceName ?? entry?.source_name ?? fallbackEntry.sourceName, 140),
      sourceUrl: safeItemUrl(entry?.sourceUrl ?? entry?.source_url, fallbackEntry.sourceUrl),
      score: Number.isInteger(entry?.score) ? Math.max(0, Math.min(100, entry.score)) : (fallbackEntry.score ?? 50),
      sortOrder: index,
    };
  });
  const subject = normalizePlainText(candidate?.subject ?? fallback?.subject, 160);
  const preheader = normalizePlainText(candidate?.preheader ?? fallback?.preheader, 180);
  const summary = normalizePlainText(candidate?.summary ?? fallback?.summary, 900);
  const htmlItems = items.map((entry) => (
    `<li><strong>${escapeNewsletterHtml(entry.title)}</strong><br>${escapeNewsletterHtml(entry.synthesis)} <a href="${escapeNewsletterHtml(entry.sourceUrl)}">Source</a></li>`
  )).join('');
  const textItems = items.map((entry) => `- ${entry.title}: ${entry.synthesis} (${entry.sourceUrl})`).join('\n');
  const sourceUrls = Array.from(new Set((candidate?.sourceUrls ?? fallback?.sourceUrls ?? [])
    .map(validatedNewsletterUrl)
    .filter(Boolean)))
    .slice(0, 48);

  return {
    ...fallback,
    ...candidate,
    name: normalizePlainText(candidate?.name ?? fallback?.name, 180),
    subject,
    preheader,
    summary,
    html: `<h1>${escapeNewsletterHtml(subject)}</h1><p>${escapeNewsletterHtml(preheader)}</p><ul>${htmlItems}</ul><p>Read more at <a href="https://longmontai.com/">LongmontAI.com</a>.</p>`,
    text: `${subject}\n\n${preheader}\n\n${textItems}\n\nRead more: https://longmontai.com/`,
    items,
    sourceUrls,
  };
}

function responseText(responseJson) {
  if (typeof responseJson.output_text === 'string') return responseJson.output_text;
  const textParts = [];
  for (const output of responseJson.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === 'string') textParts.push(content.text);
    }
  }
  return textParts.join('\n');
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not include JSON.');
    return JSON.parse(match[0]);
  }
}

function normalizeAiDraft(candidate, fallback) {
  if (!candidate || typeof candidate !== 'object') return fallback;
  return sanitizeNewsletterDraft({
    ...fallback,
    subject: candidate.subject ?? fallback.subject,
    preheader: candidate.preheader ?? fallback.preheader,
    summary: candidate.summary ?? fallback.summary,
    items: Array.isArray(candidate.items) && candidate.items.length > 0 ? candidate.items : fallback.items,
    usedAi: true,
  }, fallback);
}

export async function createCuratedNewsletterDraft({
  env = process.env,
  cadence = 'weekly',
  now = new Date(),
  fetchImpl = fetch,
  root = ROOT,
  fetchLiveSources = true,
  collectSignalsImpl = collectWebsiteSignals,
} = {}) {
  const signals = await collectSignalsImpl({ root, now, fetchImpl, fetchLiveSources });
  const fallback = deterministicDraftFromSignals(signals, { cadence, now });
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const model = env.NEWSLETTER_CURATOR_MODEL || 'gpt-5-mini';
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        'You are the LongmontAI newsletter curator.',
        'Use the supplied LongmontAI website data as an owned source and blend it with monitored AI model/research sources.',
        'Return only JSON with bounded plain-text subject, preheader, summary, and items; never return HTML.',
        'Promote model releases, frontier/benchmark movement, breakthroughs, agents/tools, and community relevance.',
        'Do not invent benchmark numbers or unsupported release claims.',
      ].join(' '),
      input: JSON.stringify({
        expectedShape: {
          subject: 'string',
          preheader: 'string',
          summary: 'plain text string',
          items: [{ category: 'models|benchmarks|breakthroughs|agents|tools|policy|community|watchlist', title: 'string', synthesis: 'string', sourceName: 'string', sourceUrl: 'string', score: 0 }],
        },
        signals,
      }),
    }),
  });
  const responseJson = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI curation failed: ${responseJson?.error?.message ?? response.statusText}`);
  }
  const draft = normalizeAiDraft(parseJsonObject(responseText(responseJson)), fallback);
  return sanitizeNewsletterDraft({
    ...draft,
    curatorModel: model,
    websiteSnapshot: signals,
    sourceUrls: signals.sourceUrls,
  }, draft);
}
