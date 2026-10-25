import type { Point, Rect, RectSide } from './geometry-types';

export const attachmentPoint = (rect: Rect, side: RectSide): Point => {
  if (side === 'top') return { x: rect.x + rect.width / 2, y: rect.y };
  if (side === 'bottom') return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  if (side === 'left') return { x: rect.x, y: rect.y + rect.height / 2 };
  return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
};

export const attachmentLead = (point: Point, side: RectSide, distance = 18): Point => {
  if (side === 'top') return { x: point.x, y: point.y - distance };
  if (side === 'bottom') return { x: point.x, y: point.y + distance };
  if (side === 'left') return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
};

const cleanPoints = (points: Point[]): Point[] =>
  points.filter(
    (point, index) =>
      index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y,
  );

const crosses = (a: Point, b: Point, rect: Rect): boolean =>
  Math.max(a.x, b.x) > rect.x &&
  Math.min(a.x, b.x) < rect.x + rect.width &&
  Math.max(a.y, b.y) > rect.y &&
  Math.min(a.y, b.y) < rect.y + rect.height;

/** A bounded set of Manhattan routes, with outward leads fixed at both ends. */
export function routeAttachedPoints(
  source: Rect,
  target: Rect,
  sourceSide: RectSide,
  targetSide: RectSide,
  obstacles: Rect[],
): Point[] {
  const start = attachmentPoint(source, sourceSide);
  const end = attachmentPoint(target, targetSide);
  const a = attachmentLead(start, sourceSide);
  const b = attachmentLead(end, targetSide);
  const shapes = [source, target, ...obstacles];
  let left = Math.min(a.x, b.x);
  let right = Math.max(a.x, b.x);
  let top = Math.min(a.y, b.y);
  let bottom = Math.max(a.y, b.y);
  for (const rect of shapes) {
    left = Math.min(left, rect.x);
    right = Math.max(right, rect.x + rect.width);
    top = Math.min(top, rect.y);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  const candidates: Point[][] = [
    [a, { x: b.x, y: a.y }, b],
    [a, { x: a.x, y: b.y }, b],
    ...[(a.x + b.x) / 2, left - 26, right + 26].map((x) => [
      a,
      { x, y: a.y },
      { x, y: b.y },
      b,
    ]),
    ...[(a.y + b.y) / 2, top - 26, bottom + 26].map((y) => [
      a,
      { x: a.x, y },
      { x: b.x, y },
      b,
    ]),
    // Two external lanes also cover opposite-facing ports and backflow routes.
    ...[left - 26, right + 26].flatMap((x) =>
      [top - 26, bottom + 26].map((y) =>
        sourceSide === 'left' || sourceSide === 'right'
          ? [a, { x, y: a.y }, { x, y }, { x: b.x, y }, b]
          : [a, { x: a.x, y }, { x, y }, { x, y: b.y }, b],
      ),
    ),
  ];
  let best: Point[] = [];
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const core = cleanPoints(candidate);
    let score = core.length * 8;
    for (let index = 1; index < core.length; index += 1) {
      const from = core[index - 1];
      const to = core[index];
      score += Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
      for (let at = 0; at < shapes.length; at += 1)
        if (crosses(from, to, shapes[at])) score += at < 2 ? 1e9 : 1e6;
    }
    // Prevent the core retracing a fixed lead and making the arrow enter sideways.
    const first = core[1];
    const last = core[core.length - 2];
    if (
      first &&
      (first.x - a.x) * (start.x - a.x) + (first.y - a.y) * (start.y - a.y) > 0
    )
      score += 1e9;
    if (last && (last.x - b.x) * (end.x - b.x) + (last.y - b.y) * (end.y - b.y) > 0)
      score += 1e9;
    if (score < bestScore) {
      bestScore = score;
      best = cleanPoints([start, ...core, end]);
    }
  }
  return best;
}
