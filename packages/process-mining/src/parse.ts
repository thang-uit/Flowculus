import { parseCsvTable } from '@flowculus/file-formats';
import {
  getChildElements,
  getDocumentRoot,
  getXmlAttribute,
  parseXml,
  type XmlElement,
} from '@flowculus/xml-tree';

import { detectDayFirst, parseTimestamp } from './timestamp';
import type {
  ColumnMapping,
  EventLog,
  EventLogBuildResult,
  EventLogFormat,
  EventTable,
  MiningEvent,
} from './types';

export const MAX_EVENT_ROWS = 500_000;

const XES_ATTRIBUTE_TAGS = new Set(['string', 'date', 'int', 'float', 'boolean', 'id']);

const readXesAttributes = (element: XmlElement, prefix = ''): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const child of getChildElements(element)) {
    if (!XES_ATTRIBUTE_TAGS.has(child.name)) continue;
    const key = getXmlAttribute(child, 'key');
    const value = getXmlAttribute(child, 'value');
    if (key && value != null) attributes[`${prefix}${key}`] = value;
  }
  return attributes;
};

/** Reads IEEE XES (1849-2016) without a DOM: traces become `case:*` columns. */
export const parseXesTable = (source: string): EventTable => {
  const root = getDocumentRoot(parseXml(source));
  if (root.name !== 'log') throw new Error('The XES file has no <log> root element.');
  const records: Record<string, string>[] = [];
  getChildElements(root, 'trace').forEach((trace, traceIndex) => {
    const traceAttributes = readXesAttributes(trace, 'case:');
    if (!traceAttributes['case:concept:name']) {
      traceAttributes['case:concept:name'] = `trace-${traceIndex + 1}`;
    }
    for (const event of getChildElements(trace, 'event')) {
      records.push({ ...traceAttributes, ...readXesAttributes(event) });
    }
  });
  return recordsToTable('xes', records);
};

const stringifyCell = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const recordsToTable = (
  format: EventLogFormat,
  records: Record<string, unknown>[],
): EventTable => {
  const headers: string[] = [];
  const seen = new Set<string>();
  records.forEach((record) =>
    Object.keys(record).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }),
  );
  return {
    format,
    headers,
    rows: records.map((record) => headers.map((header) => stringifyCell(record[header]))),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/** Accepts `[{...}]`, `{ events: [...] }` or `{ cases: [{ id, events: [...] }] }`. */
export const parseJsonTable = (source: string): EventTable => {
  const parsed: unknown = JSON.parse(source);
  if (Array.isArray(parsed)) return recordsToTable('json', parsed.filter(isRecord));
  if (!isRecord(parsed))
    throw new Error('The JSON event log must be an array of events.');
  if (Array.isArray(parsed.cases)) {
    const records: Record<string, unknown>[] = [];
    parsed.cases.filter(isRecord).forEach((caseRecord, index) => {
      const caseId =
        caseRecord.id ?? caseRecord.caseId ?? caseRecord.case ?? `case-${index + 1}`;
      const events = Array.isArray(caseRecord.events)
        ? caseRecord.events.filter(isRecord)
        : [];
      events.forEach((event) => records.push({ caseId, ...event }));
    });
    return recordsToTable('json', records);
  }
  for (const key of ['events', 'data', 'records', 'rows']) {
    const candidate = parsed[key];
    if (Array.isArray(candidate))
      return recordsToTable('json', candidate.filter(isRecord));
  }
  throw new Error('The JSON event log must contain an events array.');
};

export const parseCsvEventTable = (source: string): EventTable => {
  const { rows } = parseCsvTable(source);
  const [headerRow, ...dataRows] = rows.filter((row) => !row[0]?.trim().startsWith('#'));
  if (!headerRow) throw new Error('The CSV event log is empty.');
  return {
    format: 'csv',
    headers: headerRow.map((header) => header.trim()),
    rows: dataRows,
  };
};

export const detectEventLogFormat = (
  fileName: string,
  source: string,
): EventLogFormat => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xes') || lower.endsWith('.xes.xml')) return 'xes';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt'))
    return 'csv';
  const trimmed = source.trimStart();
  if (trimmed.startsWith('<')) return 'xes';
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return 'json';
  return 'csv';
};

export const parseEventTable = (fileName: string, source: string): EventTable => {
  const format = detectEventLogFormat(fileName, source);
  const table =
    format === 'xes'
      ? parseXesTable(source)
      : format === 'json'
        ? parseJsonTable(source)
        : parseCsvEventTable(source);
  if (table.rows.length > MAX_EVENT_ROWS) {
    throw new Error(`The event log has more than ${MAX_EVENT_ROWS} events.`);
  }
  if (table.headers.length < 3 || table.rows.length === 0) {
    throw new Error('The event log needs at least case, activity and timestamp columns.');
  }
  return table;
};

