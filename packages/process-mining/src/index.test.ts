import { is6003Log } from './__fixtures__/is6003';
import { describe, expect, it } from 'vitest';

import { analyzeProcess } from '@flowculus/analysis-engine';
import { validateProcessModel } from '@flowculus/validation';

import {
  MINING_PRESETS,
  MAX_EVENT_ROWS,
  buildEventLog,
  createEventLog,
  dfgToProcessModel,
  discoverProcess,
  eventLogToCsv,
  generatePresetLog,
  isCompleteMapping,
  parseEventTable,
  parseTimestamp,
  suggestColumnMapping,
  type MiningEvent,
} from './index';

const HOUR = 3_600_000;
const at = (hours: number) => Date.UTC(2026, 9, 1) + hours * HOUR;

describe('parseTimestamp', () => {
  it('reads ISO, naive, day-first and epoch timestamps as UTC', () => {
    expect(parseTimestamp('2026-10-01T08:30:00Z')).toBe(Date.UTC(2026, 9, 1, 8, 30));
    expect(parseTimestamp('2026-10-01 08:30')).toBe(Date.UTC(2026, 9, 1, 8, 30));
    expect(parseTimestamp('2026-10-01T08:30:00+07:00')).toBe(Date.UTC(2026, 9, 1, 1, 30));
    expect(parseTimestamp('03/04/2026 14:05')).toBe(Date.UTC(2026, 3, 3, 14, 5));
    expect(parseTimestamp('03/04/2026 2:05 pm', false)).toBe(Date.UTC(2026, 2, 4, 14, 5));
    expect(parseTimestamp('1790000000')).toBe(1_790_000_000_000);
    expect(parseTimestamp('not a date')).toBeNull();
    expect(parseTimestamp('2026-13-01')).toBeNull();
  });
});

