'use client';

import { ArrowRight, Trash } from '@phosphor-icons/react';

import type { ProcessEdge } from '@flowculus/process-model';

import {
  NumberField,
  SelectField,
  TextField,
} from '@/components/inspector/InspectorFields';
import { getWorkspaceCopy } from '@/lib/i18n';
import { removeElements, replaceEdge } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';

type FlowKind = NonNullable<ProcessEdge['kind']>;

export function EdgeInspector({ edge }: Readonly<{ edge: ProcessEdge }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const source = useWorkspaceStore((state) => state.processModel.nodes[edge.source]);
  const target = useWorkspaceStore((state) => state.processModel.nodes[edge.target]);

  const commit = (next: ProcessEdge) => {
    const state = useWorkspaceStore.getState();
    state.commitModel(replaceEdge(state.processModel, next));
  };
  const branching = source?.kind === 'gateway' && source.gatewayKind !== 'and';

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-strong)]">
          {copy.sequenceFlow}
        </span>
        <span
          className="truncate font-mono text-[10px] text-[var(--muted)]"
          title={edge.id}
        >
          {edge.id}
        </span>
      </div>
      <p className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--muted-strong)]">
        <span className="truncate">{source?.label ?? edge.source}</span>
        <ArrowRight
          size={13}
          className="shrink-0 text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <span className="truncate">{target?.label ?? edge.target}</span>
      </p>
      <TextField
        key={`${edge.id}:condition:${edge.condition ?? ''}`}
        label={copy.condition}
        value={edge.condition}
        onCommit={(condition) => commit({ ...edge, condition })}
      />
      <NumberField
        key={`${edge.id}:p:${String(edge.probability)}`}
        label={copy.probability}
        value={edge.probability}
        scale={100}
        max={100}
        suffix={copy.percent}
        onCommit={(probability) => commit({ ...edge, probability })}
        errorMessage={copy.invalidProbability}
      />
      {!branching && edge.probability == null ? (
        <p className="text-[11px] leading-5 text-[var(--muted)]">
          {copy.probabilityOnlyForDecisions}
        </p>
      ) : null}
      <SelectField<FlowKind>
        label={copy.flowKind}
        value={edge.kind ?? 'sequence'}
        options={[
          { value: 'sequence', label: copy.sequenceFlow },
          { value: 'message', label: copy.messageFlow },
          { value: 'association', label: copy.associationFlow },
        ]}
        onChange={(kind) => commit({ ...edge, kind })}
      />
      <div className="border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={() => {
            const state = useWorkspaceStore.getState();
            state.commitModel(removeElements(state.processModel, [], [edge.id]));
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
