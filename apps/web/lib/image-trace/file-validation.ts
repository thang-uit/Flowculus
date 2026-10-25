export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 100_000_000;
export interface TraceCrop {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export const EMPTY_TRACE_CROP: TraceCrop = { left: 0, top: 0, right: 0, bottom: 0 };
export const validTraceCrop = (crop: TraceCrop): boolean =>
  Object.values(crop).every(
    (value) => Number.isFinite(value) && value >= 0 && value <= 80,
  ) &&
  crop.left + crop.right <= 80 &&
  crop.top + crop.bottom <= 80;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const isTraceImage = (file: File): boolean => IMAGE_TYPES.has(file.type);

export function validateTraceFile(file: File): string | null {
  if (!isTraceImage(file)) return 'invalid-type';
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return 'invalid-size';
  return null;
}
