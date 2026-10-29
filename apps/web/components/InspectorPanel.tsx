'use client';

import { Info, Trash, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef } from 'react';

import { EdgeInspector } from '@/components/inspector/EdgeInspector';
import { ContainerInspector } from '@/components/inspector/ContainerInspector';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { AppSelect } from '@/components/ui/AppSelect';
import { NodeInspector } from '@/components/inspector/NodeInspector';
import { SemanticReviewPanel } from '@/components/semantics/SemanticReviewPanel';
import { IconButton } from '@/components/ui/IconButton';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { cn } from '@/lib/cn';
import { dismissInspectorOnOutsidePointer } from '@/lib/inspector-dismissal';
import { getWorkspaceCopy } from '@/lib/i18n';
import { removeElements } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function InspectorPanel({
  mobile = false,
  open = true,
  onClose,
}: Readonly<{ mobile?: boolean; open?: boolean; onClose?: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const collaboration = getCollaborationCopy(locale);
  const containers = useWorkspaceStore((state) => state.processModel.containers);
  const nodes = useWorkspaceStore((state) => state.processModel.nodes);
  const edges = useWorkspaceStore((state) => state.processModel.edges);
  // A newly loaded model starts a fresh review (no stale "all confirmed").
  const modelId = useWorkspaceStore((state) => state.processModel.id);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const selectedEdgeId = useWorkspaceStore((state) => state.selectedEdgeId);
  const setSelection = useWorkspaceStore((state) => state.setSelection);
  const selectId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeInspector = useWorkspaceStore((state) => state.setInspectorOpen);

  useEffect(() => {
    if (mobile || !open) return;
    const onPointerDown = (event: PointerEvent) => {
      dismissInspectorOnOutsidePointer(event, panelRef.current, () =>
        closeInspector(false),
      );
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== 'Escape' ||
        document.querySelector('[data-radix-popper-content-wrapper]')
      )
        return;
      closeInspector(false);
      document.querySelector<HTMLButtonElement>('[data-inspector-toggle]')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeInspector, mobile, open]);
  const node = selectedNodeIds.length === 1 ? nodes[selectedNodeIds[0]] : undefined;
  const container =
    selectedNodeIds.length === 1 ? containers?.[selectedNodeIds[0]] : undefined;
  const edge =
    selectedNodeIds.length === 0 && selectedEdgeId ? edges[selectedEdgeId] : undefined;

  let body;
  if (node) body = <NodeInspector key={node.id} node={node} />;
  else if (container)
    body = <ContainerInspector key={container.id} container={container} />;
  else if (edge) body = <EdgeInspector key={edge.id} edge={edge} />;
  else if (selectedNodeIds.length > 1) {
    body = (
      <div className="space-y-3 p-4">
        <p className="text-sm font-medium text-[var(--text)]">
          {copy.multipleSelected(selectedNodeIds.length)}
        </p>
        <button
          type="button"
          onClick={() => {
            const state = useWorkspaceStore.getState();
            state.commitModel(removeElements(state.processModel, selectedNodeIds, []));
          }}
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-strong)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
        >
          <Trash size={14} aria-hidden="true" />
          {copy.deleteSelection}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] text-[var(--muted)]">
          <Info size={21} aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">
          {copy.nothingSelected}
        </h3>
        <p className="mt-1.5 max-w-[220px] text-xs leading-5 text-[var(--muted)]">
          {copy.nothingSelectedHint}
        </p>
      </div>
    );
  }

  return (
    <aside
      ref={panelRef}
      aria-label={copy.inspector}
      className={cn(
        'shrink-0 flex-col bg-[var(--surface)]',
        mobile
          ? 'flex h-full w-full'
          : 'absolute inset-y-0 right-0 z-[6] hidden w-[300px] border-l border-[var(--border)] shadow-[var(--shadow-panel)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none xl:flex',
        !mobile && open ? 'translate-x-0 opacity-100' : null,
        !mobile && !open ? 'pointer-events-none translate-x-full opacity-0' : null,
      )}
      inert={!mobile && !open}
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
      <SemanticReviewPanel key={modelId} />
      <div className="border-b border-[var(--border)] px-4 py-3">
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-[11px] text-[var(--muted)]"
        >
          {copy.chooseShape}
        </label>
        <AppSelect
          id={selectId}
          value={node?.id ?? container?.id ?? ''}
          onValueChange={(next) =>
            setSelection({
              nodeIds: next ? [next] : [],
              edgeId: null,
            })
          }
          options={[
            { value: '', label: copy.noSelectionOption },
            ...Object.values(containers ?? {}).map((item) => ({
              value: item.id,
              label: `${item.label} (${collaboration[item.kind]})`,
            })),
            ...Object.values(nodes).map((item) => ({
              value: item.id,
              label: `${item.label} (${copy.shapeTypes[item.kind] ?? copy.shapeTypes.unknown})`,
            })),
          ]}
        />
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{body}</div>
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
