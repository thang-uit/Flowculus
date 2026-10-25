'use client';

import { create } from 'zustand';

interface ImageReferenceState {
  url: string | null;
  blob: Blob | null;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  locked: boolean;
  touched: boolean;
  storageError: boolean;
  open: boolean;
  setImage: (file: File, width: number, height: number) => void;
  restoreImage: (asset: {
    blob: Blob;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    opacity: number;
    rotation: number;
    locked: boolean;
  }) => void;
  setOpacity: (opacity: number) => void;
  setRotation: (rotation: number) => void;
  setPosition: (x: number, y: number) => void;
  setLocked: (locked: boolean) => void;
  setOpen: (open: boolean) => void;
  setStorageError: (failed: boolean) => void;
  clear: () => void;
}

/** Transient local photo layer; the blob is never included in a model/export. */
export const useImageReferenceStore = create<ImageReferenceState>((set, get) => ({
  url: null,
  blob: null,
  name: '',
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  opacity: 0.45,
  rotation: 0,
  locked: true,
  touched: false,
  storageError: false,
  open: false,
  setImage: (file, width, height) => {
    const old = get().url;
    if (old) URL.revokeObjectURL(old);
    set({
      url: URL.createObjectURL(file),
      blob: file,
      name: file.name,
      width,
      height,
      x: 0,
      y: 0,
      opacity: 0.45,
      rotation: 0,
      locked: true,
      touched: true,
    });
  },
  restoreImage: (asset) => {
    if (get().touched || get().blob) return;
    set({ ...asset, url: URL.createObjectURL(asset.blob) });
  },
  setOpacity: (opacity) => set({ opacity: Math.max(0.1, Math.min(1, opacity)) }),
  setRotation: (rotation) => set({ rotation: Math.max(-180, Math.min(180, rotation)) }),
  setPosition: (x, y) => set({ x, y }),
  setLocked: (locked) => set({ locked }),
  setOpen: (open) => set({ open }),
  setStorageError: (storageError) => set({ storageError }),
  clear: () => {
    const old = get().url;
    if (old) URL.revokeObjectURL(old);
    set({
      url: null,
      blob: null,
      name: '',
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      touched: true,
    });
  },
}));
