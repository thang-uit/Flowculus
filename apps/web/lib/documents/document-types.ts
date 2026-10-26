import type { AnalysisOptions } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import type { DrawioPageSummary } from '@flowculus/drawio-adapter';

export interface DrawioSource {
  xml: string;
  pages: DrawioPageSummary[];
  pageIndex: number;
}
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export const MAX_OPEN_DOCUMENTS = 20;
export const INITIAL_DOCUMENT_ID = 'workspace-initial';
export const MAX_DOCUMENT_NAME_LENGTH = 120;

export interface DocumentContent {
  processModel: ProcessModel;
  analysisOptions: AnalysisOptions;
  drawioSource: DrawioSource | null;
}

export interface WorkspaceDocument extends DocumentContent {
  id: string;
  history: { past: ProcessModel[]; future: ProcessModel[] };
  canvasViewport: CanvasViewport | null;
  /** Exact content of the last file write/download; null means never saved. */
  savedContent: string | null;
  deviceFileName: string | null;
  hasReferenceImage: boolean;
  deviceStatus:
    'idle' | 'saving' | 'saved' | 'downloaded' | 'opened' | 'error' | 'review';
}

export interface WorkspaceDocumentsState extends DocumentContent {
  documents: WorkspaceDocument[];
  activeDocumentId: string;
  history: WorkspaceDocument['history'];
  canvasViewport: CanvasViewport | null;
}

const contentKeys = new WeakMap<
  ProcessModel,
  { options: AnalysisOptions; source: DrawioSource | null; key: string }
>();
export const documentContentKey = (content: DocumentContent): string => {
  const cached = contentKeys.get(content.processModel);
  if (
    cached?.options === content.analysisOptions &&
    cached.source === content.drawioSource
  )
    return cached.key;
  const key = JSON.stringify({
    model: content.processModel,
    analysisOptions: content.analysisOptions,
    drawioXml: content.drawioSource?.xml ?? null,
    pageIndex: content.drawioSource?.pageIndex ?? null,
  });
  contentKeys.set(content.processModel, {
    options: content.analysisOptions,
    source: content.drawioSource,
    key,
  });
  return key;
};

export const isDocumentDirty = (document: WorkspaceDocument): boolean =>
  document.savedContent === null ||
  document.savedContent !== documentContentKey(document);

export const normalizeDocumentName = (value: string): string =>
  value
    .normalize('NFC')
    .replace(/[ \u00a0]+/g, ' ')
    .trim();

export const isValidDocumentName = (value: string): boolean =>
  value.length > 0 &&
  value.length <= MAX_DOCUMENT_NAME_LENGTH &&
  !/[\u0000-\u001f\u007f]/.test(value);

export const createDocument = (
  model: ProcessModel,
  options: Partial<Pick<DocumentContent, 'analysisOptions' | 'drawioSource'>> = {},
  id = crypto.randomUUID() as string,
): WorkspaceDocument => ({
  id,
  processModel: model,
  analysisOptions: options.analysisOptions ?? {},
  drawioSource: options.drawioSource ?? null,
  history: { past: [], future: [] },
  canvasViewport: null,
  savedContent: null,
  deviceFileName: null,
  hasReferenceImage: false,
  deviceStatus: 'idle',
});

/** Active content lives in the existing canvas store; inactive tabs are snapshots. */
export const getWorkspaceDocuments = (
  state: WorkspaceDocumentsState,
): WorkspaceDocument[] =>
  state.documents.map((document) =>
    document.id === state.activeDocumentId
      ? {
          ...document,
          processModel: state.processModel,
          analysisOptions: state.analysisOptions,
          drawioSource: state.drawioSource,
          history: state.history,
          canvasViewport: state.canvasViewport,
        }
      : document,
  );
