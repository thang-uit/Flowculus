'use client';

import { CheckCircle, Clock, Info, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { ProcessNode } from '@flowculus/process-model';

import { IconButton } from '@/components/ui/IconButton';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { cn } from '@/lib/cn';

const numberOrUndefined = (value: string) => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const integerOrUndefined = (value: string) => {
  const parsed = numberOrUndefined(value);
  return parsed == null || !Number.isInteger(parsed) ? undefined : parsed;
};

const hasInvalidNumber = (value: string, integer = false): boolean => {
  if (value.trim() === '') return false;
  const parsed = Number(value.replace(',', '.'));
  return !Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed));
};

export function InspectorPanel({
  mobile = false,
  open = true,
  onClose,
  onModelChange,
  onEdgeChange,
}: {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
  onModelChange?: (node: ProcessNode) => void;
  onEdgeChange?: (edgeId: string, probability: number | undefined) => void;
}) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((state) => state.setSelectedNodeId);
  const model = useWorkspaceStore((state) => state.processModel);
  const setProcessModel = useWorkspaceStore((state) => state.setProcessModel);
  const selectedNode = selectedNodeId ? model.nodes[selectedNodeId] : undefined;
  // The desktop inspector and the mobile bottom-sheet intentionally share the
  // same presentation component. Keep their form control ids distinct even
  // while the hidden responsive instance remains mounted in the DOM. This
  // preserves a one-to-one label relationship for assistive technology.
  const controlIdSuffix = mobile ? '-mobile' : '';
  const semanticNodeSelectId = `semantic-node-select${controlIdSuffix}`;
  const nodeLabelId = `node-label${controlIdSuffix}`;
  const [draftState, setDraftState] = useState<{
    nodeId: string | null;
    node?: ProcessNode;
  }>({ nodeId: selectedNodeId, node: selectedNode });
  // Keep the text the user is currently typing separate from the numeric
  // domain value. Without this buffer, an invalid intermediate value such as
  // `-5` or `100` is immediately replaced by the previous model value before
  // the user can see the validation message or correct it.
  const [numericDrafts, setNumericDrafts] = useState<Record<string, string>>({});
  const [edgeDrafts, setEdgeDrafts] = useState<Record<string, string>>({});
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const draft = draftState.nodeId === selectedNodeId ? draftState.node : selectedNode;
  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setNumericDrafts({});
      setEdgeDrafts({});
      setInvalidFields({});
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [selectedNodeId]);
  const typeLabel = useMemo(
    () =>
      selectedNode ? (copy.shapeTypes[selectedNode.kind] ?? copy.shapeTypes.unknown) : '',
    [copy.shapeTypes, selectedNode],
  );
  const update = (patch: Partial<ProcessNode>) =>
    setDraftState({
      nodeId: selectedNodeId,
      node: draft ? { ...draft, ...patch } : undefined,
    });
  const updateCost = (patch: Partial<NonNullable<ProcessNode['cost']>>) =>
    setDraftState({
      nodeId: selectedNodeId,
      node: draft ? { ...draft, cost: { ...draft.cost, ...patch } } : undefined,
    });
  const commit = () => {
    if (!draft) return;
    if (onModelChange) onModelChange(draft);
    else setProcessModel({ ...model, nodes: { ...model.nodes, [draft.id]: draft } });
  };
  const updateNumeric = (
    field: string,
    value: string,
    updater: (parsed: number | undefined) => void,
    integer = false,
  ) => {
    setNumericDrafts((current) => ({ ...current, [field]: value }));
    const invalid = hasInvalidNumber(value, integer);
    setInvalidFields((current) => ({ ...current, [field]: invalid }));
    if (!invalid) updater(integer ? integerOrUndefined(value) : numberOrUndefined(value));
  };
  const commitNumeric = (field: string, value: string, integer = false) => {
    const invalid = hasInvalidNumber(value, integer);
    setInvalidFields((current) => ({ ...current, [field]: invalid }));
    if (!invalid) {
      commit();
      setNumericDrafts((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };
  const numericValue = (field: string, value: number | undefined): string =>
    Object.prototype.hasOwnProperty.call(numericDrafts, field)
      ? (numericDrafts[field] ?? '')
      : value == null
        ? ''
        : String(value);
  const numericClass = (field: string) =>
    cn(inputClass, invalidFields[field] && 'border-[var(--danger)]');
  const probabilityIsInvalid = (value: string) => {
    if (value.trim() === '') return false;
    const parsed = Number(value.replace(',', '.'));
    // A geometric rework series only converges when r < 1. Keep the UI
    // aligned with the domain validator instead of allowing 100% and then
    // replacing a valid report with an opaque model error.
    return !Number.isFinite(parsed) || parsed < 0 || parsed >= 100;
  };
  const commitNode = (node: ProcessNode) => {
    setDraftState({ nodeId: node.id, node });
    if (onModelChange) onModelChange(node);
    else setProcessModel({ ...model, nodes: { ...model.nodes, [node.id]: node } });
  };
  const inputClass =
    'focus-ring h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text)]';
  const timeFields: Array<
    [
      string,
      number | undefined,
      'durationMinutes' | 'processingMinutes' | 'waitingMinutes',
    ]
  > = draft
    ? [
        [copy.cycleMinutes, draft.durationMinutes, 'durationMinutes'],
        [copy.processing, draft.processingMinutes, 'processingMinutes'],
        [copy.waiting, draft.waitingMinutes, 'waitingMinutes'],
      ]
    : [];
  const outgoingEdges = selectedNode
    ? Object.values(model.edges).filter((edge) => edge.source === selectedNode.id)
    : [];
  const gatewayBehaviorLabel =
    draft?.gatewayKind === 'and'
      ? copy.parallelPaths
      : draft?.gatewayKind === 'or'
        ? copy.inclusivePaths
        : draft?.gatewayKind === 'eventBased'
          ? copy.eventChoice
          : draft?.gatewayKind === 'complex'
            ? copy.complexChoice
            : copy.exactlyOnePath;
  const gatewayNeedsProbabilities =
    draft?.gatewayKind === 'xor' ||
    draft?.gatewayKind === 'or' ||
    draft?.gatewayKind == null;
  const commitEdgeProbability = (edgeId: string, value: string) => {
    const parsed =
      value.trim() === '' ? undefined : Number(value.replace(',', '.')) / 100;
    const invalid =
      value.trim() !== '' &&
      (parsed == null || !Number.isFinite(parsed) || parsed < 0 || parsed > 1);
    setInvalidFields((current) => ({ ...current, [`edge:${edgeId}`]: invalid }));
    if (!invalid) {
      if (onEdgeChange) onEdgeChange(edgeId, parsed);
      else {
        setProcessModel({
          ...model,
          edges: {
            ...model.edges,
            [edgeId]: { ...model.edges[edgeId], probability: parsed },
          },
        });
      }
    }
  };

  return (
    <aside
      className={cn(
        'shrink-0 flex-col bg-[var(--surface)]',
        mobile
          ? 'flex h-full w-full'
          : 'absolute inset-y-0 right-0 z-[4] hidden w-[300px] border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none xl:flex',
        !mobile && open ? 'translate-x-0 opacity-100' : null,
        !mobile && !open ? 'pointer-events-none translate-x-full opacity-0' : null,
      )}
    >
      <div className="flex items-start justify-between border-b border-[var(--border)] px-4 py-4">
        <PanelHeader title={copy.inspector} description={copy.inspectorDescription} />
        {mobile ? (
          <IconButton
            icon={X}
            label={copy.closeInspector}
            variant="subtle"
            size="sm"
            onClick={onClose}
          />
        ) : null}
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {draft ? (
          <div className="space-y-5 p-4">
            <section>
              <label
                htmlFor={semanticNodeSelectId}
                className="mb-2 block text-xs font-medium text-[var(--muted-strong)]"
              >
                {copy.chooseShape}
              </label>
              <select
                id={semanticNodeSelectId}
                value={selectedNodeId ?? ''}
                onChange={(event) => setSelectedNodeId(event.target.value || null)}
                className={inputClass}
              >
                {Object.values(model.nodes).map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label} ({copy.shapeTypes[node.kind] ?? copy.shapeTypes.unknown})
                  </option>
                ))}
              </select>
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor={nodeLabelId}
                  className="text-xs font-medium text-[var(--muted-strong)]"
                >
                  {copy.label}
                </label>
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {draft.id}
                </span>
              </div>
              <input
                id={nodeLabelId}
                value={draft.label}
                onChange={(event) => update({ label: event.target.value })}
                onBlur={commit}
                className={inputClass}
              />
            </section>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-[var(--muted-strong)]">
                  {copy.semanticType}
                </h3>
                <Tooltip content={copy.semanticHelp}>
                  <Info
                    size={15}
                    className="text-[var(--muted)]"
                    aria-label={copy.semanticHelp}
                  />
                </Tooltip>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                <span
                  className="size-2 rounded-full bg-[var(--accent)]"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--text)]">{typeLabel}</span>
              </div>
            </section>
            {draft.kind === 'task' || draft.kind === 'subprocess' ? (
              <>
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-[var(--muted-strong)]">
                      {copy.timeInputs}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                      {copy.minutes}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timeFields.map(([label, value, key]) => (
                      <label key={key} className="space-y-1.5">
                        <span className="block text-[11px] text-[var(--muted)]">
                          {label}
                        </span>
                        <div className="relative">
                          <input
                            inputMode="decimal"
                            value={numericValue(key, value)}
                            onChange={(event) =>
                              updateNumeric(key, event.target.value, (parsed) =>
                                update({ [key]: parsed }),
                              )
                            }
                            onBlur={(event) => commitNumeric(key, event.target.value)}
                            className={numericClass(key)}
                            aria-invalid={invalidFields[key] || undefined}
                            aria-label={`${label} ${copy.minutes}`}
                          />
                          <Clock
                            size={14}
                            className="pointer-events-none absolute right-2.5 top-3 text-[var(--muted)]"
                            aria-hidden="true"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                  {timeFields.some(([, , key]) => invalidFields[key]) ? (
                    <p className="text-[11px] text-[var(--danger)]" role="alert">
                      {copy.invalidNumber}
                    </p>
                  ) : null}
                  <p className="text-[11px] leading-5 text-[var(--muted)]">
                    {copy.sampleValuesHint}
                  </p>
                  <label className="block space-y-1.5">
                    <span className="block text-[11px] text-[var(--muted)]">
                      {copy.rework} ({copy.percent})
                    </span>
                    <input
                      inputMode="decimal"
                      value={
                        Object.prototype.hasOwnProperty.call(numericDrafts, 'rework')
                          ? numericDrafts.rework
                          : draft.reworkProbability == null
                            ? ''
                            : String(Number((draft.reworkProbability * 100).toFixed(2)))
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        setNumericDrafts((current) => ({ ...current, rework: value }));
                        const invalid = probabilityIsInvalid(value);
                        setInvalidFields((current) => ({ ...current, rework: invalid }));
                        if (!invalid) {
                          update({
                            reworkProbability:
                              numberOrUndefined(value) == null
                                ? undefined
                                : (numberOrUndefined(value) ?? 0) / 100,
                          });
                        }
                      }}
                      onBlur={(event) => {
                        const invalid = probabilityIsInvalid(event.target.value);
                        setInvalidFields((current) => ({ ...current, rework: invalid }));
                        if (!invalid) {
                          commit();
                          setNumericDrafts((current) => {
                            const next = { ...current };
                            delete next.rework;
                            return next;
                          });
                        }
                      }}
                      className={numericClass('rework')}
                      aria-invalid={invalidFields.rework || undefined}
                      aria-label={`${copy.rework} ${copy.percent}`}
                    />
                  </label>
                  {invalidFields.rework ? (
                    <p className="text-[11px] text-[var(--danger)]" role="alert">
                      {copy.invalidReworkProbability}
                    </p>
                  ) : null}
                </section>
                <section className="space-y-3">
                  <h3 className="text-xs font-medium text-[var(--muted-strong)]">
                    {copy.costInputs}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1.5">
                      <span className="block text-[11px] text-[var(--muted)]">
                        {copy.hourlyRate}
                      </span>
                      <input
                        inputMode="decimal"
                        value={numericValue(
                          'resourceRate',
                          draft.cost?.resourceRatePerHour,
                        )}
                        onChange={(event) =>
                          updateNumeric('resourceRate', event.target.value, (parsed) =>
                            updateCost({ resourceRatePerHour: parsed }),
                          )
                        }
                        onBlur={(event) =>
                          commitNumeric('resourceRate', event.target.value)
                        }
                        className={numericClass('resourceRate')}
                        aria-invalid={invalidFields.resourceRate || undefined}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="block text-[11px] text-[var(--muted)]">
                        {copy.fixedCost}
                      </span>
                      <input
                        inputMode="decimal"
                        value={numericValue(
                          'fixedCost',
                          draft.cost?.otherCostPerExecution,
                        )}
                        onChange={(event) =>
                          updateNumeric('fixedCost', event.target.value, (parsed) =>
                            updateCost({ otherCostPerExecution: parsed }),
                          )
                        }
                        onBlur={(event) => commitNumeric('fixedCost', event.target.value)}
                        className={numericClass('fixedCost')}
                        aria-invalid={invalidFields.fixedCost || undefined}
                      />
                    </label>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="block text-[11px] text-[var(--muted)]">
                      {copy.resourcePool}
                    </span>
                    <input
                      value={draft.cost?.resourcePoolId ?? ''}
                      onChange={(event) =>
                        updateCost({ resourcePoolId: event.target.value || undefined })
                      }
                      onBlur={commit}
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="block text-[11px] text-[var(--muted)]">
                      {copy.resourceCount}
                    </span>
                    <input
                      inputMode="numeric"
                      value={numericValue('resourceCount', draft.cost?.resourceCount)}
                      onChange={(event) =>
                        updateNumeric(
                          'resourceCount',
                          event.target.value,
                          (parsed) => updateCost({ resourceCount: parsed }),
                          true,
                        )
                      }
                      onBlur={(event) =>
                        commitNumeric('resourceCount', event.target.value, true)
                      }
                      className={numericClass('resourceCount')}
                      aria-invalid={invalidFields.resourceCount || undefined}
                      aria-label={copy.resourceCount}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="block text-[11px] text-[var(--muted)]">
                      {copy.currency}
                    </span>
                    <input
                      value={draft.cost?.currency ?? ''}
                      onChange={(event) =>
                        updateCost({
                          currency: event.target.value.toUpperCase().slice(0, 3),
                        })
                      }
                      onBlur={commit}
                      maxLength={3}
                      className={`${inputClass} uppercase`}
                      aria-label={copy.currency}
                    />
                  </label>
                </section>
              </>
            ) : null}
            {draft.kind === 'gateway' ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-[var(--muted-strong)]">
                    {copy.branchBehavior}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent-strong)]">
                    {draft.gatewayKind?.toUpperCase() ?? 'XOR'}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3 text-xs leading-5 text-[var(--muted-strong)]">
                  {gatewayBehaviorLabel}
                  {gatewayNeedsProbabilities ? ` ${copy.addProbabilities}` : null}
                </div>
                <label className="block space-y-1.5">
                  <span className="block text-[11px] text-[var(--muted)]">
                    {copy.gatewayKind}
                  </span>
                  <select
                    value={draft.gatewayKind ?? 'xor'}
                    onChange={(event) => {
                      commitNode({
                        ...draft,
                        gatewayKind: event.target.value as ProcessNode['gatewayKind'],
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="xor">{copy.xorGateway}</option>
                    <option value="and">{copy.andGateway}</option>
                    <option value="or">{copy.orGateway}</option>
                    <option value="eventBased">{copy.eventBasedGateway}</option>
                    <option value="complex">{copy.complexGateway}</option>
                  </select>
                </label>
                <p className="text-[11px] leading-5 text-[var(--muted)]">
                  {copy.sampleProbabilities}
                </p>
                <div className="space-y-2">
                  {outgoingEdges.map((edge) => (
                    <label
                      key={edge.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-xs text-[var(--muted-strong)]">
                        {edge.condition || model.nodes[edge.target]?.label || edge.target}
                      </span>
                      <span className="relative w-20 shrink-0">
                        <input
                          inputMode="decimal"
                          value={
                            edgeDrafts[edge.id] ??
                            (edge.probability == null
                              ? ''
                              : String(Number((edge.probability * 100).toFixed(2))))
                          }
                          onChange={(event) =>
                            setEdgeDrafts((current) => ({
                              ...current,
                              [edge.id]: event.target.value,
                            }))
                          }
                          onBlur={(event) => {
                            commitEdgeProbability(edge.id, event.target.value);
                            setEdgeDrafts((current) => {
                              const next = { ...current };
                              delete next[edge.id];
                              return next;
                            });
                          }}
                          className={cn(
                            inputClass,
                            'pr-7 text-right',
                            invalidFields[`edge:${edge.id}`] && 'border-[var(--danger)]',
                          )}
                          aria-invalid={invalidFields[`edge:${edge.id}`] || undefined}
                          aria-label={`${copy.probability}: ${edge.condition || edge.target}`}
                        />
                        <span className="pointer-events-none absolute right-2 top-2.5 text-[11px] text-[var(--muted)]">
                          {copy.percent}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {Object.entries(invalidFields).some(
                  ([key, invalid]) => invalid && key.startsWith('edge:'),
                ) ? (
                  <p className="text-[11px] text-[var(--danger)]" role="alert">
                    {copy.invalidNumber} (0-100%)
                  </p>
                ) : null}
              </section>
            ) : null}
            <section className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted-strong)]">
                <CheckCircle
                  size={16}
                  weight="fill"
                  className="text-[var(--success)]"
                  aria-hidden="true"
                />
                {copy.semanticReady}
              </div>
              <p className="mt-1.5 pl-6 text-[11px] leading-5 text-[var(--muted)]">
                {copy.semanticReadyHint}
              </p>
            </section>
          </div>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] text-[var(--muted)]">
              <Info size={21} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">
              {copy.nothingSelected}
            </h3>
            <p className="mt-1.5 max-w-[210px] text-xs leading-5 text-[var(--muted)]">
              {copy.nothingSelectedHint}
            </p>
          </div>
        )}
      </div>
      <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-3">
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <WarningCircle
            size={16}
            className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
            aria-hidden="true"
          />
          <p className="text-[11px] leading-5 text-[var(--muted)]">{copy.engineNotice}</p>
        </div>
      </div>
    </aside>
  );
}
