export type ProcessNodeKind =
  | 'start'
  | 'task'
  | 'gateway'
  | 'end'
  | 'event'
  | 'subprocess'
  | 'data'
  | 'annotation'
  | 'unknown';

export type GatewayKind = 'xor' | 'and' | 'or' | 'eventBased' | 'complex';

export interface TaskCost {
  /** Hourly labour/resource rate used by the book's cost flow analysis. */
  resourceRatePerHour?: number;
  /** Fixed cost incurred every time the task executes. */
  otherCostPerExecution?: number;
  currency?: string;
  resourcePoolId?: string;
  /** Number of parallel resources in the pool, used for theoretical capacity. */
  resourceCount?: number;
}

export type ProcessMetadataValue = string | number | boolean;

export interface ProcessNode {
  id: string;
  label: string;
  kind: ProcessNodeKind;
  gatewayKind?: GatewayKind;
  /** Average elapsed task time, including waiting time, in minutes. */
  durationMinutes?: number;
  /** Average hands-on work time in minutes. Defaults to duration when omitted. */
  processingMinutes?: number;
  /** Optional explicit waiting time in minutes. */
  waitingMinutes?: number;
  cost?: TaskCost;
  /** Explicit probability that this node's body is repeated. */
  reworkProbability?: number;
  /** Original draw.io cell id when the model came from a diagram. */
  drawioCellId?: string;
  metadata?: Record<string, ProcessMetadataValue>;
}

export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  /** Branching probability for XOR decisions, expressed from 0 to 1. */
  probability?: number;
  condition?: string;
  kind?: 'sequence' | 'message' | 'association' | 'unknown';
  reworkProbability?: number;
  drawioCellId?: string;
  metadata?: Record<string, ProcessMetadataValue>;
}

export interface ProcessModel {
  schemaVersion: 1;
  id: string;
  name: string;
  nodes: Record<string, ProcessNode>;
  edges: Record<string, ProcessEdge>;
  metadata?: Record<string, ProcessMetadataValue>;
}

/**
 * Only sequence flows advance a token through the process for flow analysis.
 * Message flows and associations may be present in a BPMN/draw.io document,
 * but treating them as control-flow edges would add phantom work or cycles.
 * An omitted kind is kept backward-compatible with the original CSV/model
 * format and is therefore treated as a sequence flow.
 */
export const isSequenceFlowEdge = (edge: ProcessEdge): boolean =>
  edge.kind == null || edge.kind === 'sequence';

const createModelId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `model-${Date.now().toString(36)}`;
};

export const createEmptyProcessModel = (name = 'Untitled process'): ProcessModel => ({
  schemaVersion: 1,
  id: createModelId(),
  name,
  nodes: {},
  edges: {},
});
