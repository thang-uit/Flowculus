import { describe, expect, it } from 'vitest';

import type { ProcessModel } from '@flowculus/process-model';

import { exportDrawioXml, importDrawioXml, parseFlowLabel } from './index';

const wrap = (cells: string, pageAttributes = 'id="page-1" name="Page-1"') =>
  `<mxfile host="test"><diagram ${pageAttributes}><mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" />${cells}</root></mxGraphModel></diagram></mxfile>`;

const vertex = (
  id: string,
  style: string,
  label = id,
  geometry = 'x="10" y="20" width="120" height="60"',
) =>
  `<mxCell id="${id}" value="${label}" style="${style}" vertex="1" parent="1"><mxGeometry ${geometry} as="geometry" /></mxCell>`;

const edge = (id: string, source: string, target: string, extra = '') =>
  `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" ${extra}><mxGeometry relative="1" as="geometry" /></mxCell>`;

const importModel = async (xml: string) => (await importDrawioXml(xml)).model;

const REQUEST_FLOW = wrap(
  [
    '<object id="start" label="Request received" flowculus-kind="start"><mxCell style="shape=mxgraph.bpmn.event;outline=standard;symbol=general;" vertex="1" parent="1"><mxGeometry x="40" y="100" width="44" height="44" as="geometry" /></mxCell></object>',
    '<object id="triage" label="Triage&lt;br&gt;18 min" flowculus-kind="task" flowculus-duration-minutes="18" flowculus-processing-minutes="6" flowculus-waiting-minutes="12"><mxCell style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="140" y="80" width="160" height="84" as="geometry" /></mxCell></object>',
    '<object id="review" label="Review?" flowculus-kind="gateway" flowculus-gateway-kind="xor"><mxCell style="shape=mxgraph.bpmn.gateway2;gwType=exclusive;" vertex="1" parent="1"><mxGeometry x="360" y="94" width="56" height="56" as="geometry" /></mxCell></object>',
    '<object id="done" label="Done" flowculus-kind="end"><mxCell style="shape=mxgraph.bpmn.event;outline=end;" vertex="1" parent="1"><mxGeometry x="480" y="100" width="44" height="44" as="geometry" /></mxCell></object>',
    '<mxCell id="legend" value="Legend: yellow = gateway" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="300" width="200" height="30" as="geometry" /></mxCell>',
    '<mxCell id="pool" value="Support" style="swimlane;horizontal=0;" vertex="1" parent="1"><mxGeometry x="0" y="400" width="600" height="200" as="geometry" /></mxCell>',
    '<object id="lane-task" label="Inside lane" flowculus-kind="task"><mxCell style="rounded=1;" vertex="1" parent="pool"><mxGeometry x="100" y="50" width="120" height="60" as="geometry" /></mxCell></object>',
    edge('e1', 'start', 'triage'),
    edge('e2', 'triage', 'review'),
    '<object id="e3" label="yes · p = 0.7" flowculus-kind="sequence"><mxCell edge="1" parent="1" source="review" target="done" style="edgeStyle=orthogonalEdgeStyle;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="390" y="40" /></Array></mxGeometry></mxCell></object>',
    edge('e4', 'review', 'lane-task', 'style="edgeStyle=orthogonalEdgeStyle;"'),
    '<mxCell id="e4-label" value="no · p = 0.3" style="edgeLabel;html=1;" vertex="1" connectable="0" parent="e4"><mxGeometry x="-0.2" relative="1" as="geometry" /></mxCell>',
  ].join(''),
);

