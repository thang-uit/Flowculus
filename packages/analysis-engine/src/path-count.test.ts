import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import { countProcessPaths } from './path-count';

const model = (
  nodes: ProcessModel['nodes'],
  edges: ProcessModel['edges'],
): ProcessModel => ({
  schemaVersion: 1,
  id: 'paths',
  name: 'Path fixture',
  nodes,
  edges,
});

describe('countProcessPaths', () => {
  it('counts a sequential route as one path', () => {
    const report = countProcessPaths(
      model(
        {
          start: { id: 'start', label: 'Start', kind: 'start' },
          task: { id: 'task', label: 'Task', kind: 'task' },
          end: { id: 'end', label: 'End', kind: 'end' },
        },
        {
          a: { id: 'a', source: 'start', target: 'task' },
          b: { id: 'b', source: 'task', target: 'end' },
        },
      ),
    );
    expect(report).toMatchObject({ status: 'ready', count: 1, endNodeIds: ['end'] });
  });

  it('counts both branches of a diamond independently', () => {
    const report = countProcessPaths(
      model(
        {
          start: { id: 'start', label: 'Start', kind: 'start' },
          split: { id: 'split', label: 'Split', kind: 'gateway', gatewayKind: 'xor' },
          left: { id: 'left', label: 'Left', kind: 'task' },
          right: { id: 'right', label: 'Right', kind: 'task' },
          join: { id: 'join', label: 'Join', kind: 'gateway', gatewayKind: 'xor' },
          end: { id: 'end', label: 'End', kind: 'end' },
        },
        {
          a: { id: 'a', source: 'start', target: 'split' },
          b: { id: 'b', source: 'split', target: 'left' },
          c: { id: 'c', source: 'split', target: 'right' },
          d: { id: 'd', source: 'left', target: 'join' },
          e: { id: 'e', source: 'right', target: 'join' },
          f: { id: 'f', source: 'join', target: 'end' },
        },
      ),
    );
    expect(report.count).toBe(2);
    expect(report.formula).toBe('P = 2');
  });

  it('does not count message flows and reports cycles explicitly', () => {
    const report = countProcessPaths(
      model(
        {
          start: { id: 'start', label: 'Start', kind: 'start' },
          task: { id: 'task', label: 'Task', kind: 'task' },
          end: { id: 'end', label: 'End', kind: 'end' },
        },
        {
          a: { id: 'a', source: 'start', target: 'task', kind: 'sequence' },
          loop: { id: 'loop', source: 'task', target: 'task', kind: 'sequence' },
          b: { id: 'b', source: 'task', target: 'end', kind: 'sequence' },
          note: { id: 'note', source: 'start', target: 'end', kind: 'message' },
        },
      ),
    );
    expect(report.status).toBe('cyclic');
    expect(report.count).toBeNull();
  });

  it('counts a selected sub-process from n1 to n8', () => {
    const report = countProcessPaths(
      model(
        {
          n1: { id: 'n1', label: 'n1', kind: 'task' },
          n2: { id: 'n2', label: 'n2', kind: 'gateway', gatewayKind: 'xor' },
          n3: { id: 'n3', label: 'n3', kind: 'task' },
          n4: { id: 'n4', label: 'n4', kind: 'task' },
          n5: { id: 'n5', label: 'n5', kind: 'task' },
          n6: { id: 'n6', label: 'n6', kind: 'task' },
          n7: { id: 'n7', label: 'n7', kind: 'task' },
          n8: { id: 'n8', label: 'n8', kind: 'task' },
        },
        {
          e1: { id: 'e1', source: 'n1', target: 'n2' },
          e2: { id: 'e2', source: 'n2', target: 'n3' },
          e3: { id: 'e3', source: 'n2', target: 'n4' },
          e4: { id: 'e4', source: 'n3', target: 'n5' },
          e5: { id: 'e5', source: 'n4', target: 'n6' },
          e6: { id: 'e6', source: 'n5', target: 'n7' },
          e7: { id: 'e7', source: 'n6', target: 'n7' },
          e8: { id: 'e8', source: 'n7', target: 'n8' },
        },
      ),
      { startNodeId: 'n1', endNodeIds: ['n8'] },
    );

    expect(report).toMatchObject({
      status: 'ready',
      count: 2,
      startNodeId: 'n1',
      endNodeIds: ['n8'],
      formula: 'P(n1 → n8) = 2',
    });
  });

  it('reports a safe limit instead of enumerating an exploding graph', () => {
    const nodes: ProcessModel['nodes'] = {
      start: { id: 'start', label: 'Start', kind: 'start' },
      end: { id: 'end', label: 'End', kind: 'end' },
    };
    const edges: ProcessModel['edges'] = {};
    let previous = 'start';
    for (let index = 0; index < 4; index += 1) {
      const split = `split-${index}`;
      const left = `left-${index}`;
      const right = `right-${index}`;
      nodes[split] = { id: split, label: split, kind: 'gateway', gatewayKind: 'xor' };
      nodes[left] = { id: left, label: left, kind: 'task' };
      nodes[right] = { id: right, label: right, kind: 'task' };
      edges[`to-${split}`] = { id: `to-${split}`, source: previous, target: split };
      edges[`left-${index}`] = { id: `left-${index}`, source: split, target: left };
      edges[`right-${index}`] = { id: `right-${index}`, source: split, target: right };
      const next = `merge-${index}`;
      nodes[next] = { id: next, label: next, kind: 'task' };
      edges[`left-merge-${index}`] = {
        id: `left-merge-${index}`,
        source: left,
        target: next,
      };
      edges[`right-merge-${index}`] = {
        id: `right-merge-${index}`,
        source: right,
        target: next,
      };
      previous = next;
    }
    edges.final = { id: 'final', source: previous, target: 'end' };

    const report = countProcessPaths(model(nodes, edges), { maxPaths: 4 });
    expect(report.status).toBe('limit');
    expect(report.count).toBeNull();
    expect(report.formula).toBe('P > 4');
  });
});
