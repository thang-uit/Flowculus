'use client';

import { PaperPlaneTilt } from '@phosphor-icons/react';

import { ColumnMappingDialog } from '@/components/mining/ColumnMappingDialog';
import { MiningFilterPanel } from '@/components/mining/MiningFilterPanel';
import { MiningInsightsPanel } from '@/components/mining/MiningInsightsPanel';
import { MiningMapView } from '@/components/mining/MiningMapView';
import { MiningSourcePanel } from '@/components/mining/MiningSourcePanel';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { useMiningSession } from '@/lib/use-mining-session';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Process-mining view: source and filters, the map, and insights. */
export function MiningWorkspace() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const session = useMiningSession();
  const result = useMiningStore((state) => state.result);
  const mappingTable = useMiningStore((state) => state.mappingTable);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] lg:w-[288px] lg:overflow-y-auto lg:border-b-0 lg:border-r scrollbar-thin">
        <MiningSourcePanel
          onLoadPreset={(presetId) => void session.loadPreset(presetId)}
          onFile={session.handleFile}
          onDownloadLog={() => void session.downloadLog()}
          onCancel={session.cancel}
        />
        <MiningFilterPanel />
        <section className="space-y-2 p-4">
          <button
            type="button"
            onClick={() => void session.sendToCanvas()}
            disabled={!result}
            className="focus-ring inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperPlaneTilt size={15} weight="bold" aria-hidden="true" />
            {copy.miningSendToCanvas}
          </button>
          <p className="text-[10.5px] leading-4 text-[var(--muted)]">
            {copy.miningSendToCanvasHint}
          </p>
        </section>{' '}
      </aside>

      <MiningMapView />
      <MiningInsightsPanel />

      {mappingTable ? (
        <ColumnMappingDialog
          table={mappingTable}
          onConfirm={session.applyMapping}
          onCancel={() => useMiningStore.getState().setMappingTable(null)}
        />
      ) : null}
    </div>
  );
}
