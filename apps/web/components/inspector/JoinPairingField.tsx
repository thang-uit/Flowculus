'use client';

import { SEMANTIC_METADATA_KEYS, type ProcessNode } from '@flowculus/process-model';

import { SelectField } from '@/components/inspector/InspectorFields';
import { getWorkspaceCopy } from '@/lib/i18n';
import { replaceNode } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const AUTO = '';

/**
 * Optional explicit split → join pairing for AND/OR blocks. "Automatic" lets
 * the engine prove the join with post-dominance; an explicit pairing is
 * verified by the engine and rejected if it does not close the block.
 */
export function JoinPairingField({ node }: Readonly<{ node: ProcessNode }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const nodes = useWorkspaceStore((state) => state.processModel.nodes);
  const current = node.metadata?.[SEMANTIC_METADATA_KEYS.joinId];
  const candidates = Object.values(nodes).filter(
    (candidate) =>
      candidate.id !== node.id &&
      candidate.kind === 'gateway' &&
      candidate.gatewayKind === node.gatewayKind,
  );

  const commit = (joinId: string) => {
    const metadata = { ...node.metadata };
    if (joinId === AUTO) delete metadata[SEMANTIC_METADATA_KEYS.joinId];
    else metadata[SEMANTIC_METADATA_KEYS.joinId] = joinId;
    const state = useWorkspaceStore.getState();
    state.commitModel(
      replaceNode(state.processModel, {
        ...node,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      }),
    );
  };

  return (
    <div className="space-y-1.5">
      <SelectField<string>
        label={copy.quality.joinPairing}
        value={typeof current === 'string' ? current : AUTO}
        options={[
          { value: AUTO, label: copy.quality.joinPairingAuto },
          ...candidates.map((candidate) => ({
            value: candidate.id,
            label: candidate.label,
          })),
        ]}
        onChange={commit}
      />
      <p className="text-[11px] leading-4 text-[var(--muted)]">
        {copy.quality.joinPairingHint}
      </p>
    </div>
  );
}
