import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../workspace-store';
import { usePreferencesStore } from '../use-preferences-store';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
import { createDocument } from './document-types';
const io = vi.hoisted(() => ({
  enabled: true,
  save: vi.fn(async () => 'saved'),
  forget: vi.fn(),
}));
vi.mock('./device-file', () => ({
  isDeviceAutoSave: () => io.enabled,
  saveDocumentToDevice: io.save,
  forgetDeviceFile: io.forget,
}));
import { subscribeDeviceAutoSave } from './device-auto-save';
let stop: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  io.enabled = true;
  useWorkspaceStore
    .getState()
    .restoreDocuments(
      [createDocument(INITIAL_PROCESS_MODEL, {}, 'auto-review')],
      'auto-review',
    );
  stop = subscribeDeviceAutoSave();
});
afterEach(() => {
  stop();
  vi.useRealTimers();
});
describe('device auto-save lifecycle', () => {
  it('keeps pending edits when the language changes before the debounce expires', async () => {
    useWorkspaceStore.getState().renameDocument('auto-review', 'A new name');
    await vi.advanceTimersByTimeAsync(400);
    usePreferencesStore.getState().setLocale('vi');
    await vi.advanceTimersByTimeAsync(500);
    expect(io.save).toHaveBeenCalledExactlyOnceWith('auto-review', { automatic: true });
  });
  it('never performs a pending write after auto-save was disabled', async () => {
    useWorkspaceStore.getState().renameDocument('auto-review', 'A new name');
    io.enabled = false;
    await vi.advanceTimersByTimeAsync(900);
    expect(io.save).not.toHaveBeenCalled();
  });
  it('cancels pending writes and forgets capabilities when the process closes', async () => {
    useWorkspaceStore.getState().renameDocument('auto-review', 'A new name');
    useWorkspaceStore.getState().closeDocument('auto-review', 'New');
    io.enabled = false;
    await vi.advanceTimersByTimeAsync(900);
    expect(io.forget).toHaveBeenCalledWith('auto-review');
    expect(io.save).not.toHaveBeenCalled();
  });
  it('debounces several edits into one write of the same originating document', async () => {
    useWorkspaceStore.getState().renameDocument('auto-review', 'First');
    await vi.advanceTimersByTimeAsync(600);
    useWorkspaceStore.getState().renameDocument('auto-review', 'Latest');
    await vi.advanceTimersByTimeAsync(600);
    expect(io.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(io.save).toHaveBeenCalledExactlyOnceWith('auto-review', { automatic: true });
  });
});
