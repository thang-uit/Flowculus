import type { ProcessModel, ProcessContainer } from '@flowculus/process-model';
import {
  createXmlElement as el,
  getXmlAttribute as attr,
  setXmlAttribute,
} from '@flowculus/xml-tree';
import {
  readDrawioCells,
  getGraphRoot,
  findGeometryElement,
  computeAbsoluteOrigins,
  type DrawioPage,
} from './document';
const stripMarkup = (value: string) => value.replace(/<[^>]*>/g, '').trim();
export function readDrawioContainers(
  page: DrawioPage,
  model: ProcessModel,
): ProcessModel {
  const cells = readDrawioCells(page);
  const origins = computeAbsoluteOrigins(cells);
  const containers: Record<string, ProcessContainer> = {};
  const ids = new Map<string, string>();
  for (const cell of cells) {
    const id = attr(cell.owner, 'flowculus-container-id');
    const kind = attr(cell.owner, 'flowculus-container-kind');
    if (!id || (kind !== 'pool' && kind !== 'lane') || !cell.geometry) continue;
    ids.set(cell.id, id);
    const position = origins.get(cell.id) ?? { x: 0, y: 0 };
    containers[id] = {
      id,
      label: stripMarkup(cell.label ?? id) || id,
      kind,
      parentId: cell.parent,
      orientation:
        attr(cell.owner, 'flowculus-orientation') === 'vertical'
          ? 'vertical'
          : 'horizontal',
      bounds: { ...position, width: cell.geometry.width, height: cell.geometry.height },
      blackBox: attr(cell.owner, 'flowculus-black-box') === 'true',
      processId: attr(cell.owner, 'flowculus-process-id'),
    };
  }
  if (!Object.keys(containers).length) return model;
  for (const container of Object.values(containers))
    container.parentId =
      container.kind === 'lane' ? ids.get(container.parentId ?? '') : undefined;
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const nodes = Object.fromEntries(
    Object.entries(model.nodes).map(([id, node]) => {
      const parent = byId.get(node.drawioCellId ?? id)?.parent;
      const container = parent ? containers[ids.get(parent) ?? ''] : undefined;
      return [
        id,
        {
          ...node,
          poolId: container?.kind === 'pool' ? container.id : container?.parentId,
          laneId: container?.kind === 'lane' ? container.id : undefined,
        },
      ];
    }),
  );
  const metadata = { ...model.metadata };
  const unmodelled =
    Number(metadata['flowculus-container-count'] ?? 0) - Object.keys(containers).length;
  if (unmodelled > 0) metadata['flowculus-container-count'] = unmodelled;
  else delete metadata['flowculus-container-count'];
  return { ...model, schemaVersion: 2, containers, nodes, metadata };
}
export function patchDrawioContainers(page: DrawioPage, model: ProcessModel): void {
  const root = getGraphRoot(page);
  const before = readDrawioCells(page);
  const cellsByContainer = new Map(
    before.flatMap((cell) => {
      const id = attr(cell.owner, 'flowculus-container-id');
      return id ? [[id, cell] as const] : [];
    }),
  );
  for (const [id, cell] of cellsByContainer)
    if (!model.containers?.[id])
      root.children = root.children.filter(
        (child) => child !== cell.owner && child !== cell.cell,
      );
  const actualIds = new Map(
    Object.values(model.containers ?? {}).map((container) => [
      container.id,
      cellsByContainer.get(container.id)?.id ?? `fc-container-${container.id}`,
    ]),
  );
  for (const container of Object.values(model.containers ?? {})) {
    const original = cellsByContainer.get(container.id);
    const cell =
      original?.cell ?? el('mxCell', { id: actualIds.get(container.id), vertex: '1' });
    const owner = original?.owner ?? cell;
    const parent = container.parentId
      ? model.containers?.[container.parentId]
      : undefined;
    setXmlAttribute(cell, 'parent', parent ? actualIds.get(parent.id) : '1');
    setXmlAttribute(cell, 'value', container.label);
    setXmlAttribute(
      cell,
      'style',
      `swimlane;html=0;startSize=36;horizontal=${container.orientation === 'horizontal' ? 0 : 1};fillColor=none;`,
    );
    for (const [key, value] of Object.entries({
      'flowculus-container-id': container.id,
      'flowculus-container-kind': container.kind,
      'flowculus-orientation': container.orientation,
      'flowculus-process-id': container.processId,
      'flowculus-black-box': container.blackBox ? 'true' : undefined,
    }))
      setXmlAttribute(owner, key, value);
    let geometry = findGeometryElement(cell);
    if (!geometry) {
      geometry = el('mxGeometry', { as: 'geometry' });
      cell.children.push(geometry);
    }
    for (const [key, value] of Object.entries({
      ...container.bounds,
      x: container.bounds.x - (parent?.bounds.x ?? 0),
      y: container.bounds.y - (parent?.bounds.y ?? 0),
    }))
      setXmlAttribute(geometry, key, value);
    if (!original) root.children.push(cell);
  }
  const current = readDrawioCells(page);
  for (const node of Object.values(model.nodes)) {
    const cell = current.find((cell) => cell.id === (node.drawioCellId ?? node.id));
    if (!cell || !node.bounds) continue;
    const parent = model.containers?.[node.laneId ?? node.poolId ?? ''];
    if (!parent && !cellsByContainer.size) continue;
    setXmlAttribute(cell.cell, 'parent', parent ? actualIds.get(parent.id) : '1');
    const geometry = findGeometryElement(cell.cell);
    if (geometry) {
      setXmlAttribute(geometry, 'x', node.bounds.x - (parent?.bounds.x ?? 0));
      setXmlAttribute(geometry, 'y', node.bounds.y - (parent?.bounds.y ?? 0));
    }
  }
}