describe('event log parsing and column mapping', () => {
  it('enforces the event limit at the mapping boundary too', () => {
    expect(() =>
      buildEventLog(
        {
          format: 'csv',
          headers: ['caseId', 'activity', 'timestamp'],
          rows: new Array(MAX_EVENT_ROWS + 1),
        },
        { caseId: 'caseId', activity: 'activity', timestamp: 'timestamp' },
      ),
    ).toThrow(/more than/);
  });
  it('rejects ambiguous CSV column names', () => {
    expect(() => parseEventTable('log.csv', 'case,activity,activity\n1,A,B')).toThrow(
      /duplicate/,
    );
    expect(() => parseEventTable('log.csv', 'case,,timestamp\n1,A,2026-10-01')).toThrow(
      /empty/,
    );
  });
  it('suggests a mapping for Vietnamese report headers and builds the log', () => {
    const table = parseEventTable(
      'log.csv',
      [
        'Mã ca;Hoạt động tác nghiệp;Bắt đầu;Kết thúc;Người thực hiện;Chi phí',
        'FEAT_1;Phân tích;01/10/2026 08:30;01/10/2026 17:00;An;120',
        'FEAT_1;Lập trình;02/10/2026 08:00;05/10/2026 17:00;Huê;900,5',
        ';Bỏ qua;02/10/2026 08:00;05/10/2026 17:00;Huê;',
        'FEAT_1;Sai giờ;soon;later;Huê;',
      ].join('\n'),
    );
    const mapping = suggestColumnMapping(table.headers);
    expect(mapping).toEqual({
      caseId: 'Mã ca',
      activity: 'Hoạt động tác nghiệp',
      startTimestamp: 'Bắt đầu',
      timestamp: 'Kết thúc',
      resource: 'Người thực hiện',
      cost: 'Chi phí',
    });
    expect(isCompleteMapping(mapping)).toBe(true);
    const result = buildEventLog(table, mapping as Parameters<typeof buildEventLog>[1]);
    expect(result.skippedRows).toBe(1);
    expect(result.invalidTimestamps).toBe(1);
    expect(result.invalidStartTimes).toBe(0);
    expect(result.log.hasStartTimes).toBe(true);
    expect(result.log.events[1]).toMatchObject({
      activity: 'Lập trình',
      startTime: Date.UTC(2026, 9, 2, 8),
      completeTime: Date.UTC(2026, 9, 5, 17),
      cost: 900.5,
    });
  });

  it('rejects duplicate optional mappings and reports invalid start times', () => {
    const table = parseEventTable(
      'log.csv',
      [
        'caseId,activity,timestamp,startTimestamp',
        'c1,A,2026-10-01T09:00:00Z,2026-10-01T10:00:00Z',
        'c1,B,2026-10-01T11:00:00Z,not-a-time',
      ].join('\n'),
    );
    const mapping = {
      caseId: 'caseId',
      activity: 'activity',
      timestamp: 'timestamp',
      startTimestamp: 'startTimestamp',
    };
    expect(isCompleteMapping({ ...mapping, resource: 'activity' })).toBe(false);
    expect(() => buildEventLog(table, { ...mapping, resource: 'activity' })).toThrow(
      /distinct/,
    );
    expect(buildEventLog(table, mapping)).toMatchObject({
      invalidStartTimes: 2,
      log: { events: [{ startTime: undefined }, { startTime: undefined }] },
    });
  });

  it('reads XES and pairs lifecycle start/complete events', () => {
    const xes = `<?xml version="1.0"?><log xes.version="1.0"><trace><string key="concept:name" value="c1"/>
      <event><string key="concept:name" value="A"/><string key="lifecycle:transition" value="start"/><date key="time:timestamp" value="2026-10-01T08:00:00.000+00:00"/></event>
      <event><string key="concept:name" value="A"/><string key="lifecycle:transition" value="complete"/><date key="time:timestamp" value="2026-10-01T09:00:00.000+00:00"/><string key="org:resource" value="Ann"/></event>
      <event><string key="concept:name" value="B"/><string key="lifecycle:transition" value="complete"/><date key="time:timestamp" value="2026-10-01T12:00:00.000+00:00"/><float key="cost:total" value="12.5"/></event>
    </trace></log>`;
    const table = parseEventTable('log.xes', xes);
    const mapping = suggestColumnMapping(table.headers);
    expect(mapping).toMatchObject({
      caseId: 'case:concept:name',
      activity: 'concept:name',
      timestamp: 'time:timestamp',
      lifecycle: 'lifecycle:transition',
      resource: 'org:resource',
      cost: 'cost:total',
    });
    const { log } = buildEventLog(table, mapping as Parameters<typeof buildEventLog>[1]);
    expect(log.events).toEqual([
      {
        caseId: 'c1',
        activity: 'A',
        startTime: Date.UTC(2026, 9, 1, 8),
        completeTime: Date.UTC(2026, 9, 1, 9),
        resource: 'Ann',
        cost: undefined,
      },
      {
        caseId: 'c1',
        activity: 'B',
        startTime: undefined,
        completeTime: Date.UTC(2026, 9, 1, 12),
        resource: undefined,
        cost: 12.5,
      },
    ]);
  });

  it('accepts JSON arrays and case-grouped JSON', () => {
    const flat = parseEventTable(
      'log.json',
      JSON.stringify([{ case: 'x', activity: 'A', timestamp: '2026-10-01T08:00:00Z' }]),
    );
    expect(flat.headers).toEqual(['case', 'activity', 'timestamp']);
    const grouped = parseEventTable(
      'log.json',
      JSON.stringify({
        cases: [
          { id: 'k', events: [{ activity: 'A', timestamp: '2026-10-01T08:00:00Z' }] },
        ],
      }),
    );
    expect(grouped.rows).toEqual([['k', 'A', '2026-10-01T08:00:00Z']]);
  });
});

describe('event log CSV export', () => {
  it('neutralizes spreadsheet formula prefixes from uploaded values', () => {
    const csv = eventLogToCsv(
      createEventLog('unsafe', [
        {
          caseId: '=1+1',
          activity: ' +SUM(A1:A2)',
          completeTime: at(1),
          resource: '@CALL',
        },
      ]),
    );
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("' +SUM(A1:A2)");
    expect(csv).toContain("'@CALL");
  });
});

const sampleEvents = (): MiningEvent[] => {
  const events: MiningEvent[] = [];
  // 3 happy cases: A → B → C; 1 rework case: A → B → B → C; 1 shortcut: A → C.
  for (let index = 0; index < 3; index += 1) {
    const base = index * 100;
    events.push(
      {
        caseId: `h${index}`,
        activity: 'A',
        startTime: at(base),
        completeTime: at(base + 1),
      },
      {
        caseId: `h${index}`,
        activity: 'B',
        startTime: at(base + 3),
        completeTime: at(base + 5),
      },
      {
        caseId: `h${index}`,
        activity: 'C',
        startTime: at(base + 5),
        completeTime: at(base + 6),
      },
    );
  }
  events.push(
    { caseId: 'r', activity: 'A', startTime: at(500), completeTime: at(501) },
    { caseId: 'r', activity: 'B', startTime: at(503), completeTime: at(505) },
    { caseId: 'r', activity: 'B', startTime: at(505), completeTime: at(507) },
    { caseId: 'r', activity: 'C', startTime: at(507), completeTime: at(508) },
    { caseId: 's', activity: 'A', startTime: at(600), completeTime: at(601) },
    { caseId: 's', activity: 'C', startTime: at(611), completeTime: at(612) },
  );
  return events;
};

