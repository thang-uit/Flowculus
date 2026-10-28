import { it, expect } from 'vitest';
import { alignmentConformance } from '../alignment-conformance';
import { deliveryLog, deliveryModel } from '../__fixtures__/software-delivery';
import { verifyPetri } from './reachability';
import { parseTaskStandards, compareTaskStandards } from '../performance-standards';
it('computes documented quality variants from compatible cases with declared coverage', () => {
  const result = alignmentConformance(deliveryLog(), deliveryModel());
  expect(result.quality?.compatibleCases).toBe(4);
  for (const value of [
    result.quality?.precision,
    result.quality?.generalization,
    result.quality?.simplicity,
  ]) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
  expect(result.quality?.scope).toBe('compatible-cases-only');
});
it('does not silently remap an explicit unmapped activity back to an exact label', () => {
  const model = deliveryModel();
  const result = alignmentConformance(deliveryLog(), model, {
    activityMapping: { 'Clarify requirements': '' },
  });
  expect(result.compatibleCases).toBe(0);
});
it('keeps prototype-like labels and unmapped log events separate from task IDs', () => {
  for (const label of ['__proto__', 'constructor', 'toString', 'log:outside']) {
    const model = deliveryModel();
    const original = model.nodes.backend.label;
    model.nodes.backend.label = label;
    const log = deliveryLog();
    log.events = log.events.map((event) =>
      event.activity === original ? { ...event, activity: label } : event,
    );
    expect(alignmentConformance(log, model).compatibleCases).toBe(4);
    expect(
      alignmentConformance(log, model, {
        activityMapping: { [label]: 'backend' },
      }).compatibleCases,
    ).toBe(4);
  }
  const model = deliveryModel();
  // This internal ID used to collide with the sentinel for an unknown activity.
  const oldTask = model.nodes.backend;
  delete model.nodes.backend;
  model.nodes['unmapped:outside'] = { ...oldTask, id: 'unmapped:outside' };
  for (const edge of Object.values(model.edges)) {
    if (edge.source === 'backend') edge.source = 'unmapped:outside';
    if (edge.target === 'backend') edge.target = 'unmapped:outside';
  }
  const log = deliveryLog();
  log.events = log.events.map((event) =>
    event.activity === oldTask.label ? { ...event, activity: 'outside' } : event,
  );
  expect(alignmentConformance(log, model).compatibleCases).toBe(0);
});
it('returns a concrete unsafe marking rather than a false safe proof', () => {
  const result = verifyPetri({
    id: 'bad',
    name: 'Bad merge',
    origin: 'bpmn',
    places: [
      { id: 'i', label: 'i' },
      { id: 'a', label: 'a' },
      { id: 'b', label: 'b' },
      { id: 'qa', label: 'qa' },
      { id: 'o', label: 'o' },
    ],
    transitions: [
      { id: 'split', label: null, inputs: ['i'], outputs: ['a', 'b'] },
      { id: 'left', label: 'Left', inputs: ['a'], outputs: ['qa'] },
      { id: 'right', label: 'Right', inputs: ['b'], outputs: ['qa'] },
      { id: 'finish', label: 'QA', inputs: ['qa'], outputs: ['o'] },
    ],
    initial: { i: 1 },
    final: { o: 1 },
  });
  expect(result.safe).toBe(false);
  expect(result.sound).toBe(false);
  expect(result.counterexample).not.toBeNull();
});
it('compares measured service with standards and rejects invalid thresholds', () => {
  const standards = parseTaskStandards(
    'activity,max_service_minutes\nTest integrated build,30\n',
  );
  const rows = compareTaskStandards(deliveryLog(), standards);
  expect(rows[0].exceeded).toBe(7);
  expect(rows[0].meanMinutes).toBe(60);
  expect(() => parseTaskStandards('activity,max_service_minutes\nQA,-1')).toThrow();
});
