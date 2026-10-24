import { SEMANTIC_METADATA_KEYS, type ProcessModel } from '@flowculus/process-model';

import {
  computeAbsoluteOrigins,
  parseDrawioFile,
  readDrawioCells,
  type DrawioCellRecord,
  type DrawioFile,
  type DrawioPage,
} from './document';
import {
  cellToProcessEdge,
  cellToProcessNode,
  getCellMetadata,
  isPresentationOnlyNode,
  isStructuralContainer,
  stripMarkup,
} from './semantics';

export interface DrawioPageSummary {
  id: string;
  name: string;
}

export interface ImportedDrawioDiagram {
  model: ProcessModel;
  pages: DrawioPageSummary[];
  pageIndex: number;
}

interface PageClassification {
  cellsById: Map<string, DrawioCellRecord>;
  /** Pools, lanes and groups: kept in the file, not modelled. */
  containerCount: number;
  nodeCells: DrawioCellRecord[];
  edgeCells: DrawioCellRecord[];
  edgeLabels: Map<string, string>;
  origins: Map<string, { x: number; y: number }>;
}

/**
 * Splits a page into process nodes, sequence/message edges and everything
 * else. "Everything else" (pools, lanes, groups, legends, images) stays in the
 * XML untouched; it simply does not enter the analysis graph.
 */
export const classifyDrawioPage = (page: DrawioPage): PageClassification => {
  const cells = readDrawioCells(page);
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const edgeLabels = new Map<string, string>();
  const edgeCells = cells.filter((cell) => cell.isEdge);
  const incidentNodeIds = new Set<string>();
  edgeCells.forEach((cell) => {
    if (cell.source) incidentNodeIds.add(cell.source);
    if (cell.target) incidentNodeIds.add(cell.target);
  });

  const nodeCells = cells.filter((cell) => {
    if (!cell.isVertex) return false;
    const parent = cell.parent ? byId.get(cell.parent) : undefined;
    if (parent?.isEdge) {
      const text = stripMarkup(cell.label ?? '');
      if (text && !edgeLabels.has(parent.id)) edgeLabels.set(parent.id, text);
      return false;
    }
    if (isStructuralContainer(cell)) return false;
    return !isPresentationOnlyNode(cell, getCellMetadata(cell), incidentNodeIds);
  });
  const nodeIds = new Set(nodeCells.map((cell) => cell.id));

  return {
    cellsById: byId,
    containerCount: cells.filter((cell) => cell.isVertex && isStructuralContainer(cell))
      .length,
    nodeCells,
    edgeCells: edgeCells.filter(
      (cell) =>
        cell.source != null &&
        cell.target != null &&
        nodeIds.has(cell.source) &&
        nodeIds.has(cell.target),
    ),
    edgeLabels,
    origins: computeAbsoluteOrigins(cells),
  };
};

export const drawioPageToProcessModel = (
  page: DrawioPage,
  fallbackName: string,
): ProcessModel => {
  const { nodeCells, edgeCells, edgeLabels, origins, cellsById, containerCount } =
    classifyDrawioPage(page);
  const nodes: ProcessModel['nodes'] = {};
  const edges: ProcessModel['edges'] = {};

  nodeCells.forEach((cell) => {
    const origin = origins.get(cell.id);
    const geometry = cell.geometry;
    const bounds =
      origin && geometry && geometry.width > 0 && geometry.height > 0
        ? {
            x: Math.round(origin.x * 100) / 100,
            y: Math.round(origin.y * 100) / 100,
            width: geometry.width,
            height: geometry.height,
          }
        : undefined;
    nodes[cell.id] = cellToProcessNode(
      cell,
      bounds,
      cell.parent ? cellsById.get(cell.parent) : undefined,
    );
  });

  edgeCells.forEach((cell) => {
    const edge = cellToProcessEdge(cell, edgeLabels.get(cell.id));
    if (edge) edges[edge.id] = edge;
  });

  return {
    schemaVersion: 1,
    id: `drawio-${page.id}`,
    name: page.name || fallbackName,
    nodes,
    edges,
    metadata: {
      source: 'drawio',
      pageId: page.id,
      ...(containerCount > 0
        ? { [SEMANTIC_METADATA_KEYS.containerCount]: containerCount }
        : {}),
    },
  };
};

export const summarizeDrawioPages = (file: DrawioFile): DrawioPageSummary[] =>
  file.pages.map((page) => ({ id: page.id, name: page.name }));

/**
 * Imports one page of a draw.io file. Geometry becomes absolute `bounds`;
 * shapes, gateway types, flow types and label probabilities without explicit
 * Flowculus metadata are flagged as inferred, so analysis reports them as
 * assumptions and export/share stays blocked until a person confirms them.
 * Pools, lanes, groups, legends and unknown cells stay in the file untouched.
 */
export const importDrawioXml = async (
  xml: string,
  options: { pageIndex?: number; fallbackName?: string } = {},
): Promise<ImportedDrawioDiagram> => {
  const file = await parseDrawioFile(xml);
  const pageIndex = Math.min(Math.max(options.pageIndex ?? 0, 0), file.pages.length - 1);
  const page = file.pages[pageIndex];
  if (page.readError)
    throw new Error(`draw.io page "${page.name}" could not be read: ${page.readError}`);
  return {
    model: drawioPageToProcessModel(page, options.fallbackName ?? 'Imported diagram'),
    pages: summarizeDrawioPages(file),
    pageIndex,
  };
};
