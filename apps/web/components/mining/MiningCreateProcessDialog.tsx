'use client';

import { AppButton } from '@/components/ui/AppButton';

import { useEffect, useId, useRef, useState } from 'react';
import { DocumentModal } from '@/components/documents/DocumentModal';
import { MAX_DOCUMENT_NAME_LENGTH } from '@/lib/documents/document-types';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getDocumentCopy } from '@/lib/i18n/document-copy';
import type { MiningCanvasOutcome } from '@/lib/mining-canvas';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function MiningCreateProcessDialog({
  onClose,
  onCreate,
}: Readonly<{
  onClose: () => void;
  onCreate: (name: string) => Promise<MiningCanvasOutcome>;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const documents = getDocumentCopy(locale);
  const [name, setName] = useState('');
  const [outcome, setOutcome] = useState<MiningCanvasOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const nameInput = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (outcome === 'invalid-name' && !busy) nameInput.current?.focus();
  }, [busy, outcome]);
  const error =
    outcome === 'invalid-name'
      ? documents.invalidName
      : outcome === 'document-limit'
        ? documents.tabLimit
        : outcome === 'stale' || outcome === 'unavailable'
          ? copy.miningCreateStale
          : outcome === 'failed'
            ? copy.miningCreateFailed
            : null;

  return (
    <DocumentModal
      title={copy.miningCreateTitle}
      description={copy.miningCreateHint}
      closeLabel={documents.cancel}
      onClose={onClose}
      busy={busy}
    >
      <form
        noValidate
        className="mt-5 space-y-4"
        aria-busy={busy}
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          setBusy(true);
          try {
            const next = await onCreate(name);
            if (!mounted.current) return;
            if (next === 'created') onClose();
            else setOutcome(next);
          } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
          }
        }}
      >
        <div>
          <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
            {documents.name}
          </label>
          <input
            ref={nameInput}
            id={id}
            autoFocus
            required
            disabled={busy}
            maxLength={MAX_DOCUMENT_NAME_LENGTH}
            value={name}
            aria-invalid={outcome === 'invalid-name' || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setOutcome(null);
            }}
            className="focus-ring w-full rounded-lg border border-[var(--border-strong)] bg-[var(--canvas)] px-3 py-2.5 text-sm"
          />
        </div>
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs leading-5 text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton
            type="button"
            disabled={busy}
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            {documents.cancel}
          </AppButton>
          <AppButton type="submit" disabled={busy} variant="primary" size="sm">
            {busy ? copy.miningCreateBusy : copy.miningCreateAction}
          </AppButton>
        </div>
      </form>
    </DocumentModal>
  );
}
