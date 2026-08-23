'use client';

import { Mouse, Stack } from '@phosphor-icons/react';
import { useCallback, useState, type RefObject } from 'react';
import type { ProcessModel } from '@flowculus/process-model';

import { DrawioCanvas, type DrawioCanvasHandle } from '@/components/DrawioCanvas';
import { FallbackCanvasPreview } from '@/components/FallbackCanvasPreview';
import { PageTabBar } from '@/components/PageTabBar';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { cn } from '@/lib/cn';
import type { SemanticShapeTool } from '@/lib/shape-tools';

interface CanvasStageProps {
  className?: string;
  canvasRef: RefObject<DrawioCanvasHandle | null>;
  onModelChange: (model: ProcessModel, xml: string) => void;
  onXmlChange: (xml: string) => void;
  onStatusChange: (status: 'loading' | 'ready' | 'saving' | 'error') => void;
  dropShape?: { tool: SemanticShapeTool; label: string } | null;
  onDropShape?: (position: { x: number; y: number }) => void;
  dropShapeLabel?: string;
}

export function CanvasStage({
  className,
  canvasRef,
  onModelChange,
  onXmlChange,
  onStatusChange,
  dropShape = null,
  onDropShape,
  dropShapeLabel,
}: CanvasStageProps) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const status = useWorkspaceStore((state) => state.drawioStatus);
  const [showFallbackPreview, setShowFallbackPreview] = useState(false);
  const [nativeEditorReady, setNativeEditorReady] = useState(false);
  const handleStatusChange = useCallback(
    (nextStatus: 'loading' | 'ready' | 'saving' | 'error') => {
      if (nextStatus === 'ready') {
        setNativeEditorReady(true);
        setShowFallbackPreview(false);
      }
      onStatusChange(nextStatus);
    },
    [onStatusChange, setShowFallbackPreview],
  );

  return (
    <section
      className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', className)}
      aria-label={copy.canvasLabel}
    >
      <div className="relative min-h-0 flex-1">
        <div className="absolute left-1/2 top-3 z-[2] hidden -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-1.5 text-[10.5px] text-[var(--muted)] shadow-[var(--shadow-soft)] backdrop-blur-sm md:flex">
          <Mouse size={14} aria-hidden="true" />
          <span>{copy.selectionBridgeHint}</span>
          <span className="text-[var(--border-strong)]">|</span>
          <Stack size={14} aria-hidden="true" />
          <span>{copy.dragToPan}</span>
        </div>

        <DrawioCanvas
          ref={canvasRef}
          className="h-full min-h-0"
          onModelChange={onModelChange}
          onXmlChange={onXmlChange}
          onStatusChange={handleStatusChange}
          onFallbackChange={setShowFallbackPreview}
        />
        {!nativeEditorReady && (status === 'error' || showFallbackPreview) ? (
          <FallbackCanvasPreview />
        ) : null}
        {dropShape ? (
          <div
            className="absolute inset-0 z-[4] flex cursor-copy items-center justify-center bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] backdrop-blur-[1px]"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(event) => {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              onDropShape?.({
                x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 1100,
                y: ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 700,
              });
            }}
            role="status"
            aria-live="polite"
          >
            <span className="rounded-xl border border-dashed border-[var(--accent-strong)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-panel)]">
              {dropShapeLabel}
            </span>
          </div>
        ) : null}
      </div>

      {/* Page tabs — renders only when file has 2+ pages */}
      <PageTabBar canvasRef={canvasRef} />
    </section>
  );
}
