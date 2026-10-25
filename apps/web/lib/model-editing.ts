import { rectsOverlap, type Point, type Rect } from '@flowculus/graph-layout';
import {
  DEFAULT_NODE_SIZE,
  SEMANTIC_METADATA_KEYS,
  getNodeBounds,
  isSequenceFlowEdge,
  isEdgeAttachmentSide,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

import { SHAPE_TOOL_DEFINITIONS, type SemanticShapeTool } from '@/lib/shape-tools';

/**
 * Pure, immutable edits for the canvas. Unchanged nodes keep their object
 * identity so memoised node renderers do not re-render after an edit.
 */

const AUTO_PROBABILITY_KEY = 'flowculus-probability-source';
const QUICK_ACTION_GAP = 72;

const randomSuffix = (): string =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

export const createElementId = (
  prefix: string,
  taken: Record<string, unknown>,
): string => {
  let id = `${prefix}-${randomSuffix()}`;
  while (taken[id]) id = `${prefix}-${randomSuffix()}`;
  return id;
};

const roundPoint = (value: number): number => Math.round(value * 100) / 100;

/** Moves `rect` down until it no longer overlaps an existing node. */
export const findFreeRect = (
  model: ProcessModel,
  rect: Rect,
  ignoreId?: string,
): Rect => {
  const occupied = Object.values(model.nodes)
    .filter((node) => node.id !== ignoreId)
    .map(getNodeBounds);
  const candidate = { ...rect };
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const blocker = occupied.find((other) => rectsOverlap(candidate, other, 16));
    if (!blocker) return candidate;
    candidate.y = blocker.y + blocker.height + 32;
  }
  return candidate;
};

export const createNodeFromTool = (
  tool: SemanticShapeTool,
  label: string,
  centre: Point,
  taken: Record<string, unknown>,
): ProcessNode => {
  const definition = SHAPE_TOOL_DEFINITIONS[tool];
  const size = DEFAULT_NODE_SIZE[definition.kind];
  return {
    id: createElementId(
      definition.kind === 'gateway' ? 'gateway' : definition.kind,
      taken,
    ),
    label,
    kind: definition.kind,
    gatewayKind: definition.gatewayKind,
    reworkProbability: definition.reworkProbability,
    bounds: {
      x: roundPoint(centre.x - size.width / 2),
      y: roundPoint(centre.y - size.height / 2),
      width: size.width,
      height: size.height,
    },
  };
};

/** Adds a node whose centre is exactly `centre` (canvas coordinates). */
export const addNodeAt = (
  model: ProcessModel,
  tool: SemanticShapeTool,
  label: string,
  centre: Point,
): { model: ProcessModel; nodeId: string } => {
  const node = createNodeFromTool(tool, label, centre, model.nodes);
  return {
    model: { ...model, nodes: { ...model.nodes, [node.id]: node } },
    nodeId: node.id,
  };
};

export const moveNodes = (
  model: ProcessModel,
  positions: Record<string, Point>,
): ProcessModel => {
  let changed = false;
  const nodes = { ...model.nodes };
  Object.entries(positions).forEach(([id, position]) => {
    const node = nodes[id];
    if (!node) return;
    const bounds = getNodeBounds(node);
    const x = roundPoint(position.x);
    const y = roundPoint(position.y);
    if (node.bounds && node.bounds.x === x && node.bounds.y === y) return;
    nodes[id] = { ...node, bounds: { ...bounds, x, y } };
    changed = true;
  });
  return changed ? { ...model, nodes } : model;
};

const isArtifact = (node: ProcessNode | undefined): boolean =>
  node?.kind === 'data' || node?.kind === 'annotation';

/**
 * Keeps XOR split probabilities summing to 1 after a branch is added or removed.
 * Branches the user typed keep their value; automatic ones share the rest.
 */
