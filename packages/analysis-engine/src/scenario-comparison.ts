import { scopeProcessModel, type ProcessModel } from '@flowculus/process-model';
import type { AnalysisOptions } from './options';
import { analyzeProcess } from './analyze';
export function compareProcessScenarios(
  baseline: ProcessModel,
  candidate: ProcessModel,
  baselineOptions: AnalysisOptions = {},
  candidateOptions: AnalysisOptions = {},
) {
  const before = analyzeProcess(baseline, baselineOptions);
  const after = analyzeProcess(candidate, candidateOptions);
  const currency = (model: ProcessModel, options: AnalysisOptions) => {
    const scope = scopeProcessModel(model, options.processPoolId);
    if (!scope) return null;
    const values = new Set(
      Object.values(scope.nodes)
        .map((node) => node.cost?.currency)
        .filter((value) => value != null),
    );
    // Never add unlike monetary units, even when both scenarios mix the same set.
    return values.size > 1 ? null : ([...values][0] ?? '');
  };
  const baselineCurrency = currency(baseline, baselineOptions);
  const candidateCurrency = currency(candidate, candidateOptions);
  const costComparable =
    baselineCurrency !== null &&
    candidateCurrency !== null &&
    baselineCurrency === candidateCurrency;
  const metrics = (
    [
      'cycleTimeMinutes',
      'theoreticalCycleTimeMinutes',
      'cycleTimeEfficiency',
      'costPerExecution',
    ] as const
  ).map((metric) => {
    const a = before[metric];
    const b = after[metric];
    return {
      metric,
      baseline: metric === 'costPerExecution' && !costComparable ? null : a,
      candidate: metric === 'costPerExecution' && !costComparable ? null : b,
      relativeChange:
        a != null &&
        b != null &&
        a !== 0 &&
        (metric !== 'costPerExecution' || costComparable)
          ? (b - a) / Math.abs(a)
          : null,
    };
  });
  return {
    method: 'analytical-scenario-comparison-v1',
    costComparable,
    baseline: {
      id: baseline.id,
      name: baseline.name,
      quality: before.quality,
      status: before.status,
      options: baselineOptions,
    },
    candidate: {
      id: candidate.id,
      name: candidate.name,
      quality: after.quality,
      status: after.status,
      options: candidateOptions,
    },
    metrics,
  };
}
