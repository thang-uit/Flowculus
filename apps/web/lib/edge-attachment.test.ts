import { describe, expect, it } from 'vitest';
import type { ProcessModel } from '@flowculus/process-model';
import { processModelSchema } from '@flowculus/validation';
import { findEdgeAttachment } from './edge-attachment';
import { toFlowEdges } from './canvas-flow';

const model: ProcessModel = {
  schemaVersion: 1,
  id: 'ports',
  name: 'Ports',
  nodes: {
    a: {
      id: 'a',
      kind: 'task',
      label: 'A',
      bounds: { x: 0, y: 0, width: 100, height: 60 },
    },
    g: {
      id: 'g',
      kind: 'gateway',
      gatewayKind: 'xor',
      label: 'G',
      bounds: { x: 250, y: 0, width: 56, height: 56 },
    },
    s: {
      id: 's',
      kind: 'start',
      label: 'S',
      bounds: { x: 450, y: 0, width: 44, height: 44 },
    },
    b: {
      id: 'b',
      kind: 'task',
      label: 'B',
      bounds: { x: 250, y: 160, width: 100, height: 60 },
    },
  },
  edges: {
    e: { id: 'e', source: 'a', target: 'g' },
    duplicate: { id: 'duplicate', source: 'a', target: 'b' },
  },
};

describe('connector attachment contract', () => {
  it('snaps to the closest tip of the same gateway and keeps screen-space tolerance at any zoom', () => {
    for (const zoom of [0.15, 0.5, 1, 2.5]) {
      const cursor = { x: (278 * zoom + 1) / zoom, y: (56 * zoom + 2) / zoom };
      expect(findEdgeAttachment(model, 'e', 'target', cursor, 20 / zoom)).toMatchObject({
        nodeId: 'g',
        side: 'bottom',
        point: { x: 278, y: 56 },
      });
    }
    expect(findEdgeAttachment(model, 'e', 'target', { x: 500, y: 500 }, 20)).toBeNull();
    expect(findEdgeAttachment(model, 'e', 'target', { x: NaN, y: 0 }, 20)).toBeNull();
  });
  it('rejects self, duplicate, into-start, and stale edge drops', () => {
    expect(findEdgeAttachment(model, 'e', 'target', { x: 100, y: 30 }, 20)).toBeNull();
    // Broad low-zoom snap areas must not jump past a self-drop to a different shape.
    expect(findEdgeAttachment(model, 'e', 'target', { x: 100, y: 30 }, 200)).toBeNull();
    expect(findEdgeAttachment(model, 'e', 'target', { x: 250, y: 190 }, 20)).toBeNull();
    expect(findEdgeAttachment(model, 'e', 'target', { x: 450, y: 22 }, 20)).toBeNull();
    expect(
      findEdgeAttachment(model, 'missing', 'target', { x: 278, y: 56 }, 20),
    ).toBeNull();
  });
  it('maps automatic and pinned ports to React Flow consistently and validates serialized sides', () => {
    expect(toFlowEdges(model, new Set(), null)[0]).toMatchObject({
      sourceHandle: 'right',
      targetHandle: 'left',
    });
    const pinned = {
      ...model,
      edges: {
        e: {
          ...model.edges.e,
          routing: {
            style: 'orthogonal' as const,
            sourceSide: 'top' as const,
            targetSide: 'bottom' as const,
            waypoints: [],
          },
        },
      },
    };
    expect(toFlowEdges(pinned, new Set(), null)[0]).toMatchObject({
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
    expect(processModelSchema.parse(pinned).edges.e.routing).toEqual(
      pinned.edges.e.routing,
    );
    expect(
      processModelSchema.safeParse({
        ...pinned,
        edges: {
          e: {
            ...pinned.edges.e,
            routing: { ...pinned.edges.e.routing, targetSide: 'diagonal' },
          },
        },
      }).success,
    ).toBe(false);
  });
});
