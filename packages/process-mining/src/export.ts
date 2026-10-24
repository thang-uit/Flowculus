import { escapeCsvValue } from '@flowculus/file-formats';

import type { EventLog } from './types';

const isoOrEmpty = (value: number | undefined): string =>
  value == null ? '' : new Date(value).toISOString().replace('.000Z', 'Z');

/** Writes a log in the column layout that `suggestColumnMapping` recognises. */
export const eventLogToCsv = (log: EventLog): string => {
  const header = [
    'case_id',
    'activity',
    'start_timestamp',
    'timestamp',
    'resource',
    'cost',
  ];
  const rows = log.events.map((event) => [
    event.caseId,
    event.activity,
    isoOrEmpty(event.startTime),
    isoOrEmpty(event.completeTime),
    event.resource ?? '',
    event.cost == null ? '' : String(event.cost),
  ]);
  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
};
