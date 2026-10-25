import { isAnalysisOptions } from '@flowculus/analysis-engine';
import { processModelSchema } from '@flowculus/validation';

import type { DrawioSource } from '@/lib/workspace-store';
import { isUntouchedLegacyStarter } from '@/lib/legacy-starter-draft';
import { LOCAL_DRAFT_VERSION, type LocalDraftSnapshot } from '@/lib/local-draft-snapshot';

export type { LocalDraftSnapshot } from '@/lib/local-draft-snapshot';

const DATABASE_NAME = 'flowculus-workspace';
const DATABASE_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current';
const MAX_XML_LENGTH = 50_000_000;

const isBrowser = (): boolean => typeof window !== 'undefined';

const isDrawioSource = (value: unknown): value is DrawioSource => {
  if (value == null || typeof value !== 'object') return false;
  const candidate = value as Partial<DrawioSource>;
  return (
    typeof candidate.xml === 'string' &&
    candidate.xml.length <= MAX_XML_LENGTH &&
    Array.isArray(candidate.pages) &&
    typeof candidate.pageIndex === 'number'
  );
};

const isLocalDraftSnapshot = (value: unknown): value is LocalDraftSnapshot => {
  if (value == null || typeof value !== 'object') return false;
  const candidate = value as Partial<LocalDraftSnapshot>;
  if (
    (candidate.draftVersion != null && candidate.draftVersion !== LOCAL_DRAFT_VERSION) ||
    typeof candidate.modelName !== 'string' ||
    typeof candidate.updatedAt !== 'number' ||
    (candidate.drawioXml != null &&
      (typeof candidate.drawioXml !== 'string' ||
        candidate.drawioXml.length > MAX_XML_LENGTH)) ||
    (candidate.drawioSource != null && !isDrawioSource(candidate.drawioSource))
  ) {
    return false;
  }
  return (
    // A draft is allowed to contain unfinished branching or inconsistent time
    // inputs. Those are analysis diagnostics, not a reason to discard work.
    processModelSchema.safeParse(candidate.model).success &&
    (candidate.analysisOptions == null || isAnalysisOptions(candidate.analysisOptions))
  );
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!isBrowser() || typeof window.indexedDB === 'undefined') {
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
        const snapshot: unknown = request.result;
        // Hydration persists the current empty workspace after skipping the
        // retired automatic starter. Edited/imported models are still restored.
        resolve(
          isLocalDraftSnapshot(snapshot) && !isUntouchedLegacyStarter(snapshot)
            ? snapshot
            : null,
        );
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
    if (!isLocalDraftSnapshot(parsed)) return null;
    if (isUntouchedLegacyStarter(parsed)) {
      window.localStorage.removeItem(`${DATABASE_NAME}:${DRAFT_KEY}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeFallbackDraft = (snapshot: LocalDraftSnapshot): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${DATABASE_NAME}:${DRAFT_KEY}`,
      JSON.stringify({ ...snapshot, draftVersion: LOCAL_DRAFT_VERSION }),
    );
  } catch {
    // Quota errors are surfaced by saveLocalDraft so the UI can explain the issue.
    throw new Error('The browser could not store the local draft.');
  }
};

export const loadLocalDraft = async (): Promise<LocalDraftSnapshot | null> => {
  if (!isBrowser()) return null;
  let indexedDbDraft: LocalDraftSnapshot | null = null;
  try {
    indexedDbDraft = await readIndexedDbDraft();
  } catch {
    // Safari private mode and embedded browsers can deny IndexedDB. Fall back below.
  }
  const fallbackDraft = readFallbackDraft();
  if (!fallbackDraft) return indexedDbDraft;
  if (!indexedDbDraft) return fallbackDraft;
  return fallbackDraft.updatedAt > indexedDbDraft.updatedAt
    ? fallbackDraft
    : indexedDbDraft;
};

/** A synchronous best-effort checkpoint for the browser's pagehide boundary. */
export const checkpointLocalDraft = (snapshot: LocalDraftSnapshot): void => {
  if (!isBrowser() || !isLocalDraftSnapshot(snapshot)) return;
  writeFallbackDraft(snapshot);
};

export const saveLocalDraft = async (snapshot: LocalDraftSnapshot): Promise<void> => {
  if (!isBrowser()) return;
  if (!isLocalDraftSnapshot(snapshot)) {
    throw new Error('The local draft is invalid and was not saved.');
  }

  try {
    await writeIndexedDbDraft({ ...snapshot, draftVersion: LOCAL_DRAFT_VERSION });
  } catch {
    writeFallbackDraft(snapshot);
  }
};
