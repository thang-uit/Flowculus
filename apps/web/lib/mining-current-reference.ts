import type { ProcessModel } from '@flowculus/process-model';

/** A comparison is visible only while its model and explicit mapping still match. */
export function isCurrentMiningReference(
  stored: { model: ProcessModel; optionsKey: string } | null,
  model: ProcessModel | undefined,
  reference: { poolId: string; mapping: Record<string, string> },
): boolean {
  return (
    !!stored &&
    stored.model === model &&
    stored.optionsKey ===
      JSON.stringify({
        poolId: reference.poolId || undefined,
        activityMapping: reference.mapping,
      })
  );
}
