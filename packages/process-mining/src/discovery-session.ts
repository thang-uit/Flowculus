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
export const createProcessDiscovery = (log: EventLog) => {
  const traces = buildTraces(log);
  const variants = buildVariants(traces);
  const fullDfg = buildDirectlyFollowsGraph(traces);
  const stats = computeLogStats(log, traces, variants);
  const bottlenecks = findBottlenecks(fullDfg);

  return (filter: DiscoveryFilter = DEFAULT_DISCOVERY_FILTER): ProcessDiscovery => {
    const filtered = filterDirectlyFollowsGraph(traces, fullDfg, filter);
    return {
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
): ProcessDiscovery => createProcessDiscovery(log)(filter);
