'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Point } from '@flowculus/graph-layout';
import type { ProcessEdge } from '@flowculus/process-model';
import { findEdgeAttachment, type EdgeAttachment } from './edge-attachment';
import { reconnectEdge } from './model-editing';
import { useWorkspaceStore } from './workspace-store';

interface AttachmentDrag {
  edge: ProcessEdge;
  nodes: ReturnType<typeof useWorkspaceStore.getState>['processModel']['nodes'];
  end: 'source' | 'target';
  pointerId: number;
  owner: HTMLButtonElement;
  origin: Point;
  moved: boolean;
}
export interface AttachmentPreview {
  end: 'source' | 'target';
  cursor: Point;
  attachment: EdgeAttachment | null;
}

/** Mouse, pen and touch use the same pointer capture and screen-space snap radius. */
export function useEdgeAttachmentDrag(id: string) {
  const { screenToFlowPosition, getZoom } = useReactFlow();
  const active = useRef<AttachmentDrag | null>(null);
  const [preview, setPreview] = useState<AttachmentPreview | null>(null);
  const cancel = (event?: PointerEvent<HTMLButtonElement>) => {
    const drag = active.current;
    if (event && drag && event.pointerId !== drag.pointerId) return;
    active.current = null;
    if (drag?.owner.hasPointerCapture(drag.pointerId))
      drag.owner.releasePointerCapture(drag.pointerId);
    drag?.owner.closest('.flow-canvas')?.removeAttribute('data-connecting');
    setPreview(null);
  };
  useEffect(() => {
    const reset = () => {
      const drag = active.current;
      active.current = null;
      if (drag?.owner.hasPointerCapture(drag.pointerId))
        drag.owner.releasePointerCapture(drag.pointerId);
      drag?.owner.closest('.flow-canvas')?.removeAttribute('data-connecting');
      setPreview(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active.current) {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', key);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', reset);
      const drag = active.current;
      active.current = null;
      if (drag?.owner.hasPointerCapture(drag.pointerId))
        drag.owner.releasePointerCapture(drag.pointerId);
      drag?.owner.closest('.flow-canvas')?.removeAttribute('data-connecting');
    };
  }, []);
  const find = (
    event: PointerEvent<HTMLButtonElement>,
    drag: AttachmentDrag,
  ): AttachmentPreview => {
    const model = useWorkspaceStore.getState().processModel;
    const cursor = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    return {
      end: drag.end,
      cursor,
      attachment: findEdgeAttachment(
        model,
        id,
        drag.end,
        cursor,
        (event.pointerType === 'touch' ? 28 : 20) / getZoom(),
      ),
    };
  };
  return {
    preview,
    cancel,
    begin: (event: PointerEvent<HTMLButtonElement>, end: 'source' | 'target') => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (active.current) return;
      const state = useWorkspaceStore.getState();
      const edge = state.processModel.edges[id];
      if (!edge || state.activeTool !== 'select') return;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget
        .closest('.flow-canvas')
        ?.setAttribute('data-connecting', 'true');
      active.current = {
        edge,
        nodes: state.processModel.nodes,
        end,
        pointerId: event.pointerId,
        owner: event.currentTarget,
        origin: { x: event.clientX, y: event.clientY },
        moved: false,
      };
    },
    move: (event: PointerEvent<HTMLButtonElement>) => {
      const drag = active.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (
        !drag.moved &&
        Math.hypot(event.clientX - drag.origin.x, event.clientY - drag.origin.y) < 3
      )
        return;
      drag.moved = true;
      setPreview(find(event, drag));
    },
    end: (event: PointerEvent<HTMLButtonElement>) => {
      const drag = active.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const next = find(event, drag);
      cancel();
      const state = useWorkspaceStore.getState();
      if (
        !drag.moved ||
        !next.attachment ||
        state.activeTool !== 'select' ||
        state.processModel.edges[id] !== drag.edge ||
        state.processModel.nodes !== drag.nodes
      )
        return;
      const { nodeId, side } = next.attachment;
      const model = reconnectEdge(
        state.processModel,
        id,
        drag.end === 'source' ? nodeId : drag.edge.source,
        drag.end === 'target' ? nodeId : drag.edge.target,
        drag.end === 'source' ? { sourceSide: side } : { targetSide: side },
      );
      if (model && model !== state.processModel) state.commitModel(model);
    },
  };
}
