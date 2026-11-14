export const SUBSCRIBE_URL = 'https://1023.digital/api/subscribe';
const TIMEOUT_MS = 25_000;
const DEFAULT_RETRY_MINUTES = 10;

export type SignupOutcome =
  | { result: 'received' | 'invalid' | 'challenge' | 'unavailable' }
  | { result: 'limited'; retryMinutes: number };

export type SignupResult = SignupOutcome['result'];

export interface SignupFields {
  email: string;
  name: string;
  website: string;
  turnstileToken: string;
}

export function subscribeRequest({ email, name, website, turnstileToken }: SignupFields): RequestInit {
  return {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, source: 'longmont-ai', website, turnstileToken }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
}

const RESPONSE_RESULTS: Readonly<Record<string, SignupResult>> = {
  '202 received': 'received',
  '400 invalid': 'invalid',
  '400 challenge_failed': 'challenge',
  '429 limited': 'limited',
};

function retryMinutes(header: string | null): number {
  if (!header || !/^\d+$/.test(header.trim())) return DEFAULT_RETRY_MINUTES;
  return Math.max(1, Math.ceil(Number(header) / 60));
}

async function readResultCode(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && 'result' in body ? body.result : undefined;
  } catch {
    return undefined;
  }
}

export async function readSubscribeResponse(response: Response): Promise<SignupOutcome> {
  const code = await readResultCode(response);
  const key = `${response.status} ${typeof code === 'string' ? code : ''}`;
  const result = Object.prototype.hasOwnProperty.call(RESPONSE_RESULTS, key) ? RESPONSE_RESULTS[key] : 'unavailable';
  return result === 'limited'
    ? { result, retryMinutes: retryMinutes(response.headers.get('Retry-After')) }
    : { result };
}

const MESSAGES: { [R in SignupResult]: (outcome: Extract<SignupOutcome, { result: R }>) => string } = {
  received: () => "You're almost in. Check your inbox in the next few minutes for a confirmation email.",
  invalid: () => 'Enter a valid email address.',
  challenge: () => 'Complete the human check and try again.',
  limited: ({ retryMinutes: minutes }) =>
    `Too many attempts. Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
  unavailable: () => 'Newsletter signup is temporarily unavailable.',
};

export function signupMessage(outcome: SignupOutcome): string {
  return (MESSAGES[outcome.result] as (outcome: SignupOutcome) => string)(outcome);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}
