'use client';

import { create } from 'zustand';

import {
  DEFAULT_DISCOVERY_FILTER,
  ELAPSED_TIME_POLICY,
  DEFAULT_WORK_CALENDAR,
  type WorkCalendar,
  type TimePolicy,
  type ColumnMapping,
  type DiscoveryFilter,
  type MiningConversionWarning,
  type MiningPresetId,
  type ModelConformance,
} from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';

import type {
  MiningDiscoveryResponse,
  MiningTableResponse,
  MiningConformanceResponse,
} from '@/lib/mining-engine';

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
  conformance: {
    result: ModelConformance;
    model: ProcessModel;
    evidence: MiningConformanceResponse;
    optionsKey: string;
  } | null;
  conformanceError: string | null;
  checkingConformance: boolean;
  filter: DiscoveryFilter;
  timePolicy: TimePolicy;
  workCalendar: WorkCalendar;
  setTimePolicy: (policy: TimePolicy) => void;
  selectedVariantId: string | null;
  edgeMetric: DfgEdgeMetric;
  conversionWarnings: MiningConversionWarning[];
  queueUpload: (upload: PendingUpload) => void;
  takePendingUpload: () => PendingUpload | null;
  setStatus: (status: MiningStatus, error?: string | null) => void;
  setMappingTable: (table: MiningState['mappingTable']) => void;
  setResult: (result: MiningDiscoveryResponse, replay?: MiningReplay) => void;
  setConformance: (
    evidence: MiningConformanceResponse,
    model: ProcessModel,
    optionsKey: string,
  ) => void;
  setConformanceError: (message: string | null) => void;
  startConformance: () => void;
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
  conformance: null,
  conformanceError: null,
  checkingConformance: false,
  filter: DEFAULT_DISCOVERY_FILTER,
  timePolicy: ELAPSED_TIME_POLICY,
  workCalendar: structuredClone(DEFAULT_WORK_CALENDAR),
  setTimePolicy: (timePolicy) =>
    set((state) => ({
      timePolicy,
      workCalendar:
        timePolicy.basis === 'working'
          ? structuredClone(timePolicy.calendar)
          : state.workCalendar,
    })),
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
      conformance: replay ? null : state.conformance,
      conformanceError: null,
      checkingConformance: false,
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
  setConformance: (evidence, model, optionsKey) =>
    set({
      conformance: { result: evidence.result, model, evidence, optionsKey },
      conformanceError: null,
      checkingConformance: false,
    }),
  setConformanceError: (conformanceError) =>
    set({ conformanceError, checkingConformance: false }),
  startConformance: () => set({ conformanceError: null, checkingConformance: true }),
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
      conformance: null,
      conformanceError: null,
      checkingConformance: false,
      replay: null,
      mappingTable: null,
      selectedVariantId: null,
    }),
}));
