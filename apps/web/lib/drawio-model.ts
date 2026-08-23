import {
  getActivePageIndex,
  type DrawioJsonCell,
  type DrawioJsonExport,
} from '@flowculus/drawio-adapter';
import type {
  GatewayKind,
  ProcessModel,
  ProcessNodeKind,
  ProcessMetadataValue,
} from '@flowculus/process-model';
import type { ProcessEdge } from '@flowculus/process-model';

const NODE_KINDS = new Set<ProcessNodeKind>([
  'start',
  'task',
  'gateway',
  'end',
  'event',
  'subprocess',
  'data',
  'annotation',
  'unknown',
]);
const GATEWAY_KINDS = new Set<GatewayKind>(['xor', 'and', 'or', 'eventBased', 'complex']);
const MAX_DECOMPRESSED_XML_BYTES = 50 * 1024 * 1024;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeKey = (key: string): string =>
  key
    .replace(/^flowculus[-_:]?/i, '')
    .replace(/[-_]/g, '')
    .toLowerCase();

/**
 * Draw.io JSON only exposes custom attributes from object/UserObject cells.
 * Native BPMN diagrams often keep their semantic hints directly on mxCell,
 * so the XML fallback must retain the common attributes as well.
 */
const XML_SEMANTIC_ATTRIBUTES = new Set([
  'nodetype',
  'gatewaytype',
  'durationmin',
  'durationminutes',
  'processingmin',
  'processingminutes',
  'waitingmin',
  'waitingminutes',
  'probability',
  'condition',
  'flowtype',
  'reworkprobability',
  'resource',
  'resourcepool',
  'resourcepoolid',
  'resourcecount',
  'costperexecution',
  'resourcerateperhour',
  'hourlyrate',
  'currency',
  'type',
]);

const getMetadata = (cell: DrawioJsonCell): Record<string, ProcessMetadataValue> => {
  const metadata: Record<string, ProcessMetadataValue> = {};
  const addMetadata = (key: string, value: unknown) => {
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    )
      return;
    metadata[key] = value;
    metadata[normalizeKey(key)] = value;
  };
  Object.entries(cell.metadata ?? {}).forEach(([key, value]) => addMetadata(key, value));
  // A few integrations emit custom cell attributes at the top level instead
  // of nesting them under `metadata`. Keep structural JSON fields out of the
  // semantic map while accepting those exports as well.
  Object.entries(cell as unknown as Record<string, unknown>).forEach(([key, value]) => {
    if (
      [
        'id',
        'type',
        'parent',
        'source',
        'target',
        'label',
        'html',
        'style',
        'value',
        'metadata',
      ].includes(key)
    )
      return;
    addMetadata(key, value);
  });
  return metadata;
};

interface XmlCellHints {
  label?: string;
  style?: string;
  metadata: Record<string, ProcessMetadataValue>;
}

/**
 * Draw.io's JSON export exposes semantic metadata but not every visual style
 * attribute. Reading the embedded XML as a secondary hint lets us recognise
 * native BPMN gateways/events without changing the native document or making
 * a silent guess when the shape is genuinely unknown.
 */
const readXmlCellHints = (xml: string | undefined): Map<string, XmlCellHints> => {
  const hints = new Map<string, XmlCellHints>();
  if (!xml || typeof DOMParser === 'undefined') return hints;
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  for (const element of Array.from(document.getElementsByTagName('*'))) {
    const id = element.getAttribute('id');
    if (!id) continue;
    const metadata: Record<string, ProcessMetadataValue> = {};
    for (const attribute of Array.from(element.attributes)) {
      if (
        attribute.name.toLowerCase().startsWith('flowculus-') ||
        XML_SEMANTIC_ATTRIBUTES.has(normalizeKey(attribute.name))
      ) {
        metadata[attribute.name] = attribute.value;
        metadata[normalizeKey(attribute.name)] = attribute.value;
      }
    }
    const nestedCell =
      element.tagName === 'mxCell'
        ? element
        : (element.getElementsByTagName('mxCell')[0] ?? null);
    const nestedMetadata = nestedCell
      ? Array.from(nestedCell.attributes).reduce<Record<string, ProcessMetadataValue>>(
          (result, attribute) => {
            if (
              attribute.name.toLowerCase().startsWith('flowculus-') ||
              XML_SEMANTIC_ATTRIBUTES.has(normalizeKey(attribute.name))
            ) {
              result[attribute.name] = attribute.value;
              result[normalizeKey(attribute.name)] = attribute.value;
            }
            return result;
          },
          {},
        )
      : {};
    hints.set(id, {
      label:
        element.getAttribute('label') ??
        element.getAttribute('value') ??
        nestedCell?.getAttribute('value') ??
        undefined,
      style:
        element.getAttribute('style') ?? nestedCell?.getAttribute('style') ?? undefined,
      metadata: { ...nestedMetadata, ...metadata },
    });
  }
  return hints;
};

