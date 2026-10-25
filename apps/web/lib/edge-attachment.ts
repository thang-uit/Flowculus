import { attachmentPoint, type Point } from '@flowculus/graph-layout';
import {
  EDGE_ATTACHMENT_SIDES,
  getNodeBounds,
  type EdgeAttachmentSide,
  type ProcessModel,
} from '@flowculus/process-model';
import { isValidNodeConnection } from './model-editing';

export interface EdgeAttachment {
  nodeId: string;
  side: EdgeAttachmentSide;
  point: Point;
}

/** Nearest port wins even when several hit areas overlap at a low zoom. */
export function findEdgeAttachment(
  model: ProcessModel,
  edgeId: string,
  end: 'source' | 'target',
  cursor: Point,
  radius: number,
): EdgeAttachment | null {
  const edge = model.edges[edgeId];
  if (
    !edge ||
    !Number.isFinite(cursor.x) ||
    !Number.isFinite(cursor.y) ||
    !Number.isFinite(radius) ||
    radius <= 0
  )
    return null;
  let closest: EdgeAttachment | null = null;
  let distance = radius;
  for (const node of Object.values(model.nodes)) {
    const rect = getNodeBounds(node);
    for (const side of EDGE_ATTACHMENT_SIDES) {
      const point = attachmentPoint(rect, side);
      const delta = Math.hypot(point.x - cursor.x, point.y - cursor.y);
      if (delta <= distance) {
        distance = delta;
        closest = { nodeId: node.id, side, point };
      }
    }
  }
  if (!closest) return null;
  return isValidNodeConnection(
    model,
    end === 'source' ? closest.nodeId : edge.source,
    end === 'target' ? closest.nodeId : edge.target,
    edgeId,
  )
    ? closest
    : null;
}
