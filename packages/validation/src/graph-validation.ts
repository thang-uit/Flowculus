import {
  SEMANTIC_METADATA_KEYS,
  isActivityKind,
  isFlowNodeKind,
  isSequenceFlowEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

import { nodeParams, type Diagnostic } from './diagnostics';
import {
  buildSequenceGraph,
  canReach,
  getIncoming,
  getOutgoing,
  getTerminalNodeIds,
  reachableFrom,
  resolveProcessEntry,
  type ProcessEntry,
  type SequenceGraph,
} from './graph';
import { validateBranchProbabilities } from './model-validation';
import { collectUnconfirmedSemantics } from './semantic-confirmation';

export interface GraphValidationResult {
  diagnostics: Diagnostic[];
  graph: SequenceGraph;
  entry: ProcessEntry;
}

const nodePath = (node: ProcessNode) => `nodes.${node.id}`;

const validateEntryAndExit = (
  model: ProcessModel,
  graph: SequenceGraph,
  entry: ProcessEntry,
  diagnostics: Diagnostic[],
): void => {
  if (entry.explicitStartIds.length > 1) {
    diagnostics.push({
      code: 'multiple-start-events',
      severity: 'warning',
      impact: 'simulation-required',
      params: { count: entry.explicitStartIds.length },
    });
  } else if (entry.startNodeId == null) {
    diagnostics.push({
      code: 'missing-start',
      severity: 'error',
      impact: 'invalid',
    });
  } else if (entry.implicit) {
    const node = model.nodes[entry.startNodeId];
    diagnostics.push({
      code: 'implicit-start',
      severity: 'warning',
      impact: 'assumption',
      path: nodePath(node),
      params: nodeParams(node),
    });
  }

  const ends = graph.nodeIds.filter((id) => model.nodes[id]?.kind === 'end');
  if (ends.length > 1) {
    diagnostics.push({
      code: 'multiple-end-events',
      severity: 'info',
      impact: 'none',
      params: { count: ends.length },
    });
  }
  for (const id of getTerminalNodeIds(graph)) {
    const node = model.nodes[id];
    if (!node || node.kind === 'end') continue;
    if (getIncoming(graph, id).length === 0 && id !== entry.startNodeId) continue;
    if (graph.nodeIds.length === 1) continue;
    diagnostics.push({
      code: 'implicit-end',
      severity: 'warning',
      impact: 'assumption',
      path: nodePath(node),
      params: nodeParams(node),
    });
  }
};

const validateEdges = (model: ProcessModel, diagnostics: Diagnostic[]): void => {
  for (const edge of Object.values(model.edges)) {
    const source = model.nodes[edge.source];
    const target = model.nodes[edge.target];
    if (!source || !target) continue;
    const params = {
      edgeId: edge.id,
      source: source.label,
      target: target.label,
    };
    const path = `edges.${edge.id}`;
    if (edge.kind === 'unknown') {
      diagnostics.push({
        code: 'unknown-edge-kind',
        severity: 'warning',
        impact: 'assumption',
        path,
        params,
      });
      continue;
    }
    if (isSequenceFlowEdge(edge)) {
      if (!isFlowNodeKind(source.kind) || !isFlowNodeKind(target.kind)) {
        diagnostics.push({
          code: 'sequence-flow-artifact-endpoint',
          severity: 'error',
          impact: 'invalid',
          path,
          params,
        });
        continue;
      }
      if (target.kind === 'start') {
        diagnostics.push({
          code: 'sequence-flow-into-start',
          severity: 'error',
          impact: 'invalid',
          path,
          params,
        });
      }
      if (source.kind === 'end') {
        diagnostics.push({
          code: 'sequence-flow-from-end',
          severity: 'error',
          impact: 'invalid',
          path,
          params,
        });
      }
      if (edge.source === edge.target) {
        diagnostics.push({
          code: 'self-loop-sequence-flow',
          severity: 'warning',
          impact: 'simulation-required',
          path,
          params,
        });
      }
      if ((edge.reworkProbability ?? 0) > 0) {
        diagnostics.push({
          code: 'edge-rework-unsupported',
          severity: 'warning',
          impact: 'simulation-required',
          path,
          params,
        });
      }
    } else if (edge.kind === 'message') {
      if (!isFlowNodeKind(source.kind) || !isFlowNodeKind(target.kind)) {
        diagnostics.push({
          code: 'message-flow-artifact-endpoint',
          severity: 'warning',
          impact: 'none',
          path,
          params,
        });
      }
    } else if (edge.kind === 'association') {
      if (isFlowNodeKind(source.kind) && isFlowNodeKind(target.kind)) {
        diagnostics.push({
          code: 'association-without-artifact',
          severity: 'warning',
          impact: 'none',
          path,
          params,
        });
      }
    }
  }
};

const validateNodes = (
  model: ProcessModel,
  graph: SequenceGraph,
  diagnostics: Diagnostic[],
): void => {
  for (const node of Object.values(model.nodes)) {
    const path = nodePath(node);
    if (node.kind === 'unknown') {
      diagnostics.push({
        code: 'unknown-node-kind',
        severity: 'warning',
        impact: 'assumption',
        path,
        params: nodeParams(node),
      });
    }
    if (node.kind !== 'gateway' && node.gatewayKind != null) {
      diagnostics.push({
        code: 'gateway-kind-on-non-gateway',
        severity: 'warning',
        impact: 'none',
        path,
        params: nodeParams(node),
      });
    }
    if ((node.reworkProbability ?? 0) > 0 && !isActivityKind(node.kind)) {
      diagnostics.push({
        code: 'rework-ignored',
        severity: 'warning',
        impact: 'none',
        path,
        params: nodeParams(node),
      });
    }
    const unsupported = node.metadata?.[SEMANTIC_METADATA_KEYS.unsupportedShape];
    if (typeof unsupported === 'string' && unsupported) {
      diagnostics.push({
        code: 'unsupported-element',
        severity: 'warning',
        impact: 'assumption',
        path,
        params: { ...nodeParams(node), shape: unsupported },
      });
    }
    if (!graph.outgoing.has(node.id)) continue;

    const outgoing = getOutgoing(graph, node.id);
    const incoming = getIncoming(graph, node.id);
    if (node.kind === 'gateway') {
      if (outgoing.length > 1 && incoming.length > 1) {
        diagnostics.push({
          code: 'mixed-gateway',
          severity: 'warning',
          impact: 'none',
          path,
          params: nodeParams(node),
        });
      }
      if (outgoing.length === 1 && incoming.length === 1) {
        diagnostics.push({
          code: 'gateway-pass-through',
          severity: 'info',
          impact: 'none',
          path,
          params: nodeParams(node),
        });
      }
      if (
        outgoing.length > 1 &&
        (node.gatewayKind === 'complex' || node.gatewayKind === 'eventBased')
      ) {
        diagnostics.push({
          code: 'unsupported-gateway-kind',
          severity: 'warning',
          impact: 'simulation-required',
          path,
          params: { ...nodeParams(node), gatewayKind: node.gatewayKind },
        });
      }
      if (node.gatewayKind === 'and') {
        outgoing
          .filter((edge) => edge.probability != null && edge.probability !== 1)
          .forEach((edge) =>
            diagnostics.push({
              code: 'probability-ignored',
              severity: 'warning',
              impact: 'none',
              path: `edges.${edge.id}`,
              params: { edgeId: edge.id, ...nodeParams(node) },
            }),
          );
      }
    } else {
      if (outgoing.length > 1) {
        diagnostics.push({
          code: 'implicit-split',
          severity: 'warning',
          impact: 'simulation-required',
          path,
          params: nodeParams(node),
        });
      } else {
        outgoing
          .filter((edge) => edge.probability != null && edge.probability !== 1)
          .forEach((edge) =>
            diagnostics.push({
              code: 'probability-ignored',
              severity: 'warning',
              impact: 'none',
              path: `edges.${edge.id}`,
              params: { edgeId: edge.id, ...nodeParams(node) },
            }),
          );
      }
      if (incoming.length > 1 && node.kind !== 'end') {
        diagnostics.push({
          code: 'implicit-join',
          severity: 'info',
          impact: 'none',
          path,
          params: nodeParams(node),
        });
      }
    }
  }
};

const countWeakComponents = (graph: SequenceGraph, ids: string[]): number => {
  const remaining = new Set(ids);
  let components = 0;
  for (const id of ids) {
    if (!remaining.has(id)) continue;
    components += 1;
    const queue = [id];
    remaining.delete(id);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const neighbours = [
        ...getOutgoing(graph, current).map((edge) => edge.target),
        ...getIncoming(graph, current).map((edge) => edge.source),
      ];
      for (const next of neighbours) {
        if (!remaining.has(next)) continue;
        remaining.delete(next);
        queue.push(next);
      }
    }
  }
  return components;
};

