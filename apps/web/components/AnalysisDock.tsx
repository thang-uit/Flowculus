'use client';

import {
  CaretDown,
  ChartLineUp,
  CheckCircle,
  Clock,
  Lightning,
  Pulse,
  WarningCircle,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import { AnalysisDetails } from '@/components/AnalysisDetails';
import { AnalysisSummary } from '@/components/AnalysisSummary';
import { PathQueryPanel } from '@/components/PathQueryPanel';
import { ScenarioSettings } from '@/components/ScenarioSettings';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

const DEFAULT_DOCK_HEIGHT = 380;
const MIN_DOCK_HEIGHT = 176;
const MAX_DOCK_HEIGHT = 680;

const clampDockHeight = (value: number): number => {
  if (typeof window === 'undefined') {
    return Math.min(MAX_DOCK_HEIGHT, Math.max(MIN_DOCK_HEIGHT, value));
  }
  const viewportLimit = Math.max(
    MIN_DOCK_HEIGHT,
    Math.min(MAX_DOCK_HEIGHT, window.innerHeight * 0.76),
  );
  return Math.round(Math.min(viewportLimit, Math.max(MIN_DOCK_HEIGHT, value)));
};

const formatCompactCycleTime = (
  value: number | null,
  minutes: string,
  emptyValue: string,
) => (value == null ? emptyValue : `${Number(value.toFixed(2))} ${minutes}`);

const formatCompactPercent = (value: number | null) =>
  value == null ? null : `${Number((value * 100).toFixed(1))}%`;

interface ResizeState {
  pointerId: number;
  startY: number;
  startHeight: number;
}

interface ResizeListeners {
  move: (event: PointerEvent) => void;
  end: (event: PointerEvent) => void;
}

export function AnalysisDock() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const analysisRevision = useWorkspaceStore((state) => state.analysisRevision);
  const analysisRuntimeStatus = useWorkspaceStore((state) => state.analysisRuntimeStatus);
  const open = useWorkspaceStore((state) => state.analysisDockOpen);
  const toggle = useWorkspaceStore((state) => state.toggleAnalysisDock);
  const [dockHeight, setDockHeight] = useState(DEFAULT_DOCK_HEIGHT);
  const dockRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const resizeListenersRef = useRef<ResizeListeners | null>(null);
  const isCalculating = analysisRuntimeStatus === 'calculating';
  const isValid = report.status === 'ready';
  const statusLabel = isCalculating
    ? copy.analysisCalculating
    : isValid
      ? copy.analysisUpdated
      : copy.error;

  const writeDockHeight = useCallback((height: number) => {
    dockRef.current?.style.setProperty('--analysis-dock-height', `${height}px`);
  }, []);

  const finishResize = useCallback(
    (height: number) => {
      const nextHeight = clampDockHeight(height);
      resizeStateRef.current = null;
      setDockHeight(nextHeight);
      writeDockHeight(nextHeight);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      dockRef.current?.removeAttribute('data-resizing');
    },
    [writeDockHeight],
  );

  const removeResizeListeners = useCallback(() => {
    const listeners = resizeListenersRef.current;
    if (!listeners) return;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.end);
    window.removeEventListener('pointercancel', listeners.end);
    resizeListenersRef.current = null;
  }, []);

  useEffect(() => () => removeResizeListeners(), [removeResizeListeners]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !open) return;
    event.preventDefault();
    removeResizeListeners();
    const startY = event.clientY;
    const startHeight = panelRef.current?.getBoundingClientRect().height ?? dockHeight;
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startY,
      startHeight,
    };
    dockRef.current?.setAttribute('data-resizing', 'true');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state || moveEvent.pointerId !== state.pointerId) return;
      const delta = state.startY - moveEvent.clientY;
      const next = clampDockHeight(state.startHeight + delta);
      writeDockHeight(next);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state || upEvent.pointerId !== state.pointerId) return;
      removeResizeListeners();
      const delta = state.startY - upEvent.clientY;
      finishResize(state.startHeight + delta);
    };

    resizeListenersRef.current = { move: onPointerMove, end: onPointerUp };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  };

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const step = event.shiftKey ? 32 : 12;
    let nextHeight = dockHeight;
    if (event.key === 'ArrowUp') nextHeight += step;
    else if (event.key === 'ArrowDown') nextHeight -= step;
    else if (event.key === 'Home') nextHeight = MIN_DOCK_HEIGHT;
    else if (event.key === 'End') nextHeight = MAX_DOCK_HEIGHT;
    else return;
    event.preventDefault();
    const next = clampDockHeight(nextHeight);
    setDockHeight(next);
    writeDockHeight(next);
  };

  return (
    <section
      ref={dockRef}
      className="analysis-dock-shell pointer-events-auto shrink-0 w-full"
      style={{ '--analysis-dock-height': `${dockHeight}px` } as CSSProperties}
      data-state={open ? 'open' : 'closed'}
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        {/* Expanded Analysis Drawer Panel — completely edge-to-edge */}
        <div
          ref={panelRef}
          id="analysis-dock-content"
          aria-hidden={!open}
          inert={!open}
          className={cn(
            'analysis-dock-panel min-h-0 w-full overflow-hidden bg-[var(--surface)]',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          data-state={open ? 'open' : 'closed'}
        >
          {/* Resize Handle */}
          <div
            className="analysis-dock-resize-handle focus-ring flex h-7 cursor-ns-resize touch-none items-center justify-center border-b border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--accent-strong)]"
            role="separator"
            aria-orientation="horizontal"
            aria-label={copy.resizeResults}
            aria-valuemin={MIN_DOCK_HEIGHT}
            aria-valuemax={MAX_DOCK_HEIGHT}
            aria-valuenow={Math.round(dockHeight)}
            aria-valuetext={`${Math.round(dockHeight)} px`}
            tabIndex={0}
            title={copy.resizeResultsHint}
            onPointerDown={handleResizeStart}
            onKeyDown={handleResizeKeyDown}
          >
            <span className="analysis-dock-grip" aria-hidden="true" />
            <span className="sr-only">{copy.resizeResultsHint}</span>
          </div>

          {/* Full-width scrollable calculations & sections */}
          <div className="analysis-dock-scroll scrollbar-thin">
            <AnalysisSummary />
            <div className="border-t border-[var(--border)] bg-[var(--surface-raised)]">
              <ScenarioSettings />
              <PathQueryPanel />
              <AnalysisDetails />
            </div>
          </div>
        </div>

        {/* Bottom Toggle Bar — completely flush edge-to-edge */}
        <Tooltip content={open ? copy.collapseResults : copy.expandResults}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="analysis-dock-content"
            aria-label={open ? copy.collapseResults : copy.expandResults}
            title={open ? copy.collapseResults : copy.expandResults}
            onClick={toggle}
            className="analysis-dock-toggle focus-ring flex h-11 w-full shrink-0 cursor-pointer items-center justify-between gap-3 bg-[var(--surface)] px-4 text-left transition-colors duration-150 hover:bg-[var(--surface-soft)] sm:px-6"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <ChartLineUp size={16} weight="duotone" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-[var(--text)]">
                  {copy.analysisSummary}
                </span>
                <span className="hidden truncate text-[10px] text-[var(--muted)] sm:block">
                  {copy.analysisAutoUpdate}
                </span>
              </span>
            </span>

            {/* Quick Metrics Badges */}
            <span className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* CT badge */}
              <span
                key={analysisRevision}
                className="analysis-dock-metric analysis-value-update flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--accent-strong)]"
              >
                <Clock size={13} aria-hidden="true" />
                <span>
                  CT{' '}
                  {formatCompactCycleTime(
                    report.cycleTimeMinutes,
                    copy.minutes,
                    copy.emptyValue,
                  )}
                </span>
              </span>

              {/* TCT badge */}
              {report.theoreticalCycleTimeMinutes != null ? (
                <span className="hidden items-center gap-1 rounded-md bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--muted-strong)] md:inline-flex">
                  <Pulse size={13} aria-hidden="true" />
                  <span>
                    TCT{' '}
                    {formatCompactCycleTime(
                      report.theoreticalCycleTimeMinutes,
                      copy.minutes,
                      copy.emptyValue,
                    )}
                  </span>
                </span>
              ) : null}

              {/* CTE badge */}
              {report.cycleTimeEfficiency != null ? (
                <span className="hidden items-center gap-1 rounded-md bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--muted-strong)] lg:inline-flex">
                  <span>CTE {formatCompactPercent(report.cycleTimeEfficiency)}</span>
                </span>
              ) : null}

              {/* Status indicator */}
              <span className="hidden items-center gap-1 text-[10.5px] text-[var(--muted)] sm:inline-flex">
                {isCalculating ? (
                  <Lightning
                    size={13}
                    className="animate-pulse text-[var(--accent-strong)]"
                    aria-hidden="true"
                  />
                ) : isValid ? (
                  <CheckCircle
                    size={13}
                    weight="fill"
                    className="text-[var(--success)]"
                    aria-hidden="true"
                  />
                ) : (
                  <WarningCircle
                    size={13}
                    className="text-[var(--danger)]"
                    aria-hidden="true"
                  />
                )}
                {statusLabel}
              </span>

              <CaretDown
                size={16}
                aria-hidden="true"
                className={cn(
                  'text-[var(--muted)] transition-transform duration-200 motion-reduce:transition-none',
                  open && 'rotate-180 text-[var(--accent-strong)]',
                )}
              />
            </span>
          </button>
        </Tooltip>
      </div>
    </section>
  );
}
