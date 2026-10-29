import { checkSemanticGate } from '@flowculus/validation';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { getWorkspaceDocuments, isDocumentDirty } from './document-types';
import { forgetDeviceFile, isDeviceAutoSave, saveDocumentToDevice } from './device-file';

/** Timers belong to this subscription; disabling or closing a file cancels pending work. */
export function subscribeDeviceAutoSave(): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const stop = useWorkspaceStore.subscribe((state, previous) => {
    const open = new Set(state.documents.map((document) => document.id));
    for (const document of previous.documents) {
      if (open.has(document.id)) continue;
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
          // Permission/conflict failures and explicit toggles can disable this after scheduling.
          if (isDeviceAutoSave(document.id))
            void saveDocumentToDevice(document.id, { automatic: true });
        }, 900),
      );
    }
  });
  return () => {
    stop();
    for (const timer of timers.values()) clearTimeout(timer);
  };
}
