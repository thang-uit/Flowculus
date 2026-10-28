import { describe, expect, it } from 'vitest';

import { DEFAULT_DISCOVERY_FILTER } from '@flowculus/process-mining';

import { createMiningSession } from './mining-engine';

describe('mining session', () => {
  it('inspects, maps, discovers, filters, converts and exports a log', () => {
    const handle = createMiningSession();
    const table = handle({
      type: 'inspect-file',
      fileName: 'orders.csv',
      source: [
        'Order ID,Activity,Start Time,End Time,User',
        'o1,Create,2026-10-01 08:00,2026-10-01 08:30,ann',
        'o1,Approve,2026-10-01 10:00,2026-10-01 10:20,bob',
        'o2,Create,2026-10-02 08:00,2026-10-02 08:40,ann',
        'o2,Reject,2026-10-02 09:00,2026-10-02 09:05,bob',
      ].join('\n'),
    });
    if (table.type !== 'table') throw new Error('expected a table');
    expect(table.suggestion).toMatchObject({
      caseId: 'Order ID',
      activity: 'Activity',
      startTimestamp: 'Start Time',
      timestamp: 'End Time',
      resource: 'User',
    });
    const discovery = handle({
      type: 'apply-mapping',
      mapping: {
        caseId: 'Order ID',
        activity: 'Activity',
        timestamp: 'End Time',
        startTimestamp: 'Start Time',
        resource: 'User',
      },
      name: 'orders',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    if (discovery.type !== 'discovery') throw new Error('expected a discovery');
    expect(discovery.discovery.stats).toMatchObject({
      caseCount: 2,
      eventCount: 4,
      variantCount: 2,
    });
    const filtered = handle({
      type: 'discover',
      filter: { ...DEFAULT_DISCOVERY_FILTER, minActivityShare: 1 },
    });
    if (filtered.type !== 'discovery') throw new Error('expected a discovery');
    expect(filtered.activityNames).toEqual(['Approve', 'Create', 'Reject']);
    expect(filtered.discovery.hiddenActivityCount).toBeGreaterThan(0);
    const standards = handle({
      type: 'compare-standards',
      standards: [{ activity: 'Approve', maxServiceMinutes: 10 }],
    });
    expect(standards).toMatchObject({
      type: 'standards',
      totalEvents: 4,
      measuredEvents: 4,
      comparedEvents: 1,
    });
    const model = handle({
      type: 'to-model',
      filter: DEFAULT_DISCOVERY_FILTER,
      name: 'orders',
    });
    if (model.type !== 'model') throw new Error('expected a model');
    expect(Object.values(model.model.nodes).some((node) => node.kind === 'gateway')).toBe(
      true,
    );
    const csv = handle({ type: 'export-log' });
    expect(csv.type === 'csv' && csv.csv.split('\n')).toHaveLength(5);
  });

  it('loads presets without an upload and reports a missing log clearly', () => {
    const handle = createMiningSession();
    expect(() => handle({ type: 'discover', filter: DEFAULT_DISCOVERY_FILTER })).toThrow(
      'No event log is loaded.',
    );
    const preset = handle({
      type: 'load-preset',
      presetId: 'it-service-desk',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    expect(
      preset.type === 'discovery' && preset.discovery.stats.caseCount,
    ).toBeGreaterThan(100);
  });
});

describe('mining session lifecycle', () => {
  it('validates the explicit process title without replacing the source log name', () => {
    const session = createMiningSession();
    session({
      type: 'load-preset',
      presetId: 'it-service-desk',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    for (const name of ['', '   ', 'x'.repeat(121), 'A\u0000B']) {
      expect(() =>
        session({ type: 'to-model', name, filter: DEFAULT_DISCOVERY_FILTER }),
      ).toThrow('invalid-process-name');
    }
    const converted = session({
      type: 'to-model',
      name: '  Quy trình của tôi  ',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    expect(converted.type === 'model' && converted.model.name).toBe('Quy trình của tôi');
    const exported = session({ type: 'export-log' });
    expect(exported.type === 'csv' && exported.logName).toBe('IT Service Desk');
  });
  it('replaces cached discoveries when a different log is loaded', () => {
    const session = createMiningSession();
    session({
      type: 'load-preset',
      presetId: 'order-to-cash',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    session({
      type: 'inspect-file',
      fileName: 'small.csv',
      source: 'caseId,activity,timestamp\n1,Custom,2026-10-25',
    });
    const custom = session({
      type: 'apply-mapping',
      name: 'custom',
      mapping: { caseId: 'caseId', activity: 'activity', timestamp: 'timestamp' },
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    expect(custom.type).toBe('discovery');
    if (custom.type !== 'discovery') return;
    expect(custom.discovery.stats.eventCount).toBe(1);
    expect(custom.discovery.dfg.activities.map((activity) => activity.id)).toEqual([
      'Custom',
    ]);
    expect(custom.activityNames).toEqual(['Custom']);
    const filtered = session({ type: 'discover', filter: DEFAULT_DISCOVERY_FILTER });
    expect(filtered).toEqual(custom);
    expect(() =>
      session({
        type: 'apply-mapping',
        name: 'stale',
        mapping: { caseId: 'caseId', activity: 'activity', timestamp: 'timestamp' },
        filter: DEFAULT_DISCOVERY_FILTER,
      }),
    ).toThrow(/No event log file/);
    const preset = session({
      type: 'load-preset',
      presetId: 'order-to-cash',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    expect(preset.type).toBe('discovery');
    if (preset.type !== 'discovery') return;
    expect(preset.discovery.stats.eventCount).toBeGreaterThan(1);
    expect(preset.discovery.dfg.activities.map((activity) => activity.id)).not.toContain(
      'Custom',
    );
  });
});

it('switches every duration to the work calendar without changing activity identity or order', () => {
  const handle = createMiningSession();
  handle({
    type: 'inspect-file',
    fileName: 'weekend.csv',
    source: [
      'caseId,activity,start,timestamp,resource',
      '1,A,2026-10-09T16:00:00+07:00,2026-10-12T09:00:00+07:00,ann',
      '1,B,2026-10-12T11:00:00+07:00,2026-10-12T14:00:00+07:00,bob',
    ].join('\n'),
  });
  const initial = handle({
    type: 'apply-mapping',
    name: 'weekend',
    filter: DEFAULT_DISCOVERY_FILTER,
    mapping: {
      caseId: 'caseId',
      activity: 'activity',
      startTimestamp: 'start',
      timestamp: 'timestamp',
      resource: 'resource',
    },
  });
  const calendar = {
    utcOffsetMinutes: 420,
    weekdays: [1, 2, 3, 4, 5],
    shifts: [
      { startMinute: 480, endMinute: 720 },
      { startMinute: 780, endMinute: 1020 },
    ],
    holidays: [],
  };
  const working = handle({
    type: 'discover',
    filter: DEFAULT_DISCOVERY_FILTER,
    timePolicy: { basis: 'working', calendar },
  });
  if (initial.type !== 'discovery' || working.type !== 'discovery')
    throw Error('expected discovery');
  expect(initial.discovery.stats.meanLeadTimeMs / 3600000).toBe(70);
  expect(working.discovery.stats.meanLeadTimeMs / 3600000).toBe(6);
  expect(working.activityNames).toEqual(initial.activityNames);
  expect(working.discovery.variants.map((v) => v.activities)).toEqual(
    initial.discovery.variants.map((v) => v.activities),
  );
  const standards = handle({
    type: 'compare-standards',
    standards: [{ activity: 'A', maxServiceMinutes: 180 }],
  });
  expect(standards.type === 'standards' && standards.rows[0]).toMatchObject({
    meanMinutes: 120,
    exceeded: 0,
  });
  const explicitElapsed = handle({
    type: 'compare-standards',
    standards: [{ activity: 'A', maxServiceMinutes: 180 }],
    timePolicy: { basis: 'elapsed' },
  });
  expect(explicitElapsed.type === 'standards' && explicitElapsed.rows[0]).toMatchObject({
    meanMinutes: 65 * 60,
    exceeded: 1,
  });
  expect(
    handle({
      type: 'compare-standards',
      standards: [{ activity: 'A', maxServiceMinutes: 180 }],
    }),
  ).toEqual(standards);
  const elapsed = handle({
    type: 'discover',
    filter: DEFAULT_DISCOVERY_FILTER,
    timePolicy: { basis: 'elapsed' },
  });
  expect(elapsed).toEqual(initial);
  expect(() =>
    handle({
      type: 'discover',
      filter: DEFAULT_DISCOVERY_FILTER,
      timePolicy: { basis: 'working', calendar: { ...calendar, weekdays: [] } },
    }),
  ).toThrow('invalid-work-calendar');
});
