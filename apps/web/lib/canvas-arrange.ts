import { getNodeBounds, type ProcessModel } from '@flowculus/process-model';
import { moveNodes } from '@/lib/model-editing';

export type ArrangeAction =
  'left' | 'right' | 'top' | 'bottom' | 'horizontal' | 'vertical' | 'grid';

/** Pure layout edit; leaves unselected nodes and all connector semantics alone. */
export function arrangeNodes(
  model: ProcessModel,
  ids: readonly string[],
  action: ArrangeAction,
): ProcessModel {
  const selected = [...new Set(ids)]
    .map((id) => model.nodes[id])
    .filter((node) => node != null);
  if (
    selected.length <
    (action === 'horizontal' || action === 'vertical' ? 3 : action === 'grid' ? 1 : 2)
  )
    return model;
  const bounds = selected.map((node) => ({ node, rect: getNodeBounds(node) }));
  const positions: Record<string, { x: number; y: number }> = {};
  const left = Math.min(...bounds.map(({ rect }) => rect.x));
  const right = Math.max(...bounds.map(({ rect }) => rect.x + rect.width));
  const top = Math.min(...bounds.map(({ rect }) => rect.y));
  const bottom = Math.max(...bounds.map(({ rect }) => rect.y + rect.height));
  const sorted =
    action === 'horizontal'
      ? [...bounds].sort(
          (a, b) => a.rect.x + a.rect.width / 2 - (b.rect.x + b.rect.width / 2),
        )
      : action === 'vertical'
        ? [...bounds].sort(
            (a, b) => a.rect.y + a.rect.height / 2 - (b.rect.y + b.rect.height / 2),
          )
        : bounds;
  const firstCentre =
    action === 'horizontal'
      ? sorted[0].rect.x + sorted[0].rect.width / 2
      : sorted[0].rect.y + sorted[0].rect.height / 2;
  const lastCentre =
    action === 'horizontal'
      ? sorted[sorted.length - 1].rect.x + sorted[sorted.length - 1].rect.width / 2
      : sorted[sorted.length - 1].rect.y + sorted[sorted.length - 1].rect.height / 2;
  sorted.forEach(({ node, rect }, index) => {
    positions[node.id] = {
      x:
        action === 'left'
          ? left
          : action === 'right'
            ? right - rect.width
            : action === 'horizontal'
              ? firstCentre +
                ((lastCentre - firstCentre) * index) / (sorted.length - 1) -
                rect.width / 2
              : action === 'grid'
                ? Math.round(rect.x / 10) * 10
                : rect.x,
      y:
        action === 'top'
          ? top
          : action === 'bottom'
            ? bottom - rect.height
            : action === 'vertical'
              ? firstCentre +
                ((lastCentre - firstCentre) * index) / (sorted.length - 1) -
                rect.height / 2
              : action === 'grid'
                ? Math.round(rect.y / 10) * 10
                : rect.y,
    };
  });
  return moveNodes(model, positions);
}
