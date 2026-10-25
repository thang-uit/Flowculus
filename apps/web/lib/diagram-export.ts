import type { AnalysisReport } from '@flowculus/analysis-engine';
import {
  processModelToSvg,
  withAutoLayout,
  type ProcessSvg,
} from '@flowculus/file-formats';
import { getWorkspaceCopy, type Locale } from '@/lib/i18n';
import type { ProcessModel } from '@flowculus/process-model';

const MAX_CANVAS_SIDE = 8_192;
const MAX_CANVAS_PIXELS = 8_000_000;

/** Bound both dimensions and total bitmap memory, including wide diagrams. */
export const rasterExportSize = (width: number, height: number, scale: number) => {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(scale) ||
    width <= 0 ||
    height <= 0 ||
    scale <= 0
  ) {
    throw new Error('Invalid diagram dimensions for image export.');
  }
  const effectiveScale = Math.min(
    scale,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  );
  if (effectiveScale < 0.25)
    throw new Error('Diagram is too large for a readable bitmap export. Use SVG.');
  return {
    width: Math.max(1, Math.floor(width * effectiveScale)),
    height: Math.max(1, Math.floor(height * effectiveScale)),
  };
};

/**
 * True-vector SVG with solid BPMN outlines. Quality metadata identifies
 * estimated highlights; surrounding reports explain their assumptions.
 * No chain is highlighted when simulation is required.
 */
export const buildDiagramSvg = (
  model: ProcessModel,
  report: AnalysisReport | null,
  locale: Locale = 'en',
): ProcessSvg => {
  const chain =
    report?.criticalChain?.status === 'ready' ? report.criticalChain : undefined;
  return processModelToSvg(withAutoLayout(model), {
    highlightLabel: chain
      ? chain.quality === 'exact'
        ? getWorkspaceCopy(locale).quality.legendExact
        : getWorkspaceCopy(locale).quality.legendEstimate
      : undefined,
    highlightNodeIds: chain?.nodeIds,
    highlightEdgeIds: chain?.edgeIds,
    highlightQuality: chain?.quality === 'exact' ? 'exact' : 'assumption',
  });
};

export const svgToDataUri = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Rasterises the exported SVG at a high pixel density (default 2.5×) for
 * PNG/JPEG downloads, bounded by both canvas dimensions and pixel count.
 */
export const rasterizeSvg = async (
  { svg, width, height }: ProcessSvg,
  format: 'png' | 'jpeg',
  scale = 2.5,
): Promise<string> => {
  const size = rasterExportSize(width, height, scale);
  const image = new Image();
  image.decoding = 'async';
  image.src = svgToDataUri(svg);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported by this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
};
