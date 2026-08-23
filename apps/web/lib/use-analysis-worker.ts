'use client';

import { useEffect, useRef } from 'react';
import { analyzeProcess } from '@flowculus/analysis-engine';

import { useWorkspaceStore } from '@/lib/workspace-store';

interface AnalysisWorkerResponse {
  requestId: number;
  report?: ReturnType<typeof analyzeProcess>;
  error?: string;
}

/** Runs graph analysis off the main thread once the browser supports workers. */
export function useAnalysisWorker() {
  const processModel = useWorkspaceStore((state) => state.processModel);
  const analysisOptions = useWorkspaceStore((state) => state.analysisOptions);
  const setAnalysisReport = useWorkspaceStore((state) => state.setAnalysisReport);
  const setAnalysisStatus = useWorkspaceStore((state) => state.setAnalysisStatus);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setAnalysisStatus('fallback');
      return;
    }

    const worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), {
      type: 'module',
      name: 'flowculus-analysis',
    });
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
      if (event.data.requestId !== requestIdRef.current) return;
      if (event.data.report) {
        setAnalysisReport(event.data.report);
        setAnalysisStatus('ready');
      } else {
        setAnalysisStatus('error');
      }
    };
    const handleError = () => setAnalysisStatus('fallback');
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
      workerRef.current = null;
    };
  }, [setAnalysisReport, setAnalysisStatus]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setAnalysisStatus('calculating');

    const worker = workerRef.current;
    if (!worker) {
      // The synchronous fallback is only used by browsers that disable
      // workers. Normal desktop and mobile browsers stay off the UI thread.
      const timer = window.setTimeout(() => {
        try {
          setAnalysisReport(analyzeProcess(processModel, analysisOptions));
          setAnalysisStatus('ready');
        } catch {
          setAnalysisStatus('error');
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }

    worker.postMessage({ requestId, model: processModel, options: analysisOptions });
    return undefined;
  }, [analysisOptions, processModel, setAnalysisReport, setAnalysisStatus]);
}
