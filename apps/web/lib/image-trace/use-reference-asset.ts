'use client';

import { useEffect } from 'react';
import {
  deleteReferenceAsset,
  deleteDocumentReferenceAsset,
  loadReferenceAsset,
  saveReferenceAsset,
  type ReferenceAsset,
} from './reference-asset';
import {
  checkpointReferencePresentation,
  readReferenceSelection,
} from './reference-selection';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { INITIAL_DOCUMENT_ID } from '@/lib/documents/document-types';

const images = new Map<string, ReferenceAsset | null>();
let queue = Promise.resolve();
const capture = (): ReferenceAsset | null => {
  const image = useImageReferenceStore.getState();
  return image.blob
    ? {
        blob: image.blob,
        assetId: image.assetId ?? undefined,
        name: image.name,
        width: image.width,
        height: image.height,
        x: image.x,
        y: image.y,
        opacity: image.opacity,
        rotation: image.rotation,
        locked: image.locked,
      }
    : null;
};

/** Each document owns a separately stored photo; async decodes never cross tabs. */
export function useReferenceAsset() {
  useEffect(() => {
    let disposed = false;
    let restoring = false;
    let booted = false;
    let sequence = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      const image = useImageReferenceStore.getState();
      if (
        useWorkspaceStore.getState().draftStatus === 'conflict' ||
        (restoring && !image.touched)
      )
        return;
      const id = image.documentId;
      const asset = capture();
      images.set(id, asset);
      if (asset) checkpointReferencePresentation(asset, id);
      queue = queue
        .catch(() => undefined)
        .then(() => (asset ? saveReferenceAsset(asset, id) : deleteReferenceAsset(id)));
      void queue.then(
        () => {
          if (!disposed && useImageReferenceStore.getState().documentId === id)
            useImageReferenceStore.getState().setStorageError(false);
        },
        () => {
          if (!disposed && useImageReferenceStore.getState().documentId === id)
            useImageReferenceStore.getState().setStorageError(true);
        },
      );
    };
    const activate = async (id: string) => {
      const ticket = ++sequence;
      restoring = true;
      useImageReferenceStore.getState().switchDocument(id);
      try {
        let asset = images.has(id) ? images.get(id) : await loadReferenceAsset(id);
        // Adopt the single legacy photo only into the migrated initial document.
        if (
          asset === null &&
          id === INITIAL_DOCUMENT_ID &&
          !images.has(id) &&
          readReferenceSelection(id) === null
        )
          asset = await loadReferenceAsset();
        if (disposed || ticket !== sequence) return;
        if (asset) useImageReferenceStore.getState().restoreImage(asset);
      } catch {
        if (!disposed && ticket === sequence)
          useImageReferenceStore.getState().setStorageError(true);
      } finally {
        if (ticket === sequence) restoring = false;
      }
    };
    const boot = () => {
      const workspace = useWorkspaceStore.getState();
      if (booted || workspace.draftStatus === 'loading') return;
      booted = true;
      void activate(workspace.activeDocumentId);
    };
    boot();
    const stopWorkspace = useWorkspaceStore.subscribe((state, previous) => {
      if (!booted) {
        boot();
        return;
      }
      if (state.activeDocumentId !== previous.activeDocumentId) {
        clearTimeout(timer);
        persist();
        void activate(state.activeDocumentId);
      }
      const open = new Set(state.documents.map((document) => document.id));
      for (const old of previous.documents)
        if (!open.has(old.id)) {
          images.delete(old.id);
          queue = queue
            .catch(() => undefined)
            .then(() => deleteDocumentReferenceAsset(old.id));
          void queue.catch(() => useImageReferenceStore.getState().setStorageError(true));
        }
    });
    const stopImage = useImageReferenceStore.subscribe((state, previous) => {
      if (state.documentId !== previous.documentId || (restoring && !state.touched))
        return;
      if (
        state.blob === previous.blob &&
        state.x === previous.x &&
        state.y === previous.y &&
        state.opacity === previous.opacity &&
        state.rotation === previous.rotation &&
        state.locked === previous.locked
      )
        return;
      clearTimeout(timer);
      timer = setTimeout(persist, state.blob !== previous.blob ? 0 : 650);
    });
    window.addEventListener('pagehide', persist);
    return () => {
      clearTimeout(timer);
      persist();
      disposed = true;
      ++sequence;
      stopWorkspace();
      stopImage();
      window.removeEventListener('pagehide', persist);
    };
  }, []);
}
