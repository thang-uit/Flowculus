import {
  createXmlElement,
  findFirstElement,
  getChildElements,
  getDocumentRoot,
  getXmlAttribute,
  getXmlTextContent,
  parseXml,
  type XmlDocument,
  type XmlElement,
} from '@flowculus/xml-tree';

/** Upper bound for an inflated page; protects the tab from zip-bomb style input. */
export const MAX_INFLATED_PAGE_BYTES = 50 * 1024 * 1024;

export interface DrawioPage {
  id: string;
  name: string;
  /** The `<diagram>` element inside the file tree. */
  diagram: XmlElement;
  /** The page graph. For compressed pages this is an inflated, detached copy. */
  graphModel: XmlElement;
  wasCompressed: boolean;
  /** Set when a page could not be decoded; it is kept verbatim on export. */
  readError?: string;
}

export interface DrawioFile {
  document: XmlDocument;
  pages: DrawioPage[];
}

export interface DrawioGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  relative: boolean;
}

/** One `mxCell`, unwrapped from an optional `<object>`/`<UserObject>` owner. */
export interface DrawioCellRecord {
  id: string;
  /** The element that carries the id and custom attributes (owner or cell). */
  owner: XmlElement;
  cell: XmlElement;
  /** Parent element in `<root>` (the owner when wrapped). */
  container: XmlElement;
  isVertex: boolean;
  isEdge: boolean;
  parent?: string;
  source?: string;
  target?: string;
  label?: string;
  style: string;
  attributes: Record<string, string>;
  geometry?: DrawioGeometry;
}

const decodeBase64 = (value: string): Uint8Array => {
  const normalized = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const base64 = padding ? `${normalized}${'='.repeat(4 - padding)}` : normalized;
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const inflate = async (
  bytes: Uint8Array,
  format: 'deflate-raw' | 'deflate',
): Promise<string> => {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream(format));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_INFLATED_PAGE_BYTES) {
      await reader.cancel();
      throw new Error('Compressed draw.io page exceeds the import limit.');
    }
    chunks.push(result.value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return new TextDecoder().decode(output);
};

/**
 * draw.io compresses a page as base64(deflateRaw(encodeURIComponent(xml))).
 * Older files skip the URI encoding, so decoding is attempted but optional.
 */
