import { describe, expect, it, vi } from 'vitest';

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

it('retains the selected draw.io source page inside a portable model backup', async () => {
  const xml =
    '<mxfile><diagram id="one" name="First"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram><diagram id="two" name="Second"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
  const result = await importWorkspaceFiles([
    file(
      'multi.flowculus.json',
      JSON.stringify({ schemaVersion: 1, model, drawioXml: xml, drawioPageIndex: 1 }),
    ),
  ]);
  expect(result.kind).toBe('model');
  if (result.kind === 'model') {
    expect(result.drawioSource?.pageIndex).toBe(1);
    expect(result.model.name).toBe(model.name);
  }
});

it('recovers missing bounds from the selected embedded draw.io page, preserving explicit native coordinates', async () => {
  const page = (id: string, x: number) =>
    `<diagram id="${id}" name="${id}"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><object id="task" label="Task" flowculus-kind="task"><mxCell vertex="1" parent="1"><mxGeometry x="${x}" y="80" width="176" height="84" as="geometry"/></mxCell></object></root></mxGraphModel></diagram>`;
  const xml = `<mxfile>${page('one', 10)}${page('two', 740)}</mxfile>`;
  const native = {
    ...model,
    nodes: {
      ...model.nodes,
      start: { ...model.nodes.start!, bounds: { x: 321, y: 42, width: 48, height: 48 } },
    },
  };
  const result = await importWorkspaceFiles([
    file(
      'legacy.flowculus.json',
      JSON.stringify({
        schemaVersion: 1,
        model: native,
        drawioXml: xml,
        drawioPageIndex: 1,
      }),
    ),
  ]);
  if (result.kind !== 'model') throw new Error('expected model');
  expect(result.model.nodes.task?.bounds?.x).toBe(740);
  expect(result.model.nodes.start?.bounds?.x).toBe(321);
});

describe('importWorkspaceFiles', () => {
  it('does not read an already cancelled import', async () => {
    const controller = new AbortController();
    controller.abort();
    const text = vi.fn(async () => 'invalid');
    await expect(
      importWorkspaceFiles(
        [{ ...file('old.json', ''), text }],
        undefined,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(text).not.toHaveBeenCalled();
  });

  it('discards a cancelled text read before parsing its stale contents', async () => {
    const controller = new AbortController();
    let finish!: (source: string) => void;
    const source = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const reading = importWorkspaceFiles(
      [{ ...file('old.json', ''), text: () => source }],
      undefined,
      controller.signal,
    );
    controller.abort();
    finish('invalid JSON that must never be parsed');
    await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('routes a validated local image to Image Trace without decoding it as text', async () => {
    const image = { name: 'board.png', type: 'image/png', size: 128 } as File;
    await expect(importWorkspaceFiles([image])).resolves.toEqual({
      kind: 'image',
      file: image,
    });
    await expect(
      importWorkspaceFiles([{ ...image, size: 21 * 1024 * 1024 } as File]),
    ).rejects.toThrow('invalid-size');
    await expect(
      importWorkspaceFiles([{ ...image, type: 'text/plain' } as File]),
    ).rejects.toThrow('invalid-type');
  });
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
    const reversed = await importWorkspaceFiles([edges, nodes]);
    expect(reversed.kind).toBe('model');
    if (reversed.kind !== 'model') throw new Error('expected a model');
    expect(Object.keys(reversed.model.edges)).toEqual(['first', 'last']);
  });

  it('rejects an orphan edges CSV instead of sending it to Mining', async () => {
    await expect(
      importWorkspaceFiles([file('request.edges.csv', 'id,source,target\ne1,a,b')]),
    ).rejects.toThrow('missing-node-table');
  });

  it('rejects a structurally invalid process CSV before loading the canvas', async () => {
    await expect(
      importWorkspaceFiles([
        file('request.nodes.csv', 'id,label,kind\na,A,task'),
        file('request.edges.csv', 'id,source,target\ne1,a,missing'),
      ]),
    ).rejects.toThrow('invalid-model-csv');
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

  it('rejects a Flowculus file with an invalid model instead of loading it', async () => {
    const broken = {
      ...model,
      edges: { broken: { id: 'broken', source: 'missing', target: 'task' } },
    };
    await expect(
      importWorkspaceFiles([
        file(
          'broken.flowculus.json',
          JSON.stringify({ schemaVersion: 1, model: broken }),
        ),
      ]),
    ).rejects.toThrow('invalid-model');
  });
});
