/**
 * Pure geometry helpers shared by the canvas, the SVG exporter, CSV/event-log
 * imports and the process-mining view. No DOM, no React: everything here is
 * deterministic so the canvas and every exported file draw the same picture.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RectSide = 'top' | 'right' | 'bottom' | 'left';

export interface LayoutNodeInput {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdgeInput {
  source: string;
  target: string;
  /** Higher weights keep the connected nodes closer in the ordering phase. */
  weight?: number;
}

export interface LayeredLayoutOptions {
  /** Nodes that should be placed in the first rank (for example start events). */
  startIds?: string[];
  /** Horizontal gap between ranks. */
  rankGap?: number;
  /** Vertical gap between nodes of the same rank. */
  nodeGap?: number;
  /** Top-left offset of the whole drawing. */
  margin?: number;
  /** `LR` (default) places ranks as columns; `TB` places ranks as rows. */
  direction?: 'LR' | 'TB';
}

export interface LayeredLayoutResult {
  positions: Map<string, Point>;
  ranks: Map<string, number>;
  /** Edges reversed to break cycles; useful to render them as loops. */
  backEdges: Set<string>;
}

const edgeKey = (source: string, target: string): string => `${source}\u0000${target}`;

/**
 * A compact Sugiyama-style layered layout (left → right):
 * 1. DFS from the entry nodes marks back edges so cycles do not break ranking,
 * 2. longest-path ranking on the remaining DAG,
 * 3. a few barycentre sweeps reduce crossings inside each rank,
 * 4. ranks become columns and every column is centred on one shared midline,
 *    which keeps straight sequences perfectly aligned.
 */