export const rebalanceBranchProbabilities = (
  model: ProcessModel,
  gatewayId: string,
): ProcessModel => {
  const gateway = model.nodes[gatewayId];
  if (gateway?.kind !== 'gateway') return model;
  const outgoing = Object.values(model.edges).filter(
    (edge) => edge.source === gatewayId && isSequenceFlowEdge(edge),
  );
  if (gateway.gatewayKind === 'and' || outgoing.length === 0) return model;
  const isAuto = (edge: ProcessEdge) =>
    edge.probability == null || edge.metadata?.[AUTO_PROBABILITY_KEY] === 'auto';
  const automatic = outgoing.filter(isAuto);
  if (automatic.length === 0) return model;
  const edges = { ...model.edges };
  if (gateway.gatewayKind === 'or') {
    automatic.forEach((edge) => {
      edges[edge.id] = {
        ...edge,
        probability: edge.probability ?? 0.5,
        metadata: { ...edge.metadata, [AUTO_PROBABILITY_KEY]: 'auto' },
      };
    });
    return { ...model, edges };
  }
  if (outgoing.length === 1) {
    const [only] = outgoing;
    if (isAuto(only)) {
      const rest = { ...only.metadata };
      delete rest[AUTO_PROBABILITY_KEY];
      edges[only.id] = {
        ...only,
        probability: undefined,
        metadata: Object.keys(rest).length > 0 ? rest : undefined,
      };
    }
    return { ...model, edges };
  }
  const manualTotal = outgoing
    .filter((edge) => !isAuto(edge))
    .reduce((sum, edge) => sum + (edge.probability ?? 0), 0);
  const share = Math.max(0, 1 - manualTotal) / automatic.length;
  let assigned = 0;
  automatic.forEach((edge, index) => {
    const probability =
      index === automatic.length - 1
        ? Math.max(0, Math.round((1 - manualTotal - assigned) * 1e6) / 1e6)
        : Math.round(share * 1e4) / 1e4;
    assigned += probability;
    edges[edge.id] = {
      ...edge,
      probability,
      metadata: { ...edge.metadata, [AUTO_PROBABILITY_KEY]: 'auto' },
    };
  });
  return { ...model, edges };
};

/** Shared by snapping previews, new connections and committed reconnections. */
export const isValidNodeConnection = (
  model: ProcessModel,
  sourceId: string,
  targetId: string,
  edgeId?: string,
): boolean => {
  const source = model.nodes[sourceId];
  const target = model.nodes[targetId];
  const edge = edgeId ? model.edges[edgeId] : undefined;
  if (!source || !target || sourceId === targetId || (edgeId && !edge)) return false;
  if (target.kind === 'start' || (source.kind === 'end' && !isArtifact(target)))
    return false;
  if (edge && isSequenceFlowEdge(edge) && (isArtifact(source) || isArtifact(target)))
    return false;
  return !Object.values(model.edges).some(
    (other) =>
      other.id !== edgeId && other.source === sourceId && other.target === targetId,
  );
};

type EdgeAttachments = Pick<
  NonNullable<ProcessEdge['routing']>,
  'sourceSide' | 'targetSide'
>;
const validAttachments = (value?: EdgeAttachments): boolean =>
  !value ||
  [value.sourceSide, value.targetSide].every(
    (side) => side === undefined || isEdgeAttachmentSide(side),
  );

export const connectNodes = (
  model: ProcessModel,
  sourceId: string,
  targetId: string,
  attachments?: EdgeAttachments,
): { model: ProcessModel; edgeId: string } | null => {
  const source = model.nodes[sourceId];
  const target = model.nodes[targetId];
  if (!validAttachments(attachments) || !isValidNodeConnection(model, sourceId, targetId))
    return null;
  const edge: ProcessEdge = {
    id: createElementId('flow', model.edges),
    source: sourceId,
    target: targetId,
    kind: isArtifact(source) || isArtifact(target) ? 'association' : 'sequence',
    routing:
      attachments?.sourceSide || attachments?.targetSide
        ? { style: 'orthogonal', waypoints: [], ...attachments }
        : undefined,
  };
  const next = { ...model, edges: { ...model.edges, [edge.id]: edge } };
  return { model: rebalanceBranchProbabilities(next, sourceId), edgeId: edge.id };
};