const mergeMetadata = (
  cell: DrawioJsonCell,
  xmlHints: XmlCellHints | undefined,
): Record<string, ProcessMetadataValue> => {
  const metadata = getMetadata(cell);
  Object.entries(xmlHints?.metadata ?? {}).forEach(([key, value]) => {
    metadata[key] = value;
    metadata[normalizeKey(key)] = value;
  });
  return metadata;
};

const getMetadataString = (
  metadata: Record<string, ProcessMetadataValue>,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = metadata[key] ?? metadata[normalizeKey(key)];
    const stringValue = asString(value);
    if (stringValue) return stringValue;
  }
  return undefined;
};

const getMetadataNumber = (
  metadata: Record<string, ProcessMetadataValue>,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = metadata[key] ?? metadata[normalizeKey(key)];
    const numberValue = asNumber(value);
    if (numberValue != null) return numberValue;
  }
  return undefined;
};

const getStyleValue = (style: string, key: string): string | undefined => {
  const match = style.match(new RegExp(`(?:^|;)${key}=([^;]*)`, 'i'));
  return match?.[1]?.trim() || undefined;
};

const inferNodeKind = (
  cell: DrawioJsonCell,
  metadata: Record<string, ProcessMetadataValue>,
  style = '',
) => {
  const explicit = getMetadataString(
    metadata,
    'kind',
    'node-kind',
    'semantic-kind',
    'nodeType',
    'node-type',
  );
  if (explicit) {
    const normalizedExplicit = normalizeKey(explicit);
    if (NODE_KINDS.has(normalizedExplicit as ProcessNodeKind)) {
      if (normalizedExplicit !== 'event') return normalizedExplicit as ProcessNodeKind;
      // Native draw.io uses nodeType="event" for both start and end events.
      // Continue with style/label inference so those two remain distinguishable.
    }
    if (normalizedExplicit === 'gateway') return 'gateway';
    if (normalizedExplicit === 'task' || normalizedExplicit === 'activity') return 'task';
  }

  const shape = (
    getMetadataString(metadata, 'shape', 'bpmn-shape') ?? style
  ).toLowerCase();
  const label = (cell.label ?? '').trim().toLowerCase();
  const gatewayBackground = getStyleValue(style, 'background')?.toLowerCase();
  const gatewayType = getStyleValue(style, 'gwType')?.toLowerCase();
  const gatewaySymbol = getStyleValue(style, 'symbol')?.toLowerCase();
  const eventType = getStyleValue(style, 'eventType')?.toLowerCase();
  const eventOutline = getStyleValue(style, 'outline')?.toLowerCase();
  const isBpmnEventShape = shape.includes('bpmn.event') || shape.includes('bpmnevent');
  const normalizedShape = shape.replace(/[_\-\s]/g, '');
  const hasEventOutline = eventOutline != null && eventOutline !== 'none';
  if (/^text(?:;|$)/.test(shape.trim()) || /^text(?:;|$)/.test(style.trim()))
    return 'annotation';
  if (
    gatewayBackground === 'gateway' ||
    gatewayType != null ||
    gatewaySymbol?.includes('gw') ||
    shape.includes('gateway') ||
    shape.includes('rhombus') ||
    /\b(xor|and|or|parallel|inclusive)\b/.test(label)
  )
    return 'gateway';
  if (
    eventType === 'start' ||
    eventOutline === 'start' ||
    normalizedShape.includes('generalstart') ||
    shape.includes('startevent') ||
    shape.includes('start-event') ||
    /eventtype\s*=\s*start/.test(shape) ||
    /\bstart\b/.test(shape) ||
    /^(start|begin|entry)( event| point)?$/.test(label)
  )
    return 'start';
  if (
    eventType === 'end' ||
    eventOutline === 'end' ||
    eventOutline === 'throwing' ||
    (isBpmnEventShape && eventOutline === 'throwing') ||
    shape.includes('endevent') ||
    normalizedShape.includes('generalend') ||
    shape.includes('end-event') ||
    shape.includes('doubleellipse') ||
    /eventtype\s*=\s*end/.test(shape) ||
    /\bend\b/.test(shape) ||
    /^(end|finish|exit)( event| point)?$/.test(label)
  )
    return 'end';
  if (shape.includes('annotation') || shape.includes('note')) return 'annotation';
  if (shape.includes('data') || shape.includes('parallelogram')) return 'data';
  if (shape.includes('subprocess') || shape.includes('callactivity')) return 'subprocess';
  if (
    eventType != null ||
    hasEventOutline ||
    isBpmnEventShape ||
    shape.includes('event') ||
    shape.includes('ellipse')
  )
    return 'event';
  return 'task';
};

