import type { AnalysisReport } from '@flowculus/analysis-engine';

import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import { localizeAnalysisMessage } from '@/lib/localize-analysis';
import { downloadDataUriFile } from '@/lib/browser-file-actions';

type ReportImageFormat = 'png' | 'jpeg';

interface ReportImageOptions {
  imageDataUri: string;
  filename: string;
  format: ReportImageFormat;
  title: string;
  report: AnalysisReport;
  copy: WorkspaceCopy;
  locale: Locale;
  currency?: string;
}

interface ReportLine {
  text: string;
  color?: string;
  weight?: string;
}

const formatNumber = (value: number | null, suffix = '', emptyValue = 'N/A') =>
  value == null ? emptyValue : `${Number(value.toFixed(2))}${suffix}`;

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawLines = (
  context: CanvasRenderingContext2D,
  lines: ReportLine[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number => {
  let cursorY = y;
  for (const line of lines) {
    context.font = `${line.weight ?? '400'} 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.fillStyle = line.color ?? '#46525e';
    for (const wrapped of wrapText(context, line.text, maxWidth)) {
      context.fillText(wrapped, x, cursorY);
      cursorY += lineHeight;
    }
  }
  return cursorY;
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius);
  } else {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius);
    context.lineTo(x + safeRadius, y + height);
    context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
    context.lineTo(x, y + safeRadius);
    context.arcTo(x, y, x + safeRadius, y, safeRadius);
    context.closePath();
  }
  context.fill();
  context.stroke();
};

/** Creates a shareable raster report without taking the diagram through a server. */
export async function downloadAnalysisReportImage({
  imageDataUri,
  filename,
  format,
  title,
  report,
  copy,
  locale,
  currency,
}: ReportImageOptions): Promise<void> {
  const image = new Image();
  image.decoding = 'async';
  image.src = imageDataUri;
  await image.decode();

  const width = 1600;
  const padding = 64;
  const contentWidth = width - padding * 2;
  const diagramMaxHeight = 680;
  const diagramScale = Math.min(
    contentWidth / Math.max(image.naturalWidth, 1),
    diagramMaxHeight / Math.max(image.naturalHeight, 1),
  );
  const diagramWidth = Math.max(1, Math.round(image.naturalWidth * diagramScale));
  const diagramHeight = Math.max(1, Math.round(image.naturalHeight * diagramScale));

  const formulaLines = [
    `${copy.cycleFormulaLabel} = ${report.formula}`,
    report.theoreticalFormula
      ? `${copy.theoreticalFormulaLabel} = ${report.theoreticalFormula}`
      : '',
    report.costFormula ? `${copy.costFormulaLabel} = ${report.costFormula}` : '',
  ].filter(Boolean);
  if (report.littleLaw) {
    formulaLines.push(
      `${copy.scenarioFormula}: ${formatNumber(report.littleLaw.workInProcess, '', copy.emptyValue)} = ${formatNumber(report.littleLaw.arrivalRatePerHour, '', copy.emptyValue)}/h × ${formatNumber(report.littleLaw.cycleTimeHours, ' h', copy.emptyValue)}`,
    );
  }
  if (report.queue) {
    formulaLines.push(
      `${copy.queueModel} ${report.queue.model}: ${report.queue.formula}`,
      `${copy.queueUtilization}: ${formatNumber(report.queue.utilization == null ? null : report.queue.utilization * 100, '%', copy.emptyValue)}`,
      `${copy.averageQueue}: ${formatNumber(report.queue.averageQueueLength, '', copy.emptyValue)}`,
      `${copy.averageWait}: ${formatNumber(report.queue.averageWaitingHours, ' h', copy.emptyValue)}`,
      `${copy.averageSystem}: ${formatNumber(report.queue.averageSystemHours, ' h', copy.emptyValue)}`,
    );
  }
  if (report.criticalPath) {
    formulaLines.push(
      report.criticalPath.status === 'ready'
        ? `${copy.criticalPath}: ${report.criticalPath.taskLabels.join(' → ') || copy.noActivities} (${report.criticalPath.formula} ${copy.minutes})`
        : `${copy.criticalPath}: ${report.criticalPath.reason === 'missing-processing-time' ? copy.criticalPathNeedsProcessing : copy.criticalPathUnavailable}`,
    );
  }
  const assumptions = report.assumptions
    .slice(0, 4)
    .map((item) => localizeAnalysisMessage(item, locale));
  const warnings = report.warnings
    .slice(0, 4)
    .map((item) => localizeAnalysisMessage(item, locale));
  const formulaLineCount = formulaLines.reduce((total, line) => {
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return total + 1;
    probe.font = '400 20px ui-monospace, SFMono-Regular, Menlo, monospace';
    return total + wrapText(probe, line, contentWidth - 48).length;
  }, 0);
  const listLineCount = [...assumptions, ...warnings].reduce((total, line) => {
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return total + 1;
    probe.font = '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    return total + wrapText(probe, `• ${line}`, (contentWidth - 48) / 2).length;
  }, 0);
  const height = Math.max(
    1120,
    padding + 92 + diagramHeight + 170 + formulaLineCount * 32 + listLineCount * 32,
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported by this browser.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#17202a';
  context.font = '700 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(title, padding, 72);
  context.fillStyle = '#65717d';
  context.font = '400 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(`${copy.subtitle} / ${copy.workspace}`, padding, 102);

  const diagramX = Math.round((width - diagramWidth) / 2);
  const diagramY = 136;
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

  const metricsTop = diagramY + diagramHeight + 54;
  const metricGap = 16;
  const metricWidth = (contentWidth - metricGap * 3) / 4;
  const metrics: Array<[string, string]> = [
    [
      copy.cycleTime,
      formatNumber(report.cycleTimeMinutes, ` ${copy.minutes}`, copy.emptyValue),
    ],
    [
      copy.theoreticalTime,
      formatNumber(
        report.theoreticalCycleTimeMinutes,
        ` ${copy.minutes}`,
        copy.emptyValue,
      ),
    ],
    [
      copy.cte,
      formatNumber(
        report.cycleTimeEfficiency == null ? null : report.cycleTimeEfficiency * 100,
        '%',
        copy.emptyValue,
      ),
    ],
    [
      copy.cost,
      report.costPerExecution == null
        ? copy.emptyValue
        : `${currency ? `${currency} ` : ''}${formatNumber(report.costPerExecution, '', copy.emptyValue)}`,
    ],
  ];
  metrics.forEach(([label, value], index) => {
    const x = padding + index * (metricWidth + metricGap);
    context.fillStyle = '#f3f5f7';
    context.strokeStyle = '#d8dee5';
    drawRoundedRect(context, x, metricsTop, metricWidth, 92, 12);
    context.fillStyle = '#65717d';
    context.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(label.toUpperCase(), x + 18, metricsTop + 30);
    context.fillStyle = '#17202a';
    context.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(value, x + 18, metricsTop + 66);
  });

  const formulaTop = metricsTop + 126;
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
  context.font = '700 21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(copy.formula, padding + 22, formulaTop + 32);
  drawLines(
    context,
    formulaLines.map((line) => ({ text: line, color: '#17202a' })),
    padding + 22,
    formulaTop + 68,
    contentWidth - 44,
    32,
  );

  const notesTop = formulaTop + formulaLineCount * 32 + 86;
  const columnWidth = (contentWidth - 24) / 2;
  const drawNoteColumn = (
    x: number,
    heading: string,
    values: string[],
    color: string,
  ) => {
    context.fillStyle = '#17202a';
    context.font = '700 21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(heading, x, notesTop);
    drawLines(
      context,
      values.length
        ? values.map((value) => ({ text: `• ${value}`, color }))
        : [{ text: copy.noWarnings, color: '#65717d' }],
      x,
      notesTop + 36,
      columnWidth,
      32,
    );
  };
  drawNoteColumn(padding, copy.assumptions, assumptions, '#46525e');
  drawNoteColumn(padding + columnWidth + 24, copy.warnings, warnings, '#a87300');

  context.fillStyle = '#65717d';
  context.font = '400 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText('Flowculus', padding, height - 28);

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  downloadDataUriFile(filename, canvas.toDataURL(mimeType, 0.92));
}
