'use client';

import { AppButton } from '@/components/ui/AppButton';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { useState } from 'react';

import { ColumnMappingDialog } from '@/components/mining/ColumnMappingDialog';
import { MiningTimeControls } from './MiningTimeControls';
import { MiningFilterPanel } from '@/components/mining/MiningFilterPanel';
import { MiningInsightsPanel } from '@/components/mining/MiningInsightsPanel';
import { MiningMapView } from '@/components/mining/MiningMapView';
import { MiningPanelResizeHandle } from '@/components/mining/MiningPanelResizeHandle';
import { MiningEvidenceExport } from './MiningEvidenceExport';
import { MiningSourcePanel } from '@/components/mining/MiningSourcePanel';
import { MiningCreateProcessDialog } from '@/components/mining/MiningCreateProcessDialog';
import { MiningLogTableDialog } from '@/components/mining/MiningLogTableDialog';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { useMiningSession } from '@/lib/use-mining-session';
import { useMiningPanelResize } from '@/lib/use-mining-panel-resize';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Process-mining view: source and filters, the map, and insights. */
export function MiningWorkspace() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const session = useMiningSession();
  const result = useMiningStore((state) => state.result);
  const replay = useMiningStore((state) => state.replay);
  const mappingTable = useMiningStore((state) => state.mappingTable);
  const status = useMiningStore((state) => state.status);
  const storageStatus = useMiningStore((state) => state.storageStatus);
  const storageHydrated = useMiningStore((state) => state.storageHydrated);
  const activeTabId = useMiningStore((state) => state.activeTabId);
  const [namingProcess, setNamingProcess] = useState(false);
  const [logTableOpen, setLogTableOpen] = useState(false);
  const {
    workspaceRef,
    widths,
    containerWidth,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onKeyDown,
  } = useMiningPanelResize();

  return (
    <div
      ref={workspaceRef}
      role={activeTabId ? 'tabpanel' : 'region'}
      id={activeTabId ? `mining-panel-${activeTabId}` : undefined}
      aria-labelledby={activeTabId ? `mining-log-tab-${activeTabId}` : undefined}
      aria-label={activeTabId ? undefined : copy.miningSource}
      inert={!storageHydrated || storageStatus === 'conflict'}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
    >
      <aside className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] lg:w-[var(--mining-source-width,288px)] lg:overflow-y-auto lg:border-b-0 scrollbar-thin">
        <MiningSourcePanel
          onLoadPreset={(presetId) => void session.loadPreset(presetId)}
          onFile={session.handleFile}
          onDownloadLog={() => void session.downloadLog()}
          onCancel={session.cancel}
          onViewLog={() => setLogTableOpen(true)}
          onClearLog={() => {
            setLogTableOpen(false);
            session.clear();
          }}
        />
        <MiningTimeControls />
        <MiningFilterPanel />
        <MiningEvidenceExport />
        <section className="space-y-2 p-4">
          <AppButton
            type="button"
            onClick={() => setNamingProcess(true)}
            disabled={!result || status !== 'ready' || !!mappingTable}
            variant="primary"
            className="w-full"
          >
            <PaperPlaneTilt size={15} weight="bold" aria-hidden="true" />
            {copy.miningSendToCanvas}
          </AppButton>
          <p className="text-[10.5px] leading-4 text-[var(--muted)]">
            {copy.miningSendToCanvasHint}
          </p>
        </section>
      </aside>

      <MiningPanelResizeHandle
        panel="source"
        label={copy.miningResizeSource}
        value={widths.source}
        max={containerWidth - 16 - 320 - widths.insights}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerEnd={onPointerEnd}
        onKeyDown={onKeyDown}
      />
      <MiningMapView />
      <MiningPanelResizeHandle
        panel="insights"
        label={copy.miningResizeInsights}
        value={widths.insights}
        max={containerWidth - 16 - 320 - widths.source}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerEnd={onPointerEnd}
        onKeyDown={onKeyDown}
      />
      <MiningInsightsPanel
        request={session.request}
        onCheckConformance={(model, options) =>
          void session.checkConformance(model, options)
        }
      />

      {namingProcess ? (
        <MiningCreateProcessDialog
          onClose={() => setNamingProcess(false)}
          onCreate={session.sendToCanvas}
        />
      ) : null}

      {mappingTable ? (
        <ColumnMappingDialog
          key={mappingTable.importId}
          table={mappingTable}
          source={mappingTable.source}
          request={session.request}
          onConfirm={session.applyMapping}
          onCancel={() => useMiningStore.getState().reloadTab()}
        />
      ) : null}
      {result && logTableOpen && status === 'ready' && !mappingTable ? (
        <MiningLogTableDialog
          key={replay?.kind === 'file' ? replay.fileName : result.logName}
          open={logTableOpen}
          onClose={() => setLogTableOpen(false)}
          request={session.request}
          sourceName={replay?.kind === 'file' ? replay.fileName : result.logName}
        />
      ) : null}
    </div>
  );
}
