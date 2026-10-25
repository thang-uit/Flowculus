import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  markReferenceSelection,
  readReferenceSelection,
  referenceSelectionMatches,
  REMOVED_REFERENCE,
  checkpointReferencePresentation,
  restoreReferencePresentation,
} from './reference-selection';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('reference selection checkpoint', () => {
  it('recovers the latest geometry only for the matching image', () => {
    const value = { assetId: 'a', x: 0, y: 0, opacity: 0.5, rotation: 0, locked: true };
    checkpointReferencePresentation({ ...value, x: 150, y: 200 });
    expect(restoreReferencePresentation(value)).toMatchObject({ x: 150, y: 200 });
    expect(restoreReferencePresentation({ ...value, assetId: 'b' })).toMatchObject({
      x: 0,
      y: 0,
    });
  });
  it('accepts legacy assets only before a new selection or removal', () => {
    expect(referenceSelectionMatches()).toBe(true);
    markReferenceSelection('new');
    expect(referenceSelectionMatches()).toBe(false);
    expect(referenceSelectionMatches('old')).toBe(false);
    expect(referenceSelectionMatches('new')).toBe(true);
  });
  it('rejects every saved asset after removal, including delayed old writes', () => {
    markReferenceSelection('old');
    markReferenceSelection(REMOVED_REFERENCE);
    expect(referenceSelectionMatches('old')).toBe(false);
    expect(referenceSelectionMatches()).toBe(false);
    expect(readReferenceSelection()).toBe(REMOVED_REFERENCE);
  });
  it('reports blocked storage without throwing into the editor', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('blocked');
      },
    });
    expect(markReferenceSelection('new')).toBe(false);
    expect(readReferenceSelection()).toBeNull();
  });
});
