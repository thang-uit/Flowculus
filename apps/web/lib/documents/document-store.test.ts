import { beforeEach, describe, expect, it } from 'vitest';
import { requestDocumentClose } from './use-document-commands';
import { useWorkspaceStore } from '../workspace-store';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
import {
  createDocument,
  documentContentKey,
  getWorkspaceDocuments,
  INITIAL_DOCUMENT_ID,
  isDocumentDirty,
  isValidDocumentName,
  normalizeDocumentName,
} from './document-types';

beforeEach(() => {
  useWorkspaceStore.getState().setDraftStatus('saved');
  useWorkspaceStore
    .getState()
    .restoreDocuments(
      [createDocument(INITIAL_PROCESS_MODEL, {}, INITIAL_DOCUMENT_ID)],
      INITIAL_DOCUMENT_ID,
    );
});
const state = () => useWorkspaceStore.getState();
const edit = (label: string) =>
  state().commitModel({
    ...state().processModel,
    nodes: { a: { id: 'a', label, kind: 'task', durationMinutes: 10 } },
  });

describe('independent process documents', () => {
  it('new document has a unique identity, empty model, clean options and no inherited source', () => {
    state().setAnalysisOptions({ arrivalRatePerHour: 4 });
    edit('A');
    const original = state().processModel;
    const id = state().newDocument('New');
    expect(id).not.toBe(INITIAL_DOCUMENT_ID);
    expect(state().processModel.id).not.toBe(original.id);
    expect(state().processModel.nodes).toEqual({});
    expect(state().analysisOptions).toEqual({});
    expect(state().drawioSource).toBeNull();
    state().switchDocument(INITIAL_DOCUMENT_ID);
    expect(state().processModel).toBe(original);
    expect(state().analysisOptions).toEqual({ arrivalRatePerHour: 4 });
  });
  it('each document retains its undo/redo, viewport and selection is cleared on switch', () => {
    edit('A');
    state().setCanvasViewport({ x: 12, y: 20, zoom: 1.2 });
    state().setSelection({ nodeIds: ['a'] });
    const id = state().newDocument('B')!;
    edit('B');
    state().switchDocument(INITIAL_DOCUMENT_ID);
    expect(state().selectedNodeIds).toEqual([]);
    expect(state().canvasViewport?.zoom).toBe(1.2);
    state().undo();
    expect(state().processModel.nodes).toEqual({});
    state().switchDocument(id);
    expect(state().processModel.nodes.a?.label).toBe('B');
    state().undo();
    expect(state().processModel.nodes).toEqual({});
    state().switchDocument(INITIAL_DOCUMENT_ID);
    state().redo();
    expect(state().processModel.nodes.a?.label).toBe('A');
  });
  it('renaming is undoable and names stay synchronized with the model', () => {
    expect(state().renameDocument(INITIAL_DOCUMENT_ID, '  Quy trình mua hàng  ')).toBe(
      true,
    );
    expect(state().processModel.name).toBe('Quy trình mua hàng');
    state().undo();
    expect(state().modelName).toBe(INITIAL_PROCESS_MODEL.name);
    state().redo();
    expect(state().modelName).toBe('Quy trình mua hàng');
    expect(state().renameDocument(INITIAL_DOCUMENT_ID, '  ')).toBe(false);
    expect(state().renameDocument(INITIAL_DOCUMENT_ID, 'x'.repeat(121))).toBe(false);
  });
  it('a background save marks only the originating document and does not hide later changes', () => {
    edit('A');
    const beforeSave = getWorkspaceDocuments(state())[0]!;
    const id = state().newDocument('B')!;
    state().updateDocumentFile(INITIAL_DOCUMENT_ID, {
      savedContent: documentContentKey(beforeSave),
      deviceStatus: 'saved',
    });
    expect(isDocumentDirty(getWorkspaceDocuments(state())[0]!)).toBe(false);
    expect(
      isDocumentDirty(getWorkspaceDocuments(state()).find((doc) => doc.id === id)!),
    ).toBe(true);
    state().switchDocument(INITIAL_DOCUMENT_ID);
    edit('Changed while saving');
    expect(isDocumentDirty(getWorkspaceDocuments(state())[0]!)).toBe(true);
    state().undo();
    expect(isDocumentDirty(getWorkspaceDocuments(state())[0]!)).toBe(false);
  });
  it('requires confirmation before closing a file-clean tab with a separate photo', () => {
    const document = getWorkspaceDocuments(state())[0]!;
    state().updateDocumentFile(INITIAL_DOCUMENT_ID, {
      savedContent: documentContentKey(document),
      deviceStatus: 'saved',
    });
    state().setDocumentReference(INITIAL_DOCUMENT_ID, true);
    requestDocumentClose(INITIAL_DOCUMENT_ID);
    expect(state().documentDialog).toEqual({ kind: 'close', id: INITIAL_DOCUMENT_ID });
    expect(state().documents).toHaveLength(1);
  });
  it('always asks before closing an unchanged imported or device-saved process', () => {
    const document = getWorkspaceDocuments(state())[0]!;
    state().updateDocumentFile(INITIAL_DOCUMENT_ID, {
      savedContent: documentContentKey(document),
      deviceStatus: 'opened',
    });
    requestDocumentClose(INITIAL_DOCUMENT_ID);
    expect(state().documentDialog).toEqual({ kind: 'close', id: INITIAL_DOCUMENT_ID });
    expect(state().documents).toHaveLength(1);
  });
  it('does not close during a file write, storage restoration or for a missing tab', () => {
    state().setDocumentDialog(null);
    state().updateDocumentFile(INITIAL_DOCUMENT_ID, { deviceStatus: 'saving' });
    requestDocumentClose(INITIAL_DOCUMENT_ID);
    expect(state().documentDialog).toBeNull();
    state().updateDocumentFile(INITIAL_DOCUMENT_ID, { deviceStatus: 'idle' });
    state().setDraftStatus('loading');
    requestDocumentClose(INITIAL_DOCUMENT_ID);
    expect(state().documentDialog).toBeNull();
    state().setDraftStatus('saved');
    requestDocumentClose('missing');
    expect(state().documentDialog).toBeNull();
  });
  it('closing the last tab creates a fresh empty document and cannot resurrect closed content', () => {
    edit('A');
    state().closeDocument(INITIAL_DOCUMENT_ID, 'Untitled');
    expect(state().documents).toHaveLength(1);
    expect(state().activeDocumentId).not.toBe(INITIAL_DOCUMENT_ID);
    expect(state().processModel.nodes).toEqual({});
  });
  it('bounded tabs reject more documents without replacing the current one', () => {
    for (let i = 0; i < 19; i++) expect(state().newDocument(`Tab ${i}`)).toBeTruthy();
    const current = state().activeDocumentId;
    expect(state().newDocument('Too many')).toBeNull();
    expect(state().documents).toHaveLength(20);
    expect(state().activeDocumentId).toBe(current);
  });
  it('names support Vietnamese and reject empty, overlong and control-only values', () => {
    expect(isValidDocumentName(normalizeDocumentName(' Đơn  hàng '))).toBe(true);
    expect(isValidDocumentName('')).toBe(false);
    expect(isValidDocumentName('A\u0000')).toBe(false);
  });
});
