'use client';

import { ArrowCounterClockwise, Gauge, Queue } from '@phosphor-icons/react';
import type { AnalysisOptions } from '@flowculus/analysis-engine';
import { useMemo, useState } from 'react';

import { Tooltip } from '@/components/ui/Tooltip';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { getWorkspaceCopy } from '@/lib/i18n';
import { localizeAnalysisMessage } from '@/lib/localize-analysis';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { cn } from '@/lib/cn';

type ScenarioFieldKey =
  | 'arrivalRatePerHour'
  | 'workInProcess'
  | 'workingHoursPerDay'
  | 'serviceRatePerHour'
  | 'servers';

interface ScenarioDraft {
  arrivalRatePerHour: string;
  workInProcess: string;
  workingHoursPerDay: string;
  serviceRatePerHour: string;
  servers: string;
}

const toInputValue = (value: number | undefined): string =>
  value == null ? '' : String(value);

const draftFromOptions = (options: AnalysisOptions): ScenarioDraft => ({
  arrivalRatePerHour: toInputValue(options.arrivalRatePerHour),
  workInProcess: toInputValue(options.workInProcess),
  workingHoursPerDay: toInputValue(options.workingHoursPerDay),
  serviceRatePerHour: toInputValue(options.serviceRatePerHour),
  servers: toInputValue(options.servers),
});

const parseNumber = (raw: string): number | undefined => {
  if (raw.trim() === '') return undefined;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
};

const formatValue = (
  value: number | null | undefined,
  suffix = '',
  emptyValue = 'N/A',
) => (value == null ? emptyValue : `${Number(value.toFixed(2))}${suffix}`);

