'use client';

import {
  ArrowClockwise,
  ArrowsIn,
  Cursor,
  Hand,
  Minus,
  Plus,
} from '@phosphor-icons/react';
import type { RefObject } from 'react';

import type { DrawioCanvasHandle } from '@/components/DrawioCanvas';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore, type WorkspaceTool } from '@/lib/workspace-store';

interface WorkspaceCanvasControlsProps {
  canvasRef: RefObject<DrawioCanvasHandle | null>;
  className?: string;
}

export function WorkspaceCanvasControls({
  canvasRef,
  className,
}: Readonly<WorkspaceCanvasControlsProps>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const activeTool = useWorkspaceStore((state) => state.activeTool);
  const setActiveTool = useWorkspaceStore((state) => state.setActiveTool);
  const zoom = useWorkspaceStore((state) => state.zoom);
  const setZoom = useWorkspaceStore((state) => state.setZoom);

  const toolOptions: Array<{ id: WorkspaceTool; label: string; icon: typeof Cursor }> = [
    { id: 'select', label: copy.select, icon: Cursor },
    { id: 'hand', label: copy.panCanvas, icon: Hand },
  ];

  const handleZoomOut = () => {
    canvasRef.current?.zoomOut();
    setZoom(Math.max(0.1, zoom - 0.1));
  };
  const handleZoomIn = () => {
    canvasRef.current?.zoomIn();
    setZoom(zoom + 0.1);
  };
  const handleFit = () => {
    canvasRef.current?.fit();
    setZoom(1);
  };
  const handleRefresh = () => {
    canvasRef.current?.refresh();
  };

  return (
    <div
      role="toolbar"
      aria-label={copy.tools}
      className={cn('flex h-8 items-center gap-1', className)}
    >
      {/* Tool: Select / Hand */}
      {toolOptions.map(({ id, label, icon: Icon }) => {
        const isActive = activeTool === id;
        return (
          <Tooltip key={id} content={label}>
            <button
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={isActive}
              onClick={() => setActiveTool(id)}
              className={cn(
                'focus-ring tb-btn',
                isActive ? 'tb-btn--active' : 'tb-btn--idle',
              )}
            >
              <Icon size={15} weight={isActive ? 'bold' : 'regular'} aria-hidden="true" />
            </button>
          </Tooltip>
        );
      })}

      <span className="tb-divider hidden sm:block" aria-hidden="true" />

      {/* Zoom controls */}
      <div className="hidden items-center gap-0.5 sm:flex">
        <Tooltip content={copy.zoomOut}>
          <button
            type="button"
            aria-label={copy.zoomOut}
            title={copy.zoomOut}
            onClick={handleZoomOut}
            className="focus-ring tb-btn tb-btn--idle"
          >
            <Minus size={14} aria-hidden="true" />
          </button>
        </Tooltip>
        <span className="min-w-[2.5rem] select-none text-center font-mono text-[11px] font-semibold tabular-nums text-[var(--muted)]">
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip content={copy.zoomIn}>
          <button
            type="button"
            aria-label={copy.zoomIn}
            title={copy.zoomIn}
            onClick={handleZoomIn}
            className="focus-ring tb-btn tb-btn--idle"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      <span className="tb-divider hidden sm:block" aria-hidden="true" />

      {/* Fit + Refresh */}
      <Tooltip content={copy.fitToCanvas}>
        <button
          type="button"
          aria-label={copy.fitToCanvas}
          title={copy.fitToCanvas}
          onClick={handleFit}
          className="focus-ring tb-btn tb-btn--idle"
        >
          <ArrowsIn size={15} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip content={copy.refreshModel}>
        <button
          type="button"
          aria-label={copy.refreshModel}
          title={copy.refreshModel}
          onClick={handleRefresh}
          className="focus-ring tb-btn tb-btn--idle"
        >
          <ArrowClockwise size={15} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * Standalone toolbar row — shown on mobile only (lg:hidden).
 * Desktop uses WorkspaceCanvasControls embedded inside the top navigation bar.
 */
export function WorkspaceToolbar({
  canvasRef,
}: Readonly<{ canvasRef: RefObject<DrawioCanvasHandle | null> }>) {
  return (
    <WorkspaceCanvasControls
      canvasRef={canvasRef}
      className="shrink-0 border-b border-[var(--border)] px-3 lg:hidden"
    />
  );
}
