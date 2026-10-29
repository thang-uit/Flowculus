'use client';

import { useEffect } from 'react';
import { restoreDeviceBindings } from '@/lib/documents/device-file-bindings';
import { acquireWorkspaceStorage } from '@/lib/documents/workspace-storage-owner';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { getWorkspaceDocuments } from '@/lib/documents/document-types';
import {
  checkpointWorkspaceSession,
  loadWorkspaceSession,
  saveWorkspaceSession,
  type WorkspaceSession,
} from '@/lib/documents/workspace-session-storage';

/** One ordered persistence queue across mounts; a slow write cannot beat a newer save. */
let saveQueue: Promise<void> = Promise.resolve();
const SAVE_DEBOUNCE_MS = 650;

export function useLocalDraft() {
  useEffect(() => {
    let disposed = false;
    let hydrated = false;
    let writable = false;
    let releaseStorage = () => undefined as void;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let version = 0;
    let updatedAt = Date.now();
    const initial = useWorkspaceStore.getState();
    const snapshot = (): WorkspaceSession => {
      updatedAt = Math.max(Date.now(), updatedAt + 1);
      const state = useWorkspaceStore.getState();
      return {
        version: 1,
        updatedAt,
        activeDocumentId: state.activeDocumentId,
        documents: getWorkspaceDocuments(state),
      };
    };
    const queueSave = (session: WorkspaceSession, sequence: number) => {
      saveQueue = saveQueue
        .catch(() => undefined)
        .then(() => saveWorkspaceSession(session));
      void saveQueue.then(
        () => {
          if (!disposed && sequence === version)
            useWorkspaceStore.getState().setDraftStatus('saved');
        },
        () => {
          if (!disposed && sequence === version)
            useWorkspaceStore.getState().setDraftStatus('error');
        },
      );
    };
    const checkpoint = () => {
      if (!hydrated || !writable) return;
      clearTimeout(timer);
      const session = snapshot();
      try {
        checkpointWorkspaceSession(session);
      } catch {
        useWorkspaceStore.getState().setDraftStatus('error');
      }
      queueSave(session, ++version);
    };
    const schedule = () => {
      if (!hydrated || !writable) return;
      const sequence = ++version;
      clearTimeout(timer);
      useWorkspaceStore.getState().setDraftStatus('saving');
      timer = setTimeout(() => queueSave(snapshot(), sequence), SAVE_DEBOUNCE_MS);
    };
    const unsubscribe = useWorkspaceStore.subscribe((state, previous) => {
      if (
        state.processModel !== previous.processModel ||
        state.documents !== previous.documents ||
        state.activeDocumentId !== previous.activeDocumentId ||
        state.analysisOptions !== previous.analysisOptions ||
        state.drawioSource !== previous.drawioSource
      )
        schedule();
    });
    initial.setDraftStatus('loading');
    void acquireWorkspaceStorage()
      .then(async (ownership) => {
        if (disposed) {
          ownership.release();
          return null;
        }
        writable = ownership.writable;
        releaseStorage = ownership.release;
        return loadWorkspaceSession();
      })
      .then(async (session) => {
        if (disposed) return;
        const current = useWorkspaceStore.getState();
        const unchanged =
          current.processModel === initial.processModel &&
          current.documents === initial.documents &&
          current.analysisOptions === initial.analysisOptions &&
          current.drawioSource === initial.drawioSource &&
          current.modelRevision === initial.modelRevision;
        if (session && unchanged)
          current.restoreDocuments(session.documents, session.activeDocumentId);
        const documents = useWorkspaceStore.getState().documents;
        await restoreDeviceBindings(
          documents.map((item) => item.id),
          new Map(documents.map((item) => [item.id, item.savedContent])),
        );

        if (disposed) return;
        hydrated = true;
        if (writable) schedule();
        else useWorkspaceStore.getState().setDraftStatus('conflict');
      })
      .catch(() => {
        if (disposed) return;
        hydrated = true;
        useWorkspaceStore.getState().setDraftStatus('error');
      });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') checkpoint();
    };
    window.addEventListener('pagehide', checkpoint);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      checkpoint();
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
      void saveQueue.then(releaseStorage, releaseStorage);
      window.removeEventListener('pagehide', checkpoint);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
