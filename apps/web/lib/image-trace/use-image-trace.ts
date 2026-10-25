'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TraceResult } from './trace-model';
import {
  MAX_IMAGE_PIXELS,
  validateTraceFile,
  validTraceCrop,
  type TraceCrop,
} from './file-validation';

const TIMEOUT_MS = 45_000;

interface TraceState {
  stage: string;
  result: TraceResult | null;
  error: string | null;
  dimensions: { width: number; height: number } | null;
}

/** Each scan owns one worker; cancel/timeout terminate OpenCV immediately. */
export function useImageTrace() {
  const [state, setState] = useState<TraceState>({
    stage: 'idle',
    result: null,
    error: null,
    dimensions: null,
  });
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const [source, setSource] = useState<Blob | null>(null);
  const cancel = useCallback(() => {
    requestRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setState((current) => ({ ...current, stage: 'idle' }));
  }, []);
  const reset = useCallback(() => {
    cancel();
    setSource(null);
    setState({ stage: 'idle', result: null, error: null, dimensions: null });
  }, [cancel]);
  useEffect(
    () => () => {
      requestRef.current += 1;
      workerRef.current?.terminate();
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const scan = useCallback(
    async (file: File, crop: TraceCrop, photo: Blob = file) => {
      cancel();
      setSource(photo);
      const id = ++requestRef.current;
      const invalid =
        validateTraceFile(file) ?? (validTraceCrop(crop) ? null : 'invalid-dimensions');
      if (invalid) {
        setState({ stage: 'error', result: null, error: invalid, dimensions: null });
        return;
      }
      setState({ stage: 'decode', result: null, error: null, dimensions: null });
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        if (id === requestRef.current)
          setState({
            stage: 'error',
            result: null,
            error: 'decode-failed',
            dimensions: null,
          });
        return;
      }
      if (id !== requestRef.current) {
        bitmap.close();
        return;
      }
      if (
        bitmap.width < 32 ||
        bitmap.height < 32 ||
        bitmap.width * bitmap.height > MAX_IMAGE_PIXELS
      ) {
        bitmap.close();
        setState({
          stage: 'error',
          result: null,
          error: 'invalid-dimensions',
          dimensions: null,
        });
        return;
      }
      const dimensions = { width: bitmap.width, height: bitmap.height };
      setState({ stage: 'loading', result: null, error: null, dimensions });
      try {
        const worker = new Worker(
          new URL('../../workers/image-trace.worker.ts', import.meta.url),
          { type: 'module', name: 'flowculus-image-trace' },
        );
        workerRef.current = worker;
        worker.onmessage = (
          event: MessageEvent<{
            id: number;
            stage: string;
            result?: TraceResult;
            error?: string;
          }>,
        ) => {
          if (id !== requestRef.current || event.data.id !== id) return;
          if (event.data.stage === 'done' || event.data.stage === 'error') {
            worker.terminate();
            workerRef.current = null;
            if (timerRef.current != null) window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setState({
            stage: event.data.stage,
            result: event.data.result ?? null,
            error: event.data.error ?? null,
            dimensions,
          });
        };
        const fail = () => {
          if (id !== requestRef.current) return;
          worker.terminate();
          workerRef.current = null;
          if (timerRef.current != null) window.clearTimeout(timerRef.current);
          timerRef.current = null;
          setState({ stage: 'error', result: null, error: 'worker-failed', dimensions });
        };
        worker.onerror = fail;
        worker.onmessageerror = fail;
        timerRef.current = window.setTimeout(() => {
          if (id !== requestRef.current) return;
          worker.terminate();
          workerRef.current = null;
          timerRef.current = null;
          setState({ stage: 'error', result: null, error: 'timeout', dimensions });
        }, TIMEOUT_MS);
        worker.postMessage({ id, bitmap, crop }, [bitmap]);
      } catch {
        workerRef.current?.terminate();
        workerRef.current = null;
        if (timerRef.current != null) window.clearTimeout(timerRef.current);
        timerRef.current = null;
        bitmap.close();
        if (id === requestRef.current)
          setState({ stage: 'error', result: null, error: 'worker-failed', dimensions });
      }
    },
    [cancel],
  );
  return { ...state, source, scan, cancel, reset };
}
