'use client';

import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react';
import type { ProcessContainer } from '@flowculus/process-model';
import { TextField, SelectField, NumberField } from './InspectorFields';
import { resizeContainer } from '@/lib/container-resizing';
import { AppButton } from '@/components/ui/AppButton';
import { IconButton } from '@/components/ui/IconButton';
import { arrangeLanes, orderedLanes } from '@/lib/lane-arrangement';
import { renameContainer, reorderLane } from '@/lib/container-gestures';
import { insertContainerAt } from '@/lib/container-placement';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { removeElements } from '@/lib/model-editing';
import { showNotice } from '@/lib/ui/notice-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function ContainerInspector({
  container,
}: Readonly<{ container: ProcessContainer }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const model = useWorkspaceStore((state) => state.processModel);
  const copy = getCollaborationCopy(locale);
  const lanes = orderedLanes(model, container.parentId ?? container.id);
  const index = lanes.findIndex((lane) => lane.id === container.id);
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">{copy[container.kind]}</h3>
      <TextField
        key={container.label}
        label={copy.name}
        value={container.label}
        maxLength={120}
        onCommit={(value) => {
          const state = useWorkspaceStore.getState();
          state.commitModel(
            renameContainer(state.processModel, container.id, value ?? ''),
          );
        }}
      />
      {container.kind === 'pool' ? (
        <>
          <SelectField
            label={copy.orientation}
            value={container.orientation}
            options={[
              { value: 'horizontal', label: copy.horizontal },
              { value: 'vertical', label: copy.vertical },
            ]}
            onChange={(orientation) => {
              const state = useWorkspaceStore.getState();
              state.commitModel(
                arrangeLanes(
                  state.processModel,
                  container.id,
                  lanes.map((lane) => lane.id),
                  orientation,
                ),
              );
            }}
          />
          {!container.blackBox ? (
            <AppButton
              size="sm"
              onClick={() => {
                const state = useWorkspaceStore.getState();
                const result = insertContainerAt(
                  state.processModel,
                  'lane',
                  copy.lane,
                  {
                    x: container.bounds.x + container.bounds.width,
                    y: container.bounds.y + container.bounds.height,
                  },
                  copy.pool,
                  container.id,
                );
                if (result) {
                  state.commitModel(result.model);
                  state.setSelection({ nodeIds: [result.nodeId], edgeId: null });
                } else showNotice(copy.placementInvalid, 'error');
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {copy.addLane}
            </AppButton>
          ) : null}
        </>
      ) : (
        <div className="flex gap-2">
          <IconButton
            icon={ArrowUp}
            label={copy.up}
            disabled={index <= 0}
            onClick={() => {
              const state = useWorkspaceStore.getState();
              state.commitModel(reorderLane(state.processModel, container.id, index - 1));
            }}
          />
          <IconButton
            icon={ArrowDown}
            label={copy.down}
            disabled={index < 0 || index >= lanes.length - 1}
            onClick={() => {
              const state = useWorkspaceStore.getState();
              state.commitModel(reorderLane(state.processModel, container.id, index + 1));
            }}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {(['width', 'height'] as const)
          .filter(
            (dimension) =>
              container.kind === 'pool' ||
              dimension === (container.orientation === 'horizontal' ? 'height' : 'width'),
          )
          .map((dimension) => (
            <NumberField
              key={`${dimension}-${container.bounds[dimension]}`}
              label={copy[dimension]}
              value={container.bounds[dimension]}
              min={dimension === 'width' ? 180 : 100}
              errorMessage={copy.sizeInvalid}
              onCommit={(value) => {
                const state = useWorkspaceStore.getState();
                if (value == null) return false;
                const next = resizeContainer(state.processModel, container.id, {
                  ...container.bounds,
                  [dimension]: value,
                });
                if (next !== state.processModel) state.commitModel(next);
                else if (value !== container.bounds[dimension]) return false;
                return true;
              }}
            />
          ))}
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">{copy.directHint}</p>
      <p className="text-xs leading-5 text-[var(--muted)]">{copy.resize}</p>
      <AppButton
        variant="danger"
        size="sm"
        onClick={() => {
          const state = useWorkspaceStore.getState();
          state.commitModel(removeElements(state.processModel, [container.id], []));
        }}
      >
        <Trash size={16} aria-hidden="true" />
        {copy.deleteContents}
      </AppButton>
    </div>
  );
}
