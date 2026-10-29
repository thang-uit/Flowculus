import {
  MINING_CHECKPOINT_KEY,
  MAX_MINING_DRAFT_LENGTH,
  parseMiningDraft,
  type MiningDraft,
} from './mining-draft-schema';

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open('flowculus-mining', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Mining storage unavailable'));
    request.onblocked = () => reject(new Error('Mining storage blocked'));
  });

export function checkpointMiningDraft(draft: MiningDraft): void {
  const value = JSON.stringify(draft);
  if (value.length > MAX_MINING_DRAFT_LENGTH)
    throw new Error('Mining storage limit exceeded');
  window.localStorage.setItem(MINING_CHECKPOINT_KEY, value);
}

export async function loadMiningDraft(): Promise<MiningDraft | null> {
  let indexed: MiningDraft | null = null;
  let indexedFailed = false;
  try {
    const db = await openDatabase();
    try {
      indexed = await new Promise((resolve, reject) => {
        const request = db
          .transaction('sessions', 'readonly')
          .objectStore('sessions')
          .get('current');
        request.onsuccess = () => {
          const raw: unknown = request.result;
          const parsed = raw == null ? null : parseMiningDraft(raw);
          if (raw != null && !parsed) reject(new Error('Invalid Mining draft'));
          else resolve(parsed);
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  } catch {
    indexedFailed = true;
  }
  let checkpoint: MiningDraft | null = null;
  try {
    const raw = window.localStorage.getItem(MINING_CHECKPOINT_KEY);
    if (raw != null) {
      if (raw.length > MAX_MINING_DRAFT_LENGTH)
        throw new Error('Mining checkpoint too large');
      checkpoint = parseMiningDraft(JSON.parse(raw));
      if (!checkpoint) throw new Error('Invalid Mining checkpoint');
    }
  } catch (error) {
    if (!indexed) throw error;
  }
  if (checkpoint && (!indexed || checkpoint.updatedAt > indexed.updatedAt))
    return checkpoint;
  if (indexed) return indexed;
  if (indexedFailed && typeof window.indexedDB !== 'undefined')
    throw new Error('Mining storage unavailable');
  return null;
}

export async function saveMiningDraft(draft: MiningDraft): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').put(draft, 'current');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    checkpointMiningDraft(draft);
  }
}

/** Mining has its own writer lock and storage; acquiring it never blocks BPMN. */
export async function acquireMiningStorage(): Promise<{
  writable: boolean;
  release: () => void;
}> {
  if (!navigator.locks) return { writable: true, release: () => undefined };
  return new Promise((resolve) => {
    void navigator.locks
      .request('flowculus-mining-writer', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve({ writable: false, release: () => undefined });
          return;
        }
        await new Promise<void>((release) => resolve({ writable: true, release }));
      })
      .catch(() => resolve({ writable: false, release: () => undefined }));
  });
}
