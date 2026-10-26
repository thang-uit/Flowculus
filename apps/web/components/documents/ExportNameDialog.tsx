'use client';

import { AppButton } from '@/components/ui/AppButton';

import { useId, useState } from 'react';
import { getDocumentCopy } from '@/lib/i18n/document-copy';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import {
  isValidDocumentName,
  normalizeDocumentName,
} from '@/lib/documents/document-types';
import { DocumentModal } from './DocumentModal';

export function ExportNameDialog({
  name,
  onCancel,
  onExport,
}: Readonly<{
  name: string;
  onCancel: () => void;
  onExport: (name: string) => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getDocumentCopy(locale);
  const workspace = getWorkspaceCopy(locale);
  const [value, setValue] = useState(name);
  const [invalid, setInvalid] = useState(false);
  const id = useId();
  return (
    <DocumentModal
      title={workspace.exportFile}
      description={copy.nameHint}
      closeLabel={copy.cancel}
      onClose={onCancel}
    >
      <form
        noValidate
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = normalizeDocumentName(value);
          if (!isValidDocumentName(normalized)) {
            setInvalid(true);
            return;
          }
          onExport(normalized);
        }}
      >
        <label htmlFor={id} className="block text-xs font-medium">
          {copy.name}
        </label>
        <input
          id={id}
          value={value}
          autoFocus
          required
          maxLength={120}
          aria-invalid={invalid || undefined}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
          className="focus-ring w-full rounded-lg border border-[var(--border-strong)] bg-[var(--canvas)] px-3 py-2.5 text-sm"
        />
        {invalid ? (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {copy.invalidName}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="ghost" size="sm" onClick={onCancel}>
            {copy.cancel}
          </AppButton>
          <AppButton type="submit" variant="primary" size="sm">
            {workspace.exportFile}
          </AppButton>
        </div>
      </form>
    </DocumentModal>
  );
}
