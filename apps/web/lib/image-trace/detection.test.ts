import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import type * as OpenCV from '@techstark/opencv-js';
import { detectTraceShapes } from './detect-shapes';
import { detectTraceConnectors } from './detect-connectors';
import type { TraceCandidate } from './trace-types';

let cv: typeof OpenCV;
beforeAll(async () => {
  // CommonJS avoids Vite treating the runtime's thenable as an ES module proxy.
  cv = await createRequire(import.meta.url)('@techstark/opencv-js');
});
const line = (image: OpenCV.Mat, points: Array<[number, number]>) => {
  for (let i = 1; i < points.length; i++)
    cv.line(
      image,
      new cv.Point(...points[i - 1]),
      new cv.Point(...points[i]),
      new cv.Scalar(255),
      3,
    );
};
const box = (image: OpenCV.Mat, x: number, y: number, w: number, h: number) =>
  line(image, [
    [x, y + 8],
    [x, y + h],
    [x + w, y + h],
    [x + w, y],
    [x + 5, y],
  ]);
const shape = (id: string, x: number, y: number): TraceCandidate => ({
  id,
  kind: 'task',
  shape: 'rectangle',
  label: '',
  confidence: 0.7,
  bounds: { x, y, width: 80, height: 60 },
});

describe('OpenCV geometric tracing', () => {
  it('recovers open boxes and bent split/join paths with attached labels', () => {
    const image = cv.Mat.zeros(360, 1040, cv.CV_8UC1);
    try {
      cv.circle(image, new cv.Point(50, 170), 25, new cv.Scalar(255), 3);
      box(image, 125, 130, 65, 85);
      box(image, 420, 15, 80, 70);
      box(image, 410, 265, 80, 60);
      box(image, 780, 130, 120, 80);
      line(image, [
        [300, 125],
        [345, 170],
        [300, 215],
        [255, 170],
        [300, 125],
      ]);
      line(image, [
        [650, 125],
        [695, 170],
        [650, 215],
        [605, 170],
        [650, 125],
      ]);
      cv.circle(image, new cv.Point(985, 170), 25, new cv.Scalar(255), 3);
      line(image, [
        [75, 170],
        [121, 170],
      ]);
      line(image, [
        [196, 170],
        [250, 170],
      ]);
      line(image, [
        [300, 122],
        [300, 50],
        [415, 50],
      ]);
      line(image, [
        [505, 50],
        [650, 50],
        [650, 120],
      ]);
      line(image, [
        [300, 218],
        [300, 295],
        [405, 295],
      ]);
      line(image, [
        [495, 295],
        [650, 295],
        [650, 220],
      ]);
      line(image, [
        [700, 170],
        [775, 170],
      ]);
      line(image, [
        [905, 170],
        [955, 170],
      ]);
      cv.putText(
        image,
        'A',
        new cv.Point(145, 185),
        cv.FONT_HERSHEY_SIMPLEX,
        0.9,
        new cv.Scalar(255),
        2,
      );
      cv.putText(
        image,
        'X',
        new cv.Point(287, 183),
        cv.FONT_HERSHEY_SIMPLEX,
        0.9,
        new cv.Scalar(255),
        2,
      );
      const candidates = detectTraceShapes(cv, image);
      expect(candidates).toHaveLength(8);
      expect(
        candidates.filter((candidate) => candidate.shape === 'rectangle'),
      ).toHaveLength(4);
      expect(
        candidates.filter((candidate) => candidate.shape === 'diamond'),
      ).toHaveLength(2);
      const connectors = detectTraceConnectors(cv, image, candidates);
      expect(connectors, JSON.stringify({ candidates, connectors })).toHaveLength(8);
      const split = candidates.find(
        (candidate) => candidate.shape === 'diamond' && candidate.bounds.x < 400,
      )!;
      expect(
        connectors
          .filter((edge) => edge.source === split.id)
          .map((edge) => edge.sourceSide)
          .sort(),
      ).toEqual(['bottom', 'top']);
    } finally {
      image.delete();
    }
  });
  it('does not invent shapes or paths in a blank image', () => {
    const image = cv.Mat.zeros(200, 400, cv.CV_8UC1);
    try {
      expect(detectTraceShapes(cv, image)).toEqual([]);
      expect(detectTraceConnectors(cv, image, [])).toEqual([]);
    } finally {
      image.delete();
    }
  });
  it('does not bridge unrelated strokes or guess through a three-way crossing', () => {
    const image = cv.Mat.zeros(400, 500, cv.CV_8UC1);
    const candidates = [shape('a', 20, 100), shape('b', 380, 100), shape('c', 200, 300)];
    try {
      line(image, [
        [108, 130],
        [180, 130],
      ]);
      line(image, [
        [280, 130],
        [372, 130],
      ]);
      expect(detectTraceConnectors(cv, image, candidates)).toEqual([]);
      line(image, [
        [178, 130],
        [282, 130],
      ]);
      line(image, [
        [240, 130],
        [240, 293],
      ]);
      expect(detectTraceConnectors(cv, image, candidates)).toEqual([]);
    } finally {
      image.delete();
    }
  });
});
