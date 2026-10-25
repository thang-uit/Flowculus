import { readEdgeAttachment } from './edge-attachments';
import {
  SEMANTIC_METADATA_KEYS,
  type GatewayKind,
  type ProcessEdge,
  type ProcessMetadataValue,
  type ProcessNode,
  type ProcessNodeKind,
} from '@flowculus/process-model';

import type { DrawioCellRecord } from './document';
import { getChildElements, getXmlAttribute } from '@flowculus/xml-tree';

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

export type CellMetadata = Record<string, ProcessMetadataValue>;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const normalizeMetadataKey = (key: string): string =>
  key
    .replace(/^flowculus[-_:]?/i, '')
    .replace(/[-_]/g, '')
    .toLowerCase();

/** Custom cell attributes, indexed by their raw and normalized names. */
export const getCellMetadata = (cell: DrawioCellRecord): CellMetadata => {
  const metadata: CellMetadata = {};
  Object.entries(cell.attributes).forEach(([key, value]) => {
    metadata[key] = value;
    metadata[normalizeMetadataKey(key)] = value;
  });
  return metadata;
};

const getMetadataString = (metadata: CellMetadata, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata[key] ?? metadata[normalizeMetadataKey(key)];
    const stringValue = asString(value);
    if (stringValue) return stringValue;
  }
  return undefined;
};

const getMetadataNumber = (metadata: CellMetadata, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata[key] ?? metadata[normalizeMetadataKey(key)];
    const numberValue = asNumber(value);
    if (numberValue != null) return numberValue;
  }
  return undefined;
};

export const getStyleValue = (style: string, key: string): string | undefined => {
  const match = style.match(new RegExp(`(?:^|;)\\s*${key}=([^;]*)`, 'i'));
  return match?.[1]?.trim() || undefined;
};

export const stripMarkup = (value: string): string =>
  value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<\/(div|p|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const EXPLICIT_KIND_KEYS = [
  'kind',
  'node-kind',
  'semantic-kind',
  'nodeType',
  'node-type',
];
const EXPLICIT_GATEWAY_KEYS = [
  'gateway-kind',
  'gatewayKind',
  'gateway',
  'gatewayType',
  'gateway-type',
];

export const hasExplicitKind = (metadata: CellMetadata): boolean =>
  Boolean(getMetadataString(metadata, ...EXPLICIT_KIND_KEYS));

export const inferNodeKind = (
  cell: DrawioCellRecord,
  metadata: CellMetadata,
): ProcessNodeKind => {
  const explicit = getMetadataString(metadata, ...EXPLICIT_KIND_KEYS);
  if (explicit) {
    const normalizedExplicit = normalizeMetadataKey(explicit);
    // Native draw.io uses nodeType="event" for start and end events alike, so
    // that one value continues through style inference below.
    if (
      normalizedExplicit !== 'event' &&
      NODE_KINDS.has(normalizedExplicit as ProcessNodeKind)
    )
      return normalizedExplicit as ProcessNodeKind;
    if (normalizedExplicit === 'activity') return 'task';
  }

  const style = cell.style;
  const shape = (
    getMetadataString(metadata, 'shape', 'bpmn-shape') ?? style
  ).toLowerCase();
  const label = stripMarkup(cell.label ?? '').toLowerCase();
  const gatewayBackground = getStyleValue(style, 'background')?.toLowerCase();
  const gatewayType = getStyleValue(style, 'gwType')?.toLowerCase();
  const gatewaySymbol = getStyleValue(style, 'symbol')?.toLowerCase();
  const eventType = getStyleValue(style, 'eventType')?.toLowerCase();
  const eventOutline = getStyleValue(style, 'outline')?.toLowerCase();
  const isBpmnEventShape = shape.includes('bpmn.event') || shape.includes('bpmnevent');
  const normalizedShape = shape.replace(/[_\-\s]/g, '');

  if (/^text(?:;|$)/.test(style.trim())) return 'annotation';
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
    (isBpmnEventShape && eventOutline === 'standard') ||
    normalizedShape.includes('generalstart') ||
    shape.includes('startevent') ||
    /eventtype\s*=\s*start/.test(shape) ||
    /^(start|begin|entry)( event| point)?$/.test(label)
  )
    return 'start';
  if (
    eventType === 'end' ||
    eventOutline === 'end' ||
    shape.includes('endevent') ||
    normalizedShape.includes('generalend') ||
    shape.includes('doubleellipse') ||
    /eventtype\s*=\s*end/.test(shape) ||
    /^(end|finish|exit)( event| point)?$/.test(label)
  )
    return 'end';
  if (
    shape.includes('annotation') ||
    shape.includes('partialrectangle') ||
    /(^|;)\s*shape=note/.test(shape)
  ) {
    return /(^|;)\s*shape=note/.test(shape) && getStyleValue(style, 'size')
      ? 'data'
      : 'annotation';
  }
  if (
    shape.includes('bpmn.data') ||
    shape.includes('dataobject') ||
    shape.includes('parallelogram')
  )
    return 'data';
  if (shape.includes('subprocess') || shape.includes('callactivity')) return 'subprocess';
  if (
    eventType != null ||
    (eventOutline != null && eventOutline !== 'none') ||
    isBpmnEventShape ||
    shape.includes('event') ||
    shape.includes('ellipse')
  )
    return 'event';
  return 'task';
};

