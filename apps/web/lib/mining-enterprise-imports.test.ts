import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_FILTER,
  DEFAULT_EVENT_IMPORT_SETTINGS,
  DEFAULT_WORK_CALENDAR,
  isCompleteMapping,
  type ColumnMapping,
} from '@flowculus/process-mining';
import { createMiningSession } from './mining-engine';
import { miningReportNarrative } from './mining-report-narrative';
import { buildMiningReportHtml } from './mining-report-document';
import { miningConclusions } from './mining-conclusions';
import { buildMiningEvidenceReport } from './mining-evidence-report';

const records = [
  ['C1', 'Receive', '2026-10-05T08:00:00+07:00', '2026-10-05T09:00:00+07:00', 'Ann'],
  ['C1', 'Assess', '2026-10-05T11:00:00+07:00', '2026-10-05T12:00:00+07:00', 'Bob'],
  ['C2', 'Receive', '2026-10-05T08:00:00+07:00', '2026-10-05T10:00:00+07:00', 'Ann'],
  ['C2', 'Assess', '2026-10-05T13:00:00+07:00', '2026-10-05T15:00:00+07:00', 'Bob'],
];
const headers = [
  'Business identifier',
  'Company operation',
  'Started',
  'Recorded',
  'Employee',
];
const mapping: ColumnMapping = {
  caseId: headers[0],
  activity: headers[1],
  startTimestamp: headers[2],
  timestamp: headers[3],
  resource: headers[4],
};
const cases = [
  {
    name: 'sales.csv',
    source: '\ufeff' + [headers, ...records].map((row) => row.join(',')).join('\r\n'),
    mapping,
  },
  {
    name: 'purchasing.csv',
    source:
      'Export from ERP\n' + [headers, ...records].map((row) => row.join(';')).join('\n'),
    mapping,
  },
  {
    name: 'support.tsv',
    source: [headers, ...records.slice().reverse()]
      .map((row) => row.join('\t'))
      .join('\n'),
    mapping,
  },
  {
    name: 'manufacturing.xlsx',
    source: [headers, ...records].map((row) => row.join(',')).join('\n'),
    mapping,
  },
  {
    name: 'claims.json',
    source: JSON.stringify({
      records: records.map((row) =>
        Object.fromEntries(headers.map((header, i) => [header, row[i]])),
      ),
    }),
    mapping,
  },
  {
    name: 'appointments.json',
    source: JSON.stringify({
      cases: ['C1', 'C2'].map((id) => ({
        id,
        events: records
          .filter((row) => row[0] === id)
          .map((row) => ({ Step: row[1], From: row[2], At: row[3], Owner: row[4] })),
      })),
    }),
    mapping: {
      caseId: 'caseId',
      activity: 'Step',
      startTimestamp: 'From',
      timestamp: 'At',
      resource: 'Owner',
    },
  },
  {
    name: 'insurance.xes',
    source:
      '<log>' +
      ['C1', 'C2']
        .map(
          (id) =>
            `<trace><string key="concept:name" value="${id}"/>${records
              .filter((row) => row[0] === id)
              .map(
                (row) =>
                  `<event><string key="concept:name" value="${row[1]}"/><date key="started" value="${row[2]}"/><date key="time:timestamp" value="${row[3]}"/><string key="org:resource" value="${row[4]}"/></event>`,
              )
              .join('')}</trace>`,
        )
        .join('') +
      '</log>',
    mapping: {
      caseId: 'case:concept:name',
      activity: 'concept:name',
      startTimestamp: 'started',
      timestamp: 'time:timestamp',
      resource: 'org:resource',
    },
  },
];
const duration = (ms: number) => `${ms / 3600000} h`;