describe('importDrawioXml', () => {
  it('maps geometry to absolute bounds and keeps containers out of the graph', async () => {
    const model = await importModel(REQUEST_FLOW);
    expect(Object.keys(model.nodes).sort()).toEqual(
      ['done', 'lane-task', 'review', 'start', 'triage'].sort(),
    );
    expect(model.nodes.triage).toMatchObject({
      label: 'Triage 18 min',
      kind: 'task',
      durationMinutes: 18,
      processingMinutes: 6,
      waitingMinutes: 12,
      bounds: { x: 140, y: 80, width: 160, height: 84 },
    });
    expect(model.nodes['lane-task']?.bounds).toEqual({
      x: 100,
      y: 450,
      width: 120,
      height: 60,
    });
    expect(model.edges.e3).toMatchObject({ condition: 'yes', probability: 0.7 });
    expect(model.edges.e4).toMatchObject({ condition: 'no', probability: 0.3 });
    expect(model.metadata?.pageId).toBe('page-1');
  });

  it('infers native BPMN shapes and flags them as assumptions', async () => {
    const model = await importModel(
      wrap(
        [
          vertex('s', 'shape=mxgraph.bpmn.event;outline=standard;symbol=general;', ''),
          vertex(
            'g',
            'shape=mxgraph.bpmn.gateway2;gwType=parallel;outline=none;',
            'Fork',
          ),
          vertex(
            'x',
            'shape=mxgraph.bpmn.gateway_xor_(data);whiteSpace=wrap;html=1;',
            'Decision',
          ),
          vertex(
            'timer',
            'shape=mxgraph.bpmn.event;outline=catching;symbol=timer;',
            'Timer',
          ),
          vertex('t', 'shape=mxgraph.bpmn.task;outline=none;', 'Task'),
          vertex('e', 'shape=mxgraph.bpmn.event;outline=end;symbol=terminate2;', ''),
          edge('1-2', 's', 'g'),
          edge('2-3', 'g', 'x'),
          edge('3-4', 'x', 'timer'),
          edge('4-5', 'timer', 't'),
          edge('5-6', 't', 'e'),
        ].join(''),
      ),
    );
    expect(model.nodes.s?.kind).toBe('start');
    expect(model.nodes.g).toMatchObject({ kind: 'gateway', gatewayKind: 'and' });
    expect(model.nodes.g?.metadata?.['flowculus-inferred-kind']).toBe(true);
    expect(model.nodes.g?.metadata?.['flowculus-inferred-gateway-kind']).toBe(true);
    expect(model.nodes.x?.gatewayKind).toBe('xor');
    expect(model.nodes.timer?.kind).toBe('event');
    expect(model.nodes.t?.kind).toBe('task');
    expect(model.nodes.e?.kind).toBe('end');
  });

  it('maps classroom nodeType/gatewayType metadata and flow types', async () => {
    const model = await importModel(
      wrap(
        [
          '<object id="start" label="Start" nodeType="event"><mxCell style="ellipse;" vertex="1" parent="1"><mxGeometry width="40" height="40" as="geometry" /></mxCell></object>',
          '<object id="task" label="Task 1" nodeType="task" durationMin="10" waitingMin="2"><mxCell style="rounded=1;" vertex="1" parent="1"><mxGeometry x="80" width="120" height="60" as="geometry" /></mxCell></object>',
          '<object id="xor" label="XOR Decision" nodeType="gateway" gatewayType="xor_split"><mxCell style="rhombus;" vertex="1" parent="1"><mxGeometry x="240" width="60" height="60" as="geometry" /></mxCell></object>',
          '<object id="data" label="Data" nodeType="data"><mxCell style="shape=note;" vertex="1" parent="1"><mxGeometry x="240" y="120" width="40" height="50" as="geometry" /></mxCell></object>',
          '<object id="c" flowType="sequence"><mxCell edge="1" parent="1" source="start" target="task"><mxGeometry relative="1" as="geometry" /></mxCell></object>',
          '<object id="x" flowType="exclusive"><mxCell edge="1" parent="1" source="task" target="xor"><mxGeometry relative="1" as="geometry" /></mxCell></object>',
          '<object id="m" flowType="message"><mxCell edge="1" parent="1" source="start" target="data"><mxGeometry relative="1" as="geometry" /></mxCell></object>',
          '<object id="a" flowType="association"><mxCell edge="1" parent="1" source="task" target="data"><mxGeometry relative="1" as="geometry" /></mxCell></object>',
        ].join(''),
      ),
    );
    expect(model.nodes.start?.kind).toBe('start');
    expect(model.nodes.task).toMatchObject({
      kind: 'task',
      durationMinutes: 10,
      waitingMinutes: 2,
    });
    expect(model.nodes.xor).toMatchObject({ kind: 'gateway', gatewayKind: 'xor' });
    expect(model.edges.c?.kind).toBe('sequence');
    expect(model.edges.x?.kind).toBe('sequence');
    expect(model.edges.m?.kind).toBe('message');
    expect(model.edges.a?.kind).toBe('association');
  });

  it('reads compressed pages and selects the requested page', async () => {
    const page = `<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" />${vertex('only', 'rounded=1;', 'Compressed task')}</root></mxGraphModel>`;
    const stream = new Blob([encodeURIComponent(page)])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    const encoded = btoa(String.fromCharCode(...bytes));
    const xml = `<mxfile><diagram id="a" name="First">${encoded}</diagram><diagram id="b" name="Second"><mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" />${vertex('other', 'rounded=1;', 'Other')}</root></mxGraphModel></diagram></mxfile>`;
    const first = await importDrawioXml(xml);
    expect(first.pages.map((item) => item.name)).toEqual(['First', 'Second']);
    expect(first.model.nodes.only?.label).toBe('Compressed task');
    const second = await importDrawioXml(xml, { pageIndex: 1 });
    expect(Object.keys(second.model.nodes)).toEqual(['other']);
    expect(second.model.metadata?.pageId).toBe('b');
  });
});

