const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileWidget {
  reset(): void;
  remove(): void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load.')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Turnstile did not load.'));
    };
    document.head.append(script);
  });
  return loading;
}

export const turnstileSiteKey: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;

export async function mountTurnstile(
  container: HTMLElement,
  siteKey: string,
  onToken: (token: string) => void,
): Promise<TurnstileWidget> {
  const api = await loadTurnstile();
  const id = api.render(container, {
    sitekey: siteKey,
    theme: 'dark',
    size: 'flexible',
    callback: onToken,
    'expired-callback': () => onToken(''),
    'error-callback': () => onToken(''),
  });
  return {
    reset: () => api.reset(id),
    remove: () => api.remove(id),
  };
}
