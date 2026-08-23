'use client';

import { CheckCircle, Code, Lightning, WarningCircle } from '@phosphor-icons/react';

import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function AnalysisStatusBar() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const drawioStatus = useWorkspaceStore((state) => state.drawioStatus);
  const draftStatus = useWorkspaceStore((state) => state.draftStatus);
  const analysisRuntimeStatus = useWorkspaceStore((state) => state.analysisRuntimeStatus);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const analysisRevision = useWorkspaceStore((state) => state.analysisRevision);
  const isError = drawioStatus === 'error' || report.status === 'invalid';
  return (
    <footer className="flex min-h-9 shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-3 text-[11px] sm:px-4">
      <div className="flex min-w-0 items-center gap-3 text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {isError ? (
            <WarningCircle
              size={14}
              className="text-[var(--danger)]"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle
              size={14}
              weight="fill"
              className="text-[var(--success)]"
              aria-hidden="true"
            />
          )}
          <span className="hidden sm:inline">
            {drawioStatus === 'loading'
              ? `${copy.drawioEditor}…`
              : drawioStatus === 'saving'
                ? copy.saveFile
                : isError
                  ? drawioStatus === 'error'
                    ? copy.drawioLoadError
                    : copy.fileError
                  : copy.canvasReady}
          </span>
          <span className="sm:hidden">{isError ? copy.error : copy.ready}</span>
        </span>
        <span
          className="hidden items-center gap-1.5 whitespace-nowrap md:inline-flex"
          role="status"
          aria-live="polite"
        >
          <Lightning
            size={14}
            className={
              analysisRuntimeStatus === 'calculating'
                ? 'animate-pulse text-[var(--accent-strong)]'
                : 'text-[var(--accent-strong)]'
            }
            aria-hidden="true"
          />
          {analysisRuntimeStatus === 'calculating'
            ? copy.analysisCalculating
            : analysisRuntimeStatus === 'fallback'
              ? copy.analysisFallback
              : analysisRuntimeStatus === 'ready'
                ? copy.analysisUpdated
                : copy.workerReady}
        </span>
        <span
          className="hidden items-center gap-1.5 whitespace-nowrap lg:inline-flex"
          title={
            draftStatus === 'error'
              ? copy.draftSaveError
              : draftStatus === 'saving'
                ? copy.draftSaving
                : copy.localDraft
          }
        >
          <span
            className={
              draftStatus === 'error'
                ? 'size-1.5 rounded-full bg-[var(--danger)]'
                : draftStatus === 'saving'
                  ? 'size-1.5 animate-pulse rounded-full bg-[var(--accent)]'
                  : 'size-1.5 rounded-full bg-[var(--success)]'
            }
            aria-hidden="true"
          />
          {draftStatus === 'error'
            ? copy.draftSaveError
            : draftStatus === 'saving'
              ? copy.draftSaving
              : copy.localDraft}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px]">
          <Code size={14} aria-hidden="true" />
          {copy.schema} 1.0
        </span>
      </div>
      <span className="sr-only" key={analysisRevision} aria-live="polite">
        {analysisRuntimeStatus === 'ready' ? copy.analysisUpdated : ''}
      </span>
    </footer>
  );
}
