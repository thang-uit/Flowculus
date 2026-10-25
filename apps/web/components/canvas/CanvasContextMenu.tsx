'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
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
  const root = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  useEffect(() => {
    const first = root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [onClose]);

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
    void readCanvasClipboard().then((payload) => {
      if (!payload) return;
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
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      root.current?.closest<HTMLElement>('.flow-canvas')?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [
      ...(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ??
        []),
    ];
    if (buttons.length === 0) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1) % buttons.length
            : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };
  return (
    <div
      ref={root}
      role="menu"
      aria-label={copy.canvasContextMenu}
      onKeyDown={onKeyDown}
      className="absolute z-30 max-h-[min(24rem,65dvh)] w-52 overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-panel)]"
      style={{ left: position.x, top: position.y }}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          disabled={!action.enabled}
          onClick={action.run}
          className="focus-ring block min-h-9 w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--text)] hover:bg-[var(--accent-soft)] disabled:opacity-40"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
