import { describe, expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

import {
  createAnalysisSnapshot,
  parseFlowculusFile,
  parseProcessCsv,
  processModelToNodesCsv,
  processModelToSvg,
  serializeFlowculusFile,
} from './index';

const model: ProcessModel = {
  schemaVersion: 1,
  id: 'contract',
  name: 'Contract',
  nodes: {
    start: {
      id: 'start',
      label: 'Start',
      kind: 'start',
      bounds: { x: 0, y: 0, width: 44, height: 44 },
    },
    observed: {
      id: 'observed',
      label: 'Observed',
      kind: 'task',
      durationMinutes: 30,
      processingMinutes: 10,
      cost: { resourceRatePerHour: 60 },
      bounds: { x: 100, y: 0, width: 176, height: 84 },
    },
    derived: {
      id: 'derived',
      label: 'Derived',
      kind: 'task',
      processingMinutes: 6,
      waitingMinutes: 12,
      cost: { resourceRatePerHour: 60 },
      bounds: { x: 340, y: 0, width: 176, height: 84 },
    },
    end: {
      id: 'end',
      label: 'End',
      kind: 'end',
      bounds: { x: 580, y: 20, width: 44, height: 44 },
    },
  },
  edges: {
    e1: { id: 'e1', source: 'start', target: 'observed' },
    e2: { id: 'e2', source: 'observed', target: 'derived' },
    e3: { id: 'e3', source: 'derived', target: 'end' },
  },
};

describe('cycle-time contract in exports', () => {
  it('writes the observed D, the effective CT and its source to nodes.csv', () => {
    const csv = processModelToNodesCsv(model).split('\n');
    const header = csv[0].split(',');
    const row = (id: string) => {
      const cells = csv.find((line) => line.startsWith(`${id},`))?.split(',') ?? [];
      return Object.fromEntries(header.map((name, index) => [name, cells[index]]));
    };
    expect(row('observed')).toMatchObject({
      cycle_time_minutes: '30',
      effective_cycle_time_minutes: '30',
      cycle_time_source: 'observed',
    });
    expect(row('derived')).toMatchObject({
      cycle_time_minutes: '',
      effective_cycle_time_minutes: '18',
      cycle_time_source: 'derived',
    });
    // Re-import keeps D as D and does not turn a derived CT into an observed one.
    const reparsed = parseProcessCsv(processModelToNodesCsv(model), 'Again');
    expect(reparsed.nodes.derived.durationMinutes).toBeUndefined();
    expect(reparsed.nodes.observed.durationMinutes).toBe(30);
  });

  it('flags kinds guessed from labels when the CSV has no type column', () => {
    const parsed = parseProcessCsv('id,label\nn1,Start\nn2,Review\nn3,End', 'Guess');
    expect(parsed.nodes.n1.kind).toBe('start');
    expect(parsed.nodes.n1.metadata?.['flowculus-inferred-kind']).toBe(true);
    const typed = parseProcessCsv('id,label,kind\nn1,Start,start', 'Typed');
    expect(typed.nodes.n1.metadata?.['flowculus-inferred-kind']).toBeUndefined();
  });

  it('labels task chips by source and never shows an estimated T', () => {
    const { svg } = processModelToSvg(model);
    expect(svg).toContain('CT 30m · T 10m · Wq 20m');
    expect(svg).toContain('T 6m · Wq 12m');
  });

  it('draws an assumption-quality highlight dashed', () => {
    const exact = processModelToSvg(model, {
      highlightEdgeIds: ['e1'],
      highlightQuality: 'exact',
    }).svg;
    const estimated = processModelToSvg(model, {
      highlightEdgeIds: ['e1'],
      highlightQuality: 'assumption',
    }).svg;
    expect(exact).not.toContain('stroke-dasharray="7 5"');
    expect(estimated).toContain('stroke-dasharray="7 5"');
  });
});

describe('analysis snapshot in .flowculus.json', () => {
  it('keeps quality, issues and the CTE ratio unit through serialization', () => {
    const report = analyzeProcess(model);
    const snapshot = createAnalysisSnapshot(report);
    const parsed = parseFlowculusFile(
      serializeFlowculusFile({ schemaVersion: 1, model, analysis: snapshot }),
    );
    expect(parsed.analysis).toMatchObject({
      quality: report.quality,
      cycleTimeEfficiency: report.cycleTimeEfficiency,
      units: { cycleTimeEfficiency: 'ratio', time: 'minutes' },
    });
    expect(parsed.analysis?.issues).toEqual(report.issues);
    expect(parsed.analysis?.activityTimes.derived.cycleTimeSource).toBe('derived');
    expect(report.cycleTimeEfficiency).toBeGreaterThan(0);
    expect(report.cycleTimeEfficiency).toBeLessThanOrEqual(1);
  });
});