export const layoutLayeredGraph = (
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[],
  options: LayeredLayoutOptions = {},
): LayeredLayoutResult => {
  const rankGap = options.rankGap ?? 72;
  const nodeGap = options.nodeGap ?? 44;
  const margin = options.margin ?? 40;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, LayoutEdgeInput[]>();
  const incomingCount = new Map<string, number>();
  nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incomingCount.set(node.id, 0);
  });
  const validEdges = edges.filter(
    (edge) =>
      nodeById.has(edge.source) &&
      nodeById.has(edge.target) &&
      edge.source !== edge.target,
  );
  validEdges.forEach((edge) => {
    outgoing.get(edge.source)?.push(edge);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  });

  const requestedStarts = (options.startIds ?? []).filter((id) => nodeById.has(id));
  const roots = [
    ...requestedStarts,
    ...nodes
      .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
      .map((node) => node.id)
      .filter((id) => !requestedStarts.includes(id)),
  ];

  // 1. Back-edge detection (iterative DFS to stay safe on large logs).
  const backEdges = new Set<string>();
  const state = new Map<string, 'active' | 'done'>();
  const discoveryOrder: string[] = [];
  const visit = (rootId: string) => {
    if (state.has(rootId)) return;
    const stack: Array<{ id: string; next: number }> = [{ id: rootId, next: 0 }];
    state.set(rootId, 'active');
    discoveryOrder.push(rootId);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = outgoing.get(frame.id) ?? [];
      if (frame.next >= children.length) {
        state.set(frame.id, 'done');
        stack.pop();
        continue;
      }
      const edge = children[frame.next];
      frame.next += 1;
      const targetState = state.get(edge.target);
      if (targetState === 'active') {
        backEdges.add(edgeKey(edge.source, edge.target));
      } else if (targetState == null) {
        state.set(edge.target, 'active');
        discoveryOrder.push(edge.target);
        stack.push({ id: edge.target, next: 0 });
      }
    }
  };
  roots.forEach(visit);
  nodes.forEach((node) => visit(node.id));

  // 2. Longest-path ranking over the acyclic part.
  const dagEdges = validEdges.filter(
    (edge) => !backEdges.has(edgeKey(edge.source, edge.target)),
  );
  const dagIncoming = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const dagOutgoing = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  dagEdges.forEach((edge) => {
    dagOutgoing.get(edge.source)?.push(edge.target);
    dagIncoming.set(edge.target, (dagIncoming.get(edge.target) ?? 0) + 1);
  });
  const ranks = new Map<string, number>();
  const queue = discoveryOrder.filter((id) => (dagIncoming.get(id) ?? 0) === 0);
  queue.forEach((id) => ranks.set(id, 0));
  const remaining = new Map(dagIncoming);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const rank = ranks.get(id) ?? 0;
    for (const target of dagOutgoing.get(id) ?? []) {
      ranks.set(target, Math.max(ranks.get(target) ?? 0, rank + 1));
      const left = (remaining.get(target) ?? 0) - 1;
      remaining.set(target, left);
      if (left === 0) queue.push(target);
    }
  }
  nodes.forEach((node) => {
    if (!ranks.has(node.id)) ranks.set(node.id, 0);
  });

  // 3. Ordering: start from DFS discovery order, then barycentre sweeps.
  const discoveryIndex = new Map(discoveryOrder.map((id, index) => [id, index]));
  const maxRank = Math.max(0, ...ranks.values());
  const columns: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  [...nodes]
    .sort(
      (left, right) =>
        (discoveryIndex.get(left.id) ?? 0) - (discoveryIndex.get(right.id) ?? 0),
    )
    .forEach((node) => columns[ranks.get(node.id) ?? 0].push(node.id));

  const neighbours = new Map<string, Array<{ id: string; weight: number }>>();
  nodes.forEach((node) => neighbours.set(node.id, []));
  validEdges.forEach((edge) => {
    const weight = edge.weight ?? 1;
    neighbours.get(edge.source)?.push({ id: edge.target, weight });
    neighbours.get(edge.target)?.push({ id: edge.source, weight });
  });

  const orderIndex = new Map<string, number>();
  const refreshOrder = () =>
    columns.forEach((column) =>
      column.forEach((id, index) =>
        orderIndex.set(id, column.length <= 1 ? 0.5 : index / (column.length - 1)),
      ),
    );
  refreshOrder();
  for (let sweep = 0; sweep < 6; sweep += 1) {
    const forward = sweep % 2 === 0;
    const sequence = forward
      ? columns.map((_, index) => index)
      : columns.map((_, index) => columns.length - 1 - index);
    for (const columnIndex of sequence) {
      const column = columns[columnIndex];
      if (column.length < 2) continue;
      const barycentre = new Map<string, number>();
      column.forEach((id) => {
        const related = (neighbours.get(id) ?? []).filter((neighbour) => {
          const neighbourRank = ranks.get(neighbour.id) ?? 0;
          return forward ? neighbourRank < columnIndex : neighbourRank > columnIndex;
        });
        if (related.length === 0) {
          barycentre.set(id, orderIndex.get(id) ?? 0.5);
          return;
        }
        const totalWeight = related.reduce((sum, item) => sum + item.weight, 0);
        barycentre.set(
          id,
          related.reduce(
            (sum, item) => sum + (orderIndex.get(item.id) ?? 0.5) * item.weight,
            0,
          ) / Math.max(totalWeight, 1e-9),
        );
      });
      column.sort(
        (left, right) =>
          (barycentre.get(left) ?? 0) - (barycentre.get(right) ?? 0) ||
          (discoveryIndex.get(left) ?? 0) - (discoveryIndex.get(right) ?? 0),
      );
    }
    refreshOrder();
  }

  // 4. Coordinates.
  const positions = new Map<string, Point>();
  if (options.direction === 'TB') {
    const rowWidths = columns.map(
      (column) =>
        column.reduce((sum, id) => sum + (nodeById.get(id)?.width ?? 0), 0) +
        Math.max(0, column.length - 1) * nodeGap,
    );
    const widest = Math.max(0, ...rowWidths);
    let rowY = margin;
    columns.forEach((row, rowIndex) => {
      const rowHeight = Math.max(0, ...row.map((id) => nodeById.get(id)?.height ?? 0));
      let x = margin + (widest - rowWidths[rowIndex]) / 2;
      row.forEach((id) => {
        const node = nodeById.get(id);
        if (!node) return;
        positions.set(id, {
          x: Math.round(x),
          y: Math.round(rowY + (rowHeight - node.height) / 2),
        });
        x += node.width + nodeGap;
      });
      rowY += rowHeight + rankGap;
    });
    return { positions, ranks, backEdges };
  }
  const columnHeights = columns.map(
    (column) =>
      column.reduce((sum, id) => sum + (nodeById.get(id)?.height ?? 0), 0) +
      Math.max(0, column.length - 1) * nodeGap,
  );
  const tallest = Math.max(0, ...columnHeights);
  let columnX = margin;
  columns.forEach((column, columnIndex) => {
    const columnWidth = Math.max(0, ...column.map((id) => nodeById.get(id)?.width ?? 0));
    let y = margin + (tallest - columnHeights[columnIndex]) / 2;
    column.forEach((id) => {
      const node = nodeById.get(id);
      if (!node) return;
      positions.set(id, {
        x: Math.round(columnX + (columnWidth - node.width) / 2),
        y: Math.round(y),
      });
      y += node.height + nodeGap;
    });
    columnX += columnWidth + rankGap;
  });

  return { positions, ranks, backEdges };
};

export type RouteShapeHint = 'gateway' | 'event' | 'activity';

export interface OrthogonalRoute {
  points: Point[];
  sourceSide: RectSide;
  targetSide: RectSide;
  labelPoint: Point;
}

