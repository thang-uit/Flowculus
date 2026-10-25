import {
  roundedPolylinePath,
  attachmentLead,
  routeOrthogonalEdge,
  type Point,
  type Rect,
  type RouteShapeHint,
} from '@flowculus/graph-layout';
import type { ProcessEdge } from '@flowculus/process-model';

const fixed = (value: number) => Number(value.toFixed(2));

const linePath = (points: readonly Point[]): string =>
  points.length
    ? `M ${fixed(points[0].x)} ${fixed(points[0].y)} ${points
        .slice(1)
        .map((point) => `L ${fixed(point.x)} ${fixed(point.y)}`)
        .join(' ')}`
    : '';

/** Catmull–Rom to cubic Bézier: curve passes through every user waypoint. */
const curvedPath = (points: readonly Point[]): string => {
  if (points.length < 3) return linePath(points);
  const commands = [`M ${fixed(points[0].x)} ${fixed(points[0].y)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    commands.push(
      `C ${fixed(current.x + (next.x - previous.x) / 6)} ${fixed(current.y + (next.y - previous.y) / 6)} ${fixed(next.x - (after.x - current.x) / 6)} ${fixed(next.y - (after.y - current.y) / 6)} ${fixed(next.x)} ${fixed(next.y)}`,
    );
  }
  return commands.join(' ');
};

const halfway = (points: readonly Point[]): Point => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1)
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  let remaining = total / 2;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= length && length > 0)
      return {
        x: a.x + ((b.x - a.x) * remaining) / length,
        y: a.y + ((b.y - a.y) * remaining) / length,
      };
    remaining -= length;
  }
  return points[0] ?? { x: 0, y: 0 };
};

const orthogonalize = (points: readonly Point[]): Point[] => {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous && previous.x !== point.x && previous.y !== point.y)
      result.push({ x: point.x, y: previous.y });
    result.push(point);
  }
  return result;
};

/** Insert a bend at the closest segment, preserving the user's route order. */
export function insertEdgeWaypoint(
  waypoints: readonly Point[],
  point: Point,
  source: Point,
  target: Point,
): Point[] {
  const path = [source, ...waypoints, target];
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index];
    const b = path[index + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared > 0
        ? Math.max(
            0,
            Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared),
          )
        : 0;
    const distance = Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return [...waypoints.slice(0, nearestIndex), point, ...waypoints.slice(nearestIndex)];
}

/** One route contract for live canvas and SVG export. */
export function routeProcessEdge(
  edge: ProcessEdge,
  source: Rect,
  target: Rect,
  hints: { source?: RouteShapeHint; target?: RouteShapeHint },
  obstacles: Rect[] = [],
) {
  const automatic = routeOrthogonalEdge(
    source,
    target,
    {
      ...hints,
      sourceSide: edge.routing?.sourceSide,
      targetSide: edge.routing?.targetSide,
    },
    obstacles,
  );
  const style = edge.routing?.style ?? 'orthogonal';
  const waypoints = edge.routing?.waypoints ?? [];
  const start = automatic.points[0];
  const end = automatic.points[automatic.points.length - 1];
  const pinned =
    style !== 'straight' && (edge.routing?.sourceSide || edge.routing?.targetSide);
  const basePoints = waypoints.length
    ? [
        start,
        ...(pinned ? [attachmentLead(start, automatic.sourceSide)] : []),
        ...waypoints,
        ...(pinned ? [attachmentLead(end, automatic.targetSide)] : []),
        end,
      ]
    : style === 'straight'
      ? [automatic.points[0], automatic.points[automatic.points.length - 1]]
      : automatic.points;
  const points =
    style === 'orthogonal' && waypoints.length ? orthogonalize(basePoints) : basePoints;
  return {
    points,
    sourceSide: automatic.sourceSide,
    targetSide: automatic.targetSide,
    path:
      style === 'curved'
        ? curvedPath(points)
        : style === 'straight'
          ? linePath(points)
          : roundedPolylinePath(points, 10),
    labelPoint: halfway(points),
  };
}

/** Move one displayed segment, keeping shape attachments fixed. Returns manual bends. */
export function moveRouteSegment(
  points: readonly Point[],
  segmentIndex: number,
  position: Point,
  orthogonal: boolean,
): Point[] | null {
  if (
    !Number.isInteger(segmentIndex) ||
    segmentIndex < 0 ||
    segmentIndex >= points.length - 1 ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y)
  )
    return null;
  const a = points[segmentIndex];
  const b = points[segmentIndex + 1];
  const delta = { x: position.x - (a.x + b.x) / 2, y: position.y - (a.y + b.y) / 2 };
  if (orthogonal) {
    if (Math.abs(a.y - b.y) < 0.01) delta.x = 0;
    else delta.y = 0;
  }
  if (Math.hypot(delta.x, delta.y) < 0.01) return null;
  const moved = points.map((point, index) =>
    index === segmentIndex || index === segmentIndex + 1
      ? { x: point.x + delta.x, y: point.y + delta.y }
      : { ...point },
  );
  // The original first/last point is the shape attachment, never an editable bend.
  if (segmentIndex === 0) moved.unshift(points[0]);
  if (segmentIndex === points.length - 2) moved.push(points[points.length - 1]);
  const bends = moved
    .slice(1, -1)
    .filter(
      (point, index, all) =>
        index === 0 ||
        Math.hypot(point.x - all[index - 1].x, point.y - all[index - 1].y) > 0.01,
    );
  return bends.length <= 32 ? bends : null;
}
