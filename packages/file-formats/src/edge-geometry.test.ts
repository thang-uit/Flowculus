import { describe, expect, it } from 'vitest';
import { EDGE_ATTACHMENT_SIDES, type ProcessEdge } from '@flowculus/process-model';
import { attachmentPoint } from '@flowculus/graph-layout';
import { insertEdgeWaypoint, routeProcessEdge, moveRouteSegment } from './edge-geometry';

const source = { x: 0, y: 0, width: 80, height: 40 };
const target = { x: 300, y: 0, width: 80, height: 40 };
const edge: ProcessEdge = { id: 'e', source: 'a', target: 'b', kind: 'sequence' };

describe('manual connector routing', () => {
  it('honours all four gateway tips and approach directions in every spatial direction', () => {
    const targets = [
      target,
      { ...target, x: -300 },
      { ...target, x: 0, y: 200 },
      { ...target, x: 0, y: -200 },
      { ...target, y: 250 },
    ];
    for (const to of targets)
      for (const sourceSide of EDGE_ATTACHMENT_SIDES)
        for (const targetSide of EDGE_ATTACHMENT_SIDES) {
          const route = routeProcessEdge(
            {
              ...edge,
              routing: { style: 'orthogonal', waypoints: [], sourceSide, targetSide },
            },
            source,
            to,
            { source: 'gateway', target: 'gateway' },
          );
          expect(route.points[0]).toEqual(attachmentPoint(source, sourceSide));
          expect(route.points.at(-1)).toEqual(attachmentPoint(to, targetSide));
          const end = route.points.at(-1)!;
          const before = route.points.at(-2)!;
          if (targetSide === 'bottom') expect(before.y).toBeGreaterThan(end.y);
          if (targetSide === 'top') expect(before.y).toBeLessThan(end.y);
          if (targetSide === 'right') expect(before.x).toBeGreaterThan(end.x);
          if (targetSide === 'left') expect(before.x).toBeLessThan(end.x);
          for (let at = 1; at < route.points.length; at++) {
            const a = route.points[at - 1],
              b = route.points[at];
            expect(a.x === b.x || a.y === b.y).toBe(true);
          }
        }
  });

  it('keeps attachments through manual bends, styles, movement and resize', () => {
    for (const style of ['orthogonal', 'straight', 'curved'] as const) {
      const to = { ...target, y: 70, width: 56, height: 56 };
      const route = routeProcessEdge(
        {
          ...edge,
          routing: {
            style,
            sourceSide: 'bottom',
            targetSide: 'bottom',
            waypoints: [{ x: 180, y: 180 }],
          },
        },
        source,
        to,
        {},
      );
      expect(route.points[0]).toEqual({ x: 40, y: 40 });
      expect(route.points.at(-1)).toEqual({ x: 328, y: 126 });
      expect(route.points).toContainEqual({ x: 180, y: 180 });
    }
  });
  it('inserts a new point in route order and keeps orthogonal segments', () => {
    expect(
      insertEdgeWaypoint(
        [{ x: 150, y: 50 }],
        { x: 250, y: 60 },
        { x: 40, y: 20 },
        { x: 340, y: 20 },
      ),
    ).toEqual([
      { x: 150, y: 50 },
      { x: 250, y: 60 },
    ]);
    const route = routeProcessEdge(
      { ...edge, routing: { style: 'orthogonal', waypoints: [{ x: 170, y: 80 }] } },
      source,
      target,
      {},
    );
    expect(route.points).toContainEqual({ x: 170, y: 80 });
    for (let i = 1; i < route.points.length; i += 1)
      expect(
        route.points[i].x === route.points[i - 1].x ||
          route.points[i].y === route.points[i - 1].y,
      ).toBe(true);
  });

  it('renders straight and curved paths through user geometry', () => {
    const straight = routeProcessEdge(
      { ...edge, routing: { style: 'straight', waypoints: [] } },
      source,
      target,
      {},
    );
    const curved = routeProcessEdge(
      { ...edge, routing: { style: 'curved', waypoints: [{ x: 170, y: 80 }] } },
      source,
      target,
      {},
    );
    expect(straight.path).toContain(' L ');
    expect(curved.path).toContain(' C ');
  });
});

describe('segment dragging', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];
  it('moves an interior vertical segment horizontally, preserving other geometry', () => {
    expect(moveRouteSegment(points, 1, { x: 140, y: 75 }, true)).toEqual([
      { x: 140, y: 0 },
      { x: 140, y: 100 },
    ]);
  });
  it('creates bends beside fixed endpoints instead of moving the attachments', () => {
    expect(
      moveRouteSegment(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        0,
        { x: 50, y: 40 },
        true,
      ),
    ).toEqual([
      { x: 0, y: 40 },
      { x: 100, y: 40 },
    ]);
    expect(points[0]).toEqual({ x: 0, y: 0 });
  });
  it('rejects invalid indices, nonfinite coordinates and routes exceeding the edit limit', () => {
    expect(moveRouteSegment(points, -1, { x: 1, y: 2 }, true)).toBeNull();
    expect(moveRouteSegment(points, 1, { x: NaN, y: 2 }, true)).toBeNull();
    expect(
      moveRouteSegment(
        Array.from({ length: 35 }, (_, x) => ({ x, y: 0 })),
        0,
        { x: 1, y: 2 },
        true,
      ),
    ).toBeNull();
  });
});
