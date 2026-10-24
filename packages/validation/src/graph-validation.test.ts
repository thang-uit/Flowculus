import { describe, expect, it } from 'vitest';
import type { ProcessEdge, ProcessModel, ProcessNode } from '@flowculus/process-model';

import { validateProcessGraph } from './index';

const model = (
  nodes: ProcessNode[],
  edges: ProcessEdge[],
  metadata?: ProcessModel['metadata'],
): ProcessModel => ({
  schemaVersion: 1,
  id: 'graph',
  name: 'Graph',
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  edges: Object.fromEntries(edges.map((edge) => [edge.id, edge])),
  metadata,
});

const start: ProcessNode = { id: 'start', label: 'Start', kind: 'start' };
const end: ProcessNode = { id: 'end', label: 'End', kind: 'end' };
const task = (id: string): ProcessNode => ({
  id,
  label: id.toUpperCase(),
  kind: 'task',
  durationMinutes: 5,
});
const flow = (id: string, source: string, target: string, patch = {}): ProcessEdge => ({
  id,
  source,
  target,
  ...patch,
});
const codes = (result: ReturnType<typeof validateProcessGraph>) =>
  result.diagnostics.map((diagnostic) => diagnostic.code);

describe('validateProcessGraph', () => {
  it('accepts a clean sequence without findings', () => {
    const result = validateProcessGraph(
      model([start, task('a'), end], [flow('e1', 'start', 'a'), flow('e2', 'a', 'end')]),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.entry).toMatchObject({ startNodeId: 'start', implicit: false });
  });

  it('never silently picks one of several start events', () => {
    const result = validateProcessGraph(
      model(
        [start, { id: 'start2', label: 'Second', kind: 'start' }, task('a'), end],
        [flow('e1', 'start', 'a'), flow('e2', 'start2', 'a'), flow('e3', 'a', 'end')],
      ),
    );
    expect(result.entry.startNodeId).toBeNull();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'multiple-start-events',
        impact: 'simulation-required',
        params: { count: 2 },
      }),
    );
  });

  it('uses a unique source node as an implicit start and says so', () => {
    const result = validateProcessGraph(
      model([task('a'), task('b'), end], [flow('e1', 'a', 'b'), flow('e2', 'b', 'end')]),
    );
    expect(result.entry).toMatchObject({ startNodeId: 'a', implicit: true });
    expect(codes(result)).toContain('implicit-start');
  });

  it('reports a missing start when no unique entry exists', () => {
    const result = validateProcessGraph(
      model(
        [task('a'), task('b'), end],
        [flow('e1', 'a', 'end'), flow('e2', 'b', 'end')],
      ),
    );
    expect(codes(result)).toContain('missing-start');
  });

  it('reports endpoint semantics for every flow kind', () => {
    const data: ProcessNode = { id: 'data', label: 'Data', kind: 'data' };
    const result = validateProcessGraph(
      model(
        [start, task('a'), end, data],
        [
          flow('e1', 'start', 'a'),
          flow('e2', 'a', 'end'),
          flow('e3', 'end', 'a'),
          flow('e4', 'a', 'start'),
          flow('e5', 'a', 'data'),
          flow('e6', 'a', 'end', { kind: 'association' }),
          flow('e7', 'data', 'a', { kind: 'message' }),
          flow('e8', 'a', 'end', { kind: 'unknown' }),
        ],
      ),
    );
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        'sequence-flow-from-end',
        'sequence-flow-into-start',
        'sequence-flow-artifact-endpoint',
        'association-without-artifact',
        'message-flow-artifact-endpoint',
        'unknown-edge-kind',
      ]),
    );
  });

  it('finds unreachable, orphan and disconnected parts', () => {
    const result = validateProcessGraph(
      model(
        [start, task('a'), end, task('island'), task('x'), task('y')],
        [flow('e1', 'start', 'a'), flow('e2', 'a', 'end'), flow('e3', 'x', 'y')],
      ),
    );
    const found = codes(result);
    expect(found).toContain('orphan-node');
    expect(found).toContain('disconnected-components');
    expect(found).toContain('unreachable-node');
  });

  it('flags a loop that can never reach an end', () => {
    const result = validateProcessGraph(
      model(
        [start, task('a'), task('b'), end],
        [flow('e1', 'start', 'a'), flow('e2', 'a', 'b'), flow('e3', 'b', 'a')],
      ),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'no-path-to-end', impact: 'simulation-required' }),
    );
  });

  it('checks branch probabilities: missing, wrong sum and ignored values', () => {
    const xor: ProcessNode = {
      id: 'xor',
      label: 'Choice',
      kind: 'gateway',
      gatewayKind: 'xor',
    };
    const and: ProcessNode = {
      id: 'and',
      label: 'Fork',
      kind: 'gateway',
      gatewayKind: 'and',
    };
    const missing = validateProcessGraph(
      model(
        [start, xor, task('a'), task('b'), end],
        [
          flow('e1', 'start', 'xor'),
          flow('e2', 'xor', 'a', { probability: 0.6 }),
          flow('e3', 'xor', 'b'),
          flow('e4', 'a', 'end'),
          flow('e5', 'b', 'end'),
        ],
      ),
    );
    expect(codes(missing)).toContain('branch-probability-missing');
    const wrongSum = validateProcessGraph(
      model(
        [start, xor, task('a'), task('b'), end],
        [
          flow('e1', 'start', 'xor'),
          flow('e2', 'xor', 'a', { probability: 0.6 }),
          flow('e3', 'xor', 'b', { probability: 0.6 }),
          flow('e4', 'a', 'end'),
          flow('e5', 'b', 'end'),
        ],
      ),
    );
    expect(codes(wrongSum)).toContain('branch-probability-sum');
    const ignored = validateProcessGraph(
      model(
        [start, and, task('a'), task('b'), { ...and, id: 'join', label: 'Join' }, end],
        [
          flow('e1', 'start', 'and'),
          flow('e2', 'and', 'a', { probability: 0.5 }),
          flow('e3', 'and', 'b'),
          flow('e4', 'a', 'join'),
          flow('e5', 'b', 'join'),
          flow('e6', 'join', 'end', { probability: 0.3 }),
        ],
      ),
    );
    expect(codes(ignored).filter((code) => code === 'probability-ignored')).toHaveLength(
      2,
    );
  });

  it('distinguishes implicit splits, joins, mixed and unsupported gateways', () => {
    const complex: ProcessNode = {
      id: 'complex',
      label: 'Complex',
      kind: 'gateway',
      gatewayKind: 'complex',
    };
    const result = validateProcessGraph(
      model(
        [start, task('a'), task('b'), task('c'), complex, end],
        [
          flow('e1', 'start', 'a'),
          flow('e2', 'a', 'b'),
          flow('e3', 'a', 'c'),
          flow('e4', 'b', 'complex'),
          flow('e5', 'c', 'complex'),
          flow('e6', 'complex', 'end'),
          flow('e7', 'complex', 'b'),
        ],
      ),
    );
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        'implicit-split',
        'implicit-join',
        'mixed-gateway',
        'unsupported-gateway-kind',
      ]),
    );
  });

  it('reports unknown and inferred semantics and unsupported native elements', () => {
    const result = validateProcessGraph(
      model(
        [
          start,
          { id: 'u', label: 'Unknown', kind: 'unknown' },
          {
            ...task('a'),
            gatewayKind: 'xor',
            metadata: {
              'flowculus-inferred-kind': true,
              'flowculus-unsupported-shape': 'boundary-event',
            },
          },
          end,
        ],
        [flow('e1', 'start', 'u'), flow('e2', 'u', 'a'), flow('e3', 'a', 'end')],
        { 'flowculus-container-count': 2 },
      ),
    );
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        'unknown-node-kind',
        'gateway-kind-on-non-gateway',
        'unsupported-element',
        'containers-not-modelled',
        'unconfirmed-semantics',
      ]),
    );
    expect(
      result.diagnostics.find((diagnostic) => diagnostic.code === 'unconfirmed-semantics')
        ?.params,
    ).toEqual({ count: 2 });
  });

  it('reports multiple ends as information and dead ends as implicit ends', () => {
    const result = validateProcessGraph(
      model(
        [start, task('a'), task('b'), end, { id: 'end2', label: 'End 2', kind: 'end' }],
        [
          flow('e1', 'start', 'a'),
          flow('e2', 'a', 'end'),
          flow('e3', 'start', 'end2'),
          flow('e4', 'a', 'b'),
        ],
      ),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'multiple-end-events', severity: 'info' }),
    );
    expect(codes(result)).toContain('implicit-end');
  });
});
