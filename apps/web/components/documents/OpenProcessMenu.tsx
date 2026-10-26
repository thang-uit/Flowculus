'use client';

import { Check, FlowArrow } from '@phosphor-icons/react';
import { AppMenu } from '@/components/ui/AppMenu';
import { isDocumentDirty, type WorkspaceDocument } from '@/lib/documents/document-types';

export function OpenProcessMenu({
  label,
  documents,
  activeId,
  onSelect,
}: Readonly<{
  label: string;
  documents: readonly WorkspaceDocument[];
  activeId: string;
  onSelect: (id: string) => void;
}>) {
  return (
    <AppMenu
      label={label}
      trigger={<span className="text-[10px]">{documents.length}</span>}
      triggerClassName="tb-btn tb-btn--idle px-1.5"
      sections={[
        {
          id: 'tabs',
          actions: documents.map((document) => ({
            id: document.id,
            label: `${document.processModel.name}${isDocumentDirty(document) ? ' *' : ''}`,
            icon: document.id === activeId ? Check : FlowArrow,
            onSelect: () => onSelect(document.id),
          })),
        },
      ]}
    />
  );
}
