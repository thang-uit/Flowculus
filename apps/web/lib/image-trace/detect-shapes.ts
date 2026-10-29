import type * as OpenCV from '@techstark/opencv-js';
import { classifyContour } from './trace-model';
import type { TraceCandidate } from './trace-types';

type CV = typeof OpenCV;
const MAX_CONTOURS = 3000;
const MAX_CANDIDATES = 80;
const MAX_PROPOSALS = 1000;

/** Repair short pen gaps at two scales; convex hulls tolerate uneven hand strokes. */
export function detectTraceShapes(cv: CV, binary: OpenCV.Mat): TraceCandidate[] {
  const width = binary.cols;
  const height = binary.rows;
  const proposals: TraceCandidate[] = [];
  const kernels = [1, 5, 9];
  for (const size of kernels) {
    const repaired = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(size, size));
    try {
      cv.morphologyEx(binary, repaired, cv.MORPH_CLOSE, kernel);
      cv.findContours(
        repaired,
        contours,
        hierarchy,
        cv.RETR_LIST,
        cv.CHAIN_APPROX_SIMPLE,
      );
      for (
        let index = 0;
        index < Math.min(contours.size(), MAX_CONTOURS) &&
        proposals.length < MAX_PROPOSALS;
        index++
      ) {
        const contour = contours.get(index);
        const hull = new cv.Mat();
        const polygon = new cv.Mat();
        try {
          const rect = cv.boundingRect(contour);
          const area = cv.contourArea(contour);
          if (
            area < 350 ||
            area > width * height * 0.35 ||
            rect.width < 28 ||
            rect.height < 40 ||
            rect.width > width * 0.75 ||
            rect.height > height * 0.95
          )
            continue;
          cv.convexHull(contour, hull);
          const hullArea = cv.contourArea(hull);
          const perimeter = cv.arcLength(hull, true);
          cv.approxPolyDP(hull, polygon, perimeter * 0.035, true);
          const vertices = Array.from({ length: polygon.rows }, (_, at) => ({
            x: polygon.data32S[at * 2],
            y: polygon.data32S[at * 2 + 1],
          }));
          const shape = classifyContour(
            vertices,
            perimeter > 0 ? (4 * Math.PI * hullArea) / (perimeter * perimeter) : 0,
            0.28,
          );
          if (!shape) continue;
          const ratio = hullArea / (rect.width * rect.height);
          const aspect = rect.width / rect.height;
          if (
            (shape === 'rectangle' && ratio < 0.65) ||
            (shape === 'diamond' && (ratio < 0.35 || ratio > 0.75)) ||
            (shape === 'ellipse' && (aspect < 0.65 || aspect > 1.55 || ratio < 0.6))
          )
            continue;
          // A convex hull can turn arbitrary ink into a shape. Require actual ink
          // near most of its perimeter, including open shapes.
          const support = contourSupport(binary, shape, vertices, rect);
          // Rounded corners and anti-aliased strokes leave gaps on the hull. A
          // rectangle is still credible when most of its four straight sides
          // have nearby ink. Diamonds and ellipses keep the stricter threshold
          // because their hull is part of the semantic geometry.
          if (support < (shape === 'rectangle' ? 0.3 : 0.72)) continue;
          proposals.push({
            id: '',
            shape,
            kind:
              shape === 'rectangle' ? 'task' : shape === 'diamond' ? 'gateway' : 'event',
            label: '',
            bounds: rect,
            confidence: Math.min(0.8, support * 0.8),
          });
        } finally {
          polygon.delete();
          hull.delete();
          contour.delete();
        }
      }
    } finally {
      kernel.delete();
      hierarchy.delete();
      contours.delete();
      repaired.delete();
    }
  }
  const area = (candidate: TraceCandidate) =>
    candidate.bounds.width * candidate.bounds.height;
  const contains = (a: TraceCandidate, b: TraceCandidate) =>
    b.bounds.x >= a.bounds.x - 8 &&
    b.bounds.y >= a.bounds.y - 8 &&
    b.bounds.x + b.bounds.width <= a.bounds.x + a.bounds.width + 8 &&
    b.bounds.y + b.bounds.height <= a.bounds.y + a.bounds.height + 8;
  const selected: TraceCandidate[] = [];
  for (const candidate of proposals.sort((a, b) => area(b) - area(a))) {
    const containing = selected.find((other) => contains(other, candidate));
    if (
      containing &&
      candidate.shape === 'rectangle' &&
      containing.shape === 'rectangle' &&
      containing.bounds.width >= candidate.bounds.width * 1.15 &&
      containing.bounds.height <= candidate.bounds.height * 1.15
    ) {
      // A connector that touches a box can extend its contour horizontally.
      // Prefer the nested, shape-sized rectangle and remove the connector hull.
      selected.splice(selected.indexOf(containing), 1);
    } else if (containing) {
      continue;
    }
    const contained = selected.find((other) => contains(candidate, other));
    if (contained) continue;
    // A loop around several activities can itself resemble a rectangle. Prefer
    // separate, supported shapes over an enclosing fragment of the whole graph.
    const interior: TraceCandidate[] = [];
    for (const other of proposals) {
      if (area(other) > area(candidate) * 0.6 || area(other) < area(candidate) * 0.05)
        continue;
      const a = candidate.bounds,
        b = other.bounds;
      const overlap =
        Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      if (
        overlap < area(other) * 0.45 ||
        interior.some(
          (existing) => contains(existing, other) || contains(other, existing),
        )
      )
        continue;
      interior.push(other);
      if (interior.length === 2) break;
    }
    if (interior.length >= 2) continue;
    selected.push(candidate);
    if (selected.length === MAX_CANDIDATES) break;
  }
  return selected
    .sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y)
    .map((candidate, index) => ({ ...candidate, id: `trace-node-${index + 1}` }));
}

function contourSupport(
  binary: OpenCV.Mat,
  shape: NonNullable<ReturnType<typeof classifyContour>>,
  vertices: readonly { x: number; y: number }[],
  rect: { x: number; y: number; width: number; height: number },
) {
  const perimeter =
    shape === 'rectangle'
      ? [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.width - 1, y: rect.y },
          { x: rect.x + rect.width - 1, y: rect.y + rect.height - 1 },
          { x: rect.x, y: rect.y + rect.height - 1 },
        ]
      : vertices;
  let hits = 0;
  let samples = 0;
  for (let edge = 0; edge < perimeter.length; edge++) {
    const start = perimeter[edge];
    const end = perimeter[(edge + 1) % perimeter.length];
    const steps = Math.max(
      2,
      Math.ceil(Math.hypot(start.x - end.x, start.y - end.y) / 3),
    );
    for (let step = 0; step < steps; step++) {
      const x = Math.round(start.x + ((end.x - start.x) * step) / steps);
      const y = Math.round(start.y + ((end.y - start.y) * step) / steps);
      let ink = false;
      for (let dy = -3; dy <= 3 && !ink; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (
            px >= 0 &&
            py >= 0 &&
            px < binary.cols &&
            py < binary.rows &&
            binary.data[py * binary.cols + px]
          ) {
            ink = true;
            break;
          }
        }
      hits += Number(ink);
      samples++;
    }
  }
  return hits / samples;
}
