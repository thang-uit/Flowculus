'use client';

import { FlowArrow } from '@phosphor-icons/react';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function CanvasEmptyState() {
  const empty = useWorkspaceStore(
    (state) => Object.keys(state.processModel.nodes).length === 0,
  );
  const hasReference = useImageReferenceStore((state) => state.blob !== null);
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  if (!empty || hasReference) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <FlowArrow
          size={32}
          className="mx-auto mb-4 text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <h2 className="text-base font-semibold text-[var(--text)]">
          {copy.canvasEmptyTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
          {copy.canvasEmptyHint}
        </p>
      </div>
    </div>
  );
}
