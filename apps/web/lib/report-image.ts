import type { AnalysisReport } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

import { downloadDataUriFile } from '@/lib/browser-file-actions';
import { REPORT_FONT, drawLines, drawRoundedRect, wrapText } from '@/lib/canvas-text';
import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import {
  assertReportTextBudget,
  reportImageLayout,
  ReportImageTooLargeError,
  REPORT_IMAGE_WIDTH,
  MAX_REPORT_IMAGE_HEIGHT,
} from '@/lib/report-image-layout';
import { buildReportContent } from '@/lib/report-content';

type ReportImageFormat = 'png' | 'jpeg';

interface ReportImageOptions {
  imageDataUri: string;
  filename: string;
  format: ReportImageFormat;
  title: string;
  report: AnalysisReport;
  model: ProcessModel;
  copy: WorkspaceCopy;
  locale: Locale;
  currency?: string;
}

/** Creates a shareable raster report without taking the diagram through a server. */
export async function downloadAnalysisReportImage({
  imageDataUri,
  filename,
  format,
  title,
  report,
  model,
  copy,
  locale,
  currency,
}: ReportImageOptions): Promise<void> {
  const image = new Image();
  image.decoding = 'async';
  image.src = imageDataUri;
  await image.decode();
  await document.fonts.ready;

  const width = REPORT_IMAGE_WIDTH;
  const padding = 64;
  const contentWidth = width - padding * 2;
  const diagramMaxHeight = 680;
  const diagramScale = Math.min(
    contentWidth / Math.max(image.naturalWidth, 1),
    diagramMaxHeight / Math.max(image.naturalHeight, 1),
  );
  const diagramWidth = Math.max(1, Math.round(image.naturalWidth * diagramScale));
  const diagramHeight = Math.max(1, Math.round(image.naturalHeight * diagramScale));

  const content = buildReportContent({ report, model, copy, locale, currency });
  const formulaLines = [
    ...content.formulaLines,
    ...content.activities.map(
      (row) =>
        `${row.label}: CT ${row.cycleTime} ${copy.minutesShort} · ${row.source} · T ${row.processing} · Wq ${row.waiting}`,
    ),
  ];
  const notes = [...content.errors, ...content.warnings];
  const info = content.info;
  assertReportTextBudget([title, ...formulaLines, ...notes, ...info]);
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Canvas export is not supported by this browser.');
  probe.font = `700 36px ${REPORT_FONT}`;
  const titleLines = wrapText(probe, title, contentWidth);
  const countLines = (lines: string[], font: string, maxWidth: number) => {
    probe.font = font;
    let total = 0;
    for (const line of lines) {
      total += wrapText(probe, line, maxWidth).length;
      if (total * 32 > MAX_REPORT_IMAGE_HEIGHT) throw new ReportImageTooLargeError();
    }
    return total;
  };
  const formulaLineCount = countLines(
    formulaLines,
    `400 22px ${REPORT_FONT}`,
    contentWidth - 44,
  );
  const listLineCount = Math.max(
    countLines(
      notes.map((line) => `• ${line}`),
      `400 22px ${REPORT_FONT}`,
      (contentWidth - 24) / 2,
    ),
    countLines(
      info.map((line) => `• ${line}`),
      `400 22px ${REPORT_FONT}`,
      (contentWidth - 24) / 2,
    ),
  );
  const { height, metaTop, diagramY, metricsTop, formulaTop, notesTop } =
    reportImageLayout(
      diagramHeight,
      formulaLineCount,
      Math.max(listLineCount, 1),
      titleLines.length,
    );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported by this browser.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#17202a';
  context.font = `700 36px ${REPORT_FONT}`;
  titleLines.forEach((line, index) => context.fillText(line, padding, 72 + index * 44));
  context.fillStyle = '#65717d';
  context.font = `400 18px ${REPORT_FONT}`;
  context.fillText(`${copy.subtitle} / ${copy.workspace}`, padding, metaTop);

  const diagramX = Math.round((width - diagramWidth) / 2);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#d8dee5';
  context.lineWidth = 2;
  drawRoundedRect(
    context,
    diagramX - 12,
    diagramY - 12,
    diagramWidth + 24,
    diagramHeight + 24,
    14,
  );
  context.drawImage(image, diagramX, diagramY, diagramWidth, diagramHeight);

  const metricGap = 16;
  const metricWidth = (contentWidth - metricGap * 3) / 4;
  content.metrics.forEach(({ label, value, quality }, index) => {
    const x = padding + index * (metricWidth + metricGap);
    context.fillStyle = '#f3f5f7';
    context.strokeStyle = '#d8dee5';
    drawRoundedRect(context, x, metricsTop, metricWidth, 112, 12);
    context.fillStyle = '#65717d';
    context.font = `600 15px ${REPORT_FONT}`;
    context.fillText(label.toUpperCase(), x + 18, metricsTop + 30);
    context.fillStyle = '#17202a';
    context.font = `700 24px ${REPORT_FONT}`;
    context.fillText(value, x + 18, metricsTop + 66);
    context.fillStyle = '#65717d';
    context.font = `400 15px ${REPORT_FONT}`;
    context.fillText(quality, x + 18, metricsTop + 94);
  });

  context.fillStyle = '#f3f5f7';
  context.strokeStyle = '#d8dee5';
  drawRoundedRect(
    context,
    padding,
    formulaTop,
    contentWidth,
    formulaLineCount * 32 + 44,
    12,
  );
  context.fillStyle = '#17202a';
  context.font = `700 21px ${REPORT_FONT}`;
  context.fillText(`${copy.formula} · ${content.quality}`, padding + 22, formulaTop + 32);
  drawLines(
    context,
    formulaLines.map((line) => ({ text: line, color: '#17202a' })),
    padding + 22,
    formulaTop + 68,
    contentWidth - 44,
    32,
  );

  const columnWidth = (contentWidth - 24) / 2;
  const drawNoteColumn = (
    x: number,
    heading: string,
    values: string[],
    color: string,
  ) => {
    context.fillStyle = '#17202a';
    context.font = `700 21px ${REPORT_FONT}`;
    context.fillText(heading, x, notesTop);
    drawLines(
      context,
      values.length
        ? values.map((value) => ({ text: `• ${value}`, color }))
        : [{ text: copy.quality.noIssues, color: '#65717d' }],
      x,
      notesTop + 36,
      columnWidth,
      32,
    );
  };
  drawNoteColumn(
    padding,
    `${copy.quality.issueGroups.error} / ${copy.quality.issueGroups.warning}`,
    notes,
    '#a87300',
  );
  drawNoteColumn(
    padding + columnWidth + 24,
    copy.quality.issueGroups.info,
    info,
    '#46525e',
  );

  context.fillStyle = '#65717d';
  context.font = `400 15px ${REPORT_FONT}`;
  context.fillText('Flowculus', padding, height - 28);

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  downloadDataUriFile(filename, canvas.toDataURL(mimeType, 0.92));
}