const centre = (rect: Rect): Point => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const sidePoint = (rect: Rect, side: RectSide): Point => {
  const middle = centre(rect);
  if (side === 'top') return { x: middle.x, y: rect.y };
  if (side === 'bottom') return { x: middle.x, y: rect.y + rect.height };
  if (side === 'left') return { x: rect.x, y: middle.y };
  return { x: rect.x + rect.width, y: middle.y };
};

const polylineLabelPoint = (points: Point[]): Point => {
  let best = { length: -1, point: points[0] ?? { x: 0, y: 0 } };
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (length > best.length) {
      best = { length, point: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } };
    }
  }
  return best.point;
};

const dedupe = (points: Point[]): Point[] =>
  points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) > 0.5 ||
      Math.abs(point.y - points[index - 1].y) > 0.5,
  );

const LOOP_CLEARANCE = 36;
const SIDE_GAP = 6;

/**
 * Deterministic orthogonal routing between two rectangles. BPMN convention:
 * gateways split through their top/bottom corner and joins are entered from
 * above/below; backward edges (rework loops) are routed underneath both shapes.
 */
const routeBetween = (
  source: Rect,
  target: Rect,
  hints: { source?: RouteShapeHint; target?: RouteShapeHint },
): OrthogonalRoute => {
  const sourceCentre = centre(source);
  const targetCentre = centre(target);
  const finish = (points: Point[], sourceSide: RectSide, targetSide: RectSide) => {
    const clean = dedupe(points);
    return {
      points: clean,
      sourceSide,
      targetSide,
      labelPoint: polylineLabelPoint(clean),
    };
  };

  const targetIsRight = target.x >= source.x + source.width + SIDE_GAP;
  const targetIsLeft = target.x + target.width <= source.x - SIDE_GAP;
  const targetIsBelow = target.y >= source.y + source.height + SIDE_GAP;
  const targetIsAbove = target.y + target.height <= source.y - SIDE_GAP;
  const verticalOffset = targetCentre.y - sourceCentre.y;

  if (targetIsRight) {
    if (hints.source === 'gateway' && Math.abs(verticalOffset) > source.height / 2) {
      const side: RectSide = verticalOffset < 0 ? 'top' : 'bottom';
      const start = sidePoint(source, side);
      const end = sidePoint(target, 'left');
      return finish([start, { x: start.x, y: end.y }, end], side, 'left');
    }
    if (hints.target === 'gateway' && Math.abs(verticalOffset) > target.height / 2) {
      const side: RectSide = verticalOffset < 0 ? 'bottom' : 'top';
      const start = sidePoint(source, 'right');
      const end = sidePoint(target, side);
      return finish([start, { x: end.x, y: start.y }, end], 'right', side);
    }
    const start = sidePoint(source, 'right');
    const end = sidePoint(target, 'left');
    const middleX = Math.round((start.x + end.x) / 2);
    return finish(
      [start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end],
      'right',
      'left',
    );
  }

  if (targetIsBelow && !targetIsLeft) {
    const start = sidePoint(source, 'bottom');
    const end = sidePoint(target, 'top');
    const middleY = Math.round((start.y + end.y) / 2);
    return finish(
      [start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end],
      'bottom',
      'top',
    );
  }

  if (
    targetIsAbove &&
    Math.abs(targetCentre.x - sourceCentre.x) < (source.width + target.width) / 2
  ) {
    // A loop back up a top-to-bottom map: leave and re-enter on the right.
    const start = sidePoint(source, 'right');
    const end = sidePoint(target, 'right');
    const loopX =
      Math.max(source.x + source.width, target.x + target.width) + LOOP_CLEARANCE;
    return finish(
      [start, { x: loopX, y: start.y }, { x: loopX, y: end.y }, end],
      'right',
      'right',
    );
  }

  if (targetIsAbove && !targetIsLeft) {
    const start = sidePoint(source, 'top');
    const end = sidePoint(target, 'bottom');
    const middleY = Math.round((start.y + end.y) / 2);
    return finish(
      [start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end],
      'top',
      'bottom',
    );
  }

  // Backward / overlapping: a loop underneath both shapes.
  const start = sidePoint(source, 'bottom');
  const end = sidePoint(target, 'bottom');
  const loopY =
    Math.max(source.y + source.height, target.y + target.height) + LOOP_CLEARANCE;
  return finish(
    [start, { x: start.x, y: loopY }, { x: end.x, y: loopY }, end],
    'bottom',
    'bottom',
  );
};

const OBSTACLE_MARGIN = 8;
const DETOUR_STEP = 18;
const LANE_GAP = 26;

