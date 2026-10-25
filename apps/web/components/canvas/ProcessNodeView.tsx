'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo, useEffect, useRef, useState } from 'react';

import { unconfirmedNodeCodes } from '@flowculus/validation';

import { GatewayGlyph } from '@/components/canvas/GatewayGlyph';
import { EditableLabel } from '@/components/canvas/NodeLabel';
import { NodeQuickActions } from '@/components/canvas/NodeQuickActions';
import { TaskChips } from '@/components/canvas/TaskChips';
import type { ProcessFlowNode } from '@/lib/canvas-flow';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

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

function ProcessNodeViewComponent({
  id,
  data,
  selected,
  dragging,
}: NodeProps<ProcessFlowNode>) {
  const locale = usePreferencesStore((state) => state.locale);
  const isHand = useWorkspaceStore((state) => state.activeTool === 'hand');
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

  const inferred = unconfirmedNodeCodes(node).length > 0;
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
        if (isHand) return;
        event.stopPropagation();
        setEditing(true);
      }}
    >
      {!isHand ? <NodeHandles /> : null}
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
        visible={
          !isHand && !dragging && !editing && (hovered || (selected && singleSelection))
        }
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
