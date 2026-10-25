import {
  classifyContour,
  snapConnector,
  type TraceCandidate,
  type TraceResult,
} from '../lib/image-trace/trace-model';

type Request = {
  id: number;
  bitmap: ImageBitmap;
  crop: { left: number; top: number; right: number; bottom: number };
};
type Reply = { id: number; stage: string; result?: TraceResult; error?: string };
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (reply: Reply) => void;
};
const MAX_DIMENSION = 1600;
const MAX_CANDIDATES = 80;
const emit = (id: number, stage: string, result?: TraceResult, error?: string) =>
  workerScope.postMessage({ id, stage, result, error } satisfies Reply);

workerScope.onmessage = async (event: MessageEvent<Request>) => {
  const { id, bitmap, crop } = event.data;
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const cropX = Math.round((sourceWidth * crop.left) / 100);
  const cropY = Math.round((sourceHeight * crop.top) / 100);
  const cropWidth = Math.max(
    1,
    Math.round((sourceWidth * (100 - crop.left - crop.right)) / 100),
  );
  const cropHeight = Math.max(
    1,
    Math.round((sourceHeight * (100 - crop.top - crop.bottom)) / 100),
  );
  const scale = Math.min(1, MAX_DIMENSION / Math.max(cropWidth, cropHeight));
  const width = Math.max(1, Math.round(cropWidth * scale));
  const height = Math.max(1, Math.round(cropHeight * scale));
  if (sourceWidth < 32 || sourceHeight < 32 || sourceWidth * sourceHeight > 100_000_000) {
    bitmap.close();
    emit(id, 'error', undefined, 'invalid-dimensions');
    return;
  }
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    emit(id, 'error', undefined, 'canvas-unavailable');
    return;
  }
  emit(id, 'preprocess');
  context.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height);
  const mats: Array<{ delete: () => void }> = [];
  try {
    // This dynamic import stays in the worker chunk and is fetched only on demand.
    const cvModule = await import('@techstark/opencv-js');
    const cv = (cvModule as unknown as { default?: typeof cvModule }).default ?? cvModule;
    const source = cv.matFromImageData(pixels);
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    const lines = new cv.Mat();
    mats.push(source, gray, binary, contours, hierarchy, lines);
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
    cv.adaptiveThreshold(
      gray,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      31,
      8,
    );
    emit(id, 'detect-shapes');
    cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    const candidates: TraceCandidate[] = [];
    const limit = Math.min(contours.size(), 3000);
    for (let index = 0; index < limit && candidates.length < MAX_CANDIDATES; index += 1) {
      const contour = contours.get(index);
      const approx = new cv.Mat();
      try {
        const area = cv.contourArea(contour);
        if (area < 350 || area > width * height * 0.35) continue;
        const rect = cv.boundingRect(contour);
        if (
          rect.width < 28 ||
          rect.height < 24 ||
          rect.width > width * 0.75 ||
          rect.height > height * 0.75
        )
          continue;
        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, perimeter * 0.035, true);
        const coords = approx.data32S;
        const vertices = Array.from({ length: approx.rows }, (_, vertex) => ({
          x: coords[vertex * 2],
          y: coords[vertex * 2 + 1],
        }));
        const shape = classifyContour(
          vertices,
          perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0,
        );
        if (!shape) continue;
        const bounds = {
          x: cropX + rect.x / scale,
          y: cropY + rect.y / scale,
          width: rect.width / scale,
          height: rect.height / scale,
        };
        if (
          candidates.some(
            (other) =>
              Math.abs(other.bounds.x - bounds.x) < 12 / scale &&
              Math.abs(other.bounds.y - bounds.y) < 12 / scale &&
              Math.abs(other.bounds.width - bounds.width) < 15 / scale,
          )
        )
          continue;
        const kind =
          shape === 'rectangle' ? 'task' : shape === 'diamond' ? 'gateway' : 'event';
        candidates.push({
          id: `trace-node-${candidates.length + 1}`,
          shape,
          kind,
          label: `${kind === 'event' ? 'Event' : kind === 'gateway' ? 'Gateway' : 'Task'} ${candidates.length + 1}`,
          bounds,
          confidence: shape === 'rectangle' ? 0.7 : 0.55,
        });
      } finally {
        approx.delete();
        contour.delete();
      }
    }
    emit(id, 'detect-connectors');
    cv.HoughLinesP(binary, lines, 1, Math.PI / 180, 65, 30, 12);
    const connectors: TraceResult['connectors'] = [];
    const seen = new Set<string>();
    for (let index = 0; index < Math.min(lines.rows, 500); index += 1) {
      const [x1, y1, x2, y2] = Array.from(
        lines.data32S.subarray(index * 4, index * 4 + 4),
      );
      const connection = snapConnector(
        { x: cropX + x1 / scale, y: cropY + y1 / scale },
        { x: cropX + x2 / scale, y: cropY + y2 / scale },
        candidates,
        42 / scale,
      );
      if (!connection) continue;
      const key = `${connection.source}:${connection.target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      connectors.push(connection);
      if (connectors.length >= 120) break;
    }
    emit(id, 'done', {
      width: sourceWidth,
      height: sourceHeight,
      candidates,
      connectors,
    });
  } catch (error) {
    emit(id, 'error', undefined, error instanceof Error ? error.message : 'trace-failed');
  } finally {
    mats.forEach((mat) => mat.delete());
  }
};
