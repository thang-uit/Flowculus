'use client';

import {
  CheckCircle,
  Code,
  Lightning,
  Stack,
  WarningCircle,
  WifiSlash,
} from '@phosphor-icons/react';
import { useId } from 'react';

import { useDrawioPage } from '@/lib/documents/use-drawio-page';

import { getWorkspaceCopy } from '@/lib/i18n';
import { AppSelect } from '@/components/ui/AppSelect';
import { useOnlineStatus } from '@/lib/use-online-status';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function AnalysisStatusBar() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const analysisRuntimeStatus = useWorkspaceStore((state) => state.analysisRuntimeStatus);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const analysisRevision = useWorkspaceStore((state) => state.analysisRevision);
  const nodeCount = useWorkspaceStore(
    (state) => Object.keys(state.processModel.nodes).length,
  );
  const edgeCount = useWorkspaceStore(
    (state) => Object.keys(state.processModel.edges).length,
  );
  const drawioSource = useWorkspaceStore((state) => state.drawioSource);
  const pageSelectId = useId();
  const { switchPage, busy: pageBusy, failed: pageFailed } = useDrawioPage();
  const isError = report.status === 'invalid';
  const online = useOnlineStatus();
  const runtimeLabel: Record<typeof analysisRuntimeStatus, string> = {
    idle: copy.workerReady,
    calculating: copy.analysisCalculating,
    ready: copy.analysisUpdated,
    fallback: copy.resilience.workerUnavailable,
    restarting: copy.resilience.workerRestarting,
    timeout: copy.resilience.analysisTimeout,
    error: copy.resilience.analysisFailed,
  };
  const runtimeProblem =
    analysisRuntimeStatus === 'timeout' || analysisRuntimeStatus === 'error';

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
            {isError ? copy.modelNeedsAttention : copy.canvasReady}
          </span>
          <span className="sm:hidden">{isError ? copy.error : copy.ready}</span>
        </span>
        <span className="hidden whitespace-nowrap md:inline">
          {copy.nodesAndFlows(nodeCount, edgeCount)}
        </span>
        <span
          className={
            runtimeProblem
              ? 'inline-flex min-w-0 items-center gap-1.5 truncate text-[var(--danger)]'
              : 'hidden items-center gap-1.5 whitespace-nowrap md:inline-flex'
          }
          role="status"
          aria-live="polite"
          data-testid="analysis-runtime-status"
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
          {runtimeLabel[analysisRuntimeStatus]}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[var(--muted)]">
        {!online ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 font-semibold text-[var(--muted-strong)]"
            title={copy.resilience.offlineHint}
            role="status"
            data-testid="offline-badge"
          >
            <WifiSlash size={13} aria-hidden="true" />
            {copy.resilience.offline}
            <span className="sr-only">{copy.resilience.offlineHint}</span>
          </span>
        ) : null}
        {pageFailed ? (
          <span role="alert" className="text-[var(--danger)]">
            {copy.fileError}
          </span>
        ) : null}
        {drawioSource && drawioSource.pages.length > 1 ? (
          <span className="inline-flex items-center gap-1.5">
            <Stack size={14} aria-hidden="true" />
            <label htmlFor={pageSelectId} className="sr-only">
              {copy.pages}
            </label>
            <AppSelect
              id={pageSelectId}
              disabled={pageBusy}
              value={String(drawioSource.pageIndex)}
              onValueChange={(next) => void switchPage(Number(next))}
              options={drawioSource.pages.map((page, index) => ({
                value: String(index),
                label: page.name,
              }))}
              className="!h-7 max-w-[10rem] !text-[11px]"
            />
          </span>
        ) : null}
        <span className="hidden items-center gap-1.5 font-mono text-[10px] sm:inline-flex">
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
