export interface AnalysisOptions {
  processPoolId?: string;
  arrivalRatePerHour?: number;
  workInProcess?: number;
  workingHoursPerDay?: number;
  serviceRatePerHour?: number;
  servers?: number;
  resourceCounts?: Record<string, number>;
}

const isNonNegative = (candidate: unknown): boolean =>
  candidate == null ||
  (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0);

const isPositive = (candidate: unknown): boolean =>
  candidate == null ||
  (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0);

/**
 * Guards values coming from storage, imports or the worker boundary before
 * they reach the engine. Dependency-free so any boundary can reuse it.
 */
export const isAnalysisOptions = (value: unknown): value is AnalysisOptions => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const options = value as Record<string, unknown>;
  if (
    options.processPoolId != null &&
    (typeof options.processPoolId !== 'string' || !options.processPoolId)
  )
    return false;
  if (!isNonNegative(options.arrivalRatePerHour)) return false;
  if (!isNonNegative(options.workInProcess)) return false;
  if (!isPositive(options.workingHoursPerDay)) return false;
  if (!isPositive(options.serviceRatePerHour)) return false;
  if (
    options.servers != null &&
    (!Number.isInteger(options.servers) || (options.servers as number) < 1)
  ) {
    return false;
  }
  if (options.resourceCounts == null) return true;
  if (typeof options.resourceCounts !== 'object' || Array.isArray(options.resourceCounts))
    return false;
  return Object.values(options.resourceCounts as Record<string, unknown>).every(
    (count) => Number.isInteger(count) && (count as number) > 0,
  );
};
