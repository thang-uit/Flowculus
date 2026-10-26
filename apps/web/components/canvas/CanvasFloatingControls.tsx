'use client';

import {
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsIn,
  Minus,
  Plus,
  SlidersHorizontal,
} from '@phosphor-icons/react';

import { PaletteToggle } from '@/components/palette/PaletteToggle';
import { CanvasToolSwitch } from './CanvasToolSwitch';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useCanvasCommands } from '@/lib/use-canvas-commands';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/**
 * Compact action bar for touch layouts, where the header has no room for the
 * canvas controls. Wide desktop layouts place these controls in the header.
 */
export function CanvasFloatingControls() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const canUndo = useWorkspaceStore((state) => state.history.past.length > 0);
  const canRedo = useWorkspaceStore((state) => state.history.future.length > 0);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const setInspectorOpen = useWorkspaceStore((state) => state.setInspectorOpen);
  const { zoomIn, zoomOut, fit } = useCanvasCommands();
  const buttonClass = 'focus-ring tb-btn tb-btn--idle size-8 disabled:opacity-40';

  return (
    <div
      role="toolbar"
      aria-label={copy.tools}
      className="canvas-touch-toolbar absolute bottom-3 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-soft)] min-[1440px]:hidden"
    >
      <div className="flex lg:hidden">
        <PaletteToggle placement="mobile" />
      </div>
      <CanvasToolSwitch />
      <span className="tb-divider" aria-hidden="true" />
      <button
        type="button"
        className={buttonClass}
        onClick={undo}
        disabled={!canUndo}
        aria-label={copy.undo}
        title={copy.undo}
      >
        <ArrowUUpLeft size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={redo}
        disabled={!canRedo}
        aria-label={copy.redo}
        title={copy.redo}
      >
        <ArrowUUpRight size={16} aria-hidden="true" />
      </button>
      <span className="tb-divider" aria-hidden="true" />
      <button
        type="button"
        className={buttonClass}
        onClick={zoomOut}
        aria-label={copy.zoomOut}
        title={copy.zoomOut}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={fit}
        aria-label={copy.fitToCanvas}
        title={copy.fitToCanvas}
      >
        <ArrowsIn size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={zoomIn}
        aria-label={copy.zoomIn}
        title={copy.zoomIn}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
      <span className="tb-divider" aria-hidden="true" />
      <button
        type="button"
        className={buttonClass}
        onClick={() => setInspectorOpen(true)}
        aria-label={copy.toggleInspector}
        title={copy.toggleInspector}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
