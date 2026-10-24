import { describe, expect, it } from 'vitest';
import type { ProcessModel } from '@flowculus/process-model';

import { analyzeProcess, computeCycleTimeEfficiency, resolveActivityTime } from './index';

const singleTask = (task: ProcessModel['nodes'][string]): ProcessModel => ({
  schemaVersion: 1,
  id: 'single',
  name: 'Single task',
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    [task.id]: task,
    end: { id: 'end', label: 'End', kind: 'end' },
  },
  edges: {
    e1: { id: 'e1', source: 'start', target: task.id },
    e2: { id: 'e2', source: task.id, target: 'end' },
  },
});

describe('cycle-time contract', () => {
  it('uses observed duration as CT and explicit T for TCT', () => {
    expect(
      resolveActivityTime({
        durationMinutes: 30,
        processingMinutes: 10,
        waitingMinutes: 20,
      }),
    ).toEqual({
      cycleTimeMinutes: 30,
      cycleTimeSource: 'observed',
      processingMinutes: 10,
      processingSource: 'explicit',
      waitingMinutes: 20,
      unexplainedWaitMinutes: 0,
    });
  });

  it('derives CT = T + Wq when no duration is observed, missing Wq counting as 0', () => {
    expect(
      resolveActivityTime({ processingMinutes: 6, waitingMinutes: 12 }),
    ).toMatchObject({
      cycleTimeMinutes: 18,
      cycleTimeSource: 'derived',
      processingSource: 'explicit',
    });
    expect(resolveActivityTime({ processingMinutes: 6 })).toMatchObject({
      cycleTimeMinutes: 6,
      cycleTimeSource: 'derived',
      waitingMinutes: 0,
    });
  });

  it('derives T = D − Wq, and only estimates T from D when nothing else is known', () => {
    expect(
      resolveActivityTime({ durationMinutes: 30, waitingMinutes: 20 }),
    ).toMatchObject({
      processingMinutes: 10,
      processingSource: 'derived',
    });
    expect(resolveActivityTime({ durationMinutes: 30 })).toMatchObject({
      processingMinutes: 30,
      processingSource: 'cycle-time-estimate',
      waitingMinutes: null,
    });
    expect(resolveActivityTime({})).toMatchObject({
      cycleTimeMinutes: 0,
      cycleTimeSource: 'missing',
      processingSource: 'missing',
    });
  });

  it('reports an unexplained gap when T + Wq < D and makes the result an assumption', () => {
    const report = analyzeProcess(
      singleTask({
        id: 'task',
        label: 'Review',
        kind: 'task',
        durationMinutes: 30,
        processingMinutes: 10,
        waitingMinutes: 5,
        cost: { resourceRatePerHour: 60 },
      }),
    );
    expect(report.cycleTimeMinutes).toBe(30);
    expect(report.activityTimes.task).toMatchObject({
      cycleTimeSource: 'observed',
      unexplainedWaitMinutes: 15,
    });
    expect(report.quality).toBe('assumption');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: 'unexplained-wait',
        params: expect.objectContaining({ minutes: 15 }),
      }),
    );
  });

  it('rejects T + Wq > D instead of showing two meanings of CT', () => {
    const report = analyzeProcess(
      singleTask({
        id: 'task',
        label: 'Review',
        kind: 'task',
        durationMinutes: 10,
        processingMinutes: 8,
        waitingMinutes: 5,
      }),
    );
    expect(report.status).toBe('invalid');
    expect(report.cycleTimeMinutes).toBeNull();
    expect(report.issues.map((issue) => issue.code)).toContain(
      'time-components-exceed-cycle-time',
    );
  });

  it('keeps TCT exact for explicit T and downgrades it when T is estimated from D', () => {
    const explicit = analyzeProcess(
      singleTask({
        id: 'task',
        label: 'Work',
        kind: 'task',
        processingMinutes: 6,
        waitingMinutes: 4,
        cost: { resourceRatePerHour: 60 },
      }),
    );
    expect(explicit.quality).toBe('exact');
    expect(explicit.activityTimes.task.cycleTimeSource).toBe('derived');
    const estimated = analyzeProcess(
      singleTask({
        id: 'task',
        label: 'Work',
        kind: 'task',
        durationMinutes: 10,
        cost: { resourceRatePerHour: 60 },
      }),
    );
    expect(estimated.metricQuality.cycleTime).toBe('exact');
    expect(estimated.metricQuality.theoreticalCycleTime).toBe('assumption');
    expect(estimated.quality).toBe('assumption');
  });

  it('marks a task without any time as an assumption instead of silently using 0', () => {
    const report = analyzeProcess(
      singleTask({ id: 'task', label: 'Blank', kind: 'task', cost: {} }),
    );
    expect(report.cycleTimeMinutes).toBe(0);
    expect(report.quality).toBe('assumption');
    expect(report.issues.map((issue) => issue.code)).toContain('missing-activity-time');
  });
});

describe('cycle-time efficiency is a ratio in [0, 1]', () => {
  it('returns 0, 1 and values in between without multiplying by 100', () => {
    expect(computeCycleTimeEfficiency(0, 30)).toEqual({ status: 'ready', ratio: 0 });
    expect(computeCycleTimeEfficiency(30, 30)).toEqual({ status: 'ready', ratio: 1 });
    expect(computeCycleTimeEfficiency(9, 30)).toEqual({ status: 'ready', ratio: 0.3 });
  });

  it('leaves CTE undefined for CT = 0 and invalid input, and flags TCT > CT', () => {
    expect(computeCycleTimeEfficiency(0, 0)).toEqual({
      status: 'undefined',
      reason: 'zero-cycle-time',
    });
    expect(computeCycleTimeEfficiency(Number.NaN, 10)).toEqual({
      status: 'undefined',
      reason: 'invalid-input',
    });
    expect(computeCycleTimeEfficiency(null, 10).status).toBe('undefined');
    expect(computeCycleTimeEfficiency(-1, 10).status).toBe('undefined');
    expect(computeCycleTimeEfficiency(12, 10)).toEqual({
      status: 'out-of-range',
      ratio: 1.2,
    });
  });

  it('reports a zero cycle time as information with CTE null', () => {
    const report = analyzeProcess(
      singleTask({
        id: 'task',
        label: 'Instant',
        kind: 'task',
        processingMinutes: 0,
        cost: {},
      }),
    );
    expect(report.cycleTimeMinutes).toBe(0);
    expect(report.cycleTimeEfficiency).toBeNull();
    expect(report.issues.map((issue) => issue.code)).toContain('cycle-time-zero');
  });
});
