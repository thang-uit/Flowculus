import { buildEventLog, isCompleteMapping, MAX_EVENT_ROWS } from './parse';
import { parseTimestamp } from './timestamp';
import { isEventImportSettings, type EventImportSettings } from './event-import-settings';
import type { ColumnMapping, EventLogBuildResult, EventTable } from './types';

export type ImportIssueCode = 'shape' | 'required' | 'timestamp' | 'start' | 'lifecycle';
export interface EventImportReview {
  acceptedEvents: number;
  rejectedRows: number;
  duplicateRows: number;
  unpairedStarts: number;
  issues: { row: number; code: ImportIssueCode }[];
  missingStartTimes: number;
  resourceEvents: number;
  costEvents: number;
  caseCount: number;
  ambiguousDates: boolean;
  statusEvents: boolean;
}

const numericDate = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}/;
const explicitZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/** Normalize in the worker, then reuse the canonical lifecycle pairing and log builder. */
export function prepareEventImport(
  table: EventTable,
  mapping: ColumnMapping,
  settings: EventImportSettings,
  name: string,
): { result: EventLogBuildResult; review: EventImportReview } {
  if (!isEventImportSettings(settings)) throw new Error('import-invalid-settings');
  if (settings.mode === 'snapshot') throw new Error('import-snapshot');
  if (table.rows.length > MAX_EVENT_ROWS) throw new Error('import-row-limit');
  if (
    !isCompleteMapping(mapping) ||
    Object.values(mapping).some((column) => column && !table.headers.includes(column))
  )
    throw new Error('import-mapping');
  if (
    settings.mode === 'jira-status' &&
    (mapping.resource || mapping.cost || mapping.startTimestamp || mapping.lifecycle)
  )
    throw new Error('import-status-fields');

  const index = (field: keyof ColumnMapping) =>
    mapping[field] ? table.headers.indexOf(mapping[field]!) : -1;
  const timeIndex = index('timestamp');
  const startIndex = index('startTimestamp');
  const caseIndex = index('caseId');
  const activityIndex = index('activity');
  const lifeIndex = index('lifecycle');
  let numericDates = 0;
  let dayEvidence = false;
  let monthEvidence = false;
  // Inspect every date without allocating a second array for a large log.
  for (const row of table.rows) {
    for (const column of [timeIndex, startIndex]) {
      if (column < 0) continue;
      const match = row[column]?.trim().match(numericDate);
      if (!match) continue;
      numericDates += 1;
      dayEvidence ||= Number(match[1]) > 12;
      monthEvidence ||= Number(match[2]) > 12;
    }
  }
  const dayFirst =
    settings.dateOrder === 'auto'
      ? dayEvidence || !monthEvidence
      : settings.dateOrder === 'day-first';
  const parse = (raw: string): number | null => {
    const time = parseTimestamp(raw, dayFirst);
    const value = raw.trim();
    const offset =
      explicitZone.test(value.slice(10)) || /^\d{9,14}(?:\.\d+)?$/.test(value)
        ? 0
        : settings.utcOffsetMinutes * 60_000;
    return time == null ? null : time - offset;
  };
  const review: EventImportReview = {
    acceptedEvents: 0,
    rejectedRows: 0,
    duplicateRows: 0,
    unpairedStarts: 0,
    issues: [],
    missingStartTimes: 0,
    resourceEvents: 0,
    costEvents: 0,
    caseCount: 0,
    ambiguousDates:
      settings.dateOrder === 'auto' && numericDates > 0 && dayEvidence === monthEvidence,
    statusEvents: settings.mode === 'jira-status',
  };
  const issue = (row: number, code: ImportIssueCode) => {
    if (review.issues.length < 50)
      review.issues.push({ row: row + settings.headerRow + 1, code });
  };
  const rows: { row: string[]; time: number }[] = [];
  const seen = new Set<string>();
  let invalidTimestamps = 0;
  let invalidStartTimes = 0;
  let starts = 0;
  table.rows.forEach((raw, rowIndex) => {
    const time = parse(raw[timeIndex] ?? '');
    const lifecycle = lifeIndex < 0 ? '' : raw[lifeIndex]?.trim().toLowerCase();
    const code =
      raw.length !== table.headers.length
        ? 'shape'
        : !raw[caseIndex]?.trim() || !raw[activityIndex]?.trim()
          ? 'required'
          : time == null
            ? 'timestamp'
            : lifecycle && !['start', 'complete', 'completed'].includes(lifecycle)
              ? 'lifecycle'
              : null;
    if (code) {
      review.rejectedRows += 1;
      if (code === 'timestamp') invalidTimestamps += 1;
      issue(rowIndex, code);
      return;
    }
    const row = [...raw];
    row[timeIndex] = new Date(time!).toISOString();
    const startRaw = startIndex < 0 ? '' : raw[startIndex]?.trim();
    if (startRaw) {
      const start = parse(startRaw);
      if (start == null || start > time!) {
        invalidStartTimes += 1;
        row[startIndex] = '';
        issue(rowIndex, 'start');
      } else row[startIndex] = new Date(start).toISOString();
    }
    const fingerprint = JSON.stringify(row);
    if (seen.has(fingerprint)) review.duplicateRows += 1;
    seen.add(fingerprint);
    if (lifecycle === 'start') starts += 1;
    rows.push({ row, time: time! });
  });
  // Stable sort pairs unsorted lifecycle histories without changing ties in source order.
  if (lifeIndex >= 0) rows.sort((a, b) => a.time - b.time);
  const result = buildEventLog(
    { ...table, rows: rows.map((item) => item.row) },
    mapping,
    name,
  );
  result.skippedRows += review.rejectedRows - invalidTimestamps;
  result.invalidTimestamps += invalidTimestamps;
  result.invalidStartTimes += invalidStartTimes;
  review.acceptedEvents = result.log.events.length;
  review.missingStartTimes = result.log.events.filter(
    (event) => event.startTime == null,
  ).length;
  review.resourceEvents = result.log.events.filter((event) => !!event.resource).length;
  review.costEvents = result.log.events.filter((event) => event.cost != null).length;
  review.caseCount = new Set(result.log.events.map((event) => event.caseId)).size;
  // Explicit starts can coexist with lifecycle starts, so count consumed start rows separately.
  if (starts) {
    const completionCounts = new Map<string, number>();
    for (const { row } of rows) {
      const key = JSON.stringify([row[caseIndex].trim(), row[activityIndex].trim()]);
      const count = completionCounts.get(key) ?? 0;
      if (row[lifeIndex]?.trim().toLowerCase() === 'start')
        completionCounts.set(key, count + 1);
      else if (count > 0) completionCounts.set(key, count - 1);
    }
    review.unpairedStarts = [...completionCounts.values()].reduce(
      (sum, count) => sum + count,
      0,
    );
  }
  return { result, review };
}