describe('discoverProcess', () => {
  const log = createEventLog('sample', sampleEvents());
  const discovery = discoverProcess(log);

  it('uses measured executions when ranking service totals from partial start times', () => {
    const partial = discoverProcess(
      createEventLog('partial', [
        { caseId: '1', activity: 'A', startTime: 0, completeTime: 10 },
        { caseId: '2', activity: 'A', completeTime: 20 },
        { caseId: '3', activity: 'B', startTime: 0, completeTime: 10 },
      ]),
    );
    expect(partial.bottlenecks.filter((item) => item.kind === 'activity')).toEqual([
      expect.objectContaining({
        activity: 'A',
        frequency: 1,
        totalDurationMs: 10,
        share: 0.5,
      }),
      expect.objectContaining({
        activity: 'B',
        frequency: 1,
        totalDurationMs: 10,
        share: 0.5,
      }),
    ]);
    expect(partial.dfg.activities.find((activity) => activity.id === 'A')).toMatchObject({
      frequency: 2,
      serviceSampleCount: 1,
    });
  });

  it('reports cases, events, lead time and the happy path share', () => {
    expect(discovery.stats).toMatchObject({
      caseCount: 5,
      eventCount: 15,
      activityCount: 3,
      variantCount: 3,
      happyPathShare: 0.6,
    });
    expect(discovery.stats.meanLeadTimeMs).toBeCloseTo(((6 * 3 + 8 + 12) / 5) * HOUR, 6);
    expect(discovery.variants[0]).toMatchObject({
      activities: ['A', 'B', 'C'],
      caseCount: 3,
      isHappyPath: true,
      hasRepetition: false,
    });
    expect(discovery.variants.find((variant) => variant.hasRepetition)?.caseIds).toEqual([
      'r',
    ]);
  });

  it('builds a directly-follows graph with frequencies and mean waiting time', () => {
    const edge = (source: string, target: string) =>
      discovery.dfg.edges.find(
        (item) => item.source === source && item.target === target,
      );
    expect(edge('A', 'B')).toMatchObject({ frequency: 4, meanDurationMs: 2 * HOUR });
    expect(edge('B', 'B')).toMatchObject({ frequency: 1, meanDurationMs: 0 });
    expect(edge('A', 'C')).toMatchObject({ frequency: 1, meanDurationMs: 10 * HOUR });
    const activityB = discovery.dfg.activities.find((activity) => activity.id === 'B');
    expect(activityB).toMatchObject({
      frequency: 5,
      caseFrequency: 4,
      meanServiceMs: 2 * HOUR,
    });
  });

  it('ranks the slowest hand-over first', () => {
    expect(discovery.bottlenecks[0]).toMatchObject({
      kind: 'transition',
      source: 'A',
      target: 'C',
    });
    expect(discovery.bottlenecks[0].meanDurationMs).toBe(10 * HOUR);
  });

  it('filters by frequency and duration while keeping the map connected', () => {
    const byEdges = discoverProcess(log, {
      minActivityShare: 0,
      minEdgeShare: 0.5,
      minTransitionHours: 0,
    });
    expect(
      byEdges.dfg.edges.map((edge) => `${edge.source}>${edge.target}`).sort(),
    ).toEqual(['A>B', 'B>C']);
    expect(byEdges.hiddenEdgeCount).toBe(2);
    const withRareStep = createEventLog('rare', [
      ...sampleEvents(),
      { caseId: 'z', activity: 'A', startTime: at(700), completeTime: at(701) },
      { caseId: 'z', activity: 'Rare', startTime: at(702), completeTime: at(703) },
      { caseId: 'z', activity: 'C', startTime: at(704), completeTime: at(705) },
    ]);
    const byActivity = discoverProcess(withRareStep, {
      minActivityShare: 0.5,
      minEdgeShare: 0,
      minTransitionHours: 0,
    });
    expect(byActivity.dfg.activities.map((activity) => activity.id).sort()).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(byActivity.hiddenActivityCount).toBe(1);
    // Projection reconnects A → C for the case that went through the hidden step.
    expect(
      byActivity.dfg.edges.find((edge) => edge.source === 'A' && edge.target === 'C')
        ?.frequency,
    ).toBe(2);
    const slowOnly = discoverProcess(log, {
      minActivityShare: 0,
      minEdgeShare: 0,
      minTransitionHours: 5,
    });
    expect(
      slowOnly.dfg.edges.some((edge) => edge.source === 'A' && edge.target === 'C'),
    ).toBe(true);
    expect(
      slowOnly.dfg.edges.some((edge) => edge.source === 'B' && edge.target === 'B'),
    ).toBe(false);
  });
});

