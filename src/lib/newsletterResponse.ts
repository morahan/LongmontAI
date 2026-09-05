export interface NewsletterSubscribePayload {
  ok?: boolean;
  status?: string;
  error?: string;
}

const UNAVAILABLE_MESSAGE = 'Newsletter signup is temporarily unavailable.';
const SAFE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  invalid_email: 'Enter a valid email address.',
  body_too_large: 'Newsletter signup request is too large.',
  invalid_json: 'Newsletter signup request was not accepted.',
  unsupported_content_type: 'Newsletter signup request was not accepted.',
  origin_not_allowed: 'Newsletter signup is unavailable from this page.',
  method_not_allowed: UNAVAILABLE_MESSAGE,
};

export class NewsletterResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsletterResponseError';
  }
}

export async function readNewsletterSubscribeResponse(response: Response): Promise<NewsletterSubscribePayload> {
  let payload: NewsletterSubscribePayload | null = null;
  if (response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    try {
      payload = await response.json() as NewsletterSubscribePayload;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload?.ok !== true) {
    const safeMessage = response.status < 500 && typeof payload?.error === 'string'
      && Object.prototype.hasOwnProperty.call(SAFE_ERROR_MESSAGES, payload.error)
      ? SAFE_ERROR_MESSAGES[payload.error]
      : undefined;
    throw new NewsletterResponseError(safeMessage ?? UNAVAILABLE_MESSAGE);
  }

  return payload;
}

export function newsletterSignupErrorMessage(error: unknown): string {
  return error instanceof NewsletterResponseError ? error.message : UNAVAILABLE_MESSAGE;
}

export { UNAVAILABLE_MESSAGE };
