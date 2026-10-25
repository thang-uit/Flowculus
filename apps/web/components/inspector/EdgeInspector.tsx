'use client';

import { useState } from 'react';

import { ArrowRight, CheckCircle, Trash } from '@phosphor-icons/react';

import type { ProcessEdge } from '@flowculus/process-model';
import { insertEdgeWaypoint } from '@flowculus/file-formats';
import { unconfirmedEdgeCodes } from '@flowculus/validation';

import { ConfirmedChip } from '@/components/semantics/ConfirmedChip';
import { EdgeAttachmentFields } from './EdgeAttachmentFields';
import {
  NumberField,
  SelectField,
  TextField,
} from '@/components/inspector/InspectorFields';
import { getWorkspaceCopy } from '@/lib/i18n';
import { reconnectEdge, removeElements, replaceEdge } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

type FlowKind = NonNullable<ProcessEdge['kind']>;
type RouteStyle = NonNullable<ProcessEdge['routing']>['style'];

export function EdgeInspector({ edge }: Readonly<{ edge: ProcessEdge }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const source = useWorkspaceStore((state) => state.processModel.nodes[edge.source]);
  const target = useWorkspaceStore((state) => state.processModel.nodes[edge.target]);
  const nodes = useWorkspaceStore((state) => state.processModel.nodes);
  const [connectionError, setConnectionError] = useState(false);

  const commit = (next: ProcessEdge) => {
    const state = useWorkspaceStore.getState();
    state.commitModel(replaceEdge(state.processModel, next));
  };
  const branching = source?.kind === 'gateway' && source.gatewayKind !== 'and';
  const confirmSemanticItems = useWorkspaceStore((state) => state.confirmSemanticItems);
  const pending = unconfirmedEdgeCodes(edge);
  const reconnect = (sourceId: string, targetId: string) => {
    const state = useWorkspaceStore.getState();
    const next = reconnectEdge(state.processModel, edge.id, sourceId, targetId);
    setConnectionError(!next);
    if (next && next !== state.processModel) state.commitModel(next);
  };
  const nodeOptions = Object.values(nodes).map((node) => ({
    value: node.id,
    label: `${node.label} · ${node.id}`,
  }));

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-strong)]">
          {copy.sequenceFlow}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {pending.length === 0 ? <ConfirmedChip metadata={edge.metadata} /> : null}
          <span
            className="truncate font-mono text-[10px] text-[var(--muted)]"
            title={edge.id}
          >
            {edge.id}
          </span>
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
      <div className="grid grid-cols-2 gap-2">
        <SelectField<string>
          label={copy.edgeReconnectSource}
          value={edge.source}
          options={nodeOptions}
          onChange={(sourceId) => reconnect(sourceId, edge.target)}
        />
        <SelectField<string>
          label={copy.edgeReconnectTarget}
          value={edge.target}
          options={nodeOptions}
          onChange={(targetId) => reconnect(edge.source, targetId)}
        />
      </div>
      <EdgeAttachmentFields edge={edge} />
      {connectionError ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {copy.edgeReconnectInvalid}
        </p>
      ) : null}
      {pending.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-[var(--muted-strong)]">
            {pending.map((code) => (
              <li key={code}>{copy.semantics.codes[code]}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              confirmSemanticItems([{ elementType: 'edge', elementId: edge.id }])
            }
            className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent-ink)]"
          >
            <CheckCircle size={14} weight="bold" aria-hidden="true" />
            {copy.semantics.confirmElement}
          </button>
        </div>
      ) : null}
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
      <SelectField<RouteStyle>
        label={copy.edgeRoute}
        value={edge.routing?.style ?? 'orthogonal'}
        options={[
          { value: 'orthogonal', label: copy.edgeOrthogonal },
          { value: 'straight', label: copy.edgeStraight },
          { value: 'curved', label: copy.edgeCurved },
        ]}
        onChange={(style) =>
          commit({
            ...edge,
            routing: { ...edge.routing, style, waypoints: edge.routing?.waypoints ?? [] },
          })
        }
      />
      <p className="text-xs leading-5 text-[var(--muted)]">{copy.edgeEditHint}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="focus-ring rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--surface-soft)]"
          onClick={() => {
            if (!source || !target || (edge.routing?.waypoints.length ?? 0) >= 32) return;
            const from = source.bounds;
            const to = target.bounds;
            if (!from || !to) return;
            const point = {
              x: (from.x + from.width / 2 + to.x + to.width / 2) / 2,
              y: (from.y + from.height / 2 + to.y + to.height / 2) / 2,
            };
            commit({
              ...edge,
              routing: {
                ...edge.routing,
                style: edge.routing?.style ?? 'orthogonal',
                waypoints: insertEdgeWaypoint(
                  edge.routing?.waypoints ?? [],
                  point,
                  { x: from.x + from.width / 2, y: from.y + from.height / 2 },
                  { x: to.x + to.width / 2, y: to.y + to.height / 2 },
                ),
              },
            });
          }}
        >
          {copy.edgeAddWaypoint}
        </button>
        {(edge.routing?.waypoints.length ?? 0) > 0 ? (
          <button
            type="button"
            className="focus-ring rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--surface-soft)]"
            onClick={() =>
              commit({
                ...edge,
                routing: {
                  ...edge.routing,
                  style: edge.routing?.style ?? 'orthogonal',
                  waypoints: [],
                },
              })
            }
          >
            {copy.edgeClearWaypoints}
          </button>
        ) : null}
      </div>
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
