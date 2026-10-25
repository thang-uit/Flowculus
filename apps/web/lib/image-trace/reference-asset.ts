const DATABASE = 'flowculus-reference-image';
const STORE = 'assets';
const KEY = 'current';
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 100_000_000;

export interface ReferenceAsset {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  locked: boolean;
}

const isReferenceAsset = (value: unknown): value is ReferenceAsset => {
  if (!value || typeof value !== 'object') return false;
  const asset = value as Partial<ReferenceAsset>;
  return (
    asset.blob instanceof Blob &&
    asset.blob.size > 0 &&
    asset.blob.size <= MAX_BYTES &&
    ['image/png', 'image/jpeg', 'image/webp'].includes(asset.blob.type) &&
    typeof asset.name === 'string' &&
    asset.name.length <= 255 &&
    Number.isInteger(asset.width) &&
    Number.isInteger(asset.height) &&
    asset.width! > 0 &&
    asset.height! > 0 &&
    asset.width! * asset.height! <= MAX_PIXELS &&
    Number.isFinite(asset.x) &&
    Number.isFinite(asset.y) &&
    Number.isFinite(asset.opacity) &&
    asset.opacity! >= 0.1 &&
    asset.opacity! <= 1 &&
    Number.isFinite(asset.rotation) &&
    asset.rotation! >= -180 &&
    asset.rotation! <= 180 &&
    typeof asset.locked === 'boolean'
  );
};

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Image storage unavailable.'));
  });

const transaction = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void) => void,
): Promise<T> => {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      action(tx.objectStore(STORE), resolve);
      tx.onerror = () => reject(tx.error ?? new Error('Image storage failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Image storage aborted.'));
    });
  } finally {
    database.close();
  }
};

export async function loadReferenceAsset(): Promise<ReferenceAsset | null> {
  return transaction<ReferenceAsset | null>('readonly', (store, resolve) => {
    const request = store.get(KEY);
    request.onsuccess = () => {
      const value: unknown = request.result;
      resolve(isReferenceAsset(value) ? value : null);
    };
  });
}

export async function saveReferenceAsset(asset: ReferenceAsset): Promise<void> {
  if (!isReferenceAsset(asset)) throw new Error('Invalid reference image asset.');
  await transaction<void>('readwrite', (store, resolve) => {
    store.put(asset, KEY);
    store.transaction.oncomplete = () => resolve();
  });
}

export async function deleteReferenceAsset(): Promise<void> {
  await transaction<void>('readwrite', (store, resolve) => {
    store.delete(KEY);
    store.transaction.oncomplete = () => resolve();
  });
}
