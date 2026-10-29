import { getCollaborationCopy } from './i18n/collaboration-copy';
import { usePreferencesStore } from './use-preferences-store';
import { BpmnFormatError } from '@flowculus/bpmn-adapter';
import { ProcessCsvNumberError } from '@flowculus/file-formats';
import { getMiningTabsCopy } from './i18n/mining-tabs-copy';

import type { WorkspaceCopy } from '@/lib/i18n';

export const describeImportError = (error: unknown, copy: WorkspaceCopy): string => {
  if (error instanceof BpmnFormatError) {
    const words = getCollaborationCopy(usePreferencesStore.getState().locale);
    return error.code === 'unsupported'
      ? words.bpmnUnsupported
      : error.code === 'limit'
        ? words.bpmnLimit
        : words.bpmnInvalid;
  }
  if (error instanceof ProcessCsvNumberError)
    return copy.invalidCsvNumber(error.section, error.row, error.column);
  if (error instanceof Error) {
    const miningCopy = getMiningTabsCopy(usePreferencesStore.getState().locale);
    if (error.message === 'mining-storage-error') return miningCopy.storageError;
    if (error.message === 'mining-storage-conflict') return miningCopy.conflict;
    if (error.message === 'mining-tab-limit') return miningCopy.limit;
    if (error.message === 'mining-source-limit') return miningCopy.sourceLimit;
    if (error.message in copy.imageTraceError)
      return copy.imageTraceError[error.message as keyof typeof copy.imageTraceError];
    if (error.message === 'mixed-file-selection') return copy.mixedFileSelection;
    if (error.message === 'multiple-event-logs') return miningCopy.oneAtATime;
    if (error.message === 'document-limit') return copy.documentLimit;
    if (error.message === 'file-too-large') return copy.fileTooLarge;
    if (error.message === 'missing-node-table') return copy.missingNodeTable;
    if (error.message === 'invalid-model-csv') return copy.invalidModelCsv;
  }
  return copy.fileError;
};
