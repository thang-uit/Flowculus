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

import {
  fingerprintFile,
  fingerprintText,
  permitDeviceWrite,
  pickSaveFile,
  MAX_DEVICE_FILE_BYTES,
} from './device-file-access';
import {
  bindDeviceFile,
  getDeviceBinding,
  setDeviceAutoSave,
} from './device-file-bindings';
export { supportsDeviceFiles } from './device-file-access';
export type { DeviceFileHandle } from './device-file-access';
export {
  hasDeviceFile,
  isDeviceAutoSave,
  setDeviceAutoSave,
  forgetDeviceFile,
} from './device-file-bindings';
const running = new Set<string>();

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

export type DeviceSaveResult =
  'saved' | 'cancelled' | 'blocked' | 'error' | 'busy' | 'permission' | 'conflict';
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
    // Invoke picker before async work so browser user activation is retained.
    const binding = options.saveAs ? undefined : getDeviceBinding(id);
    let handle = binding?.handle;
    if (!handle && options.automatic) {
      state.updateDocumentFile(id, { deviceStatus: document.deviceStatus });
      return 'cancelled';
    }
    if (!handle)
      handle = await pickSaveFile(
        options.fileName ?? deviceFileName(document.processModel.name),
      );
    if (handle && !(await permitDeviceWrite(handle, !!options.automatic))) {
      setDeviceAutoSave(id, false);
      state.updateDocumentFile(id, { deviceStatus: 'permission' });
      return 'permission';
    }
    const value = serializeDeviceDocument(document);
    if (new Blob([value]).size > MAX_DEVICE_FILE_BYTES) throw new Error('file-too-large');
    // Closing a tab while a permission dialog was open must not write its file.
    if (!useWorkspaceStore.getState().documents.some((item) => item.id === id))
      return 'cancelled';
    if (handle) {
      const target = handle;
      const fingerprint = await fingerprintText(value);
      const contentFingerprint = await fingerprintText(documentContentKey(document));
      const write = async () => {
        if (!useWorkspaceStore.getState().documents.some((item) => item.id === id))
          throw new DOMException('Closed document', 'AbortError');
        if (
          binding?.fingerprint &&
          target.getFile &&
          (await fingerprintFile(await target.getFile())) !== binding.fingerprint
        )
          throw new Error('device-file-changed');
        const writer = await target.createWritable();
        try {
          await writer.write(value);
          await writer.close();
        } catch (error) {
          try {
            await writer.abort();
          } catch {
            /* Retain the write failure. */
          }
          throw error;
        }
        if (useWorkspaceStore.getState().documents.some((item) => item.id === id)) {
          bindDeviceFile(id, {
            handle: target,
            fingerprint,
            contentFingerprint,
          });
          if (options.autoSave !== undefined) setDeviceAutoSave(id, options.autoSave);
        }
      };
      // Serialize same-named device writes across editor windows when supported.
      if (typeof navigator !== 'undefined' && navigator.locks)
        await navigator.locks.request(
          `flowculus-device:${target.name}`,
          { signal: AbortSignal.timeout(15_000) },
          write,
        );
      else await write();
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
    const name = error instanceof Error ? error.name : '';
    const cancelled = name === 'AbortError';
    const failure =
      error instanceof Error && error.message === 'device-file-changed'
        ? 'conflict'
        : ['NotAllowedError', 'SecurityError'].includes(name)
          ? 'permission'
          : 'error';
    if (!cancelled) setDeviceAutoSave(id, false);
    useWorkspaceStore.getState().updateDocumentFile(id, {
      deviceStatus: cancelled ? document.deviceStatus : failure,
    });
    if (!cancelled) {
      if (failure === 'error') console.error('Flowculus device save failed', error);
    }
    return cancelled ? 'cancelled' : failure;
  } finally {
    running.delete(id);
  }
}
