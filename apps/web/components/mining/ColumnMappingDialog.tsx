'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Table, X } from '@phosphor-icons/react';
import { useId, useState } from 'react';

import { isCompleteMapping, type ColumnMapping } from '@flowculus/process-mining';

import { AppSelect } from '@/components/ui/AppSelect';
import { IconButton } from '@/components/ui/IconButton';
import { getWorkspaceCopy } from '@/lib/i18n';
import type { MiningTableResponse } from '@/lib/mining-engine';
import { usePreferencesStore } from '@/lib/use-preferences-store';

type MappingField = keyof ColumnMapping;

const REQUIRED: MappingField[] = ['caseId', 'activity', 'timestamp'];
const OPTIONAL: MappingField[] = ['startTimestamp', 'lifecycle', 'resource', 'cost'];

function MappingSelect({
  field,
  label,
  headers,
  value,
  required,
  noneLabel,
  onChange,
}: Readonly<{
  field: MappingField;
  label: string;
  headers: string[];
  value: string | undefined;
  required: boolean;
  noneLabel: string;
  onChange: (field: MappingField, value: string | undefined) => void;
}>) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium text-[var(--muted-strong)]"
      >
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </label>
      <AppSelect
        id={id}
        value={value ?? ''}
        onValueChange={(next) => onChange(field, next || undefined)}
        required={required}
        options={[
          { value: '', label: noneLabel },
          ...headers.map((header) => ({ value: header, label: header })),
        ]}
      />
    </div>
  );
}

/**
 * Column Mapping UI: the user confirms which columns are Case ID, Activity and
 * Timestamp (plus optional start time, lifecycle, resource and cost) before a
 * log is mined. Suggestions come from the header names.
 */
export function ColumnMappingDialog({
  table,
  onConfirm,
  onCancel,
}: Readonly<{
  table: MiningTableResponse;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(table.suggestion);
  const complete = isCompleteMapping(mapping);
  const labels: Record<MappingField, string> = {
    caseId: copy.mappingCaseId,
    activity: copy.mappingActivity,
    timestamp: copy.mappingTimestamp,
    startTimestamp: copy.mappingStartTimestamp,
    lifecycle: copy.mappingLifecycle,
    resource: copy.mappingResource,
    cost: copy.mappingCost,
  };
  const update = (field: MappingField, value: string | undefined) =>
    setMapping((current) => ({ ...current, [field]: value }));

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onCancel())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-[rgb(10_14_18_/_0.38)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 max-h-[min(760px,calc(100dvh-2rem))] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] focus:outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                <Table
                  size={18}
                  className="text-[var(--accent-strong)]"
                  aria-hidden="true"
                />
                {copy.mappingTitle}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {copy.mappingDescription(
                  table.fileName,
                  table.format.toUpperCase(),
                  table.rowCount,
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton icon={X} label={copy.close} variant="subtle" size="sm" />
            </Dialog.Close>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {REQUIRED.map((field) => (
              <MappingSelect
                key={field}
                field={field}
                label={labels[field]}
                headers={table.headers}
                value={mapping[field]}
                required
                noneLabel={copy.mappingChoose}
                onChange={update}
              />
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {copy.optional}
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            {OPTIONAL.map((field) => (
              <MappingSelect
                key={field}
                field={field}
                label={labels[field]}
                headers={table.headers}
                value={mapping[field]}
                required={false}
                noneLabel={copy.mappingNone}
                onChange={update}
              />
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--border)] scrollbar-thin">
            <table className="w-full min-w-[480px] text-left text-[11px]">
              <caption className="sr-only">{copy.mappingPreview}</caption>
              <thead className="bg-[var(--surface-raised)] text-[var(--muted-strong)]">
                <tr>
                  {table.headers.map((header) => {
                    const role = (Object.keys(labels) as MappingField[]).find(
                      (field) => mapping[field] === header,
                    );
                    return (
                      <th
                        key={header}
                        scope="col"
                        className="whitespace-nowrap px-2.5 py-1.5 font-semibold"
                      >
                        {header}
                        {role ? (
                          <span className="ml-1 rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[9.5px] text-[var(--accent-strong)]">
                            {labels[role]}
                          </span>
                        ) : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="font-mono text-[var(--text)]">
                {table.sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-[var(--border)]">
                    {table.headers.map((header, columnIndex) => (
                      <td
                        key={header}
                        className="max-w-[180px] truncate whitespace-nowrap px-2.5 py-1.5"
                      >
                        {row[columnIndex] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!complete ? (
            <p className="mt-3 text-[11px] text-[var(--danger)]" role="alert">
              {copy.mappingIncomplete}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="focus-ring cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              disabled={!complete}
              onClick={() => {
                if (isCompleteMapping(mapping)) onConfirm(mapping);
              }}
              className="focus-ring cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.mappingConfirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
