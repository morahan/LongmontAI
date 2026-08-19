import { Edition, ScheduledEditionResponse } from './types';
import { SlideshowDeck } from './slideshows';
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
): () => void {
    if (!scheduledEditionSlug || !Number.isFinite(scheduledEditionPublishAt)) {
        return () => undefined;
    }

    const controller = new AbortController();
    let timer: number | undefined;
    let retryAttempt = 0;
    let requestInFlight = false;

    const clearTimer = (): void => {
        if (timer !== undefined) {
            window.clearTimeout(timer);
            timer = undefined;
        }
    };

    const schedule = (delay: number): void => {
        clearTimer();
        timer = window.setTimeout(run, Math.min(Math.max(delay, 0), MAX_TIMER_DELAY_MS));
    };

    const scheduleNextAttempt = (): void => {
        const untilPublication = scheduledEditionPublishAt - Date.now();
        if (untilPublication > 0) {
            schedule(untilPublication);
            return;
        }

        const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
        retryAttempt += 1;
        schedule(delay);
    };

    const run = async (): Promise<void> => {
        if (controller.signal.aborted || requestInFlight) {
            return;
        }

        clearTimer();
        requestInFlight = true;
        try {
            const result = await fetchScheduledEdition(controller.signal);
            if (result) {
                retryAttempt = 0;
                onEdition(result);
                return;
            }
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
        } finally {
            requestInFlight = false;
        }

        if (!controller.signal.aborted) {
            scheduleNextAttempt();
        }
    };

    const recover = (): void => {
        if (document.visibilityState === 'visible') {
            void run();
        }
    };

    const recoverOnline = (): void => void run();
    document.addEventListener('visibilitychange', recover);
    window.addEventListener('focus', recover);
    window.addEventListener('online', recoverOnline);
    void run();

    return () => {
        controller.abort();
        clearTimer();
        document.removeEventListener('visibilitychange', recover);
        window.removeEventListener('focus', recover);
        window.removeEventListener('online', recoverOnline);
    };
}