function ScenarioField({
  id,
  label,
  hint,
  emptyValue,
  value,
  invalid,
  error,
  onChange,
  onBlur,
  integer = false,
}: Readonly<{
  id: string;
  label: string;
  hint: string;
  emptyValue: string;
  value: string;
  invalid: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  integer?: boolean;
}>) {
  return (
    <label className="min-w-0 space-y-1.5" htmlFor={id}>
      <span className="block truncate text-[11px] font-medium text-[var(--muted-strong)]">
        {label}
      </span>
      <input
        id={id}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={emptyValue}
        className={cn(
          'focus-ring h-9 w-full rounded-lg border bg-[var(--surface)] px-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]',
          invalid ? 'border-[var(--danger)]' : 'border-[var(--border)]',
        )}
        aria-invalid={invalid || undefined}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
      />
      <span id={`${id}-hint`} className="block truncate text-[10px] text-[var(--muted)]">
        {hint}
      </span>
      {error ? (
        <span
          id={`${id}-error`}
          className="block text-[10px] leading-4 text-[var(--danger)]"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function ScenarioSettings() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const options = useWorkspaceStore((state) => state.analysisOptions);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const setAnalysisOptions = useWorkspaceStore((state) => state.setAnalysisOptions);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<ScenarioDraft>(() => draftFromOptions(options));
  const [invalidFields, setInvalidFields] = useState<
    Partial<Record<ScenarioFieldKey, boolean>>
  >({});
  const [editingFields, setEditingFields] = useState<Set<ScenarioFieldKey>>(
    () => new Set(),
  );
  const displayedDraft = useMemo(() => {
    const next = draftFromOptions(options);
    editingFields.forEach((field) => {
      next[field] = draft[field];
    });
    return next;
  }, [draft, editingFields, options]);

  const hasConfiguredInput = Object.values(displayedDraft).some(
    (value) => value.trim() !== '',
  );
  const queue = report.queue;

  const fieldError = (field: ScenarioFieldKey): string | undefined => {
    if (!invalidFields[field]) return undefined;
    if (field === 'workingHoursPerDay' || field === 'serviceRatePerHour') {
      return copy.invalidPositiveNumber;
    }
    if (field === 'servers') return copy.invalidInteger;
    return copy.invalidNumber;
  };

  const updateDraftField = (field: ScenarioFieldKey, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setInvalidFields((current) => ({ ...current, [field]: false }));
    setEditingFields((current) => {
      const next = new Set(current);
      next.add(field);
      return next;
    });
  };

  const commitField = (field: ScenarioFieldKey, raw: string) => {
    const parsed = parseNumber(raw);
    const invalid =
      raw.trim() !== '' &&
      (parsed == null ||
        parsed < 0 ||
        (field === 'workingHoursPerDay' && parsed <= 0) ||
        (field === 'serviceRatePerHour' && parsed <= 0) ||
        (field === 'servers' && (!Number.isInteger(parsed) || parsed < 1)));
    setInvalidFields((current) => ({ ...current, [field]: invalid }));
    if (invalid) return;

    const nextOptions = { ...options };
    if (parsed == null) delete nextOptions[field];
    else nextOptions[field] = parsed;
    setAnalysisOptions(nextOptions);
    setEditingFields((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  };

  const reset = () => {
    setDraft(draftFromOptions({}));
    setEditingFields(new Set());
    setInvalidFields({});
    setAnalysisOptions({});
  };

  return (
    <CollapsibleSection
      open={isOpen}
      onOpenChange={setIsOpen}
      title={copy.scenario}
      description={copy.scenarioDescription}
      icon={<Gauge size={16} aria-hidden="true" />}
      badge={
        hasConfiguredInput ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">
            {copy.scenarioSaved}
          </span>
        ) : null
      }
      className="border-b border-[var(--border)] bg-[var(--surface)]"
      headerClassName="px-4 sm:px-6 py-3"
      contentClassName="border-t border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-6"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Queue
            size={16}
            className="mt-0.5 shrink-0 text-[var(--muted-strong)]"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-[var(--muted)]">
            {copy.scenarioDescription}
          </p>
        </div>
        <Tooltip content={copy.clearScenarioInputs}>
          <button
            type="button"
            onClick={reset}
            aria-label={copy.clearScenarioInputs}
            title={copy.clearScenarioInputs}
            className="focus-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] active:scale-[0.97]"
          >
            <ArrowCounterClockwise size={15} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <ScenarioField
          id="scenario-arrival-rate"
          label={copy.arrivalRate}
          hint={copy.arrivalRateHint}
          emptyValue={copy.emptyValue}
          value={displayedDraft.arrivalRatePerHour}
          invalid={Boolean(invalidFields.arrivalRatePerHour)}
          error={fieldError('arrivalRatePerHour')}
          onChange={(value) => updateDraftField('arrivalRatePerHour', value)}
          onBlur={() =>
            commitField('arrivalRatePerHour', displayedDraft.arrivalRatePerHour)
          }
        />
        <ScenarioField
          id="scenario-wip"
          label={copy.workInProcess}
          hint={copy.workInProcessHint}
          emptyValue={copy.emptyValue}
          value={displayedDraft.workInProcess}
          invalid={Boolean(invalidFields.workInProcess)}
          error={fieldError('workInProcess')}
          onChange={(value) => updateDraftField('workInProcess', value)}
          onBlur={() => commitField('workInProcess', displayedDraft.workInProcess)}
        />
        <ScenarioField
          id="scenario-hours"
          label={copy.workingHours}
          hint={copy.workingHoursHint}
          emptyValue={copy.emptyValue}
          value={displayedDraft.workingHoursPerDay}
          invalid={Boolean(invalidFields.workingHoursPerDay)}
          error={fieldError('workingHoursPerDay')}
          onChange={(value) => updateDraftField('workingHoursPerDay', value)}
          onBlur={() =>
            commitField('workingHoursPerDay', displayedDraft.workingHoursPerDay)
          }
        />
        <ScenarioField
          id="scenario-service-rate"
          label={`${copy.serviceRate} (${copy.optional})`}
          hint={copy.serviceRateHint}
          emptyValue={copy.emptyValue}
          value={displayedDraft.serviceRatePerHour}
          invalid={Boolean(invalidFields.serviceRatePerHour)}
          error={fieldError('serviceRatePerHour')}
          onChange={(value) => updateDraftField('serviceRatePerHour', value)}
          onBlur={() =>
            commitField('serviceRatePerHour', displayedDraft.serviceRatePerHour)
          }
        />
        <ScenarioField
          id="scenario-servers"
          label={`${copy.servers} (${copy.optional})`}
          hint={copy.serversHint}
          emptyValue={copy.emptyValue}
          value={displayedDraft.servers}
          invalid={Boolean(invalidFields.servers)}
          error={fieldError('servers')}
          onChange={(value) => updateDraftField('servers', value)}
          onBlur={() => commitField('servers', displayedDraft.servers)}
          integer
        />
      </div>
      {Object.values(invalidFields).some(Boolean) ? (
        <p className="mt-2 text-[11px] text-[var(--danger)]" role="alert">
          {copy.invalidNumber}
        </p>
      ) : null}
      {report.littleLaw || queue ? (
        <div className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
          {report.littleLaw ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <p className="text-[10px] font-semibold text-[var(--muted-strong)]">
                {copy.scenarioFormula}
              </p>
              <p className="mt-1 font-mono text-[11px] text-[var(--text)]">
                {Number(report.littleLaw.workInProcess.toFixed(2))} ={' '}
                {Number(report.littleLaw.arrivalRatePerHour.toFixed(2))}/h ×{' '}
                {formatValue(report.littleLaw.cycleTimeHours, ' h', copy.emptyValue)}
              </p>
            </div>
          ) : null}
          {queue ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-[var(--muted-strong)]">
                  {copy.queueModel} · {queue.model}
                </p>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    queue.status === 'ready'
                      ? 'text-[var(--success)]'
                      : 'text-[var(--danger)]',
                  )}
                >
                  {queue.status === 'ready'
                    ? copy.ready
                    : queue.status === 'unstable'
                      ? copy.simulationRequired
                      : copy.error}
                </span>
              </div>
              {queue.status === 'ready' ? (
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--muted)]">
                  <span>
                    {copy.queueUtilization}:{' '}
                    {formatValue(
                      queue.utilization == null ? null : queue.utilization * 100,
                      '%',
                      copy.emptyValue,
                    )}
                  </span>
                  <span>
                    {copy.averageQueue}:{' '}
                    {formatValue(queue.averageQueueLength, '', copy.emptyValue)}
                  </span>
                  <span>
                    {copy.averageWait}:{' '}
                    {formatValue(queue.averageWaitingHours, ' h', copy.emptyValue)}
                  </span>
                  <span>
                    {copy.averageSystem}:{' '}
                    {formatValue(queue.averageSystemHours, ' h', copy.emptyValue)}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                  {queue.warnings
                    .map((warning) => localizeAnalysisMessage(warning, locale))
                    .join(' ')}
                </p>
              )}
              <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                {queue.formula}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
