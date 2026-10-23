'use client';

import * as Dialog from '@radix-ui/react-dialog';

import { InspectorPanel } from '@/components/InspectorPanel';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function MobileInspectorDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-[rgb(10_14_18_/_0.28)] backdrop-blur-[1px] " />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-20 h-[min(72dvh,560px)] overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)] focus:outline-none">
          <Dialog.Title className="sr-only">{copy.inspector}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {copy.inspectorDescription}
          </Dialog.Description>
          <InspectorPanel mobile onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
