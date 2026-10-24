import {
  DEFAULT_NODE_SIZE,
  SEMANTIC_METADATA_KEYS,
  type ProcessEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';
import {
  createXmlElement,
  getChildElements,
  getXmlAttribute,
  serializeXml,
  setXmlAttribute,
  type XmlElement,
} from '@flowculus/xml-tree';

import {
  findDefaultLayerId,
  findGeometryElement,
  getGraphRoot,
  parseDrawioFile,
  readDrawioCells,
  type DrawioCellRecord,
  type DrawioPage,
} from './document';
import { classifyDrawioPage } from './import';
import { formatFlowLabel, getStyleValue, parseFlowLabel, stripMarkup } from './semantics';
import { drawioStyleForEdge, drawioStyleForNode } from './styles';

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const formatCoordinate = (value: number): string => String(Math.round(value * 100) / 100);

const createBlankDrawio = (model: ProcessModel): string => {
  const pageId = String(model.metadata?.pageId ?? model.id);
  const escape = (value: string) =>
    value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<mxfile host="Flowculus" agent="Flowculus" type="device"><diagram id="${escape(pageId)}" name="${escape(model.name || 'Page-1')}"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" math="0" shadow="0"><root><mxCell id="0" /><mxCell id="1" parent="0" /></root></mxGraphModel></diagram></mxfile>`;
};

const isTrue = (value: unknown): boolean => value === true || value === 'true';

/** Writes the semantic bridge attributes; empty values remove stale ones. */
const writeNodeMetadata = (owner: XmlElement, node: ProcessNode): void => {
  const inferredKind = isTrue(node.metadata?.[SEMANTIC_METADATA_KEYS.inferredKind]);
  const inferredGateway = isTrue(
    node.metadata?.[SEMANTIC_METADATA_KEYS.inferredGatewayKind],
  );
  const joinId = node.metadata?.[SEMANTIC_METADATA_KEYS.joinId];
  if (!inferredKind) setXmlAttribute(owner, 'flowculus-kind', node.kind);
  setXmlAttribute(
    owner,
    'flowculus-gateway-kind',
    node.kind === 'gateway' && !inferredGateway ? node.gatewayKind : undefined,
  );
  setXmlAttribute(owner, 'flowculus-duration-minutes', node.durationMinutes);
  setXmlAttribute(owner, 'flowculus-processing-minutes', node.processingMinutes);
  setXmlAttribute(owner, 'flowculus-waiting-minutes', node.waitingMinutes);
  setXmlAttribute(owner, 'flowculus-rework-probability', node.reworkProbability);
  setXmlAttribute(
    owner,
    'flowculus-resource-rate-per-hour',
    node.cost?.resourceRatePerHour,
  );
  setXmlAttribute(
    owner,
    'flowculus-other-cost-per-execution',
    node.cost?.otherCostPerExecution,
  );
  setXmlAttribute(owner, 'flowculus-resource-pool-id', node.cost?.resourcePoolId);
  setXmlAttribute(owner, 'flowculus-resource-count', node.cost?.resourceCount);
  setXmlAttribute(owner, 'flowculus-currency', node.cost?.currency);
  setXmlAttribute(
    owner,
    SEMANTIC_METADATA_KEYS.joinId,
    node.kind === 'gateway' && typeof joinId === 'string' && joinId ? joinId : undefined,
  );
};

/**
 * Only confirmed semantics are written as explicit Flowculus attributes, so a
 * guess never turns into a "fact" by round-tripping through a file.
 */
const writeEdgeMetadata = (owner: XmlElement, edge: ProcessEdge): void => {
  const inferredKind = isTrue(edge.metadata?.[SEMANTIC_METADATA_KEYS.inferredEdgeKind]);
  const inferredProbability = isTrue(
    edge.metadata?.[SEMANTIC_METADATA_KEYS.inferredProbability],
  );
  setXmlAttribute(
    owner,
    'flowculus-kind',
    inferredKind ? undefined : (edge.kind ?? 'sequence'),
  );
  setXmlAttribute(
    owner,
    'flowculus-probability',
    inferredProbability ? undefined : edge.probability,
  );
  setXmlAttribute(owner, 'flowculus-condition', edge.condition?.trim() || undefined);
  setXmlAttribute(owner, 'flowculus-rework-probability', edge.reworkProbability);
};

/**
 * draw.io keeps custom attributes on an `<object>` owner. A bare `<mxCell>` is
 * converted to that form in place, which diagrams.net reads natively.
 */
const ensureOwner = (root: XmlElement, record: DrawioCellRecord): XmlElement => {
  if (record.owner.name !== 'mxCell') return record.owner;
  const index = root.children.indexOf(record.container);
  const value = getXmlAttribute(record.cell, 'value') ?? '';
  setXmlAttribute(record.cell, 'id', undefined);
  setXmlAttribute(record.cell, 'value', undefined);
  const owner = createXmlElement('object', { label: value, id: record.id }, [
    record.cell,
  ]);
  if (index >= 0) root.children[index] = owner;
  record.owner = owner;
  record.container = owner;
  return owner;
};

const ensureGeometry = (cell: XmlElement, relative: boolean): XmlElement => {
  const geometry = findGeometryElement(cell);
  if (geometry) return geometry;
  const created = createXmlElement(
    'mxGeometry',
    relative ? { relative: '1', as: 'geometry' } : { as: 'geometry' },
  );
  cell.children.push(created);
  return created;
};

const setOwnerLabel = (record: DrawioCellRecord, label: string): void => {
  const html = getStyleValue(record.style, 'html') === '1';
  setXmlAttribute(record.owner, 'label', html ? escapeHtml(label) : label);
  if (record.owner === record.cell)
    setXmlAttribute(record.cell, 'value', html ? escapeHtml(label) : label);
};

const createNodeElement = (
  id: string,
  node: ProcessNode,
  layerId: string,
  fallbackIndex: number,
): XmlElement => {
  const size = DEFAULT_NODE_SIZE[node.kind];
  const bounds = node.bounds ?? {
    x: 40 + (fallbackIndex % 6) * 220,
    y: 40 + Math.floor(fallbackIndex / 6) * 160,
    ...size,
  };
  const owner = createXmlElement('object', { label: escapeHtml(node.label), id }, [
    createXmlElement(
      'mxCell',
      { style: drawioStyleForNode(node), vertex: '1', parent: layerId },
      [
        createXmlElement('mxGeometry', {
          x: formatCoordinate(bounds.x),
          y: formatCoordinate(bounds.y),
          width: formatCoordinate(bounds.width),
          height: formatCoordinate(bounds.height),
          as: 'geometry',
        }),
      ],
    ),
  ]);
  writeNodeMetadata(owner, node);
  return owner;
};

const createEdgeElement = (
  id: string,
  edge: ProcessEdge,
  sourceId: string,
  targetId: string,
  layerId: string,
): XmlElement => {
  const owner = createXmlElement(
    'object',
    { label: escapeHtml(formatFlowLabel(edge)), id },
    [
      createXmlElement(
        'mxCell',
        {
          style: drawioStyleForEdge(edge),
          edge: '1',
          parent: layerId,
          source: sourceId,
          target: targetId,
        },
        [createXmlElement('mxGeometry', { relative: '1', as: 'geometry' })],
      ),
    ],
  );
  writeEdgeMetadata(owner, edge);
  return owner;
};

const boundsEqual = (
  left: ProcessNode['bounds'],
  right: ProcessNode['bounds'],
): boolean =>
  left != null &&
  right != null &&
  Math.abs(left.x - right.x) < 0.01 &&
  Math.abs(left.y - right.y) < 0.01 &&
  Math.abs(left.width - right.width) < 0.01 &&
  Math.abs(left.height - right.height) < 0.01;

const patchPage = (page: DrawioPage, model: ProcessModel): void => {
  const root = getGraphRoot(page);
  const cells = readDrawioCells(page);
  const cellsById = new Map(cells.map((cell) => [cell.id, cell]));
  const classification = classifyDrawioPage(page);
  const layerId = findDefaultLayerId(cells);
  const originalNodeIds = new Set(classification.nodeCells.map((cell) => cell.id));
  const originalEdgeIds = new Set(classification.edgeCells.map((cell) => cell.id));
  const originalBounds = new Map<string, ProcessNode['bounds']>();
  classification.nodeCells.forEach((cell) => {
    const origin = classification.origins.get(cell.id);
    if (origin && cell.geometry) {
      originalBounds.set(cell.id, {
        x: origin.x,
        y: origin.y,
        width: cell.geometry.width,
        height: cell.geometry.height,
      });
    }
  });

  const keptNodeCellIds = new Set(
    Object.values(model.nodes).map((node) => node.drawioCellId ?? node.id),
  );
  const keptEdgeCellIds = new Set(
    Object.values(model.edges).map((edge) => edge.drawioCellId ?? edge.id),
  );
  const removedIds = new Set<string>();
  originalNodeIds.forEach((id) => {
    if (!keptNodeCellIds.has(id)) removedIds.add(id);
  });
  originalEdgeIds.forEach((id) => {
    if (!keptEdgeCellIds.has(id)) removedIds.add(id);
  });
  cells.forEach((cell) => {
    // Label children of removed edges go with their edge.
    if (cell.parent && removedIds.has(cell.parent) && originalEdgeIds.has(cell.parent)) {
      removedIds.add(cell.id);
    }
  });
  if (removedIds.size > 0) {
    root.children = root.children.filter((child) => {
      if (child.kind !== 'element') return true;
      const id =
        getXmlAttribute(child, 'id') ??
        (getChildElements(child, 'mxCell')[0]
          ? getXmlAttribute(getChildElements(child, 'mxCell')[0], 'id')
          : undefined);
      return !id || !removedIds.has(id);
    });
  }

  const usedIds = new Set(
    cells.map((cell) => cell.id).filter((id) => !removedIds.has(id)),
  );
  const reserveId = (preferred: string): string => {
    if (!usedIds.has(preferred)) {
      usedIds.add(preferred);
      return preferred;
    }
    let suffix = 2;
    while (usedIds.has(`${preferred}-${suffix}`)) suffix += 1;
    const id = `${preferred}-${suffix}`;
    usedIds.add(id);
    return id;
  };

  const cellIdByNodeId = new Map<string, string>();
  const movedNodeIds = new Set<string>();
  Object.values(model.nodes).forEach((node, index) => {
    const preferredId = node.drawioCellId ?? node.id;
    const existing = originalNodeIds.has(preferredId)
      ? cellsById.get(preferredId)
      : undefined;
    if (!existing) {
      const id = reserveId(preferredId);
      cellIdByNodeId.set(node.id, id);
      root.children.push(createNodeElement(id, node, layerId, index));
      return;
    }
    cellIdByNodeId.set(node.id, existing.id);
    const owner = ensureOwner(root, existing);
    if (node.bounds) {
      if (!boundsEqual(node.bounds, originalBounds.get(existing.id))) {
        movedNodeIds.add(node.id);
        const parentOrigin =
          existing.parent != null
            ? (classification.origins.get(existing.parent) ?? { x: 0, y: 0 })
            : { x: 0, y: 0 };
        const geometry = ensureGeometry(existing.cell, false);
        setXmlAttribute(geometry, 'x', formatCoordinate(node.bounds.x - parentOrigin.x));
        setXmlAttribute(geometry, 'y', formatCoordinate(node.bounds.y - parentOrigin.y));
        setXmlAttribute(geometry, 'width', formatCoordinate(node.bounds.width));
        setXmlAttribute(geometry, 'height', formatCoordinate(node.bounds.height));
      }
    }
    const originalLabel = stripMarkup(existing.label ?? '');
    // An unlabeled shape is imported with its id as label; keep it unlabeled.
    const fallbackLabel = !originalLabel && node.label === existing.id;
    if (!fallbackLabel && originalLabel !== node.label.trim()) {
      setOwnerLabel(existing, node.label);
    }
    writeNodeMetadata(owner, node);
  });

  const labelChildren = new Map<string, DrawioCellRecord>();
  cells.forEach((cell) => {
    if (cell.isVertex && cell.parent && originalEdgeIds.has(cell.parent)) {
      if (!labelChildren.has(cell.parent)) labelChildren.set(cell.parent, cell);
    }
  });

  Object.values(model.edges).forEach((edge) => {
    const sourceId = cellIdByNodeId.get(edge.source);
    const targetId = cellIdByNodeId.get(edge.target);
    if (!sourceId || !targetId) return;
    const preferredId = edge.drawioCellId ?? edge.id;
    const existing = originalEdgeIds.has(preferredId)
      ? cellsById.get(preferredId)
      : undefined;
    if (!existing) {
      root.children.push(
        createEdgeElement(reserveId(preferredId), edge, sourceId, targetId, layerId),
      );
      return;
    }
    const owner = ensureOwner(root, existing);
    const endpointsChanged = existing.source !== sourceId || existing.target !== targetId;
    setXmlAttribute(existing.cell, 'source', sourceId);
    setXmlAttribute(existing.cell, 'target', targetId);
    if (
      endpointsChanged ||
      movedNodeIds.has(edge.source) ||
      movedNodeIds.has(edge.target)
    ) {
      // Manual waypoints were drawn for the old geometry; let draw.io re-route.
      const geometry = findGeometryElement(existing.cell);
      if (geometry) {
        geometry.children = geometry.children.filter(
          (child) =>
            child.kind !== 'element' || getXmlAttribute(child, 'as') !== 'points',
        );
      }
    }
    const labelChild = labelChildren.get(existing.id);
    const original = parseFlowLabel(labelChild?.label ?? existing.label);
    const labelChanged =
      (original.condition ?? '') !== (edge.condition?.trim() ?? '') ||
      (original.probability != null &&
        edge.probability != null &&
        Math.abs(original.probability - edge.probability) > 1e-9) ||
      (original.probability == null) !== (edge.probability == null);
    if (labelChanged) {
      const nextLabel = formatFlowLabel(edge);
      if (labelChild) {
        const childOwner = ensureOwner(root, labelChild);
        setXmlAttribute(childOwner, 'label', escapeHtml(nextLabel) || ' ');
      } else {
        setOwnerLabel(existing, nextLabel);
      }
    }
    writeEdgeMetadata(owner, edge);
  });

  if (page.wasCompressed) {
    page.diagram.children = [page.graphModel];
    page.wasCompressed = false;
  }
};

/**
 * Serialises the model as a `.drawio` file that opens in diagrams.net with the
 * same coordinates. With `sourceXml`, the original file is patched in place
 * (semantic-preserving, not byte-for-byte):
 * - unknown cells, styles, libraries, labels and other pages are kept;
 * - waypoints are kept unless an endpoint moved or was reconnected;
 * - only the process elements the user deleted in Flowculus are removed;
 * - the edited page is written uncompressed; untouched pages keep their
 *   original (possibly compressed) encoding. diagrams.net reads both.
 */
export const exportDrawioXml = async (
  model: ProcessModel,
  sourceXml?: string | null,
): Promise<string> => {
  const file = await parseDrawioFile(
    sourceXml?.trim() ? sourceXml : createBlankDrawio(model),
  );
  const pageId = model.metadata?.pageId;
  const page = file.pages.find((candidate) => candidate.id === pageId) ?? file.pages[0];
  if (page.readError) throw new Error(`draw.io page "${page.name}" could not be read.`);
  patchPage(page, model);
  return serializeXml(file.document);
};
