import {
  DEFAULT_DISCOVERY_FILTER,
  DEFAULT_WORK_CALENDAR,
  ELAPSED_TIME_POLICY,
  type ColumnMapping,
  type DiscoveryFilter,
  type MiningConversionWarning,
  type MiningPresetId,
  type TimePolicy,
  type WorkCalendar,
} from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';
import type { MiningConformanceResponse, MiningDiscoveryResponse } from './mining-engine';

export const MAX_MINING_TABS = 10;
export const MAX_MINING_SOURCE_LENGTH = 30_000_000;
export type MiningStatus = 'idle' | 'loading' | 'ready' | 'error';
export type DfgEdgeMetric = 'frequency' | 'duration';
export type MiningReplay =
  | { kind: 'preset'; presetId: MiningPresetId }
  | { kind: 'file'; fileName: string; source: string; mapping: ColumnMapping };
export type MiningInsight =
  'conclusions' | 'variants' | 'bottlenecks' | 'resources' | 'alpha' | 'conformance';

export interface MiningSnapshot {
  status: MiningStatus;
  error: string | null;
  replay: MiningReplay | null;
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
  workCalendar: WorkCalendar;
  selectedVariantId: string | null;
  edgeMetric: DfgEdgeMetric;
  conversionWarnings: MiningConversionWarning[];
  mapMode: 'process' | 'resources';
  insight: MiningInsight;
  reference: { documentId: string; poolId: string; mapping: Record<string, string> };
}
export interface MiningTab extends MiningSnapshot {
  id: string;
}
export interface MiningTabsState extends MiningSnapshot {
  tabs: MiningTab[];
  activeTabId: string | null;
}

export const emptyMiningSnapshot = (): MiningSnapshot => ({
  status: 'idle',
  error: null,
  replay: null,
  result: null,
  conformance: null,
  conformanceError: null,
  checkingConformance: false,
  filter: { ...DEFAULT_DISCOVERY_FILTER },
  timePolicy: ELAPSED_TIME_POLICY,
  workCalendar: structuredClone(DEFAULT_WORK_CALENDAR),
  selectedVariantId: null,
  edgeMetric: 'frequency',
  conversionWarnings: [],
  mapMode: 'process',
  insight: 'conclusions',
  reference: { documentId: '', poolId: '', mapping: {} },
});

/** Explicit fields prevent copying store actions, pending uploads or other tabs. */
export function miningSnapshot(state: MiningSnapshot): MiningSnapshot {
  return {
    status: state.status,
    error: state.error,
    replay: state.replay,
    result: state.result,
    conformance: state.conformance,
    conformanceError: state.conformanceError,
    checkingConformance: false,
    filter: state.filter,
    timePolicy: state.timePolicy,
    workCalendar: state.workCalendar,
    selectedVariantId: state.selectedVariantId,
    edgeMetric: state.edgeMetric,
    conversionWarnings: state.conversionWarnings,
    mapMode: state.mapMode,
    insight: state.insight,
    reference: state.reference,
  };
}

export function miningTabs(state: MiningTabsState): MiningTab[] {
  return state.tabs.map((tab) =>
    tab.id === state.activeTabId
      ? {
          id: tab.id,
          ...miningSnapshot(state),
          status: state.result ? 'ready' : state.status,
        }
      : tab,
  );
}

export function assertMiningCapacity(state: MiningTabsState, sourceLength = 0): void {
  if (state.tabs.length >= MAX_MINING_TABS) throw new Error('mining-tab-limit');
  const length = miningTabs(state).reduce(
    (sum, tab) => sum + (tab.replay?.kind === 'file' ? tab.replay.source.length : 0),
    sourceLength,
  );
  if (length > MAX_MINING_SOURCE_LENGTH) throw new Error('mining-source-limit');
}

export function openMiningTab(
  state: MiningTabsState,
  replay: MiningReplay,
  result: MiningDiscoveryResponse,
) {
  assertMiningCapacity(state, replay.kind === 'file' ? replay.source.length : 0);
  const id = `mining-${globalThis.crypto.randomUUID()}`;
  const next: MiningSnapshot = {
    ...emptyMiningSnapshot(),
    replay,
    result,
    status: 'ready',
    filter: state.filter,
    timePolicy: state.timePolicy,
    workCalendar: state.workCalendar,
  };
  return { ...next, activeTabId: id, tabs: [...miningTabs(state), { ...next, id }] };
}

export function activateMiningTab(state: MiningTabsState, id: string) {
  const tab = miningTabs(state).find((item) => item.id === id);
  if (!tab || id === state.activeTabId) return null;
  return {
    ...miningSnapshot(tab),
    activeTabId: id,
    tabs: miningTabs(state),
    status: 'loading' as const,
  };
}

export function closeMiningTab(state: MiningTabsState, id: string) {
  const all = miningTabs(state);
  const index = all.findIndex((tab) => tab.id === id);
  if (index < 0) return null;
  const tabs = all.filter((tab) => tab.id !== id);
  if (id !== state.activeTabId) return { tabs };
  const next = tabs[Math.min(index, tabs.length - 1)];
  return {
    ...(next ? miningSnapshot(next) : emptyMiningSnapshot()),
    tabs,
    activeTabId: next?.id ?? null,
    status: next ? ('loading' as const) : ('idle' as const),
  };
}
