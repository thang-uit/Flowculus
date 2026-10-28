'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

import { StandardsPanel } from './StandardsPanel';
import type { MiningRequest, MiningResponse } from '@/lib/mining-engine';
import { BottleneckList } from '@/components/mining/BottleneckList';
import { PetriNetView } from './PetriNetView';
import { FootprintTable } from './FootprintTable';
import { AlphaPetriPanel } from '@/components/mining/AlphaPetriPanel';
import { ReferenceConformancePanel } from './ReferenceConformancePanel';
import type { ProcessModel } from '@flowculus/process-model';
import type { ConformanceOptions } from '@flowculus/process-mining';
import { ResourceCentralityTable } from '@/components/mining/ResourceCentralityTable';
import { VariantExplorer } from '@/components/mining/VariantExplorer';
import { cn } from '@/lib/cn';
import { formatDurationMs } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const TABS = ['variants', 'bottlenecks', 'resources', 'alpha', 'conformance'] as const;
type SideTab = (typeof TABS)[number];

/** Variants and bottlenecks of the current discovery, as tabs. */
export function MiningInsightsPanel({
  onCheckConformance,
  request,
}: Readonly<{
  request: (request: MiningRequest) => Promise<MiningResponse>;
  onCheckConformance: (model: ProcessModel, options: ConformanceOptions) => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const discovery = useMiningStore((state) => state.result?.discovery);
  const socialNetwork = useMiningStore((state) => state.result?.socialNetwork);
  const evidence = useMiningStore((state) => state.result);
  const alpha = useMiningStore((state) => state.result?.alpha);
  const [tab, setTab] = useState<SideTab>('variants');
  const tabListRef = useRef<HTMLDivElement>(null);

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.indexOf(tab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? TABS.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % TABS.length
            : event.key === 'ArrowLeft'
              ? (index - 1 + TABS.length) % TABS.length
              : null;
    if (next == null) return;
    event.preventDefault();
    setTab(TABS[next]);
    tabListRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };

  return (
    <aside className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] lg:w-[var(--mining-insights-width,340px)] lg:overflow-y-auto lg:border-t-0 scrollbar-thin">
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={copy.miningInsights}
        onKeyDown={onTabKeyDown}
        className="flex overflow-x-auto border-b border-[var(--border)] scrollbar-thin"
      >
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={`mining-tab-${item}`}
            id={`mining-tab-button-${item}`}
            tabIndex={tab === item ? 0 : -1}
            onClick={() => setTab(item)}
            className={cn(
              'focus-ring relative min-w-max flex-1 cursor-pointer px-3 py-2.5 text-xs font-semibold transition-colors',
              tab === item
                ? 'text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]',
            )}
          >
            {item === 'variants'
              ? copy.miningVariants
              : item === 'bottlenecks'
                ? copy.miningBottlenecks
                : item === 'resources'
                  ? copy.miningResource
                  : item === 'alpha'
                    ? copy.miningAlpha
                    : copy.miningConformance}
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
          ) : tab === 'bottlenecks' ? (
            <>
              <p className="mb-2 text-[11px] leading-4 text-[var(--muted)]">
                {copy.miningBottlenecksHint}
                {` ${copy.miningNoStartTimes}`}
              </p>
              <BottleneckList bottlenecks={discovery.bottlenecks} />
              <StandardsPanel request={request} />
            </>
          ) : tab === 'resources' && socialNetwork ? (
            <ResourceCentralityTable network={socialNetwork} />
          ) : tab === 'alpha' && alpha ? (
            <div className="space-y-5">
              <AlphaPetriPanel result={alpha} />
              <FootprintTable footprint={evidence?.footprint ?? null} />
              {evidence?.petri?.status === 'ready' ? (
                <PetriNetView
                  net={evidence.petri.net}
                  verification={evidence.verification}
                />
              ) : null}
            </div>
          ) : tab === 'conformance' ? (
            <ReferenceConformancePanel onCheck={onCheckConformance} />
          ) : null
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
