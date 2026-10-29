import type { Edge, Node } from '@xyflow/react';
import { routeOrthogonalEdge } from '@flowculus/graph-layout';
import { routeHintForNode } from '@flowculus/file-formats';

import {
  getNodeBounds,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
  type ProcessContainer,
} from '@flowculus/process-model';

/**
 * Browser adapter between the serialisable `ProcessModel` and React Flow.
 * Geometry lives in the model; React Flow only holds transient drag frames.
 */

export interface ProcessFlowNodeData extends Record<string, unknown> {
  node: ProcessNode;
  critical: boolean;
  container?: ProcessContainer;
}

export type ProcessFlowNode = Node<ProcessFlowNodeData, 'process' | 'container'>;

export interface ProcessFlowEdgeData extends Record<string, unknown> {
  edge: ProcessEdge;
  critical: boolean;
}

export type ProcessFlowEdge = Edge<ProcessFlowEdgeData, 'flow'>;

export const toFlowNodes = (
  model: ProcessModel,
  criticalNodeIds: ReadonlySet<string>,
  selectedNodeIds: ReadonlySet<string>,
): ProcessFlowNode[] => [
  ...Object.values(model.containers ?? {})
    .sort((left, right) => Number(left.kind === 'lane') - Number(right.kind === 'lane'))
    .map((container): ProcessFlowNode => {
      const parent = container.parentId
        ? model.containers?.[container.parentId]
        : undefined;
      return {
        id: container.id,
        type: 'container',
        draggable: true,
        dragHandle: '.process-container__label',
        deletable: true,
        connectable: false,
        parentId: parent?.id,
        position: {
          x: container.bounds.x - (parent?.bounds.x ?? 0),
          y: container.bounds.y - (parent?.bounds.y ?? 0),
        },
        width: container.bounds.width,
        height: container.bounds.height,
        zIndex: container.kind === 'pool' ? -2 : -1,
        selected: selectedNodeIds.has(container.id),
        data: {
          node: {
            id: container.id,
            label: container.label,
            kind: 'annotation',
            bounds: container.bounds,
          },
          container,
          critical: false,
        },
      };
    }),
  ...Object.values(model.nodes).map((node): ProcessFlowNode => {
    const bounds = getNodeBounds(node);
    const parent = model.containers?.[node.laneId ?? node.poolId ?? ''];
    return {
      id: node.id,
      type: 'process',
      parentId: parent?.id,
      position: {
        x: bounds.x - (parent?.bounds.x ?? 0),
        y: bounds.y - (parent?.bounds.y ?? 0),
      },
      width: bounds.width,
      height: bounds.height,
      selected: selectedNodeIds.has(node.id),
      zIndex: 1,
      data: { node, critical: criticalNodeIds.has(node.id) },
    };
  }),
];

export function absoluteCanvasPositions(
  nodes: ProcessFlowNode[],
): Record<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const positions: Record<string, { x: number; y: number }> = {};
  const resolve = (id: string, depth = 0): { x: number; y: number } => {
    if (positions[id]) return positions[id];
    const node = byId.get(id);
    if (!node || depth > 3) return { x: 0, y: 0 };
    const parent = node.parentId ? resolve(node.parentId, depth + 1) : { x: 0, y: 0 };
    return (positions[id] = {
      x: node.position.x + parent.x,
      y: node.position.y + parent.y,
    });
  };
  for (const node of nodes) resolve(node.id);
  return positions;
}

/** Ids of the SVG markers rendered once by the canvas (styled through CSS tokens). */
export const FLOW_MARKER_IDS = {
  default: 'flow-arrow',
  critical: 'flow-arrow-critical',
  open: 'flow-arrow-open',
} as const;

export const toFlowEdges = (
  model: ProcessModel,
  criticalEdgeIds: ReadonlySet<string>,
  selectedEdgeId: string | null,
  accessibleName?: (source: string, target: string) => string,
): ProcessFlowEdge[] =>
  Object.values(model.edges)
    .filter((edge) => model.nodes[edge.source] && model.nodes[edge.target])
    .map((edge) => {
      const source = model.nodes[edge.source];
      const target = model.nodes[edge.target];
      const sides = routeOrthogonalEdge(getNodeBounds(source), getNodeBounds(target), {
        source: routeHintForNode(source),
        target: routeHintForNode(target),
        sourceSide: edge.routing?.sourceSide,
        targetSide: edge.routing?.targetSide,
      });
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: sides.sourceSide,
        targetHandle: sides.targetSide,
        type: 'flow',
        selected: edge.id === selectedEdgeId,
        ariaLabel: accessibleName?.(
          model.nodes[edge.source]!.label,
          model.nodes[edge.target]!.label,
        ),
        markerEnd:
          edge.kind === 'message'
            ? FLOW_MARKER_IDS.open
            : criticalEdgeIds.has(edge.id)
              ? FLOW_MARKER_IDS.critical
              : FLOW_MARKER_IDS.default,
        data: { edge, critical: criticalEdgeIds.has(edge.id) },
      };
    });

/**
 * Keeps React Flow's measured size when the store hands over fresh node
 * objects, so an edit never makes nodes blink while they are re-measured.
 */
export const mergeMeasuredNodes = <T extends Node>(next: T[], previous: T[]): T[] => {
  const measured = new Map(previous.map((node) => [node.id, node.measured]));
  return next.map((node) => {
    const size = measured.get(node.id);
    return size ? { ...node, measured: size } : node;
  });
};
