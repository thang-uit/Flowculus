import { formulaToText } from '@flowculus/formula-renderer';
import type { ProcessModel } from '@flowculus/process-model';
import {
  dedupeDiagnostics,
  validateModelStructure,
  validateProcessGraph,
  worstImpact,
  type Diagnostic,
} from '@flowculus/validation';

import { collectActivityTimes, collectOrDiagnostics } from './activity-diagnostics';
import { buildCapacity } from './capacity';
import { analyzeCriticalChain, type CriticalChainReport } from './critical-chain';
import { analyzeCriticalPath, type CriticalPathReport } from './critical-path';
import { computeCycleTimeEfficiency } from './cycle-time';
import { buildMetricFormula } from './formula';
import { isAnalysisOptions, type AnalysisOptions } from './options';
import { countProcessPaths } from './path-count';
import { computeMetricQuality, worstQuality, type AnalysisMetric } from './quality';
import { analyzeQueue } from './queue';
import { createEmptyAnalysisReport, invalidReport, type AnalysisReport } from './report';
import { getEdgeProbability, getReworkAdjustedReward, solveMetric } from './solver';
import { resolveBlockStructure } from './structure';

const finiteOrNull = (value: number | undefined): number | null =>
  value != null && Number.isFinite(value) ? value : null;

/**
 * Book-style flow analysis (Dumas et al., ch. 7) with explicit quality:
 * sequence = Σ, XOR = Σ p·CT, AND = max (elapsed) / Σ (cost), OR = expected
 * max over independent combinations, rework = T / (1 − r), CTE = TCT / CT.
 * Every assumption or unsupported construct is returned as a diagnostic, and
 * a number is withheld (null) when it cannot be computed analytically.
 */
