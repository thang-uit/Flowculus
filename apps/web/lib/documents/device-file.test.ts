import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../workspace-store';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
import {
  createDocument,
  getWorkspaceDocuments,
  INITIAL_DOCUMENT_ID,
  isDocumentDirty,
} from './document-types';
import {
  deviceFileName,
  forgetDeviceFile,
  hasDeviceFile,
  isDeviceAutoSave,
  isValidDeviceFileName,
  saveDocumentToDevice,
  serializeDeviceDocument,
} from './device-file';

const download = vi.hoisted(() => vi.fn());
vi.mock('../browser-file-actions', () => ({ downloadTextFile: download }));
beforeEach(() => {
  vi.clearAllMocks();
  forgetDeviceFile(INITIAL_DOCUMENT_ID);
  useWorkspaceStore
    .getState()
    .restoreDocuments(
      [createDocument(INITIAL_PROCESS_MODEL, {}, INITIAL_DOCUMENT_ID)],
      INITIAL_DOCUMENT_ID,
    );
});
afterEach(() => vi.unstubAllGlobals());
const document = () => getWorkspaceDocuments(useWorkspaceStore.getState())[0]!;
const writer = () => ({
  write: vi.fn<(value: string) => Promise<void>>(async () => undefined),
  close: vi.fn(async () => undefined),
  abort: vi.fn(async () => undefined),
});

