import {
  SEMANTIC_METADATA_KEYS,
  getNodeBounds,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
  type ProcessContainer,
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
  containers?: ProcessContainer[];
}

/** Internal flows are copied only when both endpoint shapes are selected. */
export function makeCanvasClipboard(
  model: ProcessModel,
  nodeIds: readonly string[],
): CanvasClipboardPayload | null {
  const frameIds = new Set(nodeIds.filter((id) => model.containers?.[id]));
  for (const container of Object.values(model.containers ?? {}))
    if (container.parentId && frameIds.has(container.parentId))
      frameIds.add(container.id);
  const selected = new Set([
    ...nodeIds.filter((id) => model.nodes[id]),
    ...Object.values(model.nodes)
      .filter(
        (node) => frameIds.has(node.poolId ?? '') || frameIds.has(node.laneId ?? ''),
      )
      .map((node) => node.id),
  ]);
  if ((selected.size === 0 && frameIds.size === 0) || selected.size > MAX_CLIPBOARD_NODES)
    return null;
  // Include an owning pool for a copied lane so the clipboard remains portable.
  // This does not select the other lanes or their steps.
  const exportedFrames = new Set(frameIds);
  for (const id of frameIds) {
    const parentId = model.containers?.[id]?.parentId;
    if (parentId) exportedFrames.add(parentId);
  }
  return {
    containers: Object.values(model.containers ?? {}).filter((container) =>
      exportedFrames.has(container.id),
    ),
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
    (value.containers != null &&
      (!Array.isArray(value.containers) ||
        value.containers.length > 100 ||
        value.containers.some(
          (container) =>
            !container ||
            typeof container.id !== 'string' ||
            UNSAFE_KEYS.has(container.id),
        ) ||
        new Set(value.containers.map((container) => container.id)).size !==
          value.containers.length)) ||
    (value.nodes.length === 0 && !value.containers?.length) ||
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
    schemaVersion: value.containers?.length ? 2 : 1,
    containers: Object.fromEntries(
      (value.containers ?? []).map((container) => [container.id, container]),
    ),
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
  const containers = { ...model.containers };
  const idMap = new Map<string, string>();
  const frameMap = new Map<string, string>();
  for (const original of (payload.containers ?? []).filter(
    (item) =>
      item.kind === 'pool' ||
      payload.containers?.some((pool) => pool.id === item.parentId),
  ))
    frameMap.set(
      original.id,
      createElementId(original.kind, {
        ...nodes,
        ...containers,
        ...Object.fromEntries([...frameMap.values()].map((id) => [id, true])),
      }),
    );
  for (const original of payload.containers ?? []) {
    const id = frameMap.get(original.id);
    if (!id) continue;
    containers[id] = {
      ...original,
      id,
      processId: original.kind === 'pool' ? `process_${id}` : undefined,
      parentId: original.parentId
        ? (frameMap.get(original.parentId) ??
          (model.containers?.[original.parentId]?.kind === 'pool'
            ? original.parentId
            : undefined))
        : undefined,
      bounds: {
        ...original.bounds,
        x: original.bounds.x + offset,
        y: original.bounds.y + offset,
      },
    };
  }
  for (const original of payload.nodes) {
    const id = createElementId(original.kind, nodes);
    idMap.set(original.id, id);
    const bounds = getNodeBounds(original);
    nodes[id] = {
      ...original,
      id,
      drawioCellId: undefined,
      poolId: original.poolId
        ? (frameMap.get(original.poolId) ??
          (containers[original.poolId]?.kind === 'pool' ? original.poolId : undefined))
        : undefined,
      laneId: original.laneId
        ? (frameMap.get(original.laneId) ??
          (containers[original.laneId]?.kind === 'lane' ? original.laneId : undefined))
        : undefined,
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
  return {
    model: {
      ...model,
      schemaVersion: Object.keys(containers).length ? 2 : model.schemaVersion,
      nodes,
      edges,
      ...(Object.keys(containers).length ? { containers } : {}),
    },
    nodeIds: [...frameMap.values(), ...idMap.values()],
  };
}
