import {
  isFlowNodeKind,
  isSequenceFlowEdge,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

/**
 * The control-flow view of a model: flow nodes (artifacts excluded) and the
 * sequence flows between them. Message flows and associations never move a
 * token, so they are not part of this graph.
 */
export interface SequenceGraph {
  nodeIds: string[];
  outgoing: Map<string, ProcessEdge[]>;
  incoming: Map<string, ProcessEdge[]>;
}

export const buildSequenceGraph = (model: ProcessModel): SequenceGraph => {
  const nodeIds = Object.values(model.nodes)
    .filter((node) => isFlowNodeKind(node.kind))
    .map((node) => node.id);
  const known = new Set(nodeIds);
  const outgoing = new Map<string, ProcessEdge[]>();
  const incoming = new Map<string, ProcessEdge[]>();
  nodeIds.forEach((id) => {
    outgoing.set(id, []);
    incoming.set(id, []);
  });
  Object.values(model.edges).forEach((edge) => {
    if (!isSequenceFlowEdge(edge)) return;
    if (!known.has(edge.source) || !known.has(edge.target)) return;
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
  });
  return { nodeIds, outgoing, incoming };
};

export const getOutgoing = (graph: SequenceGraph, nodeId: string): ProcessEdge[] =>
  graph.outgoing.get(nodeId) ?? [];

export const getIncoming = (graph: SequenceGraph, nodeId: string): ProcessEdge[] =>
  graph.incoming.get(nodeId) ?? [];

/** Breadth-first reachability following sequence flows forwards. */
export const reachableFrom = (
  graph: SequenceGraph,
  startIds: Iterable<string>,
): Set<string> => {
  const seen = new Set<string>();
  const queue = [...startIds].filter((id) => graph.outgoing.has(id));
  queue.forEach((id) => seen.add(id));
  for (let index = 0; index < queue.length; index += 1) {
    for (const edge of getOutgoing(graph, queue[index])) {
      if (seen.has(edge.target)) continue;
      seen.add(edge.target);
      queue.push(edge.target);
    }
  }
  return seen;
};

/** Nodes from which at least one of `targetIds` can be reached. */
export const canReach = (
  graph: SequenceGraph,
  targetIds: Iterable<string>,
): Set<string> => {
  const seen = new Set<string>();
  const queue = [...targetIds].filter((id) => graph.incoming.has(id));
  queue.forEach((id) => seen.add(id));
  for (let index = 0; index < queue.length; index += 1) {
    for (const edge of getIncoming(graph, queue[index])) {
      if (seen.has(edge.source)) continue;
      seen.add(edge.source);
      queue.push(edge.source);
    }
  }
  return seen;
};

/** Flow nodes without outgoing sequence flows (explicit or implicit ends). */
export const getTerminalNodeIds = (graph: SequenceGraph): string[] =>
  graph.nodeIds.filter((id) => getOutgoing(graph, id).length === 0);

export interface ProcessEntry {
  /** The single node analysis starts from, or null when it is ambiguous. */
  startNodeId: string | null;
  explicitStartIds: string[];
  /** True when no start event exists and a unique source node was used. */
  implicit: boolean;
}

/**
 * Resolves where a token enters the process. Exactly one start event is the
 * normal case. Without a start event, a unique source node is accepted as an
 * implicit start (reported as an assumption). Several start events are
 * alternative triggers whose mix is unknown, so no single entry is chosen.
 */
export const resolveProcessEntry = (
  model: ProcessModel,
  graph: SequenceGraph = buildSequenceGraph(model),
): ProcessEntry => {
  const explicitStartIds = graph.nodeIds.filter(
    (id) => model.nodes[id]?.kind === 'start',
  );
  if (explicitStartIds.length === 1) {
    return { startNodeId: explicitStartIds[0], explicitStartIds, implicit: false };
  }
  if (explicitStartIds.length > 1) {
    return { startNodeId: null, explicitStartIds, implicit: false };
  }
  if (graph.nodeIds.length === 1) {
    return { startNodeId: graph.nodeIds[0], explicitStartIds, implicit: true };
  }
  const sources = graph.nodeIds.filter(
    (id) => getIncoming(graph, id).length === 0 && getOutgoing(graph, id).length > 0,
  );
  return sources.length === 1
    ? { startNodeId: sources[0], explicitStartIds, implicit: true }
    : { startNodeId: null, explicitStartIds, implicit: false };
};

export const isGateway = (node: ProcessNode | undefined): node is ProcessNode =>
  node?.kind === 'gateway';
