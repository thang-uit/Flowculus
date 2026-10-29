import { describe, expect, it } from 'vitest';

import { createMiningLogReader, MINING_LOG_PAGE_SIZE } from './mining-log-page';

const eventLog = {
  name: 'test',
  hasStartTimes: true,
  hasCosts: false,
  events: Array.from({ length: MINING_LOG_PAGE_SIZE + 2 }, (_, index) => ({
    caseId: `case-${index % 2}`,
    activity: index % 2 ? 'Review' : 'Create',
    completeTime: 1_000 + index,
    startTime: 900 + index,
    resource: index % 2 ? 'QA' : 'BA',
  })),
};

describe('mining log page reader', () => {
  it('pages accepted events without copying the full log', () => {
    const read = createMiningLogReader(eventLog, 4);
    const page = read({ offset: MINING_LOG_PAGE_SIZE });
    expect(page).toMatchObject({
      type: 'log-page',
      logVersion: 4,
      total: 52,
      matched: 52,
    });
    expect(page.rows).toHaveLength(2);
    expect(page.rows[0]?.index).toBe(51);
  });

  it('filters and sorts deterministically with a bounded offset', () => {
    const read = createMiningLogReader(eventLog, 1);
    const page = read({ activity: 'review', sort: 'complete-desc', offset: 999 });
    expect(page.matched).toBe(26);
    expect(page.offset).toBe(0);
    expect(page.rows[0]?.event.activity).toBe('Review');
    expect(page.rows[0]?.event.completeTime).toBeGreaterThan(
      page.rows[1]?.event.completeTime ?? 0,
    );
  });

  it('rejects invalid sort and offsets', () => {
    const read = createMiningLogReader(eventLog, 1);
    expect(() => read({ sort: 'invalid' as never })).toThrow('invalid-log-sort');
    expect(() => read({ offset: -1 })).toThrow('invalid-log-offset');
    expect(() => read({ offset: Number.NaN })).toThrow('invalid-log-offset');
    expect(() => read({ offset: Infinity })).toThrow('invalid-log-offset');
  });

  it('combines case, activity and resource search without changing graph data', () => {
    const read = createMiningLogReader(eventLog, 1);
    expect(read({ caseId: 'case-0', activity: 'review' })).toMatchObject({
      matched: 0,
      offset: 0,
      rows: [],
    });
    expect(read({ caseId: ' CASE-1 ', query: 'qa' }).matched).toBe(26);
    expect(read({}).total).toBe(52);
    expect(eventLog.events[0]?.activity).toBe('Create');
  });

  it('returns empty logs safely and keeps tied timestamps in imported order', () => {
    expect(
      createMiningLogReader({ ...eventLog, events: [] }, 1)({ offset: 50 }),
    ).toMatchObject({ total: 0, matched: 0, offset: 0, rows: [] });
    const events = eventLog.events
      .slice(0, 3)
      .map((event) => ({ ...event, completeTime: 1000 }));
    expect(
      createMiningLogReader(
        { ...eventLog, events },
        1,
      )({ sort: 'complete-desc' }).rows.map((row) => row.index),
    ).toEqual([1, 2, 3]);
  });
});
