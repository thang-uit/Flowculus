import { z } from 'zod';

import { isSequenceFlowEdge, type ProcessModel } from '@flowculus/process-model';

const nodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum([
    'start',
    'task',
    'gateway',
    'end',
    'event',
    'subprocess',
    'data',
    'annotation',
    'unknown',
  ]),
  gatewayKind: z.enum(['xor', 'and', 'or', 'eventBased', 'complex']).optional(),
  durationMinutes: z.number().finite().nonnegative().optional(),
  processingMinutes: z.number().finite().nonnegative().optional(),
  waitingMinutes: z.number().finite().nonnegative().optional(),
  cost: z
    .object({
      resourceRatePerHour: z.number().finite().nonnegative().optional(),
      otherCostPerExecution: z.number().finite().nonnegative().optional(),
      currency: z.string().min(1).optional(),
      resourcePoolId: z.string().min(1).optional(),
      resourceCount: z.number().finite().int().positive().optional(),
    })
    .optional(),
  reworkProbability: z.number().finite().min(0).lt(1).optional(),
  drawioCellId: z.string().min(1).optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  probability: z.number().finite().min(0).max(1).optional(),
  condition: z.string().optional(),
  kind: z.enum(['sequence', 'message', 'association', 'unknown']).optional(),
  reworkProbability: z.number().finite().min(0).lt(1).optional(),
  drawioCellId: z.string().min(1).optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const processModelSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.record(z.string(), nodeSchema),
  edges: z.record(z.string(), edgeSchema),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export interface ModelIssue {
  code: string;
  message: string;
  path: string;
}

export interface ModelValidationResult {
  valid: boolean;
  issues: ModelIssue[];
}

export const validateProcessModel = (model: unknown): ModelValidationResult => {
  const parsed = processModelSchema.safeParse(model);

  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.join('.'),
      })),
    };
  }

  const value = parsed.data as ProcessModel;
  const issues: ModelIssue[] = [];

  for (const edge of Object.values(value.edges)) {
    if (!value.nodes[edge.source]) {
      issues.push({
        code: 'missing_source',
        message: `Edge ${edge.id} references a missing source node.`,
        path: `edges.${edge.id}.source`,
      });
    }

    if (!value.nodes[edge.target]) {
      issues.push({
        code: 'missing_target',
        message: `Edge ${edge.id} references a missing target node.`,
        path: `edges.${edge.id}.target`,
      });
    }
  }

  for (const node of Object.values(value.nodes)) {
    if (
      node.durationMinutes != null &&
      node.processingMinutes != null &&
      node.processingMinutes > node.durationMinutes
    ) {
      issues.push({
        code: 'processing_exceeds_cycle_time',
        message: `Node ${node.label} processing time cannot exceed its cycle time.`,
        path: `nodes.${node.id}.processingMinutes`,
      });
    }
    if (
      node.durationMinutes != null &&
      node.waitingMinutes != null &&
      node.waitingMinutes > node.durationMinutes
    ) {
      issues.push({
        code: 'waiting_exceeds_cycle_time',
        message: `Node ${node.label} waiting time cannot exceed its cycle time.`,
        path: `nodes.${node.id}.waitingMinutes`,
      });
    }
    if (
      node.durationMinutes != null &&
      node.processingMinutes != null &&
      node.waitingMinutes != null &&
      node.processingMinutes + node.waitingMinutes > node.durationMinutes + 1e-9
    ) {
      issues.push({
        code: 'time_components_exceed_cycle_time',
        message: `Node ${node.label} processing and waiting time cannot exceed its cycle time together.`,
        path: `nodes.${node.id}`,
      });
    }
    if (node.kind !== 'gateway') continue;
    const outgoing = Object.values(value.edges).filter(
      (edge) => edge.source === node.id && isSequenceFlowEdge(edge),
    );
    if (
      (node.gatewayKind === 'xor' || node.gatewayKind === 'or') &&
      outgoing.length > 1
    ) {
      const missingProbability = outgoing.some((edge) => edge.probability == null);
      const probabilitySum = outgoing.reduce(
        (sum, edge) => sum + (edge.probability ?? 0),
        0,
      );
      if (missingProbability) {
        issues.push({
          code: 'missing_branch_probability',
          message: `${node.gatewayKind.toUpperCase()} gateway ${node.label} needs a probability on every outgoing connector.`,
          path: `nodes.${node.id}`,
        });
      } else if (node.gatewayKind === 'xor' && Math.abs(probabilitySum - 1) > 1e-6) {
        issues.push({
          code: 'invalid_branch_probability_sum',
          message: `XOR gateway ${node.label} probabilities must sum to 1 (received ${probabilitySum}).`,
          path: `nodes.${node.id}`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
};
