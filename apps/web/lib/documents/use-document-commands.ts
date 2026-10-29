'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { subscribeDeviceAutoSave } from './device-auto-save';
import { commitPendingInput } from './pending-input';
import { getDocumentCopy } from '@/lib/i18n/document-copy';
import { showNotice } from '@/lib/ui/notice-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getWorkspaceDocuments, isDocumentDirty } from './document-types';
import { hasDeviceFile, saveDocumentToDevice } from './device-file';

export function requestDocumentSave(saveAs = false) {
  const state = useWorkspaceStore.getState();
  if (state.draftStatus === 'loading' || !commitPendingInput()) return;
  if (!saveAs && hasDeviceFile(state.activeDocumentId)) {
    void saveDocumentToDevice(state.activeDocumentId).then((result) => {
      const copy = getDocumentCopy(usePreferencesStore.getState().locale);
      if (result === 'permission' || result === 'conflict' || result === 'error')
        showNotice(copy[result], 'error');
    });
  } else state.setDocumentDialog({ kind: 'save', id: state.activeDocumentId });
}

export function createNewDocument() {
  const state = useWorkspaceStore.getState();
  if (state.draftStatus === 'loading') return;
  const locale = usePreferencesStore.getState().locale;
  const base = getWorkspaceCopy(locale).modelName;
  const names = new Set(
    getWorkspaceDocuments(state).map((document) => document.processModel.name),
  );
  let name = base;
  let suffix = 2;
  while (names.has(name)) name = `${base} ${suffix++}`;
  state.newDocument(name);
  state.setMode('model');
}

export function requestDocumentClose(id: string) {
  const state = useWorkspaceStore.getState();
  if (state.draftStatus === 'loading') return;
  const document = getWorkspaceDocuments(state).find((item) => item.id === id);
  if (!document || document.deviceStatus === 'saving') return;
  state.setDocumentDialog({ kind: 'close', id });
}

/** Global save shortcuts and a bounded, ordered auto-save for explicitly chosen files. */
export function useDocumentCommands(onOpen: () => void) {
  // Preference changes replace the open callback, but must not cancel pending writes.
  useEffect(() => subscribeDeviceAutoSave(), []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.defaultPrevented)
        return;
      const key = event.key.toLowerCase();
      if (!['s', 'o'].includes(key)) return;
      event.preventDefault();
      if (document.querySelector('[role="dialog"]')) return;
      if (key === 's') requestDocumentSave(event.shiftKey);
      else onOpen();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Device-dirty tabs already have browser drafts. Warn only when that safety net failed.
      const state = useWorkspaceStore.getState();
      if (state.draftStatus !== 'error' && state.draftStatus !== 'conflict') return;
      if (getWorkspaceDocuments(state).some(isDocumentDirty)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [onOpen]);
}
