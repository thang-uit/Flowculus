import { describe, expect, it } from 'vitest';

import { analyzeProcess } from './index';
import { analyzeQueue } from './index';

describe('analyzeProcess', () => {
  it('returns an explicit empty-state report instead of a fake cycle time', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'model-1',
      name: 'Empty model',
      nodes: {},
      edges: {},
    });

    expect(report.status).toBe('ready');
    expect(report.cycleTimeMinutes).toBe(0);
    expect(report.formula).toBe('No activities yet');
  });

  it('returns validation warnings for an invalid graph', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'model-1',
      name: 'Broken model',
      nodes: {},
      edges: {
        'edge-1': { id: 'edge-1', source: 'missing', target: 'also-missing' },
      },
    });

    expect(report.status).toBe('invalid');
    expect(report.cycleTimeMinutes).toBeNull();
    expect(report.warnings).toHaveLength(2);
  });

  it('calculates a sequential process and cycle-time efficiency', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'sequence-1',
      name: 'Sequence',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        a: {
          id: 'a',
          label: 'A',
          kind: 'task',
          durationMinutes: 20,
          processingMinutes: 5,
          cost: { resourceRatePerHour: 60, otherCostPerExecution: 2 },
        },
        b: {
          id: 'b',
          label: 'B',
          kind: 'task',
          durationMinutes: 10,
          processingMinutes: 4,
          cost: { resourceRatePerHour: 60 },
        },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'a' },
        e2: { id: 'e2', source: 'a', target: 'b' },
        e3: { id: 'e3', source: 'b', target: 'end' },
      },
    });

    expect(report.status).toBe('ready');
    expect(report.cycleTimeMinutes).toBe(30);
    expect(report.theoreticalCycleTimeMinutes).toBe(9);
    expect(report.cycleTimeEfficiency).toBe(0.3);
    expect(report.costPerExecution).toBe(11);
    expect(report.formula).toContain('20');
  });

  it('uses weighted XOR branches and max for AND cycle time', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'branch-1',
      name: 'Branches',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        xor: { id: 'xor', label: 'Choice', kind: 'gateway', gatewayKind: 'xor' },
        fast: { id: 'fast', label: 'Fast', kind: 'task', durationMinutes: 10 },
        slow: { id: 'slow', label: 'Slow', kind: 'task', durationMinutes: 30 },
        join: { id: 'join', label: 'Join', kind: 'gateway', gatewayKind: 'and' },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'xor' },
        e2: { id: 'e2', source: 'xor', target: 'fast', probability: 0.6 },
        e3: { id: 'e3', source: 'xor', target: 'slow', probability: 0.4 },
        e4: { id: 'e4', source: 'fast', target: 'join' },
        e5: { id: 'e5', source: 'slow', target: 'join' },
        e6: { id: 'e6', source: 'join', target: 'end' },
      },
    });

    expect(report.status).toBe('ready');
    expect(report.cycleTimeMinutes).toBe(18);
    expect(report.formula).toContain('0.6');
  });

  it('marks independent OR enumeration as an explicit assumption', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'or-assumption-1',
      name: 'Inclusive branches',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        split: {
          id: 'split',
          label: 'Optional work',
          kind: 'gateway',
          gatewayKind: 'or',
        },
        a: { id: 'a', label: 'A', kind: 'task', durationMinutes: 4 },
        b: { id: 'b', label: 'B', kind: 'task', durationMinutes: 6 },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'split' },
        e2: { id: 'e2', source: 'split', target: 'a', probability: 0.5 },
        e3: { id: 'e3', source: 'split', target: 'b', probability: 0.5 },
        e4: { id: 'e4', source: 'a', target: 'end' },
        e5: { id: 'e5', source: 'b', target: 'end' },
      },
    });

    expect(report.quality).toBe('assumption');
    expect(report.assumptions.join(' ')).toContain('independent branch probabilities');
  });

  it('calculates M/M/1 and detects an unstable queue', () => {
    const queue = analyzeQueue({ arrivalRatePerHour: 5, serviceRatePerServerPerHour: 6 });
    expect(queue.status).toBe('ready');
    // ρ = 5 / 6, therefore Lq = ρ² / (1 - ρ) = 4.1667 and
    // W = Wq + 1 / μ = 1 hour for an M/M/1 queue.
    expect(queue.averageQueueLength).toBeCloseTo(4.1666667);
    expect(queue.averageSystemHours).toBeCloseTo(1);

    const unstable = analyzeQueue({
      arrivalRatePerHour: 7,
      serviceRatePerServerPerHour: 6,
    });
    expect(unstable.status).toBe('unstable');
  });

  it("attaches Little's Law and queue results to process analysis options", () => {
    const report = analyzeProcess(
      {
        schemaVersion: 1,
        id: 'queue-options-1',
        name: 'Queue options',
        nodes: {
          start: { id: 'start', label: 'Start', kind: 'start' },
          task: { id: 'task', label: 'Task', kind: 'task', durationMinutes: 12 },
          end: { id: 'end', label: 'End', kind: 'end' },
        },
        edges: {
          e1: { id: 'e1', source: 'start', target: 'task' },
          e2: { id: 'e2', source: 'task', target: 'end' },
        },
      },
      {
        arrivalRatePerHour: 3,
        workInProcess: 2,
        serviceRatePerHour: 6,
        servers: 2,
      },
    );

    expect(report.littleLaw?.cycleTimeHours).toBeCloseTo(2 / 3);
    expect(report.queue?.status).toBe('ready');
    expect(report.queue?.model).toBe('M/M/c');
  });

  it('rejects invalid analysis options at the boundary', () => {
    const report = analyzeProcess(
      {
        schemaVersion: 1,
        id: 'invalid-options-1',
        name: 'Invalid options',
        nodes: { start: { id: 'start', label: 'Start', kind: 'start' } },
        edges: {},
      },
      { servers: 0 },
    );

    expect(report.status).toBe('invalid');
    expect(report.diagnostics).toContain('invalid_analysis_options');
  });

  it('marks native-shape semantic inference as an explicit assumption', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'inferred-shape-1',
      name: 'Inferred shape',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        task: {
          id: 'task',
          label: 'Native shape',
          kind: 'task',
          durationMinutes: 10,
          metadata: { 'flowculus-inferred-kind': true },
        },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'task' },
        e2: { id: 'e2', source: 'task', target: 'end' },
      },
    });

    expect(report.quality).toBe('assumption');
    expect(report.assumptions.join(' ')).toContain('inferred');
  });

  it('does not count a shared AND-join continuation once per branch for cost', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'and-join-1',
      name: 'Parallel join',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        split: { id: 'split', label: 'Split', kind: 'gateway', gatewayKind: 'and' },
        fast: {
          id: 'fast',
          label: 'Fast branch',
          kind: 'task',
          durationMinutes: 10,
          processingMinutes: 10,
          cost: { resourceRatePerHour: 60 },
        },
        slow: {
          id: 'slow',
          label: 'Slow branch',
          kind: 'task',
          durationMinutes: 20,
          processingMinutes: 20,
          cost: { resourceRatePerHour: 60 },
        },
        join: { id: 'join', label: 'Join', kind: 'gateway', gatewayKind: 'and' },
        finish: {
          id: 'finish',
          label: 'Shared follow-up',
          kind: 'task',
          durationMinutes: 5,
          processingMinutes: 5,
          cost: { resourceRatePerHour: 60 },
        },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'split' },
        e2: { id: 'e2', source: 'split', target: 'fast' },
        e3: { id: 'e3', source: 'split', target: 'slow' },
        e4: { id: 'e4', source: 'fast', target: 'join' },
        e5: { id: 'e5', source: 'slow', target: 'join' },
        e6: { id: 'e6', source: 'join', target: 'finish' },
        e7: { id: 'e7', source: 'finish', target: 'end' },
      },
    });

    expect(report.cycleTimeMinutes).toBe(25);
    expect(report.costPerExecution).toBe(35);
    expect(report.quality).toBe('exact');
    expect(report.costFormula).toContain('-');
  });

  it('calculates expected resource unit load through XOR branches', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'pool-xor-1',
      name: 'Pool load',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        choice: { id: 'choice', label: 'Choice', kind: 'gateway', gatewayKind: 'xor' },
        a: {
          id: 'a',
          label: 'A',
          kind: 'task',
          durationMinutes: 10,
          processingMinutes: 10,
          cost: { resourcePoolId: 'clerks', resourceRatePerHour: 60 },
        },
        b: {
          id: 'b',
          label: 'B',
          kind: 'task',
          durationMinutes: 20,
          processingMinutes: 20,
          cost: { resourcePoolId: 'clerks', resourceRatePerHour: 60 },
        },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'choice' },
        e2: { id: 'e2', source: 'choice', target: 'a', probability: 0.25 },
        e3: { id: 'e3', source: 'choice', target: 'b', probability: 0.75 },
        e4: { id: 'e4', source: 'a', target: 'end' },
        e5: { id: 'e5', source: 'b', target: 'end' },
      },
    });

    expect(report.capacity).toHaveLength(1);
    expect(report.capacity[0]?.unitLoadMinutes).toBeCloseTo(17.5);
    expect(report.capacity[0]?.resourceCount).toBe(1);
    expect(report.capacity[0]?.isBottleneck).toBe(true);
    expect(report.assumptions[0]).toContain('assumes one resource');
  });

  it('repeats only the marked rework body, not its downstream continuation', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'rework-body-1',
      name: 'Rework body',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        review: {
          id: 'review',
          label: 'Review',
          kind: 'task',
          durationMinutes: 20,
          processingMinutes: 10,
          reworkProbability: 0.2,
        },
        archive: {
          id: 'archive',
          label: 'Archive',
          kind: 'task',
          durationMinutes: 5,
          processingMinutes: 5,
        },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'review' },
        e2: { id: 'e2', source: 'review', target: 'archive' },
        e3: { id: 'e3', source: 'archive', target: 'end' },
      },
    });

    expect(report.cycleTimeMinutes).toBe(30);
    expect(report.theoreticalCycleTimeMinutes).toBe(17.5);
    expect(report.formula).toContain('(20) / (1 - 0.2)');
  });

  it('finds the critical path through a decision-free AND graph', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'critical-path-1',
      name: 'Critical path',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        prepare: {
          id: 'prepare',
          label: 'Prepare',
          kind: 'task',
          processingMinutes: 4,
        },
        split: {
          id: 'split',
          label: 'Parallel split',
          kind: 'gateway',
          gatewayKind: 'and',
        },
        short: {
          id: 'short',
          label: 'Short check',
          kind: 'task',
          processingMinutes: 3,
        },
        long: {
          id: 'long',
          label: 'Long check',
          kind: 'task',
          processingMinutes: 9,
        },
        join: { id: 'join', label: 'Parallel join', kind: 'gateway', gatewayKind: 'and' },
        finish: {
          id: 'finish',
          label: 'Finish',
          kind: 'task',
          processingMinutes: 2,
        },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'prepare' },
        e2: { id: 'e2', source: 'prepare', target: 'split' },
        e3: { id: 'e3', source: 'split', target: 'short' },
        e4: { id: 'e4', source: 'split', target: 'long' },
        e5: { id: 'e5', source: 'short', target: 'join' },
        e6: { id: 'e6', source: 'long', target: 'join' },
        e7: { id: 'e7', source: 'join', target: 'finish' },
        e8: { id: 'e8', source: 'finish', target: 'end' },
      },
    });

    expect(report.criticalPath?.status).toBe('ready');
    expect(report.criticalPath?.durationMinutes).toBe(15);
    expect(report.criticalPath?.taskLabels).toEqual(['Prepare', 'Long check', 'Finish']);
    expect(report.criticalPath?.formula).toBe('4 + 9 + 2 = 15');
  });

  it('does not invent a critical path across an XOR decision', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'critical-path-xor-1',
      name: 'Decision graph',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        choice: { id: 'choice', label: 'Choice', kind: 'gateway', gatewayKind: 'xor' },
        a: { id: 'a', label: 'A', kind: 'task', processingMinutes: 3 },
        b: { id: 'b', label: 'B', kind: 'task', processingMinutes: 8 },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'choice' },
        e2: { id: 'e2', source: 'choice', target: 'a', probability: 0.5 },
        e3: { id: 'e3', source: 'choice', target: 'b', probability: 0.5 },
        e4: { id: 'e4', source: 'a', target: 'end' },
        e5: { id: 'e5', source: 'b', target: 'end' },
      },
    });

    expect(report.criticalPath).toMatchObject({
      status: 'unavailable',
      reason: 'decision-gateway',
    });
  });

  it('ignores message flows and associations when calculating control-flow time', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'non-control-edges-1',
      name: 'Non-control edges',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        task: { id: 'task', label: 'Task', kind: 'task', durationMinutes: 10 },
        data: { id: 'data', label: 'Data', kind: 'data' },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'task', kind: 'sequence' },
        e2: { id: 'e2', source: 'task', target: 'end', kind: 'sequence' },
        e3: { id: 'e3', source: 'task', target: 'data', kind: 'association' },
        e4: { id: 'e4', source: 'start', target: 'data', kind: 'message' },
      },
    });

    expect(report.cycleTimeMinutes).toBe(10);
    expect(report.status).toBe('ready');
  });

  it('does not call an edge-level rework result exact when the loop body is unknown', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'edge-rework-1',
      name: 'Edge rework',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        task: { id: 'task', label: 'Task', kind: 'task', durationMinutes: 10 },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'task', kind: 'sequence' },
        e2: {
          id: 'e2',
          source: 'task',
          target: 'end',
          kind: 'sequence',
          reworkProbability: 0.2,
        },
      },
    });

    expect(report.quality).toBe('simulation-required');
    expect(report.status).toBe('unsupported');
    expect(report.warnings.join(' ')).toContain('edge-level rework');
  });

  it('requires explicit processing times before reporting CPM', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'critical-path-missing-time-1',
      name: 'Missing processing time',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        task: { id: 'task', label: 'Task', kind: 'task', durationMinutes: 12 },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 'start', target: 'task' },
        e2: { id: 'e2', source: 'task', target: 'end' },
      },
    });

    expect(report.criticalPath).toMatchObject({
      status: 'unavailable',
      reason: 'missing-processing-time',
    });
  });
});