const normalizeHeader = (header: string): string =>
  header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const MAPPING_CANDIDATES: Record<keyof ColumnMapping, string[]> = {
  caseId: [
    'caseconceptname',
    'caseid',
    'case',
    'caseidentifier',
    'orderid',
    'salesorder',
    'ordernumber',
    'ticketid',
    'ticket',
    'incidentid',
    'incident',
    'claimid',
    'requestid',
    'purchaseorder',
    'ponumber',
    'poid',
    'feature',
    'featureid',
    'maca',
    'traceid',
  ],
  activity: [
    'conceptname',
    'activity',
    'activityname',
    'event',
    'eventname',
    'task',
    'step',
    'action',
    'hoatdong',
    'hoatdongtacnghiep',
    'buoc',
  ],
  timestamp: [
    'timetimestamp',
    'timestamp',
    'completetimestamp',
    'completetime',
    'endtime',
    'end',
    'endtimestamp',
    'completed',
    'completedat',
    'finishtime',
    'datetime',
    'time',
    'date',
    'ketthuc',
    'thoigian',
  ],
  startTimestamp: [
    'starttimestamp',
    'starttime',
    'start',
    'startedat',
    'started',
    'begin',
    'batdau',
  ],
  lifecycle: ['lifecycletransition', 'lifecycle', 'transition', 'eventtype'],
  resource: [
    'orgresource',
    'resource',
    'user',
    'username',
    'performer',
    'assignee',
    'agent',
    'actor',
    'employee',
    'nguoithuchien',
    'role',
  ],
  cost: ['costtotal', 'cost', 'amount', 'costamount', 'chiphi'],
};

/** Suggests a mapping from header names (English, XES and Vietnamese conventions). */
export const suggestColumnMapping = (headers: string[]): Partial<ColumnMapping> => {
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
  const used = new Set<string>();
  const suggestion: Partial<ColumnMapping> = {};
  const order: Array<keyof ColumnMapping> = [
    'caseId',
    'startTimestamp',
    'timestamp',
    'lifecycle',
    'resource',
    'cost',
    'activity',
  ];
  for (const field of order) {
    const candidates = MAPPING_CANDIDATES[field];
    let best: { header: string; rank: number } | null = null;
    for (const { header, key } of normalized) {
      if (used.has(header)) continue;
      const rank = candidates.indexOf(key);
      if (rank >= 0 && (best == null || rank < best.rank)) best = { header, rank };
    }
    if (best) {
      suggestion[field] = best.header;
      used.add(best.header);
    }
  }
  return suggestion;
};

export const isCompleteMapping = (
  mapping: Partial<ColumnMapping>,
): mapping is ColumnMapping =>
  Boolean(mapping.caseId && mapping.activity && mapping.timestamp) &&
  new Set([mapping.caseId, mapping.activity, mapping.timestamp]).size === 3;

const parseNumber = (raw: string | undefined): number | undefined => {
  if (raw == null || raw.trim() === '') return undefined;
  const value = Number(raw.replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Applies a column mapping. Lifecycle `start`/`complete` pairs (XES) are
 * merged into one event with a start time; other lifecycle states such as
 * `schedule` or `assign` are ignored because they do not delimit work.
 */
export const buildEventLog = (
  table: EventTable,
  mapping: ColumnMapping,
  name = 'Event log',
): EventLogBuildResult => {
  const index = (column: string | undefined) =>
    column ? table.headers.indexOf(column) : -1;
  const caseIndex = index(mapping.caseId);
  const activityIndex = index(mapping.activity);
  const timeIndex = index(mapping.timestamp);
  const startIndex = index(mapping.startTimestamp);
  const lifecycleIndex = index(mapping.lifecycle);
  const resourceIndex = index(mapping.resource);
  const costIndex = index(mapping.cost);
  if (caseIndex < 0 || activityIndex < 0 || timeIndex < 0) {
    throw new Error('Case ID, activity and timestamp columns are required.');
  }
  const sample = table.rows.slice(0, 2000);
  const dayFirst = detectDayFirst([
    ...sample.map((row) => row[timeIndex] ?? ''),
    ...(startIndex >= 0 ? sample.map((row) => row[startIndex] ?? '') : []),
  ]);

  const events: MiningEvent[] = [];
  const openStarts = new Map<string, number[]>();
  let skippedRows = 0;
  let invalidTimestamps = 0;

  table.rows.forEach((row) => {
    const caseId = row[caseIndex]?.trim();
    const activity = row[activityIndex]?.trim();
    const time = parseTimestamp(row[timeIndex] ?? '', dayFirst);
    if (!caseId || !activity) {
      skippedRows += 1;
      return;
    }
    if (time == null) {
      invalidTimestamps += 1;
      return;
    }
    const lifecycle =
      lifecycleIndex >= 0 ? row[lifecycleIndex]?.trim().toLowerCase() : undefined;
    const pairKey = `${caseId}\u0000${activity}`;
    if (lifecycle === 'start') {
      const queue = openStarts.get(pairKey) ?? [];
      queue.push(time);
      openStarts.set(pairKey, queue);
      return;
    }
    if (lifecycle && lifecycle !== 'complete' && lifecycle !== 'completed') return;
    const explicitStart =
      startIndex >= 0
        ? (parseTimestamp(row[startIndex] ?? '', dayFirst) ?? undefined)
        : undefined;
    const pairedStart = openStarts.get(pairKey)?.shift();
    const startTime = explicitStart ?? pairedStart;
    events.push({
      caseId,
      activity,
      completeTime: time,
      startTime: startTime != null && startTime <= time ? startTime : undefined,
      resource: resourceIndex >= 0 ? row[resourceIndex]?.trim() || undefined : undefined,
      cost: costIndex >= 0 ? parseNumber(row[costIndex]) : undefined,
    });
  });

  return {
    log: createEventLog(name, events),
    skippedRows,
    invalidTimestamps,
  };
};

export const createEventLog = (name: string, events: MiningEvent[]): EventLog => ({
  name,
  events,
  hasStartTimes: events.length > 0 && events.some((event) => event.startTime != null),
  hasCosts: events.some((event) => event.cost != null),
});
