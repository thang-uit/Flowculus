'use client';

import { Info } from '@phosphor-icons/react';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/**
 * Names the highlighted chain and its quality next to the canvas. An exact
 * chain is drawn solid; an estimate (expected-time heuristic) is dashed.
 */
export function CriticalChainLegend() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale).quality;
  const chain = useWorkspaceStore((state) => state.analysisReport.criticalChain);
  if (!chain || chain.status !== 'ready' || chain.edgeIds.length === 0) return null;
  const exact = chain.quality === 'exact';
  const title = exact ? copy.criticalChainExact : copy.criticalChainHeuristic;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[5] hidden max-w-[min(320px,calc(100%-1.5rem))] items-center gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--muted-strong)] shadow-[var(--shadow-soft)] sm:flex">
      <svg
        width="28"
        height="8"
        viewBox="0 0 28 8"
        aria-hidden="true"
        className="shrink-0"
      >
        <line
          x1="1"
          y1="4"
          x2="27"
          y2="4"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={exact ? undefined : '6 4'}
        />
      </svg>
      <span className="truncate font-medium">
        {exact ? copy.legendExact : copy.legendEstimate}
      </span>
      <Tooltip content={`${title}: ${copy.criticalChainHint}`}>
        <button
          type="button"
          aria-label={`${title}: ${copy.criticalChainHint}`}
          title={copy.criticalChainHint}
          className="focus-ring inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
        >
          <Info size={13} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
