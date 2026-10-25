import {
  SEMANTIC_METADATA_KEYS,
  type ProcessModel,
  type ProcessNodeKind,
} from '@flowculus/process-model';

export type TraceShape = 'rectangle' | 'diamond' | 'ellipse';
export interface TraceCandidate {
  id: string;
  shape: TraceShape;
  kind: ProcessNodeKind;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}
export interface TraceConnector {
  source: string;
  target: string;
  confidence: number;
  kind?: 'sequence' | 'message' | 'association';
}
export interface TraceResult {
  width: number;
  height: number;
  candidates: TraceCandidate[];
  connectors: TraceConnector[];
}

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
  for (const node of Object.values(trace.nodes)) {
    let index = 1;
    while (nodes[`trace-${index}`]) index += 1;
    const id = `trace-${index}`;
    remap.set(node.id, id);
    nodes[id] = {
      ...node,
      id,
      bounds: node.bounds
        ? {
            x: origin.x + node.bounds.x * scale,
            y: origin.y + node.bounds.y * scale,
            width: Math.max(20, node.bounds.width * scale),
            height: Math.max(20, node.bounds.height * scale),
          }
        : undefined,
    };
  }
  for (const edge of Object.values(trace.edges)) {
    const source = remap.get(edge.source);
    const target = remap.get(edge.target);
    if (!source || !target) continue;
    let index = 1;
    while (edges[`trace-flow-${index}`]) index += 1;
    const id = `trace-flow-${index}`;
    edges[id] = { ...edge, id, source, target };
  }
  return { model: { ...current, nodes, edges }, nodeIds: [...remap.values()] };
}

export function classifyContour(
  vertices: Array<{ x: number; y: number }>,
  circularity: number,
): TraceShape | null {
  if (vertices.length === 4) {
    const xs = vertices.map((point) => point.x);
    const ys = vertices.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (width <= 0 || height <= 0) return null;
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
    return corners ? 'rectangle' : 'diamond';
  }
  return vertices.length >= 6 && circularity >= 0.7 ? 'ellipse' : null;
}

const centre = (candidate: TraceCandidate) => ({
  x: candidate.bounds.x + candidate.bounds.width / 2,
  y: candidate.bounds.y + candidate.bounds.height / 2,
});

/** Snaps a segment to two distinct shapes, rejecting loose or ambiguous lines. */
export function snapConnector(
  a: { x: number; y: number },
  b: { x: number; y: number },
  candidates: readonly TraceCandidate[],
  radius = 38,
): TraceConnector | null {
  const nearest = (point: { x: number; y: number }) =>
    candidates
      .map((candidate) => ({
        candidate,
        distance:
          Math.hypot(centre(candidate).x - point.x, centre(candidate).y - point.y) -
          Math.max(candidate.bounds.width, candidate.bounds.height) / 2,
      }))
      .sort((left, right) => left.distance - right.distance)[0];
  const first = nearest(a);
  const second = nearest(b);
  if (
    !first ||
    !second ||
    first.candidate.id === second.candidate.id ||
    first.distance > radius ||
    second.distance > radius
  )
    return null;
  // Direction from a photograph is uncertain without a reliable arrowhead.
  // This left-to-right/top-to-bottom proposal remains explicitly inferred.
  const ca = centre(first.candidate);
  const cb = centre(second.candidate);
  const forward = ca.x < cb.x || (Math.abs(ca.x - cb.x) < 16 && ca.y <= cb.y);
  return {
    source: forward ? first.candidate.id : second.candidate.id,
    target: forward ? second.candidate.id : first.candidate.id,
    confidence: 0.4,
  };
}
