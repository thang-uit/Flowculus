'use client';

import { CheckCircle, Trash, WarningCircle } from '@phosphor-icons/react';

import type { ProcessNode } from '@flowculus/process-model';
import { unconfirmedNodeCodes } from '@flowculus/validation';

import { ConfirmedChip } from '@/components/semantics/ConfirmedChip';

import {
  InspectorSection,
  NumberField,
  SelectField,
  TextField,
} from '@/components/inspector/InspectorFields';
import { getWorkspaceCopy } from '@/lib/i18n';
import { ActivityTimeSummary } from '@/components/inspector/ActivityTimeSummary';
import { GatewaySection } from '@/components/inspector/GatewaySection';
import { changeNodeKind, removeElements, replaceNode } from '@/lib/model-editing';
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

  const commit = (next: ProcessNode) => {
    const state = useWorkspaceStore.getState();
    state.commitModel(replaceNode(state.processModel, next));
  };
  const updateCost = (patch: Partial<NonNullable<ProcessNode['cost']>>) =>
    commit({ ...node, cost: { ...node.cost, ...patch } });
  const pending = unconfirmedNodeCodes(node);
  const inferred = node.kind !== 'unknown' && pending.length > 0;
  const confirmSemanticItems = useWorkspaceStore((state) => state.confirmSemanticItems);
  const isActivity = node.kind === 'task' || node.kind === 'subprocess';
  const fieldKey = (field: string, value: unknown) =>
    `${node.id}:${field}:${String(value)}`;

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">
          {copy.shapeTypes[node.kind] ?? copy.shapeTypes.unknown}
          {node.kind === 'gateway'
            ? ` · ${node.gatewayKind?.toUpperCase() ?? 'XOR'}`
            : ''}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {pending.length === 0 ? <ConfirmedChip metadata={node.metadata} /> : null}
          <span
            className="truncate font-mono text-[10px] text-[var(--muted)]"
            title={node.id}
          >
            {node.id}
          </span>
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
          <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-[var(--muted-strong)]">
            {pending.map((code) => (
              <li key={code}>{copy.semantics.codes[code]}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              confirmSemanticItems([{ elementType: 'node', elementId: node.id }])
            }
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
            <ActivityTimeSummary node={node} />
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

      {node.kind === 'gateway' ? <GatewaySection node={node} /> : null}

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
