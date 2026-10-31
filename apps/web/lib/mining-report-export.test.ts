import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_FILTER,
  DEFAULT_WORK_CALENDAR,
} from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';
import { createMiningSession } from './mining-engine';
import { buildMiningReportHtml } from './mining-report-document';
import { miningReportNarrative } from './mining-report-narrative';
import { isCurrentMiningReference } from './mining-current-reference';
import { buildMiningEvidenceReport } from './mining-evidence-report';

const duration = (value: number) => `${value / 3600000} h`;
const model: ProcessModel = {
  schemaVersion: 1,
  id: 'approved',
  name: 'Approved purchase approval',
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    receive: { id: 'receive', label: 'Receive', kind: 'task' },
    approve: { id: 'approve', label: 'Approve', kind: 'task' },
    end: { id: 'end', label: 'End', kind: 'end' },
  },
  edges: {
    a: { id: 'a', source: 'start', target: 'receive' },
    b: { id: 'b', source: 'receive', target: 'approve' },
    c: { id: 'c', source: 'approve', target: 'end' },
  },
};
function discovery() {
  const session = createMiningSession();
  const table = session({
    type: 'inspect-file',
    fileName: 'purchases.csv',
    source:
      'case,task,time\n1,Receive,2026-10-05T08:00Z\n2,Receive,2026-10-05T09:00Z\n2,Approve,2026-10-05T10:00Z',
  });
  if (table.type !== 'table') throw Error('Expected table');
  const result = session({
    type: 'apply-mapping',
    mapping: { caseId: 'case', activity: 'task', timestamp: 'time' },
    settings: table.layout.settings,
    name: 'Purchasing',
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (result.type !== 'discovery') throw Error('Expected discovery');
  return { session, result };
}
describe('readable Mining report exports', () => {
  it('includes independently checked missing steps and preserves the method scope', () => {
    const { session, result } = discovery();
    const evidence = session({ type: 'check-conformance', model });
    if (evidence.type !== 'conformance') throw Error('Expected conformance');
    const html = buildMiningReportHtml({
      result,
      locale: 'vi',
      duration,
      source: 'purchases.csv',
      reference: { name: model.name, alignment: evidence.alignment },
    });
    expect(html).toContain('Approved purchase approval');
    expect(html).toContain('Bước chuẩn chưa được ghi nhận');
    expect(html).toContain('<li>Approve</li>');
    expect(html).toContain('chưa xác định ai gây chậm');
    expect(html).toContain('purchases.csv');
    const stored = {
      model,
      evidence,
      optionsKey: JSON.stringify({ poolId: undefined, activityMapping: {} }),
    };
    expect(isCurrentMiningReference(stored, model, { poolId: '', mapping: {} })).toBe(
      true,
    );
    expect(
      isCurrentMiningReference(stored, model, {
        poolId: '',
        mapping: { Receive: 'approve' },
      }),
    ).toBe(false);
    expect(buildMiningEvidenceReport(result, null)).not.toHaveProperty('reference');
  });
  it('retains inconclusive comparison status and does not manufacture a percentage', () => {
    const { result } = discovery();
    const html = buildMiningReportHtml({
      result,
      locale: 'en',
      duration,
      reference: {
        name: 'Limited reference',
        alignment: {
          status: 'limit',
          method: 'alignment-unit-cost-v1',
          examinedCases: 1,
          compatibleCases: 1,
          omittedCases: 1,
          fitness: null,
          examples: [],
        },
      },
    });
    expect(html).toContain('could not cover the complete log');
    expect(html).toContain('Not available');
    expect(html).not.toContain('<td>100%</td>');
  });
  it('keeps findings stable under graph display filters and bounds long readable exports', () => {
    const { session, result } = discovery();
    const filtered = session({
      type: 'discover',
      filter: { minActivityShare: 1, minEdgeShare: 1, minTransitionHours: 100 },
    });
    if (filtered.type !== 'discovery') throw Error('Expected discovery');
    expect(miningReportNarrative(filtered, 'en', duration)).toEqual(
      miningReportNarrative(result, 'en', duration),
    );
    expect(() =>
      buildMiningReportHtml({
        result: { ...result, logName: 'x'.repeat(600000) },
        locale: 'en',
        duration,
      }),
    ).toThrow('report-too-large');
  });
  it('does not equate an unpaired lifecycle start with a completed process', () => {
    const session = createMiningSession();
    const table = session({
      type: 'inspect-file',
      fileName: 'service.csv',
      source:
        'case,task,time,state\n1,Receive,2026-10-05T08:00Z,start\n1,Receive,2026-10-05T09:00Z,complete\n1,Approve,2026-10-05T10:00Z,start',
    });
    if (table.type !== 'table') throw Error('Expected table');
    const result = session({
      type: 'apply-mapping',
      mapping: {
        caseId: 'case',
        activity: 'task',
        timestamp: 'time',
        lifecycle: 'state',
      },
      settings: table.layout.settings,
      name: 'Service',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    if (result.type !== 'discovery') throw Error('Expected discovery');
    expect(result.importReview?.unpairedStarts).toBe(1);
    const narrative = miningReportNarrative(result, 'en', duration);
    expect(
      narrative.findings.find((finding) => finding.id === 'unpaired-starts')?.meaning,
    ).toContain('not proof of end-to-end completion');
  });
  it('describes the selected work calendar and excludes multi-byte oversized reports', () => {
    const { session, result } = discovery();
    const working = session({
      type: 'discover',
      filter: DEFAULT_DISCOVERY_FILTER,
      timePolicy: {
        basis: 'working',
        calendar: { ...DEFAULT_WORK_CALENDAR, holidays: ['2026-10-06'] },
      },
    });
    if (working.type !== 'discovery') throw Error('Expected discovery');
    const report = buildMiningReportHtml({ result: working, locale: 'en', duration });
    expect(report).toContain('Monday, Tuesday, Wednesday, Thursday, Friday');
    expect(report).toContain('08:00–12:00, 13:00–17:00');
    expect(report).toContain('Excluded dates: 2026-10-06');
    expect(report).toContain('<thead>');
    expect(() =>
      buildMiningReportHtml({
        result: { ...result, logName: '測'.repeat(60000) },
        locale: 'vi',
        duration,
      }),
    ).toThrow('report-too-large');
  });
});
