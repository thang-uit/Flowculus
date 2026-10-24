import type {
  GatewayKind,
  ProcessEdge,
  ProcessModel,
  ProcessNode,
} from '@flowculus/process-model';

/** Compact builders for engine tests: `flow('a>b', 0.4)` style models. */
export const startEvent = (id = 'start'): ProcessNode => ({
  id,
  label: id,
  kind: 'start',
});

export const endEvent = (id = 'end'): ProcessNode => ({ id, label: id, kind: 'end' });

export const task = (
  id: string,
  minutes: number,
  patch: Partial<ProcessNode> = {},
): ProcessNode => ({
  id,
  label: id,
  kind: 'task',
  processingMinutes: minutes,
  cost: { resourceRatePerHour: 60 },
  ...patch,
});

export const gateway = (
  id: string,
  gatewayKind: GatewayKind,
  patch: Partial<ProcessNode> = {},
): ProcessNode => ({ id, label: id, kind: 'gateway', gatewayKind, ...patch });

/** `link('a', 'b', 0.4)` creates the sequence flow a → b with p = 0.4. */
export const link = (
  source: string,
  target: string,
  probability?: number,
): ProcessEdge => ({
  id: `${source}>${target}`,
  source,
  target,
  ...(probability == null ? {} : { probability }),
});

export const buildModel = (nodes: ProcessNode[], edges: ProcessEdge[]): ProcessModel => ({
  schemaVersion: 1,
  id: 'fixture',
  name: 'Fixture',
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  edges: Object.fromEntries(edges.map((edge) => [edge.id, edge])),
});
