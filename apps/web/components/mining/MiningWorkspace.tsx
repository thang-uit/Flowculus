'use client';

import {
  ArrowCounterClockwise,
  Briefcase,
  Code,
  DownloadSimple,
  Headset,
  PaperPlaneTilt,
  ShoppingCart,
  Truck,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';

import {
  MINING_PRESETS,
  type ColumnMapping,
  type MiningPresetId,
} from '@flowculus/process-mining';

import { BottleneckList } from '@/components/mining/BottleneckList';
import { ColumnMappingDialog } from '@/components/mining/ColumnMappingDialog';
import { DfgCanvas } from '@/components/mining/DfgCanvas';
import { MiningKpiStrip } from '@/components/mining/MiningKpiStrip';
import { VariantExplorer } from '@/components/mining/VariantExplorer';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { cn } from '@/lib/cn';
import { safeFileStem } from '@/lib/file-name';
import { formatDurationMs, formatInteger } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import type { MiningDiscoveryResponse, MiningResponse } from '@/lib/mining-engine';
import {
  useMiningStore,
  type MiningReplay,
  type PendingUpload,
} from '@/lib/mining-store';
import { useMiningClient } from '@/lib/use-mining-client';
import { useWorkspaceStore } from '@/lib/workspace-store';

const PRESET_ICONS: Record<MiningPresetId, typeof ShoppingCart> = {
  'order-to-cash': ShoppingCart,
  'procure-to-pay': Truck,
  'it-service-desk': Headset,
  'is6003-delivery': Code,
};
const FILTER_DEBOUNCE_MS = 140;
const DEFAULT_PRESET: MiningPresetId = 'order-to-cash';

const asDiscovery = (response: MiningResponse): MiningDiscoveryResponse => {
  if (response.type !== 'discovery') throw new Error('Unexpected mining response.');
  return response;
};

type SideTab = 'variants' | 'bottlenecks';

export function MiningWorkspace() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const request = useMiningClient();
  const status = useMiningStore((state) => state.status);
  const error = useMiningStore((state) => state.error);
  const result = useMiningStore((state) => state.result);
  const replay = useMiningStore((state) => state.replay);
  const filter = useMiningStore((state) => state.filter);
  const mappingTable = useMiningStore((state) => state.mappingTable);
  const pendingUpload = useMiningStore((state) => state.pendingUpload);
  const selectedVariantId = useMiningStore((state) => state.selectedVariantId);
  const edgeMetric = useMiningStore((state) => state.edgeMetric);
  const [tab, setTab] = useState<SideTab>('variants');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sequenceRef = useRef(0);
  const bootedRef = useRef(false);

  const fail = useCallback(
    (reason: unknown) => {
      if (reason instanceof Error && reason.message === 'cancelled') return;
      useMiningStore
        .getState()
        .setStatus('error', reason instanceof Error ? reason.message : copy.fileError);
    },
    [copy.fileError],
  );

  const run = useCallback(
    async (task: () => Promise<MiningDiscoveryResponse>, nextReplay?: MiningReplay) => {
      const sequence = sequenceRef.current + 1;
      sequenceRef.current = sequence;
      useMiningStore.getState().setStatus('loading');
      try {
        const response = await task();
        if (sequence !== sequenceRef.current) return;
        useMiningStore.getState().setResult(response, nextReplay);
      } catch (reason) {
        if (sequence === sequenceRef.current) fail(reason);
      }
    },
    [fail],
  );

  const loadPreset = useCallback(
    (presetId: MiningPresetId) =>
      run(
        async () =>
          asDiscovery(
            await request({
              type: 'load-preset',
              presetId,
              filter: useMiningStore.getState().filter,
            }),
          ),
        { kind: 'preset', presetId },
      ),
    [request, run],
  );

  const inspectUpload = useCallback(
    async (upload: PendingUpload) => {
      useMiningStore.getState().setStatus('loading');
      try {
        const response = await request({ type: 'inspect-file', ...upload });
        if (response.type !== 'table') throw new Error('Unexpected mining response.');
        useMiningStore.getState().setMappingTable({ ...response, source: upload.source });
        useMiningStore
          .getState()
          .setStatus(useMiningStore.getState().result ? 'ready' : 'idle');
      } catch (reason) {
        fail(reason);
      }
    },
    [fail, request],
  );

  const applyMapping = useCallback(
    (mapping: ColumnMapping) => {
      const table = useMiningStore.getState().mappingTable;
      if (!table) return;
      useMiningStore.getState().setMappingTable(null);
      const name = table.fileName.replace(/\.(csv|tsv|json|xes|xml|txt)$/i, '');
      void run(
        async () =>
          asDiscovery(
            await request({
              type: 'apply-mapping',
              mapping,
              name,
              filter: useMiningStore.getState().filter,
            }),
          ),
        { kind: 'file', fileName: table.fileName, source: table.source, mapping },
      );
    },
    [request, run],
  );

  // Boot: a queued upload wins, otherwise rebuild the previous session or
  // open the default preset.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const state = useMiningStore.getState();
    const upload = state.takePendingUpload();
    if (upload) {
      void inspectUpload(upload);
      if (!state.replay) return;
    }
    const previous = state.replay;
    if (previous?.kind === 'preset') void loadPreset(previous.presetId);
    else if (previous?.kind === 'file') {
      void run(async () => {
        await request({
          type: 'inspect-file',
          fileName: previous.fileName,
          source: previous.source,
        });
        return asDiscovery(
          await request({
            type: 'apply-mapping',
            mapping: previous.mapping,
            name: previous.fileName.replace(/\.(csv|tsv|json|xes|xml|txt)$/i, ''),
            filter: state.filter,
          }),
        );
      });
    } else if (!upload) void loadPreset(DEFAULT_PRESET);
  }, [inspectUpload, loadPreset, request, run]);

  // Files dropped or opened while the view is visible.
  useEffect(() => {
    if (!pendingUpload || !bootedRef.current) return;
    const upload = useMiningStore.getState().takePendingUpload();
    if (upload) void inspectUpload(upload);
  }, [inspectUpload, pendingUpload]);

  // Slider changes re-run discovery off the main thread, debounced.
  const filterKey = `${filter.minActivityShare}|${filter.minEdgeShare}|${filter.minTransitionHours}`;
  const lastFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKeyRef.current === filterKey) return;
    lastFilterKeyRef.current = filterKey;
    if (!useMiningStore.getState().replay) return;
    const timer = window.setTimeout(() => {
      void run(async () =>
        asDiscovery(
          await request({ type: 'discover', filter: useMiningStore.getState().filter }),
        ),
      );
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filterKey, request, run]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void file
      .text()
      .then((source) => inspectUpload({ fileName: file.name, source }), fail);
  };

  const sendToCanvas = async () => {
    if (!result) return;
    try {
      const response = await request({
        type: 'to-model',
        filter: useMiningStore.getState().filter,
        name: result.logName,
      });
      if (response.type !== 'model') throw new Error('Unexpected mining response.');
      useMiningStore.getState().setConversionWarnings(response.warnings);
      const workspace = useWorkspaceStore.getState();
      workspace.loadModel(response.model, {
        drawioSource: null,
        modelName: response.model.name,
      });
      workspace.setMode('model');
    } catch (reason) {
      fail(reason);
    }
  };

  const downloadLog = async () => {
    try {
      const response = await request({ type: 'export-log' });
      if (response.type !== 'csv') throw new Error('Unexpected mining response.');
      downloadTextFile(
        `${safeFileStem(response.logName, 'event-log')}.csv`,
        response.csv,
        'text/csv',
      );
    } catch (reason) {
      fail(reason);
    }
  };

  const discovery = result?.discovery;
  const variant = discovery?.variants.find((item) => item.id === selectedVariantId);
  const maxTransitionHours = Math.max(
    1,
    Math.ceil(
      Math.max(
        discovery?.dfg.maxMeanDurationMs ?? 0,
        ...(discovery?.bottlenecks ?? [])
          .filter((item) => item.kind === 'transition')
          .map((item) => item.meanDurationMs),
      ) / 3_600_000,
    ),
  );
  const activePreset = replay?.kind === 'preset' ? replay.presetId : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] lg:w-[288px] lg:overflow-y-auto lg:border-b-0 lg:border-r scrollbar-thin">
        <section
          className="space-y-3 border-b border-[var(--border)] p-4"
          aria-labelledby="mining-source-title"
        >
          <div>
            <h2
              id="mining-source-title"
              className="text-[13px] font-semibold text-[var(--text)]"
            >
              {copy.miningSource}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {copy.miningSourceHint}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {MINING_PRESETS.map((preset) => {
              const Icon = PRESET_ICONS[preset.id];
              const active = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => void loadPreset(preset.id)}
                  className={cn(
                    'focus-ring flex min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]',
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      'mt-0.5 shrink-0',
                      active
                        ? 'text-[var(--accent-strong)]'
                        : 'text-[var(--muted-strong)]',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[var(--text)]">
                      {copy.miningPresets[preset.id].name}
                    </span>
                    <span className="mt-0.5 hidden text-[10.5px] leading-4 text-[var(--muted)] sm:block">
                      {copy.miningPresets[preset.id].description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-soft)]"
            >
              <UploadSimple size={14} aria-hidden="true" />
              {copy.miningUpload}
            </button>
            <button
              type="button"
              onClick={() => void downloadLog()}
              disabled={!result}
              className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-strong)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadSimple size={14} aria-hidden="true" />
              {copy.miningDownloadCsv}
            </button>
          </div>
          <p className="text-[10.5px] leading-4 text-[var(--muted)]">
            {copy.miningUploadHint}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.json,.xes,.xml,.txt"
            className="sr-only"
            aria-label={copy.miningUpload}
            onChange={handleFile}
          />
          {status === 'error' && error ? (
            <p
              className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/40 px-2.5 py-2 text-[11px] text-[var(--danger)]"
              role="alert"
            >
              <WarningCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
          {result && (result.skippedRows > 0 || result.invalidTimestamps > 0) ? (
            <p className="text-[11px] text-[var(--muted)]">
              {copy.miningSkipped(result.skippedRows, result.invalidTimestamps)}
            </p>
          ) : null}
        </section>

        <section
          className="space-y-4 border-b border-[var(--border)] p-4"
          aria-labelledby="mining-filter-title"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="mining-filter-title"
              className="text-[13px] font-semibold text-[var(--text)]"
            >
              {copy.miningFilters}
            </h2>
            <button
              type="button"
              onClick={() => useMiningStore.getState().resetFilter()}
              aria-label={copy.miningResetFilters}
              title={copy.miningResetFilters}
              className="focus-ring tb-btn tb-btn--idle size-7"
            >
              <ArrowCounterClockwise size={14} aria-hidden="true" />
            </button>
          </div>
          {(
            [
              ['minActivityShare', copy.miningActivityThreshold, 100, '%'],
              ['minEdgeShare', copy.miningEdgeThreshold, 100, '%'],
              [
                'minTransitionHours',
                copy.miningDurationThreshold,
                maxTransitionHours,
                ' h',
              ],
            ] as const
          ).map(([key, label, max, unit]) => {
            const value =
              key === 'minTransitionHours' ? filter[key] : Math.round(filter[key] * 100);
            const id = `mining-filter-${key}`;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={id}
                    className="text-[11px] font-medium text-[var(--muted-strong)]"
                  >
                    {label}
                  </label>
                  <span className="font-mono text-[11px] font-semibold text-[var(--text)]">
                    ≥ {Number(value.toFixed(1))}
                    {unit}
                  </span>
                </div>
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={max}
                  step={key === 'minTransitionHours' ? Math.max(0.1, max / 100) : 1}
                  value={value}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    useMiningStore.getState().setFilter({
                      [key]: key === 'minTransitionHours' ? next : next / 100,
                    });
                  }}
                  className="flow-range"
                />
              </div>
            );
          })}
          {discovery &&
          (discovery.hiddenActivityCount > 0 || discovery.hiddenEdgeCount > 0) ? (
            <p className="text-[11px] text-[var(--muted)]">
              {copy.miningHidden(
                discovery.hiddenActivityCount,
                discovery.hiddenEdgeCount,
              )}
            </p>
          ) : null}
        </section>

        <section className="space-y-2 p-4">
          <button
            type="button"
            onClick={() => void sendToCanvas()}
            disabled={!result}
            className="focus-ring inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperPlaneTilt size={15} weight="bold" aria-hidden="true" />
            {copy.miningSendToCanvas}
          </button>
          <p className="text-[10.5px] leading-4 text-[var(--muted)]">
            {copy.miningSendToCanvasHint}
          </p>
        </section>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={copy.miningMap}>
        {discovery ? <MiningKpiStrip stats={discovery.stats} /> : null}
        <div className="relative h-[62dvh] min-h-[320px] lg:h-auto lg:flex-1">
          {discovery ? (
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
            {result ? (
              <span className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] text-[var(--muted-strong)] shadow-[var(--shadow-soft)] sm:inline">
                <Briefcase
                  size={12}
                  className="mr-1 inline align-[-1px]"
                  aria-hidden="true"
                />
                {result.logName} ·{' '}
                {formatInteger(discovery?.stats.caseCount ?? 0, locale)}{' '}
                {copy.miningCasesShort}
                {status === 'loading' ? ` · ${copy.miningLoading}` : ''}
              </span>
            ) : null}
          </div>
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
        </div>
      </main>

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

      {mappingTable ? (
        <ColumnMappingDialog
          table={mappingTable}
          onConfirm={applyMapping}
          onCancel={() => useMiningStore.getState().setMappingTable(null)}
        />
      ) : null}
    </div>
  );
}
