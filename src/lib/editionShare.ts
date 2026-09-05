export type EditionShareResult = 'shared' | 'copied' | 'failed';

interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
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
  if (typeof shareNavigator.share === 'function') {
    try {
      await shareNavigator.share({ title, url });
      return 'shared';
    } catch {
      return 'failed';
    }
  }

  if (typeof shareNavigator.clipboard?.writeText === 'function') {
    try {
      await shareNavigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
