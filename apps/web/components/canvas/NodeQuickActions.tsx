'use client';

import { Diamond, FlagCheckered, Plus, Trash } from '@phosphor-icons/react';
import { NodeToolbar, Position } from '@xyflow/react';

import { getWorkspaceCopy } from '@/lib/i18n';
import { appendNodeAfter, removeElements } from '@/lib/model-editing';
import type { SemanticShapeTool } from '@/lib/shape-tools';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface NodeQuickActionsProps {
  nodeId: string;
  visible: boolean;
  canContinue: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * Contextual toolbar above a hovered/selected node: create the next step with
 * an automatic sequence flow, or delete the node. Edits go straight to the
 * store as one undoable change.
 */
export function NodeQuickActions({
  nodeId,
  visible,
  canContinue,
  onPointerEnter,
  onPointerLeave,
}: Readonly<NodeQuickActionsProps>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);

  const append = (tool: SemanticShapeTool) => {
    const state = useWorkspaceStore.getState();
    const result = appendNodeAfter(
      state.processModel,
      nodeId,
      tool,
      copy.defaultNodeLabels[tool],
    );
    if (!result) return;
    state.commitModel(result.model);
    state.setSelection({ nodeIds: [result.nodeId], edgeId: null });
  };

  const remove = () => {
    const state = useWorkspaceStore.getState();
    state.commitModel(removeElements(state.processModel, [nodeId], []));
  };

  return (
    <NodeToolbar isVisible={visible} position={Position.Top} offset={10}>
      <div
        className="flow-quick-actions nodrag nopan"
        role="toolbar"
        aria-label={copy.nodeQuickActions}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {canContinue ? (
          <>
            <button
              type="button"
              className="flow-quick-action focus-ring"
              onClick={() => append('task')}
              title={copy.quickAddTask}
              aria-label={copy.quickAddTask}
            >
              <Plus size={12} weight="bold" aria-hidden="true" />
              {copy.quickTask}
            </button>
            <button
              type="button"
              className="flow-quick-action focus-ring"
              onClick={() => append('xor')}
              title={copy.quickAddGateway}
              aria-label={copy.quickAddGateway}
            >
              <Diamond size={12} weight="bold" aria-hidden="true" />
              {copy.quickGateway}
            </button>
            <button
              type="button"
              className="flow-quick-action focus-ring"
              onClick={() => append('end')}
              title={copy.quickAddEnd}
              aria-label={copy.quickAddEnd}
            >
              <FlagCheckered size={12} weight="bold" aria-hidden="true" />
              {copy.quickEnd}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="flow-quick-action flow-quick-action--danger focus-ring"
          onClick={remove}
          title={copy.deleteElement}
          aria-label={copy.deleteElement}
        >
          <Trash size={12} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </NodeToolbar>
  );
}
