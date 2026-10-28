import { it, expect } from 'vitest';
import { importBpmnXml } from './import';
import { exportBpmnXml } from './export';
import { checkSemanticGate, validateModelStructure } from '@flowculus/validation';
const source =
  '<x:definitions xmlns:x="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs"><x:process id="p" name="Review"><x:startEvent id="s"/><x:task id="a" name="Review"/><x:endEvent id="e"/><x:sequenceFlow id="f1" sourceRef="s" targetRef="a"/><x:sequenceFlow id="f2" sourceRef="a" targetRef="e"/></x:process></x:definitions>';
it('reads namespace-qualified BPMN without DI and writes a standard diagram', () => {
  const model = importBpmnXml(source);
  expect(validateModelStructure(model).diagnostics).toEqual([]);
  const gate = checkSemanticGate(model);
  if (!gate.ok) throw Error();
  const xml = exportBpmnXml(gate.model);
  expect(xml).toContain('BPMNDiagram');
  expect(importBpmnXml(xml).nodes.a.label).toBe('Review');
});
it('rejects duplicate IDs, dangling flows, foreign namespaces and nested execution', () => {
  expect(() => importBpmnXml(source.replace('id="a"', 'id="s"'))).toThrow();
  expect(() =>
    importBpmnXml(source.replace('targetRef="a"', 'targetRef="absent"')),
  ).toThrow();
  expect(() => importBpmnXml(source.replace('20100524/MODEL', 'foreign'))).toThrow();
  expect(() =>
    importBpmnXml(
      source.replace(
        '<x:task id="a" name="Review"/>',
        '<x:subProcess id="a"><x:task id="inner"/></x:subProcess>',
      ),
    ),
  ).toThrow('bpmn-unsupported');
});
