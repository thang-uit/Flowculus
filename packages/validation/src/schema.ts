import { z } from 'zod';

const metadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional();

const boundsSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

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
  bounds: boundsSchema.optional(),
  metadata: metadataSchema,
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
  routing: z
    .object({
      style: z.enum(['orthogonal', 'straight', 'curved']),
      sourceSide: z.enum(['top', 'right', 'bottom', 'left']).optional(),
      targetSide: z.enum(['top', 'right', 'bottom', 'left']).optional(),
      waypoints: z
        .array(z.object({ x: z.number().finite(), y: z.number().finite() }))
        .max(32),
    })
    .optional(),
  metadata: metadataSchema,
});

/** Structural (serialization) schema of a `ProcessModel`, schema version 1. */
export const processModelSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
    nodes: z.record(z.string(), nodeSchema),
    edges: z.record(z.string(), edgeSchema),
    metadata: metadataSchema,
  })
  .superRefine((model, context) => {
    for (const collection of ['nodes', 'edges'] as const)
      for (const [key, element] of Object.entries(model[collection]))
        if (key !== element.id)
          context.addIssue({
            code: 'custom',
            path: [collection, key, 'id'],
            message: 'Element ID must match its record key.',
          });
  });
