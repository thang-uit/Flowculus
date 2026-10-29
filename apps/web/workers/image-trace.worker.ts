import { detectTraceShapes } from '../lib/image-trace/detect-shapes';
import { detectTraceConnectors } from '../lib/image-trace/detect-connectors';
import type { TraceResult } from '../lib/image-trace/trace-types';
import { inferTraceEventKinds } from '../lib/image-trace/trace-model';
import { detectTraceDurations } from '../lib/image-trace/detect-duration';

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
    const cv = await ((cvModule as unknown as { default?: typeof cvModule }).default ??
      cvModule);
    const source = cv.matFromImageData(pixels);
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    mats.push(source, gray, binary);
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
    const detected = detectTraceDurations(binary, detectTraceShapes(cv, binary));
    emit(id, 'detect-connectors');
    const paths = detectTraceConnectors(cv, binary, detected);
    const candidates = detected.map((candidate) => ({
      ...candidate,
      bounds: {
        x: cropX + candidate.bounds.x / scale,
        y: cropY + candidate.bounds.y / scale,
        width: candidate.bounds.width / scale,
        height: candidate.bounds.height / scale,
      },
    }));
    emit(
      id,
      'done',
      inferTraceEventKinds({
        width: sourceWidth,
        height: sourceHeight,
        candidates,
        connectors: paths,
      }),
    );
  } catch (error) {
    emit(id, 'error', undefined, error instanceof Error ? error.message : 'trace-failed');
  } finally {
    mats.forEach((mat) => mat.delete());
  }
};
