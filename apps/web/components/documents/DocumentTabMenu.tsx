'use client';

import {
  hasDeviceFile,
  isDeviceAutoSave,
  setDeviceAutoSave,
} from '@/lib/documents/device-file';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { AppContextMenu } from '@/components/ui/AppContextMenu';
import type { WorkspaceDocument } from '@/lib/documents/document-types';
import type { DocumentCopy } from '@/lib/i18n/document-copy';

export function DocumentTabMenu({
  document,
  index,
  total,
  point,
  copy,
  onMove,
  onRename,
  onCloseTab,
  onDismiss,
}: Readonly<{
  document: WorkspaceDocument;
  index: number;
  total: number;
  point: { x: number; y: number };
  copy: DocumentCopy;
  onMove: (index: number) => void;
  onRename: () => void;
  onCloseTab: () => void;
  onDismiss: () => void;
}>) {
  return (
    <AppContextMenu
      point={point}
      label={copy.tabMenu}
      onClose={onDismiss}
      sections={[
        {
          id: 'name',
          actions: [{ id: 'rename', label: copy.rename, onSelect: onRename }],
        },
        ...(hasDeviceFile(document.id)
          ? [
              {
                id: 'file',
                actions: [
                  {
                    id: 'auto-save',
                    label: isDeviceAutoSave(document.id)
                      ? copy.stopAutoSave
                      : copy.autoSave,
                    disabled: document.deviceStatus === 'saving',
                    onSelect: () => {
                      setDeviceAutoSave(document.id, !isDeviceAutoSave(document.id));
                      useWorkspaceStore.getState().updateDocumentFile(document.id, {});
                    },
                  },
                ],
              },
            ]
          : []),
        {
          id: 'position',
          actions: [
            {
              id: 'left',
              label: copy.moveLeft,
              disabled: index === 0,
              onSelect: () => onMove(index - 1),
            },
            {
              id: 'right',
              label: copy.moveRight,
              disabled: index === total - 1,
              onSelect: () => onMove(index + 1),
            },
            {
              id: 'first',
              label: copy.moveFirst,
              disabled: index === 0,
              onSelect: () => onMove(0),
            },
            {
              id: 'last',
              label: copy.moveLast,
              disabled: index === total - 1,
              onSelect: () => onMove(total - 1),
            },
          ],
        },
        {
          id: 'close',
          actions: [
            {
              id: 'close',
              label: copy.close,
              tone: 'danger',
              disabled: document.deviceStatus === 'saving',
              onSelect: onCloseTab,
            },
          ],
        },
      ]}
    />
  );
}
