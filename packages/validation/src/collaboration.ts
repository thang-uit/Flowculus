import { nodePoolId, type ProcessModel } from '@flowculus/process-model';
import type { Diagnostic } from './diagnostics';

export function validateCollaboration(model: ProcessModel): Diagnostic[] {
  const findings: Diagnostic[] = [];
  const add = (code: Diagnostic['code'], path: string) =>
    findings.push({ code, path, severity: 'error', impact: 'invalid' });
  const containers = model.containers ?? {};
  for (const container of Object.values(containers)) {
    if (
      model.nodes[container.id] ||
      model.edges[container.id] ||
      (container.kind === 'lane' &&
        (!container.parentId ||
          containers[container.parentId]?.kind !== 'pool' ||
          containers[container.parentId]?.blackBox)) ||
      (container.kind === 'pool' && container.parentId)
    )
      add('invalid-container', `containers.${container.id}`);
  }
  const hasPools = Object.values(containers).some(
    (container) => container.kind === 'pool',
  );
  for (const node of Object.values(model.nodes)) {
    const pool = nodePoolId(model, node);
    if (
      (node.poolId && containers[node.poolId]?.kind !== 'pool') ||
      (node.laneId &&
        (containers[node.laneId]?.kind !== 'lane' ||
          (node.poolId && containers[node.laneId]?.parentId !== node.poolId))) ||
      (pool && containers[pool]?.blackBox)
    )
      add('invalid-membership', `nodes.${node.id}`);
  }
  for (const edge of Object.values(model.edges)) {
    const source = model.nodes[edge.source];
    const target = model.nodes[edge.target];
    if (!source || !target) continue;
    const from = nodePoolId(model, source);
    const to = nodePoolId(model, target);
    if ((edge.kind == null || edge.kind === 'sequence') && from !== to)
      add('cross-pool-sequence', `edges.${edge.id}`);
    if (
      edge.kind === 'message' &&
      hasPools &&
      (!from ||
        !to ||
        from === to ||
        source.kind === 'gateway' ||
        target.kind === 'gateway')
    )
      add('invalid-message-flow', `edges.${edge.id}`);
  }
  return findings;
}
