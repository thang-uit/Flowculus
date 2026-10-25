'use client';

import { useEffect, useRef, useState } from 'react';
import {
  deleteReferenceAsset,
  loadReferenceAsset,
  saveReferenceAsset,
} from './reference-asset';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { checkpointReferencePresentation } from './reference-selection';

/** Persists the separate photo asset without embedding it in ProcessModel. */
export function useReferenceAsset() {
  const blob = useImageReferenceStore((state) => state.blob);
  const assetId = useImageReferenceStore((state) => state.assetId);
  const name = useImageReferenceStore((state) => state.name);
  const width = useImageReferenceStore((state) => state.width);
  const height = useImageReferenceStore((state) => state.height);
  const x = useImageReferenceStore((state) => state.x);
  const y = useImageReferenceStore((state) => state.y);
  const opacity = useImageReferenceStore((state) => state.opacity);
  const rotation = useImageReferenceStore((state) => state.rotation);
  const locked = useImageReferenceStore((state) => state.locked);
  const restore = useImageReferenceStore((state) => state.restoreImage);
  const setStorageError = useImageReferenceStore((state) => state.setStorageError);
  const [hydrated, setHydrated] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const previousBlob = useRef<Blob | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void loadReferenceAsset()
      .then((asset) => {
        if (cancelled) return;
        if (asset) restore(asset);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) {
          setStorageError(true);
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [restore, setStorageError]);

  useEffect(() => {
    if (!hydrated) return;
    const persist = () => {
      const current = useImageReferenceStore.getState();
      const snapshot = current.blob
        ? {
            assetId: current.assetId ?? undefined,
            blob: current.blob,
            name: current.name,
            width: current.width,
            height: current.height,
            x: current.x,
            y: current.y,
            opacity: current.opacity,
            rotation: current.rotation,
            locked: current.locked,
          }
        : null;
      if (snapshot) checkpointReferencePresentation(snapshot);
      queue.current = queue.current
        .catch(() => undefined)
        .then(() => (snapshot ? saveReferenceAsset(snapshot) : deleteReferenceAsset()));
      void queue.current.then(
        () => setStorageError(false),
        () => setStorageError(true),
      );
    };
    // Persist new/deleted photos promptly; debounce only presentation changes.
    const photoChanged = previousBlob.current !== blob;
    previousBlob.current = blob;
    const timer = window.setTimeout(persist, photoChanged ? 0 : 700);
    // A fast reload must not discard a newly selected photo before debounce ends.
    const checkpoint = () => {
      window.clearTimeout(timer);
      persist();
    };
    window.addEventListener('pagehide', checkpoint);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', checkpoint);
    };
  }, [
    hydrated,
    blob,
    assetId,
    name,
    width,
    height,
    x,
    y,
    opacity,
    rotation,
    locked,
    setStorageError,
  ]);
}
