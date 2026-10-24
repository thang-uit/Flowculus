import {
  SEMANTIC_METADATA_KEYS,
  isActivityKind,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';
import {
  getIncoming,
  getOutgoing,
  getTerminalNodeIds,
  nodeParams,
  reachableFrom,
  type Diagnostic,
  type SequenceGraph,
} from '@flowculus/validation';

/** Virtual sink used for post-dominance when a process has several ends. */
export const VIRTUAL_EXIT = '\u0000exit';

type Successors = (id: string) => string[];

/**
 * Immediate dominators with the Cooper–Harvey–Kennedy iterative algorithm
 * ("A Simple, Fast Dominance Algorithm", 2001). Deterministic: successors are
 * visited in model order. Only nodes reachable from `entry` are included;
 * the entry is its own immediate dominator.
 */
export const computeImmediateDominators = (
  entry: string,
  successors: Successors,
  predecessors: Successors,
): Map<string, string> => {
  const postOrder: string[] = [];
  const visited = new Set<string>([entry]);
  const stack: Array<{ id: string; next: number }> = [{ id: entry, next: 0 }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const children = successors(frame.id);
    if (frame.next < children.length) {
      const child = children[frame.next];
      frame.next += 1;
      if (!visited.has(child)) {
        visited.add(child);
        stack.push({ id: child, next: 0 });
      }
    } else {
      postOrder.push(frame.id);
      stack.pop();
    }
  }
  const order = new Map(postOrder.map((id, index) => [id, index]));
  const reversePostOrder = [...postOrder].reverse();
  const idom = new Map<string, string>([[entry, entry]]);

  const intersect = (left: string, right: string): string => {
    let a = left;
    let b = right;
    while (a !== b) {
      while ((order.get(a) ?? -1) < (order.get(b) ?? -1)) a = idom.get(a) as string;
      while ((order.get(b) ?? -1) < (order.get(a) ?? -1)) b = idom.get(b) as string;
    }
    return a;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of reversePostOrder) {
      if (id === entry) continue;
      const processed = predecessors(id).filter(
        (predecessor) => order.has(predecessor) && idom.has(predecessor),
      );
      if (processed.length === 0) continue;
      let candidate = processed[0];
      for (const predecessor of processed.slice(1)) {
        candidate = intersect(predecessor, candidate);
      }
      if (idom.get(id) !== candidate) {
        idom.set(id, candidate);
        changed = true;
      }
    }
  }
  return idom;
};

/** True when `dominator` lies on the immediate-dominator chain of `node`. */
export const dominates = (
  idom: Map<string, string>,
  dominator: string,
  node: string,
): boolean => {
  if (!idom.has(node)) return false;
  let current = node;
  for (let guard = 0; guard <= idom.size; guard += 1) {
    if (current === dominator) return true;
    const parent = idom.get(current);
    if (parent == null || parent === current) return false;
    current = parent;
  }
  return false;
};

export interface BlockStructure {
  /**
   * Proven join for each AND/OR split: a node id, or `null` when the
   * branches terminate separately and never merge.
   */
  joinBySplitId: Map<string, string | null>;
  /** Splits whose block could not be proven (results must not be exact). */
  unresolvedSplitIds: Set<string>;
  /** Nodes that lie on at least one cycle. */
  cyclicNodeIds: Set<string>;
  diagnostics: Diagnostic[];
}

const isBlockSplit = (node: ProcessNode | undefined, graph: SequenceGraph): boolean =>
  node?.kind === 'gateway' &&
  (node.gatewayKind === 'and' || node.gatewayKind === 'or') &&
  getOutgoing(graph, node.id).length > 1;

const isDecision = (node: ProcessNode, graph: SequenceGraph): boolean =>
  getOutgoing(graph, node.id).length > 1 &&
  (node.kind !== 'gateway' || node.gatewayKind !== 'and');

