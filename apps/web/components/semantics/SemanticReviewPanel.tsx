'use client';

import { CheckCircle, Crosshair, ListChecks, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collectUnconfirmedSemantics,
  type UnconfirmedSemantic,
} from '@flowculus/validation';

import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const buttonClass =
  'focus-ring inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60';

function SemanticItemRow({ item }: Readonly<{ item: UnconfirmedSemantic }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale).semantics;
  const focusElement = useWorkspaceStore((state) => state.focusElement);
  const confirmSemanticItems = useWorkspaceStore((state) => state.confirmSemanticItems);
  return (
    <li className="space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <p className="text-[11px] font-semibold leading-4 text-[var(--text)]">
        {copy.codes[item.code]}
      </p>
      <p className="truncate text-[11px] text-[var(--muted)]" title={item.label}>
        {item.label} · {copy.origins[item.origin]}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            focusElement({ elementType: item.elementType, elementId: item.elementId })
          }
          className={`${buttonClass} border border-[var(--border)] text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]`}
          aria-label={`${copy.showElement}: ${item.label}`}
        >
          <Crosshair size={13} aria-hidden="true" />
          {copy.showElement}
        </button>
        {item.confirmable ? (
          <button
            type="button"
            onClick={() =>
              confirmSemanticItems([
                {
                  elementType: item.elementType,
                  elementId: item.elementId,
                  codes: [item.code],
                },
              ])
            }
            className={`${buttonClass} bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-105`}
            aria-label={`${copy.confirmItem}: ${copy.codes[item.code]} — ${item.label}`}
          >
            <CheckCircle size={13} weight="bold" aria-hidden="true" />
            {copy.confirmItem}
          </button>
        ) : (
          <span className="text-[10.5px] leading-4 text-[var(--danger)]">
            {copy.chooseTypeFirst}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Lists every guessed semantic that blocks export/share, with a per-item
 * confirmation and a deliberate two-step "confirm all remaining".
 */
export function SemanticReviewPanel() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale).semantics;
  const model = useWorkspaceStore((state) => state.processModel);
  const confirmSemanticItems = useWorkspaceStore((state) => state.confirmSemanticItems);
  const items = useMemo(() => collectUnconfirmedSemantics(model), [model]);
  const confirmable = items.filter((item) => item.confirmable).length;
  const [confirmingAll, setConfirmingAll] = useState(false);
  const confirmAllRef = useRef<HTMLButtonElement>(null);
  // "Adjust state while rendering": announce once when the last item is confirmed.
  const [previousCount, setPreviousCount] = useState(items.length);
  const [justFinished, setJustFinished] = useState(false);
  if (previousCount !== items.length) {
    setPreviousCount(items.length);
    setJustFinished(previousCount > 0 && items.length === 0);
  }

  useEffect(() => {
    if (confirmingAll) confirmAllRef.current?.focus();
  }, [confirmingAll]);

  if (items.length === 0) {
    return justFinished ? (
      <p
        role="status"
        className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-[11px] font-medium text-[var(--success)]"
      >
        <CheckCircle size={14} weight="fill" aria-hidden="true" />
        {copy.allConfirmed}
      </p>
    ) : null;
  }

  return (
    <section
      aria-labelledby="semantic-review-title"
      className="space-y-2.5 border-b border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-3"
    >
      <div className="flex items-start gap-2">
        <WarningCircle
          size={16}
          className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3
            id="semantic-review-title"
            className="text-xs font-semibold text-[var(--text)]"
          >
            {copy.reviewTitle(items.length)}
          </h3>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted-strong)]">
            {copy.reviewDescription}
          </p>
        </div>
      </div>
      <ul className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => (
          <SemanticItemRow key={`${item.elementId}:${item.code}`} item={item} />
        ))}
      </ul>
      {confirmable > 0 ? (
        confirmingAll ? (
          <div
            role="alertdialog"
            aria-labelledby="confirm-all-title"
            aria-describedby="confirm-all-description"
            className="space-y-2 rounded-lg border border-[var(--accent-strong)] bg-[var(--surface)] p-2.5"
          >
            <p
              id="confirm-all-title"
              className="text-[11px] font-semibold text-[var(--text)]"
            >
              {copy.confirmAllTitle}
            </p>
            <p
              id="confirm-all-description"
              className="text-[11px] leading-4 text-[var(--muted-strong)]"
            >
              {copy.confirmAllWarning(confirmable)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                ref={confirmAllRef}
                type="button"
                onClick={() => {
                  confirmSemanticItems();
                  setConfirmingAll(false);
                }}
                className={`${buttonClass} bg-[var(--accent)] text-[var(--accent-ink)]`}
              >
                <ListChecks size={13} aria-hidden="true" />
                {copy.confirmAllAction}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAll(false)}
                className={`${buttonClass} border border-[var(--border)] text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]`}
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingAll(true)}
            className={`${buttonClass} border border-[var(--accent-strong)] text-[var(--accent-strong)] hover:bg-[var(--surface)]`}
          >
            <ListChecks size={13} aria-hidden="true" />
            {copy.confirmAll}
          </button>
        )
      ) : null}
    </section>
  );
}
