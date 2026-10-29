import { MAX_OPEN_DOCUMENTS } from './document-types';

/** Browser capabilities stay outside models, JSON exports and localStorage. */
export interface WritableFile {
  write: (value: string) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
}
export interface DeviceFileHandle {
  name: string;
  getFile?: () => Promise<File>;
  createWritable: () => Promise<WritableFile>;
  queryPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
}
export interface DeviceFileBinding {
  handle: DeviceFileHandle;
  fingerprint?: string;
  contentFingerprint?: string;
}
interface PickerWindow extends Window {
  showOpenFilePicker?: (options: {
    multiple: boolean;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<DeviceFileHandle[]>;
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<DeviceFileHandle>;
}
export const MAX_DEVICE_FILE_BYTES = 50 * 1024 * 1024;
export const FLOWCULUS_FILE_TYPE = {
  description: 'Flowculus',
  accept: { 'application/json': ['.flowculus.json'] },
};
const openedFiles = new WeakMap<File, DeviceFileBinding>();
export const pickedFileBinding = (file: File) => openedFiles.get(file);
export const supportsDeviceFiles = () =>
  typeof window !== 'undefined' &&
  typeof (window as PickerWindow).showSaveFilePicker === 'function';
export const supportsDeviceOpen = () =>
  typeof window !== 'undefined' &&
  typeof (window as PickerWindow).showOpenFilePicker === 'function';

export async function fingerprintFile(file: File): Promise<string> {
  if (file.size > MAX_DEVICE_FILE_BYTES) throw new Error('file-too-large');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
export async function fingerprintText(value: string): Promise<string> {
  return fingerprintFile(new File([value], 'snapshot'));
}

export async function retainFileHandle(
  file: File,
  handle: DeviceFileHandle,
): Promise<void> {
  if (/\.flowculus\.json$/i.test(file.name))
    openedFiles.set(file, { handle, fingerprint: await fingerprintFile(file) });
}

/** Call in the click/keyboard gesture; cancelling never falls back to another picker. */
export async function openDeviceFiles(): Promise<File[]> {
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (!picker) return [];
  const handles = await picker.call(window, {
    multiple: true,
    types: [
      {
        description: 'Flowculus',
        accept: {
          'application/json': ['.flowculus.json', '.json'],
          'application/xml': ['.bpmn', '.drawio', '.xml', '.xes'],
          'text/csv': ['.csv', '.tsv'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/webp': ['.webp'],
        },
      },
    ],
  });
  if (handles.length > MAX_OPEN_DOCUMENTS) throw new Error('document-limit');
  const files: File[] = [];
  let bytes = 0;
  for (const handle of handles) {
    if (!handle.getFile) throw new Error('file-unavailable');
    const file = await handle.getFile();
    bytes += file.size;
    if (file.size > MAX_DEVICE_FILE_BYTES || bytes > 100 * 1024 * 1024)
      throw new Error('file-too-large');
    // Format conversions must never overwrite their original XML/CSV/log input.
    await retainFileHandle(file, handle);
    files.push(file);
  }
  return files;
}

export function pickSaveFile(
  suggestedName: string,
): Promise<DeviceFileHandle> | undefined {
  return (window as PickerWindow).showSaveFilePicker?.call(window, {
    suggestedName,
    types: [FLOWCULUS_FILE_TYPE],
  });
}

/** Automatic writes never display permission prompts, including after reload. */
export async function permitDeviceWrite(
  handle: DeviceFileHandle,
  automatic: boolean,
): Promise<boolean> {
  if (!handle.queryPermission) return true;
  if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  return (
    !automatic &&
    !!handle.requestPermission &&
    (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
  );
}
