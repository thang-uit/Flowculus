'use client';

import { ArrowRight, Hourglass, Timer } from '@phosphor-icons/react';

import type { Bottleneck } from '@flowculus/process-mining';

import { formatDurationMs, formatPercent } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Slowest hand-overs and activities, by mean delay. */
export function BottleneckList({ bottlenecks }: Readonly<{ bottlenecks: Bottleneck[] }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  if (bottlenecks.length === 0) {
    return <p className="text-xs text-[var(--muted)]">{copy.miningNoBottlenecks}</p>;
  }
  const slowest = bottlenecks[0]?.meanDurationMs ?? 1;
  return (
    <ol className="space-y-1.5" aria-label={copy.miningBottlenecks}>
      {bottlenecks.map((item, index) => (
        <li
          key={item.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 font-mono text-[10px] font-bold text-[var(--muted)]">
                {index + 1}
              </span>
              {item.kind === 'transition' ? (
                <Hourglass
                  size={14}
                  className="mt-0.5 shrink-0 text-[var(--danger)]"
                  aria-hidden="true"
                />
              ) : (
                <Timer
                  size={14}
                  className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0 text-xs text-[var(--text)]">
                {item.kind === 'transition' ? (
                  <span className="flex min-w-0 flex-wrap items-center gap-1">
                    <span className="truncate">{item.source}</span>
                    <ArrowRight
                      size={11}
                      className="shrink-0 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.target}</span>
                  </span>
                ) : (
                  <span className="truncate">{item.activity}</span>
                )}
                <span className="mt-0.5 block text-[10.5px] text-[var(--muted)]">
                  {item.kind === 'transition'
                    ? copy.miningHandoverDelay
                    : copy.miningServiceTime}{' '}
                  · {item.frequency}× · {formatPercent(item.share)} {copy.miningOfTotal}
                </span>
              </span>
            </div>
            <span className="shrink-0 font-mono text-xs font-bold text-[var(--text)]">
              {formatDurationMs(item.meanDurationMs)}
            </span>
          </div>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <span
              className="block h-full origin-left rounded-full"
              style={{
                transform: `scaleX(${item.meanDurationMs / slowest})`,
                background:
                  item.kind === 'transition' ? 'var(--danger)' : 'var(--accent)',
              }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
