import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DISCOVERY_FILTER } from '@flowculus/process-mining';
import { createMiningCanvasDocument } from './mining-canvas';
import {
  createMiningSession,
  type MiningRequest,
  type MiningResponse,
} from './mining-engine';
import { useMiningStore } from './mining-store';
import { useWorkspaceStore } from './workspace-store';
import { INITIAL_PROCESS_MODEL } from './initial-process-model';
import {
  createDocument,
  getWorkspaceDocuments,
  INITIAL_DOCUMENT_ID,
  MAX_OPEN_DOCUMENTS,
} from './documents/document-types';

const session = () => {
  const handle = createMiningSession();
  const discovery = handle({
    type: 'load-preset',
    presetId: 'it-service-desk',
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (discovery.type !== 'discovery') throw new Error('Expected discovery');
  useMiningStore.getState().setResult(discovery);
  return handle;
};

beforeEach(() => {
  useMiningStore.getState().abortSession(null);
  useMiningStore.getState().setConversionWarnings([]);
  useMiningStore.setState({ filter: DEFAULT_DISCOVERY_FILTER, pendingUpload: null });
  useWorkspaceStore.getState().setDraftStatus('saved');
  useWorkspaceStore
    .getState()
    .restoreDocuments(
      [createDocument(INITIAL_PROCESS_MODEL, {}, INITIAL_DOCUMENT_ID)],
      INITIAL_DOCUMENT_ID,
    );
});

describe('named Mining conversion', () => {
  it('uses the chosen process name and preserves every existing document', async () => {
    const handle = session();
    const before = getWorkspaceDocuments(useWorkspaceStore.getState());
    const result = await createMiningCanvasDocument(
      '  Quy trình  hỗ trợ của tôi  ',
      async (request) => handle(request),
      () => true,
    );
    expect(result).toBe('created');
    const workspace = useWorkspaceStore.getState();
    expect(workspace.processModel.name).toBe('Quy trình hỗ trợ của tôi');
    expect(getWorkspaceDocuments(workspace).slice(0, -1)).toEqual(before);
    expect(useMiningStore.getState().result?.logName).toBe('IT Service Desk');
    expect(workspace.mode).toBe('model');
  });

  it.each(['', '   ', 'x'.repeat(121), 'A\u0000B'])(
    'rejects invalid name %j before conversion',
    async (name) => {
      const request = vi.fn(async () => ({ type: 'csv', csv: '', logName: '' }) as const);
      expect(await createMiningCanvasDocument(name, request, () => true)).toBe(
        'invalid-name',
      );
      expect(request).not.toHaveBeenCalled();
      expect(useWorkspaceStore.getState().documents).toHaveLength(1);
    },
  );

  it('requires a ready discovery and no queued upload', async () => {
    const handle = session();
    const request = vi.fn(async (value: MiningRequest) => handle(value));
    useMiningStore.getState().setStatus('loading');
    expect(await createMiningCanvasDocument('Mine', request, () => true)).toBe(
      'unavailable',
    );
    useMiningStore.getState().setStatus('ready');
    useMiningStore.getState().queueUpload({ fileName: 'next.csv', source: '' });
    expect(await createMiningCanvasDocument('Mine', request, () => true)).toBe(
      'unavailable',
    );
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['filter', 'log', 'cancel'] as const)(
    'discards a response after %s changes',
    async (change) => {
      const handle = session();
      let resolve!: (response: MiningResponse) => void;
      let current = true;
      const pending = createMiningCanvasDocument(
        'Mine',
        () =>
          new Promise((done) => {
            resolve = done;
          }),
        () => current,
      );
      const response = handle({
        type: 'to-model',
        name: 'Mine',
        filter: DEFAULT_DISCOVERY_FILTER,
      });
      if (change === 'filter') useMiningStore.getState().setFilter({ minEdgeShare: 0.5 });
      if (change === 'log') session();
      if (change === 'cancel') current = false;
      resolve(response);
      expect(await pending).toBe('stale');
      expect(useWorkspaceStore.getState().documents).toHaveLength(1);
      expect(useMiningStore.getState().conversionWarnings).toEqual([]);
    },
  );

  it('enforces the tab limit both before and after asynchronous conversion', async () => {
    const handle = session();
    const request = vi.fn(async (value: MiningRequest) => {
      while (useWorkspaceStore.getState().documents.length < MAX_OPEN_DOCUMENTS)
        useWorkspaceStore.getState().newDocument('Existing');
      return handle(value);
    });
    expect(await createMiningCanvasDocument('Mine', request, () => true)).toBe(
      'document-limit',
    );
    expect(await createMiningCanvasDocument('Mine', request, () => true)).toBe(
      'document-limit',
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(useWorkspaceStore.getState().documents).toHaveLength(MAX_OPEN_DOCUMENTS);
    expect(useWorkspaceStore.getState().processModel.name).toBe('Existing');
  });
});
