import type { ProcessEdge, ProcessModel, ProcessNode } from '@flowculus/process-model';

export interface FlowculusAnalysisOptions {
  arrivalRatePerHour?: number;
  workInProcess?: number;
  workingHoursPerDay?: number;
  serviceRatePerHour?: number;
  servers?: number;
  resourceCounts?: Record<string, number>;
}

export interface FlowculusAnalysisSnapshot {
  cycleTimeMinutes: number | null;
  theoreticalCycleTimeMinutes: number | null;
  cycleTimeEfficiency: number | null;
  costPerExecution: number | null;
  littleLaw?: {
    arrivalRatePerHour: number;
    workInProcess: number;
    cycleTimeHours: number;
  };
  queue?: {
    status: 'ready' | 'invalid' | 'unstable';
    model: 'M/M/1' | 'M/M/c';
    utilization: number | null;
    averageQueueLength: number | null;
    averageWaitingHours: number | null;
    averageSystemHours: number | null;
    averageSystemCount: number | null;
    formula: string;
    warnings: string[];
  };
  criticalPath?: {
    status: 'ready' | 'unavailable';
    durationMinutes: number | null;
    taskIds: string[];
    taskLabels: string[];
    formula: string;
    reason?:
      | 'missing-start'
      | 'decision-gateway'
      | 'missing-processing-time'
      | 'rework-or-cycle';
  };
  pathCount?: {
    status: 'ready' | 'empty' | 'cyclic' | 'limit';
    count: number | null;
    endNodeIds: string[];
    formula: string;
    warning?: string;
  };
}

export interface FlowculusFile {
  schemaVersion: 1;
  model: ProcessModel;
  drawioXml?: string;
  analysisOptions?: FlowculusAnalysisOptions;
  analysis?: FlowculusAnalysisSnapshot;
}

const MAX_FLOWCULUS_XML_LENGTH = 50_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

export const serializeFlowculusFile = (file: FlowculusFile): string =>
  JSON.stringify(file, null, 2);

export const parseFlowculusFile = (source: string): FlowculusFile => {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed)) {
    throw new Error('The file does not contain a Flowculus object.');
  }
  if (parsed.schemaVersion !== 1 || !isRecord(parsed.model)) {
    throw new Error('Unsupported Flowculus file schema.');
  }
  const model = parsed.model;
  if (
    typeof model.id !== 'string' ||
    typeof model.name !== 'string' ||
    model.schemaVersion !== 1 ||
    !isRecord(model.nodes) ||
    !isRecord(model.edges)
  ) {
    throw new Error('The Flowculus model is malformed.');
  }
  if (
    parsed.drawioXml != null &&
    (typeof parsed.drawioXml !== 'string' ||
      parsed.drawioXml.length > MAX_FLOWCULUS_XML_LENGTH)
  ) {
    throw new Error('The embedded draw.io XML is too large.');
  }
  return parsed as unknown as FlowculusFile;
};

const escapeCsv = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const csvValue = (value: unknown): string => (value == null ? '' : String(value));

const nodeToCsvRow = (node: ProcessNode): string[] => [
  csvValue(node.id),
  csvValue(node.label),
  csvValue(node.kind),
  csvValue(node.gatewayKind),
  csvValue(node.durationMinutes),
  csvValue(node.processingMinutes),
  csvValue(node.waitingMinutes),
  csvValue(node.reworkProbability),
  csvValue(node.cost?.resourceRatePerHour),
  csvValue(node.cost?.otherCostPerExecution),
  csvValue(node.cost?.resourcePoolId),
  csvValue(node.cost?.resourceCount),
];

const edgeToCsvRow = (edge: ProcessEdge): string[] => [
  csvValue(edge.id),
  csvValue(edge.source),
  csvValue(edge.target),
  csvValue(edge.kind ?? 'sequence'),
  csvValue(edge.probability),
  csvValue(edge.condition),
  csvValue(edge.reworkProbability),
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
      'rework_probability',
      'resource_rate_per_hour',
      'other_cost_per_execution',
      'resource_pool_id',
      'resource_count',
    ],
    ...Object.values(model.nodes).map(nodeToCsvRow),
  ];
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
};

export const processModelToEdgesCsv = (model: ProcessModel): string => {
  const rows = [
    ['id', 'source', 'target', 'kind', 'probability', 'condition', 'rework_probability'],
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

const normalizeCsvHeader = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/** Parses RFC 4180-style CSV without pulling a parser into the browser bundle. */
const parseCsvRows = (source: string): string[][] => {
  const rows: string[][] = [];
  const row: string[] = [];
  let field = '';
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== '')) rows.push([...row]);
    row.length = 0;
  };

  const input = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      pushField();
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      pushRow();
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  return rows;
};

