import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_FILTER as filter,
  DEFAULT_EVENT_IMPORT_SETTINGS as defaults,
  createEventLogTemplate,
} from '@flowculus/process-mining';
import { createMiningSession } from './mining-engine';
import { replayMiningLog } from './mining-replay';
import { emptyMiningSnapshot } from './mining-tabs';
import { parseMiningDraft } from './mining-draft-schema';

const mapping = { caseId: 'Case', activity: 'Task', timestamp: 'Time' };
const source = 'Title\nCase,Task,Time\n1,A,03/04/2026 08:00\n1,B,03/04/2026 09:00';
const settings = {
  ...defaults,
  headerRow: 2,
  dateOrder: 'month-first' as const,
  utcOffsetMinutes: 420,
};

describe('reviewed Mining imports', () => {
  it('reviews without replacing the current log and reuses canonical evidence after confirmation', () => {
    const session = createMiningSession();
    session({ type: 'load-preset', presetId: 'it-service-desk', filter });
    session({ type: 'inspect-file', fileName: 'custom.csv', source });
    expect(session({ type: 'review-import', mapping, settings })).toMatchObject({
      type: 'import-review',
      review: { acceptedEvents: 2, caseCount: 1 },
    });
    expect(session({ type: 'discover', filter })).toMatchObject({
      logName: 'IT Service Desk',
    });
    const result = session({
      type: 'apply-mapping',
      mapping,
      settings,
      name: 'Custom',
      filter,
    });
    expect(result).toMatchObject({
      logName: 'Custom',
      discovery: { stats: { eventCount: 2, meanLeadTimeMs: 3600000 } },
      importReview: { acceptedEvents: 2 },
    });
    const page = session({ type: 'read-log-page', offset: 0 });
    expect(page.type === 'log-page' && page.rows[0].event.completeTime).toBe(
      Date.parse('2026-03-04T01:00:00Z'),
    );
    expect(session({ type: 'discover', filter })).toEqual(result);
  });
  it('blocks ambiguous dates and a header that differs from the inspected table', () => {
    const session = createMiningSession();
    session({ type: 'inspect-file', fileName: 'custom.csv', source });
    expect(() =>
      session({
        type: 'apply-mapping',
        mapping,
        settings: { ...settings, dateOrder: 'auto' },
        name: 'Bad',
        filter,
      }),
    ).toThrow('import-ambiguous-dates');
    expect(() =>
      session({
        type: 'review-import',
        mapping,
        settings: { ...settings, headerRow: 1 },
      }),
    ).toThrow('import-invalid-header');
  });
  it('replays each log with its own header, date order and timezone after reload', async () => {
    const session = createMiningSession();
    const result = await replayMiningLog(
      async (request) => session(request),
      { kind: 'file', fileName: 'custom.csv', source, mapping, settings },
      filter,
      { basis: 'elapsed' },
      () => true,
    );
    expect(result?.discovery.stats.meanLeadTimeMs).toBe(3600000);
    const page = session({ type: 'read-log-page', offset: 0 });
    expect(page.type === 'log-page' && page.rows[0].event.completeTime).toBe(
      Date.parse('2026-03-04T01:00:00Z'),
    );
  });
  it('does not leak a previous review into Jira or a preset', () => {
    const session = createMiningSession();
    const template = createEventLogTemplate('jira-status');
    const table = session({
      type: 'inspect-file',
      fileName: template.fileName,
      source: template.csv,
    });
    if (table.type !== 'table') throw Error('Expected table');
    const jiraMapping = {
      caseId: 'Issue key',
      activity: 'To status',
      timestamp: 'Change time',
    };
    const result = session({
      type: 'apply-mapping',
      mapping: jiraMapping,
      settings: table.layout.settings,
      name: 'Jira',
      filter,
    });
    expect(result).toMatchObject({
      hasStartTimes: false,
      importReview: { statusEvents: true, resourceEvents: 0 },
    });
    expect(
      session({ type: 'load-preset', presetId: 'it-service-desk', filter }),
    ).not.toHaveProperty('importReview');
  });
  it('validates persisted import settings and remains compatible with older drafts', () => {
    const tab = {
      ...emptyMiningSnapshot(),
      id: 'log-1',
      replay: {
        kind: 'file' as const,
        fileName: 'custom.csv',
        source,
        mapping,
        settings,
      },
    };
    const draft = { version: 1, updatedAt: 100, activeTabId: tab.id, tabs: [tab] };
    expect(parseMiningDraft(draft)?.tabs[0].replay).toEqual(tab.replay);
    expect(
      parseMiningDraft({
        ...draft,
        tabs: [{ ...tab, replay: { ...tab.replay, settings: undefined } }],
      }),
    ).not.toBeNull();
    expect(
      parseMiningDraft({
        ...draft,
        tabs: [
          {
            ...tab,
            replay: { ...tab.replay, settings: { ...settings, utcOffsetMinutes: 900 } },
          },
        ],
      }),
    ).toBeNull();
  });
});
