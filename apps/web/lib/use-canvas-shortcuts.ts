'use client';

import { useReactFlow } from '@xyflow/react';
import { useEffect, type RefObject } from 'react';

import { getNodeBounds } from '@flowculus/process-model';

import { useWorkspaceStore } from '@/lib/workspace-store';

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z or Ctrl+Y redo, outside text inputs. */
export function useHistoryShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      const state = useWorkspaceStore.getState();
      if (state.mode !== 'model') return;
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        state.undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        state.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

const FOCUS_ZOOM = 1;

/**
 * Centres the canvas on an element requested by the Inspector, the semantic
 * gate or a diagnostic ("Show"). Only the latest request is honoured.
 */
export function useFocusRequest(wrapperRef: RefObject<HTMLDivElement | null>) {
  const request = useWorkspaceStore((state) => state.focusRequest);
  const { setCenter } = useReactFlow();
  useEffect(() => {
    if (!request || !wrapperRef.current) return;
    const model = useWorkspaceStore.getState().processModel;
    const nodeIds =
      request.elementType === 'node'
        ? [request.elementId]
        : [
            model.edges[request.elementId]?.source,
            model.edges[request.elementId]?.target,
          ];
    const rects = nodeIds
      .map((id) => (id ? model.nodes[id] : undefined))
      .filter((node) => node != null)
      .map(getNodeBounds);
    if (rects.length === 0) return;
    const x =
      rects.reduce((sum, rect) => sum + rect.x + rect.width / 2, 0) / rects.length;
    const y =
      rects.reduce((sum, rect) => sum + rect.y + rect.height / 2, 0) / rects.length;
    void setCenter(x, y, { zoom: FOCUS_ZOOM, duration: 240 });
  }, [request, setCenter, wrapperRef]);
}
