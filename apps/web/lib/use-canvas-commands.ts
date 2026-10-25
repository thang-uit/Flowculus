'use client';

import { useReactFlow, useStoreApi } from '@xyflow/react';
import { useCallback } from 'react';

import { getNodeBounds } from '@flowculus/process-model';

import type { ProcessFlowEdge, ProcessFlowNode } from '@/lib/canvas-flow';
import { addNodeAt, findFreeRect } from '@/lib/model-editing';
import type { SemanticShapeTool } from '@/lib/shape-tools';
import { useWorkspaceStore } from '@/lib/workspace-store';

const ZOOM_DURATION_MS = 160;

/**
 * Canvas commands for controls outside the canvas (header, palette). Must be
 * used below the workspace `ReactFlowProvider`.
 */
export function useCanvasCommands() {
  const flow = useReactFlow<ProcessFlowNode, ProcessFlowEdge>();
  const store = useStoreApi<ProcessFlowNode, ProcessFlowEdge>();

  const insertShapeAtCentre = useCallback(
    (tool: SemanticShapeTool, label: string) => {
      const bounds = store.getState().domNode?.getBoundingClientRect();
      const centre = bounds
        ? flow.screenToFlowPosition({
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          })
        : { x: 240, y: 200 };
      const state = useWorkspaceStore.getState();
      state.setActiveTool('select');
      const created = addNodeAt(state.processModel, tool, label, centre);
      const node = created.model.nodes[created.nodeId];
      const placed = {
        ...node,
        bounds: findFreeRect(created.model, getNodeBounds(node), node.id),
      };
      state.commitModel({
        ...created.model,
        nodes: { ...created.model.nodes, [placed.id]: placed },
      });
      state.setSelection({ nodeIds: [placed.id], edgeId: null });
    },
    [flow, store],
  );

  const zoomIn = useCallback(
    () => void flow.zoomIn({ duration: ZOOM_DURATION_MS }),
    [flow],
  );
  const zoomOut = useCallback(
    () => void flow.zoomOut({ duration: ZOOM_DURATION_MS }),
    [flow],
  );
  const fit = useCallback(
    () => void flow.fitView({ padding: 0.18, maxZoom: 1.25, duration: 220 }),
    [flow],
  );
  const resetZoom = useCallback(
    () => void flow.zoomTo(1, { duration: ZOOM_DURATION_MS }),
    [flow],
  );

  return { insertShapeAtCentre, zoomIn, zoomOut, fit, resetZoom };
}
