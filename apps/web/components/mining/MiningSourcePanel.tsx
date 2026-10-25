'use client';

import {
  CircleNotch,
  Code,
  DownloadSimple,
  Headset,
  ShoppingCart,
  Truck,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { useRef, type ChangeEvent } from 'react';

import { MINING_PRESETS, type MiningPresetId } from '@flowculus/process-mining';

import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const PRESET_ICONS: Record<MiningPresetId, typeof ShoppingCart> = {
  'order-to-cash': ShoppingCart,
  'procure-to-pay': Truck,
  'it-service-desk': Headset,
  'is6003-delivery': Code,
};

/** Presets, log upload/download, and the loading (cancellable) and error states. */
export function MiningSourcePanel({
  onLoadPreset,
  onFile,
  onDownloadLog,
  onCancel,
}: Readonly<{
  onLoadPreset: (presetId: MiningPresetId) => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownloadLog: () => void;
  onCancel: () => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const status = useMiningStore((state) => state.status);
  const error = useMiningStore((state) => state.error);
  const result = useMiningStore((state) => state.result);
  const replay = useMiningStore((state) => state.replay);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePreset = replay?.kind === 'preset' ? replay.presetId : null;

  return (
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
              onClick={() => onLoadPreset(preset.id)}
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
                  active ? 'text-[var(--accent-strong)]' : 'text-[var(--muted-strong)]',
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
          onClick={onDownloadLog}
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
        accept=".csv,.tsv,.json,.xes,.xml,.txt,.xlsx"
        className="sr-only"
        aria-label={copy.miningUpload}
        onChange={onFile}
      />
      {status === 'loading' ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11px] text-[var(--muted-strong)]"
          role="status"
        >
          <span className="inline-flex items-center gap-2">
            <CircleNotch size={14} className="animate-spin" aria-hidden="true" />
            {copy.miningLoading}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring cursor-pointer rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-[var(--surface-soft)]"
          >
            {copy.resilience.cancel}
          </button>
        </div>
      ) : null}
      {status === 'error' && error ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/40 px-2.5 py-2 text-[11px] text-[var(--danger)]"
          role="alert"
        >
          <WarningCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {result &&
      (result.skippedRows > 0 ||
        result.invalidTimestamps > 0 ||
        result.invalidStartTimes > 0) ? (
        <p className="text-[11px] text-[var(--muted)]">
          {copy.miningSkipped(
            result.skippedRows,
            result.invalidTimestamps,
            result.invalidStartTimes,
          )}
        </p>
      ) : null}
    </section>
  );
}