export const removeElements = (
  model: ProcessModel,
  nodeIds: Iterable<string>,
  edgeIds: Iterable<string>,
): ProcessModel => {
  const removedNodes = new Set(nodeIds);
  const removedEdges = new Set(edgeIds);
  const affectedSources = new Set<string>();
  const edges: Record<string, ProcessEdge> = {};
  Object.values(model.edges).forEach((edge) => {
    if (
      removedEdges.has(edge.id) ||
      removedNodes.has(edge.source) ||
      removedNodes.has(edge.target)
    ) {
      affectedSources.add(edge.source);
      return;
    }
    edges[edge.id] = edge;
  });
  if (
    removedNodes.size === 0 &&
    Object.keys(edges).length === Object.keys(model.edges).length
  )
    return model;
  const nodes = Object.fromEntries(
    Object.entries(model.nodes).filter(([id]) => !removedNodes.has(id)),
  );
  let next: ProcessModel = { ...model, nodes, edges };
  affectedSources.forEach((sourceId) => {
    if (nodes[sourceId]) next = rebalanceBranchProbabilities(next, sourceId);
  });
  return next;
};

/**
 * Quick action: creates the next step to the right of `sourceId`, keeps the
 * centres aligned on one row when there is room, and connects it.
 */
export const appendNodeAfter = (
  model: ProcessModel,
  sourceId: string,
  tool: SemanticShapeTool,
  label: string,
): { model: ProcessModel; nodeId: string } | null => {
  const source = model.nodes[sourceId];
  if (!source) return null;
  const sourceBounds = getNodeBounds(source);
  const draft = createNodeFromTool(
    tool,
    label,
    {
      x:
        sourceBounds.x +
        sourceBounds.width +
        QUICK_ACTION_GAP +
        DEFAULT_NODE_SIZE[SHAPE_TOOL_DEFINITIONS[tool].kind].width / 2,
      y: sourceBounds.y + sourceBounds.height / 2,
    },
    model.nodes,
  );
  const placed = { ...draft, bounds: findFreeRect(model, getNodeBounds(draft)) };
  const withNode = { ...model, nodes: { ...model.nodes, [placed.id]: placed } };
  const connected = connectNodes(withNode, sourceId, placed.id);
  return { model: connected?.model ?? withNode, nodeId: placed.id };
};

export const replaceNode = (model: ProcessModel, node: ProcessNode): ProcessModel => {
  if (model.nodes[node.id] === node) return model;
  const previous = model.nodes[node.id];
  let next: ProcessModel = { ...model, nodes: { ...model.nodes, [node.id]: node } };
  if (previous?.kind === 'gateway' && previous.gatewayKind !== node.gatewayKind) {
    next = rebalanceBranchProbabilities(next, node.id);
  }
  return next;
};

