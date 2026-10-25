'use client';

import { Info, WarningCircle } from '@phosphor-icons/react';
import { resolveActivityTime } from '@flowculus/analysis-engine';
import type { ProcessNode } from '@flowculus/process-model';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const round = (value: number): string => String(Number(value.toFixed(2)));

/**
 * States which cycle time the engine uses for this activity and where it
 * comes from (observed D or derived T + Wq), using the engine's own contract.
 */
export function ActivityTimeSummary({ node }: Readonly<{ node: ProcessNode }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const time = resolveActivityTime(node);
  const missing = time.cycleTimeSource === 'missing';

  return (
    <div
      className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-[11px] leading-4"
      aria-live="polite"
    >
      <p className="flex items-center justify-between gap-2">
        <span className="text-[var(--muted)]">{copy.quality.effectiveCycleTime}</span>
        <strong className="font-mono font-semibold text-[var(--text)]">
          {missing ? copy.emptyValue : `${round(time.cycleTimeMinutes)} ${copy.minutes}`}
        </strong>
      </p>
      <p className="flex items-center justify-between gap-2">
        <span className="text-[var(--muted)]">{copy.quality.cycleTimeSourceLabel}</span>
        <span className="text-right font-medium text-[var(--muted-strong)]">
          {copy.quality.cycleTimeSource[time.cycleTimeSource]}
        </span>
      </p>
      <p className="flex items-center justify-between gap-2">
        <span className="text-[var(--muted)]">T</span>
        <span className="text-right font-medium text-[var(--muted-strong)]">
          {copy.quality.processingSource[time.processingSource]}
        </span>
      </p>
      {time.unexplainedWaitMinutes > 0 ? (
        <p
          className="flex items-start gap-1.5 pt-1 text-[var(--accent-strong)]"
          role="note"
        >
          <WarningCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          {copy.quality.unexplainedWait(round(time.unexplainedWaitMinutes))}
        </p>
      ) : null}
      {time.processingSource === 'cycle-time-estimate' ? (
        <p className="flex items-start gap-1.5 pt-1 text-[var(--muted)]" role="note">
          <Info size={13} className="mt-px shrink-0" aria-hidden="true" />
          {copy.quality.processingSource['cycle-time-estimate']}
        </p>
      ) : null}
    </div>
  );
}