const validateConnectivity = (
  model: ProcessModel,
  graph: SequenceGraph,
  entry: ProcessEntry,
  diagnostics: Diagnostic[],
): void => {
  const connectedIds = graph.nodeIds.filter(
    (id) => getOutgoing(graph, id).length > 0 || getIncoming(graph, id).length > 0,
  );
  if (graph.nodeIds.length > 1) {
    graph.nodeIds
      .filter((id) => !connectedIds.includes(id))
      .forEach((id) => {
        const node = model.nodes[id];
        diagnostics.push({
          code: 'orphan-node',
          severity: 'warning',
          impact: 'assumption',
          path: nodePath(node),
          params: nodeParams(node),
        });
      });
  }
  const components = countWeakComponents(graph, connectedIds);
  if (components > 1) {
    diagnostics.push({
      code: 'disconnected-components',
      severity: 'warning',
      impact: 'assumption',
      params: { count: components },
    });
  }

  const roots = entry.startNodeId != null ? [entry.startNodeId] : entry.explicitStartIds;
  if (roots.length === 0) return;
  const reachable = reachableFrom(graph, roots);
  connectedIds
    .filter((id) => !reachable.has(id))
    .forEach((id) => {
      const node = model.nodes[id];
      diagnostics.push({
        code: 'unreachable-node',
        severity: 'warning',
        impact: 'assumption',
        path: nodePath(node),
        params: nodeParams(node),
      });
    });

  const exitable = canReach(graph, getTerminalNodeIds(graph));
  [...reachable]
    .filter((id) => !exitable.has(id))
    .forEach((id) => {
      const node = model.nodes[id];
      diagnostics.push({
        code: 'no-path-to-end',
        severity: 'warning',
        impact: 'simulation-required',
        path: nodePath(node),
        params: nodeParams(node),
      });
    });
};

