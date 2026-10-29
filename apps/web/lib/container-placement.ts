import { getNodeBounds, nodePoolId, type ProcessModel } from '@flowculus/process-model';
import type { Point } from '@flowculus/graph-layout';
import { addLane } from './collaboration-editing';
import { createElementId } from './model-editing';
import { orderedLanes } from './lane-arrangement';
import { reorderLane } from './container-gestures';
import type { ContainerTool } from './shape-tools';

export const DEFAULT_POOL_SIZE = { width: 800, height: 360 };

/** Palette drops use canvas coordinates. Unlike the manager, they never wrap distant work. */
export function insertContainerAt(
  model: ProcessModel,
  tool: ContainerTool,
  label: string,
  point: Point,
  poolLabel: string,
  preferredPoolId?: string,
): { model: ProcessModel; nodeId: string } | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (tool === 'lane') {
    const pools = Object.values(model.containers ?? {}).filter(
      (item) => item.kind === 'pool' && !item.blackBox,
    );
    const pool =
      pools.find((item) => item.id === preferredPoolId) ??
      pools.find(
        ({ bounds: b }) =>
          point.x >= b.x &&
          point.x <= b.x + b.width &&
          point.y >= b.y &&
          point.y <= b.y + b.height,
      );
    if (!pool) {
      const created = insertContainerAt(model, 'pool', poolLabel, point, poolLabel);
      return created
        ? insertContainerAt(
            created.model,
            'lane',
            label,
            point,
            poolLabel,
            created.nodeId,
          )
        : null;
    }
    const before = new Set(Object.keys(model.containers ?? {}));
    const next = addLane(model, pool.id, label);
    const expanded = next.containers![pool.id].bounds;
    if (
      pools.some(
        (other) =>
          other.id !== pool.id &&
          expanded.x < other.bounds.x + other.bounds.width &&
          expanded.x + expanded.width > other.bounds.x &&
          expanded.y < other.bounds.y + other.bounds.height &&
          expanded.y + expanded.height > other.bounds.y,
      )
    )
      return null;
    const id = Object.keys(next.containers ?? {}).find((key) => !before.has(key));
    if (!id) return null;
    const horizontal = pool.orientation === 'horizontal';
    const siblings = orderedLanes(model, pool.id);
    const coordinate = horizontal ? point.y : point.x;
    const index = siblings.filter(
      (lane) =>
        coordinate >
        (horizontal
          ? lane.bounds.y + lane.bounds.height / 2
          : lane.bounds.x + lane.bounds.width / 2),
    ).length;
    return { model: reorderLane(next, id, index), nodeId: id };
  }
  const id = createElementId('pool', {
    ...model.nodes,
    ...model.edges,
    ...model.containers,
  });
  const bounds = {
    x: point.x - DEFAULT_POOL_SIZE.width / 2,
    y: point.y - DEFAULT_POOL_SIZE.height / 2,
    ...DEFAULT_POOL_SIZE,
  };
  if (
    Object.values(model.containers ?? {}).some(
      (item) =>
        item.kind === 'pool' &&
        bounds.x < item.bounds.x + item.bounds.width &&
        bounds.x + bounds.width > item.bounds.x &&
        bounds.y < item.bounds.y + item.bounds.height &&
        bounds.y + bounds.height > item.bounds.y,
    )
  )
    return null;
  const nodes = Object.fromEntries(
    Object.entries(model.nodes).map(([key, node]) => {
      const rect = getNodeBounds(node);
      const enclosed =
        !nodePoolId(model, node) &&
        rect.x >= bounds.x + 36 &&
        rect.y >= bounds.y &&
        rect.x + rect.width <= bounds.x + bounds.width &&
        rect.y + rect.height <= bounds.y + bounds.height;
      return [key, enclosed ? { ...node, poolId: id } : node];
    }),
  );
  if (
    Object.values(model.edges).some(
      (edge) =>
        (edge.kind == null || edge.kind === 'sequence') &&
        nodes[edge.source]?.poolId !== nodes[edge.target]?.poolId,
    )
  )
    return null;
  return {
    nodeId: id,
    model: {
      ...model,
      schemaVersion: 2,
      nodes,
      containers: {
        ...model.containers,
        [id]: {
          id,
          kind: 'pool',
          label,
          processId: `process_${id}`,
          orientation: 'horizontal',
          bounds,
        },
      },
    },
  };
}
