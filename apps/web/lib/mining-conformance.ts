import type { ConformanceOptions } from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';
import { checkSemanticGate } from '@flowculus/validation';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { getWorkspaceDocuments } from '@/lib/documents/document-types';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { MiningAbortError, type MiningClient } from '@/lib/use-mining-client';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';

/** Bind an asynchronous alignment to its originating log, reference and mapping. */
export async function runMiningConformance(
  model: ProcessModel,
  options: ConformanceOptions,
  request: MiningClient['request'],
  isCurrent: () => boolean,
): Promise<void> {
  const copy = () => getWorkspaceCopy(usePreferencesStore.getState().locale);
  const snapshot = useMiningStore.getState();
  if (!isCurrent()) return;
  if (
    !snapshot.result ||
    snapshot.status !== 'ready' ||
    snapshot.mappingTable ||
    snapshot.pendingUpload
  ) {
    snapshot.setConformanceError(
      getMiningEvidenceCopy(usePreferencesStore.getState().locale).noEvidence,
    );
    return;
  }
  const current = () =>
    isCurrent() && useMiningStore.getState().result === snapshot.result;
  const gate = checkSemanticGate(model);
  if (!gate.ok) {
    useMiningStore
      .getState()
      .setConformanceError(copy().semantics.blockedStatus(gate.items.length));
    return;
  }
  useMiningStore.getState().startConformance();
  try {
    const response = await request({
      type: 'check-conformance',
      model: gate.model,
      options,
    });
    if (!current()) return;
    if (
      !getWorkspaceDocuments(useWorkspaceStore.getState()).some(
        (document) => document.processModel === model,
      )
    ) {
      useMiningStore
        .getState()
        .setConformanceError(
          getMiningEvidenceCopy(usePreferencesStore.getState().locale).referenceChanged,
        );
      return;
    }
    if (response.type !== 'conformance') throw new Error('Unexpected mining response.');
    useMiningStore.getState().setConformance(response, model, JSON.stringify(options));
  } catch (reason) {
    if (!current()) return;
    if (reason instanceof MiningAbortError) {
      const resilience = copy().resilience;
      useMiningStore
        .getState()
        .abortSession(
          reason.reason === 'timeout'
            ? resilience.miningTimeout
            : reason.reason === 'cancelled'
              ? resilience.miningCancelled
              : resilience.workerRestarting,
        );
    } else {
      useMiningStore
        .getState()
        .setConformanceError(
          getMiningEvidenceCopy(usePreferencesStore.getState().locale).conformanceFailed,
        );
    }
  }
}
