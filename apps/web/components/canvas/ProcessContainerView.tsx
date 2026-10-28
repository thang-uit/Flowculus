'use client';
import { memo } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import type { ProcessFlowNode } from '@/lib/canvas-flow';
import { resizeContainer } from '@/lib/collaboration-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
function ContainerView({ id, data, selected }: NodeProps<ProcessFlowNode>) {
  const flow = useReactFlow<ProcessFlowNode>();
  const container = data.container;
  if (!container) return null;
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        minHeight={100}
        onResizeEnd={(_, bounds) => {
          const state = useWorkspaceStore.getState();
          const parent = container.parentId
            ? state.processModel.containers?.[container.parentId]
            : undefined;
          const absolute = {
            ...bounds,
            x: bounds.x + (parent?.bounds.x ?? 0),
            y: bounds.y + (parent?.bounds.y ?? 0),
          };
          const next = resizeContainer(state.processModel, id, absolute);
          if (next !== state.processModel) state.commitModel(next);
          else
            flow.setNodes((nodes) =>
              nodes.map((node) =>
                node.id === id
                  ? {
                      ...node,
                      width: container.bounds.width,
                      height: container.bounds.height,
                      measured: {
                        width: container.bounds.width,
                        height: container.bounds.height,
                      },
                      position: {
                        x: container.bounds.x - (parent?.bounds.x ?? 0),
                        y: container.bounds.y - (parent?.bounds.y ?? 0),
                      },
                    }
                  : node,
              ),
            );
        }}
      />
      <div
        className="process-container"
        data-kind={container.kind}
        data-orientation={container.orientation}
        data-selected={selected || undefined}
      >
        <div className="process-container__label" title={container.label}>
          {container.label}
        </div>
      </div>
    </>
  );
}
export const ProcessContainerView = memo(ContainerView);
