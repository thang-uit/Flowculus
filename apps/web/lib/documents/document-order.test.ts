import { beforeEach, describe, expect, it } from 'vitest';
import { moveDocument } from './document-order';
import { useWorkspaceStore } from '../workspace-store';
import {
  createDocument,
  getWorkspaceDocuments,
  INITIAL_DOCUMENT_ID,
} from './document-types';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';

beforeEach(() => {
  useWorkspaceStore.getState().setDraftStatus('saved');
  useWorkspaceStore
    .getState()
    .restoreDocuments(
      [createDocument(INITIAL_PROCESS_MODEL, {}, INITIAL_DOCUMENT_ID)],
      INITIAL_DOCUMENT_ID,
    );
});
describe('stable process tab ordering', () => {
  it('moves in either direction without modifying the input or its document objects', () => {
    const docs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const moved = moveDocument(docs, 'a', 2);
    expect(moved.map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(moved[2]).toBe(docs[0]);
    expect(docs.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(moveDocument(moved, 'a', 0)).toEqual(docs);
  });
  it.each([-1, 3, 0.5, NaN, Infinity])('rejects invalid position %s', (index) => {
    const docs = [{ id: 'a' }, { id: 'b' }];
    expect(moveDocument(docs, 'a', index)).toBe(docs);
  });
  it('ignores unknown and unchanged identities', () => {
    const docs = [{ id: 'a' }];
    expect(moveDocument(docs, 'a', 0)).toBe(docs);
    expect(moveDocument(docs, 'missing', 0)).toBe(docs);
  });
  it('preserves active facade, history, viewport, file baseline and separately keyed photo', () => {
    const store = () => useWorkspaceStore.getState();
    const first = store().activeDocumentId;
    const second = store().newDocument('Second')!;
    store().commitModel({
      ...store().processModel,
      nodes: { a: { id: 'a', kind: 'task', label: 'Edited' } },
    });
    store().setCanvasViewport({ x: 25, y: 70, zoom: 0.8 });
    store().setDocumentReference(second, true);
    store().updateDocumentFile(second, {
      deviceStatus: 'saved',
      deviceFileName: 'mine.flowculus.json',
      savedContent: 'baseline',
    });
    const before = getWorkspaceDocuments(store()),
      model = store().processModel,
      revision = store().modelRevision,
      history = store().history;
    store().reorderDocument(second, 0);
    expect(store().documents.map((document) => document.id)).toEqual([second, first]);
    expect(store().processModel).toBe(model);
    expect(store().modelRevision).toBe(revision);
    expect(store().history).toBe(history);
    const after = getWorkspaceDocuments(store());
    expect(after[0]).toEqual(before[1]);
    expect(after[1]).toEqual(before[0]);
    store().switchDocument(first);
    store().switchDocument(second);
    expect(store().processModel).toBe(model);
    expect(store().canvasViewport).toEqual({ x: 25, y: 70, zoom: 0.8 });
  });
});
