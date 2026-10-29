import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import { validateModelStructure } from '@flowculus/validation';
import { deliveryModel } from '../../../packages/process-mining/src/__fixtures__/software-delivery';
import { insertContainerAt } from './container-placement';
import { finishContainerDrag, renameContainer, reorderLane } from './container-gestures';
import { resizeContainer } from './container-resizing';
import { applyCollaborationPositions } from './collaboration-editing';
import { orderedLanes, arrangeLanes } from './lane-arrangement';
import { addNodeAt, removeElements } from './model-editing';
import { absoluteCanvasPositions, toFlowNodes } from './canvas-flow';
import { makeCanvasClipboard, pasteCanvasClipboard } from './canvas-clipboard';
import { useWorkspaceStore } from './workspace-store';

const empty = (): ProcessModel => ({
  schemaVersion: 1,
  id: 'test',
  name: 'Test',
  nodes: {},
  edges: {},
});
const frame = () =>
  insertContainerAt(empty(), 'pool', 'Participant', { x: 400, y: 180 }, 'Pool')!;

beforeEach(() => useWorkspaceStore.getState().loadModel(empty()));

describe('direct pool and lane editing', () => {
  it('drops an empty pool at the pointer, with a separate non-executable identity', () => {
    const result = frame();
    expect(result.model.containers![result.nodeId].bounds).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 360,
    });
    expect(result.model.nodes).toEqual({});
    expect(validateModelStructure(result.model).diagnostics).toEqual([]);
    const node = toFlowNodes(result.model, new Set(), new Set([result.nodeId]))[0];
    expect(node.deletable).toBe(true);
    expect(node.dragHandle).toBe('.process-container__label');
    expect(
      insertContainerAt(result.model, 'pool', 'Overlap', { x: 400, y: 180 }, 'Pool'),
    ).toBeNull();
    expect(
      insertContainerAt(empty(), 'pool', 'Invalid', { x: NaN, y: 180 }, 'Pool'),
    ).toBeNull();
  });
  it('creates a pool automatically when a lane is dropped on an empty canvas', () => {
    const result = insertContainerAt(
      empty(),
      'lane',
      'Backend',
      { x: 400, y: 180 },
      'Company',
    )!;
    const lane = result.model.containers![result.nodeId];
    expect(lane.kind).toBe('lane');
    expect(result.model.containers![lane.parentId!].label).toBe('Company');
    expect(validateModelStructure(result.model).diagnostics).toEqual([]);
  });
  it('keeps partially overlapping shapes outside membership until they fit fully', () => {
    const result = insertContainerAt(
      empty(),
      'lane',
      'Owner',
      { x: 400, y: 180 },
      'Pool',
    )!;
    const partial = addNodeAt(result.model, 'task', 'Partial', { x: 150, y: 10 });
    expect(partial.model.nodes[partial.nodeId].poolId).toBeUndefined();
    expect(partial.model.nodes[partial.nodeId].laneId).toBeUndefined();
    const moved = applyCollaborationPositions(partial.model, {
      [partial.nodeId]: { x: 100, y: 100 },
    })!;
    expect(moved.nodes[partial.nodeId].laneId).toBe(result.nodeId);
    const pool = Object.values(moved.containers!).find((item) => item.kind === 'pool')!;
    const resized = resizeContainer(moved, pool.id, { ...pool.bounds, height: 400 });
    expect(resized.containers![pool.id].bounds.height).toBe(400);
  });
  it('refuses a new lane that would expand its pool into another participant', () => {
    const first = frame();
    const lane = insertContainerAt(
      first.model,
      'lane',
      'Owner',
      { x: 400, y: 180 },
      'Pool',
    )!;
    const second = insertContainerAt(
      lane.model,
      'pool',
      'Other',
      { x: 400, y: 600 },
      'Pool',
    )!;
    expect(
      insertContainerAt(second.model, 'lane', 'Too far', { x: 400, y: 300 }, 'Pool'),
    ).toBeNull();
  });
  it('inserts a lane at the chosen position and moves existing contents with their lane', () => {
    const result = frame();
    const first = insertContainerAt(
      result.model,
      'lane',
      'First',
      { x: 400, y: 100 },
      'Pool',
    )!;
    const task = addNodeAt(first.model, 'task', 'Keep this work', { x: 250, y: 200 });
    const next = insertContainerAt(
      task.model,
      'lane',
      'Second',
      { x: 400, y: 10 },
      'Pool',
    )!;
    expect(orderedLanes(next.model, result.nodeId).map((lane) => lane.id)).toEqual([
      next.nodeId,
      first.nodeId,
    ]);
    expect(next.model.nodes[task.nodeId].laneId).toBe(first.nodeId);
    expect(next.model.nodes[task.nodeId].bounds!.y).toBe(
      task.model.nodes[task.nodeId].bounds!.y + 180,
    );
    expect(validateModelStructure(next.model).diagnostics).toEqual([]);
  });
  it('adopts enclosed free work but rejects cutting a connected process across pools', () => {
    const task = addNodeAt(empty(), 'task', 'A', { x: 200, y: 100 });
    const enclosed = insertContainerAt(
      task.model,
      'pool',
      'Team',
      { x: 400, y: 180 },
      'Pool',
    )!;
    expect(enclosed.model.nodes[task.nodeId].poolId).toBe(enclosed.nodeId);
    const outside = addNodeAt(task.model, 'task', 'B', { x: 1200, y: 100 });
    const linked = {
      ...outside.model,
      edges: { e: { id: 'e', source: task.nodeId, target: outside.nodeId } },
    };
    expect(
      insertContainerAt(linked, 'pool', 'Team', { x: 400, y: 180 }, 'Pool'),
    ).toBeNull();
  });
  it('drags lane headers to reorder while keeping CT, task inputs and path geometry', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const original = deliveryModel();
      const model = arrangeLanes(
        original,
        'team',
        orderedLanes(original, 'team').map((lane) => lane.id),
        orientation,
      );
      const lane = model.containers!.lane_be;
      const point =
        orientation === 'horizontal'
          ? { x: lane.bounds.x, y: 5000 }
          : { x: 5000, y: lane.bounds.y };
      const moved = finishContainerDrag(model, lane.id, { [lane.id]: point })!;
      expect(orderedLanes(moved, 'team').at(-1)!.id).toBe(lane.id);
      expect(moved.nodes.backend.laneId).toBe(lane.id);
      expect(moved.nodes.backend.durationMinutes).toBe(
        model.nodes.backend.durationMinutes,
      );
      expect(analyzeProcess(moved).cycleTimeMinutes).toBe(387);
      expect(validateModelStructure(moved).diagnostics).toEqual([]);
      expect(reorderLane(model, lane.id, 1)).toBe(model);
    }
  });
  it('moves a pool and all descendants once, rejecting overlapping pools atomically', () => {
    const base = frame();
    const other = insertContainerAt(
      base.model,
      'pool',
      'Other',
      { x: 1400, y: 180 },
      'Pool',
    )!;
    const flow = toFlowNodes(other.model, new Set(), new Set()).map((node) =>
      node.id === base.nodeId ? { ...node, position: { x: 1000, y: 0 } } : node,
    );
    expect(
      finishContainerDrag(other.model, base.nodeId, absoluteCanvasPositions(flow)),
    ).toBeNull();
    expect(
      applyCollaborationPositions(
        base.model,
        absoluteCanvasPositions(toFlowNodes(base.model, new Set(), new Set())),
      ),
    ).toBe(base.model);
  });
  it('allows free tasks to leave/enter a lane and rejects a cross-pool sequence flow', () => {
    const result = insertContainerAt(
      empty(),
      'lane',
      'Owner',
      { x: 400, y: 180 },
      'Pool',
    )!;
    const task = addNodeAt(result.model, 'task', 'A', { x: 250, y: 100 });
    const left = applyCollaborationPositions(task.model, {
      [task.nodeId]: { x: 1200, y: 100 },
    })!;
    expect(left.nodes[task.nodeId].poolId).toBeUndefined();
    const returned = applyCollaborationPositions(left, {
      [task.nodeId]: { x: 200, y: 100 },
    })!;
    expect(returned.nodes[task.nodeId].laneId).toBe(result.nodeId);
    const linked = deliveryModel();
    expect(
      applyCollaborationPositions(linked, { backend: { x: 10000, y: 100 } }),
    ).toBeNull();
  });
  it('resizes pool and lane boundaries without clipping work or changing inputs', () => {
    const model = deliveryModel();
    const pool = model.containers!.team;
    const expanded = resizeContainer(model, pool.id, {
      ...pool.bounds,
      width: pool.bounds.width + 100,
    });
    expect(expanded.containers!.lane_be.bounds.width).toBe(
      model.containers!.lane_be.bounds.width + 100,
    );
    expect(expanded.nodes).toBe(model.nodes);
    expect(resizeContainer(model, pool.id, { ...pool.bounds, width: 180 })).toBe(model);
    expect(resizeContainer(model, pool.id, { ...pool.bounds, x: Infinity })).toBe(model);
  });
  it('deletes a lane and its contents/incident edges, while pool deletion removes descendants', () => {
    const model = deliveryModel();
    const next = removeElements(model, ['lane_be'], []);
    expect(next.nodes.backend).toBeUndefined();
    expect(next.nodes.fix).toBeUndefined();
    expect(next.containers!.team).toEqual(model.containers!.team);
    expect(
      Object.values(next.edges).every(
        (edge) => next.nodes[edge.source] && next.nodes[edge.target],
      ),
    ).toBe(true);
    const all = removeElements(model, ['team'], []);
    expect(all.nodes).toEqual({});
    expect(all.edges).toEqual({});
    expect(all.containers).toEqual({});
  });
  it('keeps memberships when nudging a task in overlapping pasted pools', () => {
    const model = deliveryModel();
    const copied = pasteCanvasClipboard(
      model,
      makeCanvasClipboard(model, ['team'])!,
      36,
    )!;
    const backend = Object.values(copied.model.nodes).find(
      (node) => node.id !== 'backend' && node.label === model.nodes.backend.label,
    )!;
    const moved = applyCollaborationPositions(copied.model, {
      [backend.id]: { x: backend.bounds!.x + 1, y: backend.bounds!.y },
    })!;
    expect(moved).not.toBeNull();
    expect(moved.nodes[backend.id].poolId).toBe(backend.poolId);
    expect(moved.nodes[backend.id].laneId).toBe(backend.laneId);
  });
  it('renames, deletes and restores a frame using one history entry per operation', () => {
    const state = () => useWorkspaceStore.getState();
    const created = frame();
    state().commitModel(created.model);
    const named = renameContainer(
      state().processModel,
      created.nodeId,
      '  Đội Backend  ',
    );
    state().commitModel(named);
    expect(named.containers![created.nodeId].label).toBe('Đội Backend');
    expect(renameContainer(named, created.nodeId, ' ')).toBe(named);
    expect(renameContainer(named, created.nodeId, 'x'.repeat(121))).toBe(named);
    state().commitModel(removeElements(named, [created.nodeId], []));
    expect(state().history.past).toHaveLength(3);
    state().undo();
    expect(state().processModel).toBe(named);
    state().undo();
    expect(state().processModel).toBe(created.model);
    state().redo();
    expect(state().processModel).toBe(named);
  });
});
