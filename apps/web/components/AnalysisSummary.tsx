'use client';

import {
  ChartLineUp,
  Clock,
  CurrencyDollar,
  GitFork,
  Info,
  Pulse,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

const formatMinutes = (value: number | null, unit: string, emptyValue: string) =>
  value == null ? emptyValue : `${Number(value.toFixed(2))} ${unit}`;
const formatPercent = (value: number | null) =>
  value == null ? null : `${Number((value * 100).toFixed(1))}%`;
const formatCost = (
  value: number | null,
  currency: string | undefined,
  locale: string,
) => {
  if (value == null) return null;
  const safeCurrency = currency?.trim().toUpperCase();
  if (!safeCurrency) return Number(value.toFixed(2)).toString();
  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${safeCurrency} ${Number(value.toFixed(2))}`;
  }
};

export function AnalysisSummary() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const analysisRevision = useWorkspaceStore((state) => state.analysisRevision);
  const model = useWorkspaceStore((state) => state.processModel);
  const gatewayCount = Object.values(model.nodes).filter(
    (node) => node.kind === 'gateway',
  ).length;
  const currencies = new Set(
    Object.values(model.nodes)
      .map((node) => node.cost?.currency?.trim().toUpperCase())
      .filter((currency): currency is string => Boolean(currency)),
  );
  const currency = currencies.size === 1 ? [...currencies][0] : undefined;
  const statusLabel =
    report.quality === 'exact'
      ? copy.exact
      : report.quality === 'assumption'
        ? copy.assumption
        : copy.simulationRequired;
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
      value: formatMinutes(report.cycleTimeMinutes, copy.minutes, copy.emptyValue),
      icon: Clock,
      accent: true,
    },
    {
      label: copy.theoreticalTime,
      sublabel: copy.theoreticalTimeFormulaDesc,
      value: formatMinutes(
        report.theoreticalCycleTimeMinutes,
        copy.minutes,
        copy.emptyValue,
      ),
      icon: Pulse,
      accent: false,
    },
    {
      label: copy.cte,
      sublabel: copy.cteFormulaDesc,
      value: formatPercent(report.cycleTimeEfficiency) ?? copy.emptyValue,
      icon: ChartLineUp,
      accent: false,
    },
    {
      label: copy.cost,
      sublabel: copy.costFormulaDesc,
      value: formatCost(report.costPerExecution, currency, locale) ?? copy.emptyValue,
      icon: CurrencyDollar,
      accent: false,
    },
  ];

  return (
    <section
      className="w-full border-b border-[var(--border)] bg-[var(--surface)]"
      aria-label={copy.analysisSummary}
    >
      {/* 4 Full-Width KPI Cards */}
      <div className="grid w-full grid-cols-2 divide-x divide-y divide-[var(--border)] sm:divide-y-0 lg:grid-cols-4">
        {metrics.map(({ label, sublabel, value, icon: Icon, accent }) => (
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
                : report.pathCount?.warning || copy.pathCountUnavailable
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

        <div className="flex items-center gap-2">
          <Tooltip content={copy.analysisQualityHint}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10.5px] font-semibold text-[var(--muted-strong)]">
              <Info
                size={13}
                className="text-[var(--accent-strong)]"
                aria-hidden="true"
              />
              {statusLabel}
            </span>
          </Tooltip>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {isUpdated ? copy.analysisUpdated : ''}
      </span>
    </section>
  );
}
