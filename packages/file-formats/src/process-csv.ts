import { resolveActivityTime } from '@flowculus/analysis-engine';
import {
  SEMANTIC_METADATA_KEYS,
  isEdgeAttachmentSide,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

import { escapeCsvValue, parseCsvTable } from './csv-table';

const escapeCsv = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  // Spreadsheet apps can execute formula-looking text even when a CSV field is quoted.
  // Double a leading apostrophe too, so an exported value round-trips on import.
  const safe = /^(?:[\s\uFEFF]*[=+\-@]|'[=+\-@])/u.test(text) ? `'${text}` : text;
  return escapeCsvValue(safe);
};

const csvValue = (value: unknown): string => (value == null ? '' : String(value));

const isTimed = (node: ProcessNode): boolean =>
  node.durationMinutes != null ||
  node.processingMinutes != null ||
  node.waitingMinutes != null ||
  node.kind === 'task' ||
  node.kind === 'subprocess';

/**
 * `cycle_time_minutes` is the observed duration D exactly as modelled (so the
 * file re-imports unchanged); `effective_cycle_time_minutes` and
 * `cycle_time_source` state the CT the engine uses and where it comes from.
 */
const nodeToCsvRow = (node: ProcessNode): string[] => {
  const time = isTimed(node) ? resolveActivityTime(node) : undefined;
  return [
    csvValue(node.id),
    csvValue(node.label),
    csvValue(node.kind),
    csvValue(node.gatewayKind),
    csvValue(node.durationMinutes),
    csvValue(node.processingMinutes),
    csvValue(node.waitingMinutes),
    csvValue(time?.cycleTimeMinutes),
    csvValue(time?.cycleTimeSource),
    csvValue(node.reworkProbability),
    csvValue(node.cost?.resourceRatePerHour),
    csvValue(node.cost?.currency),
    csvValue(node.cost?.otherCostPerExecution),
    csvValue(node.cost?.resourcePoolId),
    csvValue(node.cost?.resourceCount),
    csvValue(node.bounds?.x),
    csvValue(node.bounds?.y),
    csvValue(node.bounds?.width),
    csvValue(node.bounds?.height),
    csvValue(
      node.metadata || node.poolId || node.laneId
        ? JSON.stringify({
            ...node.metadata,
            ...(node.poolId ? { 'flowculus-pool-id': node.poolId } : {}),
            ...(node.laneId ? { 'flowculus-lane-id': node.laneId } : {}),
          })
        : undefined,
    ),
  ];
};

const edgeToCsvRow = (edge: ProcessEdge): string[] => [
  csvValue(edge.id),
  csvValue(edge.source),
  csvValue(edge.target),
  csvValue(edge.kind ?? 'sequence'),
  csvValue(edge.probability),
  csvValue(edge.condition),
  csvValue(edge.reworkProbability),
  csvValue(edge.routing?.style),
  csvValue(edge.routing ? JSON.stringify(edge.routing.waypoints) : undefined),
  csvValue(edge.metadata ? JSON.stringify(edge.metadata) : undefined),
  csvValue(edge.routing?.sourceSide),
  csvValue(edge.routing?.targetSide),
];

export const processModelToNodesCsv = (model: ProcessModel): string => {
  const rows = [
    [
      'id',
      'label',
      'kind',
      'gateway_kind',
      'cycle_time_minutes',
      'processing_minutes',
      'waiting_minutes',
      'effective_cycle_time_minutes',
      'cycle_time_source',
      'rework_probability',
      'resource_rate_per_hour',
      'currency',
      'other_cost_per_execution',
      'resource_pool_id',
      'resource_count',
      'x',
      'y',
      'width',
      'height',
      'metadata_json',
    ],
    ...Object.values(model.nodes).map((node, index) =>
      nodeToCsvRow(
        index === 0 && model.containers
          ? {
              ...node,
              metadata: {
                ...node.metadata,
                'flowculus-containers': JSON.stringify(model.containers),
              },
            }
          : node,
      ),
    ),
  ];
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
};

export const processModelToEdgesCsv = (model: ProcessModel): string => {
  const rows = [
    [
      'id',
      'source',
      'target',
      'kind',
      'probability',
      'condition',
      'rework_probability',
      'route_style',
      'waypoints_json',
      'metadata_json',
      'source_side',
      'target_side',
    ],
    ...Object.values(model.edges).map(edgeToCsvRow),
  ];
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
};

export const processModelToCsv = (model: ProcessModel): string =>
  [
    '# Flowculus nodes',
    processModelToNodesCsv(model),
    '',
    '# Flowculus edges',
    processModelToEdgesCsv(model),
  ].join('\n');

type CsvRecord = Record<string, string>;

const parseMetadata = (
  value: string | undefined,
): Record<string, string | number | boolean> => {
  if (!value) return {};
  if (value.length > 200_000) throw new Error('CSV metadata is too large.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('CSV metadata is malformed.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('CSV metadata must be an object.');
  const entries = Object.entries(parsed);
  if (
    entries.length > 100 ||
    entries.some(
      ([key, item]) =>
        ['__proto__', 'prototype', 'constructor'].includes(key) ||
        key.length > 100 ||
        !(
          typeof item === 'string' ||
          typeof item === 'boolean' ||
          (typeof item === 'number' && Number.isFinite(item))
        ),
    )
  )
    throw new Error('CSV metadata contains unsupported values.');
  return Object.fromEntries(entries) as Record<string, string | number | boolean>;
};

const parseRouting = (
  style: string | undefined,
  rawPoints: string | undefined,
  sourceSide: string | undefined,
  targetSide: string | undefined,
): ProcessEdge['routing'] => {
  if (!style && !rawPoints && !sourceSide && !targetSide) return undefined;
  if (
    (sourceSide && !isEdgeAttachmentSide(sourceSide)) ||
    (targetSide && !isEdgeAttachmentSide(targetSide))
  )
    throw new Error('CSV attachment side is invalid.');
  if (style && !['orthogonal', 'straight', 'curved'].includes(style))
    throw new Error('CSV route style is invalid.');
  let parsed: unknown = [];
  if (rawPoints) {
    if (rawPoints.length > 4000) throw new Error('CSV waypoints are too large.');
    try {
      parsed = JSON.parse(rawPoints);
    } catch {
      throw new Error('CSV waypoints are malformed.');
    }
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length > 32 ||
    parsed.some(
      (point) =>
        !point ||
        typeof point !== 'object' ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y),
    )
  )
    throw new Error('CSV waypoints are invalid.');
  return {
    style: (style || 'orthogonal') as NonNullable<ProcessEdge['routing']>['style'],
    waypoints: parsed.map((point) => ({ x: point.x, y: point.y })),
    sourceSide: sourceSide as NonNullable<ProcessEdge['routing']>['sourceSide'],
    targetSide: targetSide as NonNullable<ProcessEdge['routing']>['targetSide'],
  };
};

const normalizeCsvHeader = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const isCommentRow = (row: string[]): boolean => row[0]?.trim().startsWith('#') ?? false;

const toCsvRecord = (headers: string[], row: string[]): CsvRecord =>
  Object.fromEntries(
    headers.map((header, index) => [
      normalizeCsvHeader(header),
      (row[index]?.trim() ?? '').replace(/^'(?='?[=+\-@])/u, ''),
    ]),
  );

const firstCsvValue = (record: CsvRecord, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[normalizeCsvHeader(key)]?.trim();
    if (value) return value;
  }
  return undefined;
};

export class ProcessCsvNumberError extends Error {
  constructor(
    readonly section: 'nodes' | 'edges',
    readonly row: number,
    readonly column: string,
  ) {
    super(`Invalid number in ${section} row ${row}, column ${column}.`);
    this.name = 'ProcessCsvNumberError';
  }
}

const csvNumber = (
  record: CsvRecord,
  section: 'nodes' | 'edges',
  row: number,
  ...keys: string[]
): number | undefined => {
  const column = keys.find((key) => firstCsvValue(record, key) != null);
  if (!column) return undefined;
  const raw = firstCsvValue(record, column)!;
  const percent = raw.endsWith('%');
  const probability = /probability|rework/i.test(column);
  if (percent && !probability) throw new ProcessCsvNumberError(section, row, column);
  const value = Number(raw.replace(',', '.').replace(/%$/, ''));
  if (!Number.isFinite(value)) throw new ProcessCsvNumberError(section, row, column);
  return percent ? value / 100 : value;
};

const csvGatewayKind = (raw: string | undefined): ProcessNode['gatewayKind'] => {
  if (!raw) return undefined;
  const value = raw.toLowerCase().replace(/[-_\s]/g, '');
  if (value.includes('event')) return 'eventBased';
  if (value.includes('complex')) return 'complex';
  if (value.includes('inclusive') || value === 'or') return 'or';
  if (value.includes('parallel') || value === 'and') return 'and';
  if (value.includes('exclusive') || value.includes('xor')) return 'xor';
  return undefined;
};

const csvNodeKind = (
  raw: string | undefined,
  label: string,
  gatewayKind: ProcessNode['gatewayKind'],
): ProcessNode['kind'] => {
  const value = (raw ?? '').toLowerCase().replace(/[-_\s]/g, '');
  const normalizedLabel = label.toLowerCase().trim();
  if (gatewayKind || value.includes('gateway') || value.includes('decision'))
    return 'gateway';
  if (
    value === 'start' ||
    value === 'startevent' ||
    /^(start|begin|entry)/.test(normalizedLabel)
  )
    return 'start';
  if (
    value === 'end' ||
    value === 'endevent' ||
    /^(end|finish|exit)/.test(normalizedLabel)
  )
    return 'end';
  if (value === 'subprocess' || value === 'callactivity') return 'subprocess';
  if (value === 'data' || value === 'dataobject') return 'data';
  if (value === 'annotation' || value === 'note') return 'annotation';
  if (value === 'event' || value === 'intermediateevent') return 'event';
  return 'task';
};

const csvEdgeKind = (raw: string | undefined): NonNullable<ProcessEdge['kind']> => {
  if (!raw) return 'sequence';
  const value = raw.toLowerCase().replace(/[-_\s]/g, '');
  // Classroom exports commonly call a control-flow connector `exclusive`,
  // `parallel` or `xor_split`. Those labels describe the gateway behaviour,
  // not a BPMN message/association edge, so they must remain in the analysis
  // graph as sequence flows.
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
  if (value === 'message' || value === 'messageflow') return 'message';
  if (
    value === 'association' ||
    value === 'associationflow' ||
    value === 'dataassociation'
  )
    return 'association';
  return 'unknown';
};

const hasAnyHeader = (headers: string[], keys: string[]): boolean =>
  keys.some((key) => headers.includes(normalizeCsvHeader(key)));

interface CsvSection {
  kind: 'nodes' | 'edges';
  headers: string[];
  rows: string[][];
}

const splitCsvSections = (rows: string[][]): CsvSection[] => {
  const sections: CsvSection[] = [];
  let current: CsvSection | undefined;
  for (const row of rows) {
    if (isCommentRow(row)) continue;
    const headers = row.map(normalizeCsvHeader);
    const kind =
      hasAnyHeader(headers, ['source']) &&
      hasAnyHeader(headers, ['target', 'tail', 'destination', 'to'])
        ? 'edges'
        : hasAnyHeader(headers, ['id']) &&
            hasAnyHeader(headers, ['label', 'nodename', 'name'])
          ? 'nodes'
          : undefined;
    if (kind) {
      current = { kind, headers: row, rows: [] };
      sections.push(current);
      continue;
    }
    if (current) current.rows.push(row);
  }
  return sections;
};

/**
 * Imports both Flowculus CSV exports and the classroom `nodes.csv` /
 * `edges.csv` convention into the native process model.
 */
export const parseProcessCsv = (
  source: string,
  name = 'Imported CSV process',
): ProcessModel => {
  const sections = splitCsvSections(parseCsvTable(source).rows);
  const nodeSection = sections.find((section) => section.kind === 'nodes');
  const edgeSection = sections.find((section) => section.kind === 'edges');
  if (!nodeSection) {
    throw new Error('CSV must contain a node table with id and label columns.');
  }

  const nodes: ProcessModel['nodes'] = {};
  for (const [index, row] of nodeSection.rows.entries()) {
    const record = toCsvRecord(nodeSection.headers, row);
    const id = firstCsvValue(record, 'id', 'nodeId');
    if (!id) continue;
    if (nodes[id]) throw new Error(`Duplicate node id in CSV: ${id}`);
    const number = (...keys: string[]) => csvNumber(record, 'nodes', index + 1, ...keys);
    const label = firstCsvValue(record, 'label', 'nodeName', 'name') ?? id;
    const gatewayKind = csvGatewayKind(
      firstCsvValue(record, 'gatewayKind', 'gatewayType'),
    );
    const durationMinutes = number(
      'cycleTimeMinutes',
      'durationMinutes',
      'durationMin',
      'duration',
    );
    const waitingMinutes = number('waitingMinutes', 'waitingMin', 'waiting');
    const processingMinutes =
      number('processingMinutes', 'processingMin', 'processing') ??
      (durationMinutes != null && waitingMinutes != null
        ? Math.max(0, durationMinutes - waitingMinutes)
        : undefined);
    const resourceRatePerHour = number(
      'resourceRatePerHour',
      'hourlyRate',
      'resourceRate',
    );
    const otherCostPerExecution = number(
      'otherCostPerExecution',
      'costPerExecution',
      'fixedCost',
    );
    const resourcePoolId = firstCsvValue(
      record,
      'resourcePoolId',
      'resourcePool',
      'resource',
    );
    const resourceCount = number('resourceCount', 'poolSize');
    const reworkProbability = number('reworkProbability', 'rework');
    const rawKind = firstCsvValue(record, 'kind', 'nodeType', 'type');
    const kind = csvNodeKind(rawKind, label, gatewayKind);
    const notes = firstCsvValue(record, 'notes', 'note', 'description');
    const x = number('x');
    const y = number('y');
    const width = number('width');
    const height = number('height');
    nodes[id] = {
      id,
      label,
      kind,
      gatewayKind: kind === 'gateway' ? (gatewayKind ?? 'xor') : undefined,
      durationMinutes,
      processingMinutes,
      waitingMinutes,
      reworkProbability,
      cost:
        resourceRatePerHour != null ||
        otherCostPerExecution != null ||
        resourcePoolId ||
        firstCsvValue(record, 'currency') ||
        resourceCount != null
          ? {
              resourceRatePerHour,
              otherCostPerExecution,
              resourcePoolId,
              resourceCount,
              currency: firstCsvValue(record, 'currency'),
            }
          : undefined,
      bounds:
        x != null &&
        y != null &&
        width != null &&
        height != null &&
        width > 0 &&
        height > 0
          ? { x, y, width, height }
          : undefined,
      metadata: {
        source: 'csv',
        ...parseMetadata(firstCsvValue(record, 'metadataJson')),
        ...(notes ? { csvNotes: notes } : {}),
        // A type guessed from the label (no kind/type column) or a gateway
        // without a declared type must be confirmed before it is trusted.
        ...(rawKind ? {} : { [SEMANTIC_METADATA_KEYS.inferredKind]: true }),
        ...(kind === 'gateway' && !gatewayKind
          ? { [SEMANTIC_METADATA_KEYS.inferredGatewayKind]: true }
          : {}),
      },
    };
  }

  if (Object.keys(nodes).length === 0) {
    throw new Error('CSV node table does not contain any usable rows.');
  }

  const edges: ProcessModel['edges'] = {};
  for (const [index, row] of (edgeSection?.rows ?? []).entries()) {
    const record = toCsvRecord(edgeSection?.headers ?? [], row);
    const id = firstCsvValue(record, 'id', 'edgeId');
    const source = firstCsvValue(record, 'source', 'from');
    const target = firstCsvValue(record, 'target', 'tail', 'destination', 'to');
    if (!id || !source || !target) continue;
    if (edges[id]) throw new Error(`Duplicate edge id in CSV: ${id}`);
    const number = (...keys: string[]) => csvNumber(record, 'edges', index + 1, ...keys);
    const probability = number('probability', 'branchProbability');
    const reworkProbability = number('reworkProbability', 'rework');
    edges[id] = {
      id,
      source,
      target,
      probability,
      condition: firstCsvValue(record, 'condition', 'branchCondition'),
      kind: csvEdgeKind(firstCsvValue(record, 'kind', 'flowType', 'type')),
      reworkProbability,
      routing: parseRouting(
        firstCsvValue(record, 'routeStyle'),
        firstCsvValue(record, 'waypointsJson'),
        firstCsvValue(record, 'sourceSide'),
        firstCsvValue(record, 'targetSide'),
      ),
      metadata: {
        source: 'csv',
        ...parseMetadata(firstCsvValue(record, 'metadataJson')),
        ...(firstCsvValue(record, 'flowType', 'type')
          ? { csvFlowType: firstCsvValue(record, 'flowType', 'type') as string }
          : {}),
      },
    };
  }

  let containers: ProcessModel['containers'];
  for (const node of Object.values(nodes)) {
    const frames = node.metadata?.['flowculus-containers'];
    if (typeof frames === 'string') {
      try {
        containers = JSON.parse(frames);
      } catch {
        throw new Error('Invalid CSV containers');
      }
    }
    if (typeof node.metadata?.['flowculus-pool-id'] === 'string')
      node.poolId = node.metadata['flowculus-pool-id'];
    if (typeof node.metadata?.['flowculus-lane-id'] === 'string')
      node.laneId = node.metadata['flowculus-lane-id'];
    if (node.metadata) {
      delete node.metadata['flowculus-containers'];
      delete node.metadata['flowculus-pool-id'];
      delete node.metadata['flowculus-lane-id'];
    }
  }
  return {
    ...(containers ? { containers } : {}),
    schemaVersion: containers ? 2 : 1,
    id: `csv-${Date.now().toString(36)}`,
    name,
    nodes,
    edges,
    metadata: { source: 'csv' },
  };
};