const inferGatewayKind = (
  cell: DrawioJsonCell,
  metadata: Record<string, ProcessMetadataValue>,
  style = '',
): GatewayKind | undefined => {
  const explicit = getMetadataString(
    metadata,
    'gateway-kind',
    'gatewayKind',
    'gateway',
    'gatewayType',
    'gateway-type',
  );
  const normalizeGatewayKind = (value: string): GatewayKind | undefined => {
    const normalized = normalizeKey(value);
    if (normalized.startsWith('eventbased') || normalized.startsWith('event'))
      return 'eventBased';
    if (normalized.startsWith('complex')) return 'complex';
    if (normalized.startsWith('inclusive') || normalized === 'or') return 'or';
    if (normalized.startsWith('parallel') || normalized === 'and') return 'and';
    if (normalized.startsWith('exclusive') || normalized.startsWith('xor')) return 'xor';
    return GATEWAY_KINDS.has(normalized as GatewayKind)
      ? (normalized as GatewayKind)
      : undefined;
  };
  if (explicit) {
    const explicitKind = normalizeGatewayKind(explicit);
    if (explicitKind) return explicitKind;
  }
  const styleTokens = [
    getStyleValue(style, 'gwType'),
    getStyleValue(style, 'symbol'),
  ].filter((value): value is string => Boolean(value));
  for (const styleToken of styleTokens) {
    const styleKind = normalizeGatewayKind(styleToken);
    if (styleKind) return styleKind;
  }
  const styleType = styleTokens.join(' ').toLowerCase();
  const label = `${cell.label ?? ''} ${style} ${styleType}`.toLowerCase();
  if (/(^|[^a-z])event(?:based)?([^a-z]|$)/.test(label)) return 'eventBased';
  if (/(^|[^a-z])complex([^a-z]|$)/.test(label)) return 'complex';
  if (/(^|[^a-z])(inclusive|or)([^a-z]|$)/.test(label)) return 'or';
  if (/(^|[^a-z])(and|parallel)([^a-z]|$)/.test(label)) return 'and';
  if (/(^|[^a-z])(exclusive|xor)([^a-z]|$)/.test(label)) return 'xor';
  return 'xor';
};

const stripMarkup = (value: string): string =>
  value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const escapeXmlValue = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const getTaskDuration = (metadata: Record<string, ProcessMetadataValue>) =>
  getMetadataNumber(
    metadata,
    'duration-minutes',
    'durationMinutes',
    'durationMin',
    'duration',
    'cycle-time-minutes',
    'cycleTime',
  );

const getProcessingTime = (metadata: Record<string, ProcessMetadataValue>) =>
  getMetadataNumber(
    metadata,
    'processing-minutes',
    'processingMinutes',
    'processingMin',
    'processing-time',
  );

const hasExplicitSemanticMetadata = (
  metadata: Record<string, ProcessMetadataValue>,
): boolean =>
  Boolean(
    getMetadataString(
      metadata,
      'kind',
      'node-kind',
      'semantic-kind',
      'nodeType',
      'node-type',
      'gateway-kind',
      'gatewayKind',
      'gatewayType',
      'gateway-type',
      'flowculus-shape',
    ),
  );

const isPresentationOnlyNode = (
  cell: DrawioJsonCell,
  metadata: Record<string, ProcessMetadataValue>,
  incidentNodeIds: Set<string>,
): boolean => {
  if (incidentNodeIds.has(cell.id) || hasExplicitSemanticMetadata(metadata)) return false;
  const style = cell.style ?? '';
  const label = stripMarkup(cell.label ?? cell.value ?? '').toLowerCase();
  const id = cell.id.toLowerCase();
  // Unconnected text boxes and legend examples are visual documentation, not
  // process activities. Keep explicitly typed standalone data/annotations,
  // while preventing them from inflating the analysis graph.
  return (
    style.toLowerCase().includes('text;') ||
    /^(legend|title|subtitle|formula|note|chú giải|công thức)/.test(id) ||
    /^(legend|title|subtitle|formula|note|chú giải|công thức)/.test(label)
  );
};

