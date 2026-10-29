'use client';

import { useReactFlow, useStoreApi } from '@xyflow/react';
import { useCallback } from 'react';

import { getNodeBounds } from '@flowculus/process-model';

import type { ProcessFlowEdge, ProcessFlowNode } from '@/lib/canvas-flow';
import { containingFrame } from '@/lib/container-membership';
import { addNodeAt, findFreeRect } from '@/lib/model-editing';
import { insertContainerAt, DEFAULT_POOL_SIZE } from '@/lib/container-placement';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { showNotice } from '@/lib/ui/notice-store';
import type { PaletteTool } from '@/lib/shape-tools';
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
    (tool: PaletteTool, label: string) => {
      const bounds = store.getState().domNode?.getBoundingClientRect();
      const centre = bounds
        ? flow.screenToFlowPosition({
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          })
        : { x: 240, y: 200 };
      const state = useWorkspaceStore.getState();
      state.setActiveTool('select');
      if (tool === 'pool' || tool === 'lane') {
        const copy = getCollaborationCopy(usePreferencesStore.getState().locale);
        const selected = state.processModel.containers?.[state.selectedNodeIds[0]];
        const poolId = selected?.kind === 'pool' ? selected.id : selected?.parentId;
        if (tool === 'pool') {
          const pools = Object.values(state.processModel.containers ?? {}).filter(
            (item) => item.kind === 'pool',
          );
          for (let attempt = 0; attempt <= pools.length; attempt += 1) {
            const blocker = pools.find(
              ({ bounds: b }) =>
                centre.x - DEFAULT_POOL_SIZE.width / 2 < b.x + b.width &&
                centre.x + DEFAULT_POOL_SIZE.width / 2 > b.x &&
                centre.y - DEFAULT_POOL_SIZE.height / 2 < b.y + b.height &&
                centre.y + DEFAULT_POOL_SIZE.height / 2 > b.y,
            );
            if (!blocker) break;
            centre.y =
              blocker.bounds.y +
              blocker.bounds.height +
              DEFAULT_POOL_SIZE.height / 2 +
              40;
          }
        }
        const created = insertContainerAt(
          state.processModel,
          tool,
          label,
          centre,
          copy.pool,
          tool === 'lane' ? poolId : undefined,
        );
        if (!created) {
          showNotice(copy.placementInvalid, 'error');
          return;
        }
        state.commitModel(created.model);
        state.setSelection({ nodeIds: [created.nodeId], edgeId: null });
        requestAnimationFrame(
          () =>
            void flow.fitView({
              nodes: [{ id: created.nodeId }],
              padding: 0.2,
              maxZoom: 1,
              duration: 160,
            }),
        );
        return;
      }
      const created = addNodeAt(state.processModel, tool, label, centre);
      const node = created.model.nodes[created.nodeId];
      const placedBounds = findFreeRect(created.model, getNodeBounds(node), node.id);
      const placed = {
        ...node,
        bounds: placedBounds,
        ...containingFrame(created.model, placedBounds),
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
