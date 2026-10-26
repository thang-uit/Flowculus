import { isAnalysisOptions } from '@flowculus/analysis-engine';
import { processModelSchema } from '@flowculus/validation';
import { migrateLegacyDocument } from './migrate-legacy-document';
import { loadLocalDraft } from '@/lib/local-draft';
import {
  INITIAL_DOCUMENT_ID,
  MAX_OPEN_DOCUMENTS,
  type WorkspaceDocument,
} from './document-types';

const KEY = 'flowculus-workspace:documents-v1';
const MAX_SESSION_LENGTH = 100_000_000;
export interface WorkspaceSession {
  version: 1;
  activeDocumentId: string;
  documents: WorkspaceDocument[];
  updatedAt: number;
}

const validDocument = (value: unknown): value is WorkspaceDocument => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<WorkspaceDocument>;
  const source = item.drawioSource;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= 200 &&
    processModelSchema.safeParse(item.processModel).success &&
    isAnalysisOptions(item.analysisOptions) &&
    (source === null ||
      (source != null &&
        typeof source.xml === 'string' &&
        source.xml.length <= 50_000_000 &&
        Array.isArray(source.pages) &&
        source.pages.every(
          (page) =>
            page != null &&
            typeof page === 'object' &&
            typeof page.id === 'string' &&
            typeof page.name === 'string',
        ) &&
        Number.isInteger(source.pageIndex) &&
        source.pageIndex >= 0 &&
        source.pageIndex < source.pages.length)) &&
    (item.savedContent === null || typeof item.savedContent === 'string') &&
    (item.deviceFileName === null || typeof item.deviceFileName === 'string') &&
    (item.canvasViewport === null ||
      (item.canvasViewport != null &&
        Number.isFinite(item.canvasViewport.x) &&
        Number.isFinite(item.canvasViewport.y) &&
        Number.isFinite(item.canvasViewport.zoom) &&
        item.canvasViewport.zoom > 0))
  );
};

export const parseWorkspaceSession = (value: unknown): WorkspaceSession | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<WorkspaceSession>;
  if (
    candidate.version !== 1 ||
    !Number.isFinite(candidate.updatedAt) ||
    !Array.isArray(candidate.documents) ||
    candidate.documents.length < 1 ||
    candidate.documents.length > MAX_OPEN_DOCUMENTS ||
    !candidate.documents.every(validDocument) ||
    new Set(candidate.documents.map((document) => document.id)).size !==
      candidate.documents.length ||
    !candidate.documents.some((document) => document.id === candidate.activeDocumentId)
  )
    return null;
  return {
    version: 1,
    updatedAt: candidate.updatedAt!,
    activeDocumentId: candidate.activeDocumentId!,
    documents: candidate.documents.map((document) => ({
      ...document,
      hasReferenceImage: document.hasReferenceImage === true,
      history: { past: [], future: [] },
      // A restored tab needs a new user gesture to reconnect a device file.
      deviceStatus: ['saved', 'downloaded', 'opened'].includes(document.deviceStatus)
        ? document.deviceStatus
        : 'idle',
    })),
  };
};

const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open('flowculus-workspace', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('drafts'))
        request.result.createObjectStore('drafts');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Storage unavailable'));
    request.onblocked = () => reject(new Error('Storage blocked'));
  });

async function readIndexed(): Promise<WorkspaceSession | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('drafts', 'readonly').objectStore('drafts').get(KEY);
      request.onsuccess = () => resolve(parseWorkspaceSession(request.result));
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadWorkspaceSession(): Promise<WorkspaceSession | null> {
  let indexed: WorkspaceSession | null = null;
  try {
    indexed = await readIndexed();
  } catch {
    /* localStorage is the fallback. */
  }
  let checkpoint: WorkspaceSession | null = null;
  try {
    checkpoint = parseWorkspaceSession(
      JSON.parse(window.localStorage.getItem(KEY) ?? 'null'),
    );
  } catch {
    /* Storage can be unavailable or hold an interrupted legacy write. */
  }
  const session =
    checkpoint && (!indexed || checkpoint.updatedAt > indexed.updatedAt)
      ? checkpoint
      : indexed;
  if (session) return session;
  const legacy = await loadLocalDraft();
  if (!legacy) return null;
  return {
    version: 1,
    activeDocumentId: INITIAL_DOCUMENT_ID,
    updatedAt: legacy.updatedAt,
    documents: [await migrateLegacyDocument(legacy)],
  };
}

export function checkpointWorkspaceSession(session: WorkspaceSession): void {
  if (!parseWorkspaceSession(session)) throw new Error('Invalid workspace session');
  // Undo history is intentionally memory-only; persisting it multiplies model size.
  const value = JSON.stringify({
    ...session,
    documents: session.documents.map((document) => ({
      ...document,
      history: { past: [], future: [] },
    })),
  });
  if (value.length > MAX_SESSION_LENGTH)
    throw new Error('Workspace storage limit exceeded');
  window.localStorage.setItem(KEY, value);
}

export async function saveWorkspaceSession(session: WorkspaceSession): Promise<void> {
  if (!parseWorkspaceSession(session)) throw new Error('Invalid workspace session');
  try {
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        tx.objectStore('drafts').put(
          {
            ...session,
            documents: session.documents.map((document) => ({
              ...document,
              history: { past: [], future: [] },
            })),
          },
          KEY,
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    checkpointWorkspaceSession(session);
  }
}
