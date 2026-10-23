import { layoutLayeredGraph } from '@flowculus/graph-layout';
import {
  DEFAULT_NODE_SIZE,
  isSequenceFlowEdge,
  type ProcessModel,
} from '@flowculus/process-model';

/**
 * Gives every node without `bounds` a deterministic position. Models that
 * already carry geometry (draw.io, Flowculus JSON) are returned untouched
 * unless `force` is set, so a user's layout is never rearranged silently.
 */
export const withAutoLayout = (
  model: ProcessModel,
  options: { force?: boolean } = {},
): ProcessModel => {
  const nodes = Object.values(model.nodes);
  if (nodes.length === 0) return model;
  if (!options.force && nodes.every((node) => node.bounds != null)) return model;

  const sizes = new Map(
    nodes.map((node) => [
      node.id,
      node.bounds
        ? { width: node.bounds.width, height: node.bounds.height }
        : DEFAULT_NODE_SIZE[node.kind],
    ]),
  );
  const flowNodes = nodes.filter(
    (node) => node.kind !== 'annotation' && node.kind !== 'data',
  );
  const layout = layoutLayeredGraph(
    flowNodes.map((node) => ({
      id: node.id,
      ...(sizes.get(node.id) ?? DEFAULT_NODE_SIZE.task),
    })),
    Object.values(model.edges)
      .filter(isSequenceFlowEdge)
      .map((edge) => ({ source: edge.source, target: edge.target })),
    {
      startIds: nodes.filter((node) => node.kind === 'start').map((node) => node.id),
    },
  );

  const placed = new Map(layout.positions);
  const bottom = Math.max(
    0,
    ...flowNodes.map((node) => {
      const position = placed.get(node.id);
      const size = sizes.get(node.id);
      return position && size ? position.y + size.height : 0;
    }),
  );
  // Artifacts (data objects, annotations) are parked on a row under the flow.
  nodes
    .filter((node) => !placed.has(node.id))
    .forEach((node, index) =>
      placed.set(node.id, { x: 40 + index * 200, y: bottom + 72 }),
    );

  return {
    ...model,
    nodes: Object.fromEntries(
      nodes.map((node) => {
        if (node.bounds && !options.force) return [node.id, node];
        const position = placed.get(node.id) ?? { x: 40, y: 40 };
        const size = sizes.get(node.id) ?? DEFAULT_NODE_SIZE[node.kind];
        return [node.id, { ...node, bounds: { ...position, ...size } }];
      }),
    ),
  };
};
