import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
import { createDocument, INITIAL_DOCUMENT_ID } from './document-types';
import {
  checkpointWorkspaceSession,
  loadWorkspaceSession,
  parseWorkspaceSession,
  saveWorkspaceSession,
  type WorkspaceSession,
} from './workspace-session-storage';

const session = (): WorkspaceSession => ({
  version: 1,
  updatedAt: 100,
  activeDocumentId: INITIAL_DOCUMENT_ID,
  documents: [createDocument(INITIAL_PROCESS_MODEL, {}, INITIAL_DOCUMENT_ID)],
});
const storage = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  };
};
afterEach(() => vi.unstubAllGlobals());
describe('multi-document recovery', () => {
  it('preserves unfinished graphs, names, active tab, options, original XML and viewport', async () => {
    vi.stubGlobal('window', { localStorage: storage() });
    const saved = session();
    saved.documents.push(
      createDocument(
        {
          ...INITIAL_PROCESS_MODEL,
          name: 'Draft B',
          nodes: {
            decision: {
              id: 'decision',
              label: 'Incomplete',
              kind: 'gateway',
              gatewayKind: 'xor',
            },
          },
        },
        {},
        'b',
      ),
    );
    saved.activeDocumentId = 'b';
    saved.documents[1]!.canvasViewport = { x: 3, y: 4, zoom: 0.6 };
    await saveWorkspaceSession(saved);
    const restored = await loadWorkspaceSession();
    expect(restored?.activeDocumentId).toBe('b');
    expect(restored?.documents).toHaveLength(2);
    expect(restored?.documents[1]!.processModel.nodes.decision).toBeDefined();
    expect(restored?.documents[1]!.canvasViewport?.zoom).toBe(0.6);
  });
  it('migrates the previous single draft without losing custom content', async () => {
    const localStorage = storage();
    vi.stubGlobal('window', { localStorage });
    localStorage.setItem(
      'flowculus-workspace:current',
      JSON.stringify({
        draftVersion: 2,
        model: { ...INITIAL_PROCESS_MODEL, name: 'My old process' },
        modelName: 'My old process',
        updatedAt: 75,
      }),
    );
    const restored = await loadWorkspaceSession();
    expect(restored?.documents[0]!.processModel.name).toBe('My old process');
    expect(restored?.documents[0]!.savedContent).toBeNull();
    expect(localStorage.getItem('flowculus-workspace:current')).toBeTruthy();
  });
  it('writes an immediate checkpoint without persisting unbounded undo histories', async () => {
    vi.stubGlobal('window', { localStorage: storage() });
    const saved = session();
    saved.documents[0]!.history.past.push(INITIAL_PROCESS_MODEL);
    checkpointWorkspaceSession(saved);
    expect((await loadWorkspaceSession())?.documents[0]!.history.past).toEqual([]);
  });
  it('rejects corrupt models, duplicated identities, missing active tab and excessive tab counts', () => {
    const saved = session();
    expect(parseWorkspaceSession({ ...saved, activeDocumentId: 'missing' })).toBeNull();
    expect(
      parseWorkspaceSession({
        ...saved,
        documents: [saved.documents[0], saved.documents[0]],
      }),
    ).toBeNull();
    expect(parseWorkspaceSession({ ...saved, documents: [] })).toBeNull();
    expect(parseWorkspaceSession({ ...saved, updatedAt: NaN })).toBeNull();
    expect(
      parseWorkspaceSession({
        ...saved,
        documents: [
          { ...saved.documents[0], analysisOptions: { arrivalRatePerHour: -1 } },
        ],
      }),
    ).toBeNull();
    expect(
      parseWorkspaceSession({
        ...saved,
        documents: [{ ...saved.documents[0], processModel: {} }],
      }),
    ).toBeNull();
  });
  it('keeps the actual device-save state after reload without persisting writable handles', () => {
    const saved = session();
    saved.documents[0]!.deviceStatus = 'saved';
    saved.documents[0]!.savedContent = 'baseline';
    expect(parseWorkspaceSession(saved)?.documents[0]!.deviceStatus).toBe('saved');
    expect(parseWorkspaceSession(saved)?.documents[0]).not.toHaveProperty('handle');
  });
  it.each([Infinity, NaN, '1', 0, -1])(
    'rejects a corrupt viewport zoom (%s) before restoring the canvas',
    (zoom) => {
      const saved = session();
      expect(
        parseWorkspaceSession({
          ...saved,
          documents: [{ ...saved.documents[0], canvasViewport: { x: 0, y: 0, zoom } }],
        }),
      ).toBeNull();
    },
  );
  it('storage failures are surfaced rather than reporting a successful draft', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('Quota exceeded');
        },
      },
    });
    await expect(saveWorkspaceSession(session())).rejects.toThrow('Quota');
  });
});
