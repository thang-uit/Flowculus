import { activityTimeTerms } from '@flowculus/analysis-engine';
import {
  unionRects,
  type Point,
  type Rect,
  type RouteShapeHint,
} from '@flowculus/graph-layout';
import {
  BPMN_GATEWAY_MARKERS,
  getNodeBounds,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';
import { routeProcessEdge } from './edge-geometry';

export interface ProcessSvgOptions {
  /** Nodes and edges to stroke with the accent colour (for example the critical chain). */
  highlightNodeIds?: Iterable<string>;
  highlightEdgeIds?: Iterable<string>;
  /**
   * Both states keep BPMN solid strokes. Quality is exposed as SVG data and
   * must be named in the surrounding report or canvas legend.
   */
  highlightQuality?: 'exact' | 'assumption';
  /** Localized analysis legend, outside semantic geometry. */
  highlightLabel?: string;
  padding?: number;
  theme?: 'light' | 'dark';
}

export interface ProcessSvg {
  svg: string;
  width: number;
  height: number;
}

interface SvgPalette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
}

const PALETTES: Record<'light' | 'dark', SvgPalette> = {
  light: {
    background: '#ffffff',
    surface: '#ffffff',
    border: '#9aa6b2',
    text: '#17202a',
    muted: '#65717d',
    accent: '#d09a14',
    accentStrong: '#a87300',
    accentSoft: '#fff3c7',
  },
  dark: {
    background: '#15181b',
    surface: '#1b2024',
    border: '#5d6b78',
    text: '#edf1f4',
    muted: '#a4afb9',
    accent: '#e5b52f',
    accentStrong: '#f2c94c',
    accentSoft: '#46391a',
  },
};

const FONT = "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', Arial, sans-serif";

const escapeText = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const fixed = (value: number): string => String(Math.round(value * 100) / 100);

/** Compact duration label shared with the canvas chips (minutes in, `6m`/`2.5h`/`3d` out). */
export const formatCompactMinutes = (minutes: number): string => {
  if (!Number.isFinite(minutes)) return '–';
  if (Math.abs(minutes) < 60) return `${Number(minutes.toFixed(1))}m`;
  if (Math.abs(minutes) < 60 * 24) return `${Number((minutes / 60).toFixed(1))}h`;
  return `${Number((minutes / 1440).toFixed(1))}d`;
};

export const wrapLabel = (
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines = 3,
): string[] => {
  const maxCharacters = Math.max(4, Math.floor(maxWidth / (fontSize * 0.56)));
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word.length > maxCharacters ? `${word.slice(0, maxCharacters - 1)}…` : word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] =
      `${kept[maxLines - 1].slice(0, Math.max(1, maxCharacters - 1))}…`;
    return kept;
  }
  return lines;
};

const textBlock = (
  lines: string[],
  centre: Point,
  fontSize: number,
  fill: string,
  weight = 500,
): string => {
  const lineHeight = fontSize * 1.25;
  const firstY = centre.y - ((lines.length - 1) * lineHeight) / 2;
  return lines
    .map(
      (line, index) =>
        `<text x="${fixed(centre.x)}" y="${fixed(firstY + index * lineHeight)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeText(line)}</text>`,
    )
    .join('');
};

export const routeHintForNode = (node: ProcessNode | undefined): RouteShapeHint =>
  node?.kind === 'gateway'
    ? 'gateway'
    : node?.kind === 'start' || node?.kind === 'end' || node?.kind === 'event'
      ? 'event'
      : 'activity';

const taskDetail = (node: ProcessNode): string => {
  const parts = activityTimeTerms(node).map(
    (term) => `${term.symbol} ${formatCompactMinutes(term.minutes)}`,
  );
  if (node.reworkProbability != null && node.reworkProbability > 0)
    parts.push(`r ${Number((node.reworkProbability * 100).toFixed(1))}%`);
  return parts.join(' · ');
};

