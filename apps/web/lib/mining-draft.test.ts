import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DISCOVERY_FILTER } from '@flowculus/process-mining';
import { createMiningSession } from './mining-engine';
import { useMiningStore } from './mining-store';
import {
  createMiningDraft,
  MINING_CHECKPOINT_KEY,
  parseMiningDraft,
} from './mining-draft-schema';
import {
  checkpointMiningDraft,
  loadMiningDraft,
  saveMiningDraft,
} from './mining-draft-storage';
import { hasMiningDraftChanged } from './use-mining-draft';

const mapping = { caseId: 'case', activity: 'activity', timestamp: 'time' };
const source = 'case,activity,time\n1,Review,2026-10-05T08:00:00Z';
function add(name: string) {
  const worker = createMiningSession();
  worker({ type: 'inspect-file', fileName: name, source });
  const result = worker({
    type: 'apply-mapping',
    name,
    mapping,
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (result.type !== 'discovery') throw new Error('Expected discovery');
  useMiningStore
    .getState()
    .setResult(result, { kind: 'file', fileName: name, source, mapping });
}
beforeEach(() => {
  useMiningStore.setState(useMiningStore.getInitialState(), true);
  add('as-is.csv');
  useMiningStore.getState().setMapMode('resources');
  useMiningStore.getState().setInsight('alpha');
  add('to-be.csv');
});
afterEach(() => vi.unstubAllGlobals());

describe('Mining draft boundaries', () => {
  it('recognizes settings edited while storage is still loading', () => {
    const initial = useMiningStore.getState();
    expect(hasMiningDraftChanged(initial, initial)).toBe(false);
    initial.setFilter({ minEdgeShare: 0.6 });
    expect(hasMiningDraftChanged(useMiningStore.getState(), initial)).toBe(true);
    const filtered = useMiningStore.getState();
    filtered.setTimePolicy({ basis: 'working', calendar: filtered.workCalendar });
    expect(hasMiningDraftChanged(useMiningStore.getState(), filtered)).toBe(true);
  });

  it('round-trips source, mapping and per-log settings without persisting evidence or BPMN', () => {
    const saved = createMiningDraft(useMiningStore.getState(), 100);
    expect(
      saved.tabs.every((tab) => tab.result === null && tab.conformance === null),
    ).toBe(true);
    const parsed = parseMiningDraft(JSON.parse(JSON.stringify(saved)));
    expect(parsed?.tabs).toHaveLength(2);
    expect(parsed?.activeTabId).toBe(saved.activeTabId);
    expect(parsed?.tabs[0].mapMode).toBe('resources');
    expect(parsed?.tabs[0].insight).toBe('alpha');
    expect(parsed?.tabs[0].replay).toEqual({
      kind: 'file',
      fileName: 'as-is.csv',
      source,
      mapping,
    });
    expect(
      parsed?.tabs.every((tab) => tab.result === null && tab.conformance === null),
    ).toBe(true);
  });

  it('rejects corrupted identities, missing active log, invalid time policies, mapping and filters', () => {
    const saved = createMiningDraft(useMiningStore.getState(), 100);
    expect(parseMiningDraft({ ...saved, activeTabId: 'missing' })).toBeNull();
    expect(
      parseMiningDraft({ ...saved, tabs: [saved.tabs[0], saved.tabs[0]] }),
    ).toBeNull();
    for (const patch of [
      { filter: { minActivityShare: -1, minEdgeShare: 0, minTransitionHours: 0 } },
      { filter: { minActivityShare: 0, minEdgeShare: 2, minTransitionHours: Infinity } },
      { timePolicy: { basis: 'working', calendar: {} } },
      { replay: { kind: 'file', fileName: 'bad.csv', source, mapping: {} } },
      { replay: { kind: 'preset', presetId: 'unknown' } },
      { reference: { documentId: 'x', poolId: '', mapping: { a: 42 } } },
    ])
      expect(
        parseMiningDraft({
          ...saved,
          tabs: [{ ...saved.tabs[0], ...patch }, saved.tabs[1]],
        }),
      ).toBeNull();
  });

  it('uses a separate localStorage fallback and the newest checkpoint', async () => {
    const values = new Map<string, string>([
      ['flowculus-workspace:documents-v1', 'BPMN preserved'],
    ]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    const saved = createMiningDraft(useMiningStore.getState(), 100);
    await saveMiningDraft(saved);
    expect((await loadMiningDraft())?.tabs).toHaveLength(2);
    expect(values.get('flowculus-workspace:documents-v1')).toBe('BPMN preserved');
    checkpointMiningDraft({ ...saved, updatedAt: 200, tabs: [], activeTabId: null });
    expect((await loadMiningDraft())?.tabs).toEqual([]);
  });

  it('surfaces quota errors and preserves corrupt checkpoints instead of overwriting them', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => '{bad',
        setItem: () => {
          throw new Error('Quota exceeded');
        },
      },
    });
    await expect(loadMiningDraft()).rejects.toThrow();
    await expect(
      saveMiningDraft(createMiningDraft(useMiningStore.getState(), 100)),
    ).rejects.toThrow('Quota');
    expect(MINING_CHECKPOINT_KEY).not.toContain('flowculus-workspace');
  });
});
