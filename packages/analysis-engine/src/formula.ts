import type { FormulaNode } from '@flowculus/formula-renderer';
import type { ProcessModel } from '@flowculus/process-model';
import { getOutgoing, type SequenceGraph } from '@flowculus/validation';

import {
  EPSILON,
  enumerateOrBranches,
  getEdgeProbability,
  getNodeReward,
  type Metric,
} from './solver';
import type { BlockStructure } from './structure';

export const formatNumber = (value: number, decimals = 4): string => {
  if (!Number.isFinite(value)) return 'undefined';
  return Number(value.toFixed(decimals)).toString();
};

export const literal = (value: string): FormulaNode => ({ kind: 'literal', value });

const weighted = (probability: number, term: FormulaNode): FormulaNode =>
  Math.abs(probability - 1) < EPSILON
    ? term
    : { kind: 'weighted', probability: literal(formatNumber(probability)), term };

const sum = (terms: FormulaNode[]): FormulaNode => {
  const meaningful = terms.filter(
    (term) => term.kind !== 'literal' || !/^0(?:\.0+)?$/.test(term.value),
  );
  if (meaningful.length === 0) return literal('0');
  if (meaningful.length === 1) return meaningful[0];
  return { kind: 'sum', terms: meaningful };
};

interface FormulaContext {
  model: ProcessModel;
  graph: SequenceGraph;
  metric: Metric;
  structure: BlockStructure;
}

const subtractShared = (
  context: FormulaContext,
  total: FormulaNode,
  duplicates: number,
  joinId: string | null | undefined,
  visited: Set<string>,
): FormulaNode => {
  if (!joinId || duplicates <= 0) return total;
  const shared = buildNodeFormula(context, joinId, visited);
  return {
    kind: 'difference',
    minuend: total,
    subtrahend:
      duplicates === 1
        ? shared
        : { kind: 'product', factors: [literal(String(duplicates)), shared] },
  };
};

/**
 * Symbolic expansion of the same equations the solver evaluates. A loop is
 * shown as the symbol `E_<id>` (its expected value) instead of being expanded
 * forever; the number itself comes from the fixed-point solution.
 */
const buildNodeFormula = (
  context: FormulaContext,
  nodeId: string,
  visited: Set<string>,
): FormulaNode => {
  const { model, graph, metric, structure } = context;
  const node = model.nodes[nodeId];
  if (!node) return literal(`missing(${nodeId})`);
  if (visited.has(nodeId)) return literal(`E_${node.id}`);

  const nextVisited = new Set(visited).add(nodeId);
  const local = getNodeReward(node, metric);
  const localFormula =
    local === 0 ? null : literal(formatNumber(local, metric === 'cost' ? 2 : 4));
  const outgoing = getOutgoing(graph, node.id);
  if (outgoing.length === 0 && !localFormula) return literal('0');

  const branches = outgoing.map((edge) =>
    buildNodeFormula(context, edge.target, nextVisited),
  );
  const elapsed = metric === 'cycle' || metric === 'theoretical';
  const kind = node.kind === 'gateway' ? (node.gatewayKind ?? 'xor') : null;
  let continuation: FormulaNode = literal('0');

  if (branches.length === 1) {
    continuation = branches[0];
  } else if (branches.length > 1) {
    if (kind === 'and' && structure.joinBySplitId.has(node.id)) {
      continuation = elapsed
        ? { kind: 'maximum', terms: branches }
        : subtractShared(
            context,
            sum(branches),
            branches.length - 1,
            structure.joinBySplitId.get(node.id),
            nextVisited,
          );
    } else if (kind === 'or' && structure.joinBySplitId.has(node.id)) {
      const combinations = enumerateOrBranches(outgoing);
      continuation = combinations
        ? sum(
            combinations.map((combination) => {
              const selected = combination.edges.map(
                (edge) => branches[outgoing.indexOf(edge)],
              );
              const combined: FormulaNode = elapsed
                ? { kind: 'maximum', terms: selected }
                : subtractShared(
                    context,
                    sum(selected),
                    selected.length - 1,
                    structure.joinBySplitId.get(node.id),
                    nextVisited,
                  );
              return weighted(combination.probability, combined);
            }),
          )
        : literal(`unsupported(${node.id})`);
    } else if (kind === 'xor') {
      continuation = sum(
        branches.map((term, index) =>
          weighted(getEdgeProbability(outgoing[index], outgoing), term),
        ),
      );
    } else {
      continuation = literal(`unsupported(${node.id})`);
    }
  }

  const rework = node.reworkProbability;
  const localWithRework =
    localFormula && typeof rework === 'number' && rework > 0 && rework < 1
      ? ({
          kind: 'fraction',
          numerator: localFormula,
          denominator: literal(`1 - ${formatNumber(rework)}`),
        } as FormulaNode)
      : localFormula;
  return sum([...(localWithRework ? [localWithRework] : []), continuation]);
};

export const buildMetricFormula = (
  model: ProcessModel,
  graph: SequenceGraph,
  metric: Metric,
  structure: BlockStructure,
  startNodeId: string,
): FormulaNode =>
  buildNodeFormula({ model, graph, metric, structure }, startNodeId, new Set());
