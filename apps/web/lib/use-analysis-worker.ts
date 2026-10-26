'use client';

import { useEffect, useRef } from 'react';
import {
  analyzeProcess,
  type AnalysisOptions,
  type AnalysisReport,
} from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

import { createWorkerSupervisor, type WorkerSupervisor } from '@/lib/worker-supervisor';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface AnalysisPayload {
  model: ProcessModel;
  options: AnalysisOptions;
}

interface AnalysisWorkerResponse {
  requestId: number;
  report?: AnalysisReport;
  error?: string;
}

/** A request still running after this long is cancelled when a newer one arrives. */
const CANCEL_AFTER_MS = 750;
/** Larger OR fan-outs can be slow, but never this slow on a supported model. */
const TIMEOUT_MS = 20_000;
const MAX_RESTARTS = 2;

/**
 * Runs graph analysis off the main thread. The worker is supervised: stale
 * long computations are cancelled, a crash restarts it (bounded), a timeout is
 * reported, and only when the worker cannot run at all does the analysis fall
 * back to the main thread.
 */
export function useAnalysisWorker() {
  const processModel = useWorkspaceStore((state) => state.processModel);
  const analysisOptions = useWorkspaceStore((state) => state.analysisOptions);
  const setAnalysisReport = useWorkspaceStore((state) => state.setAnalysisReport);
  const setAnalysisStatus = useWorkspaceStore((state) => state.setAnalysisStatus);
  const latestPayload = useRef<AnalysisPayload | null>(null);
  const isCurrent = (payload: AnalysisPayload | null) => {
    const state = useWorkspaceStore.getState();
    return (
      payload &&
      state.processModel === payload.model &&
      state.analysisOptions === payload.options
    );
  };
  const supervisorRef = useRef<WorkerSupervisor<AnalysisPayload> | null>(null);

  useEffect(() => {
    if (typeof Worker === 'undefined') return undefined;
    const runOnMainThread = (payload: AnalysisPayload | null) => {
      if (!payload) return;
      window.setTimeout(() => {
        try {
          if (!isCurrent(payload)) return;
          setAnalysisReport(analyzeProcess(payload.model, payload.options));
          setAnalysisStatus('fallback');
        } catch {
          setAnalysisStatus('error');
        }
      }, 0);
    };
    const supervisor = createWorkerSupervisor<AnalysisPayload, AnalysisWorkerResponse>({
      create: () =>
        new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), {
          type: 'module',
          name: 'flowculus-analysis',
        }),
      timeoutMs: TIMEOUT_MS,
      cancelAfterMs: CANCEL_AFTER_MS,
      maxRestarts: MAX_RESTARTS,
      onResponse: (response) => {
        if (!isCurrent(latestPayload.current)) return;
        if (response.report) {
          setAnalysisReport(response.report);
          setAnalysisStatus('ready');
        } else {
          setAnalysisStatus('error');
        }
      },
      onRestart: () => setAnalysisStatus('restarting'),
      onTimeout: () => setAnalysisStatus('timeout'),
      onFailure: runOnMainThread,
    });
    supervisorRef.current = supervisor;
    return () => {
      supervisor.dispose();
      supervisorRef.current = null;
    };
  }, [setAnalysisReport, setAnalysisStatus]);

  useEffect(() => {
    setAnalysisStatus('calculating');
    const payload = { model: processModel, options: analysisOptions };
    latestPayload.current = payload;
    if (supervisorRef.current?.request(payload)) return undefined;

    // Browsers without (working) module workers compute on the main thread
    // after a macrotask so the edit that triggered it still paints first.
    const timer = window.setTimeout(() => {
      try {
        if (!isCurrent(payload)) return;
        setAnalysisReport(analyzeProcess(payload.model, payload.options));
        setAnalysisStatus('fallback');
      } catch {
        setAnalysisStatus('error');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [analysisOptions, processModel, setAnalysisReport, setAnalysisStatus]);
}
