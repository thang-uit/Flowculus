'use client';

import { useEffect, useRef, type RefObject } from 'react';

import { makeCanvasClipboard, pasteCanvasClipboard } from '@/lib/canvas-clipboard';
import { copySelectedNodes, readCanvasClipboard } from '@/lib/canvas-clipboard-runtime';
import { showNotice } from '@/lib/ui/notice-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { moveNodes, removeElements } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[role="listbox"],[role="tab"]',
    ),
  );

/** Canvas-only editing commands; model edits are committed once for undo/redo. */
export function useCanvasClipboard(wrapperRef: RefObject<HTMLDivElement | null>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const pasteCount = useRef(0);

  useEffect(() => {
    let active = true;
    const announce = (message: string) => showNotice(message);
    const getPayload = () => {
      const state = useWorkspaceStore.getState();
      const payload = makeCanvasClipboard(state.processModel, state.selectedNodeIds);
      if (!payload) announce(copy.clipboardEmpty);
      return payload;
    };
    const paste = async () => {
      const documentId = useWorkspaceStore.getState().activeDocumentId;
      const payload = await readCanvasClipboard();
      if (!active || useWorkspaceStore.getState().activeDocumentId !== documentId) return;
      if (!payload) {
        announce(copy.clipboardInvalid);
        return;
      }
      pasteCount.current += 1;
      const state = useWorkspaceStore.getState();
      const result = pasteCanvasClipboard(
        state.processModel,
        payload,
        36 * pasteCount.current,
      );
      if (!result) {
        announce(copy.clipboardInvalid);
        return;
      }
      state.commitModel(result.model);
      state.setSelection({ nodeIds: result.nodeIds, edgeId: null });
      announce(copy.clipboardPasted(result.nodeIds.length));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        isEditable(event.target) ||
        useWorkspaceStore.getState().mode !== 'model'
      )
        return;
      const wrapper = wrapperRef.current;
      const state = useWorkspaceStore.getState();
      const withinCanvas = wrapper?.contains(event.target as Node) ?? false;
      if (!withinCanvas && state.selectedNodeIds.length === 0 && !state.selectedEdgeId)
        return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'c') {
        const payload = getPayload();
        if (!payload) return;
        event.preventDefault();
        copySelectedNodes();
        announce(copy.clipboardCopied(payload.nodes.length));
      } else if (mod && key === 'x') {
        const payload = getPayload();
        if (!payload) return;
        event.preventDefault();
        copySelectedNodes();
        state.commitModel(removeElements(state.processModel, state.selectedNodeIds, []));
        state.setSelection({ nodeIds: [], edgeId: null });
        announce(copy.clipboardCut);
      } else if (mod && key === 'v') {
        event.preventDefault();
        void paste();
      } else if (mod && key === 'd') {
        const payload = getPayload();
        if (!payload) return;
        event.preventDefault();
        const result = pasteCanvasClipboard(state.processModel, payload, 36);
        if (!result) return;
        state.commitModel(result.model);
        state.setSelection({ nodeIds: result.nodeIds, edgeId: null });
        announce(copy.clipboardDuplicate);
      } else if (mod && key === 'a' && withinCanvas) {
        event.preventDefault();
        state.setSelection({
          nodeIds: Object.keys(state.processModel.nodes),
          edgeId: null,
        });
      } else if (
        key === 'escape' &&
        (state.selectedNodeIds.length || state.selectedEdgeId)
      ) {
        state.setSelection({ nodeIds: [], edgeId: null });
      } else if (!mod && key.startsWith('arrow') && state.selectedNodeIds.length > 0) {
        const dx = key === 'arrowleft' ? -1 : key === 'arrowright' ? 1 : 0;
        const dy = key === 'arrowup' ? -1 : key === 'arrowdown' ? 1 : 0;
        if (!dx && !dy) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const positions = Object.fromEntries(
          state.selectedNodeIds.map((id) => {
            const bounds = state.processModel.nodes[id]?.bounds;
            return [
              id,
              { x: (bounds?.x ?? 0) + dx * step, y: (bounds?.y ?? 0) + dy * step },
            ];
          }),
        );
        state.commitModel(moveNodes(state.processModel, positions));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [copy, wrapperRef]);
}
