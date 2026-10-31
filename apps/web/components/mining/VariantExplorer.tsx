'use client';

import { useMiningDuration } from '@/lib/use-mining-duration';
import type { TraceVariant } from '@flowculus/process-mining';

import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const MAX_VISIBLE_VARIANTS = 50;

/** Trace variants ranked by frequency; selecting one highlights it on the map. */
export function VariantExplorer({ variants }: Readonly<{ variants: TraceVariant[] }>) {
  const formatDurationMs = useMiningDuration();
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const selectedId = useMiningStore((state) => state.selectedVariantId);
  const select = useMiningStore((state) => state.setSelectedVariantId);
  const maxShare = variants.reduce(
    (max, variant) => Math.max(max, variant.share),
    0.0001,
  );

  return (
    <ol className="space-y-1.5" aria-label={copy.miningVariants}>
      {variants.slice(0, MAX_VISIBLE_VARIANTS).map((variant) => {
        const selected = variant.id === selectedId;
        return (
          <li key={variant.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => select(selected ? null : variant.id)}
              className={cn(
                'focus-ring w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="font-mono text-[11px] font-bold text-[var(--text)]">
                    {variant.id}
                  </span>
                  {variant.isHappyPath ? (
                    <span
                      title={copy.miningHappyPathHint}
                      className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[var(--accent-ink)]"
                    >
                      {copy.miningHappyPathBadge}
                    </span>
                  ) : null}
                  {variant.hasRepetition ? (
                    <span className="rounded bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[var(--danger)]">
                      {copy.miningLoopBadge}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[var(--muted-strong)]">
                  {formatPercent(variant.share, 1, locale)} · {variant.caseCount}
                </span>
              </span>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                <span
                  className="block h-full origin-left rounded-full bg-[var(--accent)]"
                  style={{ transform: `scaleX(${variant.share / maxShare})` }}
                />
              </span>
              <span
                className="mt-2 block break-words text-xs leading-5 text-[var(--muted-strong)]"
                title={variant.activities.join(' → ')}
              >
                {variant.activities.length} {copy.miningSteps} ·{' '}
                {formatDurationMs(variant.meanLeadTimeMs)} ·{' '}
                {variant.activities.join(' → ')}
              </span>
            </button>
          </li>
        );
      })}
      {variants.length > MAX_VISIBLE_VARIANTS ? (
        <li className="px-1 text-[11px] text-[var(--muted)]">
          {copy.miningMoreVariants(variants.length - MAX_VISIBLE_VARIANTS)}
        </li>
      ) : null}
    </ol>
  );
}
