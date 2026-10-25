'use client';

import type { TraceCrop } from '@/lib/image-trace/file-validation';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';

export function ImageReferenceControls({
  crop,
  onCropChange,
  onGeometryChange,
}: Readonly<{
  crop: TraceCrop;
  onCropChange: (crop: TraceCrop) => void;
  onGeometryChange: () => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const opacity = useImageReferenceStore((state) => state.opacity);
  const rotation = useImageReferenceStore((state) => state.rotation);
  const locked = useImageReferenceStore((state) => state.locked);
  const setOpacity = useImageReferenceStore((state) => state.setOpacity);
  const setRotation = useImageReferenceStore((state) => state.setRotation);
  const setLocked = useImageReferenceStore((state) => state.setLocked);
  return (
    <>
      <label className="text-[11px] text-[var(--muted)]">
        {copy.imageTraceOpacity}
        <input
          type="range"
          min="10"
          max="100"
          value={Math.round(opacity * 100)}
          onChange={(event) => setOpacity(Number(event.target.value) / 100)}
          className="flow-range mt-2"
        />
      </label>
      <label className="text-[11px] text-[var(--muted)]">
        {copy.imageTraceRotation}
        <input
          type="range"
          min="-180"
          max="180"
          value={rotation}
          onChange={(event) => {
            onGeometryChange();
            setRotation(Number(event.target.value));
          }}
          className="flow-range mt-2"
        />
      </label>
      <label className="flex items-center gap-2 text-[11px] text-[var(--muted-strong)]">
        <input
          type="checkbox"
          checked={locked}
          onChange={(event) => setLocked(event.target.checked)}
          className="flow-checkbox"
        />
        {copy.imageTraceLocked}
      </label>
      <div className="space-y-1 border-t border-[var(--border)] pt-2">
        <p className="text-[11px] font-medium text-[var(--muted-strong)]">
          {copy.imageTraceCrop}
        </p>
        {(['left', 'top', 'right', 'bottom'] as const).map((side) => (
          <label key={side} className="block text-[11px] text-[var(--muted)]">
            {copy.imageTraceCropSide[side]} · {crop[side]}%
            <input
              type="range"
              min="0"
              max={Math.min(
                80,
                80 -
                  crop[
                    side === 'left'
                      ? 'right'
                      : side === 'right'
                        ? 'left'
                        : side === 'top'
                          ? 'bottom'
                          : 'top'
                  ],
              )}
              value={crop[side]}
              onChange={(event) =>
                onCropChange({ ...crop, [side]: Number(event.target.value) })
              }
              className="flow-range mt-1.5"
            />
          </label>
        ))}
      </div>
    </>
  );
}
