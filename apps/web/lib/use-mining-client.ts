'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  createMiningSession,
  type MiningRequest,
  type MiningResponse,
} from '@/lib/mining-engine';

type MiningReply =
  | { requestId: number; ok: true; response: MiningResponse }
  | { requestId: number; ok: false; error: string };

interface PendingRequest {
  resolve: (response: MiningResponse) => void;
  reject: (error: Error) => void;
  timer: number;
}

/** Why a request ended without a response; the UI maps it to a message. */
export type MiningAbortReason = 'cancelled' | 'timeout' | 'worker-restarted';

export class MiningAbortError extends Error {
  readonly reason: MiningAbortReason;

  constructor(reason: MiningAbortReason) {
    super(reason);
    this.name = 'MiningAbortError';
    this.reason = reason;
  }
}

/** Parsing a very large log may be slow, but not this slow. */
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RESTARTS = 2;

export interface MiningClient {
  request: (request: MiningRequest) => Promise<MiningResponse>;
  /**
   * Stops the running request by terminating the worker. The worker holds the
   * loaded log, so the caller must reload the source afterwards.
   */
  cancel: () => void;
}

/**
 * Promise-based access to the process-mining worker. Parsing and discovery on
 * thousands of events never run on the UI thread. Requests time out, can be
 * cancelled, and a crashed worker is restarted a bounded number of times
 * before the same session code runs on the main thread instead.
 */
export function useMiningClient(): MiningClient {
  const workerRef = useRef<Worker | null>(null);
  const fallbackRef = useRef<ReturnType<typeof createMiningSession> | null>(null);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const requestIdRef = useRef(0);
  const restartsRef = useRef(0);
  const disposedRef = useRef(false);
  // Lets the worker's error handler start its replacement without the
  // callback referring to itself.
  const startWorkerRef = useRef<() => Worker | null>(() => null);

  const rejectAll = useCallback((reason: MiningAbortReason) => {
    const pending = pendingRef.current;
    pending.forEach((entry) => {
      window.clearTimeout(entry.timer);
      entry.reject(new MiningAbortError(reason));
    });
    pending.clear();
  }, []);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const startWorker = useCallback((): Worker | null => {
    if (typeof Worker === 'undefined' || disposedRef.current) return null;
    try {
      const worker = new Worker(new URL('../workers/mining.worker.ts', import.meta.url), {
        type: 'module',
        name: 'flowculus-mining',
      });
      worker.addEventListener('message', (event: MessageEvent<MiningReply>) => {
        if (worker !== workerRef.current) return;
        const entry = pendingRef.current.get(event.data.requestId);
        if (!entry) return;
        pendingRef.current.delete(event.data.requestId);
        window.clearTimeout(entry.timer);
        restartsRef.current = 0;
        if (event.data.ok) entry.resolve(event.data.response);
        else entry.reject(new Error(event.data.error));
      });
      worker.addEventListener('error', () => {
        if (worker !== workerRef.current) return;
        stopWorker();
        rejectAll('worker-restarted');
        if (restartsRef.current >= MAX_RESTARTS) {
          // Keep the view usable if the worker cannot run (for example a CSP).
          fallbackRef.current = createMiningSession();
          return;
        }
        restartsRef.current += 1;
        workerRef.current = startWorkerRef.current();
      });
      return worker;
    } catch {
      return null;
    }
  }, [rejectAll, stopWorker]);

  useEffect(() => {
    startWorkerRef.current = startWorker;
    disposedRef.current = false;
    workerRef.current = startWorker();
    if (!workerRef.current) fallbackRef.current = createMiningSession();
    return () => {
      disposedRef.current = true;
      stopWorker();
      rejectAll('cancelled');
      fallbackRef.current = null;
    };
  }, [rejectAll, startWorker, stopWorker]);

  const request = useCallback(
    (miningRequest: MiningRequest): Promise<MiningResponse> => {
      const fallback = fallbackRef.current;
      const worker = workerRef.current ?? (fallback ? null : startWorker());
      if (!worker) {
        const session = fallback ?? (fallbackRef.current = createMiningSession());
        return new Promise((resolve, reject) => {
          window.setTimeout(() => {
            try {
              resolve(session(miningRequest));
            } catch (error) {
              reject(
                error instanceof Error ? error : new Error('Process mining failed.'),
              );
            }
          }, 0);
        });
      }
      workerRef.current = worker;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          // A runaway parse is cancelled by terminating the worker.
          stopWorker();
          rejectAll('timeout');
        }, REQUEST_TIMEOUT_MS);
        pendingRef.current.set(requestId, { resolve, reject, timer });
        worker.postMessage({ requestId, request: miningRequest });
      });
    },
    [rejectAll, startWorker, stopWorker],
  );

  const cancel = useCallback(() => {
    if (pendingRef.current.size === 0) return;
    stopWorker();
    rejectAll('cancelled');
  }, [rejectAll, stopWorker]);

  return useMemo(() => ({ request, cancel }), [cancel, request]);
}
