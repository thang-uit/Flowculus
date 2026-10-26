'use client';

import { AppContextMenu } from '@/components/ui/AppContextMenu';
import { useReactFlow } from '@xyflow/react';
import { arrangeNodes, type ArrangeAction } from '@/lib/canvas-arrange';
import { makeCanvasClipboard, pasteCanvasClipboard } from '@/lib/canvas-clipboard';
import { copySelectedNodes, readCanvasClipboard } from '@/lib/canvas-clipboard-runtime';
import { getWorkspaceCopy } from '@/lib/i18n';
import { removeElements } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export interface CanvasMenuPosition {
  x: number;
  y: number;
}

export function CanvasContextMenu({
  position,
  onClose,
}: Readonly<{ position: CanvasMenuPosition; onClose: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const selectedEdgeId = useWorkspaceStore((state) => state.selectedEdgeId);
  const copy = getWorkspaceCopy(locale);
  const { fitView } = useReactFlow();

  const arrange = (action: ArrangeAction) => {
    const state = useWorkspaceStore.getState();
    const next = arrangeNodes(state.processModel, state.selectedNodeIds, action);
    if (next !== state.processModel) state.commitModel(next);
    onClose();
  };
  const duplicate = () => {
    const state = useWorkspaceStore.getState();
    const payload = makeCanvasClipboard(state.processModel, state.selectedNodeIds);
    if (!payload) return;
    const pasted = pasteCanvasClipboard(state.processModel, payload, 36);
    if (!pasted) return;
    state.commitModel(pasted.model);
    state.setSelection({ nodeIds: pasted.nodeIds, edgeId: null });
    onClose();
  };
  const copyNodes = () => {
    copySelectedNodes();
    onClose();
  };
  const cutNodes = () => {
    if (!copySelectedNodes()) return;
    const state = useWorkspaceStore.getState();
    state.commitModel(removeElements(state.processModel, state.selectedNodeIds, []));
    state.setSelection({ nodeIds: [], edgeId: null });
    onClose();
  };
  const pasteNodes = () => {
    const documentId = useWorkspaceStore.getState().activeDocumentId;
    void readCanvasClipboard().then((payload) => {
      if (!payload || useWorkspaceStore.getState().activeDocumentId !== documentId)
        return;
      const state = useWorkspaceStore.getState();
      const pasted = pasteCanvasClipboard(state.processModel, payload, 36);
      if (!pasted) return;
      state.commitModel(pasted.model);
      state.setSelection({ nodeIds: pasted.nodeIds, edgeId: null });
    });
    onClose();
  };
  const remove = () => {
    const state = useWorkspaceStore.getState();
    state.commitModel(
      removeElements(
        state.processModel,
        state.selectedNodeIds,
        state.selectedEdgeId ? [state.selectedEdgeId] : [],
      ),
    );
    state.setSelection({ nodeIds: [], edgeId: null });
    onClose();
  };
  const zoom = () => {
    void fitView({
      nodes: selectedNodeIds.map((id) => ({ id })),
      padding: 0.28,
      duration: 220,
      maxZoom: 1.5,
    });
    onClose();
  };
  const actions: Array<{ label: string; enabled: boolean; run: () => void }> = [
    { label: copy.copySelection, enabled: selectedNodeIds.length > 0, run: copyNodes },
    { label: copy.cutSelection, enabled: selectedNodeIds.length > 0, run: cutNodes },
    { label: copy.pasteSelection, enabled: true, run: pasteNodes },
    {
      label: copy.duplicateSelection,
      enabled: selectedNodeIds.length > 0,
      run: duplicate,
    },
    { label: copy.zoomToSelection, enabled: selectedNodeIds.length > 0, run: zoom },
    {
      label: copy.alignLeft,
      enabled: selectedNodeIds.length > 1,
      run: () => arrange('left'),
    },
    {
      label: copy.alignRight,
      enabled: selectedNodeIds.length > 1,
      run: () => arrange('right'),
    },
    {
      label: copy.alignTop,
      enabled: selectedNodeIds.length > 1,
      run: () => arrange('top'),
    },
    {
      label: copy.alignBottom,
      enabled: selectedNodeIds.length > 1,
      run: () => arrange('bottom'),
    },
    {
      label: copy.distributeHorizontal,
      enabled: selectedNodeIds.length > 2,
      run: () => arrange('horizontal'),
    },
    {
      label: copy.distributeVertical,
      enabled: selectedNodeIds.length > 2,
      run: () => arrange('vertical'),
    },
    {
      label: copy.snapToGrid,
      enabled: selectedNodeIds.length > 0,
      run: () => arrange('grid'),
    },
    {
      label: copy.deleteElement,
      enabled: selectedNodeIds.length > 0 || Boolean(selectedEdgeId),
      run: remove,
    },
  ];
  return (
    <AppContextMenu
      point={position}
      label={copy.canvasContextMenu}
      onClose={onClose}
      sections={[
        {
          id: 'canvas',
          actions: actions.map((action) => ({
            id: action.label,
            label: action.label,
            disabled: !action.enabled,
            onSelect: action.run,
            tone: action.label === copy.deleteElement ? 'danger' : undefined,
          })),
        },
      ]}
    />
  );
}
