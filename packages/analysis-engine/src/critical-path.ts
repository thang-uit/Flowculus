import {
  isSequenceFlowEdge,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

export type CriticalPathStatus = 'ready' | 'unavailable';

export type CriticalPathUnavailableReason =
  'missing-start' | 'decision-gateway' | 'missing-processing-time' | 'rework-or-cycle';

export interface CriticalPathReport {
  status: CriticalPathStatus;
  durationMinutes: number | null;
  taskIds: string[];
  taskLabels: string[];
  formula: string;
  reason?: CriticalPathUnavailableReason;
}

const getControlEdges = (model: ProcessModel): ProcessEdge[] =>
  Object.values(model.edges).filter(isSequenceFlowEdge);

const getTaskProcessingMinutes = (node: ProcessNode): number =>
  node.kind === 'task' || node.kind === 'subprocess'
    ? (node.processingMinutes ?? node.durationMinutes ?? 0)
    : 0;

const findCriticalPathStart = (
  model: ProcessModel,
  controlEdges: ProcessEdge[],
): ProcessNode | null => {
  const explicitStart = Object.values(model.nodes).find((node) => node.kind === 'start');
  if (explicitStart) return explicitStart;

  const targets = new Set(controlEdges.map((edge) => edge.target));
  return Object.values(model.nodes).find((node) => !targets.has(node.id)) ?? null;
};

const unavailable = (reason: CriticalPathUnavailableReason): CriticalPathReport => ({
  status: 'unavailable',
  durationMinutes: null,
  taskIds: [],
  taskLabels: [],
  formula: '',
  reason,
});

const formatDuration = (value: number): string => Number(value.toFixed(4)).toString();

/**
 * Applies the book's Critical Path Method to the decision-free control-flow
 * graph. AND gateways are transparent split/join nodes; the longest path over
 * task processing times is therefore the path that determines TCT.
 *
 * XOR/OR/event-based/complex decisions and rework loops intentionally return
 * `unavailable`. The book requires those constructs to be simplified before
 * CPM is applied, so silently choosing one branch would overstate precision.
 */
export const analyzeCriticalPath = (model: ProcessModel): CriticalPathReport => {
  if (Object.keys(model.nodes).length === 0) {
    return {
      status: 'ready',
      durationMinutes: 0,
      taskIds: [],
      taskLabels: [],
      formula: '0 = 0',
    };
  }

  const controlEdges = getControlEdges(model);
  const startNode = findCriticalPathStart(model, controlEdges);
  if (!startNode) return unavailable('missing-start');

  const outgoingByNode = new Map<string, ProcessEdge[]>();
  for (const nodeId of Object.keys(model.nodes)) outgoingByNode.set(nodeId, []);
  for (const edge of controlEdges) outgoingByNode.get(edge.source)?.push(edge);

  const reachable = new Set<string>();
  const queue = [startNode.id];
  for (let index = 0; index < queue.length; index += 1) {
    const nodeId = queue[index];
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const edge of outgoingByNode.get(nodeId) ?? []) {
      if (model.nodes[edge.target] && !reachable.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  const hasDecisionGateway = [...reachable].some((nodeId) => {
    const node = model.nodes[nodeId];
    const outgoingCount = outgoingByNode.get(nodeId)?.length ?? 0;
    return node?.kind === 'gateway' && outgoingCount > 1 && node.gatewayKind !== 'and';
  });
  if (hasDecisionGateway) return unavailable('decision-gateway');

  const hasMissingProcessingTime = [...reachable].some((nodeId) => {
    const node = model.nodes[nodeId];
    return (
      (node?.kind === 'task' || node?.kind === 'subprocess') &&
      node.processingMinutes == null
    );
  });
  if (hasMissingProcessingTime) return unavailable('missing-processing-time');

  const hasExplicitRework = [...reachable].some(
    (nodeId) => (model.nodes[nodeId]?.reworkProbability ?? 0) > 0,
  );
  const hasReworkEdge = controlEdges.some(
    (edge) =>
      reachable.has(edge.source) &&
      reachable.has(edge.target) &&
      (edge.reworkProbability ?? 0) > 0,
  );
  if (hasExplicitRework || hasReworkEdge) {
    return unavailable('rework-or-cycle');
  }

  const indegree = new Map<string, number>([...reachable].map((nodeId) => [nodeId, 0]));
  for (const edge of controlEdges) {
    if (!reachable.has(edge.source) || !reachable.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const topologicalQueue = [...reachable].filter(
    (nodeId) => (indegree.get(nodeId) ?? 0) === 0,
  );
  const topologicalOrder: string[] = [];
  for (let index = 0; index < topologicalQueue.length; index += 1) {
    const nodeId = topologicalQueue[index];
    topologicalOrder.push(nodeId);
    for (const edge of outgoingByNode.get(nodeId) ?? []) {
      if (!reachable.has(edge.target)) continue;
      const nextIndegree = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, nextIndegree);
      if (nextIndegree === 0) topologicalQueue.push(edge.target);
    }
  }

  if (topologicalOrder.length !== reachable.size) {
    return unavailable('rework-or-cycle');
  }

  const distances = new Map<string, number>(
    [...reachable].map((nodeId) => [nodeId, Number.NEGATIVE_INFINITY]),
  );
  const predecessor = new Map<string, string>();
  distances.set(startNode.id, 0);

  for (const nodeId of topologicalOrder) {
    const node = model.nodes[nodeId];
    const distance = distances.get(nodeId) ?? Number.NEGATIVE_INFINITY;
    if (!node || !Number.isFinite(distance)) continue;
    const finish = distance + getTaskProcessingMinutes(node);

    for (const edge of outgoingByNode.get(nodeId) ?? []) {
      if (!reachable.has(edge.target)) continue;
      const currentTargetDistance =
        distances.get(edge.target) ?? Number.NEGATIVE_INFINITY;
      if (finish > currentTargetDistance) {
        distances.set(edge.target, finish);
        predecessor.set(edge.target, nodeId);
      }
    }
  }

  const terminalNodeIds = [...reachable].filter(
    (nodeId) =>
      (outgoingByNode.get(nodeId) ?? []).filter((edge) => reachable.has(edge.target))
        .length === 0,
  );
  let terminalNodeId = startNode.id;
  let durationMinutes = getTaskProcessingMinutes(startNode);
  for (const nodeId of terminalNodeIds) {
    const node = model.nodes[nodeId];
    if (!node) continue;
    const candidate =
      (distances.get(nodeId) ?? Number.NEGATIVE_INFINITY) +
      getTaskProcessingMinutes(node);
    if (candidate > durationMinutes) {
      durationMinutes = candidate;
      terminalNodeId = nodeId;
    }
  }

  const nodePath: string[] = [];
  let cursor: string | undefined = terminalNodeId;
  while (cursor) {
    nodePath.push(cursor);
    if (cursor === startNode.id) break;
    cursor = predecessor.get(cursor);
  }
  nodePath.reverse();

  const taskPath = nodePath
    .map((nodeId) => model.nodes[nodeId])
    .filter(
      (node): node is ProcessNode =>
        node != null && (node.kind === 'task' || node.kind === 'subprocess'),
    );
  const durationTerms = taskPath.map((node) => getTaskProcessingMinutes(node));

  return {
    status: 'ready',
    durationMinutes,
    taskIds: taskPath.map((node) => node.id),
    taskLabels: taskPath.map((node) => node.label),
    formula: `${durationTerms.map(formatDuration).join(' + ') || '0'} = ${formatDuration(durationMinutes)}`,
  };
};
