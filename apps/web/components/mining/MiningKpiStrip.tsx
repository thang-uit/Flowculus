'use client';

import type { EventLogStats } from '@flowculus/process-mining';

import { formatDurationMs, formatInteger, formatPercent } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function MiningKpiStrip({ stats }: Readonly<{ stats: EventLogStats }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const items: Array<{ label: string; value: string; hint?: string; accent?: boolean }> =
    [
      { label: copy.miningCases, value: formatInteger(stats.caseCount, locale) },
      { label: copy.miningEvents, value: formatInteger(stats.eventCount, locale) },
      { label: copy.miningActivities, value: formatInteger(stats.activityCount, locale) },
      { label: copy.miningVariants, value: formatInteger(stats.variantCount, locale) },
      {
        label: copy.miningLeadTime,
        value: formatDurationMs(stats.meanLeadTimeMs),
        hint: `${copy.miningMedian} ${formatDurationMs(stats.medianLeadTimeMs)}`,
        accent: true,
      },
      {
        label: copy.miningHappyPath,
        value: formatPercent(stats.happyPathShare) ?? copy.emptyValue,
        hint: copy.miningHappyPathHint,
      },
    ];
  return (
    <section
      aria-label={copy.miningSummary}
      className="grid shrink-0 grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--surface)] md:grid-cols-6"
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-3 py-2.5 sm:px-4">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {item.label}
          </p>
          <p
            className={
              item.accent
                ? 'mt-0.5 truncate font-mono text-base font-bold text-[var(--accent-strong)]'
                : 'mt-0.5 truncate font-mono text-base font-bold text-[var(--text)]'
            }
          >
            {item.value}
          </p>
          {item.hint ? (
            <p className="hidden truncate text-[10px] text-[var(--muted)] sm:block">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
