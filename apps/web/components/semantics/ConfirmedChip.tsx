'use client';

import { SealCheck } from '@phosphor-icons/react';
import {
  SEMANTIC_METADATA_KEYS,
  type ProcessMetadataValue,
} from '@flowculus/process-model';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Shown once a person has confirmed an element's inferred semantics. */
export function ConfirmedChip({
  metadata,
}: Readonly<{ metadata: Record<string, ProcessMetadataValue> | undefined }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale).semantics;
  const confirmed = metadata?.[SEMANTIC_METADATA_KEYS.confirmed];
  if (confirmed !== true && confirmed !== 'true') return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success)]">
      <SealCheck size={12} weight="fill" aria-hidden="true" />
      {copy.confirmedBadge}
    </span>
  );
}
