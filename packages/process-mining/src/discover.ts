import { createDurationClock, type TimePolicy } from './business-calendar';
import {
  type Bottleneck,
  type DfgActivity,
  type DfgEdge,
  type DirectlyFollowsGraph,
  type DiscoveryFilter,
  type EventLog,
  type EventLogStats,
  type MiningEvent,
  type Trace,
  type TraceVariant,
} from './types';

const HOUR_MS = 3_600_000;

const eventStart = (event: MiningEvent): number => event.startTime ?? event.completeTime;

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

// Reduce-based extrema: spreading 100k+ values into Math.max overflows the stack.
const maxOf = (values: number[], fallback = 0): number =>
  values.reduce(
    (max, value) => (value > max ? value : max),
    values.length > 0 ? -Infinity : fallback,
  );
const minOf = (values: number[], fallback = 0): number =>
  values.reduce(
    (min, value) => (value < min ? value : min),
    values.length > 0 ? Infinity : fallback,
  );

/** Groups events into cases ordered by time (ties keep file order). */
export const buildTraces = (log: EventLog, timePolicy?: TimePolicy): Trace[] => {
  const duration = createDurationClock(timePolicy);
  const byCase = new Map<string, Array<{ event: MiningEvent; order: number }>>();
  log.events.forEach((event, order) => {
    const list = byCase.get(event.caseId) ?? [];
    list.push({ event, order });
    byCase.set(event.caseId, list);
  });
  return [...byCase.entries()].map(([caseId, entries]) => {
    const events = entries
      .sort(
        (left, right) =>
          left.event.completeTime - right.event.completeTime ||
          eventStart(left.event) - eventStart(right.event) ||
          left.order - right.order,
      )
      .map((entry) => entry.event);
    const startTime = minOf(events.map(eventStart));
    const endTime = maxOf(events.map((event) => event.completeTime));
    return {
      caseId,
      events,
      startTime,
      endTime,
      durationMs: duration(startTime, endTime),
    };
  });
};

const variantKey = (activities: string[]): string => activities.join('\u0001');

export const buildVariants = (traces: Trace[]): TraceVariant[] => {
  const groups = new Map<string, Trace[]>();
  traces.forEach((trace) => {
    const key = variantKey(trace.events.map((event) => event.activity));
    const list = groups.get(key) ?? [];
    list.push(trace);
    groups.set(key, list);
  });
  const total = Math.max(1, traces.length);
  const variants = [...groups.values()]
    .map((group) => {
      const activities = group[0].events.map((event) => event.activity);
      return {
        id: '',
        activities,
        caseCount: group.length,
        share: group.length / total,
        meanLeadTimeMs: mean(group.map((trace) => trace.durationMs)),
        hasRepetition: new Set(activities).size < activities.length,
        isHappyPath: false,
        caseIds: group.map((trace) => trace.caseId),
      };
    })
    .sort(
      (left, right) =>
        right.caseCount - left.caseCount ||
        left.activities.length - right.activities.length ||
        left.meanLeadTimeMs - right.meanLeadTimeMs,
    );
  variants.forEach((variant, index) => {
    variant.id = `V${index + 1}`;
  });
  // The happy path is the most frequent variant without repetitions.
  const happy = variants.find((variant) => !variant.hasRepetition) ?? variants[0];
  if (happy) happy.isHappyPath = true;
  return variants;
};

interface EdgeAccumulator {
  frequency: number;
  durations: number[];
}

