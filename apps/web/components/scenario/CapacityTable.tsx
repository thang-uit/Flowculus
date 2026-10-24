'use client';

import { formatValue } from '@/components/scenario/format-value';
import { formatPercent } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Resource-pool load, utilisation ρ (a ratio, shown as %) and M/M/c wait. */
export function CapacityTable() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const capacity = useWorkspaceStore((state) => state.analysisReport.capacity);
  if (capacity.length === 0) return null;

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] scrollbar-thin">
      <table className="w-full min-w-[560px] text-left text-[11px]">
        <caption className="px-3 pt-2 text-left text-[10px] font-semibold text-[var(--muted-strong)]">
          {copy.resourcePools}
        </caption>
        <thead className="text-[10px] uppercase tracking-[0.06em] text-[var(--muted)]">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              {copy.resourcePool}
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              {copy.capacityLoad}
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              {copy.resourceCount}
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              {copy.capacityPerDay}
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              ρ
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              Wq
            </th>
          </tr>
        </thead>
        <tbody className="font-mono text-[var(--text)]">
          {capacity.map((pool) => (
            <tr key={pool.resourcePoolId} className="border-t border-[var(--border)]">
              <td className="px-3 py-1.5 font-sans">
                <span className="font-medium">{pool.resourcePoolId}</span>
                {pool.isBottleneck ? (
                  <span className="ml-1.5 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--accent-strong)]">
                    {copy.bottleneck}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-1.5">
                {formatValue(
                  pool.unitLoadMinutes,
                  ` ${copy.minutesShort}`,
                  copy.emptyValue,
                )}
              </td>
              <td className="px-3 py-1.5">{pool.resourceCount ?? copy.emptyValue}</td>
              <td className="px-3 py-1.5">
                {formatValue(pool.capacityPerDay, '', copy.emptyValue)}
              </td>
              <td className="px-3 py-1.5">
                {formatPercent(pool.utilization) ?? copy.emptyValue}
              </td>
              <td className="px-3 py-1.5">
                {pool.queue?.status === 'ready'
                  ? formatValue(pool.queue.averageWaitingHours, ' h', copy.emptyValue)
                  : pool.queue?.status === 'unstable'
                    ? '∞'
                    : copy.emptyValue}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
