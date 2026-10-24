'use client';

import { create } from 'zustand';

import {
  DEFAULT_DISCOVERY_FILTER,
  type ColumnMapping,
  type DiscoveryFilter,
  type MiningConversionWarning,
  type MiningPresetId,
} from '@flowculus/process-mining';

import type { MiningDiscoveryResponse, MiningTableResponse } from '@/lib/mining-engine';

export type MiningStatus = 'idle' | 'loading' | 'ready' | 'error';
export type DfgEdgeMetric = 'frequency' | 'duration';

/** Enough to rebuild the worker session after the mining view remounts. */
export type MiningReplay =
  | { kind: 'preset'; presetId: MiningPresetId }
  | { kind: 'file'; fileName: string; source: string; mapping: ColumnMapping };

export interface PendingUpload {
  fileName: string;
  source: string;
}

interface MiningState {
  status: MiningStatus;
  error: string | null;
  replay: MiningReplay | null;
  /** A file imported elsewhere (header, drop) waiting for the mining view. */
  pendingUpload: PendingUpload | null;
  /** The uploaded file waiting for its column mapping. */
  mappingTable: (MiningTableResponse & { source: string }) | null;
  result: MiningDiscoveryResponse | null;
  filter: DiscoveryFilter;
  selectedVariantId: string | null;
  edgeMetric: DfgEdgeMetric;
  conversionWarnings: MiningConversionWarning[];
  queueUpload: (upload: PendingUpload) => void;
  takePendingUpload: () => PendingUpload | null;
  setStatus: (status: MiningStatus, error?: string | null) => void;
  setMappingTable: (table: MiningState['mappingTable']) => void;
  setResult: (result: MiningDiscoveryResponse, replay?: MiningReplay) => void;
  setFilter: (filter: Partial<DiscoveryFilter>) => void;
  resetFilter: () => void;
  setSelectedVariantId: (id: string | null) => void;
  setEdgeMetric: (metric: DfgEdgeMetric) => void;
  setConversionWarnings: (warnings: MiningConversionWarning[]) => void;
  /** The worker lost its log (cancel, timeout, crash): drop what depends on it. */
  abortSession: (error: string | null) => void;
}

export const useMiningStore = create<MiningState>((set, get) => ({
  status: 'idle',
  error: null,
  replay: null,
  pendingUpload: null,
  mappingTable: null,
  result: null,
  filter: DEFAULT_DISCOVERY_FILTER,
  selectedVariantId: null,
  edgeMetric: 'frequency',
  conversionWarnings: [],
  queueUpload: (pendingUpload) => set({ pendingUpload }),
  takePendingUpload: () => {
    const upload = get().pendingUpload;
    if (upload) set({ pendingUpload: null });
    return upload;
  },
  setStatus: (status, error = null) => set({ status, error }),
  setMappingTable: (mappingTable) => set({ mappingTable }),
  setResult: (result, replay) =>
    set((state) => ({
      result,
      replay: replay ?? state.replay,
      status: 'ready',
      error: null,
      selectedVariantId:
        replay ||
        !result.discovery.variants.some(
          (variant) => variant.id === state.selectedVariantId,
        )
          ? null
          : state.selectedVariantId,
    })),
  setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
  resetFilter: () => set({ filter: DEFAULT_DISCOVERY_FILTER }),
  setSelectedVariantId: (selectedVariantId) => set({ selectedVariantId }),
  setEdgeMetric: (edgeMetric) => set({ edgeMetric }),
  setConversionWarnings: (conversionWarnings) => set({ conversionWarnings }),
  abortSession: (error) =>
    set({
      status: error ? 'error' : 'idle',
      error,
      result: null,
      replay: null,
      mappingTable: null,
      selectedVariantId: null,
    }),
}));