describe('device document saves', () => {
  it('portable file preserves its user-chosen name, options and current draw.io page', () => {
    const current = document();
    current.processModel = { ...current.processModel, name: 'Quy trình của tôi' };
    current.drawioSource = {
      xml: '<mxfile/>',
      pages: [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      pageIndex: 1,
    };
    const file = JSON.parse(serializeDeviceDocument(current));
    expect(file.model.name).toBe('Quy trình của tôi');
    expect(file.drawioPageIndex).toBe(1);
    expect(file.analysis).toBeUndefined();
    expect(file).not.toHaveProperty('referenceImage');
  });
  it('inferred semantics block the device path and do not invoke the picker', async () => {
    const picker = vi.fn();
    vi.stubGlobal('window', { showSaveFilePicker: picker });
    const state = useWorkspaceStore.getState();
    state.commitModel({
      ...state.processModel,
      nodes: {
        a: {
          id: 'a',
          label: 'Guess',
          kind: 'task',
          metadata: { 'flowculus-inferred-kind': true },
        },
      },
    });
    expect(await saveDocumentToDevice(INITIAL_DOCUMENT_ID)).toBe('blocked');
    expect(picker).not.toHaveBeenCalled();
    expect(document().savedContent).toBeNull();
  });
  it('picker cancellation keeps the tab dirty and does not claim it was saved', async () => {
    vi.stubGlobal('window', {
      showSaveFilePicker: async () => {
        throw new DOMException('Cancelled', 'AbortError');
      },
    });
    expect(await saveDocumentToDevice(INITIAL_DOCUMENT_ID)).toBe('cancelled');
    expect(isDocumentDirty(document())).toBe(true);
    expect(hasDeviceFile(INITIAL_DOCUMENT_ID)).toBe(false);
  });
  it('opens semantic review for the originating inactive tab on an explicit save', async () => {
    const picker = vi.fn();
    vi.stubGlobal('window', { showSaveFilePicker: picker });
    const state = useWorkspaceStore.getState();
    state.commitModel({
      ...state.processModel,
      nodes: {
        a: {
          id: 'a',
          label: 'Guess',
          kind: 'task',
          metadata: { 'flowculus-inferred-kind': true },
        },
      },
    });
    const otherId = state.newDocument('Other')!;
    expect(await saveDocumentToDevice(INITIAL_DOCUMENT_ID)).toBe('blocked');
    expect(useWorkspaceStore.getState().activeDocumentId).toBe(INITIAL_DOCUMENT_ID);
    expect(useWorkspaceStore.getState().semanticGateReason).toBe('export');
    expect(picker).not.toHaveBeenCalled();
    expect(
      useWorkspaceStore.getState().documents.some((item) => item.id === otherId),
    ).toBe(true);
  });
  it('automatic saving never interrupts the current tab for another tab review', async () => {
    const state = useWorkspaceStore.getState();
    state.commitModel({
      ...state.processModel,
      nodes: {
        a: {
          id: 'a',
          label: 'Guess',
          kind: 'task',
          metadata: { 'flowculus-inferred-kind': true },
        },
      },
    });
    const otherId = state.newDocument('Other')!;
    expect(await saveDocumentToDevice(INITIAL_DOCUMENT_ID, { automatic: true })).toBe(
      'blocked',
    );
    expect(useWorkspaceStore.getState().activeDocumentId).toBe(otherId);
    expect(useWorkspaceStore.getState().semanticGateReason).toBeNull();
  });
  it('rejects an invalid file name before opening the system picker', async () => {
    const picker = vi.fn();
    vi.stubGlobal('window', { showSaveFilePicker: picker });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(
        await saveDocumentToDevice(INITIAL_DOCUMENT_ID, { fileName: '../invalid' }),
      ).toBe('error');
      expect(picker).not.toHaveBeenCalled();
      expect(download).not.toHaveBeenCalled();
      expect(isDocumentDirty(document())).toBe(true);
    } finally {
      log.mockRestore();
    }
  });
  it('only successful writes bind auto-save; failures abort and keep the old saved baseline', async () => {
    const stream = writer();
    vi.stubGlobal('window', {
      showSaveFilePicker: async () => ({
        name: 'My process.flowculus.json',
        createWritable: async () => stream,
      }),
    });
    expect(await saveDocumentToDevice(INITIAL_DOCUMENT_ID, { autoSave: true })).toBe(
      'saved',
    );
    expect(stream.close).toHaveBeenCalledOnce();
    expect(isDeviceAutoSave(INITIAL_DOCUMENT_ID)).toBe(true);
    expect(isDocumentDirty(document())).toBe(false);
    useWorkspaceStore.getState().renameDocument(INITIAL_DOCUMENT_ID, 'Modified');
    stream.write.mockRejectedValueOnce(new Error('Disk full'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await saveDocumentToDevice(INITIAL_DOCUMENT_ID)).toBe('error');
    expect(stream.abort).toHaveBeenCalledOnce();
    expect(isDocumentDirty(document())).toBe(true);
    expect(isDeviceAutoSave(INITIAL_DOCUMENT_ID)).toBe(false);
    log.mockRestore();
  });
  it('a slow save never marks edits made during writing as saved or updates another tab', async () => {
    let finish!: () => void;
    const stream = writer();
    stream.write.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal('window', {
      showSaveFilePicker: async () => ({
        name: 'Old.flowculus.json',
        createWritable: async () => stream,
      }),
    });
    const saving = saveDocumentToDevice(INITIAL_DOCUMENT_ID);
    await vi.waitFor(() => expect(stream.write).toHaveBeenCalled());
    useWorkspaceStore.getState().renameDocument(INITIAL_DOCUMENT_ID, 'Later edit');
    const id = useWorkspaceStore.getState().newDocument('Other')!;
    finish();
    expect(await saving).toBe('saved');
    expect(
      getWorkspaceDocuments(useWorkspaceStore.getState()).every(isDocumentDirty),
    ).toBe(true);
    expect(useWorkspaceStore.getState().activeDocumentId).toBe(id);
  });
  it('fallback downloads a portable copy and never enables native automatic writes', async () => {
    vi.stubGlobal('window', {});
    expect(
      await saveDocumentToDevice(INITIAL_DOCUMENT_ID, {
        fileName: 'My name.flowculus.json',
        autoSave: true,
      }),
    ).toBe('saved');
    expect(download).toHaveBeenCalledWith(
      'My name.flowculus.json',
      expect.any(String),
      'application/json',
    );
    expect(document().deviceStatus).toBe('downloaded');
    expect(isDeviceAutoSave(INITIAL_DOCUMENT_ID)).toBe(false);
  });
  it('file name validation rejects paths, reserved names, empty stems and excessive length', () => {
    for (const value of [
      '',
      '../escape',
      'a/b',
      'a:b',
      'CON',
      'a'.repeat(121),
      '.flowculus.json',
    ])
      expect(isValidDeviceFileName(value)).toBe(false);
    expect(isValidDeviceFileName('Đơn hàng.flowculus.json')).toBe(true);
    expect(deviceFileName('Đơn hàng.flowculus.json')).toBe('Đơn hàng.flowculus.json');
  });
});
