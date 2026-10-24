'use client';

import { formatValue } from '@/components/scenario/format-value';
import { cn } from '@/lib/cn';
import { formatDiagnostic } from '@/lib/diagnostic-messages';
import { formatPercent } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Little's Law read-out and the single-station queue result. */
export function QueueSummary() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const queue = report.queue;
  if (!report.littleLaw && !queue) return null;

  return (
    <div className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
      {report.littleLaw ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <p className="text-[10px] font-semibold text-[var(--muted-strong)]">
            {copy.scenarioFormula}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[var(--text)]">
            {Number(report.littleLaw.workInProcess.toFixed(2))} ={' '}
            {Number(report.littleLaw.arrivalRatePerHour.toFixed(2))}/h ×{' '}
            {formatValue(report.littleLaw.cycleTimeHours, ' h', copy.emptyValue)}
          </p>
        </div>
      ) : null}
      {queue ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-[var(--muted-strong)]">
              {copy.queueModel} · {queue.model}
            </p>
            <span
              className={cn(
                'text-[10px] font-semibold',
                queue.status === 'ready'
                  ? 'text-[var(--success)]'
                  : 'text-[var(--danger)]',
              )}
            >
              {queue.status === 'ready'
                ? copy.ready
                : queue.status === 'unstable'
                  ? copy.simulationRequired
                  : copy.error}
            </span>
          </div>
          {queue.status === 'ready' ? (
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--muted)]">
              <span>
                {copy.queueUtilization}:{' '}
                {formatPercent(queue.utilization) ?? copy.emptyValue}
              </span>
              <span>
                {copy.averageQueue}:{' '}
                {formatValue(queue.averageQueueLength, '', copy.emptyValue)}
              </span>
              <span>
                {copy.averageWait}:{' '}
                {formatValue(queue.averageWaitingHours, ' h', copy.emptyValue)}
              </span>
              <span>
                {copy.averageSystem}:{' '}
                {formatValue(queue.averageSystemHours, ' h', copy.emptyValue)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
              {queue.issues.map((issue) => formatDiagnostic(issue, locale)).join(' ')}
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
            {queue.formula}
          </p>
        </div>
      ) : null}
    </div>
  );
}
