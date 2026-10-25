import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import { checkModelConformance, createEventLog } from './index';

const model: ProcessModel = {
  schemaVersion: 1,
  id: 'reference',
  name: 'Approved flow',
  nodes: {
    s: { id: 's', label: 'Start', kind: 'start' },
    a: { id: 'a', label: 'Receive', kind: 'task' },
    g: { id: 'g', label: 'Decision', kind: 'gateway', gatewayKind: 'xor' },
    b: { id: 'b', label: 'Approve', kind: 'task' },
    c: { id: 'c', label: 'Reject', kind: 'task' },
    j: { id: 'j', label: 'Merge', kind: 'gateway', gatewayKind: 'xor' },
    e: { id: 'e', label: 'End', kind: 'end' },
  },
  edges: Object.fromEntries(
    [
      ['s', 'a'],
      ['a', 'g'],
      ['g', 'b'],
      ['g', 'c'],
      ['b', 'j'],
      ['c', 'j'],
      ['j', 'e'],
    ].map(([source, target], index) => [
      String(index),
      { id: String(index), source, target },
    ]),
  ),
};

const log = (cases: string[][]) =>
  createEventLog(
    'events',
    cases.flatMap((activities, caseIndex) =>
      activities.map((activity, index) => ({
        caseId: String(caseIndex),
        activity,
        completeTime: index,
      })),
    ),
  );

describe('model conformance', () => {
  it('replays both approved XOR branches and flags a skipped task', () => {
    const result = checkModelConformance(
      log([['Receive', 'Approve'], ['Receive', 'Reject'], ['Approve']]),
      model,
    );
    expect(result).toMatchObject({
      status: 'ready',
      examinedCases: 3,
      compatibleCases: 2,
    });
    expect(result.examples[0]).toMatchObject({
      caseId: '2',
      kind: 'order',
      activity: 'Approve',
    });
  });

  it('withholds a conclusion when log labels do not match the reference', () => {
    expect(checkModelConformance(log([['Create Invoice']]), model).status).toBe(
      'unmatched',
    );
  });

  it('withholds a conclusion for an unsupported OR gateway', () => {
    const unsupported = {
      ...model,
      nodes: { ...model.nodes, g: { ...model.nodes.g, gatewayKind: 'or' as const } },
    };
    expect(checkModelConformance(log([['Receive', 'Approve']]), unsupported).status).toBe(
      'unsupported',
    );
  });

  it('requires both parallel tasks before an AND join completes', () => {
    const parallel: ProcessModel = {
      ...model,
      nodes: {
        s: model.nodes.s,
        g: { id: 'g', label: 'Split', kind: 'gateway', gatewayKind: 'and' },
        a: { id: 'a', label: 'A', kind: 'task' },
        b: { id: 'b', label: 'B', kind: 'task' },
        j: { id: 'j', label: 'Join', kind: 'gateway', gatewayKind: 'and' },
        e: model.nodes.e,
      },
      edges: Object.fromEntries(
        [
          ['s', 'g'],
          ['g', 'a'],
          ['g', 'b'],
          ['a', 'j'],
          ['b', 'j'],
          ['j', 'e'],
        ].map(([source, target], index) => [
          String(index),
          { id: String(index), source, target },
        ]),
      ),
    };
    const result = checkModelConformance(log([['A', 'B'], ['B', 'A'], ['A']]), parallel);
    expect(result).toMatchObject({
      status: 'ready',
      compatibleCases: 2,
      examinedCases: 3,
    });
    expect(result.examples).toContainEqual({
      caseId: '2',
      kind: 'incomplete',
      expected: ['B'],
    });
  });

  it('withholds a conclusion for gateways without a declared kind', () => {
    const ambiguous = {
      ...model,
      nodes: { ...model.nodes, g: { ...model.nodes.g, gatewayKind: undefined } },
    };
    expect(checkModelConformance(log([['Receive', 'Approve']]), ambiguous).status).toBe(
      'unsupported',
    );
  });
});
