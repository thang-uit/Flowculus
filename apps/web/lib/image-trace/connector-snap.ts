import type { TraceCandidate, TraceConnector } from './trace-types';

interface Point {
  x: number;
  y: number;
}
const centre = ({ bounds }: TraceCandidate): Point => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

const segmentDistance = (point: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
};

function geometry(candidate: TraceCandidate) {
  const { x, y, width, height } = candidate.bounds;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
    return null;
  const mid = centre(candidate);
  const points: Point[] =
    candidate.shape === 'rectangle'
      ? [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ]
      : candidate.shape === 'diamond'
        ? [
            { x: mid.x, y },
            { x: x + width, y: mid.y },
            { x: mid.x, y: y + height },
            { x, y: mid.y },
          ]
        : Array.from({ length: 24 }, (_, i) => ({
            x: mid.x + (width / 2) * Math.cos((i * Math.PI) / 12),
            y: mid.y + (height / 2) * Math.sin((i * Math.PI) / 12),
          }));
  return { candidate, mid, width, height, points };
}

type Geometry = NonNullable<ReturnType<typeof geometry>>;
function boundary(point: Point, geometry: Geometry) {
  const { candidate, mid, width, height, points } = geometry;
  const nx = Math.abs((point.x - mid.x) / (width / 2)),
    ny = Math.abs((point.y - mid.y) / (height / 2));
  const inside =
    candidate.shape === 'diamond'
      ? nx + ny < 1
      : candidate.shape === 'ellipse'
        ? nx * nx + ny * ny < 1
        : nx < 1 && ny < 1;
  let distance = Infinity;
  for (let i = 0; i < points.length; i++)
    distance = Math.min(
      distance,
      segmentDistance(point, points[i], points[(i + 1) % points.length]),
    );
  return { inside, distance };
}

/** Prepare polygon boundaries once for all Hough segments in a scan. */
export function createConnectorSnapper(
  candidates: readonly TraceCandidate[],
  radius = 38,
) {
  const shapes = candidates
    .map(geometry)
    .filter((shape): shape is Geometry => shape !== null);
  return (a: Point, b: Point): TraceConnector | null => {
    if (
      ![a.x, a.y, b.x, b.y, radius].every(Number.isFinite) ||
      radius <= 0 ||
      Math.hypot(a.x - b.x, a.y - b.y) < 2
    )
      return null;
    const nearest = (point: Point): TraceCandidate | null => {
      let best: TraceCandidate | null = null,
        first = Infinity,
        second = Infinity;
      for (const shape of shapes) {
        const candidate = shape.candidate;
        const hit = boundary(point, shape);
        if (hit.inside && hit.distance > 3) return null;
        if (hit.distance > radius) continue;
        if (hit.distance < first) {
          second = first;
          first = hit.distance;
          best = candidate;
        } else second = Math.min(second, hit.distance);
      }
      return second - first <= Math.max(3, radius * 0.12) ? null : best;
    };
    const first = nearest(a),
      second = nearest(b);
    if (!first || !second || first.id === second.id) return null;
    const ca = centre(first),
      cb = centre(second);
    // Without verified arrowheads, direction remains a low-confidence proposal.
    const forward = Math.abs(ca.x - cb.x) < 16 ? ca.y <= cb.y : ca.x < cb.x;
    return {
      source: forward ? first.id : second.id,
      target: forward ? second.id : first.id,
      confidence: 0.4,
    };
  };
}

/** Reject segments inside shapes, loose endpoints and ambiguous boundaries. */
export function snapConnector(
  a: Point,
  b: Point,
  candidates: readonly TraceCandidate[],
  radius = 38,
): TraceConnector | null {
  return createConnectorSnapper(candidates, radius)(a, b);
}