const gatewayGlyph = (node: ProcessNode, rect: Rect, colour: string): string => {
  const scale = Math.min(rect.width, rect.height) / 100;
  const x = rect.x + rect.width / 2 - 50 * scale;
  const y = rect.y + rect.height / 2 - 50 * scale;
  const elements = BPMN_GATEWAY_MARKERS[node.gatewayKind ?? 'xor']
    .map((element) => {
      switch (element.tag) {
        case 'path':
          return `<path d="${element.d}" stroke-width="${element.strokeWidth}" />`;
        case 'circle':
          return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" stroke-width="${element.strokeWidth}" />`;
        case 'polygon':
          return `<polygon points="${element.points}" stroke-width="${element.strokeWidth}" />`;
      }
    })
    .join('');
  return `<g transform="translate(${fixed(x)} ${fixed(y)}) scale(${fixed(scale)})" fill="none" stroke="${colour}" stroke-linecap="round" stroke-linejoin="round">${elements}</g>`;
};

/** Centred under the shape on a background chip, so a branch leaving the
 * bottom corner passes behind the text instead of through it. */
const captionBelow = (label: string, rect: Rect, palette: SvgPalette): string => {
  if (!label) return '';
  const lines = wrapLabel(label, Math.max(120, rect.width * 2.4), 11, 2);
  const cx = rect.x + rect.width / 2;
  const top = rect.y + rect.height + 4;
  const width = Math.max(...lines.map((line) => line.length)) * 11 * 0.56 + 10;
  const height = lines.length * 13.75 + 4;
  return `<rect x="${fixed(cx - width / 2)}" y="${fixed(top)}" width="${fixed(width)}" height="${fixed(height)}" rx="4" fill="${palette.background}" fill-opacity="0.9" />${textBlock(lines, { x: cx, y: top + height / 2 }, 11, palette.text)}`;
};

const renderNode = (
  node: ProcessNode,
  highlighted: boolean,
  palette: SvgPalette,
  estimated = false,
): string => {
  const rect = getNodeBounds(node);
  const quality = highlighted
    ? ` data-analysis-quality="${estimated ? 'assumption' : 'exact'}"`
    : '';
  const stroke = highlighted ? palette.accent : palette.border;
  const strokeWidth = highlighted ? 2.5 : 1.25;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  switch (node.kind) {
    case 'start':
    case 'end':
    case 'event': {
      const radius = Math.min(rect.width, rect.height) / 2;
      const ring =
        node.kind === 'event'
          ? `<circle cx="${fixed(cx)}" cy="${fixed(cy)}" r="${fixed(radius - 4)}" fill="none" stroke="${stroke}" stroke-width="1.25" />`
          : '';
      const fill = node.kind === 'start' ? palette.accentSoft : palette.surface;
      const width = node.kind === 'end' ? Math.max(3.5, strokeWidth) : strokeWidth + 0.5;
      return `<g><circle cx="${fixed(cx)}" cy="${fixed(cy)}" r="${fixed(radius)}" fill="${fill}" stroke="${node.kind === 'start' ? palette.accentStrong : stroke}" stroke-width="${fixed(width)}"${quality} />${ring}${captionBelow(node.label, rect, palette)}</g>`;
    }
    case 'gateway': {
      const points = [
        `${fixed(cx)},${fixed(rect.y)}`,
        `${fixed(rect.x + rect.width)},${fixed(cy)}`,
        `${fixed(cx)},${fixed(rect.y + rect.height)}`,
        `${fixed(rect.x)},${fixed(cy)}`,
      ].join(' ');
      return `<g><polygon points="${points}" fill="${palette.accentSoft}" stroke="${highlighted ? palette.accent : palette.accentStrong}" stroke-width="${fixed(strokeWidth + 0.25)}" stroke-linejoin="round"${quality} />${gatewayGlyph(node, rect, palette.accentStrong)}${captionBelow(node.label, rect, palette)}</g>`;
    }
    case 'data': {
      const fold = Math.min(14, rect.width * 0.3);
      const path = `M ${fixed(rect.x)} ${fixed(rect.y)} H ${fixed(rect.x + rect.width - fold)} L ${fixed(rect.x + rect.width)} ${fixed(rect.y + fold)} V ${fixed(rect.y + rect.height)} H ${fixed(rect.x)} Z M ${fixed(rect.x + rect.width - fold)} ${fixed(rect.y)} V ${fixed(rect.y + fold)} H ${fixed(rect.x + rect.width)}`;
      return `<g><path d="${path}" fill="${palette.surface}" stroke="${stroke}" stroke-width="${fixed(strokeWidth)}" stroke-linejoin="round" />${captionBelow(node.label, rect, palette)}</g>`;
    }
    case 'annotation': {
      const bracket = `M ${fixed(rect.x + 12)} ${fixed(rect.y)} H ${fixed(rect.x)} V ${fixed(rect.y + rect.height)} H ${fixed(rect.x + 12)}`;
      const lines = wrapLabel(node.label, rect.width - 16, 11, 4);
      const text = lines
        .map(
          (line, index) =>
            `<text x="${fixed(rect.x + 10)}" y="${fixed(rect.y + 16 + index * 14)}" font-family="${FONT}" font-size="11" fill="${palette.muted}">${escapeText(line)}</text>`,
        )
        .join('');
      return `<g><path d="${bracket}" fill="none" stroke="${palette.border}" stroke-width="1.25" />${text}</g>`;
    }
    default: {
      const detail =
        node.kind === 'task' || node.kind === 'subprocess' ? taskDetail(node) : '';
      const labelLines = wrapLabel(node.label, rect.width - 20, 13, detail ? 2 : 3);
      const labelCentre = { x: cx, y: detail ? cy - 8 : cy };
      const marker =
        node.kind === 'subprocess'
          ? `<rect x="${fixed(cx - 7)}" y="${fixed(rect.y + rect.height - 17)}" width="14" height="14" rx="2" fill="none" stroke="${stroke}" stroke-width="1.1" /><path d="M ${fixed(cx - 4)} ${fixed(rect.y + rect.height - 10)} H ${fixed(cx + 4)} M ${fixed(cx)} ${fixed(rect.y + rect.height - 14)} V ${fixed(rect.y + rect.height - 6)}" stroke="${stroke}" stroke-width="1.1" />`
          : '';
      return `<g><rect x="${fixed(rect.x)}" y="${fixed(rect.y)}" width="${fixed(rect.width)}" height="${fixed(rect.height)}" rx="10" fill="${palette.surface}" stroke="${stroke}" stroke-width="${fixed(strokeWidth)}"${quality} />${textBlock(labelLines, labelCentre, 13, palette.text, 600)}${detail ? textBlock([detail], { x: cx, y: rect.y + rect.height - (node.kind === 'subprocess' ? 26 : 16) }, 10.5, palette.muted) : ''}${marker}</g>`;
    }
  }
};

