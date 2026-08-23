import { isAnalysisOptions, type AnalysisOptions } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import { validateProcessModel } from '@flowculus/validation';

const DATABASE_NAME = 'flowculus-workspace';
const DATABASE_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current';
const MAX_XML_LENGTH = 50_000_000;

export interface LocalDraftSnapshot {
  model: ProcessModel;
  drawioXml: string;
  modelName: string;
  analysisOptions?: AnalysisOptions;
  updatedAt: number;
}

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const isLocalDraftSnapshot = (value: unknown): value is LocalDraftSnapshot => {
  if (value == null || typeof value !== 'object') return false;
  const candidate = value as Partial<LocalDraftSnapshot>;
  if (
    typeof candidate.drawioXml !== 'string' ||
    candidate.drawioXml.length > MAX_XML_LENGTH ||
    typeof candidate.modelName !== 'string' ||
    typeof candidate.updatedAt !== 'number'
  ) {
    return false;
  }
  return (
    validateProcessModel(candidate.model).valid &&
    (candidate.analysisOptions == null || isAnalysisOptions(candidate.analysisOptions))
  );
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open draft storage.'));
    request.onblocked = () =>
      reject(new Error('Draft storage is blocked by another tab.'));
  });

const readIndexedDbDraft = async (): Promise<LocalDraftSnapshot | null> => {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(DRAFT_KEY);
      request.onsuccess = () => {
        resolve(isLocalDraftSnapshot(request.result) ? request.result : null);
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Could not read the local draft.'));
    });
  } finally {
    database.close();
  }
};

const writeIndexedDbDraft = async (snapshot: LocalDraftSnapshot): Promise<void> => {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(snapshot, DRAFT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not save the local draft.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('The local draft save was aborted.'));
    });
  } finally {
    database.close();
  }
};

const readFallbackDraft = (): LocalDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${DATABASE_NAME}:${DRAFT_KEY}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLocalDraftSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeFallbackDraft = (snapshot: LocalDraftSnapshot): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${DATABASE_NAME}:${DRAFT_KEY}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // Quota errors are surfaced by saveLocalDraft so the UI can explain the issue.
    throw new Error('The browser could not store the local draft.');
  }
};

export const loadLocalDraft = async (): Promise<LocalDraftSnapshot | null> => {
  if (!isBrowser()) return null;
  try {
    const indexedDbDraft = await readIndexedDbDraft();
    if (indexedDbDraft) return indexedDbDraft;
  } catch {
    // Safari private mode and embedded browsers can deny IndexedDB. Fall back below.
  }
  return readFallbackDraft();
};

export const saveLocalDraft = async (snapshot: LocalDraftSnapshot): Promise<void> => {
  if (!isBrowser()) return;
  if (!isLocalDraftSnapshot(snapshot)) {
    throw new Error('The local draft is invalid and was not saved.');
  }

  try {
    await writeIndexedDbDraft(snapshot);
  } catch {
    writeFallbackDraft(snapshot);
  }
};

export const clearLocalDraft = async (): Promise<void> => {
  if (!isBrowser()) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(DRAFT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not clear the local draft.'));
    });
    database.close();
  } catch {
    // A fallback draft may still exist when IndexedDB is unavailable.
  }

  try {
    window.localStorage.removeItem(`${DATABASE_NAME}:${DRAFT_KEY}`);
  } catch {
    // Ignore unavailable storage during cleanup.
  }
};
