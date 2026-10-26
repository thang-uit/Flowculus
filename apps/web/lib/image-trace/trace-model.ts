import { SEMANTIC_METADATA_KEYS, type ProcessModel } from '@flowculus/process-model';

import type { TraceResult, TraceShape } from './trace-types';
const MIN_TRACE_TASK_SIZE = { width: 120, height: 72 };
export type {
  TraceCandidate,
  TraceConnector,
  TraceResult,
  TraceShape,
} from './trace-types';

/** Geometric candidates are never treated as confirmed BPMN semantics. */
export function traceToProcessModel(result: TraceResult, name: string): ProcessModel {
  const nodes: ProcessModel['nodes'] = {};
  const edges: ProcessModel['edges'] = {};
  for (const candidate of result.candidates) {
    nodes[candidate.id] = {
      id: candidate.id,
      label: candidate.label.trim() || candidate.id,
      kind: candidate.kind,
      gatewayKind: candidate.kind === 'gateway' ? 'xor' : undefined,
      bounds: candidate.bounds,
      metadata: {
        [SEMANTIC_METADATA_KEYS.inferredKind]: true,
        ...(candidate.kind === 'gateway'
          ? { [SEMANTIC_METADATA_KEYS.inferredGatewayKind]: true }
          : {}),
        'flowculus-trace-confidence': candidate.confidence,
      },
    };
  }
  result.connectors.forEach((connector, index) => {
    if (
      !nodes[connector.source] ||
      !nodes[connector.target] ||
      connector.source === connector.target
    )
      return;
    const id = `trace-flow-${index + 1}`;
    edges[id] = {
      id,
      source: connector.source,
      target: connector.target,
      kind: connector.kind ?? 'sequence',
      ...(connector.sourceSide || connector.targetSide
        ? {
            routing: {
              style: 'orthogonal' as const,
              waypoints: [],
              sourceSide: connector.sourceSide,
              targetSide: connector.targetSide,
            },
          }
        : {}),
      metadata: {
        [SEMANTIC_METADATA_KEYS.inferredEdgeKind]: true,
        'flowculus-trace-confidence': connector.confidence,
      },
    };
  });
  return {
    schemaVersion: 1,
    id: `image-trace-${Date.now()}`,
    name: name.trim() || 'Image trace',
    nodes,
    edges,
    metadata: { source: 'image-trace' },
  };
}

/** Adds a reviewed trace as one undoable edit without losing the current diagram. */
export function mergeTracedModel(
  current: ProcessModel,
  trace: ProcessModel,
  scale: number,
  origin: { x: number; y: number } = { x: 0, y: 0 },
): { model: ProcessModel; nodeIds: string[] } {
  const nodes = { ...current.nodes };
  const edges = { ...current.edges };
  const remap = new Map<string, string>();
  let nodeIndex = 1;
  for (const node of Object.values(trace.nodes)) {
    let index = nodeIndex;
    while (nodes[`trace-${index}`]) index += 1;
    const id = `trace-${index}`;
    nodeIndex = index + 1;
    remap.set(node.id, id);
    nodes[id] = {
      ...node,
      id,
      bounds: node.bounds
        ? readableTraceBounds(node.kind, node.bounds, scale, origin)
        : undefined,
    };
  }
  let edgeIndex = 1;
  for (const edge of Object.values(trace.edges)) {
    const source = remap.get(edge.source);
    const target = remap.get(edge.target);
    if (!source || !target) continue;
    let index = edgeIndex;
    while (edges[`trace-flow-${index}`]) index += 1;
    const id = `trace-flow-${index}`;
    edgeIndex = index + 1;
    edges[id] = { ...edge, id, source, target };
  }
  return { model: { ...current, nodes, edges }, nodeIds: [...remap.values()] };
}

/** Keep detected centres while giving task labels and chips enough space. */
function readableTraceBounds(
  kind: ProcessModel['nodes'][string]['kind'],
  bounds: NonNullable<ProcessModel['nodes'][string]['bounds']>,
  scale: number,
  origin: { x: number; y: number },
) {
  const task = kind === 'task' || kind === 'subprocess';
  const minimum = kind === 'gateway' ? 56 : 44;
  const width = Math.max(
    task ? MIN_TRACE_TASK_SIZE.width : minimum,
    bounds.width * scale,
  );
  const height = Math.max(
    task ? MIN_TRACE_TASK_SIZE.height : minimum,
    bounds.height * scale,
  );
  return {
    x: origin.x + (bounds.x + bounds.width / 2) * scale - width / 2,
    y: origin.y + (bounds.y + bounds.height / 2) * scale - height / 2,
    width,
    height,
  };
}

/** Single incoming/outgoing paths suggest endpoint roles, still unconfirmed. */
export function inferTraceEventKinds(result: TraceResult): TraceResult {
  return {
    ...result,
    candidates: result.candidates.map((candidate) => {
      if (candidate.kind !== 'event') return candidate;
      const incoming = result.connectors.filter(
        (edge) => edge.target === candidate.id,
      ).length;
      const outgoing = result.connectors.filter(
        (edge) => edge.source === candidate.id,
      ).length;
      return {
        ...candidate,
        kind:
          incoming === 0 && outgoing === 1
            ? 'start'
            : incoming === 1 && outgoing === 0
              ? 'end'
              : 'event',
      };
    }),
  };
}

export function classifyContour(
  vertices: Array<{ x: number; y: number }>,
  circularity: number,
  tipTolerance = 0.2,
): TraceShape | null {
  if (vertices.length === 4) {
    const xs = vertices.map((point) => point.x);
    const ys = vertices.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (width <= 0 || height <= 0) return null;
    if (vertices.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
      return null;
    const minX = Math.min(...xs),
      minY = Math.min(...ys);
    const aspect = width / height;
    if (aspect < 0.25 || aspect > 5) return null;
    const corners = vertices.every(
      (point) =>
        Math.min(
          Math.abs(point.x - Math.min(...xs)),
          Math.abs(point.x - Math.max(...xs)),
        ) <
          width * 0.2 &&
        Math.min(
          Math.abs(point.y - Math.min(...ys)),
          Math.abs(point.y - Math.max(...ys)),
        ) <
          height * 0.2,
    );
    if (corners) return 'rectangle';
    const tips = [
      { x: minX + width / 2, y: minY },
      { x: minX + width, y: minY + height / 2 },
      { x: minX + width / 2, y: minY + height },
      { x: minX, y: minY + height / 2 },
    ];
    return tips.every((tip) =>
      vertices.some(
        (point) =>
          Math.abs(point.x - tip.x) < width * tipTolerance &&
          Math.abs(point.y - tip.y) < height * tipTolerance,
      ),
    )
      ? 'diamond'
      : null;
  }
  return vertices.length >= 6 && circularity >= 0.7 ? 'ellipse' : null;
}

export { snapConnector } from './connector-snap';
