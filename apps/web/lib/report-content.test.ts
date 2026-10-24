import { describe, expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import {
  createAnalysisSnapshot,
  parseFlowculusFile,
  serializeFlowculusFile,
} from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';
import { DIAGNOSTIC_CODES } from '@flowculus/validation';

import { formatDiagnostic } from '@/lib/diagnostic-messages';
import { getWorkspaceCopy } from '@/lib/i18n';
import { buildReportContent } from '@/lib/report-content';

/** a: D = T + Wq (exact); b: D only, so its T is estimated from D (assumption). */
const MODEL: ProcessModel = {
  schemaVersion: 1,
  id: 'pipeline',
  name: 'Pipeline',
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    a: {
      id: 'a',
      label: 'Check',
      kind: 'task',
      durationMinutes: 30,
      processingMinutes: 10,
      waitingMinutes: 20,
      cost: { resourceRatePerHour: 60 },
    },
    b: {
      id: 'b',
      label: 'Ship',
      kind: 'task',
      durationMinutes: 20,
      cost: { resourceRatePerHour: 60 },
    },
    end: { id: 'end', label: 'End', kind: 'end' },
  },
  edges: {
    e1: { id: 'e1', source: 'start', target: 'a' },
    e2: { id: 'e2', source: 'a', target: 'b' },
    e3: { id: 'e3', source: 'b', target: 'end' },
  },
};

describe('quality survives worker → store → UI → export', () => {
  const engine = analyzeProcess(MODEL);
  // The worker hands the report over with the structured-clone algorithm.
  const received = structuredClone(engine);

  it('keeps quality, issues and per-activity sources through structured clone', () => {
    expect(received).toEqual(engine);
    // Headline = worst(CT, TCT); each metric keeps its own quality.
    expect(received.quality).toBe('assumption');
    expect(received.metricQuality.cycleTime).toBe('exact');
    expect(received.metricQuality.theoreticalCycleTime).toBe('assumption');
    expect(received.activityTimes.a?.cycleTimeSource).toBe('observed');
    expect(received.activityTimes.b?.processingSource).toBe('cycle-time-estimate');
    expect(received.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['processing-estimated-from-cycle-time']),
    );
  });

  it('renders the same qualities and sources in the report content (EN and VI)', () => {
    for (const locale of ['en', 'vi'] as const) {
      const copy = getWorkspaceCopy(locale);
      const content = buildReportContent({
        report: received,
        model: MODEL,
        copy,
        locale,
      });
      expect(content.metrics.map((metric) => metric.quality)).toEqual([
        copy.exact,
        copy.assumption,
        copy.assumption,
        copy.assumption,
      ]);
      // CTE is a ratio in the engine and a percentage only when formatted.
      expect(received.cycleTimeEfficiency).toBeLessThanOrEqual(1);
      expect(content.metrics[2]?.value).toMatch(/%$/);
      expect(content.activities.map((row) => row.source)).toEqual([
        copy.quality.cycleTimeSource.observed,
        copy.quality.cycleTimeSource.observed,
      ]);
      expect(content.activities[1]?.processing).toContain(
        copy.quality.processingSource['cycle-time-estimate'],
      );
      const estimate = received.issues.find(
        (issue) => issue.code === 'processing-estimated-from-cycle-time',
      )!;
      expect(content.info).toContain(formatDiagnostic(estimate, locale));
      expect(content.formulaLines.join('\n')).toContain(copy.quality.criticalPathTitle);
    }
  });

  it('keeps quality and issues in the .flowculus.json snapshot', () => {
    const file = parseFlowculusFile(
      serializeFlowculusFile({
        schemaVersion: 1,
        model: MODEL,
        analysis: createAnalysisSnapshot(received),
      }),
    );
    expect(file.analysis?.metricQuality).toEqual(received.metricQuality);
    expect(file.analysis?.issues).toEqual(received.issues);
    expect(file.analysis?.activityTimes?.b?.processingSource).toBe('cycle-time-estimate');
    expect(file.analysis?.units.cycleTimeEfficiency).toBe('ratio');
  });

  it('withholds numbers instead of printing a fake value when simulation is required', () => {
    const copy = getWorkspaceCopy('en');
    const twoStarts: ProcessModel = {
      ...MODEL,
      nodes: { ...MODEL.nodes, s2: { id: 's2', label: 'Start 2', kind: 'start' } },
      edges: { ...MODEL.edges, e4: { id: 'e4', source: 's2', target: 'b' } },
    };
    const report = structuredClone(analyzeProcess(twoStarts));
    const content = buildReportContent({ report, model: twoStarts, copy, locale: 'en' });
    expect(report.cycleTimeMinutes).toBeNull();
    expect(content.metrics[0]?.value).toBe(copy.emptyValue);
    expect(content.formulaLines[0]).toContain(copy.quality.simulationNoNumber);
    expect(content.errors.length + content.warnings.length).toBeGreaterThan(0);
  });
});

describe('diagnostic messages', () => {
  it('has a non-empty English and Vietnamese sentence for every code', () => {
    const params = {
      label: 'X',
      nodeId: 'n1',
      edgeId: 'e1',
      source: 'A',
      target: 'B',
      count: 2,
      limit: 12,
      poolId: 'Clerks',
      gatewayKind: 'and',
      utilization: 1.2,
      sum: 0.9,
      shape: 'boundary-event',
      ratio: 0.5,
      path: 'nodes.n1',
      minutes: 3,
      labels: 'A, B',
      joinLabel: 'Join',
      joinKind: 'or',
      joinId: 'j1',
    };
    for (const code of DIAGNOSTIC_CODES) {
      const en = formatDiagnostic(
        { code, severity: 'info', impact: 'none', params },
        'en',
      );
      const vi = formatDiagnostic(
        { code, severity: 'info', impact: 'none', params },
        'vi',
      );
      expect(en.trim().length, code).toBeGreaterThan(0);
      expect(vi.trim().length, code).toBeGreaterThan(0);
      expect(en, code).not.toContain('undefined');
      expect(vi, code).not.toContain('undefined');
    }
  });
});
