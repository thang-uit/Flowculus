import { describe, expect, it } from 'vitest';
import type { ProcessModel } from '@flowculus/process-model';
import { arrangeNodes } from './canvas-arrange';

const model: ProcessModel = {
  schemaVersion: 1,
  id: 'arrange',
  name: 'Arrange',
  nodes: {
    a: {
      id: 'a',
      label: 'A',
      kind: 'task',
      bounds: { x: 12, y: 21, width: 100, height: 50 },
    },
    b: {
      id: 'b',
      label: 'B',
      kind: 'task',
      bounds: { x: 240, y: 70, width: 80, height: 50 },
    },
    c: {
      id: 'c',
      label: 'C',
      kind: 'task',
      bounds: { x: 490, y: 150, width: 100, height: 50 },
    },
    other: {
      id: 'other',
      label: 'Other',
      kind: 'task',
      bounds: { x: 99, y: 99, width: 100, height: 50 },
    },
  },
  edges: {},
};

describe('arrange selected nodes', () => {
  it('aligns edges and never moves unrelated nodes', () => {
    const next = arrangeNodes(model, ['a', 'b'], 'right');
    expect(next.nodes.a.bounds?.x).toBe(220);
    expect(next.nodes.b.bounds?.x).toBe(240);
    expect(next.nodes.other).toEqual(model.nodes.other);
  });
  it('distributes three centres and snaps to the grid', () => {
    const next = arrangeNodes(model, ['a', 'b', 'c'], 'horizontal');
    const centres = ['a', 'b', 'c'].map(
      (id) => next.nodes[id]!.bounds!.x + next.nodes[id]!.bounds!.width / 2,
    );
    expect(centres[1] - centres[0]).toBeCloseTo(centres[2] - centres[1]);
    expect(arrangeNodes(model, ['a'], 'grid').nodes.a.bounds).toMatchObject({
      x: 10,
      y: 20,
    });
    expect(arrangeNodes(model, ['a', 'b'], 'horizontal')).toBe(model);
  });
});
