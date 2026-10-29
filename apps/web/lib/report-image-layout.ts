/** Readable report images share the same 8-megapixel budget as diagram bitmaps. */
export const REPORT_IMAGE_WIDTH = 1600;
export const MAX_REPORT_IMAGE_HEIGHT = 5000;
export const MAX_REPORT_TEXT_CHARACTERS = 200_000;
export class ReportImageTooLargeError extends Error {
  constructor() {
    super('report-image-too-large');
    this.name = 'ReportImageTooLargeError';
  }
}
export function assertReportTextBudget(lines: readonly string[]): void {
  let length = 0;
  for (const line of lines) {
    length += line.length;
    if (length > MAX_REPORT_TEXT_CHARACTERS) throw new ReportImageTooLargeError();
  }
}
export function reportImageLayout(
  diagramHeight: number,
  formulaLines: number,
  noteLines: number,
  titleLines = 1,
) {
  if (
    ![diagramHeight, formulaLines, noteLines, titleLines].every(Number.isFinite) ||
    diagramHeight < 1 ||
    formulaLines < 0 ||
    noteLines < 0 ||
    titleLines < 1
  )
    throw new Error('Invalid report layout');
  const metaTop = 102 + (titleLines - 1) * 44;
  const diagramY = metaTop + 34;
  const metricsTop = diagramY + diagramHeight + 54;
  const formulaTop = metricsTop + 146;
  const notesTop = formulaTop + formulaLines * 32 + 86;
  const height = Math.max(1120, notesTop + 36 + Math.max(noteLines, 1) * 32 + 76);
  if (height > MAX_REPORT_IMAGE_HEIGHT) throw new ReportImageTooLargeError();
  return {
    width: REPORT_IMAGE_WIDTH,
    height,
    metaTop,
    diagramY,
    metricsTop,
    formulaTop,
    notesTop,
  };
}
