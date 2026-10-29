'use client';

import {
  ChartLineUp,
  Clock,
  CurrencyDollar,
  GitFork,
  Path,
  Pulse,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { QUALITY_DOT, QualityBadge, qualityLabel } from '@/components/ui/QualityBadge';
import { formatPathCountWarning } from '@/lib/diagnostic-messages';
import {
  formatCost,
  formatCycleMinutes,
  formatPercent,
  getModelCurrency,
} from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function AnalysisSummary() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const empty = report.status === 'empty';
  const analysisRevision = useWorkspaceStore((state) => state.analysisRevision);
  const model = useWorkspaceStore((state) => state.processModel);
  const gatewayCount = Object.values(model.nodes).filter(
    (node) => node.kind === 'gateway',
  ).length;
  const currency = getModelCurrency(Object.values(model.nodes));
  const chain =
    report.criticalChain?.status === 'ready' ? report.criticalChain : undefined;
  const [isUpdated, setIsUpdated] = useState(false);
  const previousRevisionRef = useRef(analysisRevision);

  useEffect(() => {
    if (previousRevisionRef.current === analysisRevision) return;
    previousRevisionRef.current = analysisRevision;
    setIsUpdated(true);
    const timer = window.setTimeout(() => setIsUpdated(false), 620);
    return () => window.clearTimeout(timer);
  }, [analysisRevision]);

  const metrics = [
    {
      label: copy.cycleTime,
      sublabel: copy.cycleTimeFormulaDesc,
      value: formatCycleMinutes(report.cycleTimeMinutes, copy.minutes, copy.emptyValue),
      icon: Clock,
      accent: true,
      quality: report.metricQuality.cycleTime,
    },
    {
      label: copy.theoreticalTime,
      sublabel: copy.theoreticalTimeFormulaDesc,
      value: formatCycleMinutes(
        report.theoreticalCycleTimeMinutes,
        copy.minutes,
        copy.emptyValue,
      ),
      icon: Pulse,
      accent: false,
      quality: report.metricQuality.theoreticalCycleTime,
    },
    {
      label: copy.cte,
      sublabel: copy.cteFormulaDesc,
      value: formatPercent(report.cycleTimeEfficiency, 1, locale) ?? copy.emptyValue,
      icon: ChartLineUp,
      accent: false,
      quality: report.metricQuality.cycleTimeEfficiency,
    },
    {
      label: copy.cost,
      sublabel: copy.costFormulaDesc,
      value: formatCost(report.costPerExecution, currency, locale) ?? copy.emptyValue,
      icon: CurrencyDollar,
      accent: false,
      quality: report.metricQuality.cost,
    },
  ];

  return (
    <section
      className="w-full border-b border-[var(--border)] bg-[var(--surface)]"
      aria-label={copy.analysisSummary}
    >
      {/* 4 Full-Width KPI Cards */}
      <div className="grid w-full grid-cols-2 divide-x divide-y divide-[var(--border)] sm:divide-y-0 lg:grid-cols-4">
        {metrics.map(({ label, sublabel, value, icon: Icon, accent, quality }) => (
          <div
            key={label}
            className="flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5"
          >
            <span
              className={
                accent
                  ? 'flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-xs'
                  : 'flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--muted-strong)]'
              }
            >
              <Icon size={19} weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {label}
                </p>
                {!empty ? (
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${QUALITY_DOT[quality]}`}
                    title={qualityLabel(quality, copy)}
                    aria-label={qualityLabel(quality, copy)}
                    role="img"
                  />
                ) : null}
              </div>
              <p className="mt-0.5 truncate font-mono text-base font-bold text-[var(--text)] sm:text-lg lg:text-xl">
                <span
                  key={`${analysisRevision}-${label}`}
                  className={isUpdated ? 'analysis-value-update' : undefined}
                >
                  {value}
                </span>
              </p>
              <p className="hidden truncate text-[10px] text-[var(--muted)]/80 md:block">
                {sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Full-width metadata info strip */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <GitFork
            size={15}
            className="shrink-0 text-[var(--accent-strong)]"
            aria-hidden="true"
          />
          <span className="font-medium text-[var(--text)]">
            {copy.gatewayCount(gatewayCount)}
          </span>
          <span className="text-[var(--border-strong)]">|</span>
          <span
            className="font-medium text-[var(--text)]"
            title={
              report.pathCount?.status === 'ready'
                ? report.pathCount.formula
                : (formatPathCountWarning(report.pathCount?.warning, copy) ??
                  copy.pathCountUnavailable)
            }
          >
            {copy.pathCount(
              report.pathCount?.status === 'ready' ? report.pathCount.count : null,
            )}
          </span>
          <span className="text-[var(--border-strong)]">|</span>
          <span>
            {copy.method}:{' '}
            <strong className="font-medium text-[var(--muted-strong)]">
              {copy.bookFlowAnalysis}
            </strong>
          </span>
        </div>

        {empty ? (
          <span className="text-xs text-[var(--muted-strong)]">{copy.emptyAnalysis}</span>
        ) : (
          <QualityBadge quality={report.quality} copy={copy} />
        )}
      </div>

      {chain && chain.taskLabels.length > 0 ? (
        <div className="flex w-full min-w-0 items-center gap-2 border-t border-[var(--border)] px-4 py-2 text-xs sm:px-6">
          <Path
            size={15}
            className="shrink-0 text-[var(--accent-strong)]"
            aria-hidden="true"
          />
          <span className="shrink-0 font-semibold text-[var(--text)]">
            {copy.quality.criticalChainTitle}
          </span>
          <span
            className="min-w-0 truncate text-[var(--muted-strong)]"
            title={chain.taskLabels.join(' → ')}
          >
            {chain.taskLabels.join(' → ')}
          </span>
          <span className="ml-auto shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {chain.quality === 'exact'
              ? copy.quality.criticalChainExact
              : copy.quality.criticalChainHeuristic}
          </span>
        </div>
      ) : null}

      <span className="sr-only" role="status" aria-live="polite">
        {isUpdated ? copy.analysisUpdated : ''}
      </span>
    </section>
  );
}
