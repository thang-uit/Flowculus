export type EventLogFormat = 'csv' | 'xlsx' | 'json' | 'xes';

/** A raw, column-oriented view of an uploaded log before the user maps columns. */
export interface EventTable {
  format: EventLogFormat;
  headers: string[];
  rows: string[][];
}

export interface ColumnMapping {
  caseId: string;
  activity: string;
  /** Completion (or single) timestamp of the event. */
  timestamp: string;
  /** Optional start timestamp column; enables service vs waiting time. */
  startTimestamp?: string;
  /** Optional lifecycle column (XES `lifecycle:transition`): start/complete pairs. */
  lifecycle?: string;
  resource?: string;
  cost?: string;
}

export interface MiningEvent {
  caseId: string;
  activity: string;
  /** Completion time in epoch milliseconds (naive timestamps are read as UTC). */
  completeTime: number;
  startTime?: number;
  resource?: string;
  cost?: number;
}

export interface EventLog {
  name: string;
  events: MiningEvent[];
  hasStartTimes: boolean;
  hasCosts: boolean;
}

export interface EventLogBuildResult {
  log: EventLog;
  skippedRows: number;
  invalidTimestamps: number;
  invalidStartTimes: number;
}

export interface Trace {
  caseId: string;
  events: MiningEvent[];
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface EventLogStats {
  caseCount: number;
  eventCount: number;
  activityCount: number;
  resourceCount: number;
  variantCount: number;
  meanLeadTimeMs: number;
  medianLeadTimeMs: number;
  minLeadTimeMs: number;
  maxLeadTimeMs: number;
  firstEventTime: number | null;
  lastEventTime: number | null;
  meanCostPerCase: number | null;
  happyPathShare: number;
  hasStartTimes: boolean;
}

export interface DfgActivity {
  id: string;
  frequency: number;
  caseFrequency: number;
  /** Mean complete − start, when the log has start times. */
  meanServiceMs: number | null;
  /** Executions with measured start and completion times. */
  serviceSampleCount: number;
  meanCost: number | null;
  /** Most frequent resource and its share of the activity's executions. */
  mainResource: string | null;
  mainResourceShare: number;
  resources: string[];
  startCount: number;
  endCount: number;
}

export interface DfgEdge {
  id: string;
  source: string;
  target: string;
  frequency: number;
  /** Mean delay between `source` completing and `target` starting (or completing). */
  meanDurationMs: number;
  medianDurationMs: number;
  maxDurationMs: number;
}

export interface DirectlyFollowsGraph {
  activities: DfgActivity[];
  edges: DfgEdge[];
  maxActivityFrequency: number;
  maxEdgeFrequency: number;
  maxMeanDurationMs: number;
}

export interface TraceVariant {
  id: string;
  activities: string[];
  caseCount: number;
  share: number;
  meanLeadTimeMs: number;
  /** An activity occurs more than once: a loop, rework or repetition. */
  hasRepetition: boolean;
  isHappyPath: boolean;
  caseIds: string[];
}

export interface Bottleneck {
  kind: 'transition' | 'activity';
  id: string;
  source?: string;
  target?: string;
  activity?: string;
  frequency: number;
  meanDurationMs: number;
  /** Mean duration × frequency: observed cumulative time for this element. */
  totalDurationMs: number;
  /** Share of all transition (or service) time in the log. */
  share: number;
}

export interface DiscoveryFilter {
  /** Keep activities with frequency ≥ this share of the most frequent one (0–1). */
  minActivityShare: number;
  /** Keep edges with frequency ≥ this share of the most frequent edge (0–1). */
  minEdgeShare: number;
  /** Hide transitions faster than this mean duration, in hours (0 = off). */
  minTransitionHours: number;
}

export const DEFAULT_DISCOVERY_FILTER: DiscoveryFilter = {
  minActivityShare: 0,
  minEdgeShare: 0,
  minTransitionHours: 0,
};

export interface ProcessDiscovery {
  timePolicy: import('./business-calendar').TimePolicy;
  stats: EventLogStats;
  dfg: DirectlyFollowsGraph;
  variants: TraceVariant[];
  bottlenecks: Bottleneck[];
  filter: DiscoveryFilter;
  hiddenActivityCount: number;
  hiddenEdgeCount: number;
}
