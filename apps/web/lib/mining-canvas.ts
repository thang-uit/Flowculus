import {
  isValidDocumentName,
  MAX_OPEN_DOCUMENTS,
  normalizeDocumentName,
} from './documents/document-types';
import type { MiningClient } from './use-mining-client';
import { useMiningStore } from './mining-store';
import { useWorkspaceStore } from './workspace-store';

export type MiningCanvasOutcome =
  'created' | 'invalid-name' | 'unavailable' | 'stale' | 'document-limit' | 'failed';

/** Only an explicitly named conversion of the current discovery may create a tab. */
export async function createMiningCanvasDocument(
  value: string,
  request: MiningClient['request'],
  isCurrent: () => boolean,
): Promise<MiningCanvasOutcome> {
  const name = normalizeDocumentName(value);
  if (!isValidDocumentName(name)) return 'invalid-name';
  const snapshot = useMiningStore.getState();
  if (
    !isCurrent() ||
    !snapshot.result ||
    snapshot.status !== 'ready' ||
    snapshot.mappingTable ||
    snapshot.pendingUpload
  )
    return 'unavailable';
  if (useWorkspaceStore.getState().documents.length >= MAX_OPEN_DOCUMENTS)
    return 'document-limit';
  const response = await request({ type: 'to-model', name, filter: snapshot.filter });
  const current = useMiningStore.getState();
  // Filter edits invalidate immediately, including the discovery debounce interval.
  if (
    !isCurrent() ||
    current.result !== snapshot.result ||
    current.filter !== snapshot.filter ||
    current.status !== 'ready' ||
    current.mappingTable ||
    current.pendingUpload
  )
    return 'stale';
  if (response.type !== 'model') throw new Error('Unexpected mining response.');
  const workspace = useWorkspaceStore.getState();
  if (
    !workspace.openDocument(response.model, { drawioSource: null, analysisOptions: {} })
  )
    return 'document-limit';
  current.setConversionWarnings(response.warnings);
  workspace.setMode('model');
  return 'created';
}
