import { Edition, ScheduledEditionResponse } from './types';
import { SlideshowDeck } from './slideshows';

export const scheduledEditionSlug = 'edition-2026-08-05-signal-routing';

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

    return {
        edition,
        slideshows: response.slideshows as Record<string, SlideshowDeck> | undefined,
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
