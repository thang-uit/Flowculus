import type * as OpenCV from '@techstark/opencv-js';
import type { TraceCandidate } from './trace-types';

type Glyph = keyof typeof GLYPHS;
type BinaryImage = Pick<OpenCV.Mat, 'rows' | 'cols' | 'data'>;
const MAX_RECOGNIZED_HOURS = 10_000;
const GLYPHS = {
  '0': ['11111', '10001', '10011', '10101', '11001', '10001', '11111'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['11110', '00001', '00001', '11110', '10000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '11110'],
  h: ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
} as const;

interface Component {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Recognises a conservative `12h` style duration inside task boxes. Every value is reviewed before import. */
export function detectTraceDurations(
  binary: BinaryImage,
  candidates: readonly TraceCandidate[],
): TraceCandidate[] {
  return candidates.map((candidate) => {
    if (candidate.kind !== 'task' && candidate.kind !== 'subprocess') return candidate;
    const lines = groupIntoLines(componentsInside(binary, candidate));
    const durations: Array<{ hours: number; confidence: number }> = [];
    for (const line of lines) {
      // Keep punctuation in the line: dropping a decimal point or minus sign
      // would turn an unsupported label into a different numerical value.
      if (line.some((part) => part.height < 7 || part.width < 2)) continue;
      if (
        line.some(
          (part, index) =>
            index > 0 &&
            part.x - (line[index - 1].x + line[index - 1].width) >
              Math.max(part.height, line[index - 1].height) * 0.6,
        )
      )
        continue;
      const characters = line.map((part) => classify(binary, part));
      const label = characters.map((character) => character?.glyph ?? '?').join('');
      if (!/^\d{1,5}h$/.test(label)) continue;
      const confidence = Math.min(
        ...characters.map((character) => character?.confidence ?? 0),
      );
      const hours = Number(label.slice(0, -1));
      if (confidence >= 0.72 && hours <= MAX_RECOGNIZED_HOURS)
        durations.push({ hours, confidence });
    }
    return durations.length === 1
      ? {
          ...candidate,
          processingMinutes: durations[0].hours * 60,
          durationConfidence: durations[0].confidence,
        }
      : candidate;
  });
}

/** Keeps labels above a duration from interleaving with the duration glyphs by x-position. */
function groupIntoLines(components: readonly Component[]): Component[][] {
  const lines: Component[][] = [];
  for (const component of [...components].sort((left, right) => left.y - right.y)) {
    const matchingLine = lines.find((line) => {
      const top = Math.min(...line.map((part) => part.y));
      const bottom = Math.max(...line.map((part) => part.y + part.height));
      const overlap = Math.max(
        0,
        Math.min(bottom, component.y + component.height) - Math.max(top, component.y),
      );
      return overlap >= Math.min(bottom - top, component.height) * 0.6;
    });
    if (matchingLine) matchingLine.push(component);
    else lines.push([component]);
  }
  return lines.map((line) => line.sort((left, right) => left.x - right.x));
}

function componentsInside(binary: BinaryImage, candidate: TraceCandidate): Component[] {
  const { x, y, width, height } = candidate.bounds;
  const inset = Math.max(4, Math.round(Math.min(width, height) * 0.12));
  const left = Math.max(0, Math.round(x + inset));
  const top = Math.max(0, Math.round(y + inset));
  const right = Math.min(binary.cols, Math.round(x + width - inset));
  const bottom = Math.min(binary.rows, Math.round(y + height - inset));
  const regionWidth = right - left;
  const regionHeight = bottom - top;
  if (regionWidth <= 0 || regionHeight <= 0) return [];
  const visited = new Uint8Array(regionWidth * regionHeight);
  const result: Component[] = [];
  for (let py = top; py < bottom; py++)
    for (let px = left; px < right; px++) {
      const initial = py * binary.cols + px;
      const localIndex = (py - top) * regionWidth + px - left;
      if (!binary.data[initial] || visited[localIndex]) continue;
      const queue = [initial];
      visited[localIndex] = 1;
      let minX = px,
        maxX = px,
        minY = py,
        maxY = py;
      for (let head = 0; head < queue.length; head++) {
        const current = queue[head];
        const cx = current % binary.cols;
        const cy = Math.floor(current / binary.cols);
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx,
              ny = cy + dy;
            if (nx < left || nx >= right || ny < top || ny >= bottom) continue;
            const next = ny * binary.cols + nx;
            const nextLocal = (ny - top) * regionWidth + nx - left;
            if (binary.data[next] && !visited[nextLocal]) {
              visited[nextLocal] = 1;
              queue.push(next);
            }
          }
      }
      if (queue.length >= 2)
        result.push({
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
    }
  return result;
}

function classify(
  binary: BinaryImage,
  component: Component,
): { glyph: Glyph; confidence: number } | null {
  const INK_DENSITY_THRESHOLD = 0.35;
  // Connected components crop the blank side columns from a narrow `1`.
  // Restore the 5:7 glyph cell before sampling so `16h` is not read as `6h`.
  const sampleWidth = Math.max(component.width, Math.round((component.height * 5) / 7));
  const sampleX = Math.round(component.x + component.width / 2 - sampleWidth / 2);
  let best: { glyph: Glyph; confidence: number } | null = null;
  for (const [glyph, rows] of Object.entries(GLYPHS) as Array<
    [Glyph, readonly string[]]
  >) {
    let matches = 0;
    for (let row = 0; row < 7; row++)
      for (let column = 0; column < 5; column++) {
        const x0 = sampleX + Math.floor((column * sampleWidth) / 5);
        const x1 = sampleX + Math.ceil(((column + 1) * sampleWidth) / 5);
        const y0 = component.y + Math.floor((row * component.height) / 7);
        const y1 = component.y + Math.ceil(((row + 1) * component.height) / 7);
        let inkPixels = 0;
        const cellPixels = Math.max(1, (x1 - x0) * (y1 - y0));
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++)
            inkPixels += Number(binary.data[y * binary.cols + x] > 0);
        const ink = inkPixels / cellPixels >= INK_DENSITY_THRESHOLD;
        if (ink === (rows[row][column] === '1')) matches++;
      }
    const confidence = matches / 35;
    if (!best || confidence > best.confidence) best = { glyph, confidence };
  }
  return best && best.confidence >= 0.66 ? best : null;
}