const isCommentRow = (row: string[]): boolean => row[0]?.trim().startsWith('#') ?? false;

const toCsvRecord = (headers: string[], row: string[]): CsvRecord =>
  Object.fromEntries(
    headers.map((header, index) => [
      normalizeCsvHeader(header),
      row[index]?.trim() ?? '',
    ]),
  );

const firstCsvValue = (record: CsvRecord, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[normalizeCsvHeader(key)]?.trim();
    if (value) return value;
  }
  return undefined;
};

const csvNumber = (record: CsvRecord, ...keys: string[]): number | undefined => {
  const raw = firstCsvValue(record, ...keys);
  if (!raw) return undefined;
  const value = Number(raw.replace(',', '.').replace(/%$/, ''));
  if (!Number.isFinite(value)) return undefined;
  return raw.endsWith('%') ? value / 100 : value;
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
 * `edges.csv` convention. A CSV import is intentionally converted into a
 * native draw.io document by the browser adapter before it reaches the iframe.
 */
export const parseProcessCsv = (
  source: string,
  name = 'Imported CSV process',
): ProcessModel => {
  const sections = splitCsvSections(parseCsvRows(source));
  const nodeSection = sections.find((section) => section.kind === 'nodes');
  const edgeSection = sections.find((section) => section.kind === 'edges');
  if (!nodeSection) {
    throw new Error('CSV must contain a node table with id and label columns.');
  }

  const nodes: ProcessModel['nodes'] = {};
  for (const row of nodeSection.rows) {
    const record = toCsvRecord(nodeSection.headers, row);
    const id = firstCsvValue(record, 'id', 'nodeId');
    if (!id) continue;
    const label = firstCsvValue(record, 'label', 'nodeName', 'name') ?? id;
    const gatewayKind = csvGatewayKind(
      firstCsvValue(record, 'gatewayKind', 'gatewayType'),
    );
    const durationMinutes = csvNumber(
      record,
      'cycleTimeMinutes',
      'durationMinutes',
      'durationMin',
      'duration',
    );
    const waitingMinutes = csvNumber(record, 'waitingMinutes', 'waitingMin', 'waiting');
    const processingMinutes =
      csvNumber(record, 'processingMinutes', 'processingMin', 'processing') ??
      (durationMinutes != null && waitingMinutes != null
        ? Math.max(0, durationMinutes - waitingMinutes)
        : undefined);
    const resourceRatePerHour = csvNumber(
      record,
      'resourceRatePerHour',
      'hourlyRate',
      'resourceRate',
    );
    const otherCostPerExecution = csvNumber(
      record,
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
    const resourceCount = csvNumber(record, 'resourceCount', 'poolSize');
    const reworkProbability = csvNumber(record, 'reworkProbability', 'rework');
    const kind = csvNodeKind(
      firstCsvValue(record, 'kind', 'nodeType', 'type'),
      label,
      gatewayKind,
    );
    const notes = firstCsvValue(record, 'notes', 'note', 'description');
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
        resourceCount != null
          ? {
              resourceRatePerHour,
              otherCostPerExecution,
              resourcePoolId,
              resourceCount:
                resourceCount != null && Number.isInteger(resourceCount)
                  ? resourceCount
                  : undefined,
              currency: firstCsvValue(record, 'currency'),
            }
          : undefined,
      metadata: notes ? { csvNotes: notes, source: 'csv' } : { source: 'csv' },
    };
  }

  if (Object.keys(nodes).length === 0) {
    throw new Error('CSV node table does not contain any usable rows.');
  }

  const edges: ProcessModel['edges'] = {};
  for (const row of edgeSection?.rows ?? []) {
    const record = toCsvRecord(edgeSection?.headers ?? [], row);
    const id = firstCsvValue(record, 'id', 'edgeId');
    const source = firstCsvValue(record, 'source', 'from');
    const target = firstCsvValue(record, 'target', 'tail', 'destination', 'to');
    if (!id || !source || !target) continue;
    const probability = csvNumber(record, 'probability', 'branchProbability');
    const reworkProbability = csvNumber(record, 'reworkProbability', 'rework');
    edges[id] = {
      id,
      source,
      target,
      probability,
      condition: firstCsvValue(record, 'condition', 'branchCondition'),
      kind: csvEdgeKind(firstCsvValue(record, 'kind', 'flowType', 'type')),
      reworkProbability,
      metadata: {
        source: 'csv',
        ...(firstCsvValue(record, 'flowType', 'type')
          ? { csvFlowType: firstCsvValue(record, 'flowType', 'type') as string }
          : {}),
      },
    };
  }

  return {
    schemaVersion: 1,
    id: `csv-${Date.now().toString(36)}`,
    name,
    nodes,
    edges,
    metadata: { source: 'csv' },
  };
};
