'use client';
import { AppSelect } from '@/components/ui/AppSelect';
import { useMemo } from 'react';
import {
  processPools,
  scopeProcessModel,
  type ProcessModel,
} from '@flowculus/process-model';
import type { ConformanceOptions } from '@flowculus/process-mining';
import { AppButton } from '@/components/ui/AppButton';
import { AppField } from '@/components/ui/AppField';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { getWorkspaceDocuments } from '@/lib/documents/document-types';
import { useMiningStore } from '@/lib/mining-store';
import { PetriNetView } from './PetriNetView';
import { ActivityMappingEditor } from './ActivityMappingEditor';
import { getMiningDataCopy } from '@/lib/i18n/mining-data-copy';
export function ReferenceConformancePanel({
  onCheck,
}: {
  onCheck: (model: ProcessModel, options: ConformanceOptions) => void;
}) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const workspace = useWorkspaceStore();
  const documents = getWorkspaceDocuments(workspace);
  const reference = useMiningStore((state) => state.reference);
  const setReference = useMiningStore((state) => state.setReference);
  const selected = reference.documentId;
  const poolId = reference.poolId;
  const mapping = reference.mapping;
  const result = useMiningStore((state) => state.result);
  const replay = useMiningStore((state) => state.replay);
  const document = documents.find((item) => item.id === selected);
  const model = document?.processModel;
  const pools = model ? processPools(model).filter((pool) => !pool.blackBox) : [];
  const scope = model ? scopeProcessModel(model, poolId || undefined) : null;
  const activities = useMiningStore((state) => state.result?.activityNames);
  const stored = useMiningStore((state) => state.conformance);
  const busy = useMiningStore((state) => state.checkingConformance);
  const canCheck = useMiningStore(
    (state) =>
      state.status === 'ready' &&
      !!state.result &&
      !state.mappingTable &&
      !state.pendingUpload,
  );
  const error = useMiningStore((state) => state.conformanceError);
  const options = useMemo(
    () => ({ poolId: poolId || undefined, activityMapping: mapping }),
    [poolId, mapping],
  );
  const evidence =
    stored && stored.model === model && stored.optionsKey === JSON.stringify(options)
      ? stored.evidence
      : null;
  const tasks = Object.values(scope?.nodes ?? {}).filter(
    (node) => node.kind === 'task' || node.kind === 'subprocess',
  );
  return (
    <section className="space-y-4 text-xs">
      <div className="space-y-1 break-words rounded-lg bg-[var(--surface-raised)] p-3">
        <p className="font-semibold">{getMiningDataCopy(locale).current}</p>
        <p>{replay?.kind === 'file' ? replay.fileName : result?.logName}</p>
      </div>
      <p className="leading-5 text-[var(--muted)]">{copy.referenceHint}</p>
      <AppField id="mining-reference" label={copy.reference}>
        <AppSelect
          id={'mining-reference'}
          value={document ? selected : ''}
          options={[
            { value: '', label: copy.reference },
            ...documents.map((item) => ({
              value: item.id,
              label: item.processModel.name,
            })),
          ]}
          onValueChange={(value) => {
            setReference({ documentId: value, poolId: '', mapping: {} });
          }}
        />
      </AppField>
      {pools.length ? (
        <AppSelect
          id={'mining-reference-pool'}
          value={poolId || (pools.length === 1 ? pools[0].id : '')}
          aria-label={copy.processScope}
          options={[
            { value: '', label: copy.processScope },
            ...pools.map((pool) => ({ value: pool.id, label: pool.label })),
          ]}
          onValueChange={(value) => {
            setReference({ ...reference, poolId: value, mapping: {} });
          }}
        />
      ) : null}
      <ActivityMappingEditor
        activities={activities ?? []}
        tasks={tasks}
        mapping={mapping}
        onChange={(name, value) =>
          setReference({ ...reference, mapping: { ...mapping, [name]: value } })
        }
      />
      <AppButton
        variant="primary"
        disabled={!model || !scope || busy || !canCheck}
        onClick={() => model && onCheck(model, options)}
      >
        {copy.run}
      </AppButton>
      {busy ? <p role="status">{copy.checking}</p> : null}
      {error ? (
        <p role="alert" className="text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {stored && !evidence ? (
        <p role="status" className="leading-5 text-[var(--muted-strong)]">
          {copy.referenceChanged}
        </p>
      ) : null}
      {evidence ? (
        <>
          <p className="text-[var(--muted)]">{copy.resultVersion}</p>
          <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
            <h3 className="font-semibold">{copy.alignment}</h3>
            <p>
              {copy.coverage}: {evidence.alignment.examinedCases} /{' '}
              {evidence.alignment.omittedCases}
            </p>
            <p>
              {copy.fitness}:{' '}
              {evidence.alignment.fitness == null
                ? copy.unknown
                : new Intl.NumberFormat(locale, {
                    style: 'percent',
                    maximumFractionDigits: 2,
                  }).format(evidence.alignment.fitness)}
            </p>
            <p className="leading-5 text-[var(--muted)]">{copy.method}</p>
            <p>
              {copy.compatible}: {evidence.alignment.compatibleCases} /{' '}
              {evidence.alignment.examinedCases}
            </p>
            <p className="leading-5 text-[var(--muted)]">{copy.fitnessHint}</p>
            {evidence.alignment.quality ? (
              <div className="space-y-2 border-t border-[var(--border)] pt-2">
                {[
                  { label: copy.precision, value: evidence.alignment.quality.precision },
                  {
                    label: copy.generalization,
                    value: evidence.alignment.quality.generalization,
                  },
                  {
                    label: copy.simplicity,
                    value: evidence.alignment.quality.simplicity,
                  },
                ].map((metric) => (
                  <p key={metric.label}>
                    {metric.label}:{' '}
                    {metric.value == null
                      ? copy.unknown
                      : new Intl.NumberFormat(locale, {
                          style: 'percent',
                          maximumFractionDigits: 2,
                        }).format(metric.value)}
                  </p>
                ))}
                <p>
                  {copy.qualityCoverage}: {evidence.alignment.quality.compatibleCases} /{' '}
                  {evidence.alignment.examinedCases}
                </p>
                <p className="leading-5 text-[var(--muted)]">{copy.qualityScope}</p>
              </div>
            ) : null}
            {evidence.alignment.status !== 'ready' ? <p>{copy.unsupported}</p> : null}
            {evidence.alignment.examples.map((example) => (
              <details key={example.caseId}>
                <summary className="cursor-pointer font-semibold">
                  {example.caseId} · {copy.cost}: {example.cost}
                </summary>
                <ol className="mt-2 space-y-1">
                  {example.moves.map((move, index) => (
                    <li
                      key={index}
                      className={
                        move.kind === 'sync'
                          ? 'text-[var(--muted)]'
                          : 'text-[var(--danger)]'
                      }
                    >
                      {move.kind === 'model'
                        ? copy.modelMove
                        : move.kind === 'log'
                          ? copy.logMove
                          : copy.syncMove}
                      : {move.activity}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
          {evidence.referencePetri.status === 'ready' ? (
            <PetriNetView
              net={evidence.referencePetri.net}
              verification={evidence.verification}
            />
          ) : (
            <p>{copy.unsupported}</p>
          )}
        </>
      ) : null}
    </section>
  );
}
