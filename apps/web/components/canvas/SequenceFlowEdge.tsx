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
import { routeHintForNode, routeProcessEdge } from '@flowculus/file-formats';
import { type Rect } from '@flowculus/graph-layout';

import type { ProcessFlowEdge, ProcessFlowNode } from '@/lib/canvas-flow';
import { EdgeRouteControls } from './EdgeRouteControls';
import { EdgeEndpointControls } from './EdgeEndpointControls';
import { useEdgeRouteEditing } from '@/lib/use-edge-route-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { inspectCanvasElement } from '@/lib/canvas-inspector';

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
  const editing = useEdgeRouteEditing(id);
  const activeTool = useWorkspaceStore((state) => state.activeTool);
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

  const { edge, critical } = data;
  const waypoints = edge.routing?.waypoints ?? [];
  const previewWaypoints = editing.preview ?? waypoints;
  const route = routeProcessEdge(
    {
      ...edge,
      routing: {
        ...edge.routing,
        style: edge.routing?.style ?? 'orthogonal',
        waypoints: previewWaypoints,
      },
    },
    internalRect(sourceNode),
    internalRect(targetNode),
    {
      source: routeHintForNode(sourceNode.data.node),
      target: routeHintForNode(targetNode.data.node),
    },
    obstacles,
  );
  const path = route.path;
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
      {edge.kind === 'message' && route.points[0] ? (
        <circle
          cx={route.points[0].x}
          cy={route.points[0].y}
          r={3}
          fill="var(--surface)"
          stroke="var(--flow-edge)"
          strokeWidth={1.5}
        />
      ) : null}
      {label ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="flow-edge-label nodrag nopan focus-ring"
            data-critical={critical || undefined}
            data-selected={selected || undefined}
            style={{ left: route.labelPoint.x, top: route.labelPoint.y }}
            onClick={(event) => inspectCanvasElement(event, 'edge', id)}
            aria-label={label}
            title={label}
          >
            {label}
          </button>
        </EdgeLabelRenderer>
      ) : null}
      {selected && activeTool === 'select' ? (
        <>
          <EdgeRouteControls
            waypoints={previewWaypoints}
            route={editing.controlRoute ?? route.points}
            editing={editing}
          />
          <EdgeEndpointControls edge={edge} points={route.points} />
        </>
      ) : null}
    </>
  );
}

export const SequenceFlowEdge = memo(SequenceFlowEdgeComponent);
