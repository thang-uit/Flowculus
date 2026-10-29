import { getWorkspaceCopy } from '@/lib/i18n';
import { describeImportError } from '@/lib/import-error';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { showNotice } from '@/lib/ui/notice-store';

/** A slow read reports in the language selected when it completes. Cancelled reads stay quiet. */
export async function reportWorkspaceImport(operation: Promise<boolean>): Promise<void> {
  try {
    if (await operation)
      showNotice(
        getWorkspaceCopy(usePreferencesStore.getState().locale).fileReady,
        'success',
      );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    const copy = getWorkspaceCopy(usePreferencesStore.getState().locale);
    showNotice(describeImportError(error, copy), 'error');
  }
}
