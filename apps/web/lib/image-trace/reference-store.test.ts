import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImageReferenceStore } from '../use-image-reference-store';
import { readReferenceSelection, REMOVED_REFERENCE } from './reference-selection';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reference');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  useImageReferenceStore.setState(useImageReferenceStore.getInitialState(), true);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const file = () => new File(['photo'], 'board.png', { type: 'image/png' });

describe('reference image state', () => {
  it('invalidates pending uploads and never restores a removed photo', () => {
    const state = useImageReferenceStore.getState();
    const id = state.beginUpload();
    state.setImage(file(), 400, 300);
    state.setOpen(true);
    state.clear();
    expect(useImageReferenceStore.getState()).toMatchObject({
      blob: null,
      url: null,
      open: false,
      width: 0,
      height: 0,
    });
    expect(useImageReferenceStore.getState().requestId).toBeGreaterThan(id);
    expect(readReferenceSelection()).toBe(REMOVED_REFERENCE);
    state.restoreImage({
      blob: file(),
      name: 'old.png',
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      opacity: 0.5,
      rotation: 0,
      locked: true,
    });
    expect(useImageReferenceStore.getState().url).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });
  it('releases old URLs and resets transforms when replacing a photo', () => {
    const state = useImageReferenceStore.getState();
    state.setImage(file(), 400, 300);
    state.setRotation(90);
    state.setOpacity(1);
    state.setImage(file(), 600, 500);
    expect(useImageReferenceStore.getState()).toMatchObject({
      width: 600,
      height: 500,
      rotation: 0,
      opacity: 0.45,
      locked: true,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(readReferenceSelection()).toBe(useImageReferenceStore.getState().assetId);
  });
  it('clamps bounded settings and rejects non-finite geometry', () => {
    const state = useImageReferenceStore.getState();
    state.setOpacity(10);
    state.setRotation(999);
    state.setPosition(NaN, 0);
    expect(useImageReferenceStore.getState()).toMatchObject({
      opacity: 1,
      rotation: 180,
      x: 0,
      y: 0,
    });
  });
});
