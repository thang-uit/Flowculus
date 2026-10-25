import type { GatewayKind } from './gateway-kind';
export type { GatewayKind } from './gateway-kind';

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

/**
 * Metadata keys shared by every adapter (draw.io, CSV, process mining) and the
 * domain packages. A value of `true` on an `inferred*` key means the semantic
 * was guessed from a shape, a label or an event log and has not been confirmed
 * by a person yet; `confirmed` records that a person reviewed it.
 */
export const SEMANTIC_METADATA_KEYS = {
  inferredKind: 'flowculus-inferred-kind',
  inferredGatewayKind: 'flowculus-inferred-gateway-kind',
  inferredRework: 'flowculus-inferred-rework',
  inferredEdgeKind: 'flowculus-inferred-edge-kind',
  inferredProbability: 'flowculus-inferred-probability',
  confirmed: 'flowculus-confirmed',
  /** Explicit split→join pairing for AND/OR blocks (id of the join gateway). */
  joinId: 'flowculus-join-id',
  /** Native BPMN construct kept in the file but not modelled exactly. */
  unsupportedShape: 'flowculus-unsupported-shape',
  /** Original BPMN subtype, e.g. `callActivity`, `timer`, `terminate`. */
  bpmnType: 'flowculus-bpmn-type',
  /** Number of pools/lanes/groups kept in the draw.io page but not analysed. */
  containerCount: 'flowculus-container-count',
} as const;

export type SemanticMetadataKey =
  (typeof SEMANTIC_METADATA_KEYS)[keyof typeof SEMANTIC_METADATA_KEYS];

/** Kinds that move a token (BPMN flow nodes), as opposed to artifacts. */
export const isFlowNodeKind = (kind: ProcessNodeKind): boolean =>
  kind !== 'data' && kind !== 'annotation';

export const isActivityKind = (kind: ProcessNodeKind): boolean =>
  kind === 'task' || kind === 'subprocess';

/**
 * Absolute canvas geometry in diagram units (draw.io pixels). Optional so that
 * CSV/event-log models without coordinates stay valid; the web layer lays them
 * out deterministically before they are shown.
 */
export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessNode {
  id: string;
  label: string;
  kind: ProcessNodeKind;
  gatewayKind?: GatewayKind;
  /**
   * Observed elapsed cycle time per execution (work + waiting), in minutes.
   * When present it is the authoritative cycle time of the node.
   */
  durationMinutes?: number;
  /** Hands-on processing time T in minutes; it feeds TCT, cost and CPM. */
  processingMinutes?: number;
  /** Waiting time Wq in minutes. Missing waiting time counts as 0. */
  waitingMinutes?: number;
  cost?: TaskCost;
  /** Explicit probability that this node's body is repeated. */
  reworkProbability?: number;
  /** Original draw.io cell id when the model came from a diagram. */
  drawioCellId?: string;
  /** Canvas geometry. */
  bounds?: NodeBounds;
  metadata?: Record<string, ProcessMetadataValue>;
}

export const EDGE_ATTACHMENT_SIDES = ['top', 'right', 'bottom', 'left'] as const;
export type EdgeAttachmentSide = (typeof EDGE_ATTACHMENT_SIDES)[number];

export const isEdgeAttachmentSide = (value: unknown): value is EdgeAttachmentSide =>
  EDGE_ATTACHMENT_SIDES.some((side) => side === value);

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
  /** Presentation-only route; never changes control-flow semantics. */
  routing?: {
    style: 'orthogonal' | 'straight' | 'curved';
    waypoints: Array<{ x: number; y: number }>;
    /** Omitted sides use automatic routing; explicit sides stay attached on move/resize. */
    sourceSide?: EdgeAttachmentSide;
    targetSide?: EdgeAttachmentSide;
  };
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

/**
 * Default canvas size per semantic kind. Shared by the canvas, the draw.io
 * exporter and the auto-layout so a node keeps one footprint everywhere.
 */
export const DEFAULT_NODE_SIZE: Record<
  ProcessNodeKind,
  { width: number; height: number }
> = {
  start: { width: 44, height: 44 },
  end: { width: 44, height: 44 },
  event: { width: 44, height: 44 },
  gateway: { width: 56, height: 56 },
  task: { width: 176, height: 84 },
  subprocess: { width: 184, height: 92 },
  data: { width: 52, height: 64 },
  annotation: { width: 168, height: 64 },
  unknown: { width: 160, height: 80 },
};

export const getNodeBounds = (node: ProcessNode): NodeBounds =>
  node.bounds ?? { x: 0, y: 0, ...DEFAULT_NODE_SIZE[node.kind] };

export { BPMN_GATEWAY_MARKERS, type BpmnMarkerElement } from './bpmn-symbols';
