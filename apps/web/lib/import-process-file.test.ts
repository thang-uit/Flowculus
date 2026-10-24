import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import { importWorkspaceFiles } from './import-process-file';

const file = (name: string, source: string, size = source.length): File =>
  ({ name, size, text: async () => source }) as unknown as File;

const model: ProcessModel = {
  schemaVersion: 1,
  id: 'import-fixture',
  name: 'Import fixture',
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    task: { id: 'task', label: 'Task', kind: 'task', durationMinutes: 8 },
    end: { id: 'end', label: 'End', kind: 'end' },
  },
  edges: {
    first: { id: 'first', source: 'start', target: 'task' },
    last: { id: 'last', source: 'task', target: 'end' },
  },
};

describe('importWorkspaceFiles', () => {
  it('restores a Flowculus JSON model and lays out nodes without geometry', async () => {
    const result = await importWorkspaceFiles([
      file('request.flowculus.json', JSON.stringify({ schemaVersion: 1, model })),
    ]);
    if (result.kind !== 'model') throw new Error('expected a model');
    expect(Object.keys(result.model.nodes)).toEqual(['start', 'task', 'end']);
    expect(result.model.nodes.task?.bounds).toBeDefined();
    expect(result.drawioSource).toBeNull();
    expect(result.modelName).toBe('Import fixture');
  });

  it('combines nodes and edges CSV files dropped together', async () => {
    const nodes = file(
      'request.nodes.csv',
      'id,label,kind,duration_minutes\nstart,Start,start,\ntask,Task,task,8\nend,End,end,',
    );
    const edges = file(
      'request.edges.csv',
      'id,source,target,kind\nfirst,start,task,sequence\nlast,task,end,sequence',
    );
    const result = await importWorkspaceFiles([nodes, edges]);
    if (result.kind !== 'model') throw new Error('expected a model');
    expect(Object.keys(result.model.nodes)).toEqual(['start', 'task', 'end']);
    expect(Object.keys(result.model.edges)).toEqual(['first', 'last']);
    expect(result.modelName).toBe('request');
  });

  it('keeps the original draw.io XML so export can patch it', async () => {
    const xml =
      '<mxfile><diagram id="p1" name="Page-1"><mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" /><mxCell id="a" value="Approve" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="10" y="20" width="120" height="60" as="geometry" /></mxCell></root></mxGraphModel></diagram></mxfile>';
    const result = await importWorkspaceFiles([file('approval.drawio', xml)]);
    if (result.kind !== 'model') throw new Error('expected a model');
    expect(result.drawioSource?.xml).toBe(xml);
    expect(result.drawioSource?.pages).toEqual([{ id: 'p1', name: 'Page-1' }]);
    expect(result.model.name).toBe('approval');
    expect(result.model.nodes.a?.bounds).toEqual({
      x: 10,
      y: 20,
      width: 120,
      height: 60,
    });
  });

  it('routes event logs to the process-mining view', async () => {
    const csv = file(
      'orders.csv',
      'case_id,activity,timestamp\n1,Create,2026-10-01T08:00:00Z',
    );
    expect((await importWorkspaceFiles([csv])).kind).toBe('event-log');
    const xes = file('log.xes', '<log><trace /></log>');
    expect((await importWorkspaceFiles([xes])).kind).toBe('event-log');
    const json = file('log.json', '[{"case":"1"}]');
    expect((await importWorkspaceFiles([json])).kind).toBe('event-log');
  });

  it('rejects an oversized file before reading its contents', async () => {
    const oversized = file('huge.drawio', '<mxfile />', 50 * 1024 * 1024 + 1);
    await expect(importWorkspaceFiles([oversized])).rejects.toThrow('file-too-large');
  });
});
