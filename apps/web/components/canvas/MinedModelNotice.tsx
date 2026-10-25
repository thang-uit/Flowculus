'use client';

import { Graph, X } from '@phosphor-icons/react';

import { getWorkspaceCopy } from '@/lib/i18n';
import { formatMiningWarning } from '@/lib/diagnostic-messages';
import { useMiningStore } from '@/lib/mining-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Caveats from the DFG → BPMN conversion, shown over the mined model. */
export function MinedModelNotice() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const mined = useWorkspaceStore(
    (state) => state.processModel.metadata?.source === 'process-mining',
  );
  const warnings = useMiningStore((state) => state.conversionWarnings);
  const dismiss = useMiningStore((state) => state.setConversionWarnings);
  if (!mined || warnings.length === 0) return null;

  return (
    <div
      role="status"
      className="absolute left-1/2 top-3 z-[5] flex w-[min(560px,calc(100%-1.5rem))] -translate-x-1/2 items-start gap-2.5 rounded-xl border border-[var(--accent)]/60 bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow-soft)]"
    >
      <Graph
        size={16}
        className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--text)]">{copy.minedModelTitle}</p>
        <ul className="mt-1 space-y-0.5 text-[11px] leading-4 text-[var(--muted-strong)]">
          {warnings.slice(0, 4).map((warning) => (
            <li key={`${warning.code}-${JSON.stringify(warning.params ?? {})}`}>
              {formatMiningWarning(warning, copy)}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => dismiss([])}
        aria-label={copy.close}
        title={copy.close}
        className="focus-ring tb-btn tb-btn--idle size-7 shrink-0"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
}
