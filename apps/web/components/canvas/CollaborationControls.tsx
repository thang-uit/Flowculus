'use client';
import { AppSelect } from '@/components/ui/AppSelect';
import { useState } from 'react';
import {
  SquaresFour,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from '@phosphor-icons/react';
import { processPools } from '@flowculus/process-model';
import { validateModelStructure } from '@flowculus/validation';
import { AppDialog } from '@/components/ui/AppDialog';
import { AppButton } from '@/components/ui/AppButton';
import {
  addLane,
  addPool,
  removeContainer,
  arrangeLanes,
} from '@/lib/collaboration-editing';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { orderedLanes } from '@/lib/lane-arrangement';
export function CollaborationControls() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getCollaborationCopy(locale);
  const model = useWorkspaceStore((state) => state.processModel);
  const options = useWorkspaceStore((state) => state.analysisOptions);
  const [open, setOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const pools = processPools(model);
  const frames = pools.flatMap((pool) => [pool, ...orderedLanes(model, pool.id)]);
  const selectedPool = options.processPoolId ?? pools.find((pool) => !pool.blackBox)?.id;
  const commit = useWorkspaceStore((state) => state.commitModel);
  return (
    <>
      <button
        type="button"
        className="focus-ring tb-btn tb-btn--idle size-9"
        aria-label={copy.open}
        title={copy.open}
        onClick={() => setOpen(true)}
      >
        <SquaresFour size={17} />
      </button>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        description={copy.hint}
        closeLabel={copy.close}
        size="wide"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AppButton
              onClick={() => commit(addPool(model, `${copy.pool} ${pools.length + 1}`))}
            >
              {copy.addPool}
            </AppButton>
            <AppButton
              disabled={!selectedPool}
              onClick={() =>
                selectedPool &&
                commit(
                  addLane(
                    model,
                    selectedPool,
                    `${copy.lane} ${Object.values(model.containers ?? {}).filter((item) => item.parentId === selectedPool).length + 1}`,
                  ),
                )
              }
            >
              {copy.addLane}
            </AppButton>
          </div>
          {pools.length ? (
            <label className="flex min-w-0 flex-col gap-1.5 text-sm">
              <span>{copy.process}</span>
              <AppSelect
                id={'collaboration-process'}
                value={options.processPoolId ?? (pools.length === 1 ? pools[0].id : '')}
                options={[
                  { value: '', label: copy.choose },
                  ...pools
                    .filter((pool) => !pool.blackBox)
                    .map((pool) => ({ value: pool.id, label: pool.label })),
                ]}
                onValueChange={(value) =>
                  useWorkspaceStore.getState().setAnalysisOptions({
                    ...options,
                    processPoolId: value || undefined,
                  })
                }
              />
            </label>
          ) : (
            <p className="text-sm text-[var(--muted)]">{copy.empty}</p>
          )}
          <div className="max-h-[45dvh] space-y-2 overflow-y-auto">
            {frames.map((container) => (
              <div
                key={container.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[var(--border)] p-2 sm:flex sm:flex-wrap"
              >
                <span className="text-xs text-[var(--muted)]">
                  {container.kind === 'pool' ? copy.pool : copy.lane}
                </span>
                <input
                  key={`${container.id}-${container.label}`}
                  className="focus-ring min-w-0 w-full rounded-lg sm:w-auto sm:flex-1 border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
                  aria-label={`${copy.name}: ${container.label}`}
                  maxLength={120}
                  defaultValue={container.label}
                  title={container.label}
                  onBlur={(event) => {
                    const label = event.target.value.trim();
                    if (!label) event.target.value = container.label;
                    if (label && label !== container.label)
                      commit({
                        ...model,
                        containers: {
                          ...model.containers,
                          [container.id]: { ...container, label },
                        },
                      });
                  }}
                />
                {container.kind === 'pool' ? (
                  <AppSelect
                    className="col-span-2"
                    id={`orientation-${container.id}`}
                    aria-label={copy.orientation}
                    value={container.orientation}
                    options={[
                      { value: 'horizontal', label: copy.horizontal },
                      { value: 'vertical', label: copy.vertical },
                    ]}
                    onValueChange={(value) =>
                      commit(
                        arrangeLanes(
                          model,
                          container.id,
                          orderedLanes(model, container.id).map((item) => item.id),
                          value as 'horizontal' | 'vertical',
                        ),
                      )
                    }
                  />
                ) : (
                  <div className="col-start-2 flex gap-1">
                    {[-1, 1].map((direction) => (
                      <AppButton
                        key={direction}
                        size="sm"
                        className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8"
                        aria-label={direction < 0 ? copy.up : copy.down}
                        disabled={(() => {
                          const siblings = orderedLanes(model, container.parentId ?? '');
                          const index = siblings.findIndex(
                            (item) => item.id === container.id,
                          );
                          return (
                            index + direction < 0 || index + direction >= siblings.length
                          );
                        })()}
                        onClick={() => {
                          const pool = model.containers?.[container.parentId ?? ''];
                          if (!pool) return;
                          const order = orderedLanes(model, pool.id).map(
                            (item) => item.id,
                          );
                          const index = order.indexOf(container.id);
                          const to = index + direction;
                          if (to < 0 || to >= order.length) return;
                          [order[index], order[to]] = [order[to], order[index]];
                          commit(arrangeLanes(model, pool.id, order, pool.orientation));
                        }}
                      >
                        {container.orientation === 'horizontal' ? (
                          direction < 0 ? (
                            <ArrowUp size={14} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={14} aria-hidden="true" />
                          )
                        ) : direction < 0 ? (
                          <ArrowLeft size={14} aria-hidden="true" />
                        ) : (
                          <ArrowRight size={14} aria-hidden="true" />
                        )}
                      </AppButton>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="focus-ring col-span-2 min-h-11 justify-self-start text-xs text-[var(--danger)] sm:min-h-8"
                  onClick={() => setRemoveId(container.id)}
                >
                  {copy.remove}
                </button>
              </div>
            ))}
          </div>
          {pools.length ? (
            <label className="flex min-w-0 flex-col gap-1.5 text-sm">
              <span>{copy.assign}</span>
              <AppSelect
                id={'collaboration-membership'}
                value=""
                options={[
                  { value: '', label: copy.membership },
                  ...Object.values(model.containers ?? {})
                    .filter((item) => !item.blackBox)
                    .map((item) => ({ value: item.id, label: item.label })),
                ]}
                onValueChange={(value) => {
                  const state = useWorkspaceStore.getState();
                  const id = value;
                  const container = state.processModel.containers?.[id];
                  if (!container) return;
                  const nodes = { ...state.processModel.nodes };
                  for (const key of state.selectedNodeIds)
                    if (nodes[key])
                      nodes[key] = {
                        ...nodes[key],
                        poolId: container.kind === 'pool' ? id : container.parentId,
                        laneId: container.kind === 'lane' ? id : undefined,
                      };
                  const next = { ...state.processModel, nodes };
                  if (validateModelStructure(next).diagnostics.length) {
                    setError(true);
                    return;
                  }
                  setError(false);
                  commit(next);
                }}
              />
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {copy.invalid}
            </p>
          ) : null}
        </div>
      </AppDialog>
      <AppDialog
        open={!!removeId}
        onOpenChange={(value) => !value && setRemoveId(null)}
        title={copy.confirm}
        description={copy.removeQuestion}
        closeLabel={copy.close}
      >
        <div className="flex justify-end gap-2">
          <AppButton onClick={() => setRemoveId(null)}>{copy.cancel}</AppButton>
          <AppButton
            onClick={() => {
              if (removeId) commit(removeContainer(model, removeId));
              setRemoveId(null);
            }}
          >
            {copy.confirm}
          </AppButton>
        </div>
      </AppDialog>
    </>
  );
}
