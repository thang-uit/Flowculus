'use client';

import { CheckCircle, Trash, WarningCircle } from '@phosphor-icons/react';

import { isSequenceFlowEdge, type ProcessNode } from '@flowculus/process-model';

import {
  InspectorSection,
  NumberField,
  SelectField,
  TextField,
} from '@/components/inspector/InspectorFields';
import { getWorkspaceCopy } from '@/lib/i18n';
import {
  changeNodeKind,
  confirmNodeSemantics,
  isNodeInferred,
  removeElements,
  replaceEdge,
  replaceNode,
} from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';

const NODE_KINDS: Array<ProcessNode['kind']> = [
  'task',
  'subprocess',
  'gateway',
  'start',
  'event',
  'end',
  'data',
  'annotation',
];

export function NodeInspector({ node }: Readonly<{ node: ProcessNode }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const edges = useWorkspaceStore((state) => state.processModel.edges);
  const nodes = useWorkspaceStore((state) => state.processModel.nodes);

  const commit = (next: ProcessNode) => {
    const state = useWorkspaceStore.getState();
    state.commitModel(replaceNode(state.processModel, next));
  };
  const updateCost = (patch: Partial<NonNullable<ProcessNode['cost']>>) =>
    commit({ ...node, cost: { ...node.cost, ...patch } });
  const inferred = isNodeInferred(node);
  const isActivity = node.kind === 'task' || node.kind === 'subprocess';
  const outgoing = Object.values(edges).filter(
    (edge) => edge.source === node.id && isSequenceFlowEdge(edge),
  );
  const probabilitySum = outgoing.reduce((sum, edge) => sum + (edge.probability ?? 0), 0);
  const fieldKey = (field: string, value: unknown) =>
    `${node.id}:${field}:${String(value)}`;
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
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">
          {copy.shapeTypes[node.kind] ?? copy.shapeTypes.unknown}
          {node.kind === 'gateway'
            ? ` · ${node.gatewayKind?.toUpperCase() ?? 'XOR'}`
            : ''}
        </span>
        <span
          className="truncate font-mono text-[10px] text-[var(--muted)]"
          title={node.id}
        >
          {node.id}
        </span>
      </div>

      <TextField
        key={fieldKey('label', node.label)}
        label={copy.label}
        value={node.label}
        onCommit={(label) => label && commit({ ...node, label })}
      />

      {inferred ? (
        <div className="space-y-2 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <p className="flex items-start gap-2 text-[11px] leading-5 text-[var(--muted-strong)]">
            <WarningCircle
              size={15}
              className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
              aria-hidden="true"
            />
            {copy.inferredTypeHint}
          </p>
          <button
            type="button"
            onClick={() => commit(confirmNodeSemantics(node))}
            className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent-ink)]"
          >
            <CheckCircle size={14} weight="bold" aria-hidden="true" />
            {copy.confirmType}
          </button>
        </div>
      ) : null}

      <SelectField
        label={copy.semanticType}
        value={node.kind}
        options={NODE_KINDS.map((kind) => ({
          value: kind,
          label: copy.shapeTypes[kind] ?? kind,
        }))}
        onChange={(kind) => commit(changeNodeKind(node, kind))}
      />

      {isActivity ? (
        <>
          <InspectorSection
            title={copy.timeInputs}
            aside={
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                {copy.minutes}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                key={fieldKey('processing', node.processingMinutes)}
                label={`${copy.processing} (T)`}
                value={node.processingMinutes}
                onCommit={(processingMinutes) => commit({ ...node, processingMinutes })}
                errorMessage={copy.invalidNumber}
              />
              <NumberField
                key={fieldKey('waiting', node.waitingMinutes)}
                label={`${copy.waiting} (Wq)`}
                value={node.waitingMinutes}
                onCommit={(waitingMinutes) => commit({ ...node, waitingMinutes })}
                errorMessage={copy.invalidNumber}
              />
              <NumberField
                key={fieldKey('duration', node.durationMinutes)}
                label={copy.cycleMinutes}
                value={node.durationMinutes}
                onCommit={(durationMinutes) => commit({ ...node, durationMinutes })}
                errorMessage={copy.invalidNumber}
              />
              <NumberField
                key={fieldKey('rework', node.reworkProbability)}
                label={`${copy.rework} (r)`}
                value={node.reworkProbability}
                scale={100}
                maxExclusive={100}
                suffix={copy.percent}
                onCommit={(reworkProbability) => commit({ ...node, reworkProbability })}
                errorMessage={copy.invalidReworkProbability}
              />
            </div>
            <p className="text-[11px] leading-5 text-[var(--muted)]">
              {copy.timeInputsHint}
            </p>
          </InspectorSection>

          <InspectorSection title={copy.costInputs}>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                key={fieldKey('rate', node.cost?.resourceRatePerHour)}
                label={copy.hourlyRate}
                value={node.cost?.resourceRatePerHour}
                onCommit={(resourceRatePerHour) => updateCost({ resourceRatePerHour })}
                errorMessage={copy.invalidNumber}
              />
              <NumberField
                key={fieldKey('fixed', node.cost?.otherCostPerExecution)}
                label={copy.fixedCost}
                value={node.cost?.otherCostPerExecution}
                onCommit={(otherCostPerExecution) =>
                  updateCost({ otherCostPerExecution })
                }
                errorMessage={copy.invalidNumber}
              />
              <TextField
                key={fieldKey('pool', node.cost?.resourcePoolId)}
                label={copy.resourcePool}
                value={node.cost?.resourcePoolId}
                onCommit={(resourcePoolId) => updateCost({ resourcePoolId })}
              />
              <NumberField
                key={fieldKey('count', node.cost?.resourceCount)}
                label={copy.resourceCount}
                value={node.cost?.resourceCount}
                integer
                onCommit={(resourceCount) =>
                  updateCost({
                    resourceCount: resourceCount === 0 ? undefined : resourceCount,
                  })
                }
                errorMessage={copy.invalidInteger}
              />
              <TextField
                key={fieldKey('currency', node.cost?.currency)}
                label={copy.currency}
                value={node.cost?.currency}
                maxLength={3}
                uppercase
                onCommit={(currency) => updateCost({ currency })}
              />
            </div>
          </InspectorSection>
        </>
      ) : null}

      {node.kind === 'gateway' ? (
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
            onChange={(gatewayKind) =>
              commit(changeNodeKind(node, 'gateway', gatewayKind))
            }
          />
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
      ) : null}

      <div className="border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={() => {
            const state = useWorkspaceStore.getState();
            state.commitModel(removeElements(state.processModel, [node.id], []));
          }}
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-strong)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
        >
          <Trash size={14} aria-hidden="true" />
          {copy.deleteElement}
        </button>
      </div>
    </div>
  );
}