/** Builds the Directly-Follows Graph of (possibly projected) traces. */
export const buildDirectlyFollowsGraph = (
  traces: Trace[],
  timePolicy?: TimePolicy,
): DirectlyFollowsGraph => {
  const duration = createDurationClock(timePolicy);
  const activities = new Map<
    string,
    {
      frequency: number;
      cases: Set<string>;
      services: number[];
      costs: number[];
      resources: Map<string, number>;
      startCount: number;
      endCount: number;
    }
  >();
  const edges = new Map<string, EdgeAccumulator & { source: string; target: string }>();

  traces.forEach((trace) => {
    trace.events.forEach((event, index) => {
      const entry = activities.get(event.activity) ?? {
        frequency: 0,
        cases: new Set<string>(),
        services: [],
        costs: [],
        resources: new Map<string, number>(),
        startCount: 0,
        endCount: 0,
      };
      entry.frequency += 1;
      entry.cases.add(trace.caseId);
      if (event.startTime != null)
        entry.services.push(duration(event.startTime, event.completeTime));
      if (event.cost != null) entry.costs.push(event.cost);
      if (event.resource) {
        entry.resources.set(
          event.resource,
          (entry.resources.get(event.resource) ?? 0) + 1,
        );
      }
      if (index === 0) entry.startCount += 1;
      if (index === trace.events.length - 1) entry.endCount += 1;
      activities.set(event.activity, entry);

      const next = trace.events[index + 1];
      if (!next) return;
      const key = `${event.activity}\u0000${next.activity}`;
      const edge = edges.get(key) ?? {
        source: event.activity,
        target: next.activity,
        frequency: 0,
        durations: [],
      };
      edge.frequency += 1;
      edge.durations.push(duration(event.completeTime, eventStart(next)));
      edges.set(key, edge);
    });
  });

  const activityList: DfgActivity[] = [...activities.entries()]
    .map(([id, entry]) => {
      const sortedResources = [...entry.resources.entries()].sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      );
      const main = sortedResources[0];
      return {
        id,
        frequency: entry.frequency,
        caseFrequency: entry.cases.size,
        meanServiceMs: entry.services.length > 0 ? mean(entry.services) : null,
        serviceSampleCount: entry.services.length,
        meanCost: entry.costs.length > 0 ? mean(entry.costs) : null,
        mainResource: main?.[0] ?? null,
        mainResourceShare: main ? main[1] / entry.frequency : 0,
        resources: sortedResources.map(([resource]) => resource),
        startCount: entry.startCount,
        endCount: entry.endCount,
      };
    })
    .sort(
      (left, right) =>
        right.frequency - left.frequency || left.id.localeCompare(right.id),
    );

  const edgeList: DfgEdge[] = [...edges.values()]
    .map((edge, index) => ({
      id: `dfg-${index + 1}`,
      source: edge.source,
      target: edge.target,
      frequency: edge.frequency,
      meanDurationMs: mean(edge.durations),
      medianDurationMs: median(edge.durations),
      maxDurationMs: maxOf(edge.durations),
    }))
    .sort((left, right) => right.frequency - left.frequency);

  return {
    activities: activityList,
    edges: edgeList,
    maxActivityFrequency: maxOf(activityList.map((activity) => activity.frequency)),
    maxEdgeFrequency: maxOf(edgeList.map((edge) => edge.frequency)),
    maxMeanDurationMs: maxOf(edgeList.map((edge) => edge.meanDurationMs)),
  };
};

export const computeLogStats = (
  log: EventLog,
  traces: Trace[],
  variants: TraceVariant[],
): EventLogStats => {
  const durations = traces.map((trace) => trace.durationMs);
  const costs = traces
    .map((trace) =>
      trace.events.reduce<number | null>(
        (sum, event) => (event.cost == null ? sum : (sum ?? 0) + event.cost),
        null,
      ),
    )
    .filter((value): value is number => value != null);
  return {
    caseCount: traces.length,
    eventCount: log.events.length,
    activityCount: new Set(log.events.map((event) => event.activity)).size,
    resourceCount: new Set(
      log.events
        .map((event) => event.resource)
        .filter((resource): resource is string => Boolean(resource)),
    ).size,
    variantCount: variants.length,
    meanLeadTimeMs: mean(durations),
    medianLeadTimeMs: median(durations),
    minLeadTimeMs: minOf(durations),
    maxLeadTimeMs: maxOf(durations),
    firstEventTime:
      traces.length > 0 ? minOf(traces.map((trace) => trace.startTime)) : null,
    lastEventTime: traces.length > 0 ? maxOf(traces.map((trace) => trace.endTime)) : null,
    meanCostPerCase: costs.length > 0 ? mean(costs) : null,
    happyPathShare: variants.find((variant) => variant.isHappyPath)?.share ?? 0,
    hasStartTimes: log.hasStartTimes,
  };
};

/**
 * Ranks the slowest hand-overs (mean delay between consecutive steps) and, when
 * the log has start times, the slowest activities by service time. The share is
 * relative to the total delay of the same kind, so it reads as "x % of all
 * waiting happens here".
 */
