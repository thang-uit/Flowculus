'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { checkSemanticGate } from '@flowculus/validation';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getWorkspaceDocuments, isDocumentDirty } from './document-types';
import {
  forgetDeviceFile,
  hasDeviceFile,
  isDeviceAutoSave,
  saveDocumentToDevice,
} from './device-file';

export function requestDocumentSave(saveAs = false) {
  const state = useWorkspaceStore.getState();
  if (state.draftStatus === 'loading') return;
  if (!saveAs && hasDeviceFile(state.activeDocumentId)) {
    void saveDocumentToDevice(state.activeDocumentId);
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
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const stop = useWorkspaceStore.subscribe((state, previous) => {
      const open = new Set(state.documents.map((document) => document.id));
      for (const document of previous.documents)
        if (!open.has(document.id)) {
          forgetDeviceFile(document.id);
          clearTimeout(timers.get(document.id));
          timers.delete(document.id);
        }
      if (
        state.processModel === previous.processModel &&
        state.analysisOptions === previous.analysisOptions &&
        state.drawioSource === previous.drawioSource &&
        state.documents === previous.documents
      )
        return;
      for (const document of getWorkspaceDocuments(state)) {
        clearTimeout(timers.get(document.id));
        timers.delete(document.id);
        if (
          !isDeviceAutoSave(document.id) ||
          !isDocumentDirty(document) ||
          document.deviceStatus === 'saving' ||
          (document.deviceStatus === 'review' &&
            !checkSemanticGate(document.processModel).ok)
        )
          continue;
        timers.set(
          document.id,
          setTimeout(() => {
            timers.delete(document.id);
            void saveDocumentToDevice(document.id, { automatic: true });
          }, 900),
        );
      }
    });
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
      stop();
      for (const timer of timers.values()) clearTimeout(timer);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [onOpen]);
}
