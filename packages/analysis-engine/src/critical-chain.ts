import {
  isSequenceFlowEdge,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

export type CriticalChainBasis = 'deterministic' | 'dominant-branch';

/**
 * The chain of activities that drives the expected cycle time. Unlike the
 * book's CPM report (`criticalPath`), it is defined for every converged graph:
 * - AND splits follow the branch with the largest remaining expected time;
 * - XOR/OR/other decisions follow the branch with the largest weighted
 *   contribution p × CT, which is the branch that dominates the expectation.
 * A chain that crosses a decision or a loop is therefore labelled
 * `assumption`; only a decision-free acyclic chain is `exact` (and then its
 * duration equals CT).
 */
export interface CriticalChainReport {
  status: 'ready' | 'unavailable';
  quality: 'exact' | 'assumption';
  basis: CriticalChainBasis;
  nodeIds: string[];
  edgeIds: string[];
  taskIds: string[];
  taskLabels: string[];
  /** Sum of the expected elapsed time (T + Wq, rework-adjusted) along the chain. */
  durationMinutes: number | null;
  formula: string;
}

interface ChainInput {
  model: ProcessModel;
  startNodeId: string;
  /** Expected remaining cycle time from each node (fixed-point solution). */
  remainingMinutes: Map<string, number>;
  /** Expected elapsed time of the node itself, rework included. */
  elapsedMinutes: (node: ProcessNode) => number;
  edgeProbability: (edge: ProcessEdge, siblings: ProcessEdge[]) => number;
}

const unavailable = (): CriticalChainReport => ({
  status: 'unavailable',
  quality: 'assumption',
  basis: 'dominant-branch',
  nodeIds: [],
  edgeIds: [],
  taskIds: [],
  taskLabels: [],
  durationMinutes: null,
  formula: '',
});

const format = (value: number): string => Number(value.toFixed(2)).toString();

export const analyzeCriticalChain = ({
  model,
  startNodeId,
  remainingMinutes,
  elapsedMinutes,
  edgeProbability,
}: ChainInput): CriticalChainReport => {
  if (!model.nodes[startNodeId]) return unavailable();
  if ([...remainingMinutes.values()].some((value) => !Number.isFinite(value))) {
    return unavailable();
  }

  const outgoing = new Map<string, ProcessEdge[]>();
  Object.values(model.edges).forEach((edge) => {
    if (!isSequenceFlowEdge(edge) || !model.nodes[edge.target]) return;
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  });

  const nodeIds: string[] = [startNodeId];
  const edgeIds: string[] = [];
  const visited = new Set(nodeIds);
  let basis: CriticalChainBasis = 'deterministic';
  let current = startNodeId;

  while (true) {
    const node = model.nodes[current];
    const candidates = outgoing.get(current) ?? [];
    if (!node || candidates.length === 0) break;
    const open = candidates.filter((edge) => !visited.has(edge.target));
    if (open.length < candidates.length) basis = 'dominant-branch';
    if (open.length === 0) break;

    const isParallel = node.kind === 'gateway' && node.gatewayKind === 'and';
    const score = (edge: ProcessEdge) => {
      const remaining = remainingMinutes.get(edge.target) ?? 0;
      return isParallel || candidates.length === 1
        ? remaining
        : edgeProbability(edge, candidates) * remaining;
    };
    if (!isParallel && candidates.length > 1) basis = 'dominant-branch';
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

  const tasks = nodeIds
    .map((id) => model.nodes[id])
    .filter(
      (node): node is ProcessNode =>
        node != null && (node.kind === 'task' || node.kind === 'subprocess'),
    );
  const terms = nodeIds
    .map((id) => model.nodes[id])
    .filter((node): node is ProcessNode => node != null)
    .map((node) => elapsedMinutes(node))
    .filter((value) => value > 0);
  const durationMinutes = terms.reduce((sum, value) => sum + value, 0);

  return {
    status: 'ready',
    quality: basis === 'deterministic' ? 'exact' : 'assumption',
    basis,
    nodeIds,
    edgeIds,
    taskIds: tasks.map((node) => node.id),
    taskLabels: tasks.map((node) => node.label),
    durationMinutes,
    formula: `${terms.map(format).join(' + ') || '0'} = ${format(durationMinutes)}`,
  };
};
