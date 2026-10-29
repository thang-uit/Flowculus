import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DISCOVERY_FILTER } from '@flowculus/process-mining';
import { createMiningSession, type MiningResponse } from './mining-engine';
import { runMiningConformance } from './mining-conformance';
import { useMiningStore } from './mining-store';
import { MiningAbortError } from './use-mining-client';
import { usePreferencesStore } from './use-preferences-store';
import { getWorkspaceCopy } from './i18n';
import { createDocument } from './documents/document-types';
import { useWorkspaceStore } from './workspace-store';
import type { ProcessModel } from '@flowculus/process-model';
const model: ProcessModel = {
  schemaVersion: 1,
  id: 'reference',
  name: 'Reference',
  nodes: {
    s: { id: 's', label: 'Start', kind: 'start' },
    t: { id: 't', label: 'Review', kind: 'task', durationMinutes: 5 },
    e: { id: 'e', label: 'End', kind: 'end' },
  },
  edges: {
    a: { id: 'a', source: 's', target: 't' },
    b: { id: 'b', source: 't', target: 'e' },
  },
};
beforeEach(() => {
  useMiningStore.setState(useMiningStore.getInitialState(), true);
  useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true);
  usePreferencesStore.setState({ locale: 'vi' });
  useWorkspaceStore
    .getState()
    .restoreDocuments([createDocument(model, {}, 'reference')], 'reference');
  const discovery = createMiningSession()({
    type: 'load-preset',
    presetId: 'it-service-desk',
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (discovery.type !== 'discovery') throw Error('Expected discovery');
  useMiningStore
    .getState()
    .setResult(discovery, { kind: 'preset', presetId: 'it-service-desk' });
});
describe('conformance worker lifecycle', () => {
  it.each(['timeout', 'worker-restarted', 'cancelled'] as const)(
    'drops results whose worker lost the log after %s',
    async (reason) => {
      await runMiningConformance(
        model,
        {},
        async () => {
          throw new MiningAbortError(reason);
        },
        () => true,
      );
      const state = useMiningStore.getState();
      expect(state.result).toBeNull();
      expect(state.replay).toEqual({ kind: 'preset', presetId: 'it-service-desk' });
      expect(state.checkingConformance).toBe(false);
      const copy = getWorkspaceCopy('vi');
      expect(state.error).toBe(
        reason === 'timeout'
          ? copy.resilience.miningTimeout
          : reason === 'cancelled'
            ? copy.resilience.miningCancelled
            : copy.resilience.workerRestarting,
      );
    },
  );
  it('ignores late results after cancellation, a newer request or replacement log', async () => {
    const handle = createMiningSession();
    handle({
      type: 'load-preset',
      presetId: 'it-service-desk',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    const response = handle({ type: 'check-conformance', model });
    for (const change of ['cancel', 'log'] as const) {
      let finish!: (response: MiningResponse) => void;
      let active = true;
      const run = runMiningConformance(
        model,
        {},
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
        () => active,
      );
      if (change === 'cancel') active = false;
      else {
        const next = handle({ type: 'discover', filter: DEFAULT_DISCOVERY_FILTER });
        if (next.type === 'discovery') useMiningStore.getState().setResult(next);
      }
      finish(response);
      await run;
      expect(useMiningStore.getState().conformance).toBeNull();
    }
  });
  it('ignores a response after the reference document is closed or replaced', async () => {
    let finish!: (response: MiningResponse) => void;
    const run = runMiningConformance(
      model,
      {},
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
      () => true,
    );
    useWorkspaceStore.getState().newDocument('Replacement');
    useWorkspaceStore.getState().closeDocument('reference', 'Replacement');
    const handle = createMiningSession();
    handle({
      type: 'load-preset',
      presetId: 'it-service-desk',
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    finish(handle({ type: 'check-conformance', model }));
    await run;
    expect(useMiningStore.getState().conformance).toBeNull();
    expect(useMiningStore.getState().checkingConformance).toBe(false);
    expect(useMiningStore.getState().conformanceError).toContain('Quy trình chuẩn');
  });
  it('clears old evidence at the start and localizes a failure in the current language', async () => {
    const request = vi.fn(async () => {
      usePreferencesStore.setState({ locale: 'en' });
      throw new Error('internal implementation detail');
    });
    await runMiningConformance(model, {}, request, () => true);
    expect(useMiningStore.getState().conformance).toBeNull();
    expect(useMiningStore.getState().conformanceError).toBe(
      'Could not compare this log with the reference. Try again, or reload the log.',
    );
  });
  it('does not send a request while a replacement log is loading', async () => {
    useMiningStore.getState().setStatus('loading');
    const request = vi.fn();
    await runMiningConformance(model, {}, request, () => true);
    expect(request).not.toHaveBeenCalled();
    expect(useMiningStore.getState().checkingConformance).toBe(false);
  });
});