/** Every other shape is an obstacle for the edge's orthogonal route. */
export const obstaclesFor = (model: ProcessModel, edge: ProcessEdge): Rect[] =>
  Object.values(model.nodes)
    .filter((node) => node.id !== edge.source && node.id !== edge.target)
    .map(getNodeBounds);

const edgeLabel = (edge: ProcessEdge): string =>
  [
    edge.condition?.trim(),
    edge.probability == null ? undefined : `p = ${Number(edge.probability.toFixed(3))}`,
  ]
    .filter(Boolean)
    .join(' · ');

const renderEdge = (
  edge: ProcessEdge,
  model: ProcessModel,
  highlighted: boolean,
  palette: SvgPalette,
  dashed = false,
): string => {
  const source = model.nodes[edge.source];
  const target = model.nodes[edge.target];
  if (!source || !target) return '';
  const route = routeProcessEdge(
    edge,
    getNodeBounds(source),
    getNodeBounds(target),
    { source: routeHintForNode(source), target: routeHintForNode(target) },
    obstaclesFor(model, edge),
  );
  const colour = highlighted ? palette.accent : palette.muted;
  const dash =
    edge.kind === 'message'
      ? ' stroke-dasharray="8 4"'
      : edge.kind === 'association'
        ? ' stroke-dasharray="2 4"'
        : '';
  const marker =
    edge.kind === 'association'
      ? ''
      : ` marker-end="url(#${edge.kind === 'message' ? 'fc-open' : highlighted ? 'fc-arrow-accent' : 'fc-arrow'})"`;
  const origin = route.points[0];
  const startMarker =
    edge.kind === 'message'
      ? `<circle cx="${fixed(origin.x)}" cy="${fixed(origin.y)}" r="3" fill="${palette.surface}" stroke="${colour}" stroke-width="1.4" />`
      : '';
  const path = `<path d="${route.path}" fill="none" stroke="${colour}" stroke-width="${highlighted ? 2.5 : 1.4}" stroke-linejoin="round"${dash}${highlighted ? ` data-analysis-quality="${dashed ? 'assumption' : 'exact'}"` : ''}${marker} />${startMarker}`;
  const text = edgeLabel(edge);
  if (!text) return `<g>${path}</g>`;
  const width = text.length * 10.5 * 0.56 + 12;
  const label = `<rect x="${fixed(route.labelPoint.x - width / 2)}" y="${fixed(route.labelPoint.y - 9)}" width="${fixed(width)}" height="18" rx="9" fill="${palette.background}" stroke="${highlighted ? palette.accent : palette.border}" stroke-width="0.8" />${textBlock([text], route.labelPoint, 10.5, palette.text, 600)}`;
  return `<g>${path}${label}</g>`;
};

