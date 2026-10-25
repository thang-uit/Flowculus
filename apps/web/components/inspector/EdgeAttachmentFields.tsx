'use client';

import {
  EDGE_ATTACHMENT_SIDES,
  type EdgeAttachmentSide,
  type ProcessEdge,
} from '@flowculus/process-model';
import { SelectField } from './InspectorFields';
import { getWorkspaceCopy } from '@/lib/i18n';
import { reconnectEdge } from '@/lib/model-editing';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Keyboard/touch alternative to dragging a connector endpoint on the canvas. */
export function EdgeAttachmentFields({ edge }: Readonly<{ edge: ProcessEdge }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const options = [
    { value: 'auto' as const, label: copy.edgeAttachmentAuto },
    ...EDGE_ATTACHMENT_SIDES.map((side) => ({
      value: side,
      label: copy.edgeAttachmentSides[side],
    })),
  ];
  const change = (
    end: 'sourceSide' | 'targetSide',
    value: EdgeAttachmentSide | 'auto',
  ) => {
    const state = useWorkspaceStore.getState();
    const current = state.processModel.edges[edge.id];
    if (!current) return;
    const next = reconnectEdge(
      state.processModel,
      current.id,
      current.source,
      current.target,
      {
        [end]: value === 'auto' ? undefined : value,
      },
    );
    if (next && next !== state.processModel) state.commitModel(next);
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <SelectField<EdgeAttachmentSide | 'auto'>
          label={copy.edgeAttachmentSource}
          value={edge.routing?.sourceSide ?? 'auto'}
          options={options}
          onChange={(value) => change('sourceSide', value)}
        />
        <SelectField<EdgeAttachmentSide | 'auto'>
          label={copy.edgeAttachmentTarget}
          value={edge.routing?.targetSide ?? 'auto'}
          options={options}
          onChange={(value) => change('targetSide', value)}
        />
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">{copy.edgeAttachmentHint}</p>
    </div>
  );
}
