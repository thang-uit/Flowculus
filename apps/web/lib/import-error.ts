import { ProcessCsvNumberError } from '@flowculus/file-formats';

import type { WorkspaceCopy } from '@/lib/i18n';

export const describeImportError = (error: unknown, copy: WorkspaceCopy): string => {
  if (error instanceof ProcessCsvNumberError)
    return copy.invalidCsvNumber(error.section, error.row, error.column);
  if (error instanceof Error) {
    if (error.message in copy.imageTraceError)
      return copy.imageTraceError[error.message as keyof typeof copy.imageTraceError];
    if (error.message === 'mixed-file-selection') return copy.mixedFileSelection;
    if (error.message === 'document-limit') return copy.documentLimit;
    if (error.message === 'file-too-large') return copy.fileTooLarge;
    if (error.message === 'missing-node-table') return copy.missingNodeTable;
    if (error.message === 'invalid-model-csv') return copy.invalidModelCsv;
  }
  return copy.fileError;
};
