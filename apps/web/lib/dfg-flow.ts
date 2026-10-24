import type { Edge, Node } from '@xyflow/react';

import { layoutLayeredGraph, type Rect } from '@flowculus/graph-layout';
import type {
  DfgActivity,
  DirectlyFollowsGraph,
  TraceVariant,
} from '@flowculus/process-mining';

export const DFG_START_ID = 'dfg:start';
export const DFG_END_ID = 'dfg:end';
const ACTIVITY_SIZE = { width: 188, height: 60 };
const TERMINAL_SIZE = { width: 44, height: 44 };

export interface DfgActivityNodeData extends Record<string, unknown> {
  activity: DfgActivity;
  maxFrequency: number;
  dimmed: boolean;
  highlighted: boolean;
}

export interface DfgTerminalNodeData extends Record<string, unknown> {
  terminal: 'start' | 'end';
  dimmed: boolean;
}

export type DfgFlowNode =
  Node<DfgActivityNodeData, 'activity'> | Node<DfgTerminalNodeData, 'terminal'>;

export interface DfgEdgeData extends Record<string, unknown> {
  frequency: number;
  meanDurationMs: number | null;
  /** 0–1 weight for stroke width. */
  weight: number;
  /** 0–1 share of the slowest mean transition; drives the bottleneck colour. */
  slowness: number;
  dimmed: boolean;
  highlighted: boolean;
  metric: 'frequency' | 'duration';
  /** Other shapes on the map, so the route can step around them. */
  obstacles: Rect[];
}

export type DfgFlowEdge = Edge<DfgEdgeData, 'dfg'>;

const variantPairs = (variant: TraceVariant | undefined): Set<string> => {
  const pairs = new Set<string>();
  if (!variant) return pairs;
  const sequence = [DFG_START_ID, ...variant.activities, DFG_END_ID];
  for (let index = 0; index < sequence.length - 1; index += 1) {
    pairs.add(`${sequence[index]}\u0000${sequence[index + 1]}`);
  }
  return pairs;
};

/** Lays the Directly-Follows Graph out left → right with virtual start/end nodes. */
export const buildDfgFlow = (
  dfg: DirectlyFollowsGraph,
  variant: TraceVariant | undefined,
): { nodes: DfgFlowNode[]; edges: DfgFlowEdge[] } => {
  const variantActivities = new Set(variant?.activities ?? []);
  const pairs = variantPairs(variant);
  const focus = variant != null;

  const rawEdges: Array<{
    source: string;
    target: string;
    frequency: number;
    mean: number | null;
  }> = [
    ...dfg.activities
      .filter((activity) => activity.startCount > 0)
      .map((activity) => ({
        source: DFG_START_ID,
        target: activity.id,
        frequency: activity.startCount,
        mean: null,
      })),
    ...dfg.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      frequency: edge.frequency,
      mean: edge.meanDurationMs,
    })),
    ...dfg.activities
      .filter((activity) => activity.endCount > 0)
      .map((activity) => ({
        source: activity.id,
        target: DFG_END_ID,
        frequency: activity.endCount,
        mean: null,
      })),
  ];

  const layout = layoutLayeredGraph(
    [
      { id: DFG_START_ID, ...TERMINAL_SIZE },
      ...dfg.activities.map((activity) => ({ id: activity.id, ...ACTIVITY_SIZE })),
      { id: DFG_END_ID, ...TERMINAL_SIZE },
    ],
    rawEdges
      .filter((edge) => edge.source !== edge.target)
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.frequency,
      })),
    { startIds: [DFG_START_ID], rankGap: 64, nodeGap: 56, direction: 'TB' },
  );
  const position = (id: string) => layout.positions.get(id) ?? { x: 0, y: 0 };

  const nodes: DfgFlowNode[] = [
    {
      id: DFG_START_ID,
      type: 'terminal',
      position: position(DFG_START_ID),
      ...TERMINAL_SIZE,
      data: { terminal: 'start', dimmed: false },
    },
    ...dfg.activities.map((activity): DfgFlowNode => ({
      id: activity.id,
      type: 'activity',
      position: position(activity.id),
      ...ACTIVITY_SIZE,
      data: {
        activity,
        maxFrequency: dfg.maxActivityFrequency,
        dimmed: focus && !variantActivities.has(activity.id),
        highlighted: focus && variantActivities.has(activity.id),
      },
    })),
    {
      id: DFG_END_ID,
      type: 'terminal',
      position: position(DFG_END_ID),
      ...TERMINAL_SIZE,
      data: { terminal: 'end', dimmed: false },
    },
  ];

  const rects = new Map(
    nodes.map((node) => [
      node.id,
      { ...node.position, width: node.width ?? 0, height: node.height ?? 0 },
    ]),
  );
  const maxFrequency = Math.max(1, ...rawEdges.map((edge) => edge.frequency));
  const maxMean = Math.max(1, dfg.maxMeanDurationMs);
  const edges: DfgFlowEdge[] = rawEdges.map((edge, index) => {
    const onVariant = pairs.has(`${edge.source}\u0000${edge.target}`);
    return {
      id: `dfg-edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'dfg',
      data: {
        frequency: edge.frequency,
        meanDurationMs: edge.mean,
        weight: Math.pow(edge.frequency / maxFrequency, 0.6),
        slowness: edge.mean == null ? 0 : edge.mean / maxMean,
        dimmed: focus && !onVariant,
        highlighted: focus && onVariant,
        metric: 'frequency',
        obstacles: [...rects.entries()]
          .filter(([id]) => id !== edge.source && id !== edge.target)
          .map(([, rect]) => rect),
      },
    };
  });

  return { nodes, edges };
};
