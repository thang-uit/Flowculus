import type { DeviceFileBinding } from './device-file-access';

// A separate database avoids upgrading or blocking existing draft/image databases.
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () => fail(new Error('File connection storage timed out')),
      2000,
    );
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const request = window.indexedDB.open('flowculus-device-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(request.result);
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error('File connection storage blocked'));
  });

/** File handles use structured clone. Storage failure only disables reconnect after reload. */
export async function readDeviceBindings(
  ids: string[],
): Promise<Map<string, DeviceFileBinding>> {
  const result = new Map<string, DeviceFileBinding>();
  if (typeof window === 'undefined' || !window.indexedDB || !ids.length) return result;
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      for (const id of ids) {
        const request = tx.objectStore('files').get(id);
        request.onsuccess = () => {
          const value = request.result as Partial<DeviceFileBinding> | undefined;
          if (
            value?.handle &&
            typeof value.handle.getFile === 'function' &&
            typeof value.handle.createWritable === 'function' &&
            typeof value.fingerprint === 'string' &&
            /^[a-f0-9]{64}$/.test(value.fingerprint)
          )
            result.set(id, value as DeviceFileBinding);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

// Ordered writes prevent a slow bind from recreating a connection after tab closure.
let queue: Promise<void> = Promise.resolve();
export function storeDeviceBinding(
  id: string,
  binding: DeviceFileBinding | null,
): Promise<void> {
  queue = queue
    .catch(() => undefined)
    .then(async () => {
      if (typeof window === 'undefined' || !window.indexedDB) return;
      const db = await database();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('files', 'readwrite');
          if (binding) tx.objectStore('files').put(binding, id);
          else tx.objectStore('files').delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    });
  return queue;
}
