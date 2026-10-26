import { moveDocument } from './document-order';
import { analyzeProcess } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import { INITIAL_PROCESS_MODEL } from '@/lib/initial-process-model';
import {
  createDocument,
  getWorkspaceDocuments,
  MAX_OPEN_DOCUMENTS,
  normalizeDocumentName,
  isValidDocumentName,
  type WorkspaceDocument,
  type WorkspaceDocumentsState,
} from './document-types';

export type DocumentDialog = { kind: 'rename' | 'save' | 'close'; id: string } | null;
export interface DocumentActions {
  documentDialog: DocumentDialog;
  setDocumentDialog: (dialog: DocumentDialog) => void;
  openDocument: (
    model: ProcessModel,
    options?: Parameters<typeof createDocument>[1],
  ) => string | null;
  newDocument: (name: string) => string | null;
  switchDocument: (id: string) => void;
  closeDocument: (id: string, fallbackName: string) => void;
  renameDocument: (id: string, name: string) => boolean;
  reorderDocument: (id: string, index: number) => void;
  setDocumentReference: (id: string, present: boolean) => void;
  updateDocumentFile: (
    id: string,
    patch: Partial<
      Pick<WorkspaceDocument, 'savedContent' | 'deviceFileName' | 'deviceStatus'>
    >,
  ) => void;
  restoreDocuments: (documents: WorkspaceDocument[], activeId: string) => void;
}

interface DocumentStoreState extends WorkspaceDocumentsState {
  modelRevision: number;
  documentDialog: DocumentDialog;
}

type Setter = (
  update: (state: DocumentStoreState) => Partial<DocumentStoreState>,
) => void;

const EMPTY_REPORT = analyzeProcess(INITIAL_PROCESS_MODEL);
const activate = (
  state: DocumentStoreState,
  documents: WorkspaceDocument[],
  id: string,
) => {
  const document = documents.find((item) => item.id === id);
  if (!document) return {};
  return {
    documents,
    activeDocumentId: id,
    processModel: document.processModel,
    modelName: document.processModel.name,
    history: document.history,
    analysisOptions: document.analysisOptions,
    drawioSource: document.drawioSource,
    canvasViewport: document.canvasViewport,
    modelRevision: state.modelRevision + 1,
    analysisRuntimeStatus: 'calculating' as const,
    analysisReport: EMPTY_REPORT,
    documentDialog: null,
    selectedNodeIds: [],
    selectedEdgeId: null,
    focusRequest: null,
    semanticGateReason: null,
    activeTool: 'select' as const,
  };
};

export function createDocumentActions(set: Setter): DocumentActions {
  const openDocument: DocumentActions['openDocument'] = (model, options) => {
    let id: string | null = null;
    set((state) => {
      if (state.documents.length >= MAX_OPEN_DOCUMENTS) return {};
      const document = createDocument(model, options);
      id = document.id;
      return activate(state, [...getWorkspaceDocuments(state), document], document.id);
    });
    return id;
  };
  return {
    documentDialog: null,
    setDocumentDialog: (documentDialog) => set(() => ({ documentDialog })),
    openDocument,
    newDocument: (name) =>
      openDocument({
        ...INITIAL_PROCESS_MODEL,
        id: crypto.randomUUID(),
        name,
        nodes: {},
        edges: {},
      }),
    switchDocument: (id) =>
      set((state) =>
        state.activeDocumentId === id
          ? {}
          : activate(state, getWorkspaceDocuments(state), id),
      ),
    reorderDocument: (id, index) =>
      set((state) => {
        const ordered = moveDocument(state.documents, id, index);
        if (ordered === state.documents) return {};
        const snapshots = getWorkspaceDocuments(state);
        return {
          documents: ordered.map((document) =>
            snapshots.find((snapshot) => snapshot.id === document.id)!,
          ),
        };
      }),
    closeDocument: (id, fallbackName) =>
      set((state) => {
        const all = getWorkspaceDocuments(state);
        const index = all.findIndex((document) => document.id === id);
        if (index < 0) return {};
        const remaining = all.filter((document) => document.id !== id);
        if (!remaining.length)
          remaining.push(
            createDocument({
              ...INITIAL_PROCESS_MODEL,
              id: crypto.randomUUID(),
              name: fallbackName,
              nodes: {},
              edges: {},
            }),
          );
        if (state.activeDocumentId !== id) return { documents: remaining };
        return activate(
          state,
          remaining,
          state.activeDocumentId === id
            ? remaining[Math.min(index, remaining.length - 1)]!.id
            : state.activeDocumentId,
        );
      }),
    renameDocument: (id, value) => {
      const name = normalizeDocumentName(value);
      if (!isValidDocumentName(name)) return false;
      let renamed = false;
      set((state) => {
        const all = getWorkspaceDocuments(state);
        const document = all.find((item) => item.id === id);
        if (!document) return {};
        renamed = true;
        if (document.processModel.name === name) return {};
        const model = { ...document.processModel, name };
        const documents = all.map((item) =>
          item.id === id
            ? {
                ...item,
                processModel: model,
                history: {
                  past: [...item.history.past, item.processModel].slice(-100),
                  future: [],
                },
              }
            : item,
        );
        if (state.activeDocumentId !== id) return { documents };
        return {
          documents,
          processModel: model,
          modelName: name,
          history: documents.find((item) => item.id === id)!.history,
          analysisRuntimeStatus: 'calculating' as const,
        };
      });
      return renamed;
    },
    setDocumentReference: (id, present) =>
      set((state) => {
        if (
          !state.documents.some(
            (document) => document.id === id && document.hasReferenceImage !== present,
          )
        )
          return {};
        return {
          documents: state.documents.map((document) =>
            document.id === id ? { ...document, hasReferenceImage: present } : document,
          ),
        };
      }),
    updateDocumentFile: (id, patch) =>
      set((state) => ({
        documents: state.documents.map((document) =>
          document.id === id ? { ...document, ...patch } : document,
        ),
      })),
    restoreDocuments: (documents, id) => set((state) => activate(state, documents, id)),
  };
}
