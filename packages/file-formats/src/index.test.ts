import { describe, expect, it } from 'vitest';

import {
  parseFlowculusFile,
  parseProcessCsv,
  processModelToCsv,
  serializeFlowculusFile,
} from './index';

const validFile = {
  schemaVersion: 1 as const,
  model: {
    schemaVersion: 1 as const,
    id: 'model-1',
    name: 'Example',
    nodes: {},
    edges: {},
  },
};

describe('Flowculus file format', () => {
  it('round-trips a minimal valid file', () => {
    expect(parseFlowculusFile(serializeFlowculusFile(validFile))).toEqual(validFile);
  });

  it('rejects a malformed model before it reaches the workspace store', () => {
    expect(() =>
      parseFlowculusFile(
        JSON.stringify({
          schemaVersion: 1,
          model: { schemaVersion: 1, id: 'bad', name: 'Bad', nodes: null, edges: {} },
        }),
      ),
    ).toThrow('malformed');
  });

  it('rejects an oversized embedded XML payload', () => {
    expect(() =>
      parseFlowculusFile(
        JSON.stringify({
          ...validFile,
          drawioXml: 'x'.repeat(50_000_001),
        }),
      ),
    ).toThrow('too large');
  });

  it('round-trips the combined nodes and edges CSV export', () => {
    const model = {
      schemaVersion: 1 as const,
      id: 'csv-model',
      name: 'CSV model',
      nodes: {
        start: { id: 'start', label: 'Start', kind: 'start' as const },
        task: {
          id: 'task',
          label: 'Review, request',
          kind: 'task' as const,
          durationMinutes: 12,
          waitingMinutes: 4,
          processingMinutes: 8,
          cost: { resourceRatePerHour: 60, currency: 'USD' },
        },
        end: { id: 'end', label: 'End', kind: 'end' as const },
      },
      edges: {
        first: { id: 'first', source: 'start', target: 'task' },
        last: { id: 'last', source: 'task', target: 'end' },
      },
    };

    const parsed = parseProcessCsv(processModelToCsv(model), model.name);
    expect(parsed.name).toBe(model.name);
    expect(parsed.nodes.task?.label).toBe('Review, request');
    expect(parsed.nodes.task?.processingMinutes).toBe(8);
    expect(parsed.edges.first?.target).toBe('task');
  });

  it('accepts the classroom NodeName/Tail CSV convention', () => {
    const source = [
      'Id,NodeName,NodeType,GatewayType,DurationMin,WaitingMin,CostPerExecution,Resource,Notes',
      'n1,Start,event,,0,0,0,,Start',
      'n2,Approve,task,,20,5,2,Team A,Example',
      'n3,Choice,gateway,xor_split,0,0,0,,Decision',
      '',
      'Id,Source,Tail,FlowType,Condition,Probability',
      'e1,n1,n2,sequence,,1',
      'e2,n2,n3,sequence,,1',
    ].join('\n');

    const parsed = parseProcessCsv(source, 'Classroom graph');
    expect(parsed.nodes.n2?.durationMinutes).toBe(20);
    expect(parsed.nodes.n3?.gatewayKind).toBe('xor');
    expect(parsed.edges.e2?.source).toBe('n2');
  });

  it('preserves non-control BPMN flow kinds without treating them as sequence flows', () => {
    const source = [
      'Id,NodeName,NodeType,DurationMin',
      'start,Start,event,0',
      'task,Task,task,10',
      'data,Data,data,0',
      '',
      'Id,Source,Tail,FlowType,Condition,Probability',
      'control,start,task,sequence,,1',
      'message,start,data,message,,',
      'association,task,data,association,,',
    ].join('\n');

    const parsed = parseProcessCsv(source, 'Flow kinds');
    expect(parsed.edges.control?.kind).toBe('sequence');
    expect(parsed.edges.message?.kind).toBe('message');
    expect(parsed.edges.association?.kind).toBe('association');
  });

  it('keeps classroom gateway labels such as exclusive in the control flow', () => {
    const source = [
      'Id,NodeName,NodeType,GatewayType,DurationMin',
      'start,Start,event,,0',
      'choice,Choice,gateway,xor_split,0',
      'fast,Fast,task,,10',
      'slow,Slow,task,,20',
      'end,End,event,,0',
      '',
      'Id,Source,Tail,FlowType,Condition,Probability',
      'e1,start,choice,sequence,,1',
      'e2,choice,fast,exclusive,yes,0.6',
      'e3,choice,slow,exclusive,no,0.4',
      'e4,fast,end,sequence,,1',
      'e5,slow,end,sequence,,1',
    ].join('\n');

    const parsed = parseProcessCsv(source, 'XOR classroom graph');
    expect(parsed.edges.e2?.kind).toBe('sequence');
    expect(parsed.edges.e3?.kind).toBe('sequence');
    expect(parsed.edges.e2?.probability).toBe(0.6);
    expect(parsed.nodes.choice?.gatewayKind).toBe('xor');
  });
});
