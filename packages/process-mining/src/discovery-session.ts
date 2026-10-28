import { type TimePolicy, ELAPSED_TIME_POLICY } from './business-calendar';
import {
  buildDirectlyFollowsGraph,
  buildTraces,
  buildVariants,
  computeLogStats,
  filterDirectlyFollowsGraph,
  findBottlenecks,
} from './discover';
import {
  DEFAULT_DISCOVERY_FILTER,
  type DiscoveryFilter,
  type EventLog,
  type ProcessDiscovery,
} from './types';

/** Prepare one immutable log once; slider changes only rebuild its filtered map. */
export const createProcessDiscovery = (
  log: EventLog,
  timePolicy: TimePolicy = ELAPSED_TIME_POLICY,
) => {
  const traces = buildTraces(log, timePolicy);
  const variants = buildVariants(traces);
  const fullDfg = buildDirectlyFollowsGraph(traces, timePolicy);
  const stats = computeLogStats(log, traces, variants);
  const bottlenecks = findBottlenecks(fullDfg);

  return (filter: DiscoveryFilter = DEFAULT_DISCOVERY_FILTER): ProcessDiscovery => {
    const filtered = filterDirectlyFollowsGraph(traces, fullDfg, filter, timePolicy);
    return {
      timePolicy,
      stats,
      dfg: filtered.dfg,
      variants,
      bottlenecks,
      filter,
      hiddenActivityCount: filtered.hiddenActivityCount,
      hiddenEdgeCount: filtered.hiddenEdgeCount,
    };
  };
};

/** One-shot discovery for callers that do not keep a mining session. */
export const discoverProcess = (
  log: EventLog,
  filter: DiscoveryFilter = DEFAULT_DISCOVERY_FILTER,
  timePolicy: TimePolicy = ELAPSED_TIME_POLICY,
): ProcessDiscovery => createProcessDiscovery(log, timePolicy)(filter);
