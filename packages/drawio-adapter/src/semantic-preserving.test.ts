import { describe, expect, it } from 'vitest';

import { collectUnconfirmedSemantics, confirmSemantics } from '@flowculus/validation';

import { exportDrawioXml, importDrawioXml } from './index';

const graph = (cells: string) =>
  `<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" />${cells}</root></mxGraphModel>`;

const vertex = (
  id: string,
  style: string,
  label = id,
  geometry = 'x="10" y="20" width="120" height="60"',
  parent = '1',
) =>
  `<mxCell id="${id}" value="${label}" style="${style}" vertex="1" parent="${parent}"><mxGeometry ${geometry} as="geometry" /></mxCell>`;

const edge = (id: string, source: string, target: string, inner = '', extra = '') =>
  `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" style="edgeStyle=orthogonalEdgeStyle;" ${extra}><mxGeometry relative="1" as="geometry">${inner}</mxGeometry></mxCell>`;

const compress = async (xml: string): Promise<string> => {
  const stream = new Blob([encodeURIComponent(xml)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(String.fromCharCode(...bytes));
};

/** A diagrams.net BPMN drawing with no Flowculus metadata at all. */
const NATIVE_PAGE = graph(
  [
    vertex(
      'pool',
      'swimlane;horizontal=0;startSize=30;',
      'Back office',
      'x="0" y="0" width="900" height="400"',
    ),
    vertex(
      'start',
      'shape=mxgraph.bpmn.event;outline=standard;symbol=general;',
      '',
      'x="40" y="80" width="40" height="40"',
      'pool',
    ),
    vertex(
      'check',
      'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;',
      'Check&lt;br&gt;order',
      'x="120" y="70" width="120" height="60"',
      'pool',
    ),
    vertex(
      'timer',
      'shape=mxgraph.bpmn.event;outline=boundInt;symbol=timer;',
      '',
      'x="100" y="40" width="30" height="30"',
      'check',
    ),
    vertex(
      'ok',
      'shape=mxgraph.bpmn.gateway2;gwType=exclusive;outline=none;',
      'OK?',
      'x="290" y="75" width="50" height="50"',
      'pool',
    ),
    vertex(
      'call',
      'rounded=1;whiteSpace=wrap;html=1;callActivity=1;strokeWidth=3;',
      'Bill customer',
      'x="400" y="30" width="120" height="60"',
      'pool',
    ),
    vertex(
      'wait',
      'shape=mxgraph.bpmn.event;outline=catching;symbol=timer;',
      'Wait 1 day',
      'x="420" y="160" width="40" height="40"',
      'pool',
    ),
    vertex(
      'done',
      'shape=mxgraph.bpmn.event;outline=end;symbol=terminate2;',
      '',
      'x="600" y="80" width="40" height="40"',
      'pool',
    ),
    vertex(
      'note',
      'text;html=1;strokeColor=none;',
      'Legend: blue = manual',
      'x="40" y="300" width="200" height="30"',
      'pool',
    ),
    '<UserObject label="Logo" link="https://example.com" id="logo"><mxCell style="shape=image;image=data:image/png,AAAA;" vertex="1" parent="1"><mxGeometry x="700" y="420" width="40" height="40" as="geometry" /></mxCell></UserObject>',
    edge('f1', 'start', 'check'),
    edge('f2', 'check', 'ok'),
    edge('f3', 'ok', 'call', '<Array as="points"><mxPoint x="315" y="60" /></Array>'),
    '<mxCell id="f3-label" value="yes · p = 0.8" style="edgeLabel;html=1;" vertex="1" connectable="0" parent="f3"><mxGeometry x="-0.2" relative="1" as="geometry" /></mxCell>',
    edge('f4', 'ok', 'wait', '', 'value="no · p = 0.2"'),
    edge('f5', 'call', 'done'),
    edge('f6', 'wait', 'check'),
  ].join(''),
);

const nativeFile = async () => {
  const compressedSecond = await compress(
    graph(vertex('other', 'rounded=1;', 'Second page task')),
  );
  return `<mxfile host="app.diagrams.net" agent="test"><diagram id="p1" name="Orders">${NATIVE_PAGE}</diagram><diagram id="p2" name="Archive">${compressedSecond}</diagram></mxfile>`;
};

describe('semantic-preserving draw.io round trip', () => {
  it('patches one attachment without losing custom edge styles and supports automatic reset', async () => {
    const source = (await nativeFile()).replace(
      'target="call" style="',
      'target="call" style="strokeColor=#ff9900;strokeWidth=3;customFlag=keep;entryX=0.5;entryY=0;exitX=1;exitY=0.5;',
    );
    const { model } = await importDrawioXml(source);
    const edge = model.edges.f3;
    expect(edge.routing).toMatchObject({ sourceSide: 'right', targetSide: 'top' });
    edge.routing = { ...edge.routing!, targetSide: 'bottom' };
    const exported = await exportDrawioXml(confirmSemantics(model), source);
    expect(exported).toContain('strokeColor=#ff9900;strokeWidth=3;customFlag=keep;');
    expect(exported).toContain(
      'entryX=0.5;entryY=1;entryDx=0;entryDy=0;entryPerimeter=0;',
    );
    const again = await importDrawioXml(exported);
    expect(again.model.edges.f3.routing).toEqual(edge.routing);
    again.model.edges.f3.routing!.targetSide = undefined;
    const automatic = await exportDrawioXml(confirmSemantics(again.model), exported);
    expect(
      (await importDrawioXml(automatic)).model.edges.f3.routing?.targetSide,
    ).toBeUndefined();
    expect(automatic).toContain('customFlag=keep;');
  });
  it('round-trips edited curved routes and waypoints', async () => {
    const source = await nativeFile();
    const { model } = await importDrawioXml(source);
    model.edges.f3.routing = {
      style: 'curved',
      waypoints: [
        { x: 310, y: 45 },
        { x: 365, y: 75 },
      ],
    };
    const exported = await exportDrawioXml(confirmSemantics(model), source);
    const again = await importDrawioXml(exported);
    expect(again.model.edges.f3.routing).toEqual(model.edges.f3.routing);
  });
  it('imports a native file without Flowculus metadata and flags every guess', async () => {
    const { model, pages } = await importDrawioXml(await nativeFile());
    expect(pages.map((page) => page.name)).toEqual(['Orders', 'Archive']);
    expect(model.metadata?.['flowculus-container-count']).toBe(1);
    expect(Object.keys(model.nodes)).not.toContain('pool');
    expect(Object.keys(model.nodes)).not.toContain('note');

    expect(model.nodes.call).toMatchObject({ kind: 'subprocess' });
    expect(model.nodes.call.metadata?.['flowculus-bpmn-type']).toBe('callActivity');
    expect(model.nodes.wait.metadata?.['flowculus-bpmn-type']).toBe('catching:timer');
    expect(model.nodes.timer.metadata?.['flowculus-unsupported-shape']).toBe(
      'boundary-event',
    );
    expect(model.nodes.done.metadata?.['flowculus-unsupported-shape']).toBe(
      'terminate-end-event',
    );
    expect(model.edges.f3).toMatchObject({ condition: 'yes', probability: 0.8 });
    expect(model.edges.f3.metadata?.['flowculus-inferred-probability']).toBe(true);
    expect(model.edges.f1.metadata?.['flowculus-inferred-edge-kind']).toBe(true);

    const pending = collectUnconfirmedSemantics(model);
    expect(pending.filter((item) => item.elementType === 'node')).toHaveLength(8);
    expect(Object.keys(model.nodes)).not.toContain('logo');
    expect(pending.filter((item) => item.code === 'inferred-edge-kind')).toHaveLength(6);
    expect(
      pending.filter((item) => item.code === 'inferred-edge-probability'),
    ).toHaveLength(2);
  });

  it('never writes an unconfirmed guess back as an explicit attribute', async () => {
    const source = await nativeFile();
    const { model } = await importDrawioXml(source);
    const exported = await exportDrawioXml(model, source);
    const again = await importDrawioXml(exported);
    expect(collectUnconfirmedSemantics(again.model)).toHaveLength(
      collectUnconfirmedSemantics(model).length,
    );
    expect(exported).not.toContain('flowculus-gateway-kind="xor"');
    expect(exported).not.toContain('flowculus-probability="0.8"');
  });

  it('keeps unknown cells, styles, labels, waypoints and the other compressed page', async () => {
    const source = await nativeFile();
    const { model } = await importDrawioXml(source);
    const exported = await exportDrawioXml(confirmSemantics(model), source);
    // Unknown and presentation cells survive verbatim, and unlabeled shapes
    // do not suddenly get their id as a visible label.
    expect(exported).toContain(
      '<UserObject label="Logo" link="https://example.com" id="logo">',
    );
    expect(exported).not.toContain('label="timer"');
    expect(exported).toContain('shape=image;image=data:image/png,AAAA;');
    expect(exported).toContain('Legend: blue = manual');
    expect(exported).toContain('swimlane;horizontal=0;startSize=30;');
    expect(exported).toContain('fillColor=#dae8fc;');
    expect(exported).toContain('callActivity=1;strokeWidth=3;');
    // Waypoints of untouched flows and HTML labels are kept.
    expect(exported).toContain('<mxPoint x="315" y="60" />');
    expect(exported).toContain('Check&lt;br&gt;order');
    // The untouched second page keeps its compressed encoding.
    expect(exported).toMatch(
      /<diagram id="p2" name="Archive">[A-Za-z0-9+/=]+<\/diagram>/,
    );
    // The edited page is written uncompressed (documented behaviour).
    expect(exported).toContain('<diagram id="p1" name="Orders"><mxGraphModel');

    const again = await importDrawioXml(exported);
    expect(Object.keys(again.model.nodes).sort()).toEqual(
      Object.keys(model.nodes).sort(),
    );
    Object.values(model.nodes).forEach((node) =>
      expect(again.model.nodes[node.id]?.bounds).toEqual(node.bounds),
    );
    const second = await importDrawioXml(exported, { pageIndex: 1 });
    expect(second.model.nodes.other?.label).toBe('Second page task');
  });

  it('makes confirmed semantics explicit so a re-import needs no new confirmation', async () => {
    const source = await nativeFile();
    const { model } = await importDrawioXml(source);
    const confirmed = confirmSemantics(model);
    const exported = await exportDrawioXml(confirmed, source);
    const again = await importDrawioXml(exported);
    expect(collectUnconfirmedSemantics(again.model)).toEqual([]);
    expect(again.model.nodes.ok).toMatchObject({ kind: 'gateway', gatewayKind: 'xor' });
    expect(again.model.edges.f3.probability).toBe(0.8);
  });

  it('drops waypoints only for flows whose endpoint moved', async () => {
    const source = await nativeFile();
    const { model } = await importDrawioXml(source);
    const moved = confirmSemantics({
      ...model,
      nodes: {
        ...model.nodes,
        call: {
          ...model.nodes.call,
          bounds: { ...model.nodes.call.bounds!, x: model.nodes.call.bounds!.x + 40 },
        },
      },
    });
    const exported = await exportDrawioXml(moved, source);
    expect(exported).not.toContain('<mxPoint x="315" y="60" />');
    const again = await importDrawioXml(exported);
    expect(again.model.nodes.call.bounds?.x).toBe(model.nodes.call.bounds!.x + 40);
  });

  it('writes and reads an explicit split→join pairing', async () => {
    const xml = `<mxfile><diagram id="p" name="P">${graph(
      [
        vertex('s', 'shape=mxgraph.bpmn.event;outline=standard;', ''),
        vertex('fork', 'shape=mxgraph.bpmn.gateway2;gwType=parallel;', 'Fork'),
        vertex('a', 'rounded=1;', 'A'),
        vertex('join', 'shape=mxgraph.bpmn.gateway2;gwType=parallel;', 'Join'),
        edge('e1', 's', 'fork'),
        edge('e2', 'fork', 'a'),
        edge('e3', 'a', 'join'),
        edge('e4', 'fork', 'join'),
      ].join(''),
    )}</diagram></mxfile>`;
    const { model } = await importDrawioXml(xml);
    const paired = confirmSemantics({
      ...model,
      nodes: {
        ...model.nodes,
        fork: {
          ...model.nodes.fork,
          metadata: { ...model.nodes.fork.metadata, 'flowculus-join-id': 'join' },
        },
      },
    });
    const exported = await exportDrawioXml(paired, xml);
    expect(exported).toContain('flowculus-join-id="join"');
    const again = await importDrawioXml(exported);
    expect(again.model.nodes.fork.metadata?.['flowculus-join-id']).toBe('join');
  });
});