export const analyzeProcess = (
  model: ProcessModel,
  options: AnalysisOptions = {},
): AnalysisReport => {
  if (!isAnalysisOptions(options)) {
    return invalidReport([
      { code: 'invalid-analysis-options', severity: 'error', impact: 'invalid' },
    ]);
  }
  const structureCheck = validateModelStructure(model);
  if (!structureCheck.model || structureCheck.diagnostics.length > 0) {
    return invalidReport(structureCheck.diagnostics);
  }
  if (Object.keys(model.nodes).length === 0) return createEmptyAnalysisReport();

  const { diagnostics: graphDiagnostics, graph, entry } = validateProcessGraph(model);
  const diagnostics: Diagnostic[] = [...graphDiagnostics];
  const activityTimes = collectActivityTimes(model, diagnostics);
  const startNodeId = entry.startNodeId;

  if (worstImpact(diagnostics.map((item) => item.impact)) === 'invalid') {
    return { ...invalidReport(dedupeDiagnostics(diagnostics)), activityTimes };
  }

  const pathCount = countProcessPaths(model, startNodeId ? { startNodeId } : {});
  if (startNodeId == null) {
    return {
      ...invalidReport(dedupeDiagnostics(diagnostics)),
      status: 'unsupported',
      activityTimes,
      pathCount,
      criticalPath: analyzeCriticalPath(model, { graph, startNodeId: null }),
    };
  }

  const structure = resolveBlockStructure(model, graph, startNodeId);
  diagnostics.push(
    ...structure.diagnostics,
    ...collectOrDiagnostics(
      model,
      structure,
      (id) => graph.outgoing.get(id)?.length ?? 0,
    ),
  );

  const cycle = solveMetric(model, graph, 'cycle', structure);
  const theoretical = solveMetric(model, graph, 'theoretical', structure);
  const cost = solveMetric(model, graph, 'cost', structure);
  const rawCycleTime = cycle.values.get(startNodeId);
  const rawTheoretical = theoretical.values.get(startNodeId);
  const rawCost = cost.values.get(startNodeId);
  const converged =
    cycle.converged &&
    theoretical.converged &&
    cost.converged &&
    [rawCycleTime, rawTheoretical, rawCost].every(
      (value) => value != null && Number.isFinite(value),
    );
  const knownBlocker = diagnostics.some(
    (item) =>
      item.impact === 'simulation-required' && (item.scope ?? 'model') === 'model',
  );
  if (!converged && !knownBlocker) {
    diagnostics.push({
      code: 'did-not-converge',
      severity: 'warning',
      impact: 'simulation-required',
      params: { iterations: Math.max(cycle.iterations, theoretical.iterations) },
    });
  }

  const cte = computeCycleTimeEfficiency(
    finiteOrNull(rawTheoretical),
    finiteOrNull(rawCycleTime),
  );
  if (cte.status === 'undefined' && cte.reason === 'zero-cycle-time') {
    diagnostics.push({
      code: 'cycle-time-zero',
      severity: 'info',
      impact: 'none',
      scope: 'efficiency',
    });
  } else if (cte.status === 'out-of-range') {
    diagnostics.push({
      code: 'cte-out-of-range',
      severity: 'warning',
      impact: 'simulation-required',
      scope: 'efficiency',
      params: { ratio: Number(cte.ratio.toFixed(4)) },
    });
  }

  const capacity = buildCapacity(
    model,
    graph,
    structure,
    startNodeId,
    options,
    diagnostics,
  );
  const criticalPath = analyzeCriticalPath(model, { graph, startNodeId });
  if (criticalPath.status === 'ready' && criticalPath.estimatedTaskIds.length > 0) {
    diagnostics.push({
      code: 'cpm-duration-estimate',
      severity: 'info',
      impact: 'assumption',
      scope: 'critical-path',
      params: {
        count: criticalPath.estimatedTaskIds.length,
        labels: criticalPath.estimatedTaskIds
          .map((id) => model.nodes[id]?.label ?? id)
          .join(', '),
      },
    });
  }

  let littleLaw: AnalysisReport['littleLaw'];
  if (options.arrivalRatePerHour != null && options.workInProcess != null) {
    if (options.arrivalRatePerHour > 0) {
      littleLaw = {
        arrivalRatePerHour: options.arrivalRatePerHour,
        workInProcess: options.workInProcess,
        cycleTimeHours: options.workInProcess / options.arrivalRatePerHour,
      };
    } else {
      diagnostics.push({
        code: 'little-law-zero-arrival',
        severity: 'warning',
        impact: 'none',
        scope: 'queue',
      });
    }
  }
  const queue =
    options.arrivalRatePerHour != null && options.serviceRatePerHour != null
      ? analyzeQueue({
          arrivalRatePerHour: options.arrivalRatePerHour,
          serviceRatePerServerPerHour: options.serviceRatePerHour,
          servers: options.servers,
        })
      : undefined;
  if (queue) diagnostics.push(...queue.issues);

  const issues = dedupeDiagnostics(diagnostics);
  const metricQuality = computeMetricQuality(issues);
  const headline = worstQuality(
    metricQuality.cycleTime,
    metricQuality.theoreticalCycleTime,
  );
  const withheld = (metric: AnalysisMetric, value: number | undefined) =>
    metricQuality[metric] === 'simulation-required' ? null : finiteOrNull(value);
  const cycleTimeMinutes = withheld('cycleTime', rawCycleTime);

  const formulas: Pick<
    AnalysisReport,
    | 'formula'
    | 'formulaAst'
    | 'theoreticalFormula'
    | 'theoreticalFormulaAst'
    | 'costFormula'
    | 'costFormulaAst'
  > = { formula: '' };
  if (headline !== 'simulation-required') {
    formulas.formulaAst = buildMetricFormula(
      model,
      graph,
      'cycle',
      structure,
      startNodeId,
    );
    formulas.formula = formulaToText(formulas.formulaAst);
    formulas.theoreticalFormulaAst = buildMetricFormula(
      model,
      graph,
      'theoretical',
      structure,
      startNodeId,
    );
    formulas.theoreticalFormula = formulaToText(formulas.theoreticalFormulaAst);
    if (metricQuality.cost !== 'simulation-required') {
      formulas.costFormulaAst = buildMetricFormula(
        model,
        graph,
        'cost',
        structure,
        startNodeId,
      );
      formulas.costFormula = formulaToText(formulas.costFormulaAst);
    }
  }

  const criticalPathReport: CriticalPathReport =
    criticalPath.status !== 'ready'
      ? criticalPath
      : headline === 'simulation-required'
        ? {
            ...criticalPath,
            status: 'unavailable',
            quality: 'simulation-required',
            durationMinutes: null,
            reason: 'unsupported-structure',
          }
        : { ...criticalPath, quality: worstQuality(criticalPath.quality, headline) };

  const criticalChain: CriticalChainReport = analyzeCriticalChain({
    model,
    graph,
    startNodeId,
    remainingMinutes: cycle.values,
    elapsedMinutes: (node) => getReworkAdjustedReward(node, 'cycle'),
    edgeProbability: getEdgeProbability,
    cycleTimeQuality: metricQuality.cycleTime,
  });

  return {
    status: headline === 'simulation-required' ? 'unsupported' : 'ready',
    quality: headline,
    metricQuality,
    cycleTimeMinutes,
    theoreticalCycleTimeMinutes: withheld('theoreticalCycleTime', rawTheoretical),
    cycleTimeEfficiency:
      metricQuality.cycleTimeEfficiency !== 'simulation-required' &&
      cte.status === 'ready'
        ? cte.ratio
        : null,
    costPerExecution: withheld('cost', rawCost),
    ...formulas,
    issues,
    startNodeId,
    activityTimes,
    solver: {
      converged,
      cycleIterations: cycle.iterations,
      theoreticalIterations: theoretical.iterations,
      costIterations: cost.iterations,
    },
    capacity,
    pathCount,
    criticalPath: criticalPathReport,
    criticalChain,
    littleLaw,
    littleLawForecast:
      options.arrivalRatePerHour != null &&
      options.arrivalRatePerHour > 0 &&
      cycleTimeMinutes != null
        ? {
            arrivalRatePerHour: options.arrivalRatePerHour,
            cycleTimeHours: cycleTimeMinutes / 60,
            workInProcess: options.arrivalRatePerHour * (cycleTimeMinutes / 60),
            quality: metricQuality.cycleTime,
          }
        : undefined,
    queue,
  };
};
