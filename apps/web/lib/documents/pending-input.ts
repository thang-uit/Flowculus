import { flushSync } from 'react-dom';
import { getDocumentCopy } from '@/lib/i18n/document-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { showNotice } from '@/lib/ui/notice-store';

/** Inspector commits run synchronously before a manual save captures its model. */
export function commitPendingInput(): boolean {
  if (typeof document === 'undefined') return true;
  const focused = document.activeElement;
  if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)
    flushSync(() => focused.blur());
  const invalid = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input[aria-invalid="true"], textarea[aria-invalid="true"]',
    ),
  ).find((field) => !field.closest('[inert]') && field.getClientRects().length > 0);
  if (!invalid) return true;
  invalid.focus();
  showNotice(
    getDocumentCopy(usePreferencesStore.getState().locale).invalidField,
    'error',
  );
  return false;
}
