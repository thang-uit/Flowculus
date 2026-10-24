'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react';
import { memo, useMemo } from 'react';

import { formatFlowLabel } from '@flowculus/drawio-adapter';
import { getNodeBounds } from '@flowculus/process-model';
import { routeHintForNode } from '@flowculus/file-formats';
import {
  roundedPolylinePath,
  routeOrthogonalEdge,
  type Rect,
} from '@flowculus/graph-layout';

import type { ProcessFlowEdge, ProcessFlowNode } from '@/lib/canvas-flow';
import { useWorkspaceStore } from '@/lib/workspace-store';

const internalRect = (node: InternalNode<ProcessFlowNode>): Rect => ({
  x: node.internals.positionAbsolute.x,
  y: node.internals.positionAbsolute.y,
  width: node.measured.width ?? node.width ?? 0,
  height: node.measured.height ?? node.height ?? 0,
});

/**
 * Floating sequence flow: endpoints follow the live node positions during a
 * drag (React Flow internals, not React state), and the route uses the same
 * orthogonal router as the SVG and draw.io exports.
 */
function SequenceFlowEdgeComponent({
  id,
  source,
  target,
  data,
  selected,
  markerEnd,
}: EdgeProps<ProcessFlowEdge>) {
  const sourceNode = useInternalNode<ProcessFlowNode>(source);
  const targetNode = useInternalNode<ProcessFlowNode>(target);
  // Committed positions of the other shapes: routes avoid them, and the list
  // only changes when the model is committed, never on a drag frame.
  const modelNodes = useWorkspaceStore((state) => state.processModel.nodes);
  const obstacles = useMemo(
    () =>
      Object.values(modelNodes)
        .filter((node) => node.id !== source && node.id !== target)
        .map(getNodeBounds),
    [modelNodes, source, target],
  );
  if (!sourceNode || !targetNode || !data) return null;

  const route = routeOrthogonalEdge(
    internalRect(sourceNode),
    internalRect(targetNode),
    {
      source: routeHintForNode(sourceNode.data.node),
      target: routeHintForNode(targetNode.data.node),
    },
    obstacles,
  );
  const path = roundedPolylinePath(route.points, 10);
  const { edge, critical } = data;
  const label = formatFlowLabel(edge);
  const kindClass =
    edge.kind === 'message'
      ? ' flow-edge-path--message'
      : edge.kind === 'association'
        ? ' flow-edge-path--association'
        : '';

  return (
    <>
      {critical ? <path d={path} className="flow-edge-glow" /> : null}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={edge.kind === 'association' ? undefined : markerEnd}
        className={`flow-edge-path${kindClass}${critical ? ' flow-edge-path--critical' : ''}`}
        interactionWidth={18}
      />
      {critical ? <path d={path} className="flow-edge-flow" /> : null}
      {label ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="flow-edge-label nodrag nopan focus-ring"
            data-critical={critical || undefined}
            data-selected={selected || undefined}
            style={{ left: route.labelPoint.x, top: route.labelPoint.y }}
            onClick={() =>
              useWorkspaceStore.getState().setSelection({ nodeIds: [], edgeId: id })
            }
            aria-label={label}
            title={label}
          >
            {label}
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const SequenceFlowEdge = memo(SequenceFlowEdgeComponent);
