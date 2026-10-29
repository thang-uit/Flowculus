import { describe, expect, it } from 'vitest';
import { collectUnconfirmedSemantics } from '@flowculus/validation';
import { DEFAULT_NODE_SIZE, type ProcessModel } from '@flowculus/process-model';
import {
  classifyContour,
  mergeTracedModel,
  snapConnector,
  traceToProcessModel,
  inferTraceEventKinds,
  type TraceResult,
} from './trace-model';

const result: TraceResult = {
  width: 500,
  height: 300,
  candidates: [
    {
      id: 'a',
      shape: 'rectangle',
      kind: 'task',
      label: 'A',
      confidence: 0.7,
      bounds: { x: 10, y: 30, width: 100, height: 60 },
    },
    {
      id: 'b',
      shape: 'diamond',
      kind: 'gateway',
      label: 'B',
      confidence: 0.5,
      bounds: { x: 200, y: 30, width: 60, height: 60 },
    },
  ],
  connectors: [{ source: 'a', target: 'b', confidence: 0.4 }],
};

describe('image trace candidate model', () => {
  it('classifies basic contours and refuses non-shapes', () => {
    expect(
      classifyContour(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        0.7,
      ),
    ).toBe('rectangle');
    expect(
      classifyContour(
        [
          { x: 5, y: 0 },
          { x: 10, y: 5 },
          { x: 5, y: 10 },
          { x: 0, y: 5 },
        ],
        0.7,
      ),
    ).toBe('diamond');
    expect(
      classifyContour(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 1, y: 3 },
          { x: 0, y: 2 },
        ],
        0.8,
      ),
    ).toBe('ellipse');
    expect(
      classifyContour(
        [
          { x: 8, y: 0 },
          { x: 92, y: 0 },
          { x: 100, y: 8 },
          { x: 100, y: 42 },
          { x: 92, y: 50 },
          { x: 8, y: 50 },
          { x: 0, y: 42 },
          { x: 0, y: 8 },
        ],
        0.68,
      ),
    ).toBe('rectangle');
    expect(
      classifyContour(
        [
          { x: 0, y: 0 },
          { x: 2, y: 1 },
          { x: 3, y: 2 },
        ],
        0.5,
      ),
    ).toBeNull();
  });

  it('snaps a connector only between two nearby distinct shapes', () => {
    expect(
      snapConnector({ x: 110, y: 60 }, { x: 200, y: 60 }, result.candidates)?.source,
    ).toBe('a');
    expect(
      snapConnector({ x: 0, y: 200 }, { x: 200, y: 60 }, result.candidates),
    ).toBeNull();
  });

  it('rejects interior ink and equally plausible neighboring shapes', () => {
    expect(
      snapConnector({ x: 60, y: 60 }, { x: 200, y: 60 }, result.candidates),
    ).toBeNull();
    const duplicate = {
      ...result.candidates[0],
      id: 'nearby',
      bounds: { ...result.candidates[0].bounds, y: 31 },
    };
    expect(
      snapConnector({ x: 110, y: 60 }, { x: 200, y: 60 }, [
        ...result.candidates,
        duplicate,
      ]),
    ).toBeNull();
    expect(
      snapConnector({ x: Infinity, y: 60 }, { x: 200, y: 60 }, result.candidates),
    ).toBeNull();
    expect(
      snapConnector({ x: 110, y: 60 }, { x: 200, y: 60 }, result.candidates, -1),
    ).toBeNull();
  });

  it('does not misclassify an arbitrary quadrilateral as a gateway', () => {
    expect(
      classifyContour(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 65, y: 60 },
          { x: 35, y: 60 },
        ],
        0.5,
      ),
    ).toBeNull();
  });

  it('keeps every guessed semantic unconfirmed and adds the draft as one model edit', () => {
    const trace = traceToProcessModel(result, 'Photo');
    expect(trace.nodes.a.durationMinutes).toBeUndefined();
    expect(trace.nodes.b.gatewayKind).toBe('xor');
    expect(collectUnconfirmedSemantics(trace)).toHaveLength(4);
    const current: ProcessModel = {
      schemaVersion: 1,
      id: 'current',
      name: 'Current',
      nodes: { a: { id: 'a', label: 'Existing', kind: 'task' } },
      edges: {},
    };
    const merged = mergeTracedModel(current, trace, 0.5, { x: 400, y: 100 });
    expect(merged.model.nodes.a.label).toBe('Existing');
    expect(merged.nodeIds).toHaveLength(2);
    const bounds = merged.model.nodes[merged.nodeIds[0]]!.bounds!;
    expect(bounds.x + bounds.width / 2).toBe(430);
    expect(bounds.width).toBe(DEFAULT_NODE_SIZE.task.width);
    expect(bounds.height).toBe(DEFAULT_NODE_SIZE.task.height);
    const gatewayBounds = merged.model.nodes[merged.nodeIds[1]]!.bounds!;
    expect(gatewayBounds.width).toBe(DEFAULT_NODE_SIZE.gateway.width);
    expect(gatewayBounds.height).toBe(DEFAULT_NODE_SIZE.gateway.height);
    expect(Object.values(merged.model.edges)).toHaveLength(1);
    expect(collectUnconfirmedSemantics(merged.model)).toHaveLength(4);
  });

  it('retains detected attachment sides and inferred endpoint roles', () => {
    const draft: TraceResult = {
      ...result,
      candidates: result.candidates.map((candidate) => ({ ...candidate, kind: 'event' })),
      connectors: [
        {
          source: 'a',
          target: 'b',
          confidence: 0.4,
          sourceSide: 'right',
          targetSide: 'top',
        },
      ],
    };
    const inferred = inferTraceEventKinds(draft);
    expect(inferred.candidates.map((candidate) => candidate.kind)).toEqual([
      'start',
      'end',
    ]);
    const model = traceToProcessModel(inferred, 'Draft');
    expect(model.edges['trace-flow-1'].routing).toMatchObject({
      sourceSide: 'right',
      targetSide: 'top',
    });
    expect(collectUnconfirmedSemantics(model)).toHaveLength(3);
    expect(
      inferTraceEventKinds({ ...draft, connectors: [] }).candidates.every(
        (candidate) => candidate.kind === 'event',
      ),
    ).toBe(true);
  });
});
