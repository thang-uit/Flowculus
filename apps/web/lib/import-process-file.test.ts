import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import { importProcessFiles } from './import-process-file';

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

describe('importProcessFiles', () => {
  it('restores a Flowculus JSON model and rebuilds XML when needed', async () => {
    const result = await importProcessFiles([
      file('request.flowculus.json', JSON.stringify({ schemaVersion: 1, model })),
    ]);

    expect(result.model).toEqual(model);
    expect(result.xml).toContain('flowculus-kind="task"');
    expect(result.analysisOptions).toEqual({});
    expect(result.modelName).toBe('request');
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

    const result = await importProcessFiles([nodes, edges]);

    expect(Object.keys(result.model?.nodes ?? {})).toEqual(['start', 'task', 'end']);
    expect(Object.keys(result.model?.edges ?? {})).toEqual(['first', 'last']);
    expect(result.xml).toContain('name="request"');
  });

  it('rejects an oversized file before reading its contents', async () => {
    const oversized = file('huge.drawio', '<mxfile />', 50 * 1024 * 1024 + 1);
    await expect(importProcessFiles([oversized])).rejects.toThrow('file-too-large');
  });
});
