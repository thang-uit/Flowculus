import { getNodeBounds, nodePoolId, type ProcessModel } from '@flowculus/process-model';
import { containingFrame } from './container-membership';
import { createElementId } from './model-editing';

export function addPool(model: ProcessModel, label: string): ProcessModel {
  const containers = { ...model.containers };
  const id = createElementId('pool', { ...model.nodes, ...containers });
  const first = !Object.values(containers).some((item) => item.kind === 'pool');
  const rects = Object.values(model.nodes).map(getNodeBounds);
  const left = first && rects.length ? Math.min(...rects.map((rect) => rect.x)) - 80 : 0;
  const top =
    first && rects.length
      ? Math.min(...rects.map((rect) => rect.y)) - 60
      : Math.max(
          0,
          ...Object.values(containers).map(
            (item) => item.bounds.y + item.bounds.height + 80,
          ),
        );
  const right = Math.max(left + 1000, ...rects.map((rect) => rect.x + rect.width + 40));
  const bottom = Math.max(top + 360, ...rects.map((rect) => rect.y + rect.height + 40));
  containers[id] = {
    id,
    label,
    kind: 'pool',
    processId: `process_${id}`,
    orientation: 'horizontal',
    bounds: {
      x: left,
      y: top,
      width: first ? right - left : 1000,
      height: first ? bottom - top : 360,
    },
  };
  const nodes = first
    ? Object.fromEntries(
        Object.entries(model.nodes).map(([key, node]) => [key, { ...node, poolId: id }]),
      )
    : model.nodes;
  return { ...model, schemaVersion: 2, containers, nodes };
}
export function addLane(
  model: ProcessModel,
  poolId: string,
  label: string,
): ProcessModel {
  const pool = model.containers?.[poolId];
  if (!pool || pool.kind !== 'pool' || pool.blackBox) return model;
  const containers = { ...model.containers };
  const id = createElementId('lane', { ...model.nodes, ...containers });
  const lanes = Object.values(containers).filter((item) => item.parentId === poolId);
  const horizontal = pool.orientation === 'horizontal';
  const bounds = lanes.length
    ? {
        x: horizontal ? pool.bounds.x + 36 : pool.bounds.x + pool.bounds.width,
        y: horizontal ? pool.bounds.y + pool.bounds.height : pool.bounds.y + 36,
        width: horizontal ? pool.bounds.width - 36 : 400,
        height: horizontal ? 180 : pool.bounds.height - 36,
      }
    : {
        x: pool.bounds.x + (horizontal ? 36 : 0),
        y: pool.bounds.y + (horizontal ? 0 : 36),
        width: pool.bounds.width - (horizontal ? 36 : 0),
        height: pool.bounds.height - (horizontal ? 0 : 36),
      };
  containers[id] = {
    id,
    label,
    kind: 'lane',
    parentId: poolId,
    orientation: pool.orientation,
    bounds,
  };
  if (lanes.length)
    containers[poolId] = {
      ...pool,
      bounds: {
        ...pool.bounds,
        width: pool.bounds.width + (horizontal ? 0 : bounds.width),
        height: pool.bounds.height + (horizontal ? bounds.height : 0),
      },
    };
  const nodes = Object.fromEntries(
    Object.entries(model.nodes).map(([key, node]) => [
      key,
      nodePoolId(model, node) === poolId &&
      !node.laneId &&
      containingFrame({ ...model, containers }, getNodeBounds(node)).laneId === id
        ? { ...node, laneId: id }
        : node,
    ]),
  );
  return { ...model, schemaVersion: 2, containers, nodes };
}
/** Removing a frame always preserves work; memberships are cleared, never cascaded. */
export function removeContainer(model: ProcessModel, id: string): ProcessModel {
  const removed = new Set([
    id,
    ...Object.values(model.containers ?? {})
      .filter((item) => item.parentId === id)
      .map((item) => item.id),
  ]);
  return {
    ...model,
    containers: Object.fromEntries(
      Object.entries(model.containers ?? {}).filter(([key]) => !removed.has(key)),
    ),
    nodes: Object.fromEntries(
      Object.entries(model.nodes).map(([key, node]) => [
        key,
        {
          ...node,
          poolId: node.poolId && removed.has(node.poolId) ? undefined : node.poolId,
          laneId: node.laneId && removed.has(node.laneId) ? undefined : node.laneId,
        },
      ]),
    ),
  };
}
export { resizeContainer } from './container-resizing';