/** Nodes reached from the split's branches before arriving at `join`. */
const collectRegion = (
  graph: SequenceGraph,
  splitId: string,
  join: string | null,
): Set<string> => {
  const region = new Set<string>();
  const queue = getOutgoing(graph, splitId)
    .map((edge) => edge.target)
    .filter((id) => id !== join && id !== splitId);
  queue.forEach((id) => region.add(id));
  for (let index = 0; index < queue.length; index += 1) {
    for (const edge of getOutgoing(graph, queue[index])) {
      const target = edge.target;
      if (target === join || target === splitId || region.has(target)) continue;
      region.add(target);
      queue.push(target);
    }
  }
  return region;
};

const branchesOverlap = (
  graph: SequenceGraph,
  splitId: string,
  region: Set<string>,
): boolean => {
  const owner = new Map<string, number>();
  const branches = getOutgoing(graph, splitId).map((edge) => edge.target);
  for (let branch = 0; branch < branches.length; branch += 1) {
    const queue = [branches[branch]];
    const seen = new Set(queue);
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      if (!region.has(id)) continue;
      const previous = owner.get(id);
      if (previous != null && previous !== branch) return true;
      owner.set(id, branch);
      for (const edge of getOutgoing(graph, id)) {
        if (!seen.has(edge.target)) {
          seen.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
  }
  return false;
};

/** Strongly connected nodes (Tarjan), used to report and reason about loops. */
const findCyclicNodes = (graph: SequenceGraph, nodeIds: string[]): Set<string> => {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cyclic = new Set<string>();
  let counter = 0;
  const visit = (root: string) => {
    const work: Array<{ id: string; edge: number }> = [{ id: root, edge: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const edges = getOutgoing(graph, frame.id);
      if (frame.edge < edges.length) {
        const target = edges[frame.edge].target;
        frame.edge += 1;
        if (!index.has(target)) {
          index.set(target, counter);
          low.set(target, counter);
          counter += 1;
          stack.push(target);
          onStack.add(target);
          work.push({ id: target, edge: 0 });
        } else if (onStack.has(target)) {
          low.set(frame.id, Math.min(low.get(frame.id) ?? 0, index.get(target) ?? 0));
        }
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent) {
        low.set(parent.id, Math.min(low.get(parent.id) ?? 0, low.get(frame.id) ?? 0));
      }
      if (low.get(frame.id) === index.get(frame.id)) {
        const component: string[] = [];
        let member: string | undefined;
        do {
          member = stack.pop();
          if (member == null) break;
          onStack.delete(member);
          component.push(member);
        } while (member !== frame.id);
        const selfLoop = getOutgoing(graph, frame.id).some(
          (edge) => edge.target === frame.id,
        );
        if (component.length > 1 || selfLoop) component.forEach((id) => cyclic.add(id));
      }
    }
  };
  nodeIds.forEach((id) => {
    if (!index.has(id)) visit(id);
  });
  return cyclic;
};

/**
 * Proves the block structure of AND/OR splits with dominance and
 * post-dominance instead of guessing the nearest common merge:
 *
 * 1. An explicit `flowculus-join-id` pairing wins when it is consistent.
 * 2. Otherwise the join is the split's immediate post-dominator.
 * 3. The block is accepted only when it is single-entry (the split dominates
 *    every node of the region), single-exit (every flow leaving the region
 *    goes to the join), the join has the same gateway kind (an end event is
 *    accepted as an implicit join), and every flow into the join comes from
 *    the region.
 *
 * XOR decisions need no join: their expected value is solved exactly as an
 * absorbing Markov chain, including loops. Anything that cannot be proven is
 * reported and makes the result `simulation-required`.
 */
export const resolveBlockStructure = (
  model: ProcessModel,
  graph: SequenceGraph,
  startNodeId: string,
): BlockStructure => {
  const diagnostics: Diagnostic[] = [];
  const joinBySplitId = new Map<string, string | null>();
  const unresolvedSplitIds = new Set<string>();
  const reachable = reachableFrom(graph, [startNodeId]);
  const reachableIds = graph.nodeIds.filter((id) => reachable.has(id));

  const successors: Successors = (id) =>
    reachable.has(id)
      ? getOutgoing(graph, id)
          .map((edge) => edge.target)
          .filter((target) => reachable.has(target))
      : [];
  const predecessors: Successors = (id) =>
    getIncoming(graph, id)
      .map((edge) => edge.source)
      .filter((source) => reachable.has(source));
  const idom = computeImmediateDominators(startNodeId, successors, predecessors);

  const terminals = new Set(getTerminalNodeIds(graph).filter((id) => reachable.has(id)));
  const reverseSuccessors: Successors = (id) =>
    id === VIRTUAL_EXIT ? [...terminals] : predecessors(id);
  const reversePredecessors: Successors = (id) => {
    const next = successors(id);
    return terminals.has(id) ? [...next, VIRTUAL_EXIT] : next;
  };
  const ipdom = computeImmediateDominators(
    VIRTUAL_EXIT,
    reverseSuccessors,
    reversePredecessors,
  );
  const cyclicNodeIds = findCyclicNodes(graph, reachableIds);
  const regions = new Map<string, Set<string>>();

  const fail = (
    split: ProcessNode,
    code: Diagnostic['code'],
    extra: Record<string, string> = {},
  ) => {
    unresolvedSplitIds.add(split.id);
    diagnostics.push({
      code,
      severity: 'warning',
      impact: 'simulation-required',
      path: `nodes.${split.id}`,
      params: { ...nodeParams(split), gatewayKind: split.gatewayKind ?? '', ...extra },
    });
  };

  for (const id of reachableIds) {
    const split = model.nodes[id];
    if (!split || !isBlockSplit(split, graph)) continue;

    const explicit = split.metadata?.[SEMANTIC_METADATA_KEYS.joinId];
    let join: string | null;
    if (typeof explicit === 'string' && explicit.trim()) {
      const candidate = explicit.trim();
      if (
        !model.nodes[candidate] ||
        !reachable.has(candidate) ||
        !dominates(ipdom, candidate, id) ||
        !dominates(idom, id, candidate)
      ) {
        fail(split, 'explicit-join-invalid', { joinId: candidate });
        continue;
      }
      join = candidate;
    } else {
      const candidate = ipdom.get(id);
      if (candidate == null) {
        fail(split, 'join-not-found');
        continue;
      }
      join = candidate === VIRTUAL_EXIT ? null : candidate;
    }

    const region = collectRegion(graph, id, join);
    regions.set(id, region);
    const singleEntry = [...region].every((member) => dominates(idom, id, member));
    const singleExit = [...region].every((member) =>
      getOutgoing(graph, member).every(
        (edge) => edge.target === join || region.has(edge.target),
      ),
    );
    if (!singleEntry || !singleExit) {
      fail(split, 'unstructured-block');
      continue;
    }

    if (join == null) {
      if (branchesOverlap(graph, id, region)) {
        fail(split, 'join-not-found');
        continue;
      }
      diagnostics.push({
        code: 'implicit-join-at-end',
        severity: 'info',
        impact: 'none',
        path: `nodes.${id}`,
        params: nodeParams(split),
      });
    } else {
      const joinNode = model.nodes[join];
      const sameKind =
        joinNode?.kind === 'gateway' && joinNode.gatewayKind === split.gatewayKind;
      if (!sameKind && joinNode?.kind !== 'end') {
        fail(split, 'join-kind-mismatch', {
          joinId: join,
          joinLabel: joinNode?.label ?? join,
          joinKind:
            joinNode?.kind === 'gateway'
              ? (joinNode.gatewayKind ?? 'gateway')
              : (joinNode?.kind ?? ''),
        });
        continue;
      }
      if (joinNode?.kind === 'end') {
        diagnostics.push({
          code: 'implicit-join-at-end',
          severity: 'info',
          impact: 'none',
          path: `nodes.${id}`,
          params: nodeParams(split),
        });
      }
    }

    joinBySplitId.set(id, join);
    const containsDecision = [...region].some((member) => {
      const node = model.nodes[member];
      return (
        node != null &&
        (isDecision(node, graph) ||
          (isActivityKind(node.kind) && (node.reworkProbability ?? 0) > 0) ||
          cyclicNodeIds.has(member))
      );
    });
    if (containsDecision) {
      diagnostics.push({
        code: 'parallel-branch-decision',
        severity: 'warning',
        impact: 'assumption',
        path: `nodes.${id}`,
        params: { ...nodeParams(split), gatewayKind: split.gatewayKind ?? '' },
      });
    }
  }

  // Every flow into a proven join must come from the outermost block that
  // owns it; nested same-kind blocks may share one join gateway.
  const splitsByJoin = new Map<string, string[]>();
  joinBySplitId.forEach((join, splitId) => {
    if (join == null) return;
    splitsByJoin.set(join, [...(splitsByJoin.get(join) ?? []), splitId]);
  });
  splitsByJoin.forEach((splitIds, joinId) => {
    const outermost =
      splitIds.find((candidate) =>
        splitIds.every((other) => dominates(idom, candidate, other)),
      ) ?? splitIds[0];
    const region = regions.get(outermost) ?? new Set<string>();
    const joinNode = model.nodes[joinId];
    const foreign = getIncoming(graph, joinId).some(
      (edge) => edge.source !== outermost && !region.has(edge.source),
    );
    if (foreign) {
      splitIds.forEach((splitId) => {
        joinBySplitId.delete(splitId);
        const split = model.nodes[splitId];
        if (split) fail(split, 'unstructured-block');
      });
      return;
    }
    if (splitIds.length > 1 && joinNode) {
      diagnostics.push({
        code: 'shared-join',
        severity: 'info',
        impact: 'none',
        path: `nodes.${joinId}`,
        params: nodeParams(joinNode),
      });
    }
  });

  // AND/OR merges that no proven split owns: an AND join fed by a decision
  // deadlocks, and an OR join's synchronisation is undefined there.
  const claimedJoins = new Set(
    [...joinBySplitId.values()].filter((join): join is string => join != null),
  );
  const attemptedJoins = new Set(
    [...unresolvedSplitIds]
      .map((splitId) => ipdom.get(splitId))
      .filter((join): join is string => join != null),
  );
  for (const id of reachableIds) {
    const node = model.nodes[id];
    if (node?.kind !== 'gateway') continue;
    if (node.gatewayKind !== 'and' && node.gatewayKind !== 'or') continue;
    if (getIncoming(graph, id).length < 2) continue;
    if (claimedJoins.has(id) || attemptedJoins.has(id)) continue;
    diagnostics.push({
      code: 'unmatched-join',
      severity: 'warning',
      impact: node.gatewayKind === 'and' ? 'simulation-required' : 'assumption',
      path: `nodes.${id}`,
      params: { ...nodeParams(node), gatewayKind: node.gatewayKind },
    });
  }

  const loopHeaders = reachableIds.filter(
    (id) =>
      cyclicNodeIds.has(id) &&
      getIncoming(graph, id).some(
        (edge) => reachable.has(edge.source) && dominates(idom, id, edge.source),
      ),
  );
  loopHeaders.forEach((id) => {
    const node = model.nodes[id];
    if (!node) return;
    diagnostics.push({
      code: 'cycle-detected',
      severity: 'info',
      impact: 'none',
      path: `nodes.${id}`,
      params: nodeParams(node),
    });
  });

  return { joinBySplitId, unresolvedSplitIds, cyclicNodeIds, diagnostics };
};
