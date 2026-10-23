import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import {
  addNodeAt,
  appendNodeAfter,
  changeNodeKind,
  connectNodes,
  moveNodes,
  removeElements,
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
