import type { ElementReference } from '@/lib/workspace-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface InspectGesture {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  target?: EventTarget | null;
}

/** Explicit clicks open editing; transient drag/marquee selection remains passive. */
export function inspectCanvasElement(
  event: InspectGesture,
  elementType: ElementReference['elementType'],
  elementId: string,
): void {
  const state = useWorkspaceStore.getState();
  if (state.activeTool === 'hand' || event.shiftKey || event.metaKey || event.ctrlKey)
    return;
  if (
    typeof Element !== 'undefined' &&
    event.target instanceof Element &&
    event.target.closest(
      '.flow-quick-actions, .process-container__add, input, textarea, [contenteditable="true"], .react-flow__handle, .react-flow__resize-control, .flow-endpoint-handle, .flow-segment-handle, .flow-waypoint',
    )
  )
    return;
  const exists =
    elementType === 'node'
      ? state.processModel.nodes[elementId] || state.processModel.containers?.[elementId]
      : state.processModel.edges[elementId];
  if (!exists) return;
  state.setSelection({
    nodeIds: elementType === 'node' ? [elementId] : [],
    edgeId: elementType === 'edge' ? elementId : null,
  });
  state.setInspectorOpen(true);
}
