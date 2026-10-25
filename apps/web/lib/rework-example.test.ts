import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { analyzeProcess } from '@flowculus/analysis-engine';
import { parseFlowculusFile } from '@flowculus/file-formats';
import { validateProcessGraph } from '@flowculus/validation';

const example = parseFlowculusFile(
  readFileSync(
    new URL('../../../examples/rework-at-most-once.flowculus.json', import.meta.url),
    'utf8',
  ),
);

describe('one-time rework example', () => {
  it('has a valid acyclic model and counts the optional second attempt once', () => {
    expect(validateProcessGraph(example.model).diagnostics).toEqual([]);
    const report = analyzeProcess(example.model);
    expect(report.cycleTimeMinutes).toBe(180);
    expect(report.theoreticalCycleTimeMinutes).toBe(180);
    expect(report.quality).toBe('exact');
  });
});
