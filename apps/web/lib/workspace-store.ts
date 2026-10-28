'use client';

import { create } from 'zustand';

import {
  analyzeProcess,
  type AnalysisOptions,
  type AnalysisReport,
} from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import { confirmSemantics, type SemanticTarget } from '@flowculus/validation';

import {
  createDocumentActions,
  type DocumentActions,
} from '@/lib/documents/document-store-actions';
import {
  createDocument,
  INITIAL_DOCUMENT_ID,
  type DrawioSource,
  type CanvasViewport,
  type WorkspaceDocument,
} from '@/lib/documents/document-types';

import { INITIAL_PROCESS_MODEL } from '@/lib/initial-process-model';

export type WorkspaceMode = 'model' | 'mining';
export type CanvasTool = 'select' | 'hand';
export type DraftStatus = 'loading' | 'saving' | 'saved' | 'error' | 'conflict';
export type AnalysisRuntimeStatus =
  'idle' | 'calculating' | 'ready' | 'fallback' | 'restarting' | 'timeout' | 'error';

export type { DrawioSource, CanvasViewport } from '@/lib/documents/document-types';

const HISTORY_LIMIT = 100;

export interface ElementReference {
  elementType: 'node' | 'edge';
  elementId: string;
}

/** A one-shot request for the canvas to bring an element into view. */
export interface FocusRequest extends ElementReference {
  nonce: number;
}

/** Why the semantic gate dialog is open (an export or a share was refused). */
export type SemanticGateReason = 'export' | 'share';

interface ModelHistory {
  past: ProcessModel[];
  future: ProcessModel[];
}

interface LoadModelOptions {
  drawioSource?: DrawioSource | null;
  analysisOptions?: AnalysisOptions;
  modelName?: string;
}

interface WorkspaceState extends DocumentActions {
  documents: WorkspaceDocument[];
  activeDocumentId: string;
  mode: WorkspaceMode;
  activeTool: CanvasTool;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  paletteOpen: boolean;
  inspectorOpen: boolean;
  analysisDockOpen: boolean;
  processModel: ProcessModel;
  /** Increments when a different model is loaded (import, page switch, mining). */
  modelRevision: number;
  history: ModelHistory;
  drawioSource: DrawioSource | null;
  canvasViewport: CanvasViewport | null;
  analysisReport: AnalysisReport;
  analysisRevision: number;
  analysisOptions: AnalysisOptions;
  draftStatus: DraftStatus;
  analysisRuntimeStatus: AnalysisRuntimeStatus;
  modelName: string;
  focusRequest: FocusRequest | null;
  semanticGateReason: SemanticGateReason | null;
  setMode: (mode: WorkspaceMode) => void;
  setActiveTool: (tool: CanvasTool) => void;
  setSelection: (selection: { nodeIds?: string[]; edgeId?: string | null }) => void;
  togglePalette: () => void;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  toggleAnalysisDock: () => void;
  /** Applies an edit; recorded in undo history unless `recordHistory` is false. */
  commitModel: (model: ProcessModel, options?: { recordHistory?: boolean }) => void;
  /** Replaces the whole model (import, draft restore) and clears history. */
  loadModel: (model: ProcessModel, options?: LoadModelOptions) => void;
  undo: () => void;
  redo: () => void;
  setCanvasViewport: (viewport: CanvasViewport) => void;
  setAnalysisReport: (report: AnalysisReport) => void;
  setAnalysisOptions: (options: AnalysisOptions) => void;
  setDraftStatus: (status: DraftStatus) => void;
  setAnalysisStatus: (status: AnalysisRuntimeStatus) => void;
  setModelName: (name: string) => void;
  /** Selects an element, opens the Inspector and asks the canvas to show it. */
  focusElement: (element: ElementReference) => void;
  /** Records a person's confirmation of inferred semantics (undoable). */
  confirmSemanticItems: (targets?: SemanticTarget[]) => void;
  setSemanticGateReason: (reason: SemanticGateReason | null) => void;
}

const isWorkerOwned = (status: AnalysisRuntimeStatus) =>
  status === 'ready' || status === 'calculating';

