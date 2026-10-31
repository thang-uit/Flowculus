'use client';

import { AppDialog } from '@/components/ui/AppDialog';
import { AppButton } from '@/components/ui/AppButton';
import { Table } from '@phosphor-icons/react';
import { useId } from 'react';

import {
  isCompleteMapping,
  type ColumnMapping,
  type EventImportSettings,
} from '@flowculus/process-mining';

import { AppSelect } from '@/components/ui/AppSelect';
import { AppField } from '@/components/ui/AppField';
import { getWorkspaceCopy } from '@/lib/i18n';
import type {
  MiningTableResponse,
  MiningRequest,
  MiningResponse,
} from '@/lib/mining-engine';
import { useMiningImport } from '@/lib/use-mining-import';
import { MiningImportSettings } from './MiningImportSettings';
import { MiningImportReview } from './MiningImportReview';
import { MiningImportPreview } from './MiningImportPreview';
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
    <AppField
      id={id}
      label={
        <>
          {label}
          {required ? <span className="text-[var(--danger)]"> *</span> : null}
        </>
      }
    >
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
    </AppField>
  );
}

/**
 * Column Mapping UI: the user confirms which columns are Case ID, Activity and
 * Timestamp (plus optional start time, lifecycle, resource and cost) before a
 * log is mined. Suggestions come from the header names.
 */
export function ColumnMappingDialog({
  table: initialTable,
  source,
  request,
  onConfirm,
  onCancel,
}: Readonly<{
  table: MiningTableResponse;
  source: string;
  request: (request: MiningRequest) => Promise<MiningResponse>;
  onConfirm: (mapping: ColumnMapping, settings: EventImportSettings) => void;
  onCancel: () => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const pending = useMiningImport(initialTable, source, request, locale);
  const { table, mapping, settings, review, busy } = pending;
  const importCopy = copy.miningImport;
  const complete = isCompleteMapping(mapping);
  const labels: Record<MappingField, string> = {
    caseId: copy.mappingCaseId,
    activity:
      settings.mode === 'jira-status' ? importCopy.statusActivity : copy.mappingActivity,
    timestamp:
      settings.mode === 'jira-status'
        ? importCopy.statusTimestamp
        : copy.mappingTimestamp,
    startTimestamp: copy.mappingStartTimestamp,
    lifecycle: copy.mappingLifecycle,
    resource: copy.mappingResource,
    cost: copy.mappingCost,
  };
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={
        <span className="flex items-center gap-2">
          <Table size={18} className="text-[var(--accent-strong)]" aria-hidden="true" />
          {copy.mappingTitle}
        </span>
      }
      description={copy.mappingDescription(
        table.fileName,
        table.format.toUpperCase(),
        table.rowCount,
      )}
      closeLabel={copy.close}
      size="wide"
    >
      {!review ? (
        <>
          <fieldset disabled={busy} className="min-w-0">
            <MiningImportSettings
              settings={settings}
              layout={table.layout}
              copy={importCopy}
              disabled={busy}
              onChange={pending.updateSettings}
              onHeader={(row) => void pending.changeHeader(row)}
            />
            {table.format === 'xlsx' ? (
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                {importCopy.firstSheet}
              </p>
            ) : null}
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
              {importCopy.caseHint}
            </p>
            <div className="mt-5 grid items-end gap-3 sm:grid-cols-3">
              {REQUIRED.map((field) => (
                <MappingSelect
                  key={field}
                  field={field}
                  label={labels[field]}
                  headers={table.headers}
                  value={mapping[field]}
                  required
                  noneLabel={copy.mappingChoose}
                  onChange={pending.updateMapping}
                />
              ))}
            </div>
            {settings.mode === 'events' ? (
              <>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {copy.optional}
                </p>
                <div className="mt-2 grid items-end gap-3 sm:grid-cols-4">
                  {OPTIONAL.map((field) => (
                    <MappingSelect
                      key={field}
                      field={field}
                      label={labels[field]}
                      headers={table.headers}
                      value={mapping[field]}
                      required={false}
                      noneLabel={copy.mappingNone}
                      onChange={pending.updateMapping}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </fieldset>
          <MiningImportPreview table={table} caption={copy.mappingPreview} />
        </>
      ) : (
        <MiningImportReview
          review={review}
          copy={importCopy}
          acknowledged={pending.acknowledged}
          onAcknowledge={pending.setAcknowledged}
        />
      )}
      {pending.error ? (
        <p className="mt-3 text-xs leading-5 text-[var(--danger)]" role="alert">
          {pending.error}
        </p>
      ) : null}
      {!complete ? (
        <p className="mt-3 text-[11px] text-[var(--danger)]" role="alert">
          {copy.mappingIncomplete}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {review ? (
          <AppButton type="button" onClick={pending.edit}>
            {importCopy.edit}
          </AppButton>
        ) : null}
        <AppButton type="button" onClick={onCancel}>
          {copy.cancel}
        </AppButton>
        <AppButton
          type="button"
          disabled={
            busy ||
            !complete ||
            settings.mode === 'snapshot' ||
            (!!review &&
              (!pending.acknowledged ||
                review.acceptedEvents === 0 ||
                review.ambiguousDates))
          }
          onClick={() => {
            if (review && pending.acknowledged && isCompleteMapping(mapping))
              onConfirm(mapping, settings);
            else void pending.inspect();
          }}
          variant="primary"
        >
          {busy ? importCopy.reviewing : review ? copy.mappingConfirm : importCopy.review}
        </AppButton>
      </div>
    </AppDialog>
  );
}
