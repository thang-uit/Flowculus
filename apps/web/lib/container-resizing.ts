import {
  getNodeBounds,
  type ProcessContainer,
  type ProcessModel,
} from '@flowculus/process-model';
import { orderedLanes } from './lane-arrangement';

type Bounds = ProcessContainer['bounds'];
const contains = (outer: Bounds, inner: Bounds) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/** Resize shared lane dividers atomically. Work stays put and is never clipped. */
export function resizeContainer(
  model: ProcessModel,
  id: string,
  bounds: Bounds,
): ProcessModel {
  const item = model.containers?.[id];
  if (
    !item ||
    !Object.values(bounds).every(Number.isFinite) ||
    bounds.width < 180 ||
    bounds.height < 100
  )
    return model;
  if (
    Object.entries(bounds).every(
      ([key, value]) => item.bounds[key as keyof Bounds] === value,
    )
  )
    return model;
  const containers = { ...model.containers, [id]: { ...item, bounds } };
  const pool = item.kind === 'pool' ? item : containers[item.parentId ?? ''];
  if (!pool) return model;
  const horizontal = pool.orientation === 'horizontal';
  const lanes = orderedLanes(model, pool.id);
  if (item.kind === 'lane') {
    // Only the trailing divider is a resize handle. The label is reserved for reordering.
    if (
      bounds.x !== item.bounds.x ||
      bounds.y !== item.bounds.y ||
      (horizontal
        ? bounds.width !== item.bounds.width
        : bounds.height !== item.bounds.height)
    )
      return model;
    const next = lanes[lanes.findIndex((lane) => lane.id === id) + 1];
    const delta = horizontal
      ? bounds.height - item.bounds.height
      : bounds.width - item.bounds.width;
    if (next)
      containers[next.id] = {
        ...next,
        bounds: horizontal
          ? {
              ...next.bounds,
              y: next.bounds.y + delta,
              height: next.bounds.height - delta,
            }
          : {
              ...next.bounds,
              x: next.bounds.x + delta,
              width: next.bounds.width - delta,
            },
      };
    else
      containers[pool.id] = {
        ...pool,
        bounds: horizontal
          ? { ...pool.bounds, height: bounds.y + bounds.height - pool.bounds.y }
          : { ...pool.bounds, width: bounds.x + bounds.width - pool.bounds.x },
      };
  } else {
    lanes.forEach((lane, index) => {
      const last = index === lanes.length - 1;
      containers[lane.id] = {
        ...lane,
        bounds: horizontal
          ? {
              x: bounds.x + 36,
              y: index === 0 ? bounds.y : lane.bounds.y,
              width: bounds.width - 36,
              height:
                (last ? bounds.y + bounds.height : lane.bounds.y + lane.bounds.height) -
                (index === 0 ? bounds.y : lane.bounds.y),
            }
          : {
              x: index === 0 ? bounds.x : lane.bounds.x,
              y: bounds.y + 36,
              width:
                (last ? bounds.x + bounds.width : lane.bounds.x + lane.bounds.width) -
                (index === 0 ? bounds.x : lane.bounds.x),
              height: bounds.height - 36,
            },
      };
    });
  }
  const affected = new Set(
    Object.keys(containers).filter((key) => containers[key] !== model.containers?.[key]),
  );
  for (const key of affected) {
    const frame = containers[key];
    if (frame.bounds.width < 180 || frame.bounds.height < 100) return model;
    if (
      frame.parentId &&
      (!containers[frame.parentId] ||
        !contains(containers[frame.parentId].bounds, frame.bounds))
    )
      return model;
  }
  for (const node of Object.values(model.nodes)) {
    const frameId = node.laneId ?? node.poolId ?? '';
    if (!affected.has(frameId)) continue;
    const frame = containers[frameId];
    if (frame && !contains(frame.bounds, getNodeBounds(node))) return model;
  }
  const resizedPool = containers[pool.id];
  if (
    Object.values(containers).some(
      (other) =>
        other.kind === 'pool' &&
        other.id !== pool.id &&
        resizedPool.bounds.x < other.bounds.x + other.bounds.width &&
        resizedPool.bounds.x + resizedPool.bounds.width > other.bounds.x &&
        resizedPool.bounds.y < other.bounds.y + other.bounds.height &&
        resizedPool.bounds.y + resizedPool.bounds.height > other.bounds.y,
    )
  )
    return model;
  return { ...model, containers };
}
