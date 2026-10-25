import { describe, expect, it } from 'vitest';

import { SEMANTIC_METADATA_KEYS, type ProcessModel } from '@flowculus/process-model';

import {
  makeCanvasClipboard,
  parseCanvasClipboard,
  pasteCanvasClipboard,
} from './canvas-clipboard';

const model: ProcessModel = {
  schemaVersion: 1,
  id: 'source',
  name: 'Source',
  nodes: {
    split: {
      id: 'split',
      label: 'Split',
      kind: 'gateway',
      gatewayKind: 'and',
      bounds: { x: 0, y: 0, width: 56, height: 56 },
      metadata: {
        [SEMANTIC_METADATA_KEYS.joinId]: 'join',
        [SEMANTIC_METADATA_KEYS.inferredKind]: true,
      },
    },
    task: {
      id: 'task',
      label: 'Task',
      kind: 'task',
      bounds: { x: 120, y: 0, width: 176, height: 84 },
      drawioCellId: 'drawio-task',
    },
    join: {
      id: 'join',
      label: 'Join',
      kind: 'gateway',
      gatewayKind: 'and',
      bounds: { x: 360, y: 0, width: 56, height: 56 },
    },
  },
  edges: {
    a: { id: 'a', source: 'split', target: 'task', kind: 'sequence' },
    b: { id: 'b', source: 'task', target: 'join', kind: 'sequence' },
  },
};

describe('canvas clipboard', () => {
  it('preserves pinned attachments while translating copied bends', () => {
    const routed: ProcessModel = {
      ...model,
      edges: {
        ...model.edges,
        b: {
          ...model.edges.b,
          routing: {
            style: 'orthogonal',
            sourceSide: 'right',
            targetSide: 'bottom',
            waypoints: [{ x: 320, y: 100 }],
          },
        },
      },
    };
    const payload = parseCanvasClipboard(
      JSON.stringify(makeCanvasClipboard(routed, ['task', 'join'])),
    )!;
    const pasted = pasteCanvasClipboard(routed, payload, 36)!;
    const edge = Object.values(pasted.model.edges).find(
      (edge) => edge.source === pasted.nodeIds[0],
    )!;
    expect(edge.routing).toEqual({
      style: 'orthogonal',
      sourceSide: 'right',
      targetSide: 'bottom',
      waypoints: [{ x: 356, y: 136 }],
    });
  });
  it('copies only internal flows and remaps all IDs and joins', () => {
    const payload = makeCanvasClipboard(model, ['split', 'task', 'join'])!;
    expect(parseCanvasClipboard(JSON.stringify(payload))).not.toBeNull();
    const pasted = pasteCanvasClipboard(model, payload, 36)!;
    const [splitId, taskId, joinId] = pasted.nodeIds;
    expect(new Set(pasted.nodeIds).size).toBe(3);
    expect(splitId).not.toBe('split');
    expect(pasted.model.nodes[splitId]!.metadata?.[SEMANTIC_METADATA_KEYS.joinId]).toBe(
      joinId,
    );
    expect(
      pasted.model.nodes[splitId]!.metadata?.[SEMANTIC_METADATA_KEYS.inferredKind],
    ).toBe(true);
    expect(pasted.model.nodes[taskId]!.drawioCellId).toBeUndefined();
    expect(pasted.model.nodes[taskId]!.bounds?.x).toBe(156);
    expect(
      Object.values(pasted.model.edges).filter(
        (edge) => edge.source === splitId && edge.target === taskId,
      ),
    ).toHaveLength(1);
  });

  it('drops stale join pairing when only half the block is selected', () => {
    const payload = makeCanvasClipboard(model, ['split', 'task'])!;
    expect(payload.edges.map((edge) => edge.id)).toEqual(['a']);
    const pasted = pasteCanvasClipboard(model, payload, 36)!;
    expect(
      pasted.model.nodes[pasted.nodeIds[0]!]!.metadata?.[SEMANTIC_METADATA_KEYS.joinId],
    ).toBeUndefined();
  });

  it('rejects unrelated, malformed and dangling payloads', () => {
    expect(parseCanvasClipboard('{"source":"drawio"}')).toBeNull();
    expect(parseCanvasClipboard('not-json')).toBeNull();
    expect(
      parseCanvasClipboard(
        JSON.stringify({
          ...makeCanvasClipboard(model, ['split', 'task']),
          edges: [model.edges.b],
        }),
      ),
    ).toBeNull();
    expect(makeCanvasClipboard(model, [])).toBeNull();
  });
});
