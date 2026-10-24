import type { ProcessModel } from '@flowculus/process-model';
import type { Diagnostic, SequenceGraph } from '@flowculus/validation';

import type { AnalysisOptions } from './options';
import { analyzeQueue, type QueueAnalysisReport } from './queue';
import { EPSILON, solveMetric } from './solver';
import type { BlockStructure } from './structure';

export interface CapacityReport {
  resourcePoolId: string;
  /** Expected processing minutes the pool spends per case (unit load). */
  unitLoadMinutes: number;
  resourceCount: number;
  /** Cases per working day the pool can complete. */
  capacityPerDay: number | null;
  /** Ratio in [0, ∞); ≥ 1 means demand exceeds capacity. */
  utilization: number | null;
  isBottleneck: boolean;
  /**
   * M/M/c view when an arrival rate is known: the pool's expected work per
   * case is treated as one exponential service with μ = 60 / unit load.
   */
  queue?: QueueAnalysisReport;
}

const DEFAULT_WORKING_HOURS = 8;

/**
 * Theoretical capacity per resource pool (book: unit load and capacity
 * analysis). The bottleneck is the pool with the smallest capacity.
 */
export const buildCapacity = (
  model: ProcessModel,
  graph: SequenceGraph,
  structure: BlockStructure,
  startNodeId: string,
  options: AnalysisOptions,
  diagnostics: Diagnostic[],
): CapacityReport[] => {
  const pools = new Set<string>();
  Object.values(model.nodes).forEach((node) => {
    if (node.cost?.resourcePoolId) pools.add(node.cost.resourcePoolId);
  });
  if (pools.size === 0) return [];
  const workingHours = options.workingHoursPerDay ?? DEFAULT_WORKING_HOURS;
  const arrivalRate = options.arrivalRatePerHour;

  const reports: CapacityReport[] = [...pools].map((resourcePoolId) => {
    const solution = solveMetric(model, graph, 'unitLoad', structure, resourcePoolId);
    const unitLoadMinutes = solution.values.get(startNodeId) ?? 0;
    const modelCount = Math.max(
      0,
      ...Object.values(model.nodes)
        .filter((node) => node.cost?.resourcePoolId === resourcePoolId)
        .map((node) => node.cost?.resourceCount ?? 0),
    );
    const configured =
      options.resourceCounts?.[resourcePoolId] ??
      (modelCount > 0 ? modelCount : undefined);
    const resourceCount =
      configured != null && Number.isFinite(configured) && configured > 0
        ? configured
        : 1;
    if (configured == null) {
      diagnostics.push({
        code: 'capacity-default-pool-size',
        severity: 'info',
        impact: 'assumption',
        scope: 'capacity',
        params: { poolId: resourcePoolId },
      });
    }
    const capacityPerDay =
      Number.isFinite(unitLoadMinutes) && unitLoadMinutes > 0
        ? (resourceCount * workingHours * 60) / unitLoadMinutes
        : null;
    const utilization =
      arrivalRate != null && capacityPerDay != null
        ? (arrivalRate * workingHours) / capacityPerDay
        : null;
    if (utilization != null && utilization >= 1) {
      diagnostics.push({
        code: 'capacity-over-utilized',
        severity: 'warning',
        impact: 'none',
        scope: 'capacity',
        params: { poolId: resourcePoolId, utilization: Number(utilization.toFixed(4)) },
      });
    }
    const queue =
      arrivalRate != null && arrivalRate > 0 && capacityPerDay != null
        ? analyzeQueue({
            arrivalRatePerHour: arrivalRate,
            serviceRatePerServerPerHour: 60 / unitLoadMinutes,
            servers: resourceCount,
          })
        : undefined;
    if (queue) {
      diagnostics.push({
        code: 'pool-queue-approximation',
        severity: 'info',
        impact: 'assumption',
        scope: 'capacity',
        params: { poolId: resourcePoolId },
      });
    }
    return {
      resourcePoolId,
      unitLoadMinutes,
      resourceCount,
      capacityPerDay,
      utilization,
      isBottleneck: false,
      queue,
    };
  });

  const capacities = reports
    .map((report) => report.capacityPerDay)
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (capacities.length > 0) {
    const minimum = Math.min(...capacities);
    reports.forEach((report) => {
      report.isBottleneck =
        report.capacityPerDay != null &&
        Math.abs(report.capacityPerDay - minimum) < EPSILON;
    });
  }
  return reports;
};
