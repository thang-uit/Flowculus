import { describe, expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';

import { INITIAL_PROCESS_MODEL } from './initial-process-model';
import { LEGACY_STARTER_MODEL } from './legacy-starter-model';

describe('initial workspace', () => {
  it('starts with no shapes, flows or sample calculation', () => {
    expect(INITIAL_PROCESS_MODEL.nodes).toEqual({});
    expect(INITIAL_PROCESS_MODEL.edges).toEqual({});
    const report = analyzeProcess(INITIAL_PROCESS_MODEL);
    expect(report.status).toBe('empty');
    expect(report.cycleTimeMinutes).toBeNull();
    expect(report.theoreticalCycleTimeMinutes).toBeNull();
    expect(report.cycleTimeEfficiency).toBeNull();
    expect(report.costPerExecution).toBeNull();
  });

  it('keeps the retired example pinned for safe migration recognition', () => {
    const report = analyzeProcess(LEGACY_STARTER_MODEL);
    // CT = 18 + 0.6 × 24 + 0.4 × 7; TCT = 6 + 0.6 × 8 + 0.4 × 5.
    expect(report.quality).toBe('exact');
    expect(report.cycleTimeMinutes).toBeCloseTo(35.2, 9);
    expect(report.theoreticalCycleTimeMinutes).toBeCloseTo(12.8, 9);
    expect(report.cycleTimeEfficiency).toBeCloseTo(12.8 / 35.2, 12);
    expect(report.costPerExecution).toBeCloseTo(13.36, 9);
  });
});
