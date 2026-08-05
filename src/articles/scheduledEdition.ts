import { Edition, ScheduledEditionResponse } from './types';
import { SlideshowDeck } from './slideshows';

export const scheduledEditionSlug = 'edition-2026-08-05-signal-routing';
export const scheduledEditionPublishAt = Date.parse('2026-08-05T11:15:00-06:00');

function scheduledMediaUrl(path: string): string {
    if (!path.startsWith('/') || path.startsWith('/api/')) {
        return path;
    }

    return `/api/scheduled-media?path=${encodeURIComponent(path)}`;
}

function rewriteMarkdownMedia(markdown: string | undefined): string | undefined {
    if (!markdown) {
        return markdown;
    }

    return markdown
        .replace(/(]\()([^\s)]+)(\))/g, (match, prefix: string, path: string, suffix: string) => (
            path.startsWith('/') ? `${prefix}${scheduledMediaUrl(path)}${suffix}` : match
        ))
        .replace(/(\{\{(?:video|pdf):)(\/[^}]+)(\}\})/g, (_match, prefix: string, path: string, suffix: string) => (
            `${prefix}${scheduledMediaUrl(path)}${suffix}`
        ));
}

function rewriteDeckMedia(deck: SlideshowDeck): SlideshowDeck {
    return {
        ...deck,
        sourceUrl: deck.sourceUrl ? scheduledMediaUrl(deck.sourceUrl) : undefined,
        slides: deck.slides?.map((slide) => ({ ...slide, src: scheduledMediaUrl(slide.src) })),
        embed: deck.embed ? { ...deck.embed, src: scheduledMediaUrl(deck.embed.src) } : undefined,
    };
}

function isEdition(value: unknown): value is Edition {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const edition = value as Partial<Edition>;
    return typeof edition.id === 'string'
        && typeof edition.date === 'string'
        && typeof edition.title === 'string'
        && typeof edition.summary === 'string';
}

function normalizeResponse(value: unknown): ScheduledEditionResponse | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const response = value as { edition?: unknown; slideshows?: unknown };
    const edition = response.edition ?? value;

    if (!isEdition(edition) || edition.id !== scheduledEditionSlug) {
        return null;
    }

    const slideshows = response.slideshows as Record<string, SlideshowDeck> | undefined;
    return {
        edition: { ...edition, markdownContent: rewriteMarkdownMedia(edition.markdownContent) },
        slideshows: slideshows && Object.fromEntries(
            Object.entries(slideshows).map(([id, deck]) => [id, rewriteDeckMedia(deck)])
        ),
    };
}

export async function fetchScheduledEdition(signal?: AbortSignal): Promise<ScheduledEditionResponse | null> {
    const response = await fetch(`/api/scheduled-edition?slug=${encodeURIComponent(scheduledEditionSlug)}`, {
        signal,
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        return null;
    }

    return normalizeResponse(await response.json());
}
