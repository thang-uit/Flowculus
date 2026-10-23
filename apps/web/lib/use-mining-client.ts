'use client';

import { useCallback, useEffect, useRef } from 'react';

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
}

/**
 * Promise-based access to the process-mining worker. Parsing and discovery on
 * thousands of events never run on the UI thread; browsers that block module
 * workers fall back to the same session code after a macrotask.
 */
export function useMiningClient() {
  const workerRef = useRef<Worker | null>(null);
  const fallbackRef = useRef<ReturnType<typeof createMiningSession> | null>(null);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const requestIdRef = useRef(0);

  useEffect(() => {
    const pending = pendingRef.current;
    if (typeof Worker === 'undefined') {
      fallbackRef.current = createMiningSession();
      return () => {
        fallbackRef.current = null;
      };
    }
    const worker = new Worker(new URL('../workers/mining.worker.ts', import.meta.url), {
      type: 'module',
      name: 'flowculus-mining',
    });
    workerRef.current = worker;
    const handleMessage = (event: MessageEvent<MiningReply>) => {
      const entry = pending.get(event.data.requestId);
      if (!entry) return;
      pending.delete(event.data.requestId);
      if (event.data.ok) entry.resolve(event.data.response);
      else entry.reject(new Error(event.data.error));
    };
    const handleError = () => {
      // Keep the view usable if the worker cannot boot (for example a CSP).
      fallbackRef.current = createMiningSession();
      pending.forEach((entry) => entry.reject(new Error('worker-unavailable')));
      pending.clear();
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
      workerRef.current = null;
      pending.forEach((entry) => entry.reject(new Error('cancelled')));
      pending.clear();
    };
  }, []);

  return useCallback((request: MiningRequest): Promise<MiningResponse> => {
    const fallback = fallbackRef.current;
    const worker = workerRef.current;
    if (fallback || !worker) {
      const session = fallback ?? (fallbackRef.current = createMiningSession());
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          try {
            resolve(session(request));
          } catch (error) {
            reject(error instanceof Error ? error : new Error('Process mining failed.'));
          }
        }, 0);
      });
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    return new Promise((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject });
      worker.postMessage({ requestId, request });
    });
  }, []);
}
