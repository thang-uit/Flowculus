import { describe, expect, it } from 'vitest';

import { layoutLayeredGraph, roundedPolylinePath, routeOrthogonalEdge } from './index';

const box = (id: string, width = 100, height = 60) => ({ id, width, height });

describe('layoutLayeredGraph', () => {
  it('places a sequence on one midline from left to right', () => {
    const { positions, ranks } = layoutLayeredGraph(
      [box('a'), box('b'), box('c')],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    );
    expect(ranks.get('a')).toBe(0);
    expect(ranks.get('c')).toBe(2);
    expect(positions.get('a')!.y).toBe(positions.get('c')!.y);
    expect(positions.get('b')!.x).toBeGreaterThan(positions.get('a')!.x);
    expect(positions.get('c')!.x).toBeGreaterThan(positions.get('b')!.x);
  });

  it('stacks parallel branches and breaks cycles with back edges', () => {
    const result = layoutLayeredGraph(
      [box('start'), box('split'), box('x'), box('y'), box('join')],
      [
        { source: 'start', target: 'split' },
        { source: 'split', target: 'x' },
        { source: 'split', target: 'y' },
        { source: 'x', target: 'join' },
        { source: 'y', target: 'join' },
        { source: 'join', target: 'split' },
      ],
      { startIds: ['start'] },
    );
    expect(result.backEdges.size).toBe(1);
    expect(result.ranks.get('x')).toBe(result.ranks.get('y'));
    expect(result.positions.get('x')!.y).not.toBe(result.positions.get('y')!.y);
    expect(result.ranks.get('join')).toBe(3);
  });
});

describe('layoutLayeredGraph TB', () => {
  it('stacks ranks as rows when laid out top to bottom', () => {
    const { positions } = layoutLayeredGraph(
      [box('a'), box('b')],
      [{ source: 'a', target: 'b' }],
      { direction: 'TB' },
    );
    expect(positions.get('a')!.x).toBe(positions.get('b')!.x);
    expect(positions.get('b')!.y).toBeGreaterThan(positions.get('a')!.y);
  });
});

describe('routeOrthogonalEdge', () => {
  const source = { x: 0, y: 0, width: 100, height: 60 };

  it('routes forward edges from the right side to the left side', () => {
    const route = routeOrthogonalEdge(source, { x: 200, y: 0, width: 100, height: 60 });
    expect(route.sourceSide).toBe('right');
    expect(route.targetSide).toBe('left');
    expect(route.points[0]).toEqual({ x: 100, y: 30 });
    expect(route.points.at(-1)).toEqual({ x: 200, y: 30 });
  });

  it('exits a gateway through its top corner for an upper branch', () => {
    const route = routeOrthogonalEdge(
      { x: 0, y: 100, width: 50, height: 50 },
      { x: 150, y: 0, width: 100, height: 60 },
      { source: 'gateway' },
    );
    expect(route.sourceSide).toBe('top');
    expect(route.points).toEqual([
      { x: 25, y: 100 },
      { x: 25, y: 30 },
      { x: 150, y: 30 },
    ]);
  });

  it('routes rework loops underneath both shapes', () => {
    const route = routeOrthogonalEdge({ x: 300, y: 0, width: 100, height: 60 }, source);
    expect(route.sourceSide).toBe('bottom');
    expect(route.targetSide).toBe('bottom');
    expect(route.points[1].y).toBeGreaterThan(60);
  });

  it('builds rounded SVG paths', () => {
    expect(
      roundedPolylinePath(
        [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 50 },
        ],
        10,
      ),
    ).toBe('M 0 0 L 40 0 Q 50 0 50 10 L 50 50');
  });

  it('routes an upward loop around the right side', () => {
    const route = routeOrthogonalEdge(
      { x: 0, y: 200, width: 100, height: 60 },
      { x: 0, y: 0, width: 100, height: 60 },
    );
    expect(route.sourceSide).toBe('right');
    expect(route.targetSide).toBe('right');
    expect(route.points[1].x).toBeGreaterThan(100);
  });

  it('detours around a shape that sits on the straight route', () => {
    const top = { x: 0, y: 0, width: 100, height: 60 };
    const blocker = { x: 0, y: 120, width: 100, height: 60 };
    const bottom = { x: 0, y: 240, width: 100, height: 60 };
    const direct = routeOrthogonalEdge(top, bottom);
    expect(direct.points.every((point) => point.x === 50)).toBe(true);
    const detour = routeOrthogonalEdge(top, bottom, {}, [top, blocker, bottom]);
    expect(detour.points.length).toBeGreaterThan(2);
    expect(Math.max(...detour.points.map((point) => point.x))).toBeGreaterThan(100);
  });
});
