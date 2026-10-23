import type { AnalysisReport } from '@flowculus/analysis-engine';
import {
  processModelToSvg,
  withAutoLayout,
  type ProcessSvg,
} from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';

const MAX_CANVAS_SIDE = 16_384;

/** True-vector SVG of the diagram with the critical chain highlighted. */
export const buildDiagramSvg = (
  model: ProcessModel,
  report: AnalysisReport,
): ProcessSvg => {
  const chain =
    report.criticalChain?.status === 'ready' ? report.criticalChain : undefined;
  return processModelToSvg(withAutoLayout(model), {
    highlightNodeIds: chain?.nodeIds,
    highlightEdgeIds: chain?.edgeIds,
  });
};

export const svgToDataUri = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Rasterises the exported SVG at a high pixel density (default 2.5×) for
 * PNG/JPEG downloads, clamped to the browser's maximum canvas size.
 */
export const rasterizeSvg = async (
  { svg, width, height }: ProcessSvg,
  format: 'png' | 'jpeg',
  scale = 2.5,
): Promise<string> => {
  const image = new Image();
  image.decoding = 'async';
  image.src = svgToDataUri(svg);
  await image.decode();
  const effectiveScale = Math.max(
    0.25,
    Math.min(
      scale,
      MAX_CANVAS_SIDE / Math.max(width, 1),
      MAX_CANVAS_SIDE / Math.max(height, 1),
    ),
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * effectiveScale);
  canvas.height = Math.round(height * effectiveScale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported by this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
};
