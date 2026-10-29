import { MAX_OPEN_DOCUMENTS } from './document-types';
import {
  retainFileHandle,
  MAX_DEVICE_FILE_BYTES,
  type DeviceFileHandle,
} from './device-file-access';

interface HandleDropItem extends DataTransferItem {
  getAsFileSystemHandle?: () => Promise<(DeviceFileHandle & { kind: string }) | null>;
}
/** Capture handle promises synchronously while the drop's data store is readable. */
export function droppedDeviceFiles(transfer: DataTransfer | null): Promise<File[]> {
  if (!transfer) return Promise.resolve([]);
  const files = Array.from(transfer.files);
  if (files.length > MAX_OPEN_DOCUMENTS)
    return Promise.reject(new Error('document-limit'));
  if (
    files.some((file) => file.size > MAX_DEVICE_FILE_BYTES) ||
    files.reduce((bytes, file) => bytes + file.size, 0) > 100 * 1024 * 1024
  )
    return Promise.reject(new Error('file-too-large'));
  const items = Array.from(transfer.items ?? []).filter((item) => item.kind === 'file');
  const pending = items.map((item) => {
    const file = item.getAsFile();
    let handle:
      ReturnType<NonNullable<HandleDropItem['getAsFileSystemHandle']>> | undefined;
    try {
      handle = (item as HandleDropItem).getAsFileSystemHandle?.();
    } catch {
      /* The original File still supports a normal import. */
    }
    return { file, handle };
  });
  return Promise.all(
    pending.map(async ({ file, handle }, index) => {
      if (!file || !handle) return;
      try {
        const entry = await handle;
        if (entry?.kind === 'file') await retainFileHandle(file, entry);

        if (index < files.length) files[index] = file;
      } catch {
        /* Imported content is still available when a browser denies handle access. */
      }
    }),
  ).then(() => files);
}
