'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ProcessModel } from '@flowculus/process-model';
import {
  absoluteCanvasPositions,
  toFlowNodes,
  type ProcessFlowNode,
} from './canvas-flow';
import { finishContainerDrag } from './container-gestures';
import { getCollaborationCopy } from './i18n/collaboration-copy';
import { usePreferencesStore } from './use-preferences-store';
import { useWorkspaceStore } from './workspace-store';
import { showNotice } from './ui/notice-store';

/** React Flow owns pointer frames; only a completed, current gesture reaches history. */
export function useCanvasNodeDrag(
  getNodes: () => ProcessFlowNode[],
  setNodes: Dispatch<SetStateAction<ProcessFlowNode[]>>,
  critical: ReadonlySet<string>,
) {
  const gesture = useRef<{
    model: ProcessModel;
    documentId: string | null;
    cancelled: boolean;
  } | null>(null);
  const reset = useCallback(() => {
    const state = useWorkspaceStore.getState();
    setNodes(toFlowNodes(state.processModel, critical, new Set(state.selectedNodeIds)));
  }, [critical, setNodes]);
  useEffect(() => {
    const cancel = () => {
      if (!gesture.current) return;
      gesture.current.cancelled = true;
      reset();
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
  }, [reset]);
  return {
    onNodeDragStart: () => {
      const state = useWorkspaceStore.getState();
      gesture.current = {
        model: state.processModel,
        documentId: state.activeDocumentId,
        cancelled: false,
      };
    },
    onNodeDragStop: (_event: unknown, node: ProcessFlowNode) => {
      const started = gesture.current;
      gesture.current = null;
      const state = useWorkspaceStore.getState();
      if (
        !started ||
        started.cancelled ||
        started.documentId !== state.activeDocumentId ||
        started.model !== state.processModel
      ) {
        reset();
        return;
      }
      const next = finishContainerDrag(
        state.processModel,
        node.id,
        absoluteCanvasPositions(getNodes()),
      );
      if (next && next !== state.processModel) state.commitModel(next);
      else {
        reset();
        if (!next)
          showNotice(
            getCollaborationCopy(usePreferencesStore.getState().locale).invalid,
            'error',
          );
      }
    },
  };
}
