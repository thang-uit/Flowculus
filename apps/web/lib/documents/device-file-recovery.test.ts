import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeDeviceAutoSave } from './device-auto-save';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
import { useWorkspaceStore } from '../workspace-store';
import { createDocument, getWorkspaceDocuments, isDocumentDirty } from './document-types';
import { bindDeviceFile } from './device-file-bindings';
import { fingerprintText, type DeviceFileHandle } from './device-file-access';
import {
  forgetDeviceFile,
  hasDeviceFile,
  isDeviceAutoSave,
  saveDocumentToDevice,
  setDeviceAutoSave,
} from './device-file';

const id = 'file-recovery-test';
const current = () =>
  getWorkspaceDocuments(useWorkspaceStore.getState()).find((d) => d.id === id)!;
function diskFile() {
  let contents = '{}';
  const stream = {
    write: vi.fn(async (text: string) => {
      contents = text;
    }),
    close: vi.fn(async () => undefined),
    abort: vi.fn(async () => undefined),
  };
  const handle: DeviceFileHandle = {
    name: 'TestBPMN1.flowculus.json',
    getFile: vi.fn(async () => new File([contents], 'TestBPMN1.flowculus.json')),
    createWritable: vi.fn(async () => stream),
    queryPermission: vi.fn(async () => 'granted' as const),
  };
  return {
    handle,
    stream,
    externalEdit: (text: string) => {
      contents = text;
    },
    contents: () => contents,
  };
}
beforeEach(() => {
  useWorkspaceStore
    .getState()
    .restoreDocuments([createDocument(INITIAL_PROCESS_MODEL, {}, id)], id);
});
afterEach(() => {
  forgetDeviceFile(id);
  vi.unstubAllGlobals();
});

