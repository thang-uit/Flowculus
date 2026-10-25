'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useStoreApi, type Connection } from '@xyflow/react';
import { isEdgeAttachmentSide } from '@flowculus/process-model';
import type { ProcessFlowEdge } from './canvas-flow';
import { connectNodes, isValidNodeConnection } from './model-editing';
import { useWorkspaceStore } from './workspace-store';

/** React Flow owns drag frames; a valid drop commits once, invalid/cancelled drops keep the edge. */
export function useCanvasConnections(wrapper: RefObject<HTMLDivElement | null>) {
  const flow = useStoreApi();
  const active = useRef<{ cancelled: boolean } | null>(null);
  useEffect(() => {
    const cancel = () => {
      if (!active.current) return;
      active.current.cancelled = true;
      flow.getState().cancelConnection();
      wrapper.current?.removeAttribute('data-connecting');
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [flow, wrapper]);
  return {
    onConnectStart: () => {
      active.current = { cancelled: false };
      wrapper.current?.setAttribute('data-connecting', 'true');
    },
    onConnectEnd: () => {
      wrapper.current?.removeAttribute('data-connecting');
      active.current = null;
    },
    isValidConnection: (connection: Connection | ProcessFlowEdge) => {
      const state = useWorkspaceStore.getState();
      return (
        state.activeTool === 'select' &&
        !active.current?.cancelled &&
        isValidNodeConnection(state.processModel, connection.source, connection.target)
      );
    },
    onConnect: (connection: Connection) => {
      const state = useWorkspaceStore.getState();
      if (active.current?.cancelled || state.activeTool !== 'select') return;
      const result = connectNodes(
        state.processModel,
        connection.source,
        connection.target,
        {
          sourceSide: isEdgeAttachmentSide(connection.sourceHandle)
            ? connection.sourceHandle
            : undefined,
          targetSide: isEdgeAttachmentSide(connection.targetHandle)
            ? connection.targetHandle
            : undefined,
        },
      );
      if (result) state.commitModel(result.model);
    },
  };
}
