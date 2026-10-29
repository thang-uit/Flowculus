'use client';
import { memo, useCallback, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import {
  NodeResizer,
  NodeResizeControl,
  ResizeControlVariant,
  type NodeProps,
} from '@xyflow/react';
import type { ProcessFlowNode } from '@/lib/canvas-flow';
import { useContainerResize } from '@/lib/use-container-resize';
import { renameContainer } from '@/lib/container-gestures';
import { insertContainerAt } from '@/lib/container-placement';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { showNotice } from '@/lib/ui/notice-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { IconButton } from '@/components/ui/IconButton';
import { useWorkspaceStore } from '@/lib/workspace-store';
function ContainerView({ id, data, selected }: NodeProps<ProcessFlowNode>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getCollaborationCopy(locale);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const focusName = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      input.focus();
      input.select();
    }
  }, []);
  const container = data.container;
  const resize = useContainerResize(container, selected);
  if (!container) return null;
  const beginRename = () => {
    setName(container.label);
    setEditing(true);
  };
  const finishRename = () => {
    const state = useWorkspaceStore.getState();
    state.commitModel(renameContainer(state.processModel, id, name));
    setEditing(false);
  };
  return (
    <>
      {container.kind === 'pool' ? (
        <NodeResizer isVisible={selected} minWidth={180} minHeight={100} {...resize} />
      ) : selected ? (
        <NodeResizeControl
          position={container.orientation === 'horizontal' ? 'bottom' : 'right'}
          resizeDirection={
            container.orientation === 'horizontal' ? 'vertical' : 'horizontal'
          }
          variant={ResizeControlVariant.Line}
          minWidth={180}
          minHeight={100}
          {...resize}
          className="process-container__divider"
        />
      ) : null}
      <div
        className="process-container"
        data-kind={container.kind}
        data-orientation={container.orientation}
        data-selected={selected || undefined}
      >
        <button
          type="button"
          className="process-container__label focus-ring"
          title={`${container.label} · ${copy.directHint}`}
          aria-label={`${copy.rename}: ${container.label}`}
          onDoubleClick={beginRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'F2') {
              event.preventDefault();
              beginRename();
            }
          }}
        >
          {container.label}
        </button>
        {selected && container.kind === 'pool' && !container.blackBox ? (
          <IconButton
            icon={Plus}
            label={copy.addLane}
            size="sm"
            variant="accent"
            className="process-container__add nodrag nopan"
            onClick={() => {
              const state = useWorkspaceStore.getState();
              const next = insertContainerAt(
                state.processModel,
                'lane',
                copy.lane,
                {
                  x: container.bounds.x + container.bounds.width,
                  y: container.bounds.y + container.bounds.height,
                },
                copy.pool,
                id,
              );
              if (next) {
                state.commitModel(next.model);
                state.setSelection({ nodeIds: [next.nodeId], edgeId: null });
              } else showNotice(copy.placementInvalid, 'error');
            }}
          />
        ) : null}
        {editing ? (
          <input
            ref={focusName}
            className="process-container__name nodrag nopan focus-ring"
            aria-label={copy.name}
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            onBlur={finishRename}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                finishRename();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setEditing(false);
              }
            }}
          />
        ) : null}
      </div>
    </>
  );
}
export const ProcessContainerView = memo(ContainerView);
