'use client';

import type { MouseEvent } from 'react';
import { FlowArrow, X } from '@phosphor-icons/react';

import type { DocumentCopy } from '@/lib/i18n/document-copy';
import { isDocumentDirty, type WorkspaceDocument } from '@/lib/documents/document-types';

/** A process tab keeps its close target separate from selection and renaming. */
export function ProcessDocumentTab({
  document,
  index,
  active,
  statusLabel,
  copy,
  onActivate,
  onRename,
  onClose,
  onContextMenu,
}: Readonly<{
  document: WorkspaceDocument;
  index: number;
  active: boolean;
  statusLabel: string;
  copy: DocumentCopy;
  onActivate: () => void;
  onRename: () => void;
  onClose: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}>) {
  const saving = document.deviceStatus === 'saving';
  return (
    <div
      className="document-tab-group"
      data-tab-id={document.id}
      data-active={active}
      aria-busy={saving}
    >
      <button
        type="button"
        role="tab"
        id={`document-tab-${document.id}`}
        data-document-index={index}
        data-document-id={document.id}
        aria-posinset={index + 1}
        aria-selected={active}
        aria-controls={active ? `document-panel-${document.id}` : undefined}
        aria-label={`${document.processModel.name} — ${statusLabel}`}
        tabIndex={active ? 0 : -1}
        className="focus-ring document-tab"
        title={`${document.processModel.name}\n${statusLabel}\n${copy.reorderHint}`}
        onClick={onActivate}
        onContextMenu={onContextMenu}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        onAuxClick={(event) => {
          if (event.button === 1 && !saving) {
            event.preventDefault();
            onClose();
          }
        }}
        onDoubleClick={onRename}
      >
        <FlowArrow
          size={15}
          weight={active ? 'bold' : 'regular'}
          className="document-tab-icon"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">{document.processModel.name}</span>
        {isDocumentDirty(document) ? (
          <span aria-hidden="true" className="document-dirty">
            *
          </span>
        ) : null}
      </button>
      <button
        type="button"
        aria-label={`${copy.close}: ${document.processModel.name}`}
        title={saving ? copy.saving : `${copy.close}: ${document.processModel.name}`}
        className="focus-ring document-close"
        disabled={saving}
        onClick={onClose}
      >
        <X size={14} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
