import type { ProcessEdge, ProcessModel, ProcessNode } from '@flowculus/process-model';
import { getOutgoing, type SequenceGraph } from '@flowculus/validation';

import { resolveActivityTime } from './cycle-time';
import type { BlockStructure } from './structure';

export type Metric = 'cycle' | 'theoretical' | 'cost' | 'unitLoad';

export const EPSILON = 1e-9;
const MAX_ITERATIONS = 10_000;
const MAX_REASONABLE_VALUE = 1e12;
/** Inclusive OR enumerates 2^n − 1 combinations; beyond this it is unbounded. */
export const MAX_OR_BRANCHES = 12;

export interface MetricSolution {
  values: Map<string, number>;
  converged: boolean;
  iterations: number;
}

/** Local contribution of one execution of a node, before rework repetition. */
export const getNodeReward = (
  node: ProcessNode,
  metric: Metric,
  resourcePoolId?: string,
): number => {
  const time = resolveActivityTime(node);
  switch (metric) {
    case 'cycle':
      return time.cycleTimeMinutes;
    case 'theoretical':
      return time.processingMinutes;
    case 'cost':
      return (
        (time.processingMinutes / 60) * (node.cost?.resourceRatePerHour ?? 0) +
        (node.cost?.otherCostPerExecution ?? 0)
      );
    case 'unitLoad':
      return node.cost?.resourcePoolId === resourcePoolId ? time.processingMinutes : 0;
  }
};

/** Expected elapsed time of a node including its rework repetitions. */
export const getReworkAdjustedReward = (node: ProcessNode, metric: Metric): number => {
  const reward = getNodeReward(node, metric);
  const rework = node.reworkProbability ?? 0;
  return rework > 0 && rework < 1 ? reward / (1 - rework) : reward;
};

export const getEdgeProbability = (
  edge: ProcessEdge,
  siblings: ProcessEdge[],
): number => {
  if (typeof edge.probability === 'number') return edge.probability;
  return siblings.length === 1 ? 1 : 0;
};

export interface BranchCombination {
  probability: number;
  edges: ProcessEdge[];
}

/**
 * Inclusive OR under the independent-branch assumption: every non-empty
 * subset of branches, weighted by Π p_i × Π (1 − p_j), renormalised to
 * exclude the empty selection (BPMN requires at least one branch).
 */
export const enumerateOrBranches = (edges: ProcessEdge[]): BranchCombination[] | null => {
  if (edges.length > MAX_OR_BRANCHES || edges.some((edge) => edge.probability == null)) {
    return null;
  }
  const combinations: BranchCombination[] = [];
  const limit = 1 << edges.length;
  for (let mask = 1; mask < limit; mask += 1) {
    const selected: ProcessEdge[] = [];
    let probability = 1;
    edges.forEach((edge, index) => {
      const chosen = (mask & (1 << index)) !== 0;
      const branchProbability = edge.probability ?? 0;
      probability *= chosen ? branchProbability : 1 - branchProbability;
      if (chosen) selected.push(edge);
    });
    if (probability > EPSILON) combinations.push({ probability, edges: selected });
  }
  const total = combinations.reduce((sum, item) => sum + item.probability, 0);
  if (total <= EPSILON) return null;
  return combinations.map((item) => ({
    probability: item.probability / total,
    edges: item.edges,
  }));
};

const isElapsed = (metric: Metric): boolean =>
  metric === 'cycle' || metric === 'theoretical';

/**
 * Parallel branches: elapsed metrics take the longest branch (max), additive
 * metrics (cost, unit load) add every branch and count the shared
 * continuation after the join only once.
 */
const combineParallel = (
  branchValues: number[],
  metric: Metric,
  sharedContinuation: number,
): number =>
  isElapsed(metric)
    ? Math.max(...branchValues)
    : branchValues.reduce((sum, value) => sum + value, 0) -
      Math.max(0, branchValues.length - 1) * sharedContinuation;

const combineBranches = (
  node: ProcessNode,
  edges: ProcessEdge[],
  values: Map<string, number>,
  metric: Metric,
  structure: BlockStructure,
): number => {
  if (edges.length === 0) return 0;
  const branchValues = edges.map((edge) => values.get(edge.target) ?? 0);
  if (edges.length === 1) return branchValues[0];

  if (node.kind !== 'gateway') return Number.NaN;
  const kind = node.gatewayKind ?? 'xor';
  if (kind === 'and' || kind === 'or') {
    if (!structure.joinBySplitId.has(node.id)) return Number.NaN;
    const join = structure.joinBySplitId.get(node.id);
    const shared = join ? (values.get(join) ?? 0) : 0;
    if (kind === 'and') return combineParallel(branchValues, metric, shared);
    const combinations = enumerateOrBranches(edges);
    if (!combinations) return Number.NaN;
    return combinations.reduce((total, combination) => {
      const selected = combination.edges.map((edge) => values.get(edge.target) ?? 0);
      return total + combination.probability * combineParallel(selected, metric, shared);
    }, 0);
  }
  if (kind === 'xor') {
    return edges.reduce(
      (total, edge, index) =>
        total + getEdgeProbability(edge, edges) * branchValues[index],
      0,
    );
  }
  return Number.NaN;
};

/**
 * Expected remaining value from every node, solved by fixed-point iteration
 * V(n) = r(n) / (1 − rework(n)) + combine(successors). For XOR-only loops
 * this is the absorbing Markov chain solution; it converges whenever the
 * process terminates with probability 1.
 */
export const solveMetric = (
  model: ProcessModel,
  graph: SequenceGraph,
  metric: Metric,
  structure: BlockStructure,
  resourcePoolId?: string,
): MetricSolution => {
  const nodes = graph.nodeIds
    .map((id) => model.nodes[id])
    .filter((node): node is ProcessNode => node != null);
  const values = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  let converged = false;
  let iterations = 0;

  for (iterations = 1; iterations <= MAX_ITERATIONS; iterations += 1) {
    const next = new Map<string, number>();
    let maxDelta = 0;
    for (const node of nodes) {
      const continuation = combineBranches(
        node,
        getOutgoing(graph, node.id),
        values,
        metric,
        structure,
      );
      const rework = node.reworkProbability ?? 0;
      const reward = getNodeReward(node, metric, resourcePoolId);
      const value = Number.isNaN(continuation)
        ? Number.NaN
        : reward / (1 - rework) + continuation;
      next.set(node.id, value);
      if (Number.isFinite(value)) {
        maxDelta = Math.max(maxDelta, Math.abs(value - (values.get(node.id) ?? 0)));
      }
    }
    next.forEach((value, key) => values.set(key, value));
    const invalid = [...values.values()].some(
      (value) => !Number.isFinite(value) || Math.abs(value) > MAX_REASONABLE_VALUE,
    );
    if (invalid) break;
    if (maxDelta < EPSILON) {
      converged = true;
      break;
    }
  }
  return { values, converged, iterations };
};
