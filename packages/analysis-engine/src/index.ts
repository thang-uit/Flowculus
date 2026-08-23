import type { FormulaNode } from '@flowculus/formula-renderer';
import { formulaToText } from '@flowculus/formula-renderer';
import type {
  GatewayKind,
  ProcessEdge,
  ProcessModel,
  ProcessNode,
} from '@flowculus/process-model';
import { isSequenceFlowEdge } from '@flowculus/process-model';
import { validateProcessModel } from '@flowculus/validation';

import { analyzeCriticalPath, type CriticalPathReport } from './critical-path';
import { countProcessPaths, type PathCountReport } from './path-count';

export {
  analyzeCriticalPath,
  type CriticalPathReport,
  type CriticalPathStatus,
  type CriticalPathUnavailableReason,
} from './critical-path';

export {
  countProcessPaths,
  type PathCountOptions,
  type PathCountReport,
  type PathCountStatus,
} from './path-count';

export type AnalysisStatus = 'ready' | 'invalid' | 'unsupported';
export type CalculationQuality = 'exact' | 'assumption' | 'simulation-required';

export interface AnalysisOptions {
  arrivalRatePerHour?: number;
  workInProcess?: number;
  workingHoursPerDay?: number;
  serviceRatePerHour?: number;
  servers?: number;
  resourceCounts?: Record<string, number>;
}

/**
 * Keeps values coming from local storage/imports safe before they reach the
 * calculation engine. The engine still validates the process graph itself;
 * this guard is intentionally small and dependency-free so it can be reused
 * by browser boundaries without pulling UI code into the domain package.
 */
export const isAnalysisOptions = (value: unknown): value is AnalysisOptions => {
  if (value == null || typeof value !== 'object') return false;
  const options = value as AnalysisOptions;
  const isNonNegative = (candidate: unknown): candidate is number =>
    candidate == null ||
    (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0);

  if (!isNonNegative(options.arrivalRatePerHour)) return false;
  if (!isNonNegative(options.workInProcess)) return false;
  if (
    options.workingHoursPerDay != null &&
    (!Number.isFinite(options.workingHoursPerDay) || options.workingHoursPerDay <= 0)
  ) {
    return false;
  }
  if (
    options.serviceRatePerHour != null &&
    (!Number.isFinite(options.serviceRatePerHour) || options.serviceRatePerHour <= 0)
  ) {
    return false;
  }
  if (
    options.servers != null &&
    (!Number.isInteger(options.servers) || options.servers < 1)
  ) {
    return false;
  }
  if (options.resourceCounts == null) return true;
  if (typeof options.resourceCounts !== 'object') return false;
  return Object.values(options.resourceCounts).every(
    (count) => Number.isInteger(count) && count > 0,
  );
};

export interface CapacityReport {
  resourcePoolId: string;
  unitLoadMinutes: number;
  resourceCount: number | null;
  capacityPerDay: number | null;
  utilization: number | null;
  isBottleneck: boolean;
}

export interface AnalysisReport {
  status: AnalysisStatus;
  quality: CalculationQuality;
  cycleTimeMinutes: number | null;
  theoreticalCycleTimeMinutes: number | null;
  cycleTimeEfficiency: number | null;
  costPerExecution: number | null;
  formula: string;
  formulaAst?: FormulaNode;
  theoreticalFormula?: string;
  theoreticalFormulaAst?: FormulaNode;
  costFormula?: string;
  costFormulaAst?: FormulaNode;
  assumptions: string[];
  warnings: string[];
  diagnostics: string[];
  capacity: CapacityReport[];
  pathCount?: PathCountReport;
  criticalPath?: CriticalPathReport;
  littleLaw?: {
    arrivalRatePerHour: number;
    workInProcess: number;
    cycleTimeHours: number;
  };
  queue?: QueueAnalysisReport;
}

type Metric = 'cycle' | 'theoretical' | 'cost' | 'unitLoad';

interface MetricValues {
  values: Map<string, number>;
  converged: boolean;
  iterations: number;
}

const EPSILON = 1e-9;
const MAX_ITERATIONS = 10_000;
const MAX_REASONABLE_VALUE = 1e12;

const literal = (value: string): FormulaNode => ({ kind: 'literal', value });

const weightedFormula = (probability: number, term: FormulaNode): FormulaNode =>
  Math.abs(probability - 1) < EPSILON
    ? term
    : {
        kind: 'weighted',
        probability: literal(formatNumber(probability)),
        term,
      };

