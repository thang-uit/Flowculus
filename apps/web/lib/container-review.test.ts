import { describe, expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import { deliveryModel } from '../../../packages/process-mining/src/__fixtures__/software-delivery';
import { absoluteCanvasPositions, toFlowNodes } from './canvas-flow';
import { finishContainerDrag } from './container-gestures';
import { resizeContainer } from './container-resizing';

describe('container review regressions', () => {
  it('moves the selected parent even when React Flow reports its selected lane as the drag anchor', () => {
    const model = deliveryModel();
    const flow = toFlowNodes(model, new Set(), new Set(['team', 'lane_be'])).map(
      (node) => (node.id === 'team' ? { ...node, position: { x: 100, y: 80 } } : node),
    );
    const moved = finishContainerDrag(model, 'lane_be', absoluteCanvasPositions(flow))!;
    expect(moved).not.toBeNull();
    expect(moved.containers!.team.bounds.x).toBe(model.containers!.team.bounds.x + 100);
    expect(moved.containers!.lane_be.bounds.y).toBe(
      model.containers!.lane_be.bounds.y + 80,
    );
    expect(moved.nodes.backend.bounds!.x).toBe(model.nodes.backend.bounds!.x + 100);
    expect(analyzeProcess(moved).cycleTimeMinutes).toBe(387);
  });
  it('rejects a mixed lane reorder rather than silently dropping other selected movements', () => {
    const model = deliveryModel();
    const lane = model.containers!.lane_be;
    const other = Object.values(model.nodes).find((node) => node.laneId !== lane.id)!;
    const flow = toFlowNodes(model, new Set(), new Set([lane.id, other.id])).map(
      (node) =>
        node.id === lane.id || node.id === other.id
          ? { ...node, position: { ...node.position, y: node.position.y + 200 } }
          : node,
    );
    expect(finishContainerDrag(model, lane.id, absoluteCanvasPositions(flow))).toBeNull();
  });
  it('does not let a small imported frame in another pool block resizing the selected pool', () => {
    const model = deliveryModel();
    const imported: ProcessModel = {
      ...model,
      containers: {
        ...model.containers,
        other: {
          id: 'other',
          kind: 'pool' as const,
          label: 'Other participant',
          processId: 'other_process',
          orientation: 'horizontal' as const,
          bounds: { x: 4000, y: 0, width: 400, height: 80 },
        },
      },
    };
    const pool = imported.containers!.team;
    const resized = resizeContainer(imported, pool.id, {
      ...pool.bounds,
      width: pool.bounds.width + 100,
    });
    expect(resized).not.toBe(imported);
    expect(resized.containers!.other).toBe(imported.containers!.other);
    expect(resized.nodes).toBe(imported.nodes);
    expect(resized.containers!.lane_be.bounds.width).toBe(
      model.containers!.lane_be.bounds.width + 100,
    );
  });
  it('still rejects clipping work on either side of a shared divider', () => {
    const model = deliveryModel();
    const lane = model.containers!.lane_be;
    expect(resizeContainer(model, lane.id, { ...lane.bounds, height: 100 })).toBe(model);
    expect(resizeContainer(model, lane.id, { ...lane.bounds, height: 1000 })).toBe(model);
  });
});
