'use client';

import { ArrowCounterClockwise } from '@phosphor-icons/react';

import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Frequency and duration thresholds; changes re-run discovery (debounced). */
export function MiningFilterPanel() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const filter = useMiningStore((state) => state.filter);
  const discovery = useMiningStore((state) => state.result?.discovery);
  const maxTransitionHours = Math.max(
    1,
    Math.ceil(
      Math.max(
        discovery?.dfg.maxMeanDurationMs ?? 0,
        ...(discovery?.bottlenecks ?? [])
          .filter((item) => item.kind === 'transition')
          .map((item) => item.meanDurationMs),
      ) / 3_600_000,
    ),
  );

  return (
    <section
      className="space-y-4 border-b border-[var(--border)] p-4"
      aria-labelledby="mining-filter-title"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="mining-filter-title"
          className="text-[13px] font-semibold text-[var(--text)]"
        >
          {copy.miningFilters}
        </h2>
        <button
          type="button"
          onClick={() => useMiningStore.getState().resetFilter()}
          aria-label={copy.miningResetFilters}
          title={copy.miningResetFilters}
          className="focus-ring tb-btn tb-btn--idle size-7"
        >
          <ArrowCounterClockwise size={14} aria-hidden="true" />
        </button>
      </div>
      {(
        [
          ['minActivityShare', copy.miningActivityThreshold, 100, '%'],
          ['minEdgeShare', copy.miningEdgeThreshold, 100, '%'],
          [
            'minTransitionHours',
            copy.miningDurationThreshold,
            maxTransitionHours,
            locale === 'vi' ? ' giờ' : ' h',
          ],
        ] as const
      ).map(([key, label, max, unit]) => {
        const value =
          key === 'minTransitionHours' ? filter[key] : Math.round(filter[key] * 100);
        const id = `mining-filter-${key}`;
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={id}
                className="text-[11px] font-medium text-[var(--muted-strong)]"
              >
                {label}
              </label>
              <span className="font-mono text-[11px] font-semibold text-[var(--text)]">
                ≥{' '}
                {new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
                  maximumFractionDigits: 1,
                }).format(value)}
                {unit}
              </span>
            </div>
            <input
              id={id}
              type="range"
              min={0}
              max={max}
              step={key === 'minTransitionHours' ? Math.max(0.1, max / 100) : 1}
              value={value}
              onChange={(event) => {
                const next = Number(event.target.value);
                useMiningStore.getState().setFilter({
                  [key]: key === 'minTransitionHours' ? next : next / 100,
                });
              }}
              className="flow-range"
            />
          </div>
        );
      })}
      {discovery &&
      (discovery.hiddenActivityCount > 0 || discovery.hiddenEdgeCount > 0) ? (
        <p className="text-[11px] text-[var(--muted)]">
          {copy.miningHidden(discovery.hiddenActivityCount, discovery.hiddenEdgeCount)}
        </p>
      ) : null}
    </section>
  );
}
