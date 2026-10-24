import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import { analyzeProcess } from './index';

const HOUR = 60;

/**
 * The approval example from the IS6003 report (section "Thực nghiệm tính toán"):
 * T1 = 4 h; AND split with 6 h and 8 h branches; approval T3 = 5 h with
 * rework r = 15 %; completion T4 = 2 h processing plus 2 h waiting.
 */
const reportExample: ProcessModel = {
  schemaVersion: 1,
  id: 'is6003-approval',
  name: 'IS6003 approval example',
  nodes: {
    start: { id: 'start', label: 'Request received', kind: 'start' },
    t1: {
      id: 't1',
      label: 'T1 Receive request',
      kind: 'task',
      processingMinutes: 4 * HOUR,
    },
    split: { id: 'split', label: 'Split', kind: 'gateway', gatewayKind: 'and' },
    t2a: { id: 't2a', label: 'T2a Branch A', kind: 'task', processingMinutes: 6 * HOUR },
    t2b: { id: 't2b', label: 'T2b Branch B', kind: 'task', processingMinutes: 8 * HOUR },
    join: { id: 'join', label: 'Join', kind: 'gateway', gatewayKind: 'and' },
    t3: {
      id: 't3',
      label: 'T3 Approve',
      kind: 'task',
      processingMinutes: 5 * HOUR,
      reworkProbability: 0.15,
    },
    t4: {
      id: 't4',
      label: 'T4 Complete',
      kind: 'task',
      processingMinutes: 2 * HOUR,
      waitingMinutes: 2 * HOUR,
    },
    end: { id: 'end', label: 'Done', kind: 'end' },
  },
  edges: {
    e1: { id: 'e1', source: 'start', target: 't1' },
    e2: { id: 'e2', source: 't1', target: 'split' },
    e3: { id: 'e3', source: 'split', target: 't2a' },
    e4: { id: 'e4', source: 'split', target: 't2b' },
    e5: { id: 'e5', source: 't2a', target: 'join' },
    e6: { id: 'e6', source: 't2b', target: 'join' },
    e7: { id: 'e7', source: 'join', target: 't3' },
    e8: { id: 'e8', source: 't3', target: 't4' },
    e9: { id: 'e9', source: 't4', target: 'end' },
  },
};

describe('IS6003 report example', () => {
  const report = analyzeProcess(reportExample, { arrivalRatePerHour: 0.5 });

  it('reproduces TCT ≈ 19.88 h, CT ≈ 21.88 h and CTE ≈ 90.9 %', () => {
    expect(report.theoreticalCycleTimeMinutes! / HOUR).toBeCloseTo(
      4 + 8 + 5 / 0.85 + 2,
      6,
    );
    expect(report.theoreticalCycleTimeMinutes! / HOUR).toBeCloseTo(19.88, 2);
    expect(report.cycleTimeMinutes! / HOUR).toBeCloseTo(21.88, 2);
    expect(report.cycleTimeEfficiency!).toBeCloseTo(0.909, 3);
    expect(report.quality).toBe('exact');
  });

  it('highlights the 8 h branch as the deterministic critical chain', () => {
    expect(report.criticalChain).toMatchObject({
      status: 'ready',
      quality: 'exact',
      basis: 'deterministic',
      taskIds: ['t1', 't2b', 't3', 't4'],
    });
    expect(report.criticalChain?.edgeIds).toEqual([
      'e1',
      'e2',
      'e4',
      'e6',
      'e7',
      'e8',
      'e9',
    ]);
    expect(report.criticalChain?.durationMinutes).toBeCloseTo(
      report.cycleTimeMinutes!,
      6,
    );
  });

  it("forecasts WIP with Little's Law (WIP = λ × CT)", () => {
    expect(report.littleLawForecast?.workInProcess).toBeCloseTo(0.5 * 21.882352941, 6);
  });
});

describe('critical chain across decisions', () => {
  it('follows the branch that dominates the expectation and labels it an assumption', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'chain-xor',
      name: 'Decision',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        choice: { id: 'choice', label: 'Choice', kind: 'gateway', gatewayKind: 'xor' },
        likely: {
          id: 'likely',
          label: 'Likely short',
          kind: 'task',
          durationMinutes: 10,
        },
        rare: { id: 'rare', label: 'Rare long', kind: 'task', durationMinutes: 100 },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        a: { id: 'a', source: 'start', target: 'choice' },
        b: { id: 'b', source: 'choice', target: 'likely', probability: 0.8 },
        c: { id: 'c', source: 'choice', target: 'rare', probability: 0.2 },
        d: { id: 'd', source: 'likely', target: 'end' },
        e: { id: 'e', source: 'rare', target: 'end' },
      },
    });
    // 0.2 × 100 = 20 dominates 0.8 × 10 = 8.
    expect(report.criticalChain).toMatchObject({
      quality: 'assumption',
      basis: 'expected-time-heuristic',
      taskIds: ['rare'],
    });
    expect(report.criticalPath?.status).toBe('unavailable');
  });

  it('does not loop forever on a rework cycle', () => {
    const report = analyzeProcess({
      schemaVersion: 1,
      id: 'chain-loop',
      name: 'Loop',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' },
        work: { id: 'work', label: 'Work', kind: 'task', durationMinutes: 30 },
        check: { id: 'check', label: 'OK?', kind: 'gateway', gatewayKind: 'xor' },
        end: { id: 'end', label: 'End', kind: 'end' },
      },
      edges: {
        a: { id: 'a', source: 'start', target: 'work' },
        b: { id: 'b', source: 'work', target: 'check' },
        c: { id: 'c', source: 'check', target: 'work', probability: 0.25 },
        d: { id: 'd', source: 'check', target: 'end', probability: 0.75 },
      },
    });
    expect(report.cycleTimeMinutes).toBeCloseTo(40, 6);
    expect(report.criticalChain?.nodeIds).toEqual(['start', 'work', 'check', 'end']);
    expect(report.criticalChain?.quality).toBe('assumption');
  });
});

describe('resource pool queues', () => {
  it('adds an M/M/c view per pool when an arrival rate is known', () => {
    const report = analyzeProcess(
      {
        schemaVersion: 1,
        id: 'pool-queue',
        name: 'Pool',
        nodes: {
          start: { id: 'start', label: 'Start', kind: 'start' },
          task: {
            id: 'task',
            label: 'Serve',
            kind: 'task',
            processingMinutes: 30,
            cost: { resourcePoolId: 'desk', resourceCount: 2 },
          },
          end: { id: 'end', label: 'End', kind: 'end' },
        },
        edges: {
          a: { id: 'a', source: 'start', target: 'task' },
          b: { id: 'b', source: 'task', target: 'end' },
        },
      },
      { arrivalRatePerHour: 3 },
    );
    const pool = report.capacity.find((item) => item.resourcePoolId === 'desk');
    // λ = 3/h, μ = 2/h per server, c = 2 → ρ = 0.75, M/M/2 Lq = 1.9286, Wq = 0.6429 h.
    expect(pool?.queue?.model).toBe('M/M/c');
    expect(pool?.queue?.utilization).toBeCloseTo(0.75, 6);
    expect(pool?.queue?.averageQueueLength).toBeCloseTo(1.928571, 5);
    expect(pool?.queue?.averageWaitingHours).toBeCloseTo(0.642857, 5);
  });
});
