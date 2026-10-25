import { describe, expect, it } from 'vitest';

import { requiresAnalysisReport } from './export-readiness';

describe('export readiness', () => {
  it('never blocks recovery-oriented model and diagram exports on the worker', () => {
    for (const format of ['flowculus', 'drawio', 'csv', 'svg', 'png', 'jpeg'] as const)
      expect(requiresAnalysisReport(format)).toBe(false);
  });

  it('requires current analysis for generated reports', () => {
    for (const format of ['pdf', 'report-png', 'report-jpeg'] as const)
      expect(requiresAnalysisReport(format)).toBe(true);
  });
});