const pruneSelection = (
  model: ProcessModel,
  nodeIds: string[],
  edgeId: string | null,
) => ({
  selectedNodeIds: nodeIds.filter((id) => model.nodes[id] || model.containers?.[id]),
  selectedEdgeId: edgeId && model.edges[edgeId] ? edgeId : null,
});

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...createDocumentActions(set),
  documents: [createDocument(INITIAL_PROCESS_MODEL, {}, INITIAL_DOCUMENT_ID)],
  activeDocumentId: INITIAL_DOCUMENT_ID,
  mode: 'model',
  activeTool: 'select',
  selectedNodeIds: [],
  selectedEdgeId: null,
  paletteOpen: true,
  inspectorOpen: false,
  analysisDockOpen: false,
  processModel: INITIAL_PROCESS_MODEL,
  modelRevision: 0,
  history: { past: [], future: [] },
  drawioSource: null,
  canvasViewport: null,
  analysisReport: analyzeProcess(INITIAL_PROCESS_MODEL),
  analysisRevision: 0,
  analysisOptions: {},
  draftStatus: 'loading',
  analysisRuntimeStatus: 'idle',
  modelName: INITIAL_PROCESS_MODEL.name,
  focusRequest: null,
  semanticGateReason: null,
  setMode: (mode) => set({ mode }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setSelection: ({ nodeIds, edgeId }) =>
    set((state) => ({
      selectedNodeIds: nodeIds ?? state.selectedNodeIds,
      selectedEdgeId: edgeId === undefined ? state.selectedEdgeId : edgeId,
    })),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  toggleAnalysisDock: () =>
    set((state) => ({ analysisDockOpen: !state.analysisDockOpen })),
  commitModel: (model, options) =>
    set((state) => {
      if (model === state.processModel) return state;
      const recordHistory = options?.recordHistory ?? true;
      return {
        processModel: model,
        analysisRuntimeStatus: 'calculating',
        history: recordHistory
          ? {
              past: [...state.history.past, state.processModel].slice(-HISTORY_LIMIT),
              future: [],
            }
          : state.history,
        // The worker owns normal recalculation. The synchronous fallback is
        // only used before it is ready or when the browser blocks workers.
        analysisReport: isWorkerOwned(state.analysisRuntimeStatus)
          ? state.analysisReport
          : analyzeProcess(model, state.analysisOptions),
        modelName: model.name || state.modelName,
        ...pruneSelection(model, state.selectedNodeIds, state.selectedEdgeId),
      };
    }),
  loadModel: (model, options = {}) =>
    set((state) => ({
      processModel: model,
      analysisRuntimeStatus: 'calculating',
      modelRevision: state.modelRevision + 1,
      history: { past: [], future: [] },
      drawioSource:
        options.drawioSource === undefined ? state.drawioSource : options.drawioSource,
      canvasViewport: null,
      analysisOptions: options.analysisOptions ?? state.analysisOptions,
      analysisReport: isWorkerOwned(state.analysisRuntimeStatus)
        ? state.analysisReport
        : analyzeProcess(model, options.analysisOptions ?? state.analysisOptions),
      modelName: options.modelName ?? model.name ?? state.modelName,
      selectedNodeIds: [],
      selectedEdgeId: null,
    })),
  undo: () => {
    const { history, processModel } = get();
    const previous = history.past[history.past.length - 1];
    if (!previous) return;
    set((state) => ({
      processModel: previous,
      modelName: previous.name,
      analysisRuntimeStatus: 'calculating',
      history: {
        past: history.past.slice(0, -1),
        future: [processModel, ...history.future].slice(0, HISTORY_LIMIT),
      },
      ...pruneSelection(previous, state.selectedNodeIds, state.selectedEdgeId),
    }));
  },
  redo: () => {
    const { history, processModel } = get();
    const next = history.future[0];
    if (!next) return;
    set((state) => ({
      processModel: next,
      modelName: next.name,
      analysisRuntimeStatus: 'calculating',
      history: {
        past: [...history.past, processModel].slice(-HISTORY_LIMIT),
        future: history.future.slice(1),
      },
      ...pruneSelection(next, state.selectedNodeIds, state.selectedEdgeId),
    }));
  },
  setCanvasViewport: (canvasViewport) => set({ canvasViewport }),
  setAnalysisReport: (analysisReport) =>
    set((state) => ({
      analysisReport,
      analysisRevision: state.analysisRevision + 1,
    })),
  setAnalysisOptions: (analysisOptions) =>
    set((state) => ({
      analysisOptions,
      analysisRuntimeStatus: 'calculating',
      analysisReport: isWorkerOwned(state.analysisRuntimeStatus)
        ? state.analysisReport
        : analyzeProcess(state.processModel, analysisOptions),
    })),
  setDraftStatus: (draftStatus) => set({ draftStatus }),
  setAnalysisStatus: (analysisRuntimeStatus) => set({ analysisRuntimeStatus }),
  setModelName: (modelName) => {
    get().renameDocument(get().activeDocumentId, modelName);
  },
  focusElement: ({ elementType, elementId }) =>
    set((state) => {
      const exists =
        elementType === 'node'
          ? Boolean(state.processModel.nodes[elementId])
          : Boolean(state.processModel.edges[elementId]);
      if (!exists) return state;
      return {
        mode: 'model',
        inspectorOpen: true,
        selectedNodeIds: elementType === 'node' ? [elementId] : [],
        selectedEdgeId: elementType === 'edge' ? elementId : null,
        focusRequest: {
          elementType,
          elementId,
          nonce: (state.focusRequest?.nonce ?? 0) + 1,
        },
      };
    }),
  confirmSemanticItems: (targets) => {
    const { processModel, commitModel } = get();
    const confirmed = confirmSemantics(processModel, targets);
    if (confirmed !== processModel) commitModel(confirmed);
  },
  setSemanticGateReason: (semanticGateReason) => set({ semanticGateReason }),
}));
