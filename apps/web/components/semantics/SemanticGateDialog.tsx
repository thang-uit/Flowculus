'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { MagnifyingGlass, ShieldWarning, X } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { collectUnconfirmedSemantics } from '@flowculus/validation';

import { IconButton } from '@/components/ui/IconButton';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

const PREVIEW_LIMIT = 5;

/** Explains why an export or share was refused and leads to the Inspector. */
export function SemanticGateDialog() {
  const locale = useWorkspaceStore((state) => state.locale);
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
    <Dialog.Root open={open} onOpenChange={(next) => !next && setReason(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(10_14_18_/_0.38)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(640px,calc(100dvh-2rem))] w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] focus:outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <ShieldWarning
                size={20}
                weight="duotone"
                className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
                  {copy.semantics.gateTitle}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
                  {copy.semantics.gateDescription(items.length)}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <IconButton icon={X} label={copy.close} variant="subtle" size="sm" />
            </Dialog.Close>
          </div>
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
            <Dialog.Close asChild>
              <button
                type="button"
                className="focus-ring inline-flex h-9 cursor-pointer items-center rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"
              >
                {copy.semantics.cancel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={review}
              className="focus-ring inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-ink)] hover:brightness-105"
            >
              <MagnifyingGlass size={14} aria-hidden="true" />
              {copy.semantics.reviewInInspector}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
