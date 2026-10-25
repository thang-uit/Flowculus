'use client';

import {
  makeCanvasClipboard,
  parseCanvasClipboard,
  type CanvasClipboardPayload,
} from './canvas-clipboard';
import { useWorkspaceStore } from './workspace-store';

let memoryClipboard: CanvasClipboardPayload | null = null;

export function copySelectedNodes(): CanvasClipboardPayload | null {
  const state = useWorkspaceStore.getState();
  const payload = makeCanvasClipboard(state.processModel, state.selectedNodeIds);
  if (!payload) return null;
  memoryClipboard = payload;
  if (navigator.clipboard?.writeText)
    void navigator.clipboard.writeText(JSON.stringify(payload)).catch(() => undefined);
  return payload;
}

export async function readCanvasClipboard(): Promise<CanvasClipboardPayload | null> {
  try {
    if (navigator.clipboard?.readText)
      return parseCanvasClipboard(await navigator.clipboard.readText());
  } catch {
    // Same-tab copy remains usable when system clipboard permission is denied.
  }
  return memoryClipboard;
}

export const hasMemoryClipboard = (): boolean => memoryClipboard != null;
