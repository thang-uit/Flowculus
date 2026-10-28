import {
  getNodeBounds,
  type ProcessModel,
  type ProcessContainer,
} from '@flowculus/process-model';

export const orderedLanes = (model: ProcessModel, poolId: string) => {
  const pool = model.containers?.[poolId];
  return Object.values(model.containers ?? {})
    .filter((item) => item.kind === 'lane' && item.parentId === poolId)
    .sort((a, b) =>
      pool?.orientation === 'horizontal'
        ? a.bounds.y - b.bounds.y
        : a.bounds.x - b.bounds.x,
    );
};

export function arrangeLanes(
  model: ProcessModel,
  poolId: string,
  order: string[],
  orientation: 'horizontal' | 'vertical',
): ProcessModel {
  const pool = model.containers?.[poolId];
  if (!pool || pool.kind !== 'pool') return model;
  const lanes = order
    .map((id) => model.containers?.[id])
    .filter((item): item is ProcessContainer => !!item && item.parentId === poolId);
  if (!lanes.length)
    return {
      ...model,
      containers: { ...model.containers, [poolId]: { ...pool, orientation } },
    };
  const horizontal = orientation === 'horizontal';
  const laneSize = horizontal ? 180 : 420;
  const width = horizontal
    ? Math.max(pool.bounds.width, 800)
    : Math.max(pool.bounds.width, lanes.length * laneSize);
  const height = horizontal
    ? Math.max(pool.bounds.height, lanes.length * laneSize)
    : Math.max(pool.bounds.height, 400);
  const containers = {
    ...model.containers,
    [poolId]: { ...pool, orientation, bounds: { ...pool.bounds, width, height } },
  };
  const nodes = { ...model.nodes };
  const delta = new Map<string, { x: number; y: number }>();
  lanes.forEach((lane, index) => {
    const bounds = {
      x: pool.bounds.x + (horizontal ? 36 : (index * width) / lanes.length),
      y: pool.bounds.y + (horizontal ? (index * height) / lanes.length : 36),
      width: horizontal ? width - 36 : width / lanes.length,
      height: horizontal ? height / lanes.length : height - 36,
    };
    containers[lane.id] = { ...lane, orientation, bounds };
    for (const node of Object.values(model.nodes).filter(
      (node) => node.laneId === lane.id,
    )) {
      const previous = getNodeBounds(node);
      const x = Math.max(
        bounds.x + 40,
        Math.min(
          bounds.x + bounds.width - previous.width - 16,
          previous.x - lane.bounds.x + bounds.x,
        ),
      );
      const y = Math.max(
        bounds.y + 40,
        Math.min(
          bounds.y + bounds.height - previous.height - 16,
          previous.y - lane.bounds.y + bounds.y,
        ),
      );
      nodes[node.id] = { ...node, bounds: { ...previous, x, y } };
      delta.set(node.id, { x: x - previous.x, y: y - previous.y });
    }
  });
  const edges = Object.fromEntries(
    Object.entries(model.edges).map(([id, edge]) => {
      const a = delta.get(edge.source);
      const b = delta.get(edge.target);
      return [
        id,
        a && b && a.x === b.x && a.y === b.y && edge.routing
          ? {
              ...edge,
              routing: {
                ...edge.routing,
                waypoints: edge.routing.waypoints.map((point) => ({
                  x: point.x + a.x,
                  y: point.y + a.y,
                })),
              },
            }
          : edge,
      ];
    }),
  );
  return { ...model, containers, nodes, edges };
}
