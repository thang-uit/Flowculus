'use client';

import { Path } from '@phosphor-icons/react';
import type { AnalysisReport } from '@flowculus/analysis-engine';

import { QualityBadge } from '@/components/ui/QualityBadge';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/**
 * Two distinct results, never mixed up: the book's CPM over processing time,
 * and the cycle-time critical chain (exact or an expected-time heuristic).
 */
export function CriticalPathPanel({ report }: Readonly<{ report: AnalysisReport }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const cpm = report.criticalPath;
  const chain = report.criticalChain;

  return (
    <div className="space-y-2.5">
      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <header className="mb-1 flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)]">
            <Path size={15} className="text-[var(--accent-strong)]" aria-hidden="true" />
            {copy.quality.criticalPathTitle}
          </h4>
          {cpm?.status === 'ready' ? (
            <QualityBadge quality={cpm.quality} copy={copy} size="sm" />
          ) : null}
        </header>
        <p className="mb-1.5 text-[10.5px] leading-4 text-[var(--muted)]">
          {copy.quality.criticalPathHint}
        </p>
        {cpm?.status === 'ready' ? (
          <>
            <p className="break-words text-xs text-[var(--text)]">
              {cpm.taskLabels.join(' → ') || copy.emptyValue}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--muted-strong)]">
              {cpm.formula} {copy.minutes}
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--muted-strong)]">
            {cpm?.reason ? copy.quality.cpmReasons[cpm.reason] : copy.emptyValue}
          </p>
        )}
      </article>
      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <header className="mb-1 flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-[var(--muted-strong)]">
            {chain?.status === 'ready'
              ? chain.quality === 'exact'
                ? copy.quality.criticalChainExact
                : copy.quality.criticalChainHeuristic
              : copy.quality.criticalChainTitle}
          </h4>
          {chain?.status === 'ready' ? (
            <QualityBadge quality={chain.quality} copy={copy} size="sm" />
          ) : null}
        </header>
        <p className="mb-1.5 text-[10.5px] leading-4 text-[var(--muted)]">
          {copy.quality.criticalChainHint}
        </p>
        {chain?.status === 'ready' ? (
          <>
            <p className="break-words text-xs text-[var(--text)]">
              {chain.taskLabels.join(' → ') || copy.emptyValue}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--muted-strong)]">
              {chain.formula} {copy.minutes}
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--muted-strong)]">
            {chain?.reason ? copy.quality.chainReasons[chain.reason] : copy.emptyValue}
          </p>
        )}
      </article>
    </div>
  );
}
