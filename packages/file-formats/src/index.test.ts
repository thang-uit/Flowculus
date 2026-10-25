import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import {
  detectCsvDelimiter,
  parseCsvTable,
  parseFlowculusFile,
  parseProcessCsv,
  processModelToCsv,
  processModelToSvg,
  serializeFlowculusFile,
  withAutoLayout,
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

  it('preserves connector geometry and semantic flags through CSV', () => {
    const model: ProcessModel = {
      schemaVersion: 1,
      id: 'route',
      name: 'Route',
      nodes: {
        a: {
          id: 'a',
          label: 'A',
          kind: 'start',
          metadata: { 'flowculus-inferred-kind': true },
        },
        b: { id: 'b', label: 'B', kind: 'end' },
      },
      edges: {
        e: {
          id: 'e',
          source: 'a',
          target: 'b',
          kind: 'sequence',
          routing: { style: 'curved', waypoints: [{ x: 40, y: 60 }] },
          metadata: { 'flowculus-inferred-edge-kind': true },
        },
      },
    };
    const parsed = parseProcessCsv(processModelToCsv(model), 'Route');
    expect(parsed.edges.e.routing).toEqual(model.edges.e.routing);
    expect(parsed.nodes.a.metadata?.['flowculus-inferred-kind']).toBe(true);
    expect(parsed.edges.e.metadata?.['flowculus-inferred-edge-kind']).toBe(true);
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
    expect(parsed.nodes.task?.cost?.currency).toBe('USD');
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

  it('round-trips node geometry through the nodes CSV columns', () => {
    const parsed = parseProcessCsv(
      processModelToCsv({
        schemaVersion: 1,
        id: 'geo',
        name: 'Geometry',
        nodes: {
          task: {
            id: 'task',
            label: 'Task',
            kind: 'task',
            bounds: { x: 12.5, y: 40, width: 176, height: 84 },
          },
        },
        edges: {},
      }),
    );
    expect(parsed.nodes.task?.bounds).toEqual({ x: 12.5, y: 40, width: 176, height: 84 });
  });

  it('rejects invalid numeric cells instead of silently dropping them', () => {
    expect(() =>
      parseProcessCsv('id,label,kind,processing_minutes\na,Approve,task,abc'),
    ).toThrow('Invalid number in nodes row 1, column processingMinutes');
    expect(() =>
      parseProcessCsv('id,label\na,Approve\n\nid,source,target,probability\ne1,a,a,nope'),
    ).toThrow('Invalid number in edges row 1, column probability');
    expect(() =>
      parseProcessCsv('id,label,kind,processing_minutes\na,Approve,task,50%'),
    ).toThrow('Invalid number in nodes row 1, column processingMinutes');
  });
});

describe('CSV table reader', () => {
  it('detects semicolon and tab delimited exports', () => {
    expect(detectCsvDelimiter('case;activity;time\n1;A;2026')).toBe(';');
    expect(detectCsvDelimiter('case\tactivity\n1\tA')).toBe('\t');
    expect(parseCsvTable('"a;b";c\n1;2').rows).toEqual([
      ['a;b', 'c'],
      ['1', '2'],
    ]);
  });
});

const flow: ProcessModel = {
  schemaVersion: 1,
  id: 'svg',
  name: 'Svg <flow>',
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    split: { id: 'split', label: 'Approve?', kind: 'gateway', gatewayKind: 'xor' },
    yes: {
      id: 'yes',
      label: 'Approve',
      kind: 'task',
      processingMinutes: 30,
      waitingMinutes: 90,
    },
    no: { id: 'no', label: 'Reject', kind: 'task', durationMinutes: 5 },
    end: { id: 'end', label: 'End', kind: 'end' },
    note: { id: 'note', label: 'Policy', kind: 'annotation' },
  },
  edges: {
    a: { id: 'a', source: 'start', target: 'split' },
    b: { id: 'b', source: 'split', target: 'yes', probability: 0.7, condition: 'ok' },
    c: { id: 'c', source: 'split', target: 'no', probability: 0.3 },
    d: { id: 'd', source: 'yes', target: 'end' },
    e: { id: 'e', source: 'no', target: 'end' },
  },
};

describe('withAutoLayout', () => {
  it('assigns left-to-right bounds only where geometry is missing', () => {
    const laidOut = withAutoLayout(flow);
    Object.values(laidOut.nodes).forEach((node) => expect(node.bounds).toBeDefined());
    expect(laidOut.nodes.split!.bounds!.x).toBeGreaterThan(
      laidOut.nodes.start!.bounds!.x,
    );
    expect(laidOut.nodes.end!.bounds!.x).toBeGreaterThan(laidOut.nodes.yes!.bounds!.x);
    expect(laidOut.nodes.yes!.bounds!.y).not.toBe(laidOut.nodes.no!.bounds!.y);
    expect(withAutoLayout(laidOut)).toBe(laidOut);
  });
});

describe('processModelToSvg', () => {
  it('renders shapes, labels and the highlighted path as vector markup', () => {
    const { svg, width, height } = processModelToSvg(withAutoLayout(flow), {
      highlightNodeIds: ['yes'],
      highlightEdgeIds: ['b'],
    });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(width).toBeGreaterThan(400);
    expect(height).toBeGreaterThan(100);
    expect(svg).toContain('<title>Svg &lt;flow&gt;</title>');
    expect(svg).toContain('ok · p = 0.7');
    expect(svg).toContain('T 30m · Wq 1.5h');
    expect(svg).toContain('marker-end="url(#fc-arrow-accent)"');
    expect(svg.match(/<polygon/g)?.length).toBeGreaterThanOrEqual(1);
  });
});
