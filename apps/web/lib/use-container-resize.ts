'use client';

import { useCallback, useEffect, useRef, type ComponentProps } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import type { ProcessContainer, ProcessModel } from '@flowculus/process-model';
import { toFlowNodes, type ProcessFlowNode } from './canvas-flow';
import { resizeContainer } from './container-resizing';
import { getCollaborationCopy } from './i18n/collaboration-copy';
import { showNotice } from './ui/notice-store';
import { usePreferencesStore } from './use-preferences-store';
import { useWorkspaceStore } from './workspace-store';

/** Resizing shared boundaries is one atomic model edit, including rollback of child positions. */
export function useContainerResize(
  container: ProcessContainer | undefined,
  selected: boolean,
) {
  const flow = useReactFlow<ProcessFlowNode>();
  const gesture = useRef<{
    model: ProcessModel;
    documentId: string | null;
    cancelled: boolean;
  } | null>(null);
  const reset = useCallback(() => {
    const state = useWorkspaceStore.getState();
    flow.setNodes(
      toFlowNodes(
        state.processModel,
        new Set(state.analysisReport.criticalChain?.nodeIds ?? []),
        new Set(state.selectedNodeIds),
      ),
    );
  }, [flow]);
  useEffect(() => {
    if (!selected) return;
    const cancel = () => {
      if (gesture.current) {
        gesture.current.cancelled = true;
        reset();
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', keydown);
    };
  }, [reset, selected]);
  const onResizeStart = () => {
    const state = useWorkspaceStore.getState();
    gesture.current = {
      model: state.processModel,
      documentId: state.activeDocumentId,
      cancelled: false,
    };
  };
  const onResizeEnd: ComponentProps<typeof NodeResizer>['onResizeEnd'] = (_, bounds) => {
    const started = gesture.current;
    gesture.current = null;
    const state = useWorkspaceStore.getState();
    if (
      !container ||
      !started ||
      started.cancelled ||
      started.documentId !== state.activeDocumentId ||
      started.model !== state.processModel
    ) {
      reset();
      return;
    }
    const parent = container.parentId
      ? state.processModel.containers?.[container.parentId]
      : undefined;
    const absolute = {
      ...bounds,
      x: bounds.x + (parent?.bounds.x ?? 0),
      y: bounds.y + (parent?.bounds.y ?? 0),
    };
    const next = resizeContainer(state.processModel, container.id, absolute);
    if (next !== state.processModel) state.commitModel(next);
    else {
      reset();
      if (
        Object.entries(absolute).some(
          ([key, value]) => container.bounds[key as keyof typeof absolute] !== value,
        )
      )
        showNotice(
          getCollaborationCopy(usePreferencesStore.getState().locale).resizeInvalid,
          'error',
        );
    }
  };
  return { onResizeStart, onResizeEnd };
}
