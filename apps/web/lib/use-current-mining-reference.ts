'use client';
import { getWorkspaceDocuments } from './documents/document-types';
import { useWorkspaceStore } from './workspace-store';
import { useMiningStore } from './mining-store';
import { isCurrentMiningReference } from './mining-current-reference';

/** Only show comparisons for the selected, unchanged model and activity mapping. */
export function useCurrentMiningReference() {
  const workspace = useWorkspaceStore();
  const stored = useMiningStore((state) => state.conformance);
  const reference = useMiningStore((state) => state.reference);
  if (!stored) return null;
  const document = getWorkspaceDocuments(workspace).find(
    (item) => item.id === reference.documentId,
  );
  return isCurrentMiningReference(stored, document?.processModel, reference)
    ? stored
    : null;
}
