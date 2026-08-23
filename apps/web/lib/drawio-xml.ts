import {
  isSequenceFlowEdge,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

import type { SemanticShapeTool } from '@/lib/shape-tools';

const setAttributeIfDefined = (
  element: Element,
  name: string,
  value: string | number | undefined,
) => {
  if (value == null || value === '') element.removeAttribute(name);
  else element.setAttribute(name, String(value));
};

/** Updates Flowculus metadata without touching draw.io geometry or styles. */
export const patchDrawioXmlForNode = (xml: string, node: ProcessNode): string => {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined')
    return xml;
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const candidates: Element[] = [
    ...Array.from(document.getElementsByTagName('object')),
    ...Array.from(document.getElementsByTagName('mxCell')),
  ];
  const ids = new Set([node.id, node.drawioCellId].filter(Boolean));
  const element = candidates.find((candidate) =>
    ids.has(candidate.getAttribute('id') ?? ''),
  );
  if (!element) return xml;

  setAttributeIfDefined(element, 'label', node.label);
  if (element.tagName === 'mxCell') setAttributeIfDefined(element, 'value', node.label);
  setAttributeIfDefined(element, 'flowculus-kind', node.kind);
  setAttributeIfDefined(element, 'flowculus-gateway-kind', node.gatewayKind);
  setAttributeIfDefined(element, 'flowculus-duration-minutes', node.durationMinutes);
  setAttributeIfDefined(element, 'flowculus-processing-minutes', node.processingMinutes);
  setAttributeIfDefined(element, 'flowculus-waiting-minutes', node.waitingMinutes);
  setAttributeIfDefined(element, 'flowculus-rework-probability', node.reworkProbability);
  setAttributeIfDefined(
    element,
    'flowculus-resource-rate-per-hour',
    node.cost?.resourceRatePerHour,
  );
  setAttributeIfDefined(
    element,
    'flowculus-other-cost-per-execution',
    node.cost?.otherCostPerExecution,
  );
  setAttributeIfDefined(element, 'flowculus-resource-pool-id', node.cost?.resourcePoolId);
  setAttributeIfDefined(element, 'flowculus-resource-count', node.cost?.resourceCount);
  setAttributeIfDefined(element, 'flowculus-currency', node.cost?.currency);

  return new XMLSerializer().serializeToString(document);
};

export const patchDrawioXmlForEdge = (
  xml: string,
  edgeId: string,
  probability: number | undefined,
): string => {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined')
    return xml;
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const candidates: Element[] = [
    ...Array.from(document.getElementsByTagName('object')),
    ...Array.from(document.getElementsByTagName('mxCell')),
  ];
  const element = candidates.find(
    (candidate) =>
      candidate.getAttribute('id') === edgeId ||
      candidate.getAttribute('drawioCellId') === edgeId,
  );
  if (!element) return xml;
  setAttributeIfDefined(
    element,
    'flowculus-probability',
    probability == null ? undefined : probability,
  );
  return new XMLSerializer().serializeToString(document);
};

interface SemanticShapeDefinition {
  kind: ProcessNode['kind'];
  gatewayKind?: ProcessNode['gatewayKind'];
  style: string;
  width: number;
  height: number;
  shapeName: string;
  reworkRole?: boolean;
}

const SEMANTIC_SHAPE_DEFINITIONS: Record<SemanticShapeTool, SemanticShapeDefinition> = {
  start: {
    kind: 'start',
    style: 'ellipse;whiteSpace=wrap;html=1;fillColor=#d09a14;strokeColor=#a87300;',
    width: 56,
    height: 56,
    shapeName: 'start-event',
  },
  task: {
    kind: 'task',
    style: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#c0c9d2;',
    width: 160,
    height: 88,
    shapeName: 'task',
  },
  xor: {
    kind: 'gateway',
    gatewayKind: 'xor',
    style:
      'shape=mxgraph.bpmn.gateway2;gwType=exclusive;outline=none;whiteSpace=wrap;html=1;fillColor=#fff3c7;strokeColor=#a87300;',
    width: 90,
    height: 90,
    shapeName: 'exclusive-gateway',
  },
  and: {
    kind: 'gateway',
    gatewayKind: 'and',
    style:
      'shape=mxgraph.bpmn.gateway2;gwType=parallel;outline=none;whiteSpace=wrap;html=1;fillColor=#fff3c7;strokeColor=#a87300;',
    width: 90,
    height: 90,
    shapeName: 'parallel-gateway',
  },
  or: {
    kind: 'gateway',
    gatewayKind: 'or',
    // draw.io's native BPMN gateway stencil has no inclusive-OR variant;
    // retain a clean rhombus and the explicit Flowculus gateway metadata.
    style: 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff3c7;strokeColor=#a87300;',
    width: 90,
    height: 90,
    shapeName: 'inclusive-gateway',
  },
  eventBased: {
    kind: 'gateway',
    gatewayKind: 'eventBased',
    style:
      'shape=mxgraph.bpmn.gateway2;gwType=event;outline=catching;symbol=multiple;whiteSpace=wrap;html=1;fillColor=#fff3c7;strokeColor=#a87300;',
    width: 90,
    height: 90,
    shapeName: 'event-based-gateway',
  },
  complex: {
    kind: 'gateway',
    gatewayKind: 'complex',
    style:
      'shape=mxgraph.bpmn.gateway2;gwType=complex;outline=none;whiteSpace=wrap;html=1;fillColor=#fff3c7;strokeColor=#a87300;',
    width: 90,
    height: 90,
    shapeName: 'complex-gateway',
  },
  end: {
    kind: 'end',
    style:
      'ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a87300;',
    width: 64,
    height: 64,
    shapeName: 'end-event',
  },
  event: {
    kind: 'event',
    style:
      'ellipse;dashed=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a87300;',
    width: 58,
    height: 58,
    shapeName: 'intermediate-event',
  },
  subprocess: {
    kind: 'subprocess',
    style:
      'rounded=1;container=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#c0c9d2;',
    width: 170,
    height: 96,
    shapeName: 'subprocess',
  },
  data: {
    kind: 'data',
    style:
      'shape=parallelogram;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#c0c9d2;',
    width: 140,
    height: 78,
    shapeName: 'data-object',
  },
  annotation: {
    kind: 'annotation',
    style: 'shape=note;whiteSpace=wrap;html=1;fillColor=#fffdf2;strokeColor=#c0c9d2;',
    width: 150,
    height: 84,
    shapeName: 'annotation',
  },
  rework: {
    kind: 'task',
    style:
      'rounded=1;dashed=1;whiteSpace=wrap;html=1;fillColor=#fffdf2;strokeColor=#a87300;',
    width: 160,
    height: 88,
    shapeName: 'rework-task',
    reworkRole: true,
  },
};

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const formatProbabilityLabel = (probability: number | undefined): string | undefined =>
  probability == null ? undefined : `p = ${Number(probability.toFixed(4))}`;

const toolForNode = (node: ProcessNode): SemanticShapeTool => {
  if (node.kind === 'gateway') return node.gatewayKind ?? 'xor';
  if (node.kind === 'start') return 'start';
  if (node.kind === 'end') return 'end';
  if (node.kind === 'event') return 'event';
  if (node.kind === 'subprocess') return 'subprocess';
  if (node.kind === 'data') return 'data';
  if (node.kind === 'annotation') return 'annotation';
  return 'task';
};

const nodeDefinitionFor = (node: ProcessNode): SemanticShapeDefinition => {
  const tool = toolForNode(node);
  return SEMANTIC_SHAPE_DEFINITIONS[tool] ?? SEMANTIC_SHAPE_DEFINITIONS.task;
};

const edgeStyleFor = (kind: ProcessEdge['kind']): string => {
  if (kind === 'message')
    return 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=open;';
  if (kind === 'association')
    return 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=none;';
  if (kind === 'unknown')
    return 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=block;';
  return 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;';
};

interface NodePosition {
  x: number;
  y: number;
}

/**
 * Gives imported CSV models a readable left-to-right flow. Ranks follow
 * sequence-flow distance from an entry node, while nodes sharing a rank are
 * stacked with enough room for branch labels. Cycles and disconnected
 * fragments fall back to deterministic insertion order instead of blocking
 * import.
 */
const layoutProcessNodes = (model: ProcessModel): Map<string, NodePosition> => {
  const nodes = Object.values(model.nodes);
  const positions = new Map<string, NodePosition>();
  if (nodes.length === 0) return positions;

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incoming.set(node.id, 0);
  });
  Object.values(model.edges).forEach((edge) => {
    if (
      !isSequenceFlowEdge(edge) ||
      !model.nodes[edge.source] ||
      !model.nodes[edge.target]
    )
      return;
    outgoing.get(edge.source)?.push(edge.target);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  });

  const ranks = new Map<string, number>();
  const queue = nodes
    .filter((node) => node.kind === 'start' || (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  if (queue.length === 0) queue.push(nodes[0]?.id ?? '');
  queue.forEach((id) => ranks.set(id, 0));

  for (let index = 0; index < queue.length; index += 1) {
    const sourceId = queue[index];
    const sourceRank = ranks.get(sourceId) ?? 0;
    for (const targetId of outgoing.get(sourceId) ?? []) {
      const nextRank = sourceRank + 1;
      if ((ranks.get(targetId) ?? -1) < nextRank) ranks.set(targetId, nextRank);
      if (!queue.includes(targetId)) queue.push(targetId);
    }
  }

  nodes.forEach((node, index) => {
    if (!ranks.has(node.id))
      ranks.set(node.id, Math.max(...ranks.values(), 0) + index + 1);
  });

  const columns = new Map<number, ProcessNode[]>();
  nodes.forEach((node) => {
    const rank = ranks.get(node.id) ?? 0;
    const column = columns.get(rank) ?? [];
    column.push(node);
    columns.set(rank, column);
  });

  for (const [rank, column] of [...columns.entries()].sort(
    ([left], [right]) => left - right,
  )) {
    const totalHeight =
      column.reduce((sum, node) => sum + (node.kind === 'gateway' ? 100 : 96), 0) +
      Math.max(0, column.length - 1) * 34;
    let y = Math.max(96, 470 - totalHeight / 2);
    column.forEach((node) => {
      const height = node.kind === 'gateway' ? 90 : node.kind === 'end' ? 64 : 88;
      positions.set(node.id, { x: 80 + rank * 230, y: Math.round(y) });
      y += height + 34;
    });
  }
  return positions;
};

const nodeAttributesFor = (node: ProcessNode): string => {
  const attributes: Array<[string, string | number | undefined]> = [
    ['id', node.id],
    ['label', node.label],
    ['flowculus-kind', node.kind],
    ['flowculus-shape', nodeDefinitionFor(node).shapeName],
    ['flowculus-gateway-kind', node.gatewayKind],
    ['flowculus-duration-minutes', node.durationMinutes],
    ['flowculus-processing-minutes', node.processingMinutes],
    ['flowculus-waiting-minutes', node.waitingMinutes],
    ['flowculus-rework-probability', node.reworkProbability],
    ['flowculus-resource-rate-per-hour', node.cost?.resourceRatePerHour],
    ['flowculus-other-cost-per-execution', node.cost?.otherCostPerExecution],
    ['flowculus-resource-pool-id', node.cost?.resourcePoolId],
    ['flowculus-resource-count', node.cost?.resourceCount],
    ['flowculus-currency', node.cost?.currency],
  ];
  return attributes
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}="${escapeXml(String(value))}"`)
    .join(' ');
};

/**
 * Creates a clean native draw.io document from a semantic model. This is used
 * for CSV imports so imported data opens in both Flowculus and diagrams.net.
 * The layout is intentionally deterministic; users can refine it with the
 * native draw.io arrange tools after import.
 */
export const processModelToDrawioXml = (model: ProcessModel): string => {
  const nodes = Object.values(model.nodes);
  const positions = layoutProcessNodes(model);
  const nodeXml = nodes
    .map((node) => {
      const definition = nodeDefinitionFor(node);
      const position = positions.get(node.id) ?? { x: 80, y: 96 };
      const x = position.x;
      const y = position.y;
      return `<object ${nodeAttributesFor(node)}><mxCell style="${definition.style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${definition.width}" height="${definition.height}" as="geometry" /></mxCell></object>`;
    })
    .join('');
  const edgeXml = Object.values(model.edges)
    .filter((edge) => model.nodes[edge.source] && model.nodes[edge.target])
    .map((edge) => {
      const probabilityLabel = formatProbabilityLabel(edge.probability);
      const label = [edge.condition, probabilityLabel].filter(Boolean).join(' · ');
      const attributes: Array<[string, string | undefined]> = [
        ['id', edge.id],
        ['label', label || undefined],
        ['flowculus-kind', edge.kind ?? 'sequence'],
        ['flowculus-condition', edge.condition],
        ['flowculus-probability', edge.probability?.toString()],
        ['flowculus-rework-probability', edge.reworkProbability?.toString()],
      ];
      const serializedAttributes = attributes
        .filter(([, value]) => value != null && value !== '')
        .map(([key, value]) => `${key}="${escapeXml(value ?? '')}"`)
        .join(' ');
      return `<object ${serializedAttributes}><mxCell edge="1" parent="1" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}" style="${edgeStyleFor(edge.kind)}"><mxGeometry relative="1" as="geometry" /></mxCell></object>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><mxfile host="Flowculus" type="device"><diagram id="${escapeXml(model.id)}" name="${escapeXml(model.name || 'Imported process')}"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1400" pageHeight="900" math="0" shadow="0"><root><mxCell id="0" /><mxCell id="1" parent="0" />${nodeXml}${edgeXml}</root></mxGraphModel></diagram></mxfile>`;
};

const createShapeId = (document: Document, tool: SemanticShapeTool): string => {
  const existingIds = new Set(
    Array.from(document.getElementsByTagName('*'))
      .map((element) => element.getAttribute('id'))
      .filter((id): id is string => Boolean(id)),
  );
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let candidate = `flowculus-${tool}-${randomPart}`;
  let suffix = 2;
  while (existingIds.has(candidate))
    candidate = `flowculus-${tool}-${randomPart}-${suffix++}`;
  return candidate;
};

interface ShapeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeInsertPosition {
  x: number;
  y: number;
}

const readNumberAttribute = (element: Element, name: string): number | null => {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : null;
};

const getVertexRectangles = (document: Document): ShapeRectangle[] => {
  const rectangles: ShapeRectangle[] = [];
  for (const cell of Array.from(document.getElementsByTagName('mxCell'))) {
    if (cell.getAttribute('vertex') !== '1') continue;
    const geometry = cell.getElementsByTagName('mxGeometry')[0];
    if (!geometry) continue;
    const x = readNumberAttribute(geometry, 'x');
    const y = readNumberAttribute(geometry, 'y');
    const width = readNumberAttribute(geometry, 'width');
    const height = readNumberAttribute(geometry, 'height');
    if (x == null || y == null || width == null || height == null) continue;
    rectangles.push({ x, y, width, height });
  }
  return rectangles;
};

const overlaps = (left: ShapeRectangle, right: ShapeRectangle, padding = 24): boolean =>
  left.x < right.x + right.width + padding &&
  left.x + left.width + padding > right.x &&
  left.y < right.y + right.height + padding &&
  left.y + left.height + padding > right.y;

/**
 * Pick the first free slot inside the normal draw.io page area. The old
 * implementation counted edge geometries and regularly placed new shapes
 * below the visible page, which made a click look like it did nothing.
 */
const getNextShapePosition = (
  document: Document,
  width: number,
  height: number,
): { x: number; y: number } => {
  const occupied = getVertexRectangles(document);
  const columns = 7;
  const rows = 5;
  const columnGap = 190;
  const rowGap = 135;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const candidate = {
        x: 80 + column * columnGap,
        y: 90 + row * rowGap,
        width,
        height,
      };
      if (!occupied.some((rectangle) => overlaps(candidate, rectangle))) {
        return { x: candidate.x, y: candidate.y };
      }
    }
  }

  const lowest = occupied.reduce(
    (max, rectangle) => Math.max(max, rectangle.y + rectangle.height),
    90,
  );
  return { x: 80, y: lowest + 40 };
};

/**
 * Inserts a semantic node while preserving draw.io's native XML structure.
 * The caller can then load the returned XML through the embed protocol; draw.io
 * still owns rendering, selection, undo and connector routing.
 */
export const insertSemanticShapeIntoXml = (
  xml: string,
  tool: SemanticShapeTool,
  label: string,
  requestedPosition?: ShapeInsertPosition,
): { xml: string; id: string } | null => {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined')
    return null;
  const definition = SEMANTIC_SHAPE_DEFINITIONS[tool];
  if (!definition) return null;

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const root = document.getElementsByTagName('root')[0];
  if (!root) return null;

  const id = createShapeId(document, tool);
  const position = requestedPosition
    ? {
        x: Math.max(20, Math.round(requestedPosition.x)),
        y: Math.max(20, Math.round(requestedPosition.y)),
      }
    : getNextShapePosition(document, definition.width, definition.height);
  const object = document.createElement('object');
  object.setAttribute('id', id);
  object.setAttribute('label', label);
  object.setAttribute('flowculus-kind', definition.kind);
  object.setAttribute('flowculus-shape', definition.shapeName);
  if (definition.gatewayKind) {
    object.setAttribute('flowculus-gateway-kind', definition.gatewayKind);
  }
  if (definition.reworkRole) object.setAttribute('flowculus-role', 'rework');

  const cell = document.createElement('mxCell');
  cell.setAttribute('style', definition.style);
  cell.setAttribute('vertex', '1');
  cell.setAttribute('parent', '1');
  const geometry = document.createElement('mxGeometry');
  geometry.setAttribute('x', String(position.x));
  geometry.setAttribute('y', String(position.y));
  geometry.setAttribute('width', String(definition.width));
  geometry.setAttribute('height', String(definition.height));
  geometry.setAttribute('as', 'geometry');
  cell.append(geometry);
  object.append(cell);
  root.append(object);

  return { xml: new XMLSerializer().serializeToString(document), id };
};
