import type { DirectlyFollowsGraph, MiningObservations, TraceVariant } from './types';

/** Bounded full-log evidence. Display filters must never rewrite conclusions. */
export function summarizeObservations(
  dfg: DirectlyFollowsGraph,
  variants: TraceVariant[],
): MiningObservations {
  const handovers = dfg.edges
    .filter((edge) => edge.source !== edge.target && edge.meanDurationMs > 0)
    .sort((a, b) => b.meanDurationMs - a.meanDurationMs || a.id.localeCompare(b.id))
    .slice(0, 3);
  const services = dfg.activities
    .filter((activity) => activity.meanServiceMs != null && activity.meanServiceMs > 0)
    .sort((a, b) => b.meanServiceMs! - a.meanServiceMs! || a.id.localeCompare(b.id))
    .slice(0, 3);
  return {
    handovers,
    services,
    repeatedCases: variants.reduce(
      (total, variant) => total + (variant.hasRepetition ? variant.caseCount : 0),
      0,
    ),
  };
}
