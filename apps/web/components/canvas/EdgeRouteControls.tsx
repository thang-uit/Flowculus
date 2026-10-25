'use client';

import { EdgeLabelRenderer } from '@xyflow/react';
import type { Point } from '@flowculus/graph-layout';
import type { useEdgeRouteEditing } from '@/lib/use-edge-route-editing';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function EdgeRouteControls({
  waypoints,
  route,
  editing,
}: Readonly<{
  waypoints: readonly Point[];
  route: readonly Point[];
  editing: ReturnType<typeof useEdgeRouteEditing>;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  // Auto routes contain collinear guide points. A single handle on the whole
  // straight run avoids overlapping the node's reconnect hit area.
  const editableRoute = route.filter((point, index) => {
    if (index === 0 || index === route.length - 1) return true;
    const before = route[index - 1];
    const after = route[index + 1];
    const cross =
      (point.x - before.x) * (after.y - point.y) -
      (point.y - before.y) * (after.x - point.x);
    const forward =
      (point.x - before.x) * (after.x - point.x) +
      (point.y - before.y) * (after.y - point.y);
    return Math.abs(cross) > 0.01 || forward < 0;
  });
  const segments =
    waypoints.length < 30
      ? editableRoute.slice(1).flatMap((point, index) => {
          const previous = editableRoute[index];
          if (Math.hypot(point.x - previous.x, point.y - previous.y) < 28) return [];
          return [
            {
              x: (point.x + previous.x) / 2,
              y: (point.y + previous.y) / 2,
              index,
              horizontal: Math.abs(point.y - previous.y) < 0.01,
            },
          ];
        })
      : [];
  const pointerHandlers = {
    onPointerMove: editing.move,
    onPointerUp: editing.end,
    onPointerCancel: editing.cancel,
    onLostPointerCapture: editing.cancel,
  };
  return (
    <EdgeLabelRenderer>
      {segments.map((point) => (
        <button
          key={`segment-${point.index}`}
          type="button"
          className="flow-segment-handle nodrag nopan focus-ring"
          data-horizontal={point.horizontal}
          style={{ left: point.x, top: point.y }}
          aria-label={`${copy.edgeSegment} ${point.index + 1}`}
          title={copy.edgeEditHint}
          onPointerDown={(event) =>
            editing.begin(event, 'segment', point.index, editableRoute)
          }
          onKeyDown={(event) => editing.segmentKey(event, point.index, editableRoute)}
          {...pointerHandlers}
        />
      ))}
      {waypoints.map((point, index) => (
        <button
          key={`point-${index}`}
          type="button"
          className="flow-waypoint nodrag nopan focus-ring"
          style={{ left: point.x, top: point.y }}
          aria-label={`${copy.edgeWaypoint} ${index + 1}`}
          title={copy.edgeWaypointHint}
          onPointerDown={(event) => editing.begin(event, 'point', index, waypoints)}
          onKeyDown={(event) => editing.key(event, index)}
          {...pointerHandlers}
        />
      ))}
    </EdgeLabelRenderer>
  );
}
