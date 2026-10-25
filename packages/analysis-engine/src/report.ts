import type { FormulaNode } from '@flowculus/formula-renderer';
import type { Diagnostic } from '@flowculus/validation';

import type { CapacityReport } from './capacity';
import type { CriticalChainReport } from './critical-chain';
import type { CriticalPathReport } from './critical-path';
import type { ResolvedActivityTime } from './cycle-time';
import type { PathCountReport } from './path-count';
import type { AnalysisMetric, CalculationQuality } from './quality';
import type { QueueAnalysisReport } from './queue';

export type AnalysisStatus = 'empty' | 'ready' | 'invalid' | 'unsupported';

export interface AnalysisReport {
  /** `empty`: no model to analyse; `invalid`: failed validation. */
  status: AnalysisStatus;
  /** Headline quality: the worse of the CT and TCT qualities. */
  quality: CalculationQuality;
  metricQuality: Record<AnalysisMetric, CalculationQuality>;
  /** Expected cycle time in minutes; null when no analytic value exists. */
  cycleTimeMinutes: number | null;
  theoreticalCycleTimeMinutes: number | null;
  /** CTE = TCT / CT as a ratio in [0, 1] (never a percentage). */
  cycleTimeEfficiency: number | null;
  costPerExecution: number | null;
  /** Plain-text rendering of `formulaAst`; empty when no formula exists. */
  formula: string;
  formulaAst?: FormulaNode;
  theoreticalFormula?: string;
  theoreticalFormulaAst?: FormulaNode;
  costFormula?: string;
  costFormulaAst?: FormulaNode;
  /** Locale-neutral findings with stable codes, severity and quality impact. */
  issues: Diagnostic[];
  startNodeId: string | null;
  /** Resolved time contract per activity (and per timed event). */
  activityTimes: Record<string, ResolvedActivityTime>;
  solver?: {
    converged: boolean;
    cycleIterations: number;
    theoreticalIterations: number;
    costIterations: number;
  };
  capacity: CapacityReport[];
  pathCount?: PathCountReport;
  criticalPath?: CriticalPathReport;
  criticalChain?: CriticalChainReport;
  /** Little's Law from the scenario: CT = WIP / λ. */
  littleLaw?: {
    arrivalRatePerHour: number;
    workInProcess: number;
    cycleTimeHours: number;
  };
  /** Little's Law forecast from the model: WIP = λ × CT. */
  littleLawForecast?: {
    arrivalRatePerHour: number;
    cycleTimeHours: number;
    workInProcess: number;
    quality: CalculationQuality;
  };
  queue?: QueueAnalysisReport;
}

const metricQualities = (
  quality: CalculationQuality,
): Record<AnalysisMetric, CalculationQuality> => ({
  cycleTime: quality,
  theoreticalCycleTime: quality,
  cycleTimeEfficiency: quality,
  cost: quality,
  capacity: quality,
});

export const invalidReport = (issues: Diagnostic[]): AnalysisReport => ({
  status: 'invalid',
  quality: 'simulation-required',
  metricQuality: metricQualities('simulation-required'),
  cycleTimeMinutes: null,
  theoreticalCycleTimeMinutes: null,
  cycleTimeEfficiency: null,
  costPerExecution: null,
  formula: '',
  issues,
  startNodeId: null,
  activityTimes: {},
  capacity: [],
});

export const createEmptyAnalysisReport = (): AnalysisReport => ({
  status: 'empty',
  quality: 'exact',
  metricQuality: metricQualities('exact'),
  cycleTimeMinutes: null,
  theoreticalCycleTimeMinutes: null,
  cycleTimeEfficiency: null,
  costPerExecution: null,
  formula: '',
  issues: [{ code: 'empty-model', severity: 'info', impact: 'none' }],
  startNodeId: null,
  activityTimes: {},
  capacity: [],
  pathCount: { status: 'empty', count: 0, endNodeIds: [], formula: 'P = 0' },
});