const inferEdgeKind = (
  metadata: Record<string, ProcessMetadataValue>,
  style = '',
): NonNullable<ProcessEdge['kind']> => {
  const explicit = getMetadataString(
    metadata,
    'kind',
    'flow-kind',
    'flowType',
    'flow-type',
    'edgeType',
    'edge-type',
  );
  const value = (explicit ?? '').toLowerCase().replace(/[-_\s]/g, '');
  if (value === 'message' || value === 'messageflow') return 'message';
  if (
    value === 'association' ||
    value === 'associationflow' ||
    value === 'dataassociation'
  )
    return 'association';
  if (
    value === 'sequence' ||
    value === 'sequenceflow' ||
    value === 'controlflow' ||
    value === 'control' ||
    value === 'flow' ||
    value === 'exclusive' ||
    value === 'exclusiveflow' ||
    value === 'xorsplit' ||
    value === 'xorjoin' ||
    value === 'xor' ||
    value === 'parallel' ||
    value === 'parallelflow' ||
    value === 'andsplit' ||
    value === 'andjoin' ||
    value === 'and' ||
    value === 'inclusive' ||
    value === 'inclusiveflow' ||
    value === 'orsplit' ||
    value === 'orjoin' ||
    value === 'or'
  )
    return 'sequence';

  const normalizedStyle = style.toLowerCase();
  if (
    normalizedStyle.includes('messageflow') ||
    (getStyleValue(style, 'dashed') === '1' && normalizedStyle.includes('endarrow=oval'))
  )
    return 'message';
  if (
    normalizedStyle.includes('association') ||
    (normalizedStyle.includes('link=') && normalizedStyle.includes('dashed=1'))
  )
    return 'association';
  return 'sequence';
};

