import { describe, expect, it } from 'vitest';
import { collectUnconfirmedSemantics } from '@flowculus/validation';
import type { ProcessModel } from '@flowculus/process-model';
import {
  classifyContour,
  mergeTracedModel,
  snapConnector,
  traceToProcessModel,
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
    expect(merged.model.nodes[merged.nodeIds[0]]?.bounds?.x).toBe(405);
    expect(Object.values(merged.model.edges)).toHaveLength(1);
    expect(collectUnconfirmedSemantics(merged.model)).toHaveLength(4);
  });
});
