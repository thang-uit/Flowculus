import {
  compareProcessScenarios,
  type AnalysisOptions,
} from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
const workerScope = self as unknown as {
  onmessage:
    | ((
        event: MessageEvent<{
          before: ProcessModel;
          after: ProcessModel;
          beforeOptions: AnalysisOptions;
          afterOptions: AnalysisOptions;
        }>,
      ) => void)
    | null;
  postMessage: (response: unknown) => void;
};
workerScope.onmessage = ({ data }) => {
  try {
    workerScope.postMessage({
      ok: true,
      result: compareProcessScenarios(
        data.before,
        data.after,
        data.beforeOptions,
        data.afterOptions,
      ),
    });
  } catch {
    workerScope.postMessage({ ok: false });
  }
};