export const drawioJsonToProcessModel = (
  exported: DrawioJsonExport,
  name = 'Imported draw.io process',
): ProcessModel => {
  const activePageIndex = getActivePageIndex(exported);
  const page = exported.pages[activePageIndex] ?? exported.pages[0];
  const cells = page?.cells ?? [];
  const xmlHints = readXmlCellHints(exported.data);
  const edgeCells = cells.filter((cell) => cell.type === 'edge');
  const incidentNodeIds = new Set<string>();
  edgeCells.forEach((cell) => {
    if (cell.source) incidentNodeIds.add(cell.source);
    if (cell.target) incidentNodeIds.add(cell.target);
  });
  const nodeCells = cells.filter((cell) => {
    if (cell.type !== 'node' && cell.type !== 'group') return false;
    const metadata = mergeMetadata(cell, xmlHints.get(cell.id));
    return !isPresentationOnlyNode(cell, metadata, incidentNodeIds);
  });
  const nodes: ProcessModel['nodes'] = {};
  const edges: ProcessModel['edges'] = {};

  nodeCells.forEach((cell) => {
    const hints = xmlHints.get(cell.id);
    const metadata = mergeMetadata(cell, hints);
    const hydratedCell = {
      ...cell,
      label: cell.label ?? hints?.label ?? cell.value,
      style: cell.style ?? hints?.style,
    };
    const kind = inferNodeKind(hydratedCell, metadata, hydratedCell.style ?? '');
    const explicitKind = getMetadataString(
      metadata,
      'kind',
      'node-kind',
      'semantic-kind',
      'nodeType',
      'node-type',
    );
    if (!explicitKind) metadata['flowculus-inferred-kind'] = true;
    const explicitGatewayKind = getMetadataString(
      metadata,
      'gateway-kind',
      'gatewayKind',
      'gateway',
      'gatewayType',
      'gateway-type',
    );
    if (kind === 'gateway' && !explicitGatewayKind) {
      metadata['flowculus-inferred-gateway-kind'] = true;
    }
    const durationMinutes = getTaskDuration(metadata);
    const processingMinutes = getProcessingTime(metadata);
    const waitingMinutes = getMetadataNumber(
      metadata,
      'waiting-minutes',
      'waitingMinutes',
      'waitingMin',
      'wait',
    );
    const resourceRatePerHour = getMetadataNumber(
      metadata,
      'resource-rate-per-hour',
      'resourceRatePerHour',
      'hourly-rate',
      'hourlyRate',
    );
    const otherCostPerExecution = getMetadataNumber(
      metadata,
      'other-cost-per-execution',
      'otherCostPerExecution',
      'costPerExecution',
      'other-cost',
    );
    const reworkProbability = getMetadataNumber(
      metadata,
      'rework-probability',
      'reworkProbability',
      'rework',
    );
    const resourcePoolId = getMetadataString(
      metadata,
      'resource-pool-id',
      'resourcePoolId',
      'resourcePool',
      'resource',
      'pool',
    );
    const resourceCount = getMetadataNumber(
      metadata,
      'resource-count',
      'resourceCount',
      'pool-size',
    );

    nodes[cell.id] = {
      id: cell.id,
      drawioCellId: cell.id,
      label: stripMarkup(hydratedCell.label ?? cell.id),
      kind,
      gatewayKind:
        kind === 'gateway'
          ? inferGatewayKind(hydratedCell, metadata, hydratedCell.style ?? '')
          : undefined,
      durationMinutes,
      processingMinutes,
      waitingMinutes,
      reworkProbability,
      cost:
        resourceRatePerHour != null ||
        otherCostPerExecution != null ||
        resourcePoolId ||
        resourceCount != null
          ? {
              resourceRatePerHour,
              otherCostPerExecution,
              resourcePoolId,
              resourceCount,
              currency: getMetadataString(metadata, 'currency') ?? 'USD',
            }
          : undefined,
      metadata,
    };
  });

  edgeCells.forEach((cell) => {
    if (!cell.source || !cell.target) return;
    const metadata = mergeMetadata(cell, xmlHints.get(cell.id));
    const probability = getMetadataNumber(
      metadata,
      'probability',
      'branch-probability',
      'branchProbability',
    );
    const reworkProbability = getMetadataNumber(
      metadata,
      'rework-probability',
      'reworkProbability',
    );
    const edgeKind = inferEdgeKind(metadata, xmlHints.get(cell.id)?.style ?? cell.style);
    edges[cell.id] = {
      id: cell.id,
      drawioCellId: cell.id,
      source: cell.source,
      target: cell.target,
      probability,
      reworkProbability,
      condition:
        getMetadataString(metadata, 'condition', 'branch-condition') ??
        asString(cell.label ?? cell.value ?? xmlHints.get(cell.id)?.label),
      kind: edgeKind,
      metadata,
    };
  });

  return {
    schemaVersion: 1,
    id: `drawio-${page?.id ?? 'page-1'}`,
    name: page?.name || name,
    nodes,
    edges,
    metadata: {
      source: 'drawio',
      pageId: page?.id ?? 'page-1',
      version: exported.version ?? 'unknown',
    },
  };
};

/**
 * Reads an uncompressed native `.drawio` XML document without waiting for the
 * remote iframe to emit a JSON snapshot. This is intentionally a browser
 * adapter concern: the domain packages continue to receive a serializable
 * `ProcessModel`, while draw.io remains the visual source of truth. Compressed
 * documents are handled by the async companion below when the browser exposes
 * `DecompressionStream`; the native editor remains the visual fallback.
 */
