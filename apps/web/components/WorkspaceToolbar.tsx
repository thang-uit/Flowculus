'use client';

import { usePreferencesStore } from '@/lib/use-preferences-store';

import {
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsIn,
  Minus,
  Plus,
} from '@phosphor-icons/react';
import { useStore } from '@xyflow/react';

import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useCanvasCommands } from '@/lib/use-canvas-commands';
import { CanvasToolSwitch } from '@/components/canvas/CanvasToolSwitch';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Re-renders only when the zoom level changes, never on pan frames. */
function ZoomLevel({ onReset, label }: Readonly<{ onReset: () => void; label: string }>) {
  const zoomPercent = useStore((state) => Math.round(state.transform[2] * 100));
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onReset}
        aria-label={`${label}: ${zoomPercent}%`}
        title={label}
        className="focus-ring tb-btn tb-btn--idle min-w-[3rem] font-mono text-[11px] font-semibold tabular-nums"
      >
        {zoomPercent}%
      </button>
    </Tooltip>
  );
}

export function WorkspaceCanvasControls({ className }: Readonly<{ className?: string }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const canUndo = useWorkspaceStore((state) => state.history.past.length > 0);
  const canRedo = useWorkspaceStore((state) => state.history.future.length > 0);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const { zoomIn, zoomOut, fit, resetZoom } = useCanvasCommands();

  return (
    <div
      role="toolbar"
      aria-label={copy.tools}
      className={cn('flex h-8 items-center gap-1', className)}
    >
      <CanvasToolSwitch />

      <span className="tb-divider" aria-hidden="true" />

      <Tooltip content={copy.undo}>
        <button
          type="button"
          aria-label={copy.undo}
          title={copy.undo}
          onClick={undo}
          disabled={!canUndo}
          className="focus-ring tb-btn tb-btn--idle disabled:opacity-40"
        >
          <ArrowUUpLeft size={15} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip content={copy.redo}>
        <button
          type="button"
          aria-label={copy.redo}
          title={copy.redo}
          onClick={redo}
          disabled={!canRedo}
          className="focus-ring tb-btn tb-btn--idle disabled:opacity-40"
        >
          <ArrowUUpRight size={15} aria-hidden="true" />
        </button>
      </Tooltip>

      <span className="tb-divider hidden sm:block" aria-hidden="true" />

      <div className="hidden items-center gap-0.5 sm:flex">
        <Tooltip content={copy.zoomOut}>
          <button
            type="button"
            aria-label={copy.zoomOut}
            title={copy.zoomOut}
            onClick={zoomOut}
            className="focus-ring tb-btn tb-btn--idle"
          >
            <Minus size={14} aria-hidden="true" />
          </button>
        </Tooltip>
        <ZoomLevel onReset={resetZoom} label={copy.resetZoom} />
        <Tooltip content={copy.zoomIn}>
          <button
            type="button"
            aria-label={copy.zoomIn}
            title={copy.zoomIn}
            onClick={zoomIn}
            className="focus-ring tb-btn tb-btn--idle"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      <Tooltip content={copy.fitToCanvas}>
        <button
          type="button"
          aria-label={copy.fitToCanvas}
          title={copy.fitToCanvas}
          onClick={fit}
          className="focus-ring tb-btn tb-btn--idle"
        >
          <ArrowsIn size={15} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
