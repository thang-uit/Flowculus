import { isSequenceFlowEdge, type ProcessModel } from '@flowculus/process-model';

import { nodeParams, type Diagnostic } from './diagnostics';
import { processModelSchema } from './schema';

const TIME_TOLERANCE = 1e-9;
const PROBABILITY_TOLERANCE = 1e-6;

export interface ModelStructureResult {
  /** The parsed model when the schema matched; undefined otherwise. */
  model?: ProcessModel;
  diagnostics: Diagnostic[];
}

/**
 * Schema, referential integrity and per-node time consistency. These are hard
 * errors: a model that fails them cannot be analysed at all.
 */
export const validateModelStructure = (model: unknown): ModelStructureResult => {
  const parsed = processModelSchema.safeParse(model);
  if (!parsed.success) {
    return {
      diagnostics: parsed.error.issues.map((issue) => ({
        code: 'schema-invalid',
        severity: 'error',
        impact: 'invalid',
        path: issue.path.join('.'),
        params: { detail: issue.code },
      })),
    };
  }

  const value = parsed.data as ProcessModel;
  const diagnostics: Diagnostic[] = [];

  for (const edge of Object.values(value.edges)) {
    if (!value.nodes[edge.source]) {
      diagnostics.push({
        code: 'edge-missing-source',
        severity: 'error',
        impact: 'invalid',
        path: `edges.${edge.id}.source`,
        params: { edgeId: edge.id, nodeId: edge.source },
      });
    }
    if (!value.nodes[edge.target]) {
      diagnostics.push({
        code: 'edge-missing-target',
        severity: 'error',
        impact: 'invalid',
        path: `edges.${edge.id}.target`,
        params: { edgeId: edge.id, nodeId: edge.target },
      });
    }
  }

  for (const node of Object.values(value.nodes)) {
    const {
      durationMinutes: cycle,
      processingMinutes: work,
      waitingMinutes: wait,
    } = node;
    if (cycle == null) continue;
    if (work != null && work > cycle + TIME_TOLERANCE) {
      diagnostics.push({
        code: 'processing-exceeds-cycle-time',
        severity: 'error',
        impact: 'invalid',
        path: `nodes.${node.id}.processingMinutes`,
        params: nodeParams(node),
      });
    }
    if (wait != null && wait > cycle + TIME_TOLERANCE) {
      diagnostics.push({
        code: 'waiting-exceeds-cycle-time',
        severity: 'error',
        impact: 'invalid',
        path: `nodes.${node.id}.waitingMinutes`,
        params: nodeParams(node),
      });
    }
    if (work != null && wait != null && work + wait > cycle + TIME_TOLERANCE) {
      diagnostics.push({
        code: 'time-components-exceed-cycle-time',
        severity: 'error',
        impact: 'invalid',
        path: `nodes.${node.id}`,
        params: nodeParams(node),
      });
    }
  }

  return { model: value, diagnostics };
};

/**
 * Branch probability rules for decision splits. XOR branches must be complete
 * and sum to 1; inclusive OR branches must be complete but are independent.
 */
export const validateBranchProbabilities = (model: ProcessModel): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const node of Object.values(model.nodes)) {
    if (node.kind !== 'gateway') continue;
    // An untyped gateway is exclusive, as in BPMN 2.0.
    const gatewayKind = node.gatewayKind ?? 'xor';
    if (gatewayKind !== 'xor' && gatewayKind !== 'or') continue;
    const outgoing = Object.values(model.edges).filter(
      (edge) =>
        edge.source === node.id && isSequenceFlowEdge(edge) && model.nodes[edge.target],
    );
    if (outgoing.length < 2) continue;
    if (outgoing.some((edge) => edge.probability == null)) {
      diagnostics.push({
        code: 'branch-probability-missing',
        severity: 'error',
        impact: 'invalid',
        path: `nodes.${node.id}`,
        params: { ...nodeParams(node), gatewayKind },
      });
      continue;
    }
    const sum = outgoing.reduce((total, edge) => total + (edge.probability ?? 0), 0);
    if (gatewayKind === 'xor' && Math.abs(sum - 1) > PROBABILITY_TOLERANCE) {
      diagnostics.push({
        code: 'branch-probability-sum',
        severity: 'error',
        impact: 'invalid',
        path: `nodes.${node.id}`,
        params: { ...nodeParams(node), sum: Number(sum.toFixed(6)) },
      });
    }
  }
  return diagnostics;
};

// ── Backward-compatible API ─────────────────────────────────────────────────

export interface ModelIssue {
  code: string;
  message: string;
  path: string;
}

export interface ModelValidationResult {
  valid: boolean;
  issues: ModelIssue[];
}

const LEGACY_CODES: Partial<Record<Diagnostic['code'], string>> = {
  'edge-missing-source': 'missing_source',
  'edge-missing-target': 'missing_target',
  'processing-exceeds-cycle-time': 'processing_exceeds_cycle_time',
  'waiting-exceeds-cycle-time': 'waiting_exceeds_cycle_time',
  'time-components-exceed-cycle-time': 'time_components_exceed_cycle_time',
  'branch-probability-missing': 'missing_branch_probability',
  'branch-probability-sum': 'invalid_branch_probability_sum',
};

/** English text for the legacy API only; the product UI localises codes. */
const legacyMessage = (diagnostic: Diagnostic): string => {
  const label = String(diagnostic.params?.label ?? diagnostic.params?.edgeId ?? '');
  switch (diagnostic.code) {
    case 'edge-missing-source':
      return `Edge ${label} references a missing source node.`;
    case 'edge-missing-target':
      return `Edge ${label} references a missing target node.`;
    case 'processing-exceeds-cycle-time':
      return `Node ${label} processing time cannot exceed its cycle time.`;
    case 'waiting-exceeds-cycle-time':
      return `Node ${label} waiting time cannot exceed its cycle time.`;
    case 'time-components-exceed-cycle-time':
      return `Node ${label} processing and waiting time cannot exceed its cycle time together.`;
    case 'branch-probability-missing':
      return `${String(diagnostic.params?.gatewayKind ?? '').toUpperCase()} gateway ${label} needs a probability on every outgoing connector.`;
    case 'branch-probability-sum':
      return `XOR gateway ${label} probabilities must sum to 1 (received ${String(diagnostic.params?.sum)}).`;
    default:
      return `Invalid value at ${diagnostic.path ?? 'model'} (${String(diagnostic.params?.detail ?? diagnostic.code)}).`;
  }
};

/**
 * Schema + referential + time + branch-probability validation with the
 * original `{ valid, issues }` shape. New code should prefer
 * `validateModelStructure` and `validateProcessGraph`, which return
 * structured diagnostics.
 */
export const validateProcessModel = (model: unknown): ModelValidationResult => {
  const structure = validateModelStructure(model);
  const diagnostics = structure.model
    ? [...structure.diagnostics, ...validateBranchProbabilities(structure.model)]
    : structure.diagnostics;
  return {
    valid: diagnostics.length === 0,
    issues: diagnostics.map((diagnostic) => ({
      code:
        diagnostic.code === 'schema-invalid'
          ? String(diagnostic.params?.detail ?? 'invalid')
          : (LEGACY_CODES[diagnostic.code] ?? diagnostic.code),
      message: legacyMessage(diagnostic),
      path: diagnostic.path ?? '',
    })),
  };
};
