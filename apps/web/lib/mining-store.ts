'use client';

import { create } from 'zustand';

import {
  DEFAULT_DISCOVERY_FILTER,
  type TimePolicy,
  type DiscoveryFilter,
  type MiningConversionWarning,
} from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';

import type {
  MiningDiscoveryResponse,
  MiningTableResponse,
  MiningConformanceResponse,
} from '@/lib/mining-engine';
import {
  emptyMiningSnapshot,
  openMiningTab,
  activateMiningTab,
  closeMiningTab,
  type MiningSnapshot,
  type MiningTabsState,
  type MiningReplay,
  type MiningStatus,
  type DfgEdgeMetric,
  type MiningInsight,
} from './mining-tabs';
export type { MiningReplay, MiningStatus, DfgEdgeMetric } from './mining-tabs';
export { miningTabs } from './mining-tabs';

export interface PendingUpload {
  fileName: string;
  source: string;
}

interface MiningState extends MiningTabsState {
  storageHydrated: boolean;
  storageAttempt: number;
  retryStorage: () => void;
  setStorageHydrated: (ready: boolean) => void;
  storageStatus: 'loading' | 'saving' | 'saved' | 'error' | 'conflict';
  setStorageStatus: (status: MiningState['storageStatus']) => void;
  workerRevision: number;
  /** A file imported elsewhere (header, drop) waiting for the mining view. */
  pendingUpload: PendingUpload | null;
  /** The uploaded file waiting for its column mapping. */
  mappingTable: (MiningTableResponse & { source: string }) | null;
  result: MiningDiscoveryResponse | null;
  conformance: {
    model: ProcessModel;
    evidence: MiningConformanceResponse;
    optionsKey: string;
  } | null;
  conformanceError: string | null;
  checkingConformance: boolean;
  filter: DiscoveryFilter;
  timePolicy: TimePolicy;
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
  switchTab: (id: string) => void;
  closeTab: (id: string) => void;
  setMapMode: (mode: MiningSnapshot['mapMode']) => void;
  setInsight: (tab: MiningInsight) => void;
  setReference: (reference: MiningSnapshot['reference']) => void;
  restoreTabs: (tabs: MiningTabsState['tabs'], activeTabId: string | null) => void;
  reloadTab: () => void;
  reorderTab: (id: string, index: number) => void;
}

export const useMiningStore = create<MiningState>((set, get) => ({
  ...emptyMiningSnapshot(),
  tabs: [],
  activeTabId: null,
  storageStatus: 'loading',
  storageHydrated: false,
  storageAttempt: 0,
  retryStorage: () => set((state) => ({ storageAttempt: state.storageAttempt + 1 })),
  setStorageHydrated: (storageHydrated) => set({ storageHydrated }),
  setStorageStatus: (storageStatus) => set({ storageStatus }),
  workerRevision: 0,
  pendingUpload: null,
  mappingTable: null,
  result: null,
  conformance: null,
  conformanceError: null,
  checkingConformance: false,
  filter: DEFAULT_DISCOVERY_FILTER,
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
    set((state) =>
      replay
        ? openMiningTab(state, replay, result)
        : {
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
          },
    ),
  setConformance: (evidence, model, optionsKey) =>
    set({
      conformance: { model, evidence, optionsKey },
      conformanceError: null,
      checkingConformance: false,
    }),
  setConformanceError: (conformanceError) =>
    set({ conformance: null, conformanceError, checkingConformance: false }),
  startConformance: () =>
    set({ conformance: null, conformanceError: null, checkingConformance: true }),
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
      pendingUpload: null,
      mappingTable: null,
      selectedVariantId: null,
      conversionWarnings: [],
    }),
  switchTab: (id) =>
    set((state) => {
      const next = activateMiningTab(state, id);
      return next
        ? {
            ...next,
            workerRevision: state.workerRevision + 1,
            pendingUpload: null,
            mappingTable: null,
          }
        : state;
    }),
  closeTab: (id) =>
    set((state) => {
      const next = closeMiningTab(state, id);
      if (!next) return state;
      if (state.activeTabId !== id) return next;
      return {
        ...next,
        workerRevision: state.workerRevision + 1,
        pendingUpload: null,
        mappingTable: null,
      };
    }),
  setMapMode: (mapMode) => set({ mapMode }),
  setInsight: (insight) => set({ insight }),
  setReference: (reference) => set({ reference }),
  restoreTabs: (tabs, activeTabId) =>
    set((state) => {
      const tab = tabs.find((item) => item.id === activeTabId) ?? tabs[0];
      return {
        ...(tab ?? emptyMiningSnapshot()),
        tabs,
        activeTabId: tab?.id ?? null,
        workerRevision: state.workerRevision + 1,
      };
    }),
  reloadTab: () =>
    set((state) => ({
      workerRevision: state.workerRevision + 1,
      mappingTable: null,
      pendingUpload: null,
      status: state.replay ? 'loading' : 'idle',
      error: null,
    })),
  reorderTab: (id, index) =>
    set((state) => {
      const from = state.tabs.findIndex((tab) => tab.id === id);
      if (
        from < 0 ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= state.tabs.length ||
        from === index
      )
        return state;
      const tabs = [...state.tabs];
      tabs.splice(index, 0, tabs.splice(from, 1)[0]);
      return { tabs };
    }),
}));
