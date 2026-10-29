import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_FILTER,
  DEFAULT_WORK_CALENDAR,
} from '@flowculus/process-mining';
import { createMiningSession } from './mining-engine';
import { useMiningStore, miningTabs } from './mining-store';
import { MAX_MINING_TABS } from './mining-tabs';
import { replayMiningLog } from './mining-replay';
import { useWorkspaceStore } from './workspace-store';

const mapping = { caseId: 'case', activity: 'activity', timestamp: 'time' };
const source = (hours: number) =>
  `case,activity,time\nA,Start,2026-10-05T08:00:00+07:00\nA,Finish,2026-10-05T${String(8 + hours).padStart(2, '0')}:00:00+07:00`;

function open(name: string, hours = 2) {
  const worker = createMiningSession();
  worker({ type: 'inspect-file', fileName: name, source: source(hours) });
  const result = worker({
    type: 'apply-mapping',
    name,
    mapping,
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (result.type !== 'discovery') throw new Error('Expected discovery');
  useMiningStore
    .getState()
    .setResult(result, { kind: 'file', fileName: name, source: source(hours), mapping });
  return useMiningStore.getState().activeTabId!;
}
beforeEach(() => useMiningStore.setState(useMiningStore.getInitialState(), true));

describe('independent Mining event-log tabs', () => {
  it('opens each uploaded log independently and restores its source, evidence and controls', () => {
    const workspace = useWorkspaceStore.getState();
    const asIs = open('as-is.csv', 2);
    const firstResult = useMiningStore.getState().result;
    const policy = {
      basis: 'working' as const,
      calendar: structuredClone(DEFAULT_WORK_CALENDAR),
    };
    useMiningStore.getState().setTimePolicy(policy);
    useMiningStore.getState().setFilter({ minEdgeShare: 0.7 });
    useMiningStore.getState().setMapMode('resources');
    useMiningStore.getState().setInsight('resources');
    useMiningStore.getState().setReference({
      documentId: 'model-a',
      poolId: 'pool-a',
      mapping: { Start: 'start' },
    });
    const toBe = open('to-be.csv', 1);
    expect(useMiningStore.getState().tabs).toHaveLength(2);
    expect(useMiningStore.getState().result?.discovery.stats.meanLeadTimeMs).toBe(
      3600000,
    );
    useMiningStore.getState().setTimePolicy({ basis: 'elapsed' });
    useMiningStore.getState().setFilter({ minEdgeShare: 0.2 });
    useMiningStore.getState().switchTab(asIs);
    const restored = useMiningStore.getState();
    expect(restored.result).toBe(firstResult);
    expect(restored.replay).toMatchObject({ fileName: 'as-is.csv' });
    expect(restored.filter.minEdgeShare).toBe(0.7);
    expect(restored.timePolicy).toEqual(policy);
    expect(restored.mapMode).toBe('resources');
    expect(restored.insight).toBe('resources');
    expect(restored.reference.documentId).toBe('model-a');
    restored.switchTab(toBe);
    expect(useMiningStore.getState().filter.minEdgeShare).toBe(0.2);
    expect(useMiningStore.getState().timePolicy.basis).toBe('elapsed');
    expect(useWorkspaceStore.getState()).toBe(workspace);
  });

  it('keeps different uploads with the same file name as separate tabs', () => {
    const first = open('same.csv', 2);
    const second = open('same.csv', 1);
    expect(first).not.toBe(second);
    useMiningStore.getState().switchTab(first);
    expect(useMiningStore.getState().result?.discovery.stats.meanLeadTimeMs).toBe(
      7200000,
    );
  });

  it('keeps the previous log when another source is queued, cancelled or fails', () => {
    const first = open('original.csv');
    useMiningStore.getState().queueUpload({ fileName: 'new.csv', source: 'bad' });
    expect(useMiningStore.getState().tabs).toHaveLength(1);
    useMiningStore.getState().takePendingUpload();
    useMiningStore.getState().setStatus('error', 'Bad source');
    expect(miningTabs(useMiningStore.getState())[0].result?.logName).toBe('original.csv');
    useMiningStore.getState().abortSession('Worker stopped');
    expect(useMiningStore.getState().activeTabId).toBe(first);
    expect(useMiningStore.getState().replay).toMatchObject({ fileName: 'original.csv' });
  });

  it('closes only the selected log and chooses its neighbor without touching BPMN', () => {
    const a = open('a.csv');
    const b = open('b.csv');
    const c = open('c.csv');
    useMiningStore.getState().closeTab(b);
    expect(useMiningStore.getState().activeTabId).toBe(c);
    useMiningStore.getState().closeTab(c);
    expect(useMiningStore.getState().activeTabId).toBe(a);
    expect(useMiningStore.getState().replay).toMatchObject({ fileName: 'a.csv' });
    useMiningStore.getState().closeTab(a);
    expect(useMiningStore.getState().activeTabId).toBeNull();
    expect(useMiningStore.getState().replay).toBeNull();
    expect(useMiningStore.getState().tabs).toEqual([]);
  });

  it('keeps an active upload intact when an inactive log is closed', () => {
    const first = open('first.csv');
    open('second.csv');
    const upload = { fileName: 'third.csv', source: source(2) };
    useMiningStore.getState().queueUpload(upload);
    const revision = useMiningStore.getState().workerRevision;
    useMiningStore.getState().closeTab(first);
    expect(useMiningStore.getState().pendingUpload).toBe(upload);
    expect(useMiningStore.getState().workerRevision).toBe(revision);
    expect(useMiningStore.getState().tabs).toHaveLength(1);
  });

  it('restores a source into the worker without adding another tab', async () => {
    const id = open('a.csv');
    const state = useMiningStore.getState();
    const worker = createMiningSession();
    const result = await replayMiningLog(
      async (request) => worker(request),
      state.replay!,
      state.filter,
      state.timePolicy,
      () => true,
    );
    if (!result) throw new Error('Expected restored log');
    useMiningStore.getState().setResult(result);
    expect(useMiningStore.getState().tabs).toHaveLength(1);
    expect(useMiningStore.getState().activeTabId).toBe(id);
    expect(worker({ type: 'read-log-page', offset: 0 }).type).toBe('log-page');
  });

  it('does not apply column mapping after another tab supersedes a restore', async () => {
    open('a.csv');
    const state = useMiningStore.getState();
    let active = true;
    const types: string[] = [];
    const result = await replayMiningLog(
      async (request) => {
        types.push(request.type);
        active = false;
        return createMiningSession()(request);
      },
      state.replay!,
      state.filter,
      state.timePolicy,
      () => active,
    );
    expect(result).toBeNull();
    expect(types).toEqual(['inspect-file']);
  });

  it('bounds open logs and leaves all previous tabs intact when the limit is reached', () => {
    for (let i = 0; i < MAX_MINING_TABS; i++) open(`log-${i}.csv`);
    const before = useMiningStore.getState();
    expect(() => open('over-limit.csv')).toThrow('mining-tab-limit');
    expect(useMiningStore.getState()).toBe(before);
  });

  it('reorders tabs without changing their evidence or active worker', () => {
    const first = open('first.csv');
    const second = open('second.csv');
    const revision = useMiningStore.getState().workerRevision;
    useMiningStore.getState().reorderTab(first, 1);
    expect(useMiningStore.getState().tabs.map((tab) => tab.id)).toEqual([second, first]);
    expect(useMiningStore.getState().activeTabId).toBe(second);
    expect(useMiningStore.getState().workerRevision).toBe(revision);
  });
});