export const inflateDrawioPage = async (encoded: string): Promise<string> => {
  const bytes = decodeBase64(encoded.trim());
  let text: string;
  try {
    text = await inflate(bytes, 'deflate-raw');
  } catch {
    text = await inflate(bytes, 'deflate');
  }
  if (!text.includes('%')) return text;
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

const MX_GRAPH_MODEL_ATTRIBUTES = {
  dx: '1422',
  dy: '794',
  grid: '1',
  gridSize: '10',
  guides: '1',
  tooltips: '1',
  connect: '1',
  arrows: '1',
  fold: '1',
  page: '1',
  pageScale: '1',
  pageWidth: '1600',
  pageHeight: '900',
  math: '0',
  shadow: '0',
};

export const createEmptyGraphModel = (): XmlElement =>
  createXmlElement('mxGraphModel', MX_GRAPH_MODEL_ATTRIBUTES, [
    createXmlElement('root', {}, [
      createXmlElement('mxCell', { id: '0' }),
      createXmlElement('mxCell', { id: '1', parent: '0' }),
    ]),
  ]);

const readPage = async (diagram: XmlElement, index: number): Promise<DrawioPage> => {
  const id = getXmlAttribute(diagram, 'id') ?? `page-${index + 1}`;
  const name = getXmlAttribute(diagram, 'name') ?? `Page-${index + 1}`;
  const inlineModel = getChildElements(diagram, 'mxGraphModel')[0];
  if (inlineModel)
    return { id, name, diagram, graphModel: inlineModel, wasCompressed: false };
  const encoded = getXmlTextContent(diagram).trim();
  if (!encoded) {
    return {
      id,
      name,
      diagram,
      graphModel: createEmptyGraphModel(),
      wasCompressed: false,
    };
  }
  try {
    const inflated = await inflateDrawioPage(encoded);
    const graphModel = getDocumentRoot(parseXml(inflated));
    if (graphModel.name !== 'mxGraphModel') {
      throw new Error('The compressed draw.io page does not contain an mxGraphModel.');
    }
    return { id, name, diagram, graphModel, wasCompressed: true };
  } catch (error) {
    // Another page may still be perfectly usable; only fail when this one is opened.
    return {
      id,
      name,
      diagram,
      graphModel: createEmptyGraphModel(),
      wasCompressed: false,
      readError: error instanceof Error ? error.message : 'Unreadable page',
    };
  }
};

/**
 * Reads an `.drawio` / diagrams.net XML file (single or multi-page, plain or
 * compressed, or a bare `<mxGraphModel>`). The returned tree is mutable and is
 * the basis for semantic-preserving patch-on-export.
 */
export const parseDrawioFile = async (xml: string): Promise<DrawioFile> => {
  let document = parseXml(xml);
  let root = getDocumentRoot(document);
  if (root.name === 'mxGraphModel') {
    const diagram = createXmlElement('diagram', { id: 'page-1', name: 'Page-1' }, [root]);
    document = {
      children: [
        createXmlElement('mxfile', { host: 'Flowculus', type: 'device' }, [diagram]),
      ],
    };
    root = getDocumentRoot(document);
  }
  if (root.name !== 'mxfile') {
    throw new Error('This XML file is not a draw.io diagram.');
  }
  const diagrams = getChildElements(root, 'diagram');
  if (diagrams.length === 0) throw new Error('The draw.io file has no pages.');
  const pages = await Promise.all(diagrams.map(readPage));
  return { document, pages };
};

export const getGraphRoot = (page: DrawioPage): XmlElement => {
  const root = getChildElements(page.graphModel, 'root')[0];
  if (root) return root;
  const created = createXmlElement('root');
  page.graphModel.children.push(created);
  return created;
};

const STRUCTURAL_ATTRIBUTES = new Set([
  'id',
  'parent',
  'source',
  'target',
  'value',
  'label',
  'style',
  'vertex',
  'edge',
  'connectable',
  'placeholders',
  'as',
]);

const readNumber = (element: XmlElement, name: string): number => {
  const value = Number(getXmlAttribute(element, name) ?? '0');
  return Number.isFinite(value) ? value : 0;
};

const readGeometry = (cell: XmlElement): DrawioGeometry | undefined => {
  const geometry = getChildElements(cell, 'mxGeometry')[0];
  if (!geometry) return undefined;
  return {
    x: readNumber(geometry, 'x'),
    y: readNumber(geometry, 'y'),
    width: readNumber(geometry, 'width'),
    height: readNumber(geometry, 'height'),
    relative: getXmlAttribute(geometry, 'relative') === '1',
  };
};

/** Lists the cells of a page in document order, unwrapping object owners. */
export const readDrawioCells = (page: DrawioPage): DrawioCellRecord[] => {
  const records: DrawioCellRecord[] = [];
  for (const container of getChildElements(getGraphRoot(page))) {
    const isOwner = container.name !== 'mxCell';
    const cell = isOwner ? getChildElements(container, 'mxCell')[0] : container;
    if (!cell) continue;
    const id = getXmlAttribute(container, 'id') ?? getXmlAttribute(cell, 'id');
    if (!id) continue;
    const attributes: Record<string, string> = {};
    for (const element of isOwner ? [cell, container] : [cell]) {
      for (const attribute of element.attributes) {
        if (!STRUCTURAL_ATTRIBUTES.has(attribute.name)) {
          attributes[attribute.name] = attribute.value;
        }
      }
    }
    records.push({
      id,
      owner: container,
      cell,
      container,
      isVertex: getXmlAttribute(cell, 'vertex') === '1',
      isEdge: getXmlAttribute(cell, 'edge') === '1',
      parent: getXmlAttribute(cell, 'parent') ?? getXmlAttribute(container, 'parent'),
      source: getXmlAttribute(cell, 'source'),
      target: getXmlAttribute(cell, 'target'),
      label: isOwner
        ? (getXmlAttribute(container, 'label') ?? getXmlAttribute(cell, 'value'))
        : getXmlAttribute(cell, 'value'),
      style: getXmlAttribute(cell, 'style') ?? '',
      attributes,
      geometry: readGeometry(cell),
    });
  }
  return records;
};

/**
 * Absolute top-left offset for children of each vertex. draw.io stores a
 * child's geometry relative to its container (groups, swimlanes, expanded
 * sub-processes), while Flowculus keeps absolute canvas coordinates.
 */
export const computeAbsoluteOrigins = (
  cells: DrawioCellRecord[],
): Map<string, { x: number; y: number }> => {
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const origins = new Map<string, { x: number; y: number }>();
  const resolve = (id: string | undefined, depth: number): { x: number; y: number } => {
    if (!id || depth > 64) return { x: 0, y: 0 };
    const cached = origins.get(id);
    if (cached) return cached;
    const cell = byId.get(id);
    if (!cell || !cell.isVertex || !cell.geometry || cell.geometry.relative) {
      return { x: 0, y: 0 };
    }
    const parentOrigin = resolve(cell.parent, depth + 1);
    const origin = {
      x: parentOrigin.x + cell.geometry.x,
      y: parentOrigin.y + cell.geometry.y,
    };
    origins.set(id, origin);
    return origin;
  };
  cells.forEach((cell) => resolve(cell.id, 0));
  return origins;
};

export const getParentOrigin = (
  cell: DrawioCellRecord,
  origins: Map<string, { x: number; y: number }>,
): { x: number; y: number } =>
  cell.parent ? (origins.get(cell.parent) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };

export const findDefaultLayerId = (cells: DrawioCellRecord[]): string => {
  const layer = cells.find(
    (cell) => cell.parent === '0' && !cell.isVertex && !cell.isEdge,
  );
  return layer?.id ?? '1';
};

export const findGeometryElement = (cell: XmlElement): XmlElement | undefined =>
  findFirstElement(cell, 'mxGeometry');
