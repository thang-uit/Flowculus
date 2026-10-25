import type { Edge, Node } from '@xyflow/react';
import { routeOrthogonalEdge } from '@flowculus/graph-layout';
import { routeHintForNode } from '@flowculus/file-formats';

import {
  getNodeBounds,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

/**
 * Browser adapter between the serialisable `ProcessModel` and React Flow.
 * Geometry lives in the model; React Flow only holds transient drag frames.
 */

export interface ProcessFlowNodeData extends Record<string, unknown> {
  node: ProcessNode;
  critical: boolean;
}

export type ProcessFlowNode = Node<ProcessFlowNodeData, 'process'>;

export interface ProcessFlowEdgeData extends Record<string, unknown> {
  edge: ProcessEdge;
  critical: boolean;
}

export type ProcessFlowEdge = Edge<ProcessFlowEdgeData, 'flow'>;

export const toFlowNodes = (
  model: ProcessModel,
  criticalNodeIds: ReadonlySet<string>,
  selectedNodeIds: ReadonlySet<string>,
): ProcessFlowNode[] =>
  Object.values(model.nodes).map((node) => {
    const bounds = getNodeBounds(node);
    return {
      id: node.id,
      type: 'process',
      position: { x: bounds.x, y: bounds.y },
      width: bounds.width,
      height: bounds.height,
      selected: selectedNodeIds.has(node.id),
      zIndex: node.kind === 'annotation' || node.kind === 'data' ? 0 : 1,
      data: { node, critical: criticalNodeIds.has(node.id) },
    };
  });

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
