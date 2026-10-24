import {
  SEMANTIC_METADATA_KEYS,
  type ProcessEdge,
  type ProcessMetadataValue,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

/**
 * Semantic confirmation policy.
 *
 * Adapters (draw.io import, process mining, CSV) may guess a node type, a
 * gateway type, a rework rate, a flow type or a branch probability. Every
 * guess is flagged in metadata. Until a person confirms it, results that use
 * it are `assumption`, and Flowculus refuses to export or share them.
 */

export type UnconfirmedSemanticCode =
  | 'inferred-node-kind'
  | 'inferred-gateway-kind'
  | 'inferred-rework'
  | 'inferred-edge-kind'
  | 'inferred-edge-probability'
  | 'unknown-node-kind';

export type SemanticOrigin = 'drawio' | 'process-mining' | 'csv' | 'unknown';

export interface UnconfirmedSemantic {
  code: UnconfirmedSemanticCode;
  elementType: 'node' | 'edge';
  elementId: string;
  /** Node label, or "source → target" labels for an edge. */
  label: string;
  origin: SemanticOrigin;
  /** False when a person must change the value instead of approving it. */
  confirmable: boolean;
}

const isFlagged = (
  metadata: Record<string, ProcessMetadataValue> | undefined,
  key: string,
): boolean => metadata?.[key] === true || metadata?.[key] === 'true';

const originOf = (
  metadata: Record<string, ProcessMetadataValue> | undefined,
  modelMetadata: Record<string, ProcessMetadataValue> | undefined,
): SemanticOrigin => {
  const source = String(metadata?.source ?? modelMetadata?.source ?? '');
  if (source === 'process-mining') return 'process-mining';
  if (source === 'drawio') return 'drawio';
  if (source === 'csv') return 'csv';
  return 'unknown';
};

const NODE_FLAGS: Array<[string, UnconfirmedSemanticCode]> = [
  [SEMANTIC_METADATA_KEYS.inferredKind, 'inferred-node-kind'],
  [SEMANTIC_METADATA_KEYS.inferredGatewayKind, 'inferred-gateway-kind'],
  [SEMANTIC_METADATA_KEYS.inferredRework, 'inferred-rework'],
];

const EDGE_FLAGS: Array<[string, UnconfirmedSemanticCode]> = [
  [SEMANTIC_METADATA_KEYS.inferredEdgeKind, 'inferred-edge-kind'],
  [SEMANTIC_METADATA_KEYS.inferredProbability, 'inferred-edge-probability'],
];

const edgeLabel = (model: ProcessModel, edge: ProcessEdge): string =>
  `${model.nodes[edge.source]?.label ?? edge.source} → ${model.nodes[edge.target]?.label ?? edge.target}`;

/**
 * Lists every semantic that still needs a person's confirmation, in a stable
 * order (nodes, then edges, in model order). Edges whose endpoints no longer
 * exist are ignored because they cannot be exported either.
 */
export const collectUnconfirmedSemantics = (
  model: ProcessModel,
): UnconfirmedSemantic[] => {
  const items: UnconfirmedSemantic[] = [];
  for (const node of Object.values(model.nodes)) {
    const origin = originOf(node.metadata, model.metadata);
    if (node.kind === 'unknown') {
      items.push({
        code: 'unknown-node-kind',
        elementType: 'node',
        elementId: node.id,
        label: node.label,
        origin,
        confirmable: false,
      });
    }
    for (const [key, code] of NODE_FLAGS) {
      if (code === 'inferred-gateway-kind' && node.kind !== 'gateway') continue;
      if (!isFlagged(node.metadata, key)) continue;
      items.push({
        code,
        elementType: 'node',
        elementId: node.id,
        label: node.label,
        origin,
        confirmable: node.kind !== 'unknown',
      });
    }
  }
  for (const edge of Object.values(model.edges)) {
    if (!model.nodes[edge.source] || !model.nodes[edge.target]) continue;
    const origin = originOf(edge.metadata, model.metadata);
    for (const [key, code] of EDGE_FLAGS) {
      if (code === 'inferred-edge-probability' && edge.probability == null) continue;
      if (!isFlagged(edge.metadata, key)) continue;
      items.push({
        code,
        elementType: 'edge',
        elementId: edge.id,
        label: edgeLabel(model, edge),
        origin,
        confirmable: true,
      });
    }
  }
  return items;
};

export const hasUnconfirmedSemantics = (model: ProcessModel): boolean =>
  collectUnconfirmedSemantics(model).length > 0;

/** Pending items of one node (for badges and the Inspector). */
export const unconfirmedNodeCodes = (node: ProcessNode): UnconfirmedSemanticCode[] => {
  const codes: UnconfirmedSemanticCode[] = [];
  if (node.kind === 'unknown') codes.push('unknown-node-kind');
  for (const [key, code] of NODE_FLAGS) {
    if (code === 'inferred-gateway-kind' && node.kind !== 'gateway') continue;
    if (isFlagged(node.metadata, key)) codes.push(code);
  }
  return codes;
};

/** Pending items of one edge (for the Inspector). */
export const unconfirmedEdgeCodes = (edge: ProcessEdge): UnconfirmedSemanticCode[] =>
  EDGE_FLAGS.filter(
    ([key, code]) =>
      isFlagged(edge.metadata, key) &&
      !(code === 'inferred-edge-probability' && edge.probability == null),
  ).map(([, code]) => code);

const clearFlags = <T extends ProcessNode | ProcessEdge>(
  element: T,
  flags: Array<[string, UnconfirmedSemanticCode]>,
  codes: Set<UnconfirmedSemanticCode> | null,
): T => {
  if (!element.metadata) return element;
  const metadata = { ...element.metadata };
  let changed = false;
  for (const [key, code] of flags) {
    if (codes && !codes.has(code)) continue;
    if (!(key in metadata)) continue;
    delete metadata[key];
    changed = true;
  }
  if (!changed) return element;
  metadata[SEMANTIC_METADATA_KEYS.confirmed] = true;
  return { ...element, metadata };
};

export interface SemanticTarget {
  elementType: 'node' | 'edge';
  elementId: string;
  /** Limit to some codes; all confirmable codes of the element otherwise. */
  codes?: UnconfirmedSemanticCode[];
}

/**
 * Records a person's confirmation: the inferred flags are removed and
 * `flowculus-confirmed` is set. Unknown node kinds are never "confirmed";
 * the person has to choose a type instead. Without `targets`, every
 * confirmable item is confirmed ("confirm all remaining").
 */
export const confirmSemantics = (
  model: ProcessModel,
  targets?: SemanticTarget[],
): ProcessModel => {
  const wanted = (type: 'node' | 'edge', id: string) =>
    targets
      ? targets.filter((target) => target.elementType === type && target.elementId === id)
      : null;
  let nodesChanged = false;
  const nodes = { ...model.nodes };
  for (const node of Object.values(model.nodes)) {
    if (node.kind === 'unknown') continue;
    const selection = wanted('node', node.id);
    if (selection && selection.length === 0) continue;
    const codes =
      selection && selection.every((target) => target.codes)
        ? new Set(selection.flatMap((target) => target.codes ?? []))
        : null;
    const next = clearFlags(node, NODE_FLAGS, codes);
    if (next !== node) {
      nodes[node.id] = next;
      nodesChanged = true;
    }
  }
  let edgesChanged = false;
  const edges = { ...model.edges };
  for (const edge of Object.values(model.edges)) {
    const selection = wanted('edge', edge.id);
    if (selection && selection.length === 0) continue;
    const codes =
      selection && selection.every((target) => target.codes)
        ? new Set(selection.flatMap((target) => target.codes ?? []))
        : null;
    const next = clearFlags(edge, EDGE_FLAGS, codes);
    if (next !== edge) {
      edges[edge.id] = next;
      edgesChanged = true;
    }
  }
  if (!nodesChanged && !edgesChanged) return model;
  return {
    ...model,
    nodes: nodesChanged ? nodes : model.nodes,
    edges: edgesChanged ? edges : model.edges,
  };
};

declare const confirmedModelBrand: unique symbol;

/**
 * A model that passed the semantic confirmation policy. Export and share
 * functions accept only this type, so a call site cannot skip the guard.
 */
export type ConfirmedProcessModel = ProcessModel & {
  readonly [confirmedModelBrand]: true;
};

export type SemanticGateResult =
  | { ok: true; model: ConfirmedProcessModel }
  | { ok: false; items: UnconfirmedSemantic[] };

export const checkSemanticGate = (model: ProcessModel): SemanticGateResult => {
  const items = collectUnconfirmedSemantics(model);
  return items.length === 0
    ? { ok: true, model: model as ConfirmedProcessModel }
    : { ok: false, items };
};

export class UnconfirmedSemanticsError extends Error {
  readonly items: UnconfirmedSemantic[];

  constructor(items: UnconfirmedSemantic[]) {
    super(`${items.length} semantic item(s) need confirmation before export.`);
    this.name = 'UnconfirmedSemanticsError';
    this.items = items;
  }
}

/**
 * Defence in depth for the lowest export layer: even a branded model is
 * re-checked, so a stale brand (the model changed after the gate) is refused.
 */
export const assertConfirmedModel = (model: ConfirmedProcessModel): void => {
  const items = collectUnconfirmedSemantics(model);
  if (items.length > 0) throw new UnconfirmedSemanticsError(items);
};
