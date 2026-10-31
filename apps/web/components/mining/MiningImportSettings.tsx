'use client';

import { useId } from 'react';
import type { EventImportSettings, EventImportLayout } from '@flowculus/process-mining';
import { AppField } from '@/components/ui/AppField';
import { AppSelect } from '@/components/ui/AppSelect';
import type { MiningImportCopy } from '@/lib/i18n/types';

export function MiningImportSettings({
  settings,
  layout,
  copy,
  disabled,
  onChange,
  onHeader,
}: Readonly<{
  settings: EventImportSettings;
  layout: EventImportLayout;
  copy: MiningImportCopy;
  disabled: boolean;
  onChange: (patch: Partial<EventImportSettings>) => void;
  onHeader: (row: number) => void;
}>) {
  const id = useId();
  const offsets = [
    ...new Set([
      0,
      420,
      settings.utcOffsetMinutes,
      ...Array.from({ length: 113 }, (_, i) => i * 15 - 840),
    ]),
  ].sort((a, b) => a - b);
  return (
    <div className="mt-5 space-y-3">
      <AppField id={`${id}-mode`} label={copy.mode}>
        <AppSelect
          id={`${id}-mode`}
          value={settings.mode}
          disabled={disabled}
          options={Object.entries(copy.modes).map(([value, label]) => ({ value, label }))}
          onValueChange={(mode) =>
            onChange({ mode: mode as EventImportSettings['mode'] })
          }
          aria-describedby={`${id}-meaning`}
        />
      </AppField>
      <p id={`${id}-meaning`} className="text-xs leading-5 text-[var(--muted-strong)]">
        {copy.modeHints[settings.mode]}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <AppField id={`${id}-date`} label={copy.dateOrder}>
          <AppSelect
            id={`${id}-date`}
            value={settings.dateOrder}
            disabled={disabled}
            options={Object.entries(copy.dateOrders).map(([value, label]) => ({
              value,
              label,
            }))}
            onValueChange={(dateOrder) =>
              onChange({ dateOrder: dateOrder as EventImportSettings['dateOrder'] })
            }
          />
        </AppField>
        <AppField id={`${id}-zone`} label={copy.timezone}>
          <AppSelect
            id={`${id}-zone`}
            value={String(settings.utcOffsetMinutes)}
            disabled={disabled}
            aria-describedby={`${id}-zone-hint`}
            options={offsets.map((offset) => ({
              value: String(offset),
              label: `UTC${offset < 0 ? '−' : '+'}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`,
            }))}
            onValueChange={(value) => onChange({ utcOffsetMinutes: Number(value) })}
          />
        </AppField>
      </div>
      <p id={`${id}-zone-hint`} className="text-xs leading-5 text-[var(--muted)]">
        {copy.timezoneHint}
      </p>
      {layout.headerOptions.length > 0 ? (
        <AppField id={`${id}-header`} label={copy.header}>
          <AppSelect
            id={`${id}-header`}
            value={String(settings.headerRow)}
            disabled={disabled}
            options={layout.headerOptions.map(({ row, label }) => ({
              value: String(row),
              label: copy.headerOption(row, label),
            }))}
            onValueChange={(row) => onHeader(Number(row))}
          />
        </AppField>
      ) : null}
    </div>
  );
}
