import {
  isActivityKind,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';
import { getOutgoing, type SequenceGraph } from '@flowculus/validation';

import type { CalculationQuality } from './quality';

/**
 * - `deterministic`: no decision and no loop on the chain; it is the longest
 *   path over expected elapsed time (T + Wq, rework-adjusted).
 * - `expected-time-heuristic`: the chain crosses a decision or a loop. At an
 *   XOR/OR split it follows the branch with the largest
 *   `probability × remaining expected time`. This is a heuristic that
 *   explains which branch dominates the expectation; it is neither the most
 *   likely route nor a CPM critical path.
 */
export type CriticalChainBasis = 'deterministic' | 'expected-time-heuristic';

export type CriticalChainUnavailableReason = 'missing-start' | 'no-analytic-result';

export interface CriticalChainReport {
  status: 'ready' | 'unavailable';
  quality: CalculationQuality;
  basis: CriticalChainBasis;
  nodeIds: string[];
  edgeIds: string[];
  taskIds: string[];
  taskLabels: string[];
  /** Sum of expected elapsed time along the chain. */
  durationMinutes: number | null;
  formula: string;
  reason?: CriticalChainUnavailableReason;
}

export interface CriticalChainInput {
  model: ProcessModel;
  graph: SequenceGraph;
  startNodeId: string | null;
  /** Expected remaining cycle time from each node (fixed-point solution). */
  remainingMinutes: Map<string, number>;
  /** Expected elapsed time of the node itself, rework included. */
  elapsedMinutes: (node: ProcessNode) => number;
  edgeProbability: (edge: ProcessEdge, siblings: ProcessEdge[]) => number;
  /** Quality of the cycle-time result the chain explains. */
  cycleTimeQuality: CalculationQuality;
}

export const unavailableCriticalChain = (
  reason: CriticalChainUnavailableReason,
): CriticalChainReport => ({
  status: 'unavailable',
  quality: 'simulation-required',
  basis: 'expected-time-heuristic',
  nodeIds: [],
  edgeIds: [],
  taskIds: [],
  taskLabels: [],
  durationMinutes: null,
  formula: '',
  reason,
});

const format = (value: number): string => Number(value.toFixed(2)).toString();

/**
 * The chain of activities that drives the expected cycle time. Its quality is
 * never better than the cycle-time result itself, so a canvas highlight can
 * never look more certain than the number it explains.
 */
export const analyzeCriticalChain = ({
  model,
  graph,
  startNodeId,
  remainingMinutes,
  elapsedMinutes,
  edgeProbability,
  cycleTimeQuality,
}: CriticalChainInput): CriticalChainReport => {
  if (startNodeId == null || !model.nodes[startNodeId]) {
    return unavailableCriticalChain('missing-start');
  }
  if (
    cycleTimeQuality === 'simulation-required' ||
    [...remainingMinutes.values()].some((value) => !Number.isFinite(value))
  ) {
    return unavailableCriticalChain('no-analytic-result');
  }

  const nodeIds: string[] = [startNodeId];
  const edgeIds: string[] = [];
  const visited = new Set(nodeIds);
  let basis: CriticalChainBasis = 'deterministic';
  let current = startNodeId;

  while (true) {
    const node = model.nodes[current];
    const candidates = getOutgoing(graph, current);
    if (!node || candidates.length === 0) break;
    const open = candidates.filter((edge) => !visited.has(edge.target));
    if (open.length < candidates.length) basis = 'expected-time-heuristic';
    if (open.length === 0) break;
    const isParallel = node.kind === 'gateway' && node.gatewayKind === 'and';
    if (!isParallel && candidates.length > 1) basis = 'expected-time-heuristic';
    const score = (edge: ProcessEdge) => {
      const remaining = remainingMinutes.get(edge.target) ?? 0;
      return isParallel || candidates.length === 1
        ? remaining
        : edgeProbability(edge, candidates) * remaining;
    };
    const next = [...open].sort(
      (left, right) =>
        score(right) - score(left) ||
        edgeProbability(right, candidates) - edgeProbability(left, candidates),
    )[0];
    edgeIds.push(next.id);
    nodeIds.push(next.target);
    visited.add(next.target);
    current = next.target;
  }

  const chainNodes = nodeIds
    .map((id) => model.nodes[id])
    .filter((node): node is ProcessNode => node != null);
  const tasks = chainNodes.filter((node) => isActivityKind(node.kind));
  const terms = chainNodes.map(elapsedMinutes).filter((value) => value > 0);
  const durationMinutes = terms.reduce((sum, value) => sum + value, 0);
  const ownQuality: CalculationQuality =
    basis === 'deterministic' ? 'exact' : 'assumption';

  return {
    status: 'ready',
    quality:
      ownQuality === 'exact' && cycleTimeQuality === 'exact' ? 'exact' : 'assumption',
    basis,
    nodeIds,
    edgeIds,
    taskIds: tasks.map((node) => node.id),
    taskLabels: tasks.map((node) => node.label),
    durationMinutes,
    formula: `${terms.map(format).join(' + ') || '0'} = ${format(durationMinutes)}`,
  };
};
