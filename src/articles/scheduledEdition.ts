import { Edition, ScheduledEditionResponse } from './types';
import { SlideshowDeck } from './slideshows';
import {
    unavailableScheduledEditionPhase,
    type ScheduledEditionPhase,
} from '../lib/scheduledEditionState';
import { watchRetryingResource } from '../lib/retryingWatcher';
import {
    scheduledEditionPublishAt,
    scheduledEditionSlug,
} from '../generated/scheduled-release/client';

export { scheduledEditionPublishAt, scheduledEditionSlug };

const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000, 60_000] as const;
const MAX_TIMER_DELAY_MS = 2_147_000_000;

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
    const edition = response.edition;

    if (!isEdition(edition) || edition.id !== scheduledEditionSlug) {
        return null;
    }

    const slideshows = response.slideshows as Record<string, SlideshowDeck> | undefined;
    return { edition, slideshows };
}

export async function fetchScheduledEdition(signal?: AbortSignal): Promise<ScheduledEditionResponse | null> {
    if (!scheduledEditionSlug) {
        return null;
    }

    const response = await fetch(`/api/scheduled-edition?slug=${encodeURIComponent(scheduledEditionSlug)}`, {
        signal,
        headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Scheduled edition request failed with status ${response.status}`);
    }

    return normalizeResponse(await response.json());
}

/**
 * Fetch immediately, retry at/after the publication boundary, and recover when a
 * throttled page becomes active or its network connection returns.
 */
export function watchScheduledEdition(
    onEdition: (result: ScheduledEditionResponse) => void,
    onStatus?: (status: ScheduledEditionPhase) => void,
): () => void {
    if (!scheduledEditionSlug || !Number.isFinite(scheduledEditionPublishAt)) {
        return () => undefined;
    }

    onStatus?.('checking');
    return watchRetryingResource({
        publicationAt: scheduledEditionPublishAt,
        retryDelays: RETRY_DELAYS_MS,
        maxTimerDelay: MAX_TIMER_DELAY_MS,
        attempt: fetchScheduledEdition,
        onResult: onEdition,
        onUnavailable: (now, publishAt) => {
            onStatus?.(unavailableScheduledEditionPhase(now, publishAt));
        },
    });
}