function importSource(fixture: (typeof cases)[number]) {
  const session = createMiningSession();
  const table = session({
    type: 'inspect-file',
    fileName: fixture.name,
    source: fixture.source,
  });
  if (table.type !== 'table') throw Error('Expected table');
  const review = session({
    type: 'review-import',
    mapping: fixture.mapping,
    settings: table.layout.settings,
  });
  const result = session({
    type: 'apply-mapping',
    mapping: fixture.mapping,
    settings: table.layout.settings,
    name: fixture.name,
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (result.type !== 'discovery') throw Error('Expected discovery');
  return { session, table, review, result };
}

describe('customer-style logs across domains and formats', () => {
  it.each(cases)(
    'preserves evidence after explicit column mapping for $name',
    (fixture) => {
      const { session, review, result } = importSource(fixture);
      expect(review).toMatchObject({
        review: {
          acceptedEvents: 4,
          rejectedRows: 0,
          caseCount: 2,
          resourceEvents: 4,
          missingStartTimes: 0,
        },
      });
      expect(result.discovery.stats).toMatchObject({
        caseCount: 2,
        eventCount: 4,
        activityCount: 2,
        resourceCount: 2,
        variantCount: 1,
        meanLeadTimeMs: 5.5 * 3600000,
        medianLeadTimeMs: 5.5 * 3600000,
        minLeadTimeMs: 4 * 3600000,
        maxLeadTimeMs: 7 * 3600000,
      });
      expect(result.discovery.observations.handovers[0]).toMatchObject({
        source: 'Receive',
        target: 'Assess',
        frequency: 2,
        meanDurationMs: 2.5 * 3600000,
      });
      const working = session({
        type: 'discover',
        filter: DEFAULT_DISCOVERY_FILTER,
        timePolicy: { basis: 'working', calendar: DEFAULT_WORK_CALENDAR },
      });
      expect(working).toMatchObject({
        discovery: { stats: { meanLeadTimeMs: 5 * 3600000 } },
      });
      expect(
        miningConclusions(result, 'en', duration).some((finding) =>
          finding.observation.includes('2.5 h'),
        ),
      ).toBe(true);
      const report = buildMiningReportHtml({
        result,
        locale: 'en',
        duration,
        source: fixture.name,
      });
      expect(report).toContain(fixture.name);
      expect(report).toContain('5.5 h');
      expect(report).not.toMatch(/Backend|Mobile|IT Service Desk|IS6003/);
      expect(buildMiningEvidenceReport(result, null).stats).toEqual(
        result.discovery.stats,
      );
      const converted = session({
        type: 'to-model',
        filter: DEFAULT_DISCOVERY_FILTER,
        name: 'Customer process',
      });
      if (converted.type !== 'model') throw Error('Expected model');
      expect(converted.model.name).toBe('Customer process');
      expect(
        Object.values(converted.model.nodes)
          .filter((node) => node.kind === 'task')
          .map((node) => node.label)
          .sort(),
      ).toEqual(['Assess', 'Receive']);
      expect(
        Object.values(converted.model.edges).every(
          (edge) =>
            converted.model.nodes[edge.source] && converted.model.nodes[edge.target],
        ),
      ).toBe(true);
    },
  );

  it('flags mixed quality, duplicate rows and incomplete performer coverage without inventing evidence', () => {
    const fixture = {
      name: 'mixed.csv',
      mapping,
      source: [
        headers,
        ...records,
        records[0],
        ['C3', 'Assess', '', 'invalid', ''],
        ['C4', 'Assess', '', '2026-10-05T16:00:00+07:00', ''],
      ]
        .map((row) => row.join(','))
        .join('\n'),
    };
    const { result } = importSource(fixture);
    expect(result.importReview).toMatchObject({
      acceptedEvents: 6,
      duplicateRows: 1,
      rejectedRows: 1,
      missingStartTimes: 1,
      resourceEvents: 5,
    });
    const findings = miningReportNarrative(result, 'vi', duration).findings;
    expect(findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining([
        'routes',
        'distribution',
        'duplicate-rows',
        'rejected-records',
        'missing-starts',
        'performer-coverage',
      ]),
    );
    expect(miningConclusions(result, 'vi', duration)[0].observation).toContain(
      'chưa tách riêng',
    );
  });

  it('withholds task-time and personnel claims for Jira status history', () => {
    const session = createMiningSession();
    const table = session({
      type: 'inspect-file',
      fileName: 'jira.csv',
      source:
        'Issue key,To status,Change time,Changed by\nOPS-1,Open,2026-10-05T08:00Z,Ann\nOPS-1,Done,2026-10-05T10:00Z,Bob',
    });
    if (table.type !== 'table') throw Error('Expected table');
    const result = session({
      type: 'apply-mapping',
      settings: { ...table.layout.settings, mode: 'jira-status' },
      mapping: { caseId: 'Issue key', activity: 'To status', timestamp: 'Change time' },
      name: 'Jira',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    if (result.type !== 'discovery') throw Error('Expected discovery');
    expect(result.socialNetwork.resources).toEqual([]);
    expect(result.discovery.observations.services).toEqual([]);
    expect(
      miningReportNarrative(result, 'en', duration).findings.map((finding) => finding.id),
    ).toContain('status-history');
    expect(buildMiningReportHtml({ result, locale: 'en', duration })).toContain(
      'not necessarily the person doing the work',
    );
  });

  it('keeps long, multiline, non-Latin and HTML-like labels as text in portable reports', () => {
    const fixture = {
      name: '客户 <script>alert(1)</script>.json',
      source: JSON.stringify([
        {
          caseId: 'C1',
          activity: '<img src=x onerror=alert(1)>',
          timestamp: '2026-10-05T09:00Z',
          start: '2026-10-05T08:00Z',
          resource: 'Đội 運用',
        },
      ]),
      mapping: {
        caseId: 'caseId',
        activity: 'activity',
        timestamp: 'timestamp',
        startTimestamp: 'start',
        resource: 'resource',
      },
    };
    const { result } = importSource(fixture);
    const html = buildMiningReportHtml({ result, locale: 'vi', duration });
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(
      miningReportNarrative(result, 'vi', duration).findings.map((finding) => finding.id),
    ).toContain('single-case');
  });

  it('does not auto-approve ambiguous dates, snapshots or unknown mappings', () => {
    const session = createMiningSession();
    const table = session({
      type: 'inspect-file',
      fileName: 'unknown.csv',
      source: 'Request,Operation,Time\n1,Receive,03/04/2026 08:00',
    });
    if (table.type !== 'table') throw Error('Expected table');
    const custom = { caseId: 'Request', activity: 'Operation', timestamp: 'Time' };
    expect(isCompleteMapping(custom)).toBe(true);
    expect(() =>
      session({
        type: 'apply-mapping',
        mapping: custom,
        settings: {
          ...DEFAULT_EVENT_IMPORT_SETTINGS,
          headerRow: table.layout.settings.headerRow,
        },
        name: 'Ambiguous',
        filter: DEFAULT_DISCOVERY_FILTER,
      }),
    ).toThrow('import-ambiguous-dates');
    expect(() =>
      session({
        type: 'apply-mapping',
        mapping: custom,
        settings: { ...table.layout.settings, mode: 'snapshot' },
        name: 'Snapshot',
        filter: DEFAULT_DISCOVERY_FILTER,
      }),
    ).toThrow('import-snapshot');
  });
});
