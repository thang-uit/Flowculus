'use client';

import { AppDialog } from '@/components/ui/AppDialog';
import { AppButton } from '@/components/ui/AppButton';
import { MagnifyingGlass, ShieldWarning } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { collectUnconfirmedSemantics } from '@flowculus/validation';

import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const PREVIEW_LIMIT = 5;

/** Explains why an export or share was refused and leads to the Inspector. */
export function SemanticGateDialog() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const reason = useWorkspaceStore((state) => state.semanticGateReason);
  const setReason = useWorkspaceStore((state) => state.setSemanticGateReason);
  const focusElement = useWorkspaceStore((state) => state.focusElement);
  const model = useWorkspaceStore((state) => state.processModel);
  const items = useMemo(() => collectUnconfirmedSemantics(model), [model]);
  const open = reason != null && items.length > 0;

  const review = () => {
    const first = items[0];
    setReason(null);
    if (first)
      focusElement({ elementType: first.elementType, elementId: first.elementId });
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason(null);
      }}
      title={
        <span className="flex items-center gap-2">
          <ShieldWarning
            size={20}
            aria-hidden="true"
            className="shrink-0 text-[var(--accent-strong)]"
          />
          {copy.semantics.gateTitle}
        </span>
      }
      description={copy.semantics.gateDescription(items.length)}
      closeLabel={copy.close}
    >
      <ul className="mt-4 space-y-1.5">
        {items.slice(0, PREVIEW_LIMIT).map((item) => (
          <li
            key={`${item.elementId}:${item.code}`}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs"
          >
            <span className="font-medium text-[var(--text)]">
              {copy.semantics.codes[item.code]}
            </span>
            <span className="block truncate text-[11px] text-[var(--muted)]">
              {item.label}
            </span>
          </li>
        ))}
        {items.length > PREVIEW_LIMIT ? (
          <li className="px-3 text-[11px] text-[var(--muted)]">
            +{items.length - PREVIEW_LIMIT}
          </li>
        ) : null}
      </ul>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <AppButton type="button" onClick={() => setReason(null)}>
          {copy.semantics.cancel}
        </AppButton>
        <AppButton type="button" onClick={review} variant="primary">
          <MagnifyingGlass size={14} aria-hidden="true" />
          {copy.semantics.reviewInInspector}
        </AppButton>
      </div>
    </AppDialog>
  );
}
