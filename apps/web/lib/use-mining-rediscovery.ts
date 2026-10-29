'use client';

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  getMiningRediscoveryRequest,
  type MiningRediscoveryRequest,
} from './mining-rediscovery';
import { useMiningStore } from './mining-store';

const FILTER_DEBOUNCE_MS = 140;

/** Apply the latest controls after source loading completes, without rereading it. */
export function useMiningRediscovery(
  onDiscover: (request: MiningRediscoveryRequest) => void,
) {
  const snapshot = useMiningStore(
    useShallow((state) => ({
      filter: state.filter,
      timePolicy: state.timePolicy,
      result: state.result,
      status: state.status,
      replay: state.replay,
      mappingTable: state.mappingTable,
      pendingUpload: state.pendingUpload,
    })),
  );
  useEffect(() => {
    if (!getMiningRediscoveryRequest(useMiningStore.getState())) return;
    const timer = window.setTimeout(() => {
      const request = getMiningRediscoveryRequest(useMiningStore.getState());
      if (request) onDiscover(request);
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [snapshot, onDiscover]);
}
