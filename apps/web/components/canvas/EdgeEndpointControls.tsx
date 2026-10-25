'use client';

import { EdgeLabelRenderer, useStore } from '@xyflow/react';
import {
  getNodeBounds,
  type EdgeAttachmentSide,
  type ProcessEdge,
} from '@flowculus/process-model';
import { routeProcessEdge, routeHintForNode } from '@flowculus/file-formats';
import type { Point } from '@flowculus/graph-layout';
import { useEdgeAttachmentDrag } from '@/lib/use-edge-attachment-drag';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { reconnectEdge } from '@/lib/model-editing';

export function EdgeEndpointControls({
  edge,
  points,
}: Readonly<{ edge: ProcessEdge; points: readonly Point[] }>) {
  const drag = useEdgeAttachmentDrag(edge.id);
  const zoom = useStore((state) => state.transform[2]);
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const preview = drag.preview;
  const endpoints = [points[0], points[points.length - 1]];
  let path: string | undefined;
  if (preview) {
    if (preview.attachment) {
      const model = useWorkspaceStore.getState().processModel;
      const source =
        model.nodes[preview.end === 'source' ? preview.attachment.nodeId : edge.source];
      const target =
        model.nodes[preview.end === 'target' ? preview.attachment.nodeId : edge.target];
      if (source && target)
        path = routeProcessEdge(
          {
            ...edge,
            routing: {
              ...edge.routing,
              style: edge.routing?.style ?? 'orthogonal',
              waypoints:
                source.id === edge.source && target.id === edge.target
                  ? (edge.routing?.waypoints ?? [])
                  : [],
              ...(preview.end === 'source'
                ? { sourceSide: preview.attachment.side }
                : { targetSide: preview.attachment.side }),
            },
          },
          getNodeBounds(source),
          getNodeBounds(target),
          { source: routeHintForNode(source), target: routeHintForNode(target) },
          Object.values(model.nodes)
            .filter((node) => node !== source && node !== target)
            .map(getNodeBounds),
        ).path;
    } else {
      const fixed = endpoints[preview.end === 'source' ? 1 : 0];
      path = `M ${fixed.x} ${fixed.y} L ${preview.cursor.x} ${preview.cursor.y}`;
    }
  }
  return (
    <>
      {path ? (
        <path
          d={path}
          className="flow-endpoint-preview"
          data-valid={!!preview?.attachment}
        />
      ) : null}
      <EdgeLabelRenderer>
        {(['source', 'target'] as const).map((end, index) => {
          const point =
            preview?.end === end
              ? (preview.attachment?.point ?? preview.cursor)
              : endpoints[index];
          return (
            <button
              key={end}
              type="button"
              className="flow-endpoint-handle nodrag nopan focus-ring"
              data-end={end}
              data-snapped={preview?.end === end && !!preview.attachment}
              style={{
                left: point.x,
                top: point.y,
                transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              }}
              aria-label={
                end === 'source' ? copy.edgeAttachmentSource : copy.edgeAttachmentTarget
              }
              title={copy.edgeAttachmentHint}
              onKeyDown={(event) => {
                const sides: Partial<Record<string, EdgeAttachmentSide>> = {
                  ArrowUp: 'top',
                  ArrowRight: 'right',
                  ArrowDown: 'bottom',
                  ArrowLeft: 'left',
                };
                const side = sides[event.key];
                if (!side && event.key !== 'Home') return;
                event.preventDefault();
                event.stopPropagation();
                const state = useWorkspaceStore.getState();
                const current = state.processModel.edges[edge.id];
                if (!current) return;
                const next = reconnectEdge(
                  state.processModel,
                  edge.id,
                  current.source,
                  current.target,
                  end === 'source' ? { sourceSide: side } : { targetSide: side },
                );
                if (next && next !== state.processModel) state.commitModel(next);
              }}
              onPointerDown={(event) => drag.begin(event, end)}
              onPointerMove={drag.move}
              onPointerUp={drag.end}
              onPointerCancel={drag.cancel}
              onLostPointerCapture={drag.cancel}
            />
          );
        })}
      </EdgeLabelRenderer>
    </>
  );
}
