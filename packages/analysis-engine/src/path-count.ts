import {
  isSequenceFlowEdge,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

export type PathCountStatus = 'ready' | 'empty' | 'cyclic' | 'limit';

export interface PathCountOptions {
  /** Optional source node. Defaults to the first explicit start event. */
  startNodeId?: string;
  /** Optional terminal nodes. Defaults to end events or dead-end nodes. */
  endNodeIds?: string[];
  /** Safety cap for graphs with combinatorial path growth. */
  maxPaths?: number;
}

export interface PathCountReport {
  status: PathCountStatus;
  count: number | null;
  startNodeId?: string;
  endNodeIds: string[];
  formula: string;
  warning?: string;
}

const MAX_PATH_COUNT = 1_000_000;

interface SequenceAdjacency {
  outgoing: Map<string, ProcessEdge[]>;
  incoming: Map<string, number>;
}

const buildSequenceAdjacency = (model: ProcessModel): SequenceAdjacency => {
  const outgoing = new Map<string, ProcessEdge[]>();
  const incoming = new Map<string, number>();

  Object.keys(model.nodes).forEach((nodeId) => {
    outgoing.set(nodeId, []);
    incoming.set(nodeId, 0);
  });

  Object.values(model.edges).forEach((edge) => {
    if (
      !isSequenceFlowEdge(edge) ||
      !model.nodes[edge.source] ||
      !model.nodes[edge.target]
    )
      return;
    outgoing.get(edge.source)?.push(edge);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  });

  return { outgoing, incoming };
};

const findStartNode = (
  model: ProcessModel,
  adjacency: SequenceAdjacency,
  requestedStartNodeId?: string,
): ProcessNode | undefined => {
  if (requestedStartNodeId != null) return model.nodes[requestedStartNodeId];
  return (
    Object.values(model.nodes).find((node) => node.kind === 'start') ??
    Object.values(model.nodes).find(
      (node) => (adjacency.incoming.get(node.id) ?? 0) === 0,
    )
  );
};

const normalizeMaxPaths = (value: number | undefined): number =>
  value == null || !Number.isInteger(value) || value < 1
    ? MAX_PATH_COUNT
    : Math.min(value, MAX_PATH_COUNT);

const formatPathFormula = (
  count: number,
  startNodeId: string,
  endNodeIds: string[],
  explicitStart: boolean,
  explicitEnds: boolean,
): string => {
  if (!explicitStart && !explicitEnds) return `P = ${count}`;
  const end = endNodeIds.length > 0 ? endNodeIds.join('|') : 'end';
  return `P(${startNodeId} → ${end}) = ${count}`;
};

/**
 * Counts directed sequence-flow paths from a source to terminal/end nodes.
 * A path is an edge-distinct route; converging branches are counted
 * separately. `options` can scope the count to a selected source and target
 * set (for example n1 → n8). Cycles and combinatorial explosions are
 * reported explicitly because a finite path count would otherwise be
 * misleading.
 */
export const countProcessPaths = (
  model: ProcessModel,
  options: PathCountOptions = {},
): PathCountReport => {
  const adjacency = buildSequenceAdjacency(model);
  const maxPaths = normalizeMaxPaths(options.maxPaths);
  const explicitStart = options.startNodeId != null;
  const explicitEnds = options.endNodeIds != null;
  const start = findStartNode(model, adjacency, options.startNodeId);

  if (!start) {
    return {
      status: 'empty',
      count: null,
      endNodeIds: [],
      formula: explicitStart
        ? `P(${options.startNodeId ?? 'start'} → end) = undefined`
        : 'P = undefined',
      warning: explicitStart
        ? `Requested start node ${options.startNodeId} was not found.`
        : 'No process start node was found.',
    };
  }

  const requestedEndIds = new Set(
    (options.endNodeIds ?? []).filter((nodeId) => Boolean(model.nodes[nodeId])),
  );
  const missingEndIds = (options.endNodeIds ?? []).filter(
    (nodeId) => !model.nodes[nodeId],
  );
  const hasExplicitEnds = requestedEndIds.size > 0;

  if (explicitEnds && requestedEndIds.size === 0) {
    return {
      status: 'empty',
      count: 0,
      startNodeId: start.id,
      endNodeIds: [],
      formula: `P(${start.id} → end) = 0`,
      warning: 'No requested end node was found.',
    };
  }

  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const endNodeIds = new Set<string>();
  let cycleDetected = false;
  let limitReached = false;

  const visit = (nodeId: string): number => {
    if (cycleDetected || limitReached) return 0;
    const memoized = memo.get(nodeId);
    if (memoized != null) return memoized;
    if (visiting.has(nodeId)) {
      cycleDetected = true;
      return 0;
    }

    const node = model.nodes[nodeId];
    if (!node) return 0;

    if (hasExplicitEnds && requestedEndIds.has(nodeId)) {
      endNodeIds.add(nodeId);
      memo.set(nodeId, 1);
      return 1;
    }

    const outgoing = adjacency.outgoing.get(nodeId) ?? [];
    if (node.kind === 'end' || outgoing.length === 0) {
      // When a target set is supplied, a dead end that is not one of those
      // targets is not a successful route. With the default behaviour, every
      // explicit end event (or dead end) remains a valid terminal path.
      if (hasExplicitEnds) {
        memo.set(nodeId, 0);
        return 0;
      }
      endNodeIds.add(nodeId);
      memo.set(nodeId, 1);
      return 1;
    }

    visiting.add(nodeId);
    let count = 0;
    for (const edge of outgoing) {
      count += visit(edge.target);
      if (count > maxPaths) {
        limitReached = true;
        break;
      }
    }
    visiting.delete(nodeId);
    if (!cycleDetected && !limitReached) memo.set(nodeId, count);
    return count;
  };

  const count = visit(start.id);
  if (cycleDetected) {
    return {
      status: 'cyclic',
      count: null,
      startNodeId: start.id,
      endNodeIds: [...endNodeIds],
      formula:
        explicitStart || explicitEnds
          ? `P(${start.id} → ${hasExplicitEnds ? [...requestedEndIds].join('|') : 'end'}) = undefined (cycle detected)`
          : 'P = undefined (cycle detected)',
      warning: 'The graph contains a cycle, so the finite path count is undefined.',
    };
  }
  if (limitReached) {
    return {
      status: 'limit',
      count: null,
      startNodeId: start.id,
      endNodeIds: [...endNodeIds],
      formula: `P > ${maxPaths}`,
      warning: `The graph has more than ${maxPaths} paths; count was capped.`,
    };
  }

  const warning = missingEndIds.length
    ? `Requested end node(s) not found: ${missingEndIds.join(', ')}.`
    : undefined;
  return {
    status: 'ready',
    count,
    startNodeId: start.id,
    endNodeIds: [...endNodeIds],
    formula: formatPathFormula(
      count,
      start.id,
      [...(hasExplicitEnds ? requestedEndIds : endNodeIds)],
      explicitStart,
      explicitEnds,
    ),
    warning,
  };
};
