/**
 * Supervises one "latest request wins" web worker (the analysis worker).
 *
 * - Cancellation: a worker cannot be interrupted in place, so a request that
 *   has been running for `cancelAfterMs` when a newer one arrives is cancelled
 *   by terminating the worker and starting a fresh one. Shorter computations
 *   finish and their stale result is ignored (cheaper than a worker reboot).
 * - Timeout: a request running longer than `timeoutMs` is cancelled and
 *   reported through `onTimeout`; it is not retried, because the same input
 *   would time out again.
 * - Bounded retry: a crashed worker is restarted and the latest request is
 *   re-sent, at most `maxRestarts` times in a row. After that `onFailure` is
 *   called once and `request` returns false so the caller can fall back.
 */

export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
}

export interface SupervisorOptions<Payload, Response extends { requestId: number }> {
  create: () => WorkerLike;
  timeoutMs: number;
  cancelAfterMs: number;
  maxRestarts: number;
  onResponse: (response: Response) => void;
  onRestart?: (attempt: number) => void;
  onTimeout?: (payload: Payload) => void;
  onFailure?: (payload: Payload | null) => void;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface WorkerSupervisor<Payload> {
  /** False when the worker is unavailable; the caller should fall back. */
  request: (payload: Payload) => boolean;
  dispose: () => void;
  readonly available: boolean;
}

export function createWorkerSupervisor<
  Payload extends object,
  Response extends { requestId: number },
>(options: SupervisorOptions<Payload, Response>): WorkerSupervisor<Payload> {
  const now = options.now ?? (() => Date.now());
  const setTimer =
    options.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer =
    options.clearTimer ??
    ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let worker: WorkerLike | null = null;
  let pending: { id: number; payload: Payload; startedAt: number } | null = null;
  let nextId = 0;
  let consecutiveRestarts = 0;
  let timer: unknown = null;
  let failed = false;
  let disposed = false;

  const stopTimer = () => {
    if (timer != null) clearTimer(timer);
    timer = null;
  };

  const stopWorker = () => {
    stopTimer();
    worker?.terminate();
    worker = null;
  };

  const fail = () => {
    stopWorker();
    failed = true;
    const payload = pending?.payload ?? null;
    pending = null;
    options.onFailure?.(payload);
  };

  const spawn = (): boolean => {
    try {
      const instance = options.create();
      instance.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as Response | undefined;
        if (instance !== worker || !pending) return;
        if (data?.requestId !== pending.id) return;
        stopTimer();
        pending = null;
        consecutiveRestarts = 0;
        options.onResponse(data);
      });
      instance.addEventListener('error', () => {
        if (instance === worker) recover();
      });
      worker = instance;
      return true;
    } catch {
      return false;
    }
  };

  const dispatch = () => {
    if (!worker || !pending) return;
    pending.startedAt = now();
    worker.postMessage({ requestId: pending.id, ...pending.payload });
    stopTimer();
    const { id, payload } = pending;
    timer = setTimer(() => {
      if (pending?.id !== id) return;
      // Cancel the runaway computation; the next request gets a fresh worker.
      stopWorker();
      pending = null;
      options.onTimeout?.(payload);
    }, options.timeoutMs);
  };

  function recover() {
    stopWorker();
    if (disposed) return;
    if (consecutiveRestarts >= options.maxRestarts) {
      fail();
      return;
    }
    consecutiveRestarts += 1;
    options.onRestart?.(consecutiveRestarts);
    if (!spawn()) {
      fail();
      return;
    }
    dispatch();
  }

  return {
    get available() {
      return !failed && !disposed;
    },
    request(payload) {
      if (failed || disposed) return false;
      const running = pending;
      pending = { id: ++nextId, payload, startedAt: now() };
      if (worker && running && now() - running.startedAt >= options.cancelAfterMs) {
        stopWorker();
      }
      if (!worker && !spawn()) {
        failed = true;
        pending = null;
        return false;
      }
      dispatch();
      return true;
    },
    dispose() {
      disposed = true;
      pending = null;
      stopWorker();
    },
  };
}