const segmentHits = (from: Point, to: Point, rect: Rect): boolean => {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  return (
    maxX > rect.x - OBSTACLE_MARGIN &&
    minX < rect.x + rect.width + OBSTACLE_MARGIN &&
    maxY > rect.y - OBSTACLE_MARGIN &&
    minY < rect.y + rect.height + OBSTACLE_MARGIN
  );
};

const collisions = (points: Point[], obstacles: Rect[]): Rect[] =>
  obstacles.filter((rect) =>
    points.some(
      (point, index) => index > 0 && segmentHits(points[index - 1], point, rect),
    ),
  );

const outward = (point: Point, side: RectSide, distance: number): Point => {
  if (side === 'top') return { x: point.x, y: point.y - distance };
  if (side === 'bottom') return { x: point.x, y: point.y + distance };
  if (side === 'left') return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
};

/**
 * Deterministic orthogonal routing between two rectangles. BPMN convention:
 * gateways split through their top/bottom corner and joins are entered from
 * above/below; backward edges (rework loops) are routed underneath both shapes.
 * With `obstacles`, a route that would cross another shape takes a lane beside
 * the shapes it would hit (one detour, nearest side first).
 */
export const routeOrthogonalEdge = (
  source: Rect,
  target: Rect,
  hints: { source?: RouteShapeHint; target?: RouteShapeHint } = {},
  obstacles: Rect[] = [],
): OrthogonalRoute => {
  const route = routeBetween(source, target, hints);
  if (obstacles.length === 0) return route;
  const others = obstacles.filter(
    (rect) => !rectsOverlap(rect, source) && !rectsOverlap(rect, target),
  );
  const hit = collisions(route.points, others);
  if (hit.length === 0) return route;

  const start = route.points[0];
  const end = route.points[route.points.length - 1];
  const leave = outward(start, route.sourceSide, DETOUR_STEP);
  const arrive = outward(end, route.targetSide, DETOUR_STEP);
  const sourceCentre = centre(source);
  let detour: Point[];
  if (route.sourceSide === 'top' || route.sourceSide === 'bottom') {
    const right = Math.max(...hit.map((rect) => rect.x + rect.width)) + LANE_GAP;
    const left = Math.min(...hit.map((rect) => rect.x)) - LANE_GAP;
    const lane =
      Math.abs(right - sourceCentre.x) <= Math.abs(sourceCentre.x - left) ? right : left;
    detour = [
      start,
      leave,
      { x: lane, y: leave.y },
      { x: lane, y: arrive.y },
      arrive,
      end,
    ];
  } else {
    const below = Math.max(...hit.map((rect) => rect.y + rect.height)) + LANE_GAP;
    const above = Math.min(...hit.map((rect) => rect.y)) - LANE_GAP;
    const lane =
      Math.abs(below - sourceCentre.y) <= Math.abs(sourceCentre.y - above)
        ? below
        : above;
    detour = [
      start,
      leave,
      { x: leave.x, y: lane },
      { x: arrive.x, y: lane },
      arrive,
      end,
    ];
  }
  const points = dedupe(detour);
  return { ...route, points, labelPoint: polylineLabelPoint(points) };
};

/** Builds an SVG path through orthogonal points with rounded corners. */
export const roundedPolylinePath = (points: Point[], radius = 10): string => {
  if (points.length === 0) return '';
  const format = (value: number) => Number(value.toFixed(2));
  const commands = [`M ${format(points[0].x)} ${format(points[0].y)}`];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    if (!next) {
      commands.push(`L ${format(point.x)} ${format(point.y)}`);
      break;
    }
    const previous = points[index - 1];
    const incoming = Math.hypot(point.x - previous.x, point.y - previous.y);
    const outgoing = Math.hypot(next.x - point.x, next.y - point.y);
    const corner = Math.min(radius, incoming / 2, outgoing / 2);
    if (corner < 0.5) {
      commands.push(`L ${format(point.x)} ${format(point.y)}`);
      continue;
    }
    const before = {
      x: point.x - ((point.x - previous.x) / incoming) * corner,
      y: point.y - ((point.y - previous.y) / incoming) * corner,
    };
    const after = {
      x: point.x + ((next.x - point.x) / outgoing) * corner,
      y: point.y + ((next.y - point.y) / outgoing) * corner,
    };
    commands.push(
      `L ${format(before.x)} ${format(before.y)}`,
      `Q ${format(point.x)} ${format(point.y)} ${format(after.x)} ${format(after.y)}`,
    );
  }
  return commands.join(' ');
};

export const unionRects = (rects: Rect[]): Rect | null => {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const rectsOverlap = (left: Rect, right: Rect, padding = 0): boolean =>
  left.x < right.x + right.width + padding &&
  left.x + left.width + padding > right.x &&
  left.y < right.y + right.height + padding &&
  left.y + left.height + padding > right.y;
