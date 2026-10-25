'use client';

import { isSequenceFlowEdge, type ProcessNode } from '@flowculus/process-model';

import {
  InspectorSection,
  NumberField,
  SelectField,
} from '@/components/inspector/InspectorFields';
import { JoinPairingField } from '@/components/inspector/JoinPairingField';
import { getWorkspaceCopy } from '@/lib/i18n';
import { changeNodeKind, replaceEdge, replaceNode } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Gateway kind, explicit join pairing and branch probabilities. */
export function GatewaySection({ node }: Readonly<{ node: ProcessNode }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const edges = useWorkspaceStore((state) => state.processModel.edges);
  const nodes = useWorkspaceStore((state) => state.processModel.nodes);
  const commit = (next: ProcessNode) => {
    const state = useWorkspaceStore.getState();
    state.commitModel(replaceNode(state.processModel, next));
  };
  const outgoing = Object.values(edges).filter(
    (edge) => edge.source === node.id && isSequenceFlowEdge(edge),
  );
  const probabilitySum = outgoing.reduce((sum, edge) => sum + (edge.probability ?? 0), 0);
  const gatewayBehaviour =
    node.gatewayKind === 'and'
      ? copy.parallelPaths
      : node.gatewayKind === 'or'
        ? copy.inclusivePaths
        : node.gatewayKind === 'eventBased'
          ? copy.eventChoice
          : node.gatewayKind === 'complex'
            ? copy.complexChoice
            : copy.exactlyOnePath;

  return (
    <InspectorSection title={copy.branchBehavior}>
      <SelectField
        label={copy.gatewayKind}
        value={node.gatewayKind ?? 'xor'}
        options={[
          { value: 'xor', label: copy.xorGateway },
          { value: 'and', label: copy.andGateway },
          { value: 'or', label: copy.orGateway },
          { value: 'eventBased', label: copy.eventBasedGateway },
          { value: 'complex', label: copy.complexGateway },
        ]}
        onChange={(gatewayKind) => commit(changeNodeKind(node, 'gateway', gatewayKind))}
      />
      {(node.gatewayKind === 'and' || node.gatewayKind === 'or') &&
      outgoing.length > 1 ? (
        <JoinPairingField node={node} />
      ) : null}
      <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs leading-5 text-[var(--muted-strong)]">
        {gatewayBehaviour}
        {node.gatewayKind !== 'and' ? ` ${copy.addProbabilities}` : null}
      </p>
      {node.gatewayKind !== 'and' && outgoing.length > 0 ? (
        <div className="space-y-2">
          {outgoing.map((edge) => (
            <div
              key={edge.id}
              className="grid grid-cols-[minmax(0,1fr)_6rem] items-end gap-2 rounded-lg border border-[var(--border)] p-2"
            >
              <span
                className="truncate pb-2 text-xs text-[var(--muted-strong)]"
                title={edge.id}
              >
                → {edge.condition || nodes[edge.target]?.label || edge.target}
              </span>
              <NumberField
                key={`${edge.id}:${String(edge.probability)}`}
                label={copy.probability}
                value={edge.probability}
                scale={100}
                max={100}
                suffix={copy.percent}
                onCommit={(probability) => {
                  const state = useWorkspaceStore.getState();
                  state.commitModel(
                    replaceEdge(state.processModel, { ...edge, probability }),
                  );
                }}
                errorMessage={copy.invalidProbability}
              />
            </div>
          ))}
          {node.gatewayKind === 'xor' || node.gatewayKind == null ? (
            <p
              className={
                Math.abs(probabilitySum - 1) > 1e-6
                  ? 'text-[11px] text-[var(--danger)]'
                  : 'text-[11px] text-[var(--muted)]'
              }
              role={Math.abs(probabilitySum - 1) > 1e-6 ? 'alert' : undefined}
            >
              Σ p = {Number((probabilitySum * 100).toFixed(2))}%
            </p>
          ) : null}
        </div>
      ) : null}
    </InspectorSection>
  );
}