describe('dfgToProcessModel', () => {
  it('creates a valid BPMN model with XOR gateways, frequencies as probabilities and inferred rework', () => {
    const log = createEventLog('sample', sampleEvents());
    const discovery = discoverProcess(log);
    const { model, warnings } = dfgToProcessModel(discovery.dfg, {
      name: 'Sample',
      hasStartTimes: true,
    });
    expect(validateProcessModel(model).valid).toBe(true);
    const taskB = Object.values(model.nodes).find((node) => node.label === 'B');
    expect(taskB).toMatchObject({
      processingMinutes: 120,
      waitingMinutes: 120,
      reworkProbability: 0.2,
    });
    expect(taskB?.metadata?.['flowculus-inferred-rework']).toBe(true);
    const split = model.nodes['split-task-a'];
    expect(split).toMatchObject({ kind: 'gateway', gatewayKind: 'xor' });
    const probabilities = Object.values(model.edges)
      .filter((edge) => edge.source === 'split-task-a')
      .map((edge) => edge.probability)
      .sort();
    expect(probabilities).toEqual([0.2, 0.8]);
    Object.values(model.nodes).forEach((node) => expect(node.bounds).toBeDefined());
    expect(warnings).toEqual([]);

    const report = analyzeProcess(model);
    expect(report.status).toBe('ready');
    expect(report.quality).toBe('assumption');
    // A: 1 h work. B: (2 h wait + 2 h work)/(1 − 0.2) with p = 0.8. C: 1 h + weighted wait.
    expect(report.cycleTimeMinutes).toBeGreaterThan(0);
    expect(report.theoreticalCycleTimeMinutes).toBeLessThan(report.cycleTimeMinutes!);
  });

  it('warns when activities appear in both orders and when start times are missing', () => {
    const log = createEventLog('orders', [
      { caseId: '1', activity: 'X', completeTime: at(1) },
      { caseId: '1', activity: 'Y', completeTime: at(2) },
      { caseId: '2', activity: 'Y', completeTime: at(3) },
      { caseId: '2', activity: 'X', completeTime: at(4) },
    ]);
    const { model, warnings } = dfgToProcessModel(discoverProcess(log).dfg, {
      name: 'Orders',
      hasStartTimes: false,
    });
    expect(warnings).toEqual([
      { code: 'possible-parallelism', params: { first: 'X', second: 'Y' } },
      { code: 'missing-start-times' },
    ]);
    expect(validateProcessModel(model).valid).toBe(true);
  });
});

describe('presets', () => {
  it('are deterministic and analysable end to end', () => {
    MINING_PRESETS.forEach((preset) => {
      const first = generatePresetLog(preset.id);
      const second = generatePresetLog(preset.id);
      expect(second.events).toEqual(first.events);
      expect(first.events.length).toBeGreaterThan(1500);
      expect(first.events.length).toBeLessThan(6000);
      const discovery = discoverProcess(first);
      const { model } = dfgToProcessModel(discovery.dfg, {
        name: first.name,
        hasStartTimes: first.hasStartTimes,
      });
      expect(validateProcessModel(model).valid).toBe(true);
      const report = analyzeProcess(model);
      expect(report.status).toBe('ready');
      expect(report.quality).toBe('assumption');
      expect(report.cycleTimeMinutes).toBeGreaterThan(0);
    });
  });

  it('reproduces the IS6003 report log', () => {
    const log = is6003Log();
    const discovery = discoverProcess(log);
    expect(discovery.stats.caseCount).toBe(2);
    expect(discovery.stats.eventCount).toBe(15);
    expect(discovery.variants.map((variant) => variant.share)).toEqual([0.5, 0.5]);
    // FEAT_301: 01/10 08:30 → 14/10 16:00; FEAT_302: 03/10 08:30 → 17/10 17:00.
    const feat301 = Date.UTC(2026, 9, 14, 16) - Date.UTC(2026, 9, 1, 8, 30);
    const feat302 = Date.UTC(2026, 9, 17, 17) - Date.UTC(2026, 9, 3, 8, 30);
    expect(discovery.stats.meanLeadTimeMs).toBe((feat301 + feat302) / 2);
    const csv = eventLogToCsv(log);
    expect(csv.split('\n')[0]).toBe(
      'case_id,activity,start_timestamp,timestamp,resource,cost',
    );
    const roundTrip = buildEventLog(
      parseEventTable('is6003.csv', csv),
      suggestColumnMapping(parseEventTable('is6003.csv', csv).headers) as Parameters<
        typeof buildEventLog
      >[1],
    );
    expect(roundTrip.log.events).toHaveLength(15);
  });
});
