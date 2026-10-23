'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { formatCompactMinutes } from '@flowculus/file-formats';
import type { ProcessNode } from '@flowculus/process-model';

import { NodeQuickActions } from '@/components/canvas/NodeQuickActions';
import type { ProcessFlowNode } from '@/lib/canvas-flow';
import { formatCost, formatPercent } from '@/lib/format';
import { getWorkspaceCopy, type WorkspaceCopy } from '@/lib/i18n';
import { isNodeInferred, replaceNode } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';

const HANDLE_SIDES = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;
const HIDE_DELAY_MS = 160;

function NodeHandles() {
  return (
    <>
      {HANDLE_SIDES.map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={side}
          className="flow-handle"
        />
      ))}
    </>
  );
}

function LabelInput({
  node,
  onDone,
}: Readonly<{ node: ProcessNode; onDone: () => void }>) {
  const [draft, setDraft] = useState(node.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const label = draft.trim();
    if (label && label !== node.label) {
      const state = useWorkspaceStore.getState();
      const current = state.processModel.nodes[node.id];
      if (current)
        state.commitModel(replaceNode(state.processModel, { ...current, label }));
    }
    onDone();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') onDone();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label={node.label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="flow-label-input nodrag nopan"
    />
  );
}

function EditableLabel({
  node,
  editing,
  onDone,
  className,
}: Readonly<{
  node: ProcessNode;
  editing: boolean;
  onDone: () => void;
  className: string;
}>) {
  return editing ? (
    <LabelInput node={node} onDone={onDone} />
  ) : (
    <span className={className}>{node.label}</span>
  );
}

function TaskChips({ node, copy }: Readonly<{ node: ProcessNode; copy: WorkspaceCopy }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const processing = node.processingMinutes ?? node.durationMinutes;
  const chips: Array<{ key: string; text: string; title: string; accent?: boolean }> = [];
  if (processing != null) {
    chips.push({
      key: 't',
      text: `T ${formatCompactMinutes(processing)}`,
      title: copy.processing,
    });
  }
  if (node.waitingMinutes != null && node.waitingMinutes > 0) {
    chips.push({
      key: 'wq',
      text: `Wq ${formatCompactMinutes(node.waitingMinutes)}`,
      title: copy.waiting,
    });
  }
  if (node.cost?.resourceRatePerHour != null) {
    chips.push({
      key: 'rate',
      text: `${formatCost(node.cost.resourceRatePerHour, node.cost.currency, locale)}/h`,
      title: copy.hourlyRate,
    });
  } else if (node.cost?.otherCostPerExecution != null) {
    chips.push({
      key: 'fixed',
      text: formatCost(node.cost.otherCostPerExecution, node.cost.currency, locale) ?? '',
      title: copy.fixedCost,
    });
  }
  if (node.reworkProbability != null && node.reworkProbability > 0) {
    chips.push({
      key: 'r',
      text: `r ${formatPercent(node.reworkProbability, 0)}`,
      title: copy.rework,
      accent: true,
    });
  }
  return (
    <div className="flow-chips">
      {chips.length === 0 ? (
        <span className="flow-chip flow-chip--empty" title={copy.timeInputs}>
          T –
        </span>
      ) : (
        chips.map((chip) => (
          <span
            key={chip.key}
            className={chip.accent ? 'flow-chip flow-chip--accent' : 'flow-chip'}
            title={chip.title}
          >
            {chip.text}
          </span>
        ))
      )}
    </div>
  );
}

function GatewayGlyph({ kind }: Readonly<{ kind: ProcessNode['gatewayKind'] }>) {
  switch (kind) {
    case 'and':
      return (
        <path
          className="flow-shape__glyph"
          strokeWidth="5"
          d="M 34 50 H 66 M 50 34 V 66"
        />
      );
    case 'or':
      return (
        <circle className="flow-shape__glyph" strokeWidth="4.5" cx="50" cy="50" r="15" />
      );
    case 'complex':
      return (
        <path
          className="flow-shape__glyph"
          strokeWidth="4.5"
          d="M 34 50 H 66 M 50 34 V 66 M 39 39 L 61 61 M 61 39 L 39 61"
        />
      );
    case 'eventBased':
      return (
        <g className="flow-shape__glyph" strokeWidth="2">
          <circle cx="50" cy="50" r="18" />
          <circle cx="50" cy="50" r="14.5" />
          <polygon points="50,41 58.6,47.2 55.3,57.3 44.7,57.3 41.4,47.2" />
        </g>
      );
    default:
      return (
        <path
          className="flow-shape__glyph"
          strokeWidth="5"
          d="M 38 38 L 62 62 M 62 38 L 38 62"
        />
      );
  }
}

