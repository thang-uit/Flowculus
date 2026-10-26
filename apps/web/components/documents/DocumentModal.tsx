'use client';

import type { ReactNode } from 'react';
import { AppDialog } from '@/components/ui/AppDialog';

export function DocumentModal({
  title,
  description,
  closeLabel,
  onClose,
  busy,
  children,
}: Readonly<{
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}>) {
  return (
    <AppDialog
      open
      title={title}
      description={description}
      closeLabel={closeLabel}
      busy={busy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {children}
    </AppDialog>
  );
}
