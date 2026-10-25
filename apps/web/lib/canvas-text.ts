export interface ReportLine {
  text: string;
  color?: string;
  weight?: string;
}

export const REPORT_FONT =
  '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", Arial, sans-serif';

export const wrapText = (
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

export const drawLines = (
  context: CanvasRenderingContext2D,
  lines: ReportLine[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number => {
  let cursorY = y;
  for (const line of lines) {
    context.font = `${line.weight ?? '400'} 22px ${REPORT_FONT}`;
    context.fillStyle = line.color ?? '#46525e';
    for (const wrapped of wrapText(context, line.text, maxWidth)) {
      context.fillText(wrapped, x, cursorY);
      cursorY += lineHeight;
    }
  }
  return cursorY;
};

export const drawRoundedRect = (
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
