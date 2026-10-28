import type { ProcessModel, ProcessNode } from './process-types';

export const processPools = (model: ProcessModel) =>
  Object.values(model.containers ?? {}).filter((container) => container.kind === 'pool');

export const nodePoolId = (model: ProcessModel, node: ProcessNode): string | undefined =>
  node.poolId ?? (node.laneId ? model.containers?.[node.laneId]?.parentId : undefined);

/** Explicit process scope; message flows never become control-flow edges. */
export const scopeProcessModel = (
  model: ProcessModel,
  poolId?: string,
): ProcessModel | null => {
  const pools = processPools(model).filter((pool) => !pool.blackBox);
  if (!pools.length) return poolId ? null : model;
  const selected = poolId
    ? pools.find((pool) => pool.id === poolId)
    : pools.length === 1
      ? pools[0]
      : undefined;
  if (
    !selected ||
    Object.values(model.nodes).some(
      (node) =>
        !nodePoolId(model, node) && node.kind !== 'data' && node.kind !== 'annotation',
    )
  )
    return null;
  const nodes = Object.fromEntries(
    Object.entries(model.nodes).filter(
      ([, node]) => nodePoolId(model, node) === selected.id,
    ),
  );
  return {
    ...model,
    name: selected.label,
    edges: Object.fromEntries(
      Object.entries(model.edges).filter(
        ([, edge]) => nodes[edge.source] && nodes[edge.target] && edge.kind !== 'message',
      ),
    ),
    containers: undefined,
    nodes: Object.fromEntries(
      Object.entries(nodes).map(([id, node]) => [
        id,
        { ...node, poolId: undefined, laneId: undefined },
      ]),
    ),
  };
};
