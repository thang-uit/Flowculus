'use client';

import { create } from 'zustand';

import type { AnalysisOptions, AnalysisReport } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

import type { Locale } from '@/lib/i18n';
import { INITIAL_PROCESS_MODEL } from '@/lib/initial-process-model';
import { INITIAL_DRAWIO_XML } from '@/lib/initial-drawio';
import { analyzeProcess } from '@flowculus/analysis-engine';
export type { SemanticShapeTool } from '@/lib/shape-tools';

export type WorkspaceTool =
  | 'select'
  | 'hand'
  | 'task'
  | 'xor'
  | 'and'
  | 'or'
  | 'eventBased'
  | 'complex'
  | 'start'
  | 'end'
  | 'event'
  | 'subprocess'
  | 'data'
  | 'annotation'
  | 'rework';

export type DrawioStatus = 'loading' | 'ready' | 'saving' | 'error';
export type DraftStatus = 'loading' | 'saving' | 'saved' | 'error';
export type AnalysisRuntimeStatus =
  'idle' | 'calculating' | 'ready' | 'fallback' | 'error';

export interface WorkspacePage {
  id: string;
  name: string;
}

interface WorkspaceState {
  activeTool: WorkspaceTool;
  selectedNodeId: string | null;
  zoom: number;
  paletteOpen: boolean;
  inspectorOpen: boolean;
  analysisDockOpen: boolean;
  locale: Locale;
  processModel: ProcessModel;
  currentXml: string;
  analysisReport: AnalysisReport;
  analysisRevision: number;
  analysisOptions: AnalysisOptions;
  drawioStatus: DrawioStatus;
  draftStatus: DraftStatus;
  analysisRuntimeStatus: AnalysisRuntimeStatus;
  modelName: string;
  /** Current draw.io page index (0-based). -1 = unknown. */
  currentPageIndex: number;
  /** All pages in the current draw.io file. Empty = single-page or not yet loaded. */
  pages: WorkspacePage[];
  setActiveTool: (tool: WorkspaceTool) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setZoom: (zoom: number) => void;
  togglePalette: () => void;
  toggleInspector: () => void;
  toggleAnalysisDock: () => void;
  setLocale: (locale: Locale) => void;
  setProcessModel: (model: ProcessModel) => void;
  setCurrentXml: (xml: string) => void;
  setAnalysisReport: (report: AnalysisReport) => void;
  setAnalysisOptions: (options: AnalysisOptions) => void;
  setDrawioStatus: (status: DrawioStatus) => void;
  setDraftStatus: (status: DraftStatus) => void;
  setAnalysisStatus: (status: AnalysisRuntimeStatus) => void;
  setModelName: (name: string) => void;
  setCurrentPageIndex: (index: number) => void;
  setPages: (pages: WorkspacePage[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeTool: 'select',
  selectedNodeId: 'review',
  zoom: 1,
  paletteOpen: true,
  inspectorOpen: false,
  analysisDockOpen: false,
  locale: 'en',
  processModel: INITIAL_PROCESS_MODEL,
  currentXml: INITIAL_DRAWIO_XML,
  analysisReport: analyzeProcess(INITIAL_PROCESS_MODEL),
  analysisRevision: 0,
  analysisOptions: {},
  drawioStatus: 'loading',
  draftStatus: 'loading',
  analysisRuntimeStatus: 'idle',
  modelName: INITIAL_PROCESS_MODEL.name,
  currentPageIndex: -1,
  pages: [],
  setActiveTool: (activeTool) => set({ activeTool }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setZoom: (zoom) => set({ zoom: Math.min(1.25, Math.max(0.7, zoom)) }),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  toggleAnalysisDock: () =>
    set((state) => ({ analysisDockOpen: !state.analysisDockOpen })),
  setLocale: (locale) => set({ locale }),
  setProcessModel: (processModel) =>
    set((state) => ({
      processModel,
      // A worker owns normal recalculation. Keep a synchronous fallback for
      // browsers that block module workers and for the first hydration frame.
      analysisReport:
        state.analysisRuntimeStatus === 'ready' ||
        state.analysisRuntimeStatus === 'calculating'
          ? state.analysisReport
          : analyzeProcess(processModel, state.analysisOptions),
      modelName: processModel.name || state.modelName,
      selectedNodeId: processModel.nodes[state.selectedNodeId ?? '']
        ? state.selectedNodeId
        : (Object.values(processModel.nodes).find((node) => node.kind === 'gateway')
            ?.id ??
          Object.keys(processModel.nodes)[0] ??
          null),
    })),
  setCurrentXml: (currentXml) => set({ currentXml }),
  setAnalysisReport: (analysisReport) =>
    set((state) => ({
      analysisReport,
      analysisRevision: state.analysisRevision + 1,
    })),
  setAnalysisOptions: (analysisOptions) =>
    set((state) => ({
      analysisOptions,
      analysisReport:
        state.analysisRuntimeStatus === 'ready' ||
        state.analysisRuntimeStatus === 'calculating'
          ? state.analysisReport
          : analyzeProcess(state.processModel, analysisOptions),
    })),
  setDrawioStatus: (drawioStatus) => set({ drawioStatus }),
  setDraftStatus: (draftStatus) => set({ draftStatus }),
  setAnalysisStatus: (analysisRuntimeStatus) => set({ analysisRuntimeStatus }),
  setModelName: (modelName) => set({ modelName }),
  setCurrentPageIndex: (currentPageIndex) => set({ currentPageIndex }),
  setPages: (pages) => set({ pages }),
}));
