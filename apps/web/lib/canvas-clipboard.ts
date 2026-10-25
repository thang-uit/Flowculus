import {
  SEMANTIC_METADATA_KEYS,
  getNodeBounds,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';
import { processModelSchema } from '@flowculus/validation';

import { createElementId } from '@/lib/model-editing';

const CLIPBOARD_SOURCE = 'flowculus-clipboard';
const CLIPBOARD_VERSION = 1;
const MAX_CLIPBOARD_CHARS = 1_000_000;
const MAX_CLIPBOARD_NODES = 500;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface CanvasClipboardPayload {
  source: typeof CLIPBOARD_SOURCE;
  schemaVersion: typeof CLIPBOARD_VERSION;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
}

/** Internal flows are copied only when both endpoint shapes are selected. */
export function makeCanvasClipboard(
  model: ProcessModel,
  nodeIds: readonly string[],
): CanvasClipboardPayload | null {
  const selected = new Set(nodeIds.filter((id) => model.nodes[id]));
  if (selected.size === 0 || selected.size > MAX_CLIPBOARD_NODES) return null;
  return {
    source: CLIPBOARD_SOURCE,
    schemaVersion: CLIPBOARD_VERSION,
    nodes: [...selected].map((id) => model.nodes[id]!),
    edges: Object.values(model.edges).filter(
      (edge) => selected.has(edge.source) && selected.has(edge.target),
    ),
  };
}

export function parseCanvasClipboard(text: string): CanvasClipboardPayload | null {
  if (!text || text.length > MAX_CLIPBOARD_CHARS) return null;
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    return null;
  }
  if (!candidate || typeof candidate !== 'object') return null;
  const value = candidate as Partial<CanvasClipboardPayload>;
  if (
    value.source !== CLIPBOARD_SOURCE ||
    value.schemaVersion !== CLIPBOARD_VERSION ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    value.nodes.length === 0 ||
    value.nodes.length > MAX_CLIPBOARD_NODES ||
    value.edges.length > MAX_CLIPBOARD_NODES * 8
  )
    return null;
  if (
    value.nodes.some(
      (node) => !node || typeof node.id !== 'string' || UNSAFE_KEYS.has(node.id),
    ) ||
    value.edges.some(
      (edge) => !edge || typeof edge.id !== 'string' || UNSAFE_KEYS.has(edge.id),
    )
  )
    return null;
  const nodes = Object.fromEntries(value.nodes.map((node) => [node.id, node]));
  const edges = Object.fromEntries(value.edges.map((edge) => [edge.id, edge]));
  if (
    Object.keys(nodes).length !== value.nodes.length ||
    Object.keys(edges).length !== value.edges.length
  )
    return null;
  const parsed = processModelSchema.safeParse({
    schemaVersion: 1,
    id: 'clipboard',
    name: 'Clipboard',
    nodes,
    edges,
  });
  if (!parsed.success) return null;
  if (value.edges.some((edge) => !nodes[edge.source] || !nodes[edge.target])) return null;
  return value as CanvasClipboardPayload;
}

/** Paste is one immutable, undoable model edit; every identity is renewed. */
export function pasteCanvasClipboard(
  model: ProcessModel,
  payload: CanvasClipboardPayload,
  offset: number,
): { model: ProcessModel; nodeIds: string[] } | null {
  if (!Number.isFinite(offset) || offset < 0 || offset > 100_000) return null;
  const nodes = { ...model.nodes };
  const edges = { ...model.edges };
  const idMap = new Map<string, string>();
  for (const original of payload.nodes) {
    const id = createElementId(original.kind, nodes);
    idMap.set(original.id, id);
    const bounds = getNodeBounds(original);
    nodes[id] = {
      ...original,
      id,
      drawioCellId: undefined,
      bounds: { ...bounds, x: bounds.x + offset, y: bounds.y + offset },
      cost: original.cost ? { ...original.cost } : undefined,
    };
  }
  for (const original of payload.nodes) {
    const id = idMap.get(original.id)!;
    const metadata = { ...original.metadata };
    const join = metadata[SEMANTIC_METADATA_KEYS.joinId];
    if (typeof join === 'string') {
      const mappedJoin = idMap.get(join);
      if (mappedJoin) metadata[SEMANTIC_METADATA_KEYS.joinId] = mappedJoin;
      else delete metadata[SEMANTIC_METADATA_KEYS.joinId];
    }
    nodes[id] = {
      ...nodes[id]!,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }
  for (const original of payload.edges) {
    const source = idMap.get(original.source);
    const target = idMap.get(original.target);
    if (!source || !target) continue;
    const id = createElementId('flow', edges);
    edges[id] = {
      ...original,
      id,
      source,
      target,
      drawioCellId: undefined,
      routing: original.routing
        ? {
            ...original.routing,
            waypoints: original.routing.waypoints.map((point) => ({
              x: point.x + offset,
              y: point.y + offset,
            })),
          }
        : undefined,
      metadata: original.metadata ? { ...original.metadata } : undefined,
    };
  }
  return { model: { ...model, nodes, edges }, nodeIds: [...idMap.values()] };
}
