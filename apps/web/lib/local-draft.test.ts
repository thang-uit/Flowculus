import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';
import { validateProcessModel } from '@flowculus/validation';

import { checkpointLocalDraft, loadLocalDraft, saveLocalDraft } from './local-draft';
import { LEGACY_STARTER_MODEL } from './legacy-starter-model';

const incompleteModel: ProcessModel = {
  schemaVersion: 1,
  id: 'draft',
  name: 'Unfinished decision',
  nodes: {
    split: { id: 'split', label: 'Which?', kind: 'gateway', gatewayKind: 'xor' },
    a: { id: 'a', label: 'A', kind: 'task' },
    b: { id: 'b', label: 'B', kind: 'task' },
  },
  edges: {
    e1: { id: 'e1', source: 'split', target: 'a', probability: 0.7 },
    e2: { id: 'e2', source: 'split', target: 'b', probability: 0.4 },
  },
};

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
};

afterEach(() => vi.unstubAllGlobals());

describe('local draft recovery', () => {
  it('removes an untouched automatic starter checkpoint', async () => {
    const localStorage = storage();
    vi.stubGlobal('window', { localStorage });
    localStorage.setItem(
      'flowculus-workspace:current',
      JSON.stringify({
        model: LEGACY_STARTER_MODEL,
        modelName: LEGACY_STARTER_MODEL.name,
        updatedAt: 100,
      }),
    );
    expect(await loadLocalDraft()).toBeNull();
    expect(localStorage.getItem('flowculus-workspace:current')).toBeNull();
  });

  it('keeps an intentionally imported old example saved by the current application', async () => {
    vi.stubGlobal('window', { localStorage: storage() });
    await saveLocalDraft({
      model: LEGACY_STARTER_MODEL,
      modelName: LEGACY_STARTER_MODEL.name,
      updatedAt: 101,
    });
    const restored = await loadLocalDraft();
    expect(restored?.draftVersion).toBe(2);
    expect(restored?.model.nodes.approve?.label).toBe('Approve request');
  });

  it('restores a starter that the user edited instead of clearing it', async () => {
    vi.stubGlobal('window', { localStorage: storage() });
    const model = structuredClone(LEGACY_STARTER_MODEL);
    model.nodes.approve!.durationMinutes = 50;
    checkpointLocalDraft({ model, modelName: model.name, updatedAt: 100 });
    expect((await loadLocalDraft())?.model.nodes.approve?.durationMinutes).toBe(50);
  });

  it('keeps an unfinished model even when analytical validation fails', async () => {
    vi.stubGlobal('window', { localStorage: storage() });
    const snapshot = {
      model: incompleteModel,
      modelName: incompleteModel.name,
      analysisOptions: {},
      updatedAt: 100,
    };
    expect(validateProcessModel(incompleteModel).valid).toBe(false);
    await expect(saveLocalDraft(snapshot)).resolves.toBeUndefined();
    expect((await loadLocalDraft())?.model.edges.e1?.probability).toBe(0.7);
  });

  it('checkpoints the latest edit synchronously before the debounce fires', async () => {
    vi.stubGlobal('window', { localStorage: storage() });
    checkpointLocalDraft({
      model: incompleteModel,
      modelName: incompleteModel.name,
      updatedAt: 101,
    });
    expect((await loadLocalDraft())?.updatedAt).toBe(101);
  });
});