const normalizeGatewayKind = (value: string): GatewayKind | undefined => {
  const normalized = normalizeMetadataKey(value);
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

export const inferGatewayKind = (
  cell: DrawioCellRecord,
  metadata: CellMetadata,
): { kind: GatewayKind; inferred: boolean } => {
  const explicit = getMetadataString(metadata, ...EXPLICIT_GATEWAY_KEYS);
  const explicitKind = explicit ? normalizeGatewayKind(explicit) : undefined;
  if (explicitKind) return { kind: explicitKind, inferred: false };

  const style = cell.style;
  const outline = getStyleValue(style, 'outline')?.toLowerCase();
  const symbol = getStyleValue(style, 'symbol')?.toLowerCase();
  if (
    style.toLowerCase().includes('gateway2') &&
    outline != null &&
    outline !== 'none' &&
    symbol === 'multiple'
  )
    return { kind: 'eventBased', inferred: true };
  for (const token of [getStyleValue(style, 'gwType'), getStyleValue(style, 'symbol')]) {
    const tokenKind = token ? normalizeGatewayKind(token) : undefined;
    if (tokenKind) return { kind: tokenKind, inferred: true };
  }
  const text = `${stripMarkup(cell.label ?? '')} ${style}`.toLowerCase();
  if (/(^|[^a-z])event(?:based)?([^a-z]|$)/.test(text))
    return { kind: 'eventBased', inferred: true };
  if (/(^|[^a-z])complex([^a-z]|$)/.test(text))
    return { kind: 'complex', inferred: true };
  if (/(^|[^a-z])(inclusive|or)([^a-z]|$)/.test(text))
    return { kind: 'or', inferred: true };
  if (/(^|[^a-z])(and|parallel)([^a-z]|$)/.test(text))
    return { kind: 'and', inferred: true };
  return { kind: 'xor', inferred: true };
};

const EXPLICIT_EDGE_KIND_KEYS = [
  'kind',
  'flow-kind',
  'flowType',
  'flow-type',
  'edgeType',
  'edge-type',
];

const CONTROL_FLOW_TOKENS = new Set([
  'sequence',
  'sequenceflow',
  'controlflow',
  'control',
  'flow',
  'exclusive',
  'exclusiveflow',
  'xorsplit',
  'xorjoin',
  'xor',
  'parallel',
  'parallelflow',
  'andsplit',
  'andjoin',
  'and',
  'inclusive',
  'inclusiveflow',
  'orsplit',
  'orjoin',
  'or',
]);

export const inferEdgeKind = (
  metadata: CellMetadata,
  style: string,
): NonNullable<ProcessEdge['kind']> => {
  const explicit = getMetadataString(metadata, ...EXPLICIT_EDGE_KIND_KEYS);
  const value = (explicit ?? '').toLowerCase().replace(/[-_\s]/g, '');
  if (value === 'message' || value === 'messageflow') return 'message';
  if (
    value === 'association' ||
    value === 'associationflow' ||
    value === 'dataassociation'
  )
    return 'association';
  if (CONTROL_FLOW_TOKENS.has(value)) return 'sequence';

  const normalizedStyle = style.toLowerCase();
  if (
    normalizedStyle.includes('messageflow') ||
    (getStyleValue(style, 'dashed') === '1' && normalizedStyle.includes('endarrow=oval'))
  )
    return 'message';
  if (
    normalizedStyle.includes('association') ||
    (getStyleValue(style, 'dashed') === '1' &&
      getStyleValue(style, 'endArrow') === 'none')
  )
    return 'association';
  return 'sequence';
};

/**
 * Containers that only organise the drawing (pools, lanes, groups) and edge
 * label children are kept in the XML but never become process nodes.
 */
export const isStructuralContainer = (cell: DrawioCellRecord): boolean => {
  const style = cell.style.toLowerCase();
  return (
    /(^|;)\s*(swimlane|group)\s*(;|$)/.test(style) ||
    style.includes('shape=swimlane') ||
    style.includes('shape=mxgraph.bpmn.pool') ||
    style.includes('shape=pool') ||
    style.includes('shape=lane') ||
    style.includes('childlayout=stacklayout')
  );
};

export const isPresentationOnlyNode = (
  cell: DrawioCellRecord,
  metadata: CellMetadata,
  incidentNodeIds: Set<string>,
): boolean => {
  if (incidentNodeIds.has(cell.id) || hasExplicitKind(metadata)) return false;
  if (getMetadataString(metadata, 'flowculus-shape')) return false;
  const label = stripMarkup(cell.label ?? '').toLowerCase();
  const id = cell.id.toLowerCase();
  const style = cell.style.trim().toLowerCase();
  return (
    /^text(?:;|$)/.test(style) ||
    /^image(?:;|$)/.test(style) ||
    /(^|;)\s*shape=image(;|$)/.test(style) ||
    /^(legend|title|subtitle|formula|note|chú giải|công thức)/.test(id) ||
    /^(legend|title|subtitle|formula|note|chú giải|công thức)/.test(label)
  );
};

const ACTIVITY_STYLE = /(^|;)\s*(rounded=1|shape=(ext|process|mxgraph\.bpmn\.task))/i;

/**
 * BPMN subtype of a native shape (call activity, event outline/trigger) and,
 * when Flowculus cannot model it exactly, the reason it is unsupported. The
 * cell itself is always kept in the file.
 */
const describeBpmnShape = (
  cell: DrawioCellRecord,
  kind: ProcessNodeKind,
  parent: DrawioCellRecord | undefined,
  explicitKind: boolean,
): { bpmnType?: string; unsupported?: string } => {
  const style = cell.style.toLowerCase();
  if (kind === 'subprocess' && style.includes('callactivity')) {
    return { bpmnType: 'callActivity' };
  }
  if (kind !== 'start' && kind !== 'end' && kind !== 'event') return {};
  const outline = getStyleValue(cell.style, 'outline')?.toLowerCase();
  const symbol = getStyleValue(cell.style, 'symbol')?.toLowerCase();
  const bpmnType = [outline, symbol].filter(Boolean).join(':') || undefined;
  const attachedToActivity =
    parent != null &&
    parent.isVertex &&
    !isStructuralContainer(parent) &&
    ACTIVITY_STYLE.test(parent.style);
  if (outline === 'boundint' || outline === 'boundnonint' || attachedToActivity) {
    return { bpmnType, unsupported: 'boundary-event' };
  }
  if (kind === 'end' && symbol?.startsWith('terminate') && !explicitKind) {
    return { bpmnType, unsupported: 'terminate-end-event' };
  }
  return { bpmnType };
};

export const cellToProcessNode = (
  cell: DrawioCellRecord,
  bounds: ProcessNode['bounds'],
  parent?: DrawioCellRecord,
): ProcessNode => {
  const metadata = getCellMetadata(cell);
  const kind = inferNodeKind(cell, metadata);
  const explicitKind = hasExplicitKind(metadata);
  if (!explicitKind) metadata[SEMANTIC_METADATA_KEYS.inferredKind] = true;
  const gateway = kind === 'gateway' ? inferGatewayKind(cell, metadata) : undefined;
  if (gateway?.inferred) metadata[SEMANTIC_METADATA_KEYS.inferredGatewayKind] = true;
  const shape = describeBpmnShape(cell, kind, parent, explicitKind);
  if (shape.bpmnType) metadata[SEMANTIC_METADATA_KEYS.bpmnType] = shape.bpmnType;
  if (shape.unsupported) {
    metadata[SEMANTIC_METADATA_KEYS.unsupportedShape] = shape.unsupported;
  }

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

  return {
    id: cell.id,
    drawioCellId: cell.id,
    label: stripMarkup(cell.label ?? '') || cell.id,
    kind,
    gatewayKind: gateway?.kind,
    durationMinutes: getMetadataNumber(
      metadata,
      'duration-minutes',
      'durationMinutes',
      'durationMin',
      'duration',
      'cycle-time-minutes',
      'cycleTime',
    ),
    processingMinutes: getMetadataNumber(
      metadata,
      'processing-minutes',
      'processingMinutes',
      'processingMin',
      'processing-time',
    ),
    waitingMinutes: getMetadataNumber(
      metadata,
      'waiting-minutes',
      'waitingMinutes',
      'waitingMin',
      'wait',
    ),
    reworkProbability: getMetadataNumber(
      metadata,
      'rework-probability',
      'reworkProbability',
      'rework',
    ),
    cost:
      resourceRatePerHour != null ||
      otherCostPerExecution != null ||
      resourcePoolId ||
      resourceCount != null
        ? {
            resourceRatePerHour,
            otherCostPerExecution,
            resourcePoolId,
            resourceCount:
              resourceCount != null &&
              Number.isInteger(resourceCount) &&
              resourceCount > 0
                ? resourceCount
                : undefined,
            currency: getMetadataString(metadata, 'currency') ?? 'USD',
          }
        : undefined,
    bounds,
    metadata,
  };
};

const PROBABILITY_LABEL =
  /(?:^|\s*[·|,;]\s*|\s+)p\s*=\s*([0-9]+(?:[.,][0-9]+)?)(%?)\s*$/i;

/**
 * Splits a sequence-flow label such as `yes · p = 0.6` into its condition and
 * the probability the author wrote explicitly. Flowculus writes labels in that
 * form so the branch weight stays visible in diagrams.net.
 */
export const parseFlowLabel = (
  label: string | undefined,
): { condition?: string; probability?: number } => {
  const text = stripMarkup(label ?? '');
  if (!text) return {};
  const match = text.match(PROBABILITY_LABEL);
  if (!match) return { condition: text };
  const raw = Number(match[1].replace(',', '.'));
  const probability = match[2] === '%' ? raw / 100 : raw;
  const condition = text.slice(0, match.index).trim();
  return {
    condition: condition || undefined,
    probability:
      Number.isFinite(probability) && probability >= 0 && probability <= 1
        ? probability
        : undefined,
  };
};

export const formatFlowLabel = (
  edge: Pick<ProcessEdge, 'condition' | 'probability'>,
): string =>
  [
    edge.condition?.trim(),
    edge.probability == null ? undefined : `p = ${Number(edge.probability.toFixed(4))}`,
  ]
    .filter(Boolean)
    .join(' · ');

export const cellToProcessEdge = (
  cell: DrawioCellRecord,
  fallbackLabel: string | undefined,
): ProcessEdge | null => {
  if (!cell.source || !cell.target) return null;
  const metadata = getCellMetadata(cell);
  const parsedLabel = parseFlowLabel(
    stripMarkup(cell.label ?? '') ? cell.label : fallbackLabel,
  );
  const explicitProbability = getMetadataNumber(
    metadata,
    'probability',
    'branch-probability',
    'branchProbability',
  );
  // A flow type read from the arrow style, or a probability read from the
  // label text, is a guess until a person confirms it.
  if (!getMetadataString(metadata, ...EXPLICIT_EDGE_KIND_KEYS)) {
    metadata[SEMANTIC_METADATA_KEYS.inferredEdgeKind] = true;
  }
  if (explicitProbability == null && parsedLabel.probability != null) {
    metadata[SEMANTIC_METADATA_KEYS.inferredProbability] = true;
  }
  const geometry = getChildElements(cell.cell, 'mxGeometry')[0];
  const pointsElement =
    geometry &&
    getChildElements(geometry, 'Array').find(
      (element) => getXmlAttribute(element, 'as') === 'points',
    );
  const waypoints = pointsElement
    ? getChildElements(pointsElement, 'mxPoint')
        .flatMap((element) => {
          const x = Number(getXmlAttribute(element, 'x'));
          const y = Number(getXmlAttribute(element, 'y'));
          return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
        })
        .slice(0, 32)
    : [];
  const style: NonNullable<ProcessEdge['routing']>['style'] =
    getStyleValue(cell.style, 'curved') === '1'
      ? 'curved'
      : getStyleValue(cell.style, 'edgeStyle') === 'none'
        ? 'straight'
        : 'orthogonal';
  const sourceSide = readEdgeAttachment(cell.style, 'exit');
  const targetSide = readEdgeAttachment(cell.style, 'entry');
  return {
    id: cell.id,
    drawioCellId: cell.id,
    source: cell.source,
    target: cell.target,
    probability: explicitProbability ?? parsedLabel.probability,
    reworkProbability: getMetadataNumber(
      metadata,
      'rework-probability',
      'reworkProbability',
    ),
    condition:
      getMetadataString(metadata, 'condition', 'branch-condition') ??
      parsedLabel.condition,
    kind: inferEdgeKind(metadata, cell.style),
    routing:
      waypoints.length || style !== 'orthogonal' || sourceSide || targetSide
        ? { style, waypoints, sourceSide, targetSide }
        : undefined,
    metadata,
  };
};
