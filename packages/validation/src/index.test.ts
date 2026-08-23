import { describe, expect, it } from 'vitest';
import type { ProcessModel } from '@flowculus/process-model';

import { validateProcessModel } from './index';

describe('validateProcessModel', () => {
  it('accepts an empty model with the current schema', () => {
    const result = validateProcessModel({
      schemaVersion: 1,
      id: 'model-1',
      name: 'Empty model',
      nodes: {},
      edges: {},
    });

    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('reports edges that reference missing nodes', () => {
    const result = validateProcessModel({
      schemaVersion: 1,
      id: 'model-1',
      name: 'Broken model',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
      },
      edges: {
        'edge-1': { id: 'edge-1', source: 'start', target: 'missing' },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      {
        code: 'missing_target',
        message: 'Edge edge-1 references a missing target node.',
        path: 'edges.edge-1.target',
      },
    ]);
  });

  it('requires probabilities for every outgoing OR branch without forcing them to sum to one', () => {
    const model: ProcessModel = {
      schemaVersion: 1,
      id: 'or-1',
      name: 'OR',
      nodes: {
        gateway: {
          id: 'gateway',
          label: 'Choose work',
          kind: 'gateway',
          gatewayKind: 'or',
        },
        a: { id: 'a', label: 'A', kind: 'task' },
        b: { id: 'b', label: 'B', kind: 'task' },
      },
      edges: {
        a: { id: 'a', source: 'gateway', target: 'a', probability: 0.4 },
        b: { id: 'b', source: 'gateway', target: 'b', probability: undefined },
      },
    };

    expect(validateProcessModel(model).issues[0]?.code).toBe(
      'missing_branch_probability',
    );
    model.edges.b.probability = 0.8;
    expect(validateProcessModel(model)).toEqual({ valid: true, issues: [] });
  });

  it('does not count message flows as gateway branches', () => {
    const result = validateProcessModel({
      schemaVersion: 1,
      id: 'message-1',
      name: 'Message flow',
      nodes: {
        gateway: {
          id: 'gateway',
          label: 'Choice',
          kind: 'gateway',
          gatewayKind: 'xor',
        },
        task: { id: 'task', label: 'Task', kind: 'task' },
        data: { id: 'data', label: 'Data', kind: 'data' },
      },
      edges: {
        control: { id: 'control', source: 'gateway', target: 'task' },
        message: {
          id: 'message',
          source: 'gateway',
          target: 'data',
          kind: 'message',
        },
      },
    });

    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('rejects time components that exceed a task cycle time', () => {
    const result = validateProcessModel({
      schemaVersion: 1,
      id: 'time-1',
      name: 'Invalid timing',
      nodes: {
        task: {
          id: 'task',
          label: 'Task',
          kind: 'task',
          durationMinutes: 10,
          processingMinutes: 8,
          waitingMinutes: 5,
        },
      },
      edges: {},
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'time_components_exceed_cycle_time',
    ]);
  });

  it('rejects a 100% task rework probability because the geometric series does not converge', () => {
    const result = validateProcessModel({
      schemaVersion: 1,
      id: 'rework-1',
      name: 'Non-terminating rework',
      nodes: {
        task: {
          id: 'task',
          label: 'Repeat forever',
          kind: 'task',
          durationMinutes: 5,
          reworkProbability: 1,
        },
      },
      edges: {},
    });

    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.path === 'nodes.task.reworkProbability'),
    ).toBe(true);
  });
});
