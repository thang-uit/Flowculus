import { withAutoLayout } from '@flowculus/file-formats';
import type { ProcessEdge, ProcessModel, ProcessNode } from '@flowculus/process-model';

import type { DirectlyFollowsGraph } from './types';

const MINUTE_MS = 60_000;
const MAX_INFERRED_REWORK = 0.95;

export interface DiscoveredModelResult {
  model: ProcessModel;
  /** Human-readable caveats (English, stable patterns for the UI to localise). */
  warnings: string[];
}

const slug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'activity';

const roundMinutes = (milliseconds: number): number =>
  Math.round((milliseconds / MINUTE_MS) * 100) / 100;

interface Branch {
  key: string;
  frequency: number;
}

/** Rounds shares to 4 decimals while keeping their sum exactly 1. */
const normalizeProbabilities = (branches: Branch[]): Map<string, number> => {
  const total = branches.reduce((sum, branch) => sum + branch.frequency, 0);
  const result = new Map<string, number>();
  if (total <= 0) return result;
  let assigned = 0;
  branches.forEach((branch, index) => {
    if (index === branches.length - 1) {
      result.set(branch.key, Math.max(0, Math.round((1 - assigned) * 1e6) / 1e6));
      return;
    }
    const share = Math.round((branch.frequency / total) * 1e4) / 1e4;
    assigned += share;
    result.set(branch.key, share);
  });
  return result;
};

const START = '__start__';
const END = '__end__';

/**
 * Converts a (filtered) Directly-Follows Graph into a BPMN process model that
 * the cycle-time engine can analyse:
 * - every activity becomes a task: processing = mean service time when the log
 *   has start times, waiting = frequency-weighted mean incoming delay;
 * - branching becomes an XOR split whose probabilities are the observed
 *   frequencies, and merging becomes an XOR join;
 * - a self-loop becomes the task's rework probability r = f(a→a) / f(a);
 * - longer loops stay as XOR back-edges, which the engine solves exactly as an
 *   absorbing Markov chain.
 * Gateways and rework are mined, not modelled, so they are flagged as inferred
 * and the analysis quality becomes `assumption` until a person confirms them.
 */