describe('exportDrawioXml', () => {
  it('round-trips nodes, edges and bounds without losing unknown cells', async () => {
    const original = await importModel(REQUEST_FLOW);
    const exported = await exportDrawioXml(original, REQUEST_FLOW);
    const reimported = await importModel(exported);

    expect(Object.keys(reimported.nodes).sort()).toEqual(
      Object.keys(original.nodes).sort(),
    );
    expect(Object.keys(reimported.edges).sort()).toEqual(
      Object.keys(original.edges).sort(),
    );
    Object.values(original.nodes).forEach((node) => {
      expect(reimported.nodes[node.id]?.bounds).toEqual(node.bounds);
      expect(reimported.nodes[node.id]?.kind).toBe(node.kind);
    });
    expect(exported).toContain('id="legend"');
    expect(exported).toContain('id="pool"');
    expect(exported).toContain('<mxPoint x="390" y="40" />');
    expect(reimported.edges.e4).toMatchObject({ condition: 'no', probability: 0.3 });
  });

  it('patches moved nodes, appends new cells and removes deleted ones', async () => {
    const model = await importModel(REQUEST_FLOW);
    const edited: ProcessModel = {
      ...model,
      nodes: {
        ...Object.fromEntries(
          Object.entries(model.nodes).filter(([id]) => id !== 'lane-task'),
        ),
        done: { ...model.nodes.done, bounds: { x: 600, y: 100, width: 44, height: 44 } },
        audit: {
          id: 'audit',
          label: 'Audit <draft>',
          kind: 'task',
          durationMinutes: 5,
          bounds: { x: 600, y: 240, width: 176, height: 84 },
        },
      },
      edges: {
        ...Object.fromEntries(Object.entries(model.edges).filter(([id]) => id !== 'e4')),
        e3: { ...model.edges.e3, probability: 1, condition: undefined },
        e5: { id: 'e5', source: 'review', target: 'audit', probability: 0 },
      },
    };
    const exported = await exportDrawioXml(edited, REQUEST_FLOW);
    const reimported = await importModel(exported);

    expect(reimported.nodes['lane-task']).toBeUndefined();
    expect(reimported.edges.e4).toBeUndefined();
    expect(exported).not.toContain('e4-label');
    expect(reimported.nodes.done?.bounds).toEqual({
      x: 600,
      y: 100,
      width: 44,
      height: 44,
    });
    expect(reimported.nodes.audit).toMatchObject({
      label: 'Audit <draft>',
      kind: 'task',
      durationMinutes: 5,
      bounds: { x: 600, y: 240, width: 176, height: 84 },
    });
    expect(reimported.nodes.audit?.metadata?.['flowculus-inferred-kind']).toBeUndefined();
    expect(reimported.edges.e5).toMatchObject({
      source: 'review',
      target: 'audit',
      probability: 0,
    });
    expect(reimported.edges.e3?.probability).toBe(1);
    // The moved end event invalidates the hand-drawn waypoint of e3.
    expect(exported).not.toContain('<mxPoint x="390" y="40" />');
    expect(exported).toContain('id="pool"');
  });

  it('creates a fresh diagrams.net document when there is no source file', async () => {
    const model: ProcessModel = {
      schemaVersion: 1,
      id: 'fresh',
      name: 'Fresh & new',
      nodes: {
        s: {
          id: 's',
          label: 'Start',
          kind: 'start',
          bounds: { x: 0, y: 0, width: 44, height: 44 },
        },
        g: {
          id: 'g',
          label: 'Split',
          kind: 'gateway',
          gatewayKind: 'and',
          bounds: { x: 100, y: 0, width: 56, height: 56 },
        },
      },
      edges: { f: { id: 'f', source: 's', target: 'g' } },
    };
    const xml = await exportDrawioXml(model);
    expect(xml).toContain('name="Fresh &amp; new"');
    expect(xml).toContain('gwType=parallel');
    const reimported = await importModel(xml);
    expect(reimported.nodes.g).toMatchObject({ kind: 'gateway', gatewayKind: 'and' });
    expect(
      reimported.nodes.g?.metadata?.['flowculus-inferred-gateway-kind'],
    ).toBeUndefined();
    expect(reimported.edges.f).toMatchObject({
      source: 's',
      target: 'g',
      kind: 'sequence',
    });
  });

  it('keeps other pages and decompresses only the edited page', async () => {
    const xml = `<mxfile><diagram id="a" name="A"><mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" />${vertex('t', 'rounded=1;', 'Task')}</root></mxGraphModel></diagram><diagram id="b" name="B">c2VjcmV0</diagram></mxfile>`;
    const { model } = await importDrawioXml(xml);
    const exported = await exportDrawioXml(model, xml);
    expect(exported).toContain('<diagram id="b" name="B">c2VjcmV0</diagram>');
  });
});

describe('parseFlowLabel', () => {
  it('splits a condition and an explicit probability', () => {
    expect(parseFlowLabel('approved · p = 0.85')).toEqual({
      condition: 'approved',
      probability: 0.85,
    });
    expect(parseFlowLabel('p = 40%')).toEqual({ condition: undefined, probability: 0.4 });
    expect(parseFlowLabel('needs <b>review</b>')).toEqual({ condition: 'needs review' });
  });
});

it('exports a collapsed subprocess using the native boxed-plus BPMN style', async () => {
  const model: ProcessModel = {
    schemaVersion: 1,
    id: 'subprocess-style',
    name: 'Subprocess',
    nodes: { sub: { id: 'sub', kind: 'subprocess', label: 'Collapsed' } },
    edges: {},
  };
  const xml = await exportDrawioXml(model);
  expect(xml).toContain('shape=mxgraph.bpmn.task2;');
  expect(xml).toContain('isLoopSub=1;');
  const parsed = await importDrawioXml(xml);
  expect(parsed.model.nodes.sub.kind).toBe('subprocess');
});
