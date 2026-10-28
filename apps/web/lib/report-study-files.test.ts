import { expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import { exportBpmnXml, importBpmnXml } from '@flowculus/bpmn-adapter';
import { parseFlowculusFile, serializeFlowculusFile } from '@flowculus/file-formats';
import { checkSemanticGate } from '@flowculus/validation';
import {
  alignmentConformance,
  bpmnToPetri,
  verifyPetri,
} from '@flowculus/process-mining';
import {
  studyModel,
  studyLog,
  studyViolationLog,
} from '../../../packages/process-mining/src/__fixtures__/report-study';

it('keeps report metrics, responsibility and Petri evidence through demo file round trips', () => {
  for (const variant of ['as-is', 'to-be'] as const) {
    const model = studyModel(variant);
    const gate = checkSemanticGate(model);
    if (!gate.ok) throw new Error('The study must have confirmed semantics.');
    const native = parseFlowculusFile(
      serializeFlowculusFile({
        schemaVersion: 2,
        model,
        analysisOptions: { processPoolId: 'scope' },
      }),
    );
    for (const restored of [native.model, importBpmnXml(exportBpmnXml(gate.model))]) {
      const report = analyzeProcess(restored);
      const expected = variant === 'as-is' ? [101.2, 69.2] : [49.6, 41.6];
      expect(report.cycleTimeMinutes! / 60).toBeCloseTo(expected[0]);
      expect(report.theoreticalCycleTimeMinutes! / 60).toBeCloseTo(expected[1]);
      expect(report.cycleTimeEfficiency).toBeCloseTo(expected[1] / expected[0]);
      expect(Object.values(restored.nodes).filter((node) => node.laneId)).toHaveLength(
        Object.values(model.nodes).filter((node) => node.laneId).length,
      );
      const log = studyLog(variant);
      expect(log.events).toHaveLength(variant === 'as-is' ? 160 : 166);
      expect(alignmentConformance(log, restored)).toMatchObject({
        status: 'ready',
        fitness: 1,
        compatibleCases: 20,
        omittedCases: 0,
      });
      const converted = bpmnToPetri(restored);
      if (converted.status !== 'ready')
        throw new Error('The study Petri net must be supported.');
      expect(verifyPetri(converted.net)).toMatchObject({
        status: 'complete',
        states: variant === 'as-is' ? 20 : 27,
        safe: true,
        bounded: true,
        sound: true,
      });
    }
  }
  const deviation = alignmentConformance(studyViolationLog(), studyModel('to-be'));
  expect(deviation.compatibleCases).toBe(1);
  expect(deviation.examinedCases).toBe(4);
  expect(deviation.fitness).toBeCloseTo(0.9230769230769231);
});
