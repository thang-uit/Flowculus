'use client';

import { ImageSquare, SlidersHorizontal, Trash } from '@phosphor-icons/react';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Photo actions stay reachable even while the reference layer is locked. */
export function ImageReferenceToolbar() {
  const url = useImageReferenceStore((state) => state.url);
  const name = useImageReferenceStore((state) => state.name);
  const error = useImageReferenceStore((state) => state.storageError);
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  if (!url && !error) return null;
  return (
    <div
      className="image-reference-toolbar nodrag nopan"
      role="region"
      aria-label={copy.imageReference}
    >
      {url ? (
        <>
          <div className="image-reference-toolbar__name" title={name}>
            <ImageSquare size={16} aria-hidden="true" />
            <span>{name}</span>
          </div>
          <div className="image-reference-toolbar__actions">
            <button
              type="button"
              className="focus-ring"
              onClick={() => useImageReferenceStore.getState().setOpen(true)}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              {copy.editImage}
            </button>
            <button
              type="button"
              className="focus-ring image-reference-toolbar__remove"
              title={copy.removeImageHint}
              onClick={() => useImageReferenceStore.getState().clear()}
            >
              <Trash size={15} aria-hidden="true" />
              {copy.removeImage}
            </button>
          </div>
        </>
      ) : null}
      {error ? <p role="alert">{copy.imageStorageError}</p> : null}
    </div>
  );
}