export const dfgToProcessModel = (
  dfg: DirectlyFollowsGraph,
  options: { name: string; hasStartTimes: boolean },
): DiscoveredModelResult => {
  const warnings: string[] = [];
  const nodes: Record<string, ProcessNode> = {};
  const edges: Record<string, ProcessEdge> = {};
  const nodeIdByActivity = new Map<string, string>();
  const usedIds = new Set<string>(['start', 'end']);

  dfg.activities.forEach((activity) => {
    let id = `task-${slug(activity.id)}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `task-${slug(activity.id)}-${suffix++}`;
    usedIds.add(id);
    nodeIdByActivity.set(activity.id, id);
  });

  const selfLoops = new Map<string, number>();
  const transitions = dfg.edges.filter((edge) => {
    if (edge.source !== edge.target) return true;
    selfLoops.set(edge.source, edge.frequency);
    return false;
  });

  const incomingDelays = new Map<string, { weighted: number; frequency: number }>();
  transitions.forEach((edge) => {
    const entry = incomingDelays.get(edge.target) ?? { weighted: 0, frequency: 0 };
    entry.weighted += edge.meanDurationMs * edge.frequency;
    entry.frequency += edge.frequency;
    incomingDelays.set(edge.target, entry);
  });

  nodes.start = { id: 'start', label: 'Start', kind: 'start' };
  nodes.end = { id: 'end', label: 'End', kind: 'end' };

  dfg.activities.forEach((activity) => {
    const id = nodeIdByActivity.get(activity.id) as string;
    const delays = incomingDelays.get(activity.id);
    const meanIncoming =
      delays && delays.frequency > 0 ? delays.weighted / delays.frequency : undefined;
    const selfLoop = selfLoops.get(activity.id) ?? 0;
    const rework =
      selfLoop > 0
        ? Math.min(MAX_INFERRED_REWORK, selfLoop / activity.frequency)
        : undefined;
    const metadata: ProcessNode['metadata'] = {
      source: 'process-mining',
      'mining-frequency': activity.frequency,
      'mining-case-frequency': activity.caseFrequency,
    };
    if (rework != null) metadata['flowculus-inferred-rework'] = true;

    let processingMinutes: number | undefined;
    let waitingMinutes: number | undefined;
    let durationMinutes: number | undefined;
    if (options.hasStartTimes && activity.meanServiceMs != null) {
      processingMinutes = roundMinutes(activity.meanServiceMs);
      waitingMinutes = meanIncoming != null ? roundMinutes(meanIncoming) : 0;
      durationMinutes = Math.round((processingMinutes + waitingMinutes) * 100) / 100;
    } else if (meanIncoming != null) {
      // Without start times only completion-to-completion delays are known:
      // they are elapsed time (waiting + work), so processing stays unknown.
      durationMinutes = roundMinutes(meanIncoming);
    }

    nodes[id] = {
      id,
      label: activity.id,
      kind: 'task',
      processingMinutes,
      waitingMinutes,
      durationMinutes,
      reworkProbability: rework != null ? Math.round(rework * 1e4) / 1e4 : undefined,
      cost:
        activity.meanCost != null || activity.mainResource
          ? {
              otherCostPerExecution:
                activity.meanCost != null
                  ? Math.round(activity.meanCost * 100) / 100
                  : undefined,
              resourcePoolId: activity.mainResource ?? undefined,
            }
          : undefined,
      metadata,
    };
  });

  // Branches out of every element (activities, the start event).
  const outgoing = new Map<string, Branch[]>();
  const incoming = new Map<string, Branch[]>();
  const addBranch = (from: string, to: string, frequency: number) => {
    if (frequency <= 0) return;
    const out = outgoing.get(from) ?? [];
    out.push({ key: to, frequency });
    outgoing.set(from, out);
    const into = incoming.get(to) ?? [];
    into.push({ key: from, frequency });
    incoming.set(to, into);
  };
  dfg.activities.forEach((activity) => {
    addBranch(START, activity.id, activity.startCount);
  });
  transitions.forEach((edge) => addBranch(edge.source, edge.target, edge.frequency));
  dfg.activities.forEach((activity) => addBranch(activity.id, END, activity.endCount));

  const elementId = (key: string): string =>
    key === START ? 'start' : key === END ? 'end' : (nodeIdByActivity.get(key) as string);

  const exitOf = new Map<string, string>();
  const entryOf = new Map<string, string>();
  let edgeCounter = 0;
  const addEdge = (source: string, target: string, patch: Partial<ProcessEdge> = {}) => {
    edgeCounter += 1;
    const id = `flow-${edgeCounter}`;
    edges[id] = { id, source, target, kind: 'sequence', ...patch };
  };
  const gatewayMetadata = {
    source: 'process-mining',
    'flowculus-inferred-gateway-kind': true,
  };

  outgoing.forEach((branches, key) => {
    if (branches.length < 2) {
      exitOf.set(key, elementId(key));
      return;
    }
    const id = `split-${elementId(key)}`;
    nodes[id] = {
      id,
      label: 'Split',
      kind: 'gateway',
      gatewayKind: 'xor',
      metadata: { ...gatewayMetadata },
    };
    addEdge(elementId(key), id);
    exitOf.set(key, id);
  });
  incoming.forEach((branches, key) => {
    if (branches.length < 2) {
      entryOf.set(key, elementId(key));
      return;
    }
    const id = `join-${elementId(key)}`;
    nodes[id] = {
      id,
      label: 'Merge',
      kind: 'gateway',
      gatewayKind: 'xor',
      metadata: { ...gatewayMetadata },
    };
    addEdge(id, elementId(key));
    entryOf.set(key, id);
  });

  outgoing.forEach((branches, key) => {
    const probabilities = branches.length > 1 ? normalizeProbabilities(branches) : null;
    branches.forEach((branch) => {
      addEdge(
        exitOf.get(key) ?? elementId(key),
        entryOf.get(branch.key) ?? elementId(branch.key),
        {
          probability: probabilities?.get(branch.key),
          metadata: { 'mining-frequency': branch.frequency },
        },
      );
    });
  });

  if (!outgoing.has(START))
    warnings.push('The event log has no complete case to start from.');
  const pairs = new Set(transitions.map((edge) => `${edge.source}\u0000${edge.target}`));
  transitions.forEach((edge) => {
    if (edge.source < edge.target && pairs.has(`${edge.target}\u0000${edge.source}`)) {
      warnings.push(
        `Activities ${edge.source} and ${edge.target} occur in both orders; they may run in parallel (AND) rather than loop.`,
      );
    }
  });
  if (!options.hasStartTimes) {
    warnings.push(
      'The log has no start timestamps, so task times are elapsed time between completions and processing time is unknown.',
    );
  }

  return {
    model: withAutoLayout(
      {
        schemaVersion: 1,
        id: `mined-${slug(options.name)}`,
        name: options.name,
        nodes,
        edges,
        metadata: { source: 'process-mining' },
      },
      { force: true },
    ),
    warnings,
  };
};