/**
 * Domain-level graph validation on top of the schema. Every finding is a
 * structured diagnostic with a stable code; nothing here throws or prints.
 * Callers must run `validateModelStructure` first (or know the model is
 * well-formed): dangling edges are skipped, not reported twice.
 */
export const validateProcessGraph = (model: ProcessModel): GraphValidationResult => {
  const graph = buildSequenceGraph(model);
  const entry = resolveProcessEntry(model, graph);
  const diagnostics: Diagnostic[] = [];
  if (graph.nodeIds.length === 0) return { diagnostics, graph, entry };

  validateEntryAndExit(model, graph, entry, diagnostics);
  validateEdges(model, diagnostics);
  validateNodes(model, graph, diagnostics);
  validateConnectivity(model, graph, entry, diagnostics);
  diagnostics.push(...validateBranchProbabilities(model));

  const containers = Number(model.metadata?.[SEMANTIC_METADATA_KEYS.containerCount] ?? 0);
  if (containers > 0) {
    diagnostics.push({
      code: 'containers-not-modelled',
      severity: 'info',
      impact: 'none',
      params: { count: containers },
    });
  }
  const unconfirmed = collectUnconfirmedSemantics(model);
  if (unconfirmed.length > 0) {
    diagnostics.push({
      code: 'unconfirmed-semantics',
      severity: 'warning',
      impact: 'assumption',
      params: { count: unconfirmed.length },
    });
  }
  return { diagnostics, graph, entry };
};
