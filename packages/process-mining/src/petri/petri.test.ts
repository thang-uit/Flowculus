import { describe, it, expect } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import { exportBpmnXml, importBpmnXml } from '../../../bpmn-adapter/src/index';
import { checkSemanticGate, validateModelStructure } from '@flowculus/validation';
import { bpmnToPetri } from './from-bpmn';
import { verifyPetri } from './reachability';
import { alignmentConformance } from '../alignment-conformance';
import { deliveryLog, deliveryModel } from '../__fixtures__/software-delivery';
import { buildSocialNetwork } from '../social-network';
import { buildFootprint } from './footprint';
import { mineAlpha } from '../alpha-miner';
import { alphaToPetri } from './from-alpha';
import { petriToPnml } from './pnml';

describe('BPMN/Petri and reproducible external demo', () => {
  it('round-trips standard BPMN with lanes and exact analysis metadata', () => {
    const model = deliveryModel();
    expect(validateModelStructure(model).diagnostics).toEqual([]);
    const gate = checkSemanticGate(model);
    expect(gate.ok).toBe(true);
    if (!gate.ok) return;
    const restored = importBpmnXml(exportBpmnXml(gate.model));
    expect(Object.keys(restored.nodes)).toHaveLength(Object.keys(model.nodes).length);
    expect(restored.name).toBe(model.name);
    expect(restored.nodes.backend.laneId).toBe('lane_be');
    expect(analyzeProcess(restored).cycleTimeMinutes).toBe(
      analyzeProcess(model).cycleTimeMinutes,
    );
  });
  it('proves the finite routing model sound and accepts both parallel orders', () => {
    const converted = bpmnToPetri(deliveryModel());
    expect(converted.status).toBe('ready');
    if (converted.status !== 'ready') return;
    const report = verifyPetri(converted.net);
    expect(report.status).toBe('complete');
    expect(report.safe).toBe(true);
    expect(report.sound).toBe(true);
    expect(petriToPnml(converted.net)).toContain('finalmarkings');
    const result = alignmentConformance(deliveryLog(), deliveryModel());
    expect(result.status).toBe('ready');
    expect(result.examinedCases).toBe(8);
    expect(result.compatibleCases).toBe(4);
    expect(
      result.examples.find((example) => example.caseId === 'CASE_004')?.moves,
    ).toContainEqual(
      expect.objectContaining({ kind: 'model', activity: 'Test integrated build' }),
    );
  });
  it('withholds a proof when a state budget is exhausted', () => {
    const converted = bpmnToPetri(deliveryModel());
    if (converted.status !== 'ready') throw Error();
    const result = verifyPetri(converted.net, 1);
    expect(result.status).toBe('limit');
    expect(result.sound).toBeNull();
  });
  it('keeps inward handoffs separate from total degree and outward transfers', () => {
    const network = buildSocialNetwork(deliveryLog());
    for (const resource of network.resources)
      expect(resource.handoffs).toBe(
        resource.incomingHandoffs + resource.outgoingHandoffs,
      );
    expect(
      network.resources.some((resource) => resource.inDegree !== resource.outDegree),
    ).toBe(true);
  });
  it('discovers a Petri net and footprint from the demo without inventing loop semantics', () => {
    const log = deliveryLog();
    const alpha = mineAlpha(log);
    expect(buildFootprint(log)).not.toBeNull();
    expect(alphaToPetri(alpha, log.name).status).toBe('ready');
  });
  it('rejects hostile XML and unsupported timers rather than flattening semantics', () => {
    expect(() => importBpmnXml('<!DOCTYPE a><a/>')).toThrow('bpmn-invalid');
    expect(() =>
      importBpmnXml(
        '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="p"><startEvent id="s"><timerEventDefinition/></startEvent></process></definitions>',
      ),
    ).toThrow('bpmn-unsupported');
  });
});