/** A user-typed probability is "manual" and is preserved by rebalancing. */
export const replaceEdge = (model: ProcessModel, edge: ProcessEdge): ProcessModel => {
  const previous = model.edges[edge.id];
  if (!previous || previous === edge) return model;
  const metadata = { ...edge.metadata };
  if (edge.probability !== previous.probability) delete metadata[AUTO_PROBABILITY_KEY];
  return {
    ...model,
    edges: {
      ...model.edges,
      [edge.id]: {
        ...edge,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
    },
  };
};

/** Reconnects an existing flow while keeping its ID and rebalancing affected gateways. */
export const reconnectEdge = (
  model: ProcessModel,
  edgeId: string,
  sourceId: string,
  targetId: string,
  attachments?: EdgeAttachments,
): ProcessModel | null => {
  const edge = model.edges[edgeId];
  const source = model.nodes[sourceId];
  const target = model.nodes[targetId];
  if (
    !validAttachments(attachments) ||
    !isValidNodeConnection(model, sourceId, targetId, edgeId)
  )
    return null;
  if (!edge || !source || !target || sourceId === targetId) return null;
  const sameNodes = sourceId === edge.source && targetId === edge.target;
  const sourceSide =
    attachments && 'sourceSide' in attachments
      ? attachments.sourceSide
      : sourceId === edge.source
        ? edge.routing?.sourceSide
        : undefined;
  const targetSide =
    attachments && 'targetSide' in attachments
      ? attachments.targetSide
      : targetId === edge.target
        ? edge.routing?.targetSide
        : undefined;
  const sameSides =
    sourceSide === edge.routing?.sourceSide && targetSide === edge.routing?.targetSide;
  if (sameNodes && sameSides) return model;
  const previousSource = edge.source;
  const metadata = { ...edge.metadata };
  if (previousSource !== sourceId) delete metadata[AUTO_PROBABILITY_KEY];
  const routing =
    edge.routing || sourceSide || targetSide
      ? {
          style: edge.routing?.style ?? 'orthogonal',
          waypoints: sameNodes ? (edge.routing?.waypoints ?? []) : [],
          sourceSide,
          targetSide,
        }
      : undefined;
  // Geometry-only edits keep probabilities, metadata and all other edges unchanged.
  if (sameNodes) return replaceEdge(model, { ...edge, routing });
  let next = replaceEdge(model, {
    ...edge,
    source: sourceId,
    target: targetId,
    probability: previousSource === sourceId ? edge.probability : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    // Existing bend points refer to the old endpoints and must be laid out again.
    routing,
  });
  if (previousSource !== sourceId && model.nodes[previousSource]?.kind === 'gateway')
    next = rebalanceBranchProbabilities(next, previousSource);
  if (source.kind === 'gateway') next = rebalanceBranchProbabilities(next, sourceId);
  return next;
};

/**
 * Choosing a type in the Inspector is an explicit decision, so it clears the
 * node's inferred flags (kind, gateway type, rework) and records the
 * confirmation, exactly as `confirmSemantics` does for the whole model.
 */
const markNodeConfirmed = (node: ProcessNode): ProcessNode => {
  if (!node.metadata) return node;
  const metadata = { ...node.metadata };
  const flags = [
    SEMANTIC_METADATA_KEYS.inferredKind,
    SEMANTIC_METADATA_KEYS.inferredGatewayKind,
    SEMANTIC_METADATA_KEYS.inferredRework,
  ];
  if (!flags.some((flag) => flag in metadata)) return node;
  flags.forEach((flag) => delete metadata[flag]);
  metadata[SEMANTIC_METADATA_KEYS.confirmed] = true;
  return { ...node, metadata };
};

type ShapeFamily = 'activity' | 'event' | 'gateway' | 'artifact';

const shapeFamily = (kind: ProcessNode['kind']): ShapeFamily =>
  kind === 'gateway'
    ? 'gateway'
    : kind === 'start' || kind === 'end' || kind === 'event'
      ? 'event'
      : kind === 'data' || kind === 'annotation'
        ? 'artifact'
        : 'activity';

/**
 * Changes the semantic type of a node (an explicit user confirmation). The
 * shape keeps its centre; it is resized only when it changes family, so a task
 * that becomes a subprocess keeps the size the user gave it.
 */
export const changeNodeKind = (
  node: ProcessNode,
  kind: ProcessNode['kind'],
  gatewayKind?: ProcessNode['gatewayKind'],
): ProcessNode => {
  const bounds = getNodeBounds(node);
  const resize = shapeFamily(kind) !== shapeFamily(node.kind) || kind === 'data';
  const size = resize
    ? DEFAULT_NODE_SIZE[kind]
    : { width: bounds.width, height: bounds.height };
  return markNodeConfirmed({
    ...node,
    kind,
    gatewayKind:
      kind === 'gateway' ? (gatewayKind ?? node.gatewayKind ?? 'xor') : undefined,
    bounds: {
      x: roundPoint(bounds.x + bounds.width / 2 - size.width / 2),
      y: roundPoint(bounds.y + bounds.height / 2 - size.height / 2),
      width: size.width,
      height: size.height,
    },
  });
};