/**
 * Renders the process as a standalone, true-vector SVG from model geometry.
 * The same routing function is used by the interactive canvas, so the export
 * matches what the user sees without screenshotting the DOM.
 */
export const processModelToSvg = (
  model: ProcessModel,
  options: ProcessSvgOptions = {},
): ProcessSvg => {
  const palette = PALETTES[options.theme ?? 'light'];
  const padding = options.padding ?? 32;
  const highlightNodes = new Set(options.highlightNodeIds ?? []);
  const highlightEdges = new Set(options.highlightEdgeIds ?? []);
  const dashedHighlight = options.highlightQuality === 'assumption';
  const nodes = Object.values(model.nodes);
  const rects = nodes.map(getNodeBounds);
  const routes = Object.values(model.edges).flatMap((edge) => {
    const source = model.nodes[edge.source];
    const target = model.nodes[edge.target];
    if (!source || !target) return [];
    return routeProcessEdge(
      edge,
      getNodeBounds(source),
      getNodeBounds(target),
      { source: routeHintForNode(source), target: routeHintForNode(target) },
      obstaclesFor(model, edge),
    ).points.map((point) => ({ x: point.x, y: point.y, width: 1, height: 1 }));
  });
  // Labels under events/gateways extend below their shapes.
  const labelRects = nodes
    .filter((node) => ['start', 'end', 'event', 'gateway', 'data'].includes(node.kind))
    .map((node) => {
      const rect = getNodeBounds(node);
      const width = Math.max(120, rect.width * 2.4);
      return {
        x: rect.x + rect.width / 2 - width / 2,
        y: rect.y + rect.height,
        width,
        height: 36,
      };
    });
  const content = unionRects([...rects, ...routes, ...labelRects]) ?? {
    x: 0,
    y: 0,
    width: 320,
    height: 160,
  };
  const minX = content.x - padding;
  const showLegend =
    (highlightNodes.size > 0 || highlightEdges.size > 0) &&
    (options.highlightLabel || dashedHighlight);
  const legendHeight = showLegend ? 24 : 0;
  const minY = content.y - padding - legendHeight;
  const width = Math.ceil(content.width + padding * 2);
  const height = Math.ceil(content.height + padding * 2 + legendHeight);

  const defs = `<defs><marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.muted}" /></marker><marker id="fc-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.accent}" /></marker><marker id="fc-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="${palette.muted}" stroke-width="1.4" /></marker></defs>`;
  const edgesSvg = Object.values(model.edges)
    .map((edge) =>
      renderEdge(edge, model, highlightEdges.has(edge.id), palette, dashedHighlight),
    )
    .join('');
  const nodesSvg = nodes
    .map((node) =>
      renderNode(node, highlightNodes.has(node.id), palette, dashedHighlight),
    )
    .join('');
  const title = `<title>${escapeText(model.name)}</title>`;
  const legend = showLegend
    ? textBlock(
        [`${dashedHighlight ? '≈ ' : ''}${options.highlightLabel ?? ''}`.trim()],
        { x: content.x + content.width / 2, y: minY + 14 },
        11,
        palette.text,
        600,
      )
    : '';

  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${fixed(minX)} ${fixed(minY)} ${width} ${height}" role="img">${title}${defs}<rect x="${fixed(minX)}" y="${fixed(minY)}" width="${width}" height="${height}" fill="${palette.background}" />${legend}${edgesSvg}${nodesSvg}</svg>`,
  };
};
