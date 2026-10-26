const KEY = 'flowculus-reference-image:selection';
const scoped = (key: string, scope?: string) => (scope ? `${key}:${scope}` : key);
const PRESENTATION_KEY = 'flowculus-reference-image:presentation';
export const REMOVED_REFERENCE = 'removed';

export interface ReferencePresentation {
  assetId?: string;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  locked: boolean;
}

/** Tiny geometry checkpoint; the photo bytes remain in IndexedDB. */
export function checkpointReferencePresentation(
  value: ReferencePresentation,
  scope?: string,
): boolean {
  try {
    localStorage.setItem(
      scoped(PRESENTATION_KEY, scope),
      JSON.stringify({
        assetId: value.assetId,
        x: value.x,
        y: value.y,
        opacity: value.opacity,
        rotation: value.rotation,
        locked: value.locked,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function restoreReferencePresentation(
  value: ReferencePresentation,
  scope?: string,
): ReferencePresentation {
  try {
    const candidate: unknown = JSON.parse(
      localStorage.getItem(scoped(PRESENTATION_KEY, scope)) ?? 'null',
    );
    if (!candidate || typeof candidate !== 'object') return value;
    const saved = candidate as Partial<ReferencePresentation>;
    if (
      saved.assetId !== value.assetId ||
      !Number.isFinite(saved.x) ||
      !Number.isFinite(saved.y) ||
      !Number.isFinite(saved.rotation) ||
      Math.abs(saved.rotation!) > 180 ||
      !Number.isFinite(saved.opacity) ||
      saved.opacity! < 0.1 ||
      saved.opacity! > 1 ||
      typeof saved.locked !== 'boolean'
    )
      return value;
    return {
      ...value,
      x: saved.x!,
      y: saved.y!,
      opacity: saved.opacity!,
      rotation: saved.rotation!,
      locked: saved.locked,
    };
  } catch {
    return value;
  }
}

/** A synchronous marker prevents a deleted/replaced photo returning on fast reload. */
export function markReferenceSelection(id: string, scope?: string): boolean {
  try {
    localStorage.setItem(scoped(KEY, scope), id);
    return true;
  } catch {
    return false;
  }
}

export function readReferenceSelection(scope?: string): string | null {
  try {
    return localStorage.getItem(scoped(KEY, scope));
  } catch {
    return null;
  }
}

export const referenceSelectionMatches = (assetId?: string, scope?: string): boolean => {
  const selected = readReferenceSelection(scope);
  return selected === null || (selected !== REMOVED_REFERENCE && selected === assetId);
};
