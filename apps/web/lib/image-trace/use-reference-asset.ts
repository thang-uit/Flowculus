'use client';

import { useEffect, useRef, useState } from 'react';
import {
  deleteReferenceAsset,
  loadReferenceAsset,
  saveReferenceAsset,
} from './reference-asset';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';

/** Persists the separate photo asset without embedding it in ProcessModel. */
export function useReferenceAsset() {
  const blob = useImageReferenceStore((state) => state.blob);
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
      queue.current = queue.current
        .catch(() => undefined)
        .then(() =>
          blob
            ? saveReferenceAsset({
                blob,
                name,
                width,
                height,
                x,
                y,
                opacity,
                rotation,
                locked,
              })
            : deleteReferenceAsset(),
        );
      void queue.current.then(
        () => setStorageError(false),
        () => setStorageError(true),
      );
    };
    const timer = window.setTimeout(persist, blob ? 700 : 0);
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
