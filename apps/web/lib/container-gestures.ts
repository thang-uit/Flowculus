import { getNodeBounds, type ProcessModel } from '@flowculus/process-model';
import type { Point } from '@flowculus/graph-layout';
import { applyCollaborationPositions } from './collaboration-editing';
import { orderedLanes } from './lane-arrangement';

/** Preserve lane sizes and local task geometry when changing responsibility order. */
export function reorderLane(
  model: ProcessModel,
  id: string,
  index: number,
): ProcessModel {
  const lane = model.containers?.[id];
  const pool = model.containers?.[lane?.parentId ?? ''];
  if (!lane || lane.kind !== 'lane' || !pool) return model;
  const lanes = orderedLanes(model, pool.id);
  const previous = lanes.findIndex((item) => item.id === id);
  const target = Math.max(0, Math.min(lanes.length - 1, index));
  if (previous === target) return model;
  lanes.splice(previous, 1);
  lanes.splice(target, 0, lane);
  const horizontal = pool.orientation === 'horizontal';
  let offset = horizontal ? pool.bounds.y : pool.bounds.x;
  const positions: Record<string, Point> = {};
  for (const item of lanes) {
    const next = horizontal
      ? { x: item.bounds.x, y: offset }
      : { x: offset, y: item.bounds.y };
    positions[item.id] = next;
    for (const node of Object.values(model.nodes)) {
      if (node.laneId !== item.id) continue;
      const rect = getNodeBounds(node);
      positions[node.id] = {
        x: rect.x + next.x - item.bounds.x,
        y: rect.y + next.y - item.bounds.y,
      };
    }
    offset += horizontal ? item.bounds.height : item.bounds.width;
  }
  return applyCollaborationPositions(model, positions) ?? model;
}

/** A lane header drags within its pool and snaps between siblings on release. */
export function finishContainerDrag(
  model: ProcessModel,
  id: string,
  positions: Record<string, Point>,
): ProcessModel | null {
  const lane = model.containers?.[id];
  if (lane?.kind !== 'lane') return applyCollaborationPositions(model, positions);
  const pool = model.containers?.[lane.parentId ?? ''];
  const point = positions[id];
  if (!pool || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
    return null;
  const poolPosition = positions[pool.id];
  if (
    poolPosition &&
    (poolPosition.x !== pool.bounds.x || poolPosition.y !== pool.bounds.y)
  )
    return applyCollaborationPositions(model, positions);
  // Reordering one lane must not silently discard an unrelated selected drag.
  const hasOtherMovedSelection = Object.entries(positions).some(([key, position]) => {
    if (key === id || model.nodes[key]?.laneId === id) return false;
    const bounds =
      model.containers?.[key]?.bounds ??
      (model.nodes[key] ? getNodeBounds(model.nodes[key]) : undefined);
    return bounds && (position.x !== bounds.x || position.y !== bounds.y);
  });
  if (hasOtherMovedSelection) return null;
  const horizontal = pool.orientation === 'horizontal';
  const centre = horizontal
    ? point.y + lane.bounds.height / 2
    : point.x + lane.bounds.width / 2;
  const siblings = orderedLanes(model, pool.id).filter((item) => item.id !== id);
  return reorderLane(
    model,
    id,
    siblings.filter(
      (item) =>
        centre >
        (horizontal
          ? item.bounds.y + item.bounds.height / 2
          : item.bounds.x + item.bounds.width / 2),
    ).length,
  );
}

export function renameContainer(
  model: ProcessModel,
  id: string,
  text: string,
): ProcessModel {
  const item = model.containers?.[id];
  const label = text.trim();
  if (!item || !label || label.length > 120 || label === item.label) return model;
  return { ...model, containers: { ...model.containers, [id]: { ...item, label } } };
}
