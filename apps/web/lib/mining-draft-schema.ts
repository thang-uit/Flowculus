import {
  isTimePolicy,
  isEventImportSettings,
  MINING_PRESETS,
} from '@flowculus/process-mining';
import {
  emptyMiningSnapshot,
  miningTabs,
  MAX_MINING_TABS,
  MAX_MINING_SOURCE_LENGTH,
  type MiningTab,
  type MiningTabsState,
} from './mining-tabs';

export const MINING_CHECKPOINT_KEY = 'flowculus-mining:tabs-v1';
export const MAX_MINING_DRAFT_LENGTH = MAX_MINING_SOURCE_LENGTH + 1_000_000;
export interface MiningDraft {
  version: 1;
  updatedAt: number;
  activeTabId: string | null;
  tabs: MiningTab[];
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, limit = 500): value is string =>
  typeof value === 'string' && value.length <= limit;

/** Disk data is untrusted. Restore only source/settings, never cached conclusions or models. */
export function parseMiningDraft(value: unknown): MiningDraft | null {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.updatedAt) ||
    !Array.isArray(value.tabs) ||
    value.tabs.length > MAX_MINING_TABS
  )
    return null;
  const tabs: MiningTab[] = [];
  let sourceLength = 0;
  for (const raw of value.tabs) {
    if (
      !record(raw) ||
      !text(raw.id, 200) ||
      !raw.id ||
      tabs.some((tab) => tab.id === raw.id) ||
      !record(raw.replay) ||
      !record(raw.filter) ||
      !isTimePolicy(raw.timePolicy) ||
      !isTimePolicy({ basis: 'working', calendar: raw.workCalendar })
    )
      return null;
    const replay = raw.replay;
    if (replay.kind === 'file') {
      if (
        !text(replay.fileName) ||
        !text(replay.source, MAX_MINING_SOURCE_LENGTH) ||
        !record(replay.mapping) ||
        (replay.settings !== undefined && !isEventImportSettings(replay.settings))
      )
        return null;
      const required = ['caseId', 'activity', 'timestamp'];
      const optional = ['startTimestamp', 'lifecycle', 'resource', 'cost'];
      if (
        !required.every(
          (key) =>
            text((replay.mapping as Record<string, unknown>)[key]) &&
            (replay.mapping as Record<string, unknown>)[key] !== '',
        ) ||
        !Object.entries(replay.mapping).every(
          ([key, column]) =>
            [...required, ...optional].includes(key) &&
            (column === undefined || text(column)),
        )
      )
        return null;
      sourceLength += replay.source.length;
    } else if (
      replay.kind !== 'preset' ||
      !MINING_PRESETS.some((preset) => preset.id === replay.presetId)
    )
      return null;
    const filter = raw.filter;
    if (
      ![filter.minActivityShare, filter.minEdgeShare].every(
        (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1,
      ) ||
      typeof filter.minTransitionHours !== 'number' ||
      !Number.isFinite(filter.minTransitionHours) ||
      filter.minTransitionHours < 0
    )
      return null;
    const reference = raw.reference;
    if (
      !record(reference) ||
      !text(reference.documentId, 200) ||
      !text(reference.poolId, 200) ||
      !record(reference.mapping) ||
      Object.keys(reference.mapping).length > 1000 ||
      !Object.entries(reference.mapping).every(
        ([key, item]) => key.length <= 1000 && text(item, 1000),
      )
    )
      return null;
    const clean = emptyMiningSnapshot();
    tabs.push({
      ...clean,
      id: raw.id,
      replay: replay as unknown as NonNullable<MiningTab['replay']>,
      filter: filter as unknown as MiningTab['filter'],
      timePolicy: raw.timePolicy,
      workCalendar: raw.workCalendar as MiningTab['workCalendar'],
      reference: reference as unknown as MiningTab['reference'],
      mapMode: raw.mapMode === 'resources' ? 'resources' : 'process',
      insight: [
        'conclusions',
        'variants',
        'bottlenecks',
        'resources',
        'alpha',
        'conformance',
      ].includes(String(raw.insight))
        ? (raw.insight as MiningTab['insight'])
        : 'conclusions',
      edgeMetric: raw.edgeMetric === 'duration' ? 'duration' : 'frequency',
      selectedVariantId: text(raw.selectedVariantId) ? raw.selectedVariantId : null,
    });
  }
  if (
    sourceLength > MAX_MINING_SOURCE_LENGTH ||
    (tabs.length === 0
      ? value.activeTabId !== null
      : !tabs.some((tab) => tab.id === value.activeTabId))
  )
    return null;
  return {
    version: 1,
    updatedAt: value.updatedAt as number,
    activeTabId: value.activeTabId as string | null,
    tabs,
  };
}

/** Derived results and worker state are intentionally memory-only. */
export function createMiningDraft(
  state: MiningTabsState,
  updatedAt: number,
): MiningDraft {
  return {
    version: 1,
    updatedAt,
    activeTabId: state.activeTabId,
    tabs: miningTabs(state).map((tab) => ({
      ...emptyMiningSnapshot(),
      id: tab.id,
      replay: tab.replay,
      filter: tab.filter,
      timePolicy: tab.timePolicy,
      workCalendar: tab.workCalendar,
      reference: tab.reference,
      mapMode: tab.mapMode,
      insight: tab.insight,
      edgeMetric: tab.edgeMetric,
      selectedVariantId: tab.selectedVariantId,
    })),
  };
}
