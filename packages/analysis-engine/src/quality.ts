import {
  worstImpact,
  type Diagnostic,
  type DiagnosticScope,
  type QualityImpact,
} from '@flowculus/validation';

/**
 * - `exact`: every input is explicit and the structure is proven.
 * - `assumption`: a number is reported, but it relies on a stated assumption
 *   (inferred semantics, estimates, independence, defaults).
 * - `simulation-required`: no trustworthy analytic number exists; the value
 *   is withheld (null).
 */
export type CalculationQuality = 'exact' | 'assumption' | 'simulation-required';

export type AnalysisMetric =
  'cycleTime' | 'theoreticalCycleTime' | 'cycleTimeEfficiency' | 'cost' | 'capacity';

const METRIC_SCOPES: Record<AnalysisMetric, DiagnosticScope[]> = {
  cycleTime: ['model'],
  theoreticalCycleTime: ['model', 'processing'],
  cycleTimeEfficiency: ['model', 'processing', 'efficiency'],
  cost: ['model', 'processing', 'cost'],
  capacity: ['model', 'processing', 'capacity'],
};

export const qualityFromImpact = (impact: QualityImpact): CalculationQuality =>
  impact === 'none'
    ? 'exact'
    : impact === 'assumption'
      ? 'assumption'
      : 'simulation-required';

const QUALITY_RANK: Record<CalculationQuality, number> = {
  exact: 0,
  assumption: 1,
  'simulation-required': 2,
};

export const worstQuality = (
  ...qualities: Array<CalculationQuality | undefined>
): CalculationQuality =>
  qualities.reduce<CalculationQuality>(
    (worst, quality) =>
      quality != null && QUALITY_RANK[quality] > QUALITY_RANK[worst] ? quality : worst,
    'exact',
  );

export const qualityForScopes = (
  diagnostics: Diagnostic[],
  scopes: DiagnosticScope[],
): CalculationQuality =>
  qualityFromImpact(
    worstImpact(
      diagnostics
        .filter((diagnostic) => scopes.includes(diagnostic.scope ?? 'model'))
        .map((diagnostic) => diagnostic.impact),
    ),
  );

export const computeMetricQuality = (
  diagnostics: Diagnostic[],
): Record<AnalysisMetric, CalculationQuality> => ({
  cycleTime: qualityForScopes(diagnostics, METRIC_SCOPES.cycleTime),
  theoreticalCycleTime: qualityForScopes(diagnostics, METRIC_SCOPES.theoreticalCycleTime),
  cycleTimeEfficiency: qualityForScopes(diagnostics, METRIC_SCOPES.cycleTimeEfficiency),
  cost: qualityForScopes(diagnostics, METRIC_SCOPES.cost),
  capacity: qualityForScopes(diagnostics, METRIC_SCOPES.capacity),
});