const sumFormula = (terms: FormulaNode[]): FormulaNode => {
  const meaningfulTerms = terms.filter(
    (term) => term.kind !== 'literal' || !/^0(?:\.0+)?$/.test(term.value),
  );

  if (meaningfulTerms.length === 0) return literal('0');
  if (meaningfulTerms.length === 1) return meaningfulTerms[0];
  return { kind: 'sum', terms: meaningfulTerms };
};

const getOutgoingEdges = (model: ProcessModel, nodeId: string): ProcessEdge[] =>
  Object.values(model.edges).filter(
    (edge) => edge.source === nodeId && isSequenceFlowEdge(edge),
  );

const getIncomingCount = (model: ProcessModel, nodeId: string): number =>
  Object.values(model.edges).filter(
    (edge) => edge.target === nodeId && isSequenceFlowEdge(edge),
  ).length;

const getNodeReward = (
  node: ProcessNode,
  metric: Metric,
  resourcePoolId?: string,
): number => {
  if (metric === 'cost') {
    const processingMinutes = node.processingMinutes ?? node.durationMinutes ?? 0;
    const resourceRate = node.cost?.resourceRatePerHour ?? 0;
    return (
      (processingMinutes / 60) * resourceRate + (node.cost?.otherCostPerExecution ?? 0)
    );
  }

  if (metric === 'unitLoad') {
    return node.cost?.resourcePoolId === resourcePoolId
      ? (node.processingMinutes ?? node.durationMinutes ?? 0)
      : 0;
  }
  if (metric === 'theoretical')
    return node.processingMinutes ?? node.durationMinutes ?? 0;
  if (node.durationMinutes != null) return node.durationMinutes;
  if (node.processingMinutes != null || node.waitingMinutes != null) {
    return (node.processingMinutes ?? 0) + (node.waitingMinutes ?? 0);
  }
  return 0;
};

const getEdgeProbability = (edge: ProcessEdge, edges: ProcessEdge[]): number => {
  if (typeof edge.probability === 'number') return edge.probability;
  return edges.length === 1 ? 1 : 0;
};

const getGatewayKind = (node: ProcessNode): GatewayKind | null =>
  node.kind === 'gateway' ? (node.gatewayKind ?? null) : null;

interface BranchCombination {
  probability: number;
  edges: ProcessEdge[];
}

interface FlowStructure {
  joinBySplitId: Map<string, string>;
}

const pushUnique = (items: string[], message: string): void => {
  if (!items.includes(message)) items.push(message);
};

const getShortestDistances = (
  startNodeId: string,
  adjacency: Map<string, string[]>,
): Map<string, number> => {
  const distances = new Map<string, number>([[startNodeId, 0]]);
  const queue = [startNodeId];

  for (let index = 0; index < queue.length; index += 1) {
    const nodeId = queue[index];
    const distance = distances.get(nodeId) ?? 0;
    for (const targetId of adjacency.get(nodeId) ?? []) {
      if (distances.has(targetId)) continue;
      distances.set(targetId, distance + 1);
      queue.push(targetId);
    }
  }

  return distances;
};

/**
 * Finds the nearest merge node shared by every outgoing branch. Flow analysis
 * only treats it as a block boundary when the candidate has multiple incoming
 * flows, which prevents an arbitrary later node from becoming a false join.
 */