/** Commit absolute drag positions once; reject cross-pool sequence changes atomically. */
export function applyCollaborationPositions(
  model: ProcessModel,
  positions: Record<string, { x: number; y: number }>,
): ProcessModel | null {
  if (
    Object.values(positions).some(
      (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
    )
  )
    return null;
  if (
    !Object.entries(positions).some(([id, point]) => {
      const bounds =
        model.containers?.[id]?.bounds ??
        (model.nodes[id] ? getNodeBounds(model.nodes[id]) : undefined);
      return bounds && (bounds.x !== point.x || bounds.y !== point.y);
    })
  )
    return model;
  const containers = Object.fromEntries(
    Object.entries(model.containers ?? {}).map(([id, item]) => [
      id,
      { ...item, bounds: { ...item.bounds, ...positions[id] } },
    ]),
  );
  const pools = Object.values(containers).filter((item) => item.kind === 'pool');
  if (
    pools.some((a, index) =>
      pools
        .slice(index + 1)
        .some(
          (b) =>
            ((positions[a.id] &&
              (a.bounds.x !== model.containers![a.id].bounds.x ||
                a.bounds.y !== model.containers![a.id].bounds.y)) ||
              (positions[b.id] &&
                (b.bounds.x !== model.containers![b.id].bounds.x ||
                  b.bounds.y !== model.containers![b.id].bounds.y))) &&
            a.bounds.x < b.bounds.x + b.bounds.width &&
            a.bounds.x + a.bounds.width > b.bounds.x &&
            a.bounds.y < b.bounds.y + b.bounds.height &&
            a.bounds.y + a.bounds.height > b.bounds.y,
        ),
    )
  )
    return null;
  const nodes = Object.fromEntries(
    Object.entries(model.nodes).map(([id, node]) => {
      const point = positions[id];
      if (!point) return [id, node];
      const bounds = { ...getNodeBounds(node), ...point };
      const moved =
        !node.bounds || node.bounds.x !== point.x || node.bounds.y !== point.y;
      if (!moved) return [id, node];
      return [
        id,
        { ...node, bounds, ...containingFrame({ ...model, containers }, bounds, node) },
      ];
    }),
  );
  const scoped = { ...model, containers };
  for (const edge of Object.values(model.edges)) {
    const source = nodes[edge.source];
    const target = nodes[edge.target];
    if (!source || !target) continue;
    if (
      (edge.kind == null || edge.kind === 'sequence') &&
      nodePoolId(scoped, source) !== nodePoolId(scoped, target)
    )
      return null;
    if (
      Object.keys(containers).length &&
      edge.kind === 'message' &&
      (!nodePoolId(scoped, source) ||
        !nodePoolId(scoped, target) ||
        nodePoolId(scoped, source) === nodePoolId(scoped, target))
    )
      return null;
  }
  const edges = Object.fromEntries(
    Object.entries(model.edges).map(([id, edge]) => {
      const source = model.nodes[edge.source];
      const target = model.nodes[edge.target];
      if (!source?.bounds || !target?.bounds || !edge.routing) return [id, edge];
      const from = nodes[source.id].bounds!;
      const to = nodes[target.id].bounds!;
      const dx = from.x - source.bounds.x;
      const dy = from.y - source.bounds.y;
      return [
        id,
        dx === to.x - target.bounds.x && dy === to.y - target.bounds.y
          ? {
              ...edge,
              routing: {
                ...edge.routing,
                waypoints: edge.routing.waypoints.map((point) => ({
                  x: point.x + dx,
                  y: point.y + dy,
                })),
              },
            }
          : edge,
      ];
    }),
  );
  return {
    ...model,
    nodes,
    edges,
    ...(Object.keys(containers).length ? { containers } : {}),
  };
}

/** Move selected frames and their descendants once, including keyboard selection. */
export function nudgeCollaboration(
  model: ProcessModel,
  selectedIds: readonly string[],
  dx: number,
  dy: number,
): ProcessModel | null {
  const selected = new Set(selectedIds);
  const pools = new Set(
    selectedIds.filter((id) => model.containers?.[id]?.kind === 'pool'),
  );
  const positions: Record<string, { x: number; y: number }> = {};
  for (const container of Object.values(model.containers ?? {})) {
    if (pools.has(container.id) || pools.has(container.parentId ?? ''))
      positions[container.id] = {
        x: container.bounds.x + dx,
        y: container.bounds.y + dy,
      };
  }
  for (const node of Object.values(model.nodes)) {
    if (selected.has(node.id) || pools.has(nodePoolId(model, node) ?? '')) {
      const bounds = getNodeBounds(node);
      positions[node.id] = { x: bounds.x + dx, y: bounds.y + dy };
    }
  }
  return Object.keys(positions).length
    ? applyCollaborationPositions(model, positions)
    : model;
}

export { arrangeLanes } from './lane-arrangement';
