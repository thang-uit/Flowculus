import { expect, it } from 'vitest';
import type { ProcessModel } from '@flowculus/process-model';
import { compareProcessScenarios } from './scenario-comparison';

const process = (minutes: number, currency: string): ProcessModel => ({
  schemaVersion: 1,
  id: 'p',
  name: 'Process',
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    task: {
      id: 'task',
      label: 'Task',
      kind: 'task',
      durationMinutes: minutes,
      processingMinutes: minutes,
      cost: { otherCostPerExecution: 10, currency },
    },
    end: { id: 'end', label: 'End', kind: 'end' },
  },
  edges: {
    a: { id: 'a', source: 'start', target: 'task' },
    b: { id: 'b', source: 'task', target: 'end' },
  },
});
it('withholds cost comparison across currencies while keeping time deltas', () => {
  const result = compareProcessScenarios(process(10, 'USD'), process(5, 'VND'));
  expect(result.costComparable).toBe(false);
  expect(result.metrics.find((item) => item.metric === 'costPerExecution')).toMatchObject(
    { baseline: null, candidate: null, relativeChange: null },
  );
  expect(
    result.metrics.find((item) => item.metric === 'cycleTimeMinutes')?.relativeChange,
  ).toBe(-0.5);
});
it('keeps a zero baseline percentage undefined', () => {
  expect(
    compareProcessScenarios(process(0, 'USD'), process(5, 'USD')).metrics.find(
      (item) => item.metric === 'cycleTimeMinutes',
    )?.relativeChange,
  ).toBeNull();
});
it('withholds cost when a scenario mixes monetary units', () => {
  const base = process(10, 'USD');
  const mixed: ProcessModel = {
    ...base,
    nodes: {
      ...base.nodes,
      second: {
        ...base.nodes.task,
        id: 'second',
        cost: { otherCostPerExecution: 10, currency: 'VND' },
      },
    },
    edges: {
      ...base.edges,
      b: { id: 'b', source: 'task', target: 'second' },
      c: { id: 'c', source: 'second', target: 'end' },
    },
  };
  const result = compareProcessScenarios(mixed, mixed);
  expect(result.costComparable).toBe(false);
  expect(
    result.metrics.find((row) => row.metric === 'costPerExecution')?.baseline,
  ).toBeNull();
});
