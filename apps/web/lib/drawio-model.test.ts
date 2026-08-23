import { describe, expect, it } from 'vitest';

import { drawioJsonToProcessModel } from './drawio-model';

const exportWithStyle = (style: string, label = 'Native shape') =>
  drawioJsonToProcessModel({
    data: '',
    pages: [
      {
        id: 'page-1',
        name: 'Native BPMN',
        cells: [
          { id: '0', type: 'layer' },
          { id: '1', type: 'node', parent: '0', label, style },
        ],
      },
    ],
  });

describe('draw.io semantic inference', () => {
  it('recognizes native BPMN gateway styles', () => {
    const model = exportWithStyle(
      'shape=mxgraph.bpmn.gateway2;gwType=parallel;outline=none;',
      'Parallel gateway',
    );
    expect(model.nodes['1']).toMatchObject({
      kind: 'gateway',
      gatewayKind: 'and',
    });
    expect(model.nodes['1']?.metadata?.['flowculus-inferred-kind']).toBe(true);
  });

  it('recognizes native BPMN event styles without treating outline=none as an event', () => {
    const task = exportWithStyle('shape=mxgraph.bpmn.task;outline=none;', 'Task');
    const event = exportWithStyle(
      'shape=mxgraph.bpmn.event;outline=catching;symbol=timer;',
      'Timer',
    );
    expect(task.nodes['1']?.kind).toBe('task');
    expect(event.nodes['1']?.kind).toBe('event');
  });

  it('maps classroom nodeType/gatewayType and durationMin metadata', () => {
    const model = drawioJsonToProcessModel({
      data: '',
      pages: [
        {
          id: 'page-1',
          name: 'Classroom graph',
          cells: [
            { id: 'start', type: 'node', label: 'Start', nodeType: 'event' } as never,
            {
              id: 'task',
              type: 'node',
              label: 'Task 1',
              nodeType: 'task',
              durationMin: '10',
              waitingMin: '2',
            } as never,
            {
              id: 'xor',
              type: 'node',
              label: 'XOR Decision',
              nodeType: 'gateway',
              gatewayType: 'xor_split',
              style: 'shape=mxgraph.bpmn.gateway_xor_(data);',
            } as never,
          ],
        },
      ],
    });

    expect(model.nodes.start?.kind).toBe('start');
    expect(model.nodes.task).toMatchObject({
      kind: 'task',
      durationMinutes: 10,
      waitingMinutes: 2,
    });
    expect(model.nodes.xor).toMatchObject({ kind: 'gateway', gatewayKind: 'xor' });
  });

  it('does not mistake the xor token inside a gateway style for OR', () => {
    const model = exportWithStyle(
      'shape=mxgraph.bpmn.gateway_xor_(data);whiteSpace=wrap;html=1;',
      'Decision',
    );
    expect(model.nodes['1']?.gatewayKind).toBe('xor');
  });

  it('keeps message and association edges out of the control-flow kind', () => {
    const model = drawioJsonToProcessModel({
      data: '',
      pages: [
        {
          id: 'page-1',
          name: 'Flow kinds',
          cells: [
            { id: 'start', type: 'node', label: 'Start', nodeType: 'event' } as never,
            { id: 'task', type: 'node', label: 'Task', nodeType: 'task' } as never,
            { id: 'data', type: 'node', label: 'Data', nodeType: 'data' } as never,
            {
              id: 'control',
              type: 'edge',
              source: 'start',
              target: 'task',
              flowType: 'sequence',
            } as never,
            {
              id: 'message',
              type: 'edge',
              source: 'start',
              target: 'data',
              flowType: 'message',
            } as never,
            {
              id: 'association',
              type: 'edge',
              source: 'task',
              target: 'data',
              flowType: 'association',
            } as never,
            {
              id: 'exclusive',
              type: 'edge',
              source: 'start',
              target: 'task',
              flowType: 'exclusive',
            } as never,
          ],
        },
      ],
    });

    expect(model.edges.control?.kind).toBe('sequence');
    expect(model.edges.message?.kind).toBe('message');
    expect(model.edges.association?.kind).toBe('association');
    expect(model.edges.exclusive?.kind).toBe('sequence');
  });

  it('does not turn unconnected diagram legends into process activities', () => {
    const model = drawioJsonToProcessModel({
      data: '',
      pages: [
        {
          id: 'page-1',
          name: 'Teaching graph',
          cells: [
            { id: 'title', type: 'node', label: 'Teaching graph', style: 'text;html=1;' },
            { id: 'legend-task', type: 'node', label: 'Task', style: 'rounded=1;' },
            { id: 'start', type: 'node', label: 'Start', nodeType: 'event' } as never,
            { id: 'task', type: 'node', label: 'Review', nodeType: 'task' } as never,
            { id: 'end', type: 'node', label: 'End', nodeType: 'event' } as never,
            { id: 'e1', type: 'edge', source: 'start', target: 'task' },
            { id: 'e2', type: 'edge', source: 'task', target: 'end' },
          ],
        },
      ],
    });

    expect(Object.keys(model.nodes)).toEqual(['start', 'task', 'end']);
  });
});
