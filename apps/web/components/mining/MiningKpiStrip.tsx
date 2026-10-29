'use client';

import { useMiningDuration } from '@/lib/use-mining-duration';
import type { EventLogStats } from '@flowculus/process-mining';

import { formatInteger, formatPercent } from '@/lib/format';
import { getCalendarCopy } from '@/lib/i18n/calendar-copy';
import { useMiningStore } from '@/lib/mining-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function MiningKpiStrip({ stats }: Readonly<{ stats: EventLogStats }>) {
  const formatDurationMs = useMiningDuration();
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const basis = useMiningStore((s) => s.result?.discovery.timePolicy.basis);
  const clockCopy = getCalendarCopy(locale);
  const items: Array<{
    label: string;
    value: string;
    hint?: string;
    accent?: boolean;
    basis?: string;
  }> = [
    { label: copy.miningCases, value: formatInteger(stats.caseCount, locale) },
    { label: copy.miningEvents, value: formatInteger(stats.eventCount, locale) },
    { label: copy.miningActivities, value: formatInteger(stats.activityCount, locale) },
    { label: copy.miningVariants, value: formatInteger(stats.variantCount, locale) },
    {
      label: copy.miningLeadTime,
      basis: basis === 'working' ? clockCopy.working : clockCopy.elapsed,
      value: formatDurationMs(stats.meanLeadTimeMs),
      hint: `${copy.miningMedian} ${formatDurationMs(stats.medianLeadTimeMs)}`,
      accent: true,
    },
    {
      label: copy.miningHappyPath,
      value: formatPercent(stats.happyPathShare, 1, locale) ?? copy.emptyValue,
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
          <p
            title={item.label}
            className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
          >
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
          {item.basis ? (
            <p className="mt-0.5 text-[10px] font-medium leading-4 text-[var(--muted-strong)]">
              {item.basis}
            </p>
          ) : null}
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
