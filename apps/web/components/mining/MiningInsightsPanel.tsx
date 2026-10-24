'use client';

import { useState } from 'react';

import { BottleneckList } from '@/components/mining/BottleneckList';
import { VariantExplorer } from '@/components/mining/VariantExplorer';
import { cn } from '@/lib/cn';
import { formatDurationMs } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

type SideTab = 'variants' | 'bottlenecks';

/** Variants and bottlenecks of the current discovery, as tabs. */
export function MiningInsightsPanel() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const discovery = useMiningStore((state) => state.result?.discovery);
  const [tab, setTab] = useState<SideTab>('variants');

  return (
    <aside className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] lg:w-[340px] lg:overflow-y-auto lg:border-l lg:border-t-0 scrollbar-thin">
      <div
        role="tablist"
        aria-label={copy.miningInsights}
        className="flex border-b border-[var(--border)]"
      >
        {(['variants', 'bottlenecks'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={`mining-tab-${item}`}
            id={`mining-tab-button-${item}`}
            onClick={() => setTab(item)}
            className={cn(
              'focus-ring relative flex-1 cursor-pointer px-3 py-2.5 text-xs font-semibold transition-colors',
              tab === item
                ? 'text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]',
            )}
          >
            {item === 'variants' ? copy.miningVariants : copy.miningBottlenecks}
            {tab === item ? (
              <span
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--accent)]"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ))}
      </div>
      <div
        id={`mining-tab-${tab}`}
        role="tabpanel"
        aria-labelledby={`mining-tab-button-${tab}`}
        className="p-3"
      >
        {discovery ? (
          tab === 'variants' ? (
            <>
              <p className="mb-2 text-[11px] leading-4 text-[var(--muted)]">
                {copy.miningVariantsHint}
              </p>
              <VariantExplorer variants={discovery.variants} />
            </>
          ) : (
            <>
              <p className="mb-2 text-[11px] leading-4 text-[var(--muted)]">
                {copy.miningBottlenecksHint}
                {discovery.stats.hasStartTimes ? '' : ` ${copy.miningNoStartTimes}`}
              </p>
              <BottleneckList bottlenecks={discovery.bottlenecks} />
            </>
          )
        ) : null}
        {discovery ? (
          <p className="mt-3 text-[10.5px] text-[var(--muted)]">
            {copy.miningPeriod}:{' '}
            {discovery.stats.firstEventTime != null &&
            discovery.stats.lastEventTime != null
              ? `${new Date(discovery.stats.firstEventTime).toISOString().slice(0, 10)} → ${new Date(discovery.stats.lastEventTime).toISOString().slice(0, 10)} (${formatDurationMs(discovery.stats.lastEventTime - discovery.stats.firstEventTime)})`
              : copy.emptyValue}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
