import { describe, expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';

import { INITIAL_PROCESS_MODEL } from './initial-process-model';

describe('starter model', () => {
  it('keeps its pinned, exact results', () => {
    const report = analyzeProcess(INITIAL_PROCESS_MODEL);
    // CT = 18 + 0.6 × 24 + 0.4 × 7; TCT = 6 + 0.6 × 8 + 0.4 × 5.
    expect(report.quality).toBe('exact');
    expect(report.cycleTimeMinutes).toBeCloseTo(35.2, 9);
    expect(report.theoreticalCycleTimeMinutes).toBeCloseTo(12.8, 9);
    expect(report.cycleTimeEfficiency).toBeCloseTo(12.8 / 35.2, 12);
    expect(report.costPerExecution).toBeCloseTo(13.36, 9);
  });
});
