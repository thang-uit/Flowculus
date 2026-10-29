'use client';

import { Briefcase } from '@phosphor-icons/react';

import { DfgCanvas } from '@/components/mining/DfgCanvas';
import { MiningKpiStrip } from '@/components/mining/MiningKpiStrip';
import { SocialNetworkCanvas } from '@/components/mining/SocialNetworkCanvas';
import { cn } from '@/lib/cn';
import { formatInteger } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getMiningDataCopy } from '@/lib/i18n/mining-data-copy';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** The directly-follows map with its metric switch, log badge and legend. */
export function MiningMapView() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const dataCopy = getMiningDataCopy(locale);
  const status = useMiningStore((state) => state.status);
  const result = useMiningStore((state) => state.result);
  const selectedVariantId = useMiningStore((state) => state.selectedVariantId);
  const edgeMetric = useMiningStore((state) => state.edgeMetric);
  const mapMode = useMiningStore((state) => state.mapMode);
  const setMapMode = useMiningStore((state) => state.setMapMode);
  const discovery = result?.discovery;
  const variant = discovery?.variants.find((item) => item.id === selectedVariantId);

  return (
    <main
      className="flex min-h-0 min-w-0 flex-none flex-col lg:flex-1"
      aria-label={mapMode === 'process' ? copy.miningMap : copy.miningNetwork}
    >
      {discovery ? <MiningKpiStrip stats={discovery.stats} /> : null}
      <div className="relative h-[62dvh] min-h-[320px] lg:h-auto lg:flex-1">
        {result && mapMode === 'resources' ? (
          <SocialNetworkCanvas network={result.socialNetwork} />
        ) : discovery ? (
          <DfgCanvas
            dfg={discovery.dfg}
            variant={variant}
            metric={edgeMetric}
            label={copy.miningMap}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            {status === 'loading' ? copy.miningLoading : copy.miningEmpty}
          </div>
        )}
        <div className="absolute left-3 top-3 z-[5] flex flex-wrap items-center gap-2">
          <div className="flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-soft)]">
            {(['process', 'resources'] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={mapMode === view}
                onClick={() => setMapMode(view)}
                className={cn(
                  'focus-ring h-full cursor-pointer rounded-md px-2.5 text-[11px] font-medium',
                  mapMode === view
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'text-[var(--muted-strong)] hover:text-[var(--text)]',
                )}
              >
                {view === 'process' ? copy.miningMap : copy.miningNetwork}
              </button>
            ))}
          </div>
          {mapMode === 'process' ? (
            <div
              role="group"
              aria-label={copy.miningEdgeMetric}
              className="flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-soft)]"
            >
              {(['frequency', 'duration'] as const).map((metric) => (
                <button
                  key={metric}
                  type="button"
                  aria-pressed={edgeMetric === metric}
                  onClick={() => useMiningStore.getState().setEdgeMetric(metric)}
                  className={cn(
                    'focus-ring h-full cursor-pointer rounded-md px-2.5 text-[11px] font-medium',
                    edgeMetric === metric
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]',
                  )}
                >
                  {metric === 'frequency' ? copy.miningFrequency : copy.miningDuration}
                </button>
              ))}
            </div>
          ) : null}
          {result ? (
            <span className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] text-[var(--muted-strong)] shadow-[var(--shadow-soft)] sm:inline">
              <Briefcase
                size={12}
                className="mr-1 inline align-[-1px]"
                aria-hidden="true"
              />
              {result.logName} ·{' '}
              {dataCopy.caseCount(
                discovery?.stats.caseCount ?? 0,
                formatInteger(discovery?.stats.caseCount ?? 0, locale),
              )}
              {status === 'loading' ? ` · ${copy.miningLoading}` : ''}
            </span>
          ) : null}
        </div>
        {mapMode === 'process' ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[5] hidden items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10.5px] text-[var(--muted)] shadow-[var(--shadow-soft)] sm:flex">
            <span className="inline-flex items-center gap-1">
              <span
                className="h-0.5 w-4 rounded bg-[var(--flow-edge)]"
                aria-hidden="true"
              />
              {copy.miningLegendFast}
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-0.5 w-4 rounded bg-[var(--accent-strong)]"
                aria-hidden="true"
              />
              {copy.miningLegendSlow}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-0.5 w-4 rounded bg-[var(--danger)]" aria-hidden="true" />
              {copy.miningLegendBottleneck}
            </span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