describe('connected device files', () => {
  it('Ctrl+S reuses the opened file handle, keeps its exact name and updates the saved baseline', async () => {
    const disk = diskFile();
    const picker = vi.fn();
    vi.stubGlobal('window', { showSaveFilePicker: picker });
    bindDeviceFile(id, {
      handle: disk.handle,
      fingerprint: await fingerprintText(disk.contents()),
    });
    useWorkspaceStore.getState().renameDocument(id, 'A different process name');
    expect(await saveDocumentToDevice(id)).toBe('saved');
    expect(picker).not.toHaveBeenCalled();
    expect(current().deviceFileName).toBe('TestBPMN1.flowculus.json');
    expect(JSON.parse(disk.contents()).model.name).toBe('A different process name');
    expect(isDocumentDirty(current())).toBe(false);
    useWorkspaceStore.getState().renameDocument(id, 'Second edit');
    expect(await saveDocumentToDevice(id)).toBe('saved');
    expect(disk.stream.close).toHaveBeenCalledTimes(2);
  });
  it('detects an externally changed file and does not overwrite or mark the drawing saved', async () => {
    const disk = diskFile();
    bindDeviceFile(id, {
      handle: disk.handle,
      fingerprint: await fingerprintText(disk.contents()),
    });
    setDeviceAutoSave(id, true);
    disk.externalEdit('{"external":true}');
    expect(await saveDocumentToDevice(id, { automatic: true })).toBe('conflict');
    expect(disk.handle.createWritable).not.toHaveBeenCalled();
    expect(current().deviceStatus).toBe('conflict');
    expect(isDeviceAutoSave(id)).toBe(false);
    expect(isDocumentDirty(current())).toBe(true);
  });
  it('prompts only on explicit saves and retains edits when write permission is denied', async () => {
    const disk = diskFile();
    const request = vi.fn(async () => 'denied' as const);
    disk.handle.queryPermission = async () => 'prompt';
    disk.handle.requestPermission = request;
    bindDeviceFile(id, {
      handle: disk.handle,
      fingerprint: await fingerprintText(disk.contents()),
    });
    expect(await saveDocumentToDevice(id, { automatic: true })).toBe('permission');
    expect(request).not.toHaveBeenCalled();
    expect(await saveDocumentToDevice(id)).toBe('permission');
    expect(request).toHaveBeenCalledOnce();
    expect(disk.handle.createWritable).not.toHaveBeenCalled();
    expect(isDocumentDirty(current())).toBe(true);
  });
  it('Save As cancellation preserves the original connection and automatic setting', async () => {
    const disk = diskFile();
    bindDeviceFile(id, {
      handle: disk.handle,
      fingerprint: await fingerprintText(disk.contents()),
    });
    setDeviceAutoSave(id, true);
    vi.stubGlobal('window', {
      showSaveFilePicker: async () => {
        throw new DOMException('Cancel', 'AbortError');
      },
    });
    expect(await saveDocumentToDevice(id, { saveAs: true })).toBe('cancelled');
    expect(hasDeviceFile(id)).toBe(true);
    expect(isDeviceAutoSave(id)).toBe(true);
    expect(await saveDocumentToDevice(id)).toBe('saved');
  });
  it('Save As switches subsequent writes to the newly chosen file only', async () => {
    const original = diskFile();
    const next = diskFile();
    next.handle.name = 'Another.flowculus.json';
    bindDeviceFile(id, {
      handle: original.handle,
      fingerprint: await fingerprintText(original.contents()),
    });
    vi.stubGlobal('window', { showSaveFilePicker: async () => next.handle });
    expect(await saveDocumentToDevice(id, { saveAs: true })).toBe('saved');
    expect(original.handle.createWritable).not.toHaveBeenCalled();
    useWorkspaceStore.getState().renameDocument(id, 'Later');
    expect(await saveDocumentToDevice(id)).toBe('saved');
    expect(next.stream.write).toHaveBeenCalledTimes(2);
  });
  it('does not write or resurrect a document closed while permission was pending', async () => {
    const disk = diskFile();
    let grant!: (p: PermissionState) => void;
    disk.handle.queryPermission = () =>
      new Promise((resolve) => {
        grant = resolve;
      });
    bindDeviceFile(id, { handle: disk.handle });
    const save = saveDocumentToDevice(id);
    useWorkspaceStore.getState().closeDocument(id, 'New');
    forgetDeviceFile(id);
    grant('granted');
    expect(await save).toBe('cancelled');
    expect(disk.handle.createWritable).not.toHaveBeenCalled();
    expect(hasDeviceFile(id)).toBe(false);
  });
  it('does not let simultaneous saves of two tabs silently overwrite the same file', async () => {
    const disk = diskFile();
    const fingerprint = await fingerprintText(disk.contents());
    const other = useWorkspaceStore.getState().newDocument('Another tab')!;
    bindDeviceFile(id, { handle: disk.handle, fingerprint });
    bindDeviceFile(other, { handle: disk.handle, fingerprint });
    expect(await saveDocumentToDevice(id)).toBe('saved');
    expect(await saveDocumentToDevice(other)).toBe('conflict');
    forgetDeviceFile(other);
  });
  it('does not retry a failed background write from the queued error-state update', async () => {
    vi.useFakeTimers();
    const disk = diskFile();
    disk.stream.write.mockRejectedValueOnce(new Error('Disk full'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    bindDeviceFile(id, {
      handle: disk.handle,
      fingerprint: await fingerprintText(disk.contents()),
    });
    setDeviceAutoSave(id, true);
    const stop = subscribeDeviceAutoSave();
    try {
      useWorkspaceStore.getState().renameDocument(id, 'Pending save');
      await vi.advanceTimersByTimeAsync(900);
      await vi.waitFor(() => expect(current().deviceStatus).toBe('error'));
      await vi.advanceTimersByTimeAsync(3000);
      expect(disk.stream.write).toHaveBeenCalledOnce();
      expect(current().deviceStatus).toBe('error');
      expect(isDeviceAutoSave(id)).toBe(false);
    } finally {
      stop();
      log.mockRestore();
      vi.useRealTimers();
    }
  });
});
