'use client';

import { InspectorPanel } from '@/components/InspectorPanel';
import { AppDialog } from '@/components/ui/AppDialog';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function MobileInspectorDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.inspector}
      description={copy.inspectorDescription}
      closeLabel={copy.close}
      presentation="sheet"
    >
      <InspectorPanel mobile onClose={() => onOpenChange(false)} />
    </AppDialog>
  );
}
