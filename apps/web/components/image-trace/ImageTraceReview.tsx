'use client';

import { useMemo, useRef, useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import type { ProcessNodeKind } from '@flowculus/process-model';
import { validateProcessGraph } from '@flowculus/validation';
import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { ImageTracePreview } from '@/components/image-trace/ImageTracePreview';
import { getWorkspaceCopy } from '@/lib/i18n';
import { formatDiagnostic } from '@/lib/diagnostic-messages';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import {
  mergeTracedModel,
  traceToProcessModel,
  type TraceResult,
} from '@/lib/image-trace/trace-model';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const EDITABLE_KINDS: ProcessNodeKind[] = [
  'start',
  'task',
  'gateway',
  'end',
  'event',
  'subprocess',
  'data',
  'annotation',
];

export function ImageTraceReview({
  result,
  imageUrl,
  onDone,
}: Readonly<{ result: TraceResult; imageUrl: string; onDone: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const [draft, setDraft] = useState(() => ({
    ...result,
    candidates: result.candidates.map((candidate, index) => ({
      ...candidate,
      label: candidate.label.trim() || `${copy.shapeTypes[candidate.kind]} ${index + 1}`,
    })),
  }));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const committed = useRef(false);
  const imageX = useImageReferenceStore((state) => state.x);
  const imageY = useImageReferenceStore((state) => state.y);
  const scale = Math.min(1, 1200 / result.width);
  const diagnostics = useMemo(
    () => validateProcessGraph(traceToProcessModel(draft, 'Review')).diagnostics,
    [draft],
  );
  const commit = () => {
    if (
      committed.current ||
      draft.candidates.length === 0 ||
      useImageReferenceStore.getState().url !== imageUrl
    )
      return;
    committed.current = true;
    const state = useWorkspaceStore.getState();
    const trace = traceToProcessModel(draft, state.modelName);
    const merged = mergeTracedModel(state.processModel, trace, scale, {
      x: imageX,
      y: imageY,
    });
    state.commitModel(merged.model);
    state.setSelection({ nodeIds: merged.nodeIds, edgeId: null });
    if (merged.nodeIds[0])
      state.focusElement({ elementType: 'node', elementId: merged.nodeIds[0] });
    onDone();
  };
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {copy.imageTraceReview}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
          {copy.imageTraceHint}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(230px,0.85fr)]">
        <ImageTracePreview
          draft={draft}
          imageUrl={imageUrl}
          focusId={focusId}
          label={copy.imageTraceReview}
        />
        <div className="max-h-[45dvh] space-y-3 overflow-y-auto pr-1">
          <h4 className="text-xs font-semibold text-[var(--text)]">
            {copy.imageTraceCandidates} ({draft.candidates.length})
          </h4>
          {draft.candidates.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">{copy.imageTraceEmpty}</p>
          ) : null}
          {draft.candidates.map((candidate) => (
            <div
              key={candidate.id}
              onMouseEnter={() => setFocusId(candidate.id)}
              onMouseLeave={() => setFocusId(null)}
              className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {candidate.id} · {Math.round(candidate.confidence * 100)}%
                </span>
                <button
                  type="button"
                  className="focus-ring rounded-md p-1.5 text-[var(--danger)] hover:bg-[var(--surface-soft)]"
                  aria-label={`${copy.imageTraceRemoveCandidate}: ${candidate.id}`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      candidates: current.candidates.filter(
                        (item) => item.id !== candidate.id,
                      ),
                      connectors: current.connectors.filter(
                        (edge) =>
                          edge.source !== candidate.id && edge.target !== candidate.id,
                      ),
                    }))
                  }
                >
                  <Trash size={15} />
                </button>
              </div>
              <label className="block text-[11px] text-[var(--muted)]">
                {copy.imageTraceKind}
                <AppSelect
                  id={`trace-kind-${candidate.id}`}
                  value={candidate.kind}
                  options={EDITABLE_KINDS.map((kind) => ({
                    value: kind,
                    label: copy.shapeTypes[kind] ?? kind,
                  }))}
                  onValueChange={(kind) =>
                    setDraft((current) => ({
                      ...current,
                      candidates: current.candidates.map((item) =>
                        item.id === candidate.id
                          ? { ...item, kind: kind as ProcessNodeKind }
                          : item,
                      ),
                    }))
                  }
                />
              </label>
              <label className="block text-[11px] text-[var(--muted)]">
                {copy.imageTraceLabel}
                <input
                  value={candidate.label}
                  maxLength={120}
                  className="focus-ring mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text)]"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      candidates: current.candidates.map((item) =>
                        item.id === candidate.id
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    }))
                  }
                />
              </label>
            </div>
          ))}
          <h4 className="text-xs font-semibold text-[var(--text)]">
            {copy.imageTraceConnectors} ({draft.connectors.length})
          </h4>
          {draft.candidates.length >= 2 ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] p-2">
              <label className="text-[11px] text-[var(--muted)]">
                {copy.imageTraceSource}
                <AppSelect
                  id="trace-source"
                  value={sourceId}
                  options={[
                    { value: '', label: copy.emptyValue },
                    ...draft.candidates.map((item) => ({
                      value: item.id,
                      label: item.label,
                    })),
                  ]}
                  onValueChange={setSourceId}
                />
              </label>
              <label className="text-[11px] text-[var(--muted)]">
                {copy.imageTraceTarget}
                <AppSelect
                  id="trace-target"
                  value={targetId}
                  options={[
                    { value: '', label: copy.emptyValue },
                    ...draft.candidates.map((item) => ({
                      value: item.id,
                      label: item.label,
                    })),
                  ]}
                  onValueChange={setTargetId}
                />
              </label>
              <button
                type="button"
                disabled={
                  !sourceId ||
                  !targetId ||
                  sourceId === targetId ||
                  draft.connectors.some(
                    (edge) => edge.source === sourceId && edge.target === targetId,
                  )
                }
                className="focus-ring col-span-2 rounded-lg border border-[var(--accent-strong)] px-2 py-2 text-xs font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    connectors: [
                      ...current.connectors,
                      { source: sourceId, target: targetId, confidence: 0.5 },
                    ],
                  }))
                }
              >
                {copy.imageTraceAddConnector}
              </button>
            </div>
          ) : null}
          {draft.connectors.map((connector, index) => (
            <div
              key={`${connector.source}-${connector.target}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted-strong)]"
            >
              <span className="min-w-0 flex-1 break-words">
                {draft.candidates.find((candidate) => candidate.id === connector.source)
                  ?.label ?? connector.source}{' '}
                →{' '}
                {draft.candidates.find((candidate) => candidate.id === connector.target)
                  ?.label ?? connector.target}
              </span>
              <AppSelect
                id={`trace-edge-${index}`}
                value={connector.kind ?? 'sequence'}
                options={[
                  { value: 'sequence', label: copy.sequenceFlow },
                  { value: 'message', label: copy.messageFlow },
                  { value: 'association', label: copy.associationFlow },
                ]}
                onValueChange={(kind) =>
                  setDraft((current) => ({
                    ...current,
                    connectors: current.connectors.map((item, at) =>
                      at === index
                        ? { ...item, kind: kind as NonNullable<typeof item.kind> }
                        : item,
                    ),
                  }))
                }
                className="max-w-32"
              />
              <button
                type="button"
                className="focus-ring rounded-md p-1 text-[var(--danger)]"
                aria-label={`${copy.deleteElement}: ${connector.source} → ${connector.target}`}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    connectors: current.connectors.filter((_, at) => at !== index),
                  }))
                }
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-[var(--muted)]">{copy.imageTraceReplaceWarning}</p>
      {diagnostics.length > 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
          <p className="text-xs font-semibold text-[var(--text)]">
            {copy.imageTraceDiagnostics} ({diagnostics.length})
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[var(--muted-strong)]">
            {diagnostics.slice(0, 4).map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.path ?? index}`}>
                {formatDiagnostic(diagnostic, locale)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AppButton
        type="button"
        disabled={draft.candidates.length === 0}
        onClick={commit}
        variant="primary"
      >
        {copy.imageTraceCreate}
      </AppButton>
    </div>
  );
}
