import type * as OpenCV from '@techstark/opencv-js';
import type { EdgeAttachmentSide } from '@flowculus/process-model';
import type { TraceCandidate, TraceConnector } from './trace-types';

type CV = typeof OpenCV;
const PORT_RADIUS = 24;
const NODE_PADDING = 6;
const MIN_INK_PIXELS = 12;
const MAX_CONNECTORS = 120;
const SIDES: EdgeAttachmentSide[] = ['top', 'right', 'bottom', 'left'];

/** Follow connected ink through bends after removing node outlines and labels.
 * Crossings touching more than two shapes are ambiguous and stay for review.
 */
export function detectTraceConnectors(
  cv: CV,
  binary: OpenCV.Mat,
  candidates: readonly TraceCandidate[],
): TraceConnector[] {
  const width = binary.cols,
    height = binary.rows;
  const mask = binary.clone(),
    joined = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  try {
    // A bounded port lookup avoids testing every node for every foreground pixel.
    const owner = new Int16Array(width * height).fill(-1);
    const distance = new Uint16Array(width * height).fill(65535);
    candidates.forEach((candidate, index) => {
      const { x, y, width: w, height: h } = candidate.bounds;
      const cx = x + w / 2,
        cy = y + h / 2;
      const ports = [
        { x: cx, y },
        { x: x + w, y: cy },
        { x: cx, y: y + h },
        { x, y: cy },
      ];
      ports.forEach((port, side) => {
        for (
          let py = Math.max(0, Math.floor(port.y - PORT_RADIUS));
          py < Math.min(height, port.y + PORT_RADIUS + 1);
          py++
        )
          for (
            let px = Math.max(0, Math.floor(port.x - PORT_RADIUS));
            px < Math.min(width, port.x + PORT_RADIUS + 1);
            px++
          ) {
            const d = Math.round((px - port.x) ** 2 + (py - port.y) ** 2),
              at = py * width + px;
            if (d > PORT_RADIUS ** 2) continue;
            if (d < distance[at]) {
              owner[at] = index * 4 + side;
              distance[at] = d;
            } else if (d === distance[at] && Math.floor(owner[at] / 4) !== index)
              owner[at] = -1;
          }
      });
      for (
        let py = Math.max(0, Math.floor(y - NODE_PADDING));
        py < Math.min(height, y + h + NODE_PADDING + 1);
        py++
      )
        for (
          let px = Math.max(0, Math.floor(x - NODE_PADDING));
          px < Math.min(width, x + w + NODE_PADDING + 1);
          px++
        ) {
          const nx = Math.abs(px - cx) / (w / 2 + NODE_PADDING),
            ny = Math.abs(py - cy) / (h / 2 + NODE_PADDING);
          const inside =
            candidate.shape === 'diamond'
              ? nx + ny <= 1.13
              : candidate.shape === 'ellipse'
                ? nx * nx + ny * ny <= 1
                : nx <= 1 && ny <= 1;
          if (inside) mask.data[py * width + px] = 0;
        }
    });
    cv.morphologyEx(mask, joined, cv.MORPH_CLOSE, kernel);
    const ink = joined.data,
      visited = new Uint8Array(width * height),
      queue = new Int32Array(width * height);
    const found: TraceConnector[] = [],
      seen = new Set<string>();
    for (let start = 0; start < ink.length; start++) {
      if (!ink[start] || visited[start]) continue;
      let head = 0,
        tail = 1;
      queue[0] = start;
      visited[start] = 1;
      const touches = new Map<number, { side: number; distance: number }>();
      while (head < tail) {
        const at = queue[head++],
          x = at % width,
          y = Math.floor(at / width),
          port = owner[at];
        if (port >= 0) {
          const node = Math.floor(port / 4);
          if (distance[at] < (touches.get(node)?.distance ?? Infinity))
            touches.set(node, { side: port % 4, distance: distance[at] });
        }
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const next = ny * width + nx;
            if (ink[next] && !visited[next]) {
              visited[next] = 1;
              queue[tail++] = next;
            }
          }
      }
      if (tail < MIN_INK_PIXELS || touches.size !== 2) continue;
      const [a, b] = [...touches.keys()];
      const ac = candidates[a].bounds,
        bc = candidates[b].bounds;
      const dx = bc.x + bc.width / 2 - ac.x - ac.width / 2,
        dy = bc.y + bc.height / 2 - ac.y - ac.height / 2;
      // Arrowheads are not verified: left-to-right/top-to-bottom remains inferred.
      const forward = Math.abs(dx) < 16 ? dy >= 0 : dx > 0;
      const source = forward ? a : b,
        target = forward ? b : a,
        key = `${source}:${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        source: candidates[source].id,
        target: candidates[target].id,
        confidence: 0.4,
        sourceSide: SIDES[touches.get(source)!.side],
        targetSide: SIDES[touches.get(target)!.side],
      });
      if (found.length >= MAX_CONNECTORS) break;
    }
    return found;
  } finally {
    kernel.delete();
    joined.delete();
    mask.delete();
  }
}
