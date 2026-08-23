import { analyzeProcess, type AnalysisOptions } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

interface AnalysisRequest {
  requestId: number;
  model: ProcessModel;
  options?: AnalysisOptions;
}

interface AnalysisResponse {
  requestId: number;
  report?: ReturnType<typeof analyzeProcess>;
  error?: string;
}

const workerScope = globalThis as typeof globalThis & {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage: (message: AnalysisResponse) => void;
};

workerScope.onmessage = (event) => {
  const { requestId, model, options } = event.data;
  try {
    workerScope.postMessage({ requestId, report: analyzeProcess(model, options) });
  } catch (error) {
    workerScope.postMessage({
      requestId,
      error: error instanceof Error ? error.message : 'Analysis failed.',
    });
  }
};

export {};