export const findBottlenecks = (dfg: DirectlyFollowsGraph, limit = 12): Bottleneck[] => {
  const transitions = dfg.edges.filter((edge) => edge.source !== edge.target);
  const totalTransition = transitions.reduce(
    (sum, edge) => sum + edge.meanDurationMs * edge.frequency,
    0,
  );
  const transitionBottlenecks: Bottleneck[] = transitions.map((edge) => ({
    kind: 'transition',
    id: edge.id,
    source: edge.source,
    target: edge.target,
    frequency: edge.frequency,
    meanDurationMs: edge.meanDurationMs,
    totalDurationMs: edge.meanDurationMs * edge.frequency,
    share:
      totalTransition > 0 ? (edge.meanDurationMs * edge.frequency) / totalTransition : 0,
  }));
  const services = dfg.activities.filter((activity) => activity.meanServiceMs != null);
  const totalService = services.reduce(
    (sum, activity) => sum + (activity.meanServiceMs ?? 0) * activity.serviceSampleCount,
    0,
  );
  const activityBottlenecks: Bottleneck[] = services.map((activity) => ({
    kind: 'activity',
    id: `activity:${activity.id}`,
    activity: activity.id,
    frequency: activity.serviceSampleCount,
    meanDurationMs: activity.meanServiceMs ?? 0,
    totalDurationMs: (activity.meanServiceMs ?? 0) * activity.serviceSampleCount,
    share:
      totalService > 0
        ? ((activity.meanServiceMs ?? 0) * activity.serviceSampleCount) / totalService
        : 0,
  }));
  return [...transitionBottlenecks, ...activityBottlenecks]
    .filter((item) => item.meanDurationMs > 0)
    .sort((left, right) => right.meanDurationMs - left.meanDurationMs)
    .slice(0, limit);
};

const clampShare = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/**
 * Applies the frequency/duration sliders. Activities are filtered by
 * projecting traces (dropping the hidden steps and re-deriving the DFG, as
 * commercial miners do); edges are filtered afterwards while each activity
 * keeps its strongest incoming and outgoing edge so the map stays connected.
 */
export const filterDirectlyFollowsGraph = (
  traces: Trace[],
  dfg: DirectlyFollowsGraph,
  filter: DiscoveryFilter,
  timePolicy?: TimePolicy,
): {
  dfg: DirectlyFollowsGraph;
  hiddenActivityCount: number;
  hiddenEdgeCount: number;
} => {
  const minActivityShare = clampShare(filter.minActivityShare);
  const minEdgeShare = clampShare(filter.minEdgeShare);
  const minTransitionMs = Math.max(0, filter.minTransitionHours || 0) * HOUR_MS;
  const activityThreshold = dfg.maxActivityFrequency * minActivityShare;
  const kept = new Set(
    dfg.activities
      .filter((activity, index) => index === 0 || activity.frequency >= activityThreshold)
      .map((activity) => activity.id),
  );
  const projected =
    kept.size === dfg.activities.length
      ? dfg
      : buildDirectlyFollowsGraph(
          traces
            .map((trace) => ({
              ...trace,
              events: trace.events.filter((event) => kept.has(event.activity)),
            }))
            .filter((trace) => trace.events.length > 0),
          timePolicy,
        );

  const edgeThreshold = projected.maxEdgeFrequency * minEdgeShare;
  const strongest = new Set<string>();
  const bestIncoming = new Map<string, DfgEdge>();
  const bestOutgoing = new Map<string, DfgEdge>();
  projected.edges.forEach((edge) => {
    if (edge.source === edge.target) return;
    const incoming = bestIncoming.get(edge.target);
    if (!incoming || edge.frequency > incoming.frequency)
      bestIncoming.set(edge.target, edge);
    const outgoing = bestOutgoing.get(edge.source);
    if (!outgoing || edge.frequency > outgoing.frequency)
      bestOutgoing.set(edge.source, edge);
  });
  projected.activities.forEach((activity) => {
    if (activity.startCount === 0) {
      const incoming = bestIncoming.get(activity.id);
      if (incoming) strongest.add(incoming.id);
    }
    if (activity.endCount === 0) {
      const outgoing = bestOutgoing.get(activity.id);
      if (outgoing) strongest.add(outgoing.id);
    }
  });
  const edges = projected.edges.filter(
    (edge) =>
      strongest.has(edge.id) ||
      (edge.frequency >= edgeThreshold &&
        (minTransitionMs === 0 || edge.meanDurationMs >= minTransitionMs)),
  );

  return {
    dfg: {
      ...projected,
      edges,
      maxEdgeFrequency: maxOf(edges.map((edge) => edge.frequency)),
      maxMeanDurationMs: maxOf(edges.map((edge) => edge.meanDurationMs)),
    },
    hiddenActivityCount: dfg.activities.length - projected.activities.length,
    hiddenEdgeCount: projected.edges.length - edges.length,
  };
};
