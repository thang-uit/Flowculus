import type { DocumentCopy } from '@/lib/i18n/document-copy';
import { isDocumentDirty, type WorkspaceDocument } from './document-types';

export function documentSaveLabel(
  document: WorkspaceDocument,
  copy: DocumentCopy,
): string {
  if (['saving', 'error', 'review'].includes(document.deviceStatus))
    return copy[document.deviceStatus as 'saving' | 'error' | 'review'];
  if (isDocumentDirty(document))
    return document.savedContent === null ? copy.unsaved : copy.modified;
  if (document.deviceStatus === 'opened') return copy.opened;
  return document.deviceStatus === 'saved' ? copy.saved : copy.downloaded;
}
