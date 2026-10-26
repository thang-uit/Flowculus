import {
  importWorkspaceFiles,
  type ImportedWorkspaceFile,
} from '@/lib/import-process-file';
import { MAX_OPEN_DOCUMENTS } from './document-types';

/** CSV node/edge pairs stay together; independent model files open as separate tabs. */
export async function importDocumentBatch(
  files: File[],
  fallbackName: string,
  signal: AbortSignal,
): Promise<ImportedWorkspaceFile[]> {
  if (files.length > MAX_OPEN_DOCUMENTS) throw new Error('document-limit');
  if (files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024)
    throw new Error('file-too-large');
  const csvOnly = files.every((file) => /\.(csv|tsv)$/i.test(file.name));
  if (csvOnly || files.length <= 1)
    return [await importWorkspaceFiles(files, fallbackName, signal)];
  const results: ImportedWorkspaceFile[] = [];
  // Bound peak parser/decoded XML memory; cancellation is checked between files.
  for (const file of files) {
    signal.throwIfAborted();
    results.push(await importWorkspaceFiles([file], fallbackName, signal));
  }
  signal.throwIfAborted();
  if (results.some((result) => result.kind !== 'model'))
    throw new Error('mixed-file-selection');
  return results;
}
