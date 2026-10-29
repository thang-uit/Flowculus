import type {
  ProcessContainer,
  ProcessModel,
  ProcessNode,
} from '@flowculus/process-model';

/** A frame adopts a shape only when it fits fully, leaving the title strip usable. */
export function containingFrame(
  model: ProcessModel,
  bounds: NonNullable<ProcessNode['bounds']>,
  previous?: ProcessNode,
) {
  const preferredPool =
    previous?.poolId ?? model.containers?.[previous?.laneId ?? '']?.parentId;
  const frames = Object.values(model.containers ?? {}).sort(
    (a, b) =>
      Number(
        b.id === previous?.laneId ||
          b.id === preferredPool ||
          b.parentId === preferredPool,
      ) -
      Number(
        a.id === previous?.laneId ||
          a.id === preferredPool ||
          a.parentId === preferredPool,
      ),
  );
  const contains = (item: ProcessContainer) => {
    const horizontal = item.orientation === 'horizontal';
    return (
      bounds.x >= item.bounds.x + (horizontal ? 36 : 0) &&
      bounds.y >= item.bounds.y + (horizontal ? 0 : 36) &&
      bounds.x + bounds.width <= item.bounds.x + item.bounds.width &&
      bounds.y + bounds.height <= item.bounds.y + item.bounds.height
    );
  };
  const oldLane = model.containers?.[previous?.laneId ?? ''];
  const lane =
    oldLane && contains(oldLane)
      ? oldLane
      : frames.find((item) => item.kind === 'lane' && contains(item));
  const pool = lane
    ? model.containers?.[lane.parentId ?? '']
    : frames.find((item) => item.kind === 'pool' && !item.blackBox && contains(item));
  return { poolId: pool?.id, laneId: pool ? lane?.id : undefined };
}
