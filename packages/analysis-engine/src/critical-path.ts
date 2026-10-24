import {
  isActivityKind,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';
import {
  buildSequenceGraph,
  getOutgoing,
  reachableFrom,
  resolveProcessEntry,
  type SequenceGraph,
} from '@flowculus/validation';

import { resolveActivityTime } from './cycle-time';
import type { CalculationQuality } from './quality';

export type CriticalPathStatus = 'ready' | 'unavailable';

export type CriticalPathUnavailableReason =
  'missing-start' | 'decision-gateway' | 'rework-or-cycle' | 'unsupported-structure';

/**
 * Critical Path Method (CPM) over processing times. It is defined for
 * decision-free, acyclic graphs: every path is executed, so the longest path
 * over T determines TCT. It is `exact` only when every activity on the graph
 * has a known processing time (explicit T, or D − Wq); otherwise the observed
 * cycle time D is used as an estimate of T and the result is an `assumption`.
 */
export interface CriticalPathReport {
  status: CriticalPathStatus;
  quality: CalculationQuality;
  durationMinutes: number | null;
  nodeIds: string[];
  edgeIds: string[];
  taskIds: string[];
  taskLabels: string[];
  /** Activities whose processing time was estimated from their cycle time. */
  estimatedTaskIds: string[];
  formula: string;
  reason?: CriticalPathUnavailableReason;
}

const unavailable = (reason: CriticalPathUnavailableReason): CriticalPathReport => ({
  status: 'unavailable',
  quality: 'simulation-required',
  durationMinutes: null,
  nodeIds: [],
  edgeIds: [],
  taskIds: [],
  taskLabels: [],
  estimatedTaskIds: [],
  formula: '',
  reason,
});

const formatDuration = (value: number): string => Number(value.toFixed(4)).toString();

const processingOf = (node: ProcessNode): number =>
  isActivityKind(node.kind) ? resolveActivityTime(node).processingMinutes : 0;

export interface CriticalPathInput {
  graph?: SequenceGraph;
  startNodeId?: string | null;
}

export const analyzeCriticalPath = (
  model: ProcessModel,
  input: CriticalPathInput = {},
): CriticalPathReport => {
  const graph = input.graph ?? buildSequenceGraph(model);
  if (graph.nodeIds.length === 0) {
    return {
      status: 'ready',
      quality: 'exact',
      durationMinutes: 0,
      nodeIds: [],
      edgeIds: [],
      taskIds: [],
      taskLabels: [],
      estimatedTaskIds: [],
      formula: '0 = 0',
    };
  }
  const startNodeId =
    input.startNodeId === undefined
      ? resolveProcessEntry(model, graph).startNodeId
      : input.startNodeId;
  if (startNodeId == null || !model.nodes[startNodeId])
    return unavailable('missing-start');

  const reachable = reachableFrom(graph, [startNodeId]);
  const reachableNodes = [...reachable]
    .map((id) => model.nodes[id])
    .filter((node): node is ProcessNode => node != null);

  const hasDecision = reachableNodes.some(
    (node) =>
      getOutgoing(graph, node.id).length > 1 &&
      !(node.kind === 'gateway' && node.gatewayKind === 'and'),
  );
  if (hasDecision) return unavailable('decision-gateway');
  if (reachableNodes.some((node) => (node.reworkProbability ?? 0) > 0)) {
    return unavailable('rework-or-cycle');
  }

  const indegree = new Map<string, number>(reachableNodes.map((node) => [node.id, 0]));
  reachableNodes.forEach((node) =>
    getOutgoing(graph, node.id).forEach((edge) =>
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1),
    ),
  );
  const order: string[] = [];
  const queue = reachableNodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    order.push(id);
    for (const edge of getOutgoing(graph, id)) {
      const next = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, next);
      if (next === 0) queue.push(edge.target);
    }
  }
  if (order.length !== reachableNodes.length) return unavailable('rework-or-cycle');

  // Longest path: earliest start of each node and the edge that set it.
  const earliestStart = new Map<string, number>([[startNodeId, 0]]);
  const viaEdge = new Map<string, { edgeId: string; from: string }>();
  for (const id of order) {
    const node = model.nodes[id];
    const start = earliestStart.get(id);
    if (!node || start == null) continue;
    const finish = start + processingOf(node);
    for (const edge of getOutgoing(graph, id)) {
      if (finish > (earliestStart.get(edge.target) ?? Number.NEGATIVE_INFINITY)) {
        earliestStart.set(edge.target, finish);
        viaEdge.set(edge.target, { edgeId: edge.id, from: id });
      }
    }
  }

  let terminal = startNodeId;
  let durationMinutes = processingOf(model.nodes[startNodeId]);
  order
    .filter((id) => getOutgoing(graph, id).length === 0)
    .forEach((id) => {
      const node = model.nodes[id];
      const candidate = (earliestStart.get(id) ?? 0) + (node ? processingOf(node) : 0);
      if (candidate > durationMinutes) {
        durationMinutes = candidate;
        terminal = id;
      }
    });

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cursor: string | undefined = terminal;
  while (cursor) {
    nodeIds.push(cursor);
    if (cursor === startNodeId) break;
    const step = viaEdge.get(cursor);
    if (!step) break;
    edgeIds.push(step.edgeId);
    cursor = step.from;
  }
  nodeIds.reverse();
  edgeIds.reverse();

  const tasks = nodeIds
    .map((id) => model.nodes[id])
    .filter((node): node is ProcessNode => node != null && isActivityKind(node.kind));
  const estimatedTaskIds = reachableNodes
    .filter(
      (node) =>
        isActivityKind(node.kind) &&
        (resolveActivityTime(node).processingSource === 'cycle-time-estimate' ||
          resolveActivityTime(node).processingSource === 'missing'),
    )
    .map((node) => node.id);

  return {
    status: 'ready',
    quality: estimatedTaskIds.length > 0 ? 'assumption' : 'exact',
    durationMinutes,
    nodeIds,
    edgeIds,
    taskIds: tasks.map((node) => node.id),
    taskLabels: tasks.map((node) => node.label),
    estimatedTaskIds,
    formula: `${tasks.map((node) => formatDuration(processingOf(node))).join(' + ') || '0'} = ${formatDuration(durationMinutes)}`,
  };
};
