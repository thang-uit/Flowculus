'use client';
import { AppSelect } from '@/components/ui/AppSelect';
import { useRef, useState, useEffect } from 'react';
import { ArrowsLeftRight } from '@phosphor-icons/react';
import type { compareProcessScenarios } from '@flowculus/analysis-engine';
import { checkSemanticGate } from '@flowculus/validation';
import { AppDialog } from '@/components/ui/AppDialog';
import { AppButton } from '@/components/ui/AppButton';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { getWorkspaceDocuments } from '@/lib/documents/document-types';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { getScenarioCopy } from '@/lib/i18n/scenario-copy';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { exportFileName } from '@/lib/file-name';
import { getWorkspaceCopy } from '@/lib/i18n';
import { qualityLabel } from '@/lib/quality-label';
export function ScenarioComparison() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getScenarioCopy(locale);
  const workspaceCopy = getWorkspaceCopy(locale);
  const workspace = useWorkspaceStore();
  const documents = getWorkspaceDocuments(workspace);
  const [open, setOpen] = useState(false);
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [result, setResult] = useState<ReturnType<typeof compareProcessScenarios> | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<{
    before: (typeof documents)[number];
    after: (typeof documents)[number];
  } | null>(null);
  const currentResult =
    result &&
    documents.some(
      (item) =>
        item.processModel === snapshot?.before.processModel &&
        item.analysisOptions === snapshot?.before.analysisOptions,
    ) &&
    documents.some(
      (item) =>
        item.processModel === snapshot?.after.processModel &&
        item.analysisOptions === snapshot?.after.analysisOptions,
    )
      ? result
      : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const run = () => {
    const a = documents.find((item) => item.id === before);
    const b = documents.find((item) => item.id === after);
    if (!a || !b) return;
    const ga = checkSemanticGate(a.processModel);
    const gb = checkSemanticGate(b.processModel);
    if (!ga.ok || !gb.ok) {
      setError(true);
      return;
    }
    cancel();
    setBusy(true);
    setError(false);
    setResult(null);
    setSnapshot({ before: a, after: b });
    try {
      const current = new Worker(
        new URL(
          /* webpackChunkName: "flowculus-comparison" */ '../../workers/comparison.worker.ts',
          import.meta.url,
        ),
        { type: 'module' },
      );
      worker.current = current;
      timer.current = setTimeout(() => {
        cancel();
        setBusy(false);
        setError(true);
      }, 20000);
      current.onmessage = ({
        data,
      }: MessageEvent<{
        ok: boolean;
        result?: ReturnType<typeof compareProcessScenarios>;
      }>) => {
        if (current !== worker.current) return;
        setResult(data.ok ? (data.result ?? null) : null);
        setError(!data.ok);
        setBusy(false);
        cancel();
      };
      current.onerror = () => {
        setError(true);
        setBusy(false);
        cancel();
      };
      current.postMessage({
        before: ga.model,
        after: gb.model,
        beforeOptions: a.analysisOptions,
        afterOptions: b.analysisOptions,
      });
    } catch {
      cancel();
      setError(true);
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="focus-ring tb-btn tb-btn--idle size-9"
        aria-label={copy.title}
        title={copy.title}
        onClick={() => setOpen(true)}
      >
        <ArrowsLeftRight size={17} />
      </button>
      <AppDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            cancel();
            setBusy(false);
          }
        }}
        title={copy.title}
        description={copy.hint}
        closeLabel={copy.close}
        size="wide"
      >
        <div className="space-y-4">
          {[
            { label: copy.before, value: before, set: setBefore },
            { label: copy.after, value: after, set: setAfter },
          ].map((field) => (
            <label key={field.label} className="flex min-w-0 flex-col gap-1.5 text-sm">
              <span>{field.label}</span>
              <AppSelect
                id={`scenario-${field.value === before ? 'before' : 'after'}-${field.label}`}
                value={field.value}
                options={[
                  { value: '', label: copy.choose },
                  ...documents.map((item) => ({
                    value: item.id,
                    label: item.processModel.name,
                  })),
                ]}
                onValueChange={(value) => {
                  cancel();
                  setBusy(false);
                  field.set(value);
                  setResult(null);
                }}
              />
            </label>
          ))}
          <AppButton
            variant="primary"
            disabled={!before || !after || before === after || busy}
            onClick={run}
          >
            {copy.run}
          </AppButton>
          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {copy.error}
            </p>
          ) : null}
          {currentResult ? (
            <>
              <p className="text-xs text-[var(--muted)]">
                {currentResult.baseline.name} (
                {qualityLabel(currentResult.baseline.quality, workspaceCopy)}) →{' '}
                {currentResult.candidate.name} (
                {qualityLabel(currentResult.candidate.quality, workspaceCopy)})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {[copy.metric, copy.before, copy.after, copy.change].map(
                        (label) => (
                          <th scope="col" key={label} className="p-2 text-left">
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.metrics.map((row, index) => (
                      <tr key={row.metric}>
                        <th scope="row" className="p-2 text-left">
                          {copy.metrics[index]}
                        </th>
                        <td className="p-2">{row.baseline?.toFixed(3) ?? '—'}</td>
                        <td className="p-2">{row.candidate?.toFixed(3) ?? '—'}</td>
                        <td className="p-2">
                          {row.relativeChange == null
                            ? '—'
                            : new Intl.NumberFormat(locale, {
                                style: 'percent',
                                maximumFractionDigits: 1,
                              }).format(row.relativeChange)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AppButton
                onClick={() =>
                  downloadTextFile(
                    exportFileName(currentResult.candidate.name, 'analysis', 'json'),
                    JSON.stringify(currentResult, null, 2),
                    'application/json',
                  )
                }
              >
                {copy.export}
              </AppButton>
            </>
          ) : null}
        </div>
      </AppDialog>
    </>
  );
}
