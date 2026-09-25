export type EditionShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareNavigator {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
    clipboard?: Pick<Clipboard, 'writeText'>;
}

export function canonicalEditionUrl(origin: string, editionId: string): string {
    return new URL(`/edition/${encodeURIComponent(editionId)}`, origin).href;
}

export async function shareEdition(
    shareNavigator: ShareNavigator,
    title: string,
    url: string,
): Promise<EditionShareResult> {
    const data = { title, url };
    try {
        if (typeof shareNavigator.share === 'function'
            && (typeof shareNavigator.canShare !== 'function' || shareNavigator.canShare(data))) {
            await shareNavigator.share(data);
            return 'shared';
        }
    } catch (error) {
        // Cancelling a native sheet must not silently write to the clipboard.
        if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }

    try {
        if (typeof shareNavigator.clipboard?.writeText === 'function') {
            await shareNavigator.clipboard.writeText(url);
            return 'copied';
        }
    } catch {
        // Permission/platform errors are reported without exposing raw messages.
    }
    return 'failed';
}
