import {
  scopeProcessModel,
  isSequenceFlowEdge,
  isFlowNodeKind,
  type ProcessModel,
} from '@flowculus/process-model';
import type { PetriConversion, PetriNet, PetriTransition } from './types';

/** Place per sequence flow; silent transitions implement routing, not business tasks. */
export function bpmnToPetri(model: ProcessModel, poolId?: string): PetriConversion {
  const scoped = scopeProcessModel(model, poolId);
  if (!scoped) return { status: 'unsupported', reason: 'scope' };
  const nodes = Object.values(scoped.nodes).filter((node) => isFlowNodeKind(node.kind));
  const edges = Object.values(scoped.edges).filter(isSequenceFlowEdge);
  if (nodes.length > 120 || edges.length > 220)
    return { status: 'unsupported', reason: 'limit' };
  if (
    nodes.filter((node) => node.kind === 'start').length !== 1 ||
    !nodes.some((node) => node.kind === 'end')
  )
    return { status: 'unsupported', reason: 'structure' };
  if (
    Object.values(model.edges).some(
      (edge) =>
        edge.kind === 'message' &&
        (scoped.nodes[edge.source] || scoped.nodes[edge.target]),
    ) ||
    nodes.some(
      (node) =>
        node.kind === 'unknown' ||
        node.metadata?.['flowculus-unsupported-shape'] != null ||
        (node.reworkProbability ?? 0) > 0 ||
        (node.kind === 'gateway' &&
          node.gatewayKind !== 'xor' &&
          node.gatewayKind !== 'and'),
    ) ||
    edges.some(
      (edge) =>
        edge.reworkProbability ||
        !scoped.nodes[edge.source] ||
        !scoped.nodes[edge.target],
    )
  )
    return { status: 'unsupported', reason: 'semantics' };
  const net: PetriNet = {
    id: `petri-${model.id}`,
    name: scoped.name,
    origin: 'bpmn',
    places: [
      { id: 'input', label: 'i' },
      { id: 'output', label: 'o' },
      ...edges.map((edge) => ({
        id: `flow:${edge.id}`,
        label: edge.id,
        sourceId: edge.id,
      })),
    ],
    transitions: [],
    initial: { input: 1 },
    final: { output: 1 },
  };
  for (const node of nodes) {
    const inputs = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => `flow:${edge.id}`);
    const outputs = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => `flow:${edge.id}`);
    if (node.kind === 'start') {
      if (inputs.length || outputs.length !== 1)
        return { status: 'unsupported', reason: 'structure' };
      inputs.push('input');
    } else if (node.kind === 'end') {
      if (!inputs.length || outputs.length)
        return { status: 'unsupported', reason: 'structure' };
      outputs.push('output');
    } else if (!inputs.length || !outputs.length)
      return { status: 'unsupported', reason: 'structure' };
    const task = node.kind === 'task' || node.kind === 'subprocess';
    if (task && (inputs.length !== 1 || outputs.length !== 1))
      return { status: 'unsupported', reason: 'structure' };
    if (node.kind === 'event' && (inputs.length !== 1 || outputs.length !== 1))
      return { status: 'unsupported', reason: 'structure' };
    if (node.kind === 'gateway' && inputs.length > 1 && outputs.length > 1)
      return { status: 'unsupported', reason: 'structure' };
    const variants: Array<Pick<PetriTransition, 'inputs' | 'outputs'>> =
      node.kind === 'gateway' && node.gatewayKind === 'and'
        ? [{ inputs, outputs }]
        : task
          ? [{ inputs, outputs }]
          : inputs.flatMap((input) =>
              outputs.map((output) => ({ inputs: [input], outputs: [output] })),
            );
    variants.forEach((variant, index) =>
      net.transitions.push({
        id: `node:${node.id}:${index}`,
        sourceId: node.id,
        label: task ? node.label : null,
        ...variant,
      }),
    );
  }
  return { status: 'ready', net };
}
