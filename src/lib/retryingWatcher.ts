export interface WatchRuntime {
  now: () => number;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timer: number) => void;
  isVisible: () => boolean;
  addDocumentListener: (event: 'visibilitychange', listener: () => void) => void;
  removeDocumentListener: (event: 'visibilitychange', listener: () => void) => void;
  addWindowListener: (event: 'focus' | 'online', listener: () => void) => void;
  removeWindowListener: (event: 'focus' | 'online', listener: () => void) => void;
}

interface RetryingWatcherOptions<T> {
  publicationAt: number;
  retryDelays: readonly number[];
  maxTimerDelay: number;
  attempt: (signal: AbortSignal) => Promise<T | null>;
  onResult: (result: T) => void;
  onUnavailable?: (now: number, publicationAt: number) => void;
  runtime?: WatchRuntime;
}

function browserRuntime(): WatchRuntime {
  return {
    now: Date.now,
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: (timer) => window.clearTimeout(timer),
    isVisible: () => document.visibilityState === 'visible',
    addDocumentListener: (event, listener) => document.addEventListener(event, listener),
    removeDocumentListener: (event, listener) => document.removeEventListener(event, listener),
    addWindowListener: (event, listener) => window.addEventListener(event, listener),
    removeWindowListener: (event, listener) => window.removeEventListener(event, listener),
  };
}

export function watchRetryingResource<T>({
  publicationAt,
  retryDelays,
  maxTimerDelay,
  attempt,
  onResult,
  onUnavailable,
  runtime = browserRuntime(),
}: RetryingWatcherOptions<T>): () => void {
  const controller = new AbortController();
  let timer: number | undefined;
  let nextAttemptAt: number | undefined;
  let retryAttempt = 0;
  let requestInFlight = false;
  let completed = false;

  const clearTimer = (): void => {
    if (timer !== undefined) runtime.clearTimeout(timer);
    timer = undefined;
    nextAttemptAt = undefined;
  };

  const schedule = (delay: number): void => {
    clearTimer();
    const boundedDelay = Math.min(Math.max(delay, 0), maxTimerDelay);
    nextAttemptAt = runtime.now() + boundedDelay;
    timer = runtime.setTimeout(() => void run(), boundedDelay);
  };

  const scheduleNextAttempt = (): void => {
    const untilPublication = publicationAt - runtime.now();
    if (untilPublication > 0) {
      schedule(untilPublication);
      return;
    }
    const delay = retryDelays[Math.min(retryAttempt, retryDelays.length - 1)] ?? maxTimerDelay;
    retryAttempt += 1;
    schedule(delay);
  };

  const run = async (): Promise<void> => {
    if (controller.signal.aborted || completed || requestInFlight) return;
    clearTimer();
    requestInFlight = true;
    try {
      const result = await attempt(controller.signal);
      if (controller.signal.aborted || completed) return;
      if (result) {
        completed = true;
        retryAttempt = 0;
        onResult(result);
        return;
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    } finally {
      requestInFlight = false;
    }

    if (!controller.signal.aborted && !completed) {
      onUnavailable?.(runtime.now(), publicationAt);
      scheduleNextAttempt();
    }
  };

  const recover = (): void => {
    if (!runtime.isVisible() || controller.signal.aborted || completed || requestInFlight) return;
    if (nextAttemptAt === undefined || runtime.now() >= nextAttemptAt) void run();
  };

  runtime.addDocumentListener('visibilitychange', recover);
  runtime.addWindowListener('focus', recover);
  runtime.addWindowListener('online', recover);
  void run();

  return () => {
    controller.abort();
    completed = true;
    clearTimer();
    runtime.removeDocumentListener('visibilitychange', recover);
    runtime.removeWindowListener('focus', recover);
    runtime.removeWindowListener('online', recover);
  };
}