export const drawioXmlToProcessModel = (
  xml: string,
  name = 'Imported draw.io process',
): ProcessModel | null => {
  if (typeof DOMParser === 'undefined' || xml.trim().length === 0) return null;

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) return null;
  const diagram = document.getElementsByTagName('diagram')[0];
  const root = document.getElementsByTagName('root')[0];
  if (!diagram || !root) return null;

  const nestedCells = new Set<Element>();
  const cells: DrawioJsonCell[] = [];
  const readCell = (cell: Element, owner?: Element): DrawioJsonCell | null => {
    const id = owner?.getAttribute('id') || cell.getAttribute('id');
    if (!id) return null;
    nestedCells.add(cell);
    const metadata: Record<string, string | number | boolean> = {};
    const copyAttributes = (element: Element) => {
      for (const attribute of Array.from(element.attributes)) {
        if (
          ['id', 'parent', 'source', 'target', 'value', 'label', 'style'].includes(
            attribute.name,
          )
        )
          continue;
        metadata[attribute.name] = attribute.value;
      }
    };
    copyAttributes(cell);
    if (owner) copyAttributes(owner);
    const isEdge = cell.getAttribute('edge') === '1';
    const isVertex = cell.getAttribute('vertex') === '1';
    return {
      id,
      type: isEdge ? 'edge' : isVertex ? 'node' : 'layer',
      parent: cell.getAttribute('parent') ?? owner?.getAttribute('parent') ?? undefined,
      source: cell.getAttribute('source') ?? undefined,
      target: cell.getAttribute('target') ?? undefined,
      label:
        owner?.getAttribute('label') ??
        owner?.getAttribute('value') ??
        cell.getAttribute('value') ??
        undefined,
      value: cell.getAttribute('value') ?? undefined,
      style: cell.getAttribute('style') ?? owner?.getAttribute('style') ?? undefined,
      metadata,
    };
  };

  // Object/UserObject wrappers are the normal place for Flowculus metadata.
  // Consume their child cell first so the same cell is not emitted twice.
  for (const owner of Array.from(root.children)) {
    const tag = owner.tagName.toLowerCase();
    if (tag !== 'object' && tag !== 'userobject') continue;
    const cell = Array.from(owner.children).find(
      (child) => child.tagName.toLowerCase() === 'mxcell',
    );
    if (!cell) continue;
    const parsed = readCell(cell, owner);
    if (parsed) cells.push(parsed);
  }

  for (const cell of Array.from(root.getElementsByTagName('mxCell'))) {
    if (nestedCells.has(cell)) continue;
    const parsed = readCell(cell);
    if (parsed) cells.push(parsed);
  }

  if (cells.length === 0) return null;
  return drawioJsonToProcessModel(
    {
      data: xml,
      version: 'native-xml',
      pages: [
        {
          id: diagram.getAttribute('id') ?? 'page-1',
          name: diagram.getAttribute('name') ?? name,
          cells,
        },
      ],
    },
    name,
  );
};

/**
 * Parses both regular and compressed draw.io XML. The async branch is kept
 * outside the synchronous parser so importing a normal classroom fixture is
 * still immediate and deterministic.
 */
export const drawioXmlToProcessModelAsync = async (
  xml: string,
  name = 'Imported draw.io process',
): Promise<ProcessModel | null> => {
  const direct = drawioXmlToProcessModel(xml, name);
  if (direct) return direct;
  if (
    typeof DOMParser === 'undefined' ||
    typeof atob === 'undefined' ||
    typeof DecompressionStream === 'undefined' ||
    typeof TextDecoder === 'undefined'
  )
    return null;

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const diagram = document.getElementsByTagName('diagram')[0];
  const encoded = diagram?.textContent?.trim();
  if (!diagram || !encoded) return null;
  const isCompressed =
    document.documentElement.getAttribute('compressed') === 'true' ||
    diagram.getAttribute('compressed') === 'true' ||
    !encoded.startsWith('<');
  if (!isCompressed) return null;

  try {
    const normalized = decodeURIComponent(encoded).replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const base64 = padding ? `${normalized}${'='.repeat(4 - padding)}` : normalized;
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const inflate = async (format: 'deflate-raw' | 'deflate') => {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream(format));
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const result = await reader.read();
        if (result.done) break;
        totalBytes += result.value.byteLength;
        if (totalBytes > MAX_DECOMPRESSED_XML_BYTES) {
          await reader.cancel();
          throw new Error('Compressed draw.io XML exceeds the import limit.');
        }
        chunks.push(result.value);
      }

      const output = new Uint8Array(totalBytes);
      let offset = 0;
      chunks.forEach((chunk) => {
        output.set(chunk, offset);
        offset += chunk.byteLength;
      });
      return new TextDecoder().decode(output);
    };
    let graphXml: string;
    try {
      graphXml = await inflate('deflate-raw');
    } catch {
      graphXml = await inflate('deflate');
    }
    const wrapped = `<mxfile><diagram id="${escapeXmlValue(diagram.getAttribute('id') ?? 'page-1')}" name="${escapeXmlValue(diagram.getAttribute('name') ?? name)}">${graphXml}</diagram></mxfile>`;
    return drawioXmlToProcessModel(wrapped, name);
  } catch {
    return null;
  }
};

export const isDrawioJsonExport = (value: unknown): value is DrawioJsonExport => {
  if (value == null || typeof value !== 'object') return false;
  const pages = (value as { pages?: unknown }).pages;
  return Array.isArray(pages);
};
