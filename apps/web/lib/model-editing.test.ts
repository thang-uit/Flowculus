import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import {
  addNodeAt,
  appendNodeAfter,
  changeNodeKind,
  connectNodes,
  moveNodes,
  removeElements,
  reconnectEdge,
  isValidNodeConnection,
  replaceEdge,
} from './model-editing';

const base: ProcessModel = {
  schemaVersion: 1,
  id: 'editing',
  name: 'Editing',
  nodes: {
    start: {
      id: 'start',
      label: 'Start',
      kind: 'start',
      bounds: { x: 0, y: 100, width: 44, height: 44 },
    },
    split: {
      id: 'split',
      label: 'OK?',
      kind: 'gateway',
      gatewayKind: 'xor',
      bounds: { x: 120, y: 94, width: 56, height: 56 },
    },
    a: {
      id: 'a',
      label: 'A',
      kind: 'task',
      bounds: { x: 260, y: 0, width: 176, height: 84 },
    },
    b: {
      id: 'b',
      label: 'B',
      kind: 'task',
      bounds: { x: 260, y: 200, width: 176, height: 84 },
    },
  },
  edges: { e1: { id: 'e1', source: 'start', target: 'split' } },
};

describe('model editing', () => {
  it('reattaches to another tip of the same gateway without changing semantics or bends', () => {
    const model = connectNodes(base, 'split', 'a', {
      sourceSide: 'right',
      targetSide: 'top',
    })!.model;
    const edge = Object.values(model.edges).find((edge) => edge.source === 'split')!;
    edge.routing!.waypoints = [{ x: 200, y: 180 }];
    const changed = reconnectEdge(model, edge.id, 'split', 'a', {
      sourceSide: 'bottom',
    })!;
    expect(changed.edges[edge.id]).toEqual({
      ...edge,
      routing: { ...edge.routing, sourceSide: 'bottom' },
    });
    expect(changed.edges.e1).toBe(model.edges.e1);
    expect(changed.nodes).toBe(model.nodes);
    expect(reconnectEdge(changed, edge.id, 'split', 'a', { sourceSide: 'bottom' })).toBe(
      changed,
    );
    const auto = reconnectEdge(changed, edge.id, 'split', 'a', {
      sourceSide: undefined,
    })!;
    expect(auto.edges[edge.id].routing?.sourceSide).toBeUndefined();
    expect(auto.edges[edge.id].routing?.targetSide).toBe('top');
  });

  it('uses the same validation for drop previews and commits, ignoring only the edited edge', () => {
    expect(isValidNodeConnection(base, 'start', 'split')).toBe(false);
    expect(isValidNodeConnection(base, 'start', 'split', 'e1')).toBe(true);
    expect(isValidNodeConnection(base, 'split', 'start', 'e1')).toBe(false);
    expect(isValidNodeConnection(base, 'split', 'split', 'e1')).toBe(false);
    expect(isValidNodeConnection(base, 'start', 'a', 'missing')).toBe(false);
    const invalid = JSON.parse('{"targetSide":"diagonal"}');
    expect(connectNodes(base, 'a', 'b', invalid)).toBeNull();
    expect(reconnectEdge(base, 'e1', 'start', 'split', invalid)).toBeNull();
  });

  it('keeps the unchanged end pinned and resets only the changed node’s automatic end', () => {
    const model: ProcessModel = {
      ...base,
      edges: {
        e1: {
          ...base.edges.e1,
          routing: {
            style: 'curved',
            waypoints: [{ x: 50, y: 10 }],
            sourceSide: 'right',
            targetSide: 'bottom',
          },
        },
      },
    };
    const changed = reconnectEdge(model, 'e1', 'start', 'a')!;
    expect(changed.edges.e1.routing).toEqual({
      style: 'curved',
      waypoints: [],
      sourceSide: 'right',
      targetSide: undefined,
    });
  });
  it('centres a dropped node exactly on the requested point', () => {
    const { model, nodeId } = addNodeAt(base, 'task', 'New', { x: 500, y: 300 });
    expect(model.nodes[nodeId]?.bounds).toEqual({
      x: 412,
      y: 258,
      width: 176,
      height: 84,
    });
    expect(model.nodes.start).toBe(base.nodes.start);
  });

  it('splits XOR probabilities automatically and keeps typed ones', () => {
    const first = connectNodes(base, 'split', 'a')!.model;
    const second = connectNodes(first, 'split', 'b')!.model;
    const probabilities = Object.values(second.edges)
      .filter((edge) => edge.source === 'split')
      .map((edge) => edge.probability);
    expect(probabilities).toEqual([0.5, 0.5]);
    const manualEdge = Object.values(second.edges).find((edge) => edge.target === 'a')!;
    const typed = replaceEdge(second, { ...manualEdge, probability: 0.7 });
    const withThird = connectNodes(
      { ...typed, nodes: { ...typed.nodes, c: { id: 'c', label: 'C', kind: 'task' } } },
      'split',
      'c',
    )!.model;
    const shares = Object.values(withThird.edges)
      .filter((edge) => edge.source === 'split')
      .map((edge) => edge.probability ?? 0);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6);
    expect(
      Object.values(withThird.edges).find((edge) => edge.target === 'a')?.probability,
    ).toBe(0.7);
  });

  it('refuses duplicate, self and into-start connections', () => {
    expect(connectNodes(base, 'start', 'split')).toBeNull();
    expect(connectNodes(base, 'a', 'a')).toBeNull();
    expect(connectNodes(base, 'a', 'start')).toBeNull();
  });

  it('reconnects an edge with stable ID, clears stale bends and rejects invalid endpoints', () => {
    const model = {
      ...base,
      edges: {
        ...base.edges,
        e1: {
          ...base.edges.e1,
          routing: { style: 'curved' as const, waypoints: [{ x: 90, y: 40 }] },
        },
      },
    };
    const moved = reconnectEdge(model, 'e1', 'start', 'a');
    expect(moved?.edges.e1).toMatchObject({
      id: 'e1',
      source: 'start',
      target: 'a',
      routing: { style: 'curved', waypoints: [] },
    });
    expect(reconnectEdge(model, 'e1', 'a', 'start')).toBeNull();
    expect(reconnectEdge(model, 'e1', 'a', 'a')).toBeNull();
    expect(reconnectEdge(model, 'e1', 'missing', 'a')).toBeNull();
  });

  it('removes nodes with their edges and rebalances the remaining branches', () => {
    const connected = connectNodes(
      connectNodes(base, 'split', 'a')!.model,
      'split',
      'b',
    )!.model;
    const removed = removeElements(connected, ['b'], []);
    expect(removed.nodes.b).toBeUndefined();
    const remaining = Object.values(removed.edges).filter(
      (edge) => edge.source === 'split',
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.probability).toBeUndefined();
  });

  it('appends the next step to the right and connects it', () => {
    const result = appendNodeAfter(base, 'a', 'end', 'Done')!;
    const end = result.model.nodes[result.nodeId]!;
    expect(end.kind).toBe('end');
    expect(end.bounds!.x).toBeGreaterThan(436);
    expect(
      Object.values(result.model.edges).some(
        (edge) => edge.source === 'a' && edge.target === end.id,
      ),
    ).toBe(true);
  });

  it('moves nodes only when the position changed', () => {
    expect(moveNodes(base, { a: { x: 260, y: 0 } })).toBe(base);
    expect(moveNodes(base, { a: { x: 300, y: 10 } }).nodes.a?.bounds).toMatchObject({
      x: 300,
      y: 10,
    });
  });

  it('changes kind around the same centre and clears inferred flags', () => {
    const inferred = { ...base.nodes.a!, metadata: { 'flowculus-inferred-kind': true } };
    const gateway = changeNodeKind(inferred, 'gateway', 'and');
    expect(gateway).toMatchObject({ kind: 'gateway', gatewayKind: 'and' });
    expect(gateway.bounds).toEqual({ x: 320, y: 14, width: 56, height: 56 });
    expect(gateway.metadata?.['flowculus-inferred-kind']).toBeUndefined();
  });
});
