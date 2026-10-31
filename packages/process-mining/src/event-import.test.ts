import { describe, expect, it } from 'vitest';
import { inspectEventImport } from './event-import-layout';
import { prepareEventImport } from './event-import-review';
import {
  DEFAULT_EVENT_IMPORT_SETTINGS as defaults,
  isEventImportSettings,
} from './event-import-settings';
import { createEventLogTemplate } from './event-log-templates';
import { isCompleteMapping } from './parse';

const mapping = {
  caseId: 'case_id',
  activity: 'activity',
  timestamp: 'timestamp',
  startTimestamp: 'start_timestamp',
  resource: 'resource',
};
const inspect = (rows: string) =>
  inspectEventImport(
    'events.csv',
    'case_id,activity,timestamp,start_timestamp,resource\n' + rows,
  );

describe('event import boundary', () => {
  it('recognizes a Jira changelog without treating its editor as the performer', () => {
    const template = createEventLogTemplate('jira-status');
    const imported = inspectEventImport(template.fileName, template.csv);
    expect(imported.layout.settings.mode).toBe('jira-status');
    expect(imported.suggestion).toEqual({
      caseId: 'Issue key',
      activity: 'To status',
      timestamp: 'Change time',
    });
    if (!isCompleteMapping(imported.suggestion)) throw Error('missing mapping');
    const confirmed = imported.suggestion;
    const { result, review } = prepareEventImport(
      imported.table,
      confirmed,
      imported.layout.settings,
      'Jira',
    );
    expect(review).toMatchObject({
      acceptedEvents: 6,
      caseCount: 2,
      statusEvents: true,
      resourceEvents: 0,
      missingStartTimes: 6,
    });
    expect(result.log.hasStartTimes).toBe(false);
    expect(result.log.events[0].activity).toBe('In Progress');
    expect(() =>
      prepareEventImport(
        imported.table,
        { ...confirmed, resource: 'Changed by' },
        imported.layout.settings,
        'wrong',
      ),
    ).toThrow('import-status-fields');
  });
  it('rejects snapshots and exposes invalid settings', () => {
    const imported = inspectEventImport(
      'jira.csv',
      'Issue key,Summary,Status,Updated\nD-1,Feature,Done,2026-10-05T08:00:00Z',
    );
    expect(imported.layout.kind).toBe('snapshot');
    expect(() =>
      prepareEventImport(
        imported.table,
        { caseId: 'Issue key', activity: 'Status', timestamp: 'Updated' },
        imported.layout.settings,
        'snapshot',
      ),
    ).toThrow('import-snapshot');
    for (const patch of [
      { utcOffsetMinutes: Infinity },
      { utcOffsetMinutes: 841 },
      { headerRow: 0 },
      { headerRow: 51 },
      { mode: 'unknown' },
      { dateOrder: 'guess' },
    ])
      expect(isEventImportSettings({ ...defaults, ...patch })).toBe(false);
  });
  it('locates headers after title records, handles semicolons and preserves quoted fields', () => {
    const imported = inspectEventImport(
      'export.csv',
      'Company export\ncase_id;activity;timestamp\nC1;"Review; request";2026-10-05T08:00:00Z',
    );
    expect(imported.layout.settings.headerRow).toBe(2);
    expect(imported.table.rows).toEqual([
      ['C1', 'Review; request', '2026-10-05T08:00:00Z'],
    ]);
    const xlsx = inspectEventImport(
      'sheet.xlsx',
      'Title\nCase,Task,Timestamp\n1,A,2026-10-05',
    );
    expect(xlsx.table.format).toBe('xlsx');
    expect(xlsx.layout.settings.headerRow).toBe(2);
    expect(() => inspectEventImport('export.csv', 'A,a,B\n1,2,3', defaults)).toThrow(
      /duplicate/,
    );
  });
  it('preserves multiline cells and applies offsets only to unzoned dates', () => {
    const imported = inspectEventImport(
      'multiline.csv',
      '"Case\nID",Activity,Timestamp\nC1,"A\nB",2026-10-05Z',
    );
    const { result } = prepareEventImport(
      imported.table,
      { caseId: 'Case\nID', activity: 'Activity', timestamp: 'Timestamp' },
      { ...defaults, utcOffsetMinutes: 420 },
      'Multiline',
    );
    expect(result.log.events[0].activity).toBe('A\nB');
    expect(result.log.events[0].completeTime).toBe(Date.parse('2026-10-05T00:00:00Z'));
  });
  it('keeps valid events while reporting bad rows, duplicate rows and invalid starts', () => {
    const imported = inspect(
      [
        'C1,A,2026-10-05T09:00:00Z,2026-10-05T08:00:00Z,Ann',
        'C1,A,2026-10-05T09:00:00Z,2026-10-05T08:00:00Z,Ann',
        'C1,B,2026-10-05T10:00:00Z,2026-10-05T11:00:00Z,Bob',
        'C1,C,no-date,,',
        ',D,2026-10-05T11:00:00Z,,',
        'C1,E,2026-10-05T12:00:00Z,,,extra',
      ].join('\n'),
    );
    const { result, review } = prepareEventImport(
      imported.table,
      mapping,
      defaults,
      'Review',
    );
    expect(review).toMatchObject({
      acceptedEvents: 3,
      rejectedRows: 3,
      duplicateRows: 1,
      missingStartTimes: 1,
      resourceEvents: 3,
      caseCount: 1,
    });
    expect(result).toMatchObject({
      skippedRows: 2,
      invalidTimestamps: 1,
      invalidStartTimes: 1,
    });
    expect(review.issues).toContainEqual({ row: 4, code: 'start' });
    expect(result.log.events[2].startTime).toBeUndefined();
    expect(imported.table.rows[2][3]).toBe('2026-10-05T11:00:00Z');
  });
  it('requires an explicit order for ambiguous dates and normalizes unzoned times only', () => {
    const imported = inspect('C1,A,03/04/2026 10:00,03/04/2026 09:00,Ann');
    expect(
      prepareEventImport(imported.table, mapping, defaults, 'Dates').review
        .ambiguousDates,
    ).toBe(true);
    const dayFirst = prepareEventImport(
      imported.table,
      mapping,
      { ...defaults, dateOrder: 'day-first', utcOffsetMinutes: 420 },
      'Dates',
    );
    expect(dayFirst.result.log.events[0].completeTime).toBe(
      Date.parse('2026-04-03T03:00:00Z'),
    );
    const monthFirst = prepareEventImport(
      imported.table,
      mapping,
      { ...defaults, dateOrder: 'month-first', utcOffsetMinutes: 420 },
      'Dates',
    );
    expect(monthFirst.result.log.events[0].completeTime).toBe(
      Date.parse('2026-03-04T03:00:00Z'),
    );
    const zoned = inspect('C1,A,2026-10-05T10:00:00+07:00,1791165600,Ann');
    const event = prepareEventImport(
      zoned.table,
      mapping,
      { ...defaults, utcOffsetMinutes: -300 },
      'Zoned',
    ).result.log.events[0];
    expect(event.completeTime).toBe(Date.parse('2026-10-05T03:00:00Z'));
    expect(event.startTime).toBe(1791165600000);
  });
  it('reviews numeric dates beyond the initial preview and detects mixed orders', () => {
    const imported = inspect(
      [
        ...Array.from({ length: 2001 }, () => 'C1,A,2026-10-05T10:00:00Z,,Ann'),
        'C1,B,03/04/2026 10:00,,Ann',
      ].join('\n'),
    );
    expect(
      prepareEventImport(imported.table, mapping, defaults, 'Late date').review
        .ambiguousDates,
    ).toBe(true);
    const mixed = inspect('C1,A,13/04/2026 10:00,,Ann\nC1,B,04/14/2026 10:00,,Ann');
    expect(
      prepareEventImport(mixed.table, mapping, defaults, 'Mixed').review.ambiguousDates,
    ).toBe(true);
  });
  it('pairs unsorted lifecycle rows, retains tied source order and reports unfinished starts', () => {
    const imported = inspectEventImport(
      'xes.csv',
      'case,activity,time,lifecycle\n1,A,2026-10-05T10:00:00Z,complete\n1,A,2026-10-05T08:00:00Z,start\n1,B,2026-10-05T11:00:00Z,start\n1,C,2026-10-05T09:00:00Z,schedule',
    );
    const { result, review } = prepareEventImport(
      imported.table,
      { caseId: 'case', activity: 'activity', timestamp: 'time', lifecycle: 'lifecycle' },
      defaults,
      'Lifecycle',
    );
    expect(result.log.events).toHaveLength(1);
    expect(result.log.events[0].startTime).toBe(Date.parse('2026-10-05T08:00:00Z'));
    expect(review).toMatchObject({ unpairedStarts: 1, rejectedRows: 1 });
  });
  it('bounds row diagnostics and validates unknown and repeated mapping columns', () => {
    const imported = inspect(Array.from({ length: 100 }, () => 'C1,A,bad,,').join('\n'));
    expect(
      prepareEventImport(imported.table, mapping, defaults, 'Invalid').review.issues,
    ).toHaveLength(50);
    expect(() =>
      prepareEventImport(
        imported.table,
        { ...mapping, activity: 'missing' },
        defaults,
        'Invalid',
      ),
    ).toThrow('import-mapping');
    expect(() =>
      prepareEventImport(
        imported.table,
        { ...mapping, activity: 'case_id' },
        defaults,
        'Invalid',
      ),
    ).toThrow('import-mapping');
  });
  it('round-trips the Flowculus template with processing times and resources', () => {
    const template = createEventLogTemplate('events');
    const imported = inspectEventImport(template.fileName, template.csv);
    expect(isCompleteMapping(imported.suggestion)).toBe(true);
    if (!isCompleteMapping(imported.suggestion)) return;
    const { result, review } = prepareEventImport(
      imported.table,
      imported.suggestion,
      imported.layout.settings,
      'Template',
    );
    expect(review).toMatchObject({
      acceptedEvents: 6,
      caseCount: 2,
      rejectedRows: 0,
      missingStartTimes: 0,
      resourceEvents: 6,
    });
    expect(result.log.events[0].completeTime - result.log.events[0].startTime!).toBe(
      3600000,
    );
  });
});