const createFlowStructure = (model: ProcessModel): FlowStructure => {
  const adjacency = new Map<string, string[]>();
  const incomingCounts = new Map<string, number>();
  for (const nodeId of Object.keys(model.nodes)) adjacency.set(nodeId, []);
  for (const edge of Object.values(model.edges)) {
    if (!isSequenceFlowEdge(edge)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  }

  const joinBySplitId = new Map<string, string>();
  for (const node of Object.values(model.nodes)) {
    const targets = adjacency.get(node.id) ?? [];
    if (targets.length < 2) continue;
    const distancesByBranch = targets.map((targetId) =>
      getShortestDistances(targetId, adjacency),
    );
    const candidates = [...distancesByBranch[0].keys()].filter(
      (candidateId) =>
        candidateId !== node.id &&
        (incomingCounts.get(candidateId) ?? 0) > 1 &&
        distancesByBranch.every((distances) => distances.has(candidateId)),
    );
    const nearestJoin = candidates.sort((left, right) => {
      const leftDistances = distancesByBranch.map(
        (distances) => distances.get(left) ?? Number.POSITIVE_INFINITY,
      );
      const rightDistances = distancesByBranch.map(
        (distances) => distances.get(right) ?? Number.POSITIVE_INFINITY,
      );
      const maxDifference = Math.max(...leftDistances) - Math.max(...rightDistances);
      if (maxDifference !== 0) return maxDifference;
      return (
        leftDistances.reduce((sum, value) => sum + value, 0) -
        rightDistances.reduce((sum, value) => sum + value, 0)
      );
    })[0];
    if (nearestJoin) joinBySplitId.set(node.id, nearestJoin);
  }

  return { joinBySplitId };
};

const enumerateOrBranches = (edges: ProcessEdge[]): BranchCombination[] | null => {
  if (edges.length > 12 || edges.some((edge) => edge.probability == null)) return null;

  const combinations: BranchCombination[] = [];
  const limit = 1 << edges.length;

  for (let mask = 0; mask < limit; mask += 1) {
    const selected: ProcessEdge[] = [];
    let probability = 1;

    edges.forEach((edge, index) => {
      const selectedBranch = (mask & (1 << index)) !== 0;
      const branchProbability = edge.probability ?? 0;
      probability *= selectedBranch ? branchProbability : 1 - branchProbability;
      if (selectedBranch) selected.push(edge);
    });

    if (selected.length > 0 && probability > EPSILON) {
      combinations.push({ probability, edges: selected });
    }
  }

  const total = combinations.reduce((sum, item) => sum + item.probability, 0);
  if (total <= EPSILON) return null;

  return combinations.map((item) => ({
    probability: item.probability / total,
    edges: item.edges,
  }));
};

const combineBranches = (
  node: ProcessNode,
  edges: ProcessEdge[],
  values: Map<string, number>,
  metric: Metric,
  warnings: string[],
  structure: FlowStructure,
): number => {
  if (edges.length === 0) return 0;

  const kind = getGatewayKind(node);
  const branchValues = edges.map((edge) => values.get(edge.target) ?? 0);
  const joinId = structure.joinBySplitId.get(node.id);
  const sharedContinuation = joinId ? (values.get(joinId) ?? 0) : 0;

  if (kind === 'and') {
    return metric === 'cycle' || metric === 'theoretical'
      ? Math.max(...branchValues)
      : branchValues.reduce((sum, value) => sum + value, 0) -
          Math.max(0, branchValues.length - 1) * sharedContinuation;
  }

  if (kind === 'or') {
    const combinations = enumerateOrBranches(edges);
    if (!combinations) {
      pushUnique(
        warnings,
        `OR gateway ${node.label} has too many or incomplete branch probabilities; simulation is recommended.`,
      );
      return Number.NaN;
    }

    return combinations.reduce((total, combination) => {
      const selectedValues = combination.edges.map(
        (edge) => values.get(edge.target) ?? 0,
      );
      const branchValue =
        metric === 'cycle' || metric === 'theoretical'
          ? Math.max(...selectedValues)
          : selectedValues.reduce((sum, value) => sum + value, 0) -
            Math.max(0, selectedValues.length - 1) * sharedContinuation;
      return total + combination.probability * branchValue;
    }, 0);
  }

  if (
    kind === 'complex' ||
    kind === 'eventBased' ||
    (kind === null && edges.length > 1)
  ) {
    pushUnique(
      warnings,
      `Gateway ${node.label} needs an explicit block type before exact flow analysis can be trusted.`,
    );
    return Number.NaN;
  }

  const probabilities = edges.map((edge) => getEdgeProbability(edge, edges));
  return probabilities.reduce(
    (total, probability, index) => total + probability * branchValues[index],
    0,
  );
};

const valuesHaveInvalidNumber = (values: Map<string, number>): boolean =>
  [...values.values()].some((value) => !Number.isFinite(value));

const valuesExceedLimit = (values: Map<string, number>): boolean =>
  [...values.values()].some((value) => Math.abs(value) > MAX_REASONABLE_VALUE);

const solveMetric = (
  model: ProcessModel,
  metric: Metric,
  warnings: string[],
  structure: FlowStructure,
  resourcePoolId?: string,
): MetricValues => {
  const values = new Map<string, number>(Object.keys(model.nodes).map((id) => [id, 0]));
  let converged = false;
  let iterations = 0;

  for (iterations = 1; iterations <= MAX_ITERATIONS; iterations += 1) {
    const next = new Map<string, number>();
    let maxDelta = 0;

    for (const node of Object.values(model.nodes)) {
      const outgoing = getOutgoingEdges(model, node.id);
      const continuation = combineBranches(
        node,
        outgoing,
        values,
        metric,
        warnings,
        structure,
      );
      const reworkProbability = node.reworkProbability ?? 0;
      const reward = getNodeReward(node, metric, resourcePoolId);
      const nextValue = Number.isNaN(continuation)
        ? Number.NaN
        : reward / (1 - reworkProbability) + continuation;

      next.set(node.id, nextValue);
      const previous = values.get(node.id) ?? 0;
      if (Number.isFinite(nextValue))
        maxDelta = Math.max(maxDelta, Math.abs(nextValue - previous));
    }

    values.clear();
    next.forEach((value, key) => values.set(key, value));

    if (valuesHaveInvalidNumber(values) || valuesExceedLimit(values)) break;
    if (maxDelta < EPSILON) {
      converged = true;
      break;
    }
  }

  return { values, converged, iterations };
};

const formatNumber = (value: number, decimals = 4): string => {
  if (!Number.isFinite(value)) return 'undefined';
  return Number(value.toFixed(decimals)).toString();
};

const subtractSharedContinuation = (
  total: FormulaNode,
  duplicateCount: number,
  joinId: string | undefined,
  model: ProcessModel,
  metric: Metric,
  visited: Set<string>,
  warnings: string[],
  structure: FlowStructure,
  resourcePoolId?: string,
): FormulaNode => {
  if (!joinId || duplicateCount <= 0) return total;
  const shared = buildFormula(
    model,
    joinId,
    metric,
    visited,
    warnings,
    structure,
    resourcePoolId,
  );
  return {
    kind: 'difference',
    minuend: total,
    subtrahend:
      duplicateCount === 1
        ? shared
        : {
            kind: 'product',
            factors: [literal(String(duplicateCount)), shared],
          },
  };
};

const buildFormula = (
  model: ProcessModel,
  nodeId: string,
  metric: Metric,
  visited: Set<string>,
  warnings: string[],
  structure: FlowStructure,
  resourcePoolId?: string,
): FormulaNode => {
  const node = model.nodes[nodeId];
  if (!node) return literal(`missing(${nodeId})`);
  if (visited.has(nodeId)) {
    pushUnique(
      warnings,
      `Cycle detected at ${node.label}; the numeric result uses fixed-point iteration.`,
    );
    return literal(`E_${node.id}`);
  }

  const nextVisited = new Set(visited).add(nodeId);
  const local = getNodeReward(node, metric, resourcePoolId);
  const localFormula =
    local === 0 ? null : literal(formatNumber(local, metric === 'cost' ? 2 : 4));
  const outgoing = getOutgoingEdges(model, node.id);

  if (outgoing.length === 0) return localFormula ?? literal('0');

  const branchFormulas = outgoing.map((edge) =>
    buildFormula(
      model,
      edge.target,
      metric,
      nextVisited,
      warnings,
      structure,
      resourcePoolId,
    ),
  );
  const gatewayKind = getGatewayKind(node);
  let continuation: FormulaNode;

  if (gatewayKind === 'and') {
    continuation =
      metric === 'cycle' || metric === 'theoretical'
        ? { kind: 'maximum', terms: branchFormulas }
        : subtractSharedContinuation(
            sumFormula(branchFormulas),
            branchFormulas.length - 1,
            structure.joinBySplitId.get(node.id),
            model,
            metric,
            nextVisited,
            warnings,
            structure,
            resourcePoolId,
          );
  } else if (gatewayKind === 'or') {
    const combinations = enumerateOrBranches(outgoing);
    continuation = combinations
      ? sumFormula(
          combinations.map((combination) => {
            const selectedFormulas = combination.edges.map(
              (edge) => branchFormulas[outgoing.indexOf(edge)],
            );
            const combined =
              metric === 'cycle' || metric === 'theoretical'
                ? ({ kind: 'maximum', terms: selectedFormulas } as FormulaNode)
                : subtractSharedContinuation(
                    sumFormula(selectedFormulas),
                    selectedFormulas.length - 1,
                    structure.joinBySplitId.get(node.id),
                    model,
                    metric,
                    nextVisited,
                    warnings,
                    structure,
                    resourcePoolId,
                  );
            return weightedFormula(combination.probability, combined);
          }),
        )
      : literal(`unsupported(${node.id})`);
  } else if (gatewayKind === 'complex' || gatewayKind === 'eventBased') {
    continuation = literal(`unsupported(${node.id})`);
  } else {
    continuation = sumFormula(
      branchFormulas.map((term, index) =>
        weightedFormula(getEdgeProbability(outgoing[index], outgoing), term),
      ),
    );
  }

  const reworkProbability = node.reworkProbability;
  const localWithRework =
    localFormula &&
    typeof reworkProbability === 'number' &&
    reworkProbability > 0 &&
    reworkProbability < 1
      ? ({
          kind: 'fraction',
          numerator: localFormula,
          denominator: literal(`1 - ${formatNumber(reworkProbability)}`),
        } as FormulaNode)
      : localFormula;
  return sumFormula([...(localWithRework ? [localWithRework] : []), continuation]);
};

const findStartNode = (model: ProcessModel): ProcessNode | null => {
  const explicit = Object.values(model.nodes).filter((node) => node.kind === 'start');
  if (explicit.length > 0) return explicit[0];
  return (
    Object.values(model.nodes).find((node) => getIncomingCount(model, node.id) === 0) ??
    null
  );
};

const collectTaskWarnings = (
  model: ProcessModel,
  warnings: string[],
  assumptions: string[],
) => {
  for (const node of Object.values(model.nodes)) {
    if (node.metadata?.['flowculus-inferred-kind'] === true) {
      pushUnique(
        assumptions,
        `Semantic type for ${node.label} was inferred from its draw.io shape and should be confirmed.`,
      );
    }
    if (node.metadata?.['flowculus-inferred-gateway-kind'] === true) {
      pushUnique(
        assumptions,
        `Gateway type for ${node.label} was inferred from its draw.io shape and should be confirmed.`,
      );
    }
    if (node.kind !== 'task' && node.kind !== 'subprocess') continue;
    if (
      node.durationMinutes == null &&
      node.processingMinutes == null &&
      node.waitingMinutes == null
    ) {
      pushUnique(warnings, `Task ${node.label} has no cycle time; 0 minutes was used.`);
    }
    if (node.processingMinutes == null) {
      pushUnique(
        assumptions,
        `Theoretical time for ${node.label} uses its cycle time because processing time is missing.`,
      );
    }
    if (node.cost == null) {
      pushUnique(
        warnings,
        `Task ${node.label} has no cost metadata; its cost contribution is 0.`,
      );
    }
  }
};

const collectGatewayAssumptions = (model: ProcessModel, assumptions: string[]): void => {
  for (const node of Object.values(model.nodes)) {
    if (node.kind !== 'gateway' || node.gatewayKind !== 'or') continue;
    const outgoingCount = getOutgoingEdges(model, node.id).length;
    if (outgoingCount < 2) continue;
    pushUnique(
      assumptions,
      `OR gateway ${node.label} assumes independent branch probabilities and excludes the empty selection.`,
    );
  }
};

/**
 * An edge-level rework probability is kept in the interchange schema for
 * round-tripping classroom files, but its loop body cannot be identified
 * safely from one edge alone. Do not silently drop it from a supposedly exact
 * result. A future block resolver can promote this case to the geometric
 * rework equation once the loop entry and exit are explicit.
 */
const collectUnsupportedEdgeRework = (
  model: ProcessModel,
  warnings: string[],
): boolean => {
  let found = false;
  for (const edge of Object.values(model.edges)) {
    if ((edge.reworkProbability ?? 0) <= 0) continue;
    found = true;
    pushUnique(
      warnings,
      `Edge ${edge.condition ?? edge.id} has an edge-level rework probability; identify the rework block explicitly or use simulation.`,
    );
  }
  return found;
};

const buildCapacity = (
  model: ProcessModel,
  options: AnalysisOptions,
  warnings: string[],
  assumptions: string[],
  startNodeId: string,
  structure: FlowStructure,
): CapacityReport[] => {
  const resourcePools = new Set<string>();
  for (const node of Object.values(model.nodes)) {
    const poolId = node.cost?.resourcePoolId;
    if (!poolId) continue;
    resourcePools.add(poolId);
  }

  if (resourcePools.size === 0) return [];
  const workingHours = options.workingHoursPerDay ?? 8;
  const arrivalRate = options.arrivalRatePerHour;

  const reports: CapacityReport[] = [...resourcePools].map((resourcePoolId) => {
    const unitLoadSolution = solveMetric(
      model,
      'unitLoad',
      warnings,
      structure,
      resourcePoolId,
    );
    const unitLoadMinutes = unitLoadSolution.values.get(startNodeId) ?? 0;
    const modelCount = Math.max(
      0,
      ...Object.values(model.nodes)
        .filter((node) => node.cost?.resourcePoolId === resourcePoolId)
        .map((node) => node.cost?.resourceCount ?? 0),
    );
    const configuredCount =
      options.resourceCounts?.[resourcePoolId] ??
      (modelCount > 0 ? modelCount : undefined);
    const resourceCount =
      configuredCount != null && Number.isFinite(configuredCount) && configuredCount > 0
        ? configuredCount
        : 1;
    if (configuredCount == null) {
      pushUnique(
        assumptions,
        `Capacity for ${resourcePoolId} assumes one resource because no pool size was provided.`,
      );
    }
    const capacityPerDay =
      unitLoadMinutes > 0 ? (resourceCount * workingHours * 60) / unitLoadMinutes : null;
    const utilization =
      arrivalRate != null && capacityPerDay != null
        ? (arrivalRate * workingHours) / capacityPerDay
        : null;
    if (utilization != null && utilization >= 1) {
      pushUnique(
        warnings,
        `Resource pool ${resourcePoolId} is at or above theoretical capacity.`,
      );
    }
    return {
      resourcePoolId,
      unitLoadMinutes,
      resourceCount,
      capacityPerDay,
      utilization,
      isBottleneck: false,
    };
  });

  const finiteCapacities = reports
    .map((report) => report.capacityPerDay)
    .filter(
      (capacity): capacity is number => capacity != null && Number.isFinite(capacity),
    );
  const minimumCapacity =
    finiteCapacities.length > 0 ? Math.min(...finiteCapacities) : null;
  if (minimumCapacity != null) {
    reports.forEach((report) => {
      report.isBottleneck =
        report.capacityPerDay != null &&
        Math.abs(report.capacityPerDay - minimumCapacity) < EPSILON;
    });
  }

  return reports;
};

export const createEmptyAnalysisReport = (): AnalysisReport => ({
  status: 'ready',
  quality: 'exact',
  cycleTimeMinutes: 0,
  theoreticalCycleTimeMinutes: 0,
  cycleTimeEfficiency: null,
  costPerExecution: 0,
  formula: formulaToText(literal('No activities yet')),
  theoreticalFormula: 'No activities yet',
  theoreticalFormulaAst: literal('No activities yet'),
  costFormula: 'No activities yet',
  costFormulaAst: literal('No activities yet'),
  assumptions: ['Add process nodes and connectors to begin analysis.'],
  warnings: [],
  diagnostics: [],
  capacity: [],
  pathCount: {
    status: 'empty',
    count: 0,
    endNodeIds: [],
    formula: 'P = 0',
  },
  criticalPath: {
    status: 'ready',
    durationMinutes: 0,
    taskIds: [],
    taskLabels: [],
    formula: '0 = 0',
  },
});

export const analyzeProcess = (
  model: ProcessModel,
  options: AnalysisOptions = {},
): AnalysisReport => {
  if (!isAnalysisOptions(options)) {
    return {
      status: 'invalid',
      quality: 'simulation-required',
      cycleTimeMinutes: null,
      theoreticalCycleTimeMinutes: null,
      cycleTimeEfficiency: null,
      costPerExecution: null,
      formula: formulaToText(literal('Analysis options are invalid')),
      assumptions: [],
      warnings: ['Analysis options contain invalid values.'],
      diagnostics: ['invalid_analysis_options'],
      capacity: [],
    };
  }

  const validation = validateProcessModel(model);

  if (!validation.valid) {
    return {
      status: 'invalid',
      quality: 'simulation-required',
      cycleTimeMinutes: null,
      theoreticalCycleTimeMinutes: null,
      cycleTimeEfficiency: null,
      costPerExecution: null,
      formula: formulaToText(literal('Model validation failed')),
      assumptions: [],
      warnings: validation.issues.map((issue) => issue.message),
      diagnostics: validation.issues.map((issue) => `${issue.code} at ${issue.path}`),
      capacity: [],
    };
  }

  if (Object.keys(model.nodes).length === 0) return createEmptyAnalysisReport();

  const warnings: string[] = [];
  const assumptions: string[] = [];
  const startNode = findStartNode(model);
  if (!startNode) {
    return {
      status: 'invalid',
      quality: 'simulation-required',
      cycleTimeMinutes: null,
      theoreticalCycleTimeMinutes: null,
      cycleTimeEfficiency: null,
      costPerExecution: null,
      formula: formulaToText(literal('No start event found')),
      assumptions,
      warnings: ['Add one start event or a node with no incoming connector.'],
      diagnostics: ['missing_start'],
      capacity: [],
    };
  }

  collectTaskWarnings(model, warnings, assumptions);
  collectGatewayAssumptions(model, assumptions);
  const hasUnsupportedEdgeRework = collectUnsupportedEdgeRework(model, warnings);
  const structure = createFlowStructure(model);
  const pathCount = countProcessPaths(model);
  const structuralWarningNodes = Object.values(model.nodes).filter(
    (node) =>
      node.kind === 'gateway' &&
      (node.gatewayKind === 'and' || node.gatewayKind === 'or') &&
      getOutgoingEdges(model, node.id).length > 1 &&
      !structure.joinBySplitId.has(node.id),
  );
  structuralWarningNodes.forEach((node) =>
    pushUnique(
      warnings,
      `${node.gatewayKind?.toUpperCase()} gateway ${node.label} has no common join; block flow analysis is not exact.`,
    ),
  );
  const inferredSemanticNodes = Object.values(model.nodes).filter(
    (node) =>
      node.metadata?.['flowculus-inferred-kind'] === true ||
      node.metadata?.['flowculus-inferred-gateway-kind'] === true,
  );
  const cycleSolution = solveMetric(model, 'cycle', warnings, structure);
  const theoreticalSolution = solveMetric(model, 'theoretical', warnings, structure);
  const costSolution = solveMetric(model, 'cost', warnings, structure);
  const cycleTimeMinutes = cycleSolution.values.get(startNode.id) ?? null;
  const theoreticalCycleTimeMinutes =
    theoreticalSolution.values.get(startNode.id) ?? null;
  const costPerExecution = costSolution.values.get(startNode.id) ?? null;
  const hasIndependentOrAssumption = Object.values(model.nodes).some(
    (node) =>
      node.kind === 'gateway' &&
      node.gatewayKind === 'or' &&
      getOutgoingEdges(model, node.id).length > 1,
  );
  const quality: CalculationQuality =
    cycleSolution.converged &&
    theoreticalSolution.converged &&
    costSolution.converged &&
    structuralWarningNodes.length === 0 &&
    !hasUnsupportedEdgeRework
      ? inferredSemanticNodes.length > 0 || hasIndependentOrAssumption
        ? 'assumption'
        : 'exact'
      : 'simulation-required';

  if (quality === 'simulation-required') {
    pushUnique(
      warnings,
      'The graph did not converge under the finite expected-value model. Use simulation for a dependable estimate.',
    );
  }
  if (inferredSemanticNodes.length > 0) {
    pushUnique(
      assumptions,
      'Some semantic types were inferred from native draw.io shapes; confirm them in Inspector before sharing an exact result.',
    );
  }

  const formulaWarnings: string[] = [];
  const formulaAst = buildFormula(
    model,
    startNode.id,
    'cycle',
    new Set(),
    formulaWarnings,
    structure,
  );
  const theoreticalFormulaAst = buildFormula(
    model,
    startNode.id,
    'theoretical',
    new Set(),
    formulaWarnings,
    structure,
  );
  const costFormulaAst = buildFormula(
    model,
    startNode.id,
    'cost',
    new Set(),
    formulaWarnings,
    structure,
  );
  formulaWarnings.forEach((warning) => {
    if (!warnings.includes(warning)) warnings.push(warning);
  });

  const cycleTimeEfficiency =
    cycleTimeMinutes != null &&
    cycleTimeMinutes > 0 &&
    theoreticalCycleTimeMinutes != null
      ? theoreticalCycleTimeMinutes / cycleTimeMinutes
      : null;
  const littleLaw =
    options.arrivalRatePerHour != null &&
    options.workInProcess != null &&
    options.arrivalRatePerHour > 0
      ? {
          arrivalRatePerHour: options.arrivalRatePerHour,
          workInProcess: options.workInProcess,
          cycleTimeHours: options.workInProcess / options.arrivalRatePerHour,
        }
      : undefined;
  if (options.arrivalRatePerHour === 0 && options.workInProcess != null) {
    pushUnique(
      warnings,
      "Little's Law needs an arrival rate greater than zero before WIP can be converted to cycle time.",
    );
  }
  const queue =
    options.arrivalRatePerHour != null && options.serviceRatePerHour != null
      ? analyzeQueue({
          arrivalRatePerHour: options.arrivalRatePerHour,
          serviceRatePerServerPerHour: options.serviceRatePerHour,
          servers: options.servers,
        })
      : undefined;
  if (queue?.status === 'unstable') {
    pushUnique(
      warnings,
      'The configured queue is unstable; use a higher service rate or more servers.',
    );
  }

  return {
    status: quality === 'simulation-required' ? 'unsupported' : 'ready',
    quality,
    cycleTimeMinutes,
    theoreticalCycleTimeMinutes,
    cycleTimeEfficiency,
    costPerExecution,
    formula: formulaToText(formulaAst),
    formulaAst,
    theoreticalFormula: formulaToText(theoreticalFormulaAst),
    theoreticalFormulaAst,
    costFormula: formulaToText(costFormulaAst),
    costFormulaAst,
    assumptions,
    warnings,
    diagnostics: [
      `Solved cycle values in ${cycleSolution.iterations} iteration(s).`,
      `Solved theoretical values in ${theoreticalSolution.iterations} iteration(s).`,
      `Solved cost values in ${costSolution.iterations} iteration(s).`,
    ],
    capacity: buildCapacity(
      model,
      options,
      warnings,
      assumptions,
      startNode.id,
      structure,
    ),
    pathCount,
    criticalPath: analyzeCriticalPath(model),
    littleLaw,
    queue,
  };
};

export interface QueueAnalysisInput {
  arrivalRatePerHour: number;
  serviceRatePerServerPerHour: number;
  servers?: number;
}

export interface QueueAnalysisReport {
  status: 'ready' | 'invalid' | 'unstable';
  model: 'M/M/1' | 'M/M/c';
  utilization: number | null;
  averageQueueLength: number | null;
  averageWaitingHours: number | null;
  averageSystemHours: number | null;
  averageSystemCount: number | null;
  formula: string;
  warnings: string[];
}

const factorial = (value: number): number => {
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
};

export const analyzeQueue = (input: QueueAnalysisInput): QueueAnalysisReport => {
  const servers = input.servers ?? 1;
  if (
    !Number.isFinite(input.arrivalRatePerHour) ||
    !Number.isFinite(input.serviceRatePerServerPerHour) ||
    input.arrivalRatePerHour < 0 ||
    input.serviceRatePerServerPerHour <= 0 ||
    !Number.isInteger(servers) ||
    servers < 1
  ) {
    return {
      status: 'invalid',
      model: servers === 1 ? 'M/M/1' : 'M/M/c',
      utilization: null,
      averageQueueLength: null,
      averageWaitingHours: null,
      averageSystemHours: null,
      averageSystemCount: null,
      formula: 'Invalid queue inputs',
      warnings: [
        'Arrival rate, service rate and server count must be valid positive values.',
      ],
    };
  }

  const utilization =
    input.arrivalRatePerHour / (servers * input.serviceRatePerServerPerHour);
  if (utilization >= 1) {
    return {
      status: 'unstable',
      model: servers === 1 ? 'M/M/1' : 'M/M/c',
      utilization,
      averageQueueLength: null,
      averageWaitingHours: null,
      averageSystemHours: null,
      averageSystemCount: null,
      formula: `ρ = λ / (${servers} × μ) = ${formatNumber(utilization)}`,
      warnings: [
        'Utilization is at or above 100%; the queue is mathematically unstable.',
      ],
    };
  }

  let averageQueueLength: number;
  if (servers === 1) {
    averageQueueLength = (utilization * utilization) / (1 - utilization);
  } else {
    const lambdaOverMu = input.arrivalRatePerHour / input.serviceRatePerServerPerHour;
    let denominator = 0;
    for (let index = 0; index < servers; index += 1) {
      denominator += lambdaOverMu ** index / factorial(index);
    }
    denominator += lambdaOverMu ** servers / (factorial(servers) * (1 - utilization));
    averageQueueLength =
      (lambdaOverMu ** servers * utilization) /
      (factorial(servers) * (1 - utilization) ** 2 * denominator);
  }

  const averageWaitingHours =
    input.arrivalRatePerHour === 0 ? 0 : averageQueueLength / input.arrivalRatePerHour;
  const averageSystemHours = averageWaitingHours + 1 / input.serviceRatePerServerPerHour;
  return {
    status: 'ready',
    model: servers === 1 ? 'M/M/1' : 'M/M/c',
    utilization,
    averageQueueLength,
    averageWaitingHours,
    averageSystemHours,
    averageSystemCount: input.arrivalRatePerHour * averageSystemHours,
    formula:
      servers === 1
        ? `Lq = ρ² / (1 - ρ), Wq = Lq / λ, W = Wq + 1 / μ`
        : `Lq = ((λ/μ)^c × ρ) / (c! × (1 - ρ)² × Σ)`,
    warnings: [],
  };
};
