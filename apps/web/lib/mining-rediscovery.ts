import type { MiningRequest } from './mining-engine';
import type { useMiningStore } from './mining-store';

export type MiningRediscoveryRequest = Extract<MiningRequest, { type: 'discover' }>;

/** A display-filter edit must never supersede loading or mapping a new source. */
export function getMiningRediscoveryRequest(
  state: ReturnType<typeof useMiningStore.getState>,
): MiningRediscoveryRequest | null {
  if (
    state.status !== 'ready' ||
    !state.replay ||
    !state.result ||
    state.mappingTable ||
    state.pendingUpload
  )
    return null;
  const applied = state.result.discovery;
  if (
    applied.filter.minActivityShare === state.filter.minActivityShare &&
    applied.filter.minEdgeShare === state.filter.minEdgeShare &&
    applied.filter.minTransitionHours === state.filter.minTransitionHours &&
    JSON.stringify(applied.timePolicy) === JSON.stringify(state.timePolicy)
  )
    return null;
  return { type: 'discover', filter: state.filter, timePolicy: state.timePolicy };
}
