import { serializeFlowculusFile } from '@flowculus/file-formats';
import { assertConfirmedModel, checkSemanticGate } from '@flowculus/validation';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { safeFileStem } from '@/lib/file-name';
import { useWorkspaceStore } from '@/lib/workspace-store';
import {
  documentContentKey,
  getWorkspaceDocuments,
  type WorkspaceDocument,
} from './document-types';

interface WritableFile {
  write: (value: string) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
}
export interface DeviceFileHandle {
  name: string;
  createWritable: () => Promise<WritableFile>;
}
interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<DeviceFileHandle>;
}
const handles = new Map<string, DeviceFileHandle>();
const automatic = new Set<string>();
const running = new Set<string>();

export const supportsDeviceFiles = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as SavePickerWindow).showSaveFilePicker === 'function';
export const hasDeviceFile = (id: string) => handles.has(id);
export const isDeviceAutoSave = (id: string) => automatic.has(id);
export const setDeviceAutoSave = (id: string, enabled: boolean) => {
  if (enabled && handles.has(id)) automatic.add(id);
  else automatic.delete(id);
};
export const forgetDeviceFile = (id: string) => {
  handles.delete(id);
  automatic.delete(id);
};

export const deviceFileName = (name: string): string =>
  `${safeFileStem(name.replace(/\.flowculus\.json$/i, ''))}.flowculus.json`;
export const isValidDeviceFileName = (name: string): boolean => {
  const stem = name.replace(/\.flowculus\.json$/i, '');
  return stem.length > 0 && stem.length <= 120 && safeFileStem(stem) === stem;
};

export function serializeDeviceDocument(document: WorkspaceDocument): string {
  const gate = checkSemanticGate(document.processModel);
  if (!gate.ok) throw new Error('semantic-review-required');
  assertConfirmedModel(gate.model);
  return serializeFlowculusFile({
    schemaVersion: 1,
    model: gate.model,
    analysisOptions: document.analysisOptions,
    ...(document.drawioSource
      ? {
          drawioXml: document.drawioSource.xml,
          drawioPageIndex: document.drawioSource.pageIndex,
        }
      : {}),
  });
}

export type DeviceSaveResult = 'saved' | 'cancelled' | 'blocked' | 'error' | 'busy';
/** Capture the originating tab; picker cancellation/failure never marks it saved. */
export async function saveDocumentToDevice(
  id: string,
  options: {
    fileName?: string;
    saveAs?: boolean;
    autoSave?: boolean;
    automatic?: boolean;
  } = {},
): Promise<DeviceSaveResult> {
  if (running.has(id)) return 'busy';
  const state = useWorkspaceStore.getState();
  const document = getWorkspaceDocuments(state).find((item) => item.id === id);
  if (!document) return 'cancelled';
  const gate = checkSemanticGate(document.processModel);
  if (!gate.ok) {
    state.updateDocumentFile(id, { deviceStatus: 'review' });
    if (!options.automatic) {
      // A close-and-save action can originate from an inactive tab.
      state.switchDocument(id);
      useWorkspaceStore.getState().setSemanticGateReason('export');
    }
    return 'blocked';
  }
  running.add(id);
  state.updateDocumentFile(id, { deviceStatus: 'saving' });
  try {
    if (options.fileName && !isValidDeviceFileName(options.fileName))
      throw new Error('invalid-file-name');
    // Invoke picker before any async work so browser user activation is retained.
    let handle = options.saveAs ? undefined : handles.get(id);
    const picker = (window as SavePickerWindow).showSaveFilePicker;
    if (!handle && options.automatic) {
      state.updateDocumentFile(id, { deviceStatus: document.deviceStatus });
      return 'cancelled';
    }
    if (!handle && picker)
      handle = await picker.call(window, {
        suggestedName: options.fileName ?? deviceFileName(document.processModel.name),
        types: [
          {
            description: 'Flowculus',
            accept: { 'application/json': ['.flowculus.json'] },
          },
        ],
      });
    const value = serializeDeviceDocument(document);
    if (new Blob([value]).size > 50 * 1024 * 1024) throw new Error('file-too-large');
    if (handle) {
      const writer = await handle.createWritable();
      try {
        await writer.write(value);
        await writer.close();
      } catch (error) {
        try {
          await writer.abort();
        } catch {
          /* Original write failure is retained. */
        }
        throw error;
      }
      handles.set(id, handle);
      if (options.autoSave !== undefined) setDeviceAutoSave(id, options.autoSave);
    } else
      downloadTextFile(
        options.fileName ?? deviceFileName(document.processModel.name),
        value,
        'application/json',
      );
    useWorkspaceStore.getState().updateDocumentFile(id, {
      savedContent: documentContentKey(document),
      deviceFileName:
        handle?.name ?? options.fileName ?? deviceFileName(document.processModel.name),
      deviceStatus: handle ? 'saved' : 'downloaded',
    });
    return 'saved';
  } catch (error) {
    const cancelled = error instanceof DOMException && error.name === 'AbortError';
    useWorkspaceStore.getState().updateDocumentFile(id, {
      deviceStatus: cancelled ? document.deviceStatus : 'error',
    });
    if (!cancelled) {
      automatic.delete(id);
      console.error('Flowculus device save failed', error);
    }
    return cancelled ? 'cancelled' : 'error';
  } finally {
    running.delete(id);
  }
}
