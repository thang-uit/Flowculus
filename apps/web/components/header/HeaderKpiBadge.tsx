'use client';

import { ChartLineUp } from '@phosphor-icons/react';

import { QUALITY_DOT, qualityLabel } from '@/components/ui/QualityBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { formatKpiMinutes, formatPercent } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/**
 * Live CT / TCT / CTE readout. It re-renders only when the worker publishes a
 * new report; clicking it opens the analysis dock.
 */
export function HeaderKpiBadge({ compact = false }: Readonly<{ compact?: boolean }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const revision = useWorkspaceStore((state) => state.analysisRevision);
  const calculating = useWorkspaceStore(
    (state) => state.analysisRuntimeStatus === 'calculating',
  );
  const dockOpen = useWorkspaceStore((state) => state.analysisDockOpen);
  const toggleDock = useWorkspaceStore((state) => state.toggleAnalysisDock);

  const quality = qualityLabel(report.quality, copy);
  const ct = formatKpiMinutes(report.cycleTimeMinutes, copy.emptyValue);
  const tct = formatKpiMinutes(report.theoreticalCycleTimeMinutes, copy.emptyValue);
  const cte = formatPercent(report.cycleTimeEfficiency) ?? copy.emptyValue;
  const summary = `CT ${ct} · TCT ${tct} · CTE ${cte} · ${quality}`;

  return (
    <Tooltip content={`${copy.liveKpiHint} — ${summary}`}>
      <button
        type="button"
        onClick={toggleDock}
        aria-expanded={dockOpen}
        aria-controls="analysis-dock-content"
        aria-label={`${copy.analysisSummary}: ${summary}`}
        title={summary}
        className={cn(
          'focus-ring flex h-8 shrink-0 cursor-pointer items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] font-mono text-[11px] tabular-nums text-[var(--muted-strong)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]',
          compact ? 'gap-1.5 px-1.5' : 'gap-2 px-2',
          dockOpen && 'border-[var(--accent)] bg-[var(--accent-soft)]',
        )}
      >
        <ChartLineUp
          size={14}
          weight="bold"
          aria-hidden="true"
          className={cn(
            'shrink-0 text-[var(--accent-strong)]',
            // The narrowest phones keep the value and quality dot only.
            compact && 'max-[359px]:hidden',
            calculating && 'animate-pulse',
          )}
        />
        <span key={`ct-${revision}`} className="analysis-value-update">
          <span className="text-[var(--muted)]">CT </span>
          <strong className="font-semibold text-[var(--text)]">{ct}</strong>
        </span>
        {!compact ? (
          <>
            <span
              className="hidden text-[var(--border-strong)] xl:inline"
              aria-hidden="true"
            >
              |
            </span>
            <span
              key={`tct-${revision}`}
              className="analysis-value-update hidden xl:inline"
            >
              <span className="text-[var(--muted)]">TCT </span>
              <strong className="font-semibold text-[var(--text)]">{tct}</strong>
            </span>
            <span className="text-[var(--border-strong)]" aria-hidden="true">
              |
            </span>
            <span key={`cte-${revision}`} className="analysis-value-update">
              <span className="text-[var(--muted)]">CTE </span>
              <strong className="font-semibold text-[var(--text)]">{cte}</strong>
            </span>
          </>
        ) : null}
        <span
          className={cn('size-1.5 shrink-0 rounded-full', QUALITY_DOT[report.quality])}
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  );
}