function ProcessNodeViewComponent({
  id,
  data,
  selected,
  dragging,
}: NodeProps<ProcessFlowNode>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const singleSelection = useWorkspaceStore((state) => state.selectedNodeIds.length <= 1);
  const copy = getWorkspaceCopy(locale);
  const { node, critical } = data;
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    },
    [],
  );

  const show = () => {
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
    setHovered(true);
  };
  const hide = () => {
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setHovered(false);
    }, HIDE_DELAY_MS);
  };

  const inferred = isNodeInferred(node);
  const typeLabel =
    node.kind === 'gateway'
      ? `${copy.shapeTypes.gateway} ${node.gatewayKind?.toUpperCase() ?? 'XOR'}`
      : (copy.shapeTypes[node.kind] ?? copy.shapeTypes.unknown);
  const label = (
    <EditableLabel
      node={node}
      editing={editing}
      onDone={() => setEditing(false)}
      className={
        node.kind === 'task' || node.kind === 'subprocess' ? 'flow-task__title' : ''
      }
    />
  );

  let body;
  switch (node.kind) {
    case 'start':
    case 'end':
    case 'event':
      body = (
        <>
          <svg className="flow-shape" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              className={`flow-shape__body ${node.kind === 'start' ? 'flow-shape__body--start' : node.kind === 'end' ? 'flow-shape__body--end' : ''}`}
              cx="50"
              cy="50"
              r={node.kind === 'end' ? 44 : 46}
              vectorEffect="non-scaling-stroke"
            />
            {node.kind === 'event' ? (
              <circle
                className="flow-shape__body"
                cx="50"
                cy="50"
                r="37"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          <div className="flow-caption">{label}</div>
        </>
      );
      break;
    case 'gateway':
      body = (
        <>
          <svg className="flow-shape" viewBox="0 0 100 100" aria-hidden="true">
            <polygon
              className="flow-shape__body flow-shape__body--gateway"
              points="50,2 98,50 50,98 2,50"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <GatewayGlyph kind={node.gatewayKind} />
          </svg>
          <div className="flow-caption">{label}</div>
        </>
      );
      break;
    case 'data':
      body = (
        <>
          <svg
            className="flow-shape"
            viewBox="0 0 80 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="flow-shape__body"
              d="M 2 2 H 58 L 78 22 V 98 H 2 Z M 58 2 V 22 H 78"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="flow-caption">{label}</div>
        </>
      );
      break;
    case 'annotation':
      body = <div className="flow-annotation">{label}</div>;
      break;
    default:
      body = (
        <div
          className="flow-task"
          data-critical={critical || undefined}
          data-subprocess={node.kind === 'subprocess' || undefined}
        >
          {label}
          <TaskChips node={node} copy={copy} />
          {node.kind === 'subprocess' ? (
            <span className="flow-marker" aria-hidden="true">
              +
            </span>
          ) : null}
        </div>
      );
  }

  return (
    <div
      className="flow-node"
      data-critical={critical || undefined}
      role="group"
      aria-label={`${typeLabel}: ${node.label}`}
      onPointerEnter={show}
      onPointerLeave={hide}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
    >
      <NodeHandles />
      {body}
      {inferred ? (
        <span
          className="flow-badge"
          title={copy.inferredBadge}
          aria-label={copy.inferredBadge}
        >
          ?
        </span>
      ) : null}
      <NodeQuickActions
        nodeId={id}
        visible={!dragging && !editing && (hovered || (selected && singleSelection))}
        canContinue={
          node.kind !== 'end' && node.kind !== 'annotation' && node.kind !== 'data'
        }
        onPointerEnter={show}
        onPointerLeave={hide}
      />
    </div>
  );
}

export const ProcessNodeView = memo(
  ProcessNodeViewComponent,
  (previous, next) =>
    previous.data.node === next.data.node &&
    previous.data.critical === next.data.critical &&
    previous.selected === next.selected &&
    previous.dragging === next.dragging,
);
