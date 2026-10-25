'use client';

import { create } from 'zustand';
import {
  markReferenceSelection,
  REMOVED_REFERENCE,
} from '@/lib/image-trace/reference-selection';

interface ImageReferenceState {
  url: string | null;
  blob: Blob | null;
  assetId: string | null;
  requestId: number;
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
  beginUpload: () => number;
  setImage: (file: File, width: number, height: number) => void;
  restoreImage: (asset: {
    assetId?: string;
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
  assetId: null,
  requestId: 0,
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
  beginUpload: () => {
    const requestId = get().requestId + 1;
    set({ requestId, touched: true });
    return requestId;
  },
  setImage: (file, width, height) => {
    const assetId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const url = URL.createObjectURL(file);
    const stored = markReferenceSelection(assetId);
    const old = get().url;
    if (old) URL.revokeObjectURL(old);
    set({
      url,
      blob: file,
      assetId,
      requestId: get().requestId + 1,
      storageError: !stored,
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
    set({
      ...asset,
      assetId: asset.assetId ?? null,
      url: URL.createObjectURL(asset.blob),
    });
  },
  setOpacity: (opacity) => {
    if (Number.isFinite(opacity)) set({ opacity: Math.max(0.1, Math.min(1, opacity)) });
  },
  setRotation: (rotation) => {
    if (Number.isFinite(rotation))
      set({ rotation: Math.max(-180, Math.min(180, rotation)) });
  },
  setPosition: (x, y) => {
    if (Number.isFinite(x) && Number.isFinite(y)) set({ x, y });
  },
  setLocked: (locked) => set({ locked }),
  setOpen: (open) => set({ open }),
  setStorageError: (storageError) => set({ storageError }),
  clear: () => {
    const stored = markReferenceSelection(REMOVED_REFERENCE);
    const old = get().url;
    if (old) URL.revokeObjectURL(old);
    set({
      url: null,
      blob: null,
      assetId: null,
      requestId: get().requestId + 1,
      open: false,
      opacity: 0.45,
      rotation: 0,
      locked: true,
      storageError: !stored,
      name: '',
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      touched: true,
    });
  },
}));
