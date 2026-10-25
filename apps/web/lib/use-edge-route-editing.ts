'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import { moveRouteSegment } from '@flowculus/file-formats';
import type { Point } from '@flowculus/graph-layout';
import type { ProcessEdge } from '@flowculus/process-model';
import { useReactFlow } from '@xyflow/react';
import { replaceEdge } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface RouteDrag {
  edge: ProcessEdge;
  pointerId: number;
  owner: HTMLButtonElement;
  points: readonly Point[];
  index: number;
  kind: 'point' | 'segment';
  next: Point[] | null;
  origin: Point;
  handle: Point;
}

/** Transient pointer frames stay local; each completed gesture creates one undo entry. */
export function useEdgeRouteEditing(id: string) {
  const { screenToFlowPosition } = useReactFlow();
  const [controlRoute, setControlRoute] = useState<readonly Point[] | null>(null);
  const [preview, setPreview] = useState<Point[] | null>(null);
  const drag = useRef<RouteDrag | null>(null);
  useEffect(() => {
    const reset = () => {
      const active = drag.current;
      drag.current = null;
      if (active?.owner.hasPointerCapture(active.pointerId))
        active.owner.releasePointerCapture(active.pointerId);
      setPreview(null);
      setControlRoute(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', reset);
      const active = drag.current;
      drag.current = null;
      if (active?.owner.hasPointerCapture(active.pointerId))
        active.owner.releasePointerCapture(active.pointerId);
    };
  }, []);
  const commit = (edge: ProcessEdge, points: Point[]) => {
    const state = useWorkspaceStore.getState();
    const current = state.processModel.edges[id];
    if (
      !current ||
      current !== edge ||
      points.length > 32 ||
      points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
    )
      return;
    if (JSON.stringify(points) === JSON.stringify(current.routing?.waypoints ?? []))
      return;
    state.commitModel(
      replaceEdge(state.processModel, {
        ...current,
        routing: {
          ...current.routing,
          style: current.routing?.style ?? 'orthogonal',
          waypoints: points,
        },
      }),
    );
  };
  const cancel = (event?: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (event && active && event.pointerId !== active.pointerId) return;
    drag.current = null;
    if (active?.owner.hasPointerCapture(active.pointerId))
      active.owner.releasePointerCapture(active.pointerId);
    setPreview(null);
    setControlRoute(null);
  };
  const begin = (
    event: PointerEvent<HTMLButtonElement>,
    kind: RouteDrag['kind'],
    index: number,
    points: readonly Point[],
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag.current) return;
    const edge = useWorkspaceStore.getState().processModel.edges[id];
    if (!edge) return;
    if (kind === 'point' && event.altKey) {
      commit(
        edge,
        (edge.routing?.waypoints ?? []).filter((_, at) => at !== index),
      );
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    if (kind === 'segment') setControlRoute(points);
    const handle =
      kind === 'point'
        ? points[index]
        : {
            x: (points[index].x + points[index + 1].x) / 2,
            y: (points[index].y + points[index + 1].y) / 2,
          };
    drag.current = {
      edge,
      pointerId: event.pointerId,
      owner: event.currentTarget,
      points,
      index,
      kind,
      next: null,
      handle,
      origin: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const cursor = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    if (
      Math.hypot(cursor.x - active.origin.x, cursor.y - active.origin.y) < 1 &&
      !active.next
    )
      return;
    const point = {
      x: active.handle.x + cursor.x - active.origin.x,
      y: active.handle.y + cursor.y - active.origin.y,
    };
    const next =
      active.kind === 'segment'
        ? moveRouteSegment(
            active.points,
            active.index,
            point,
            (active.edge.routing?.style ?? 'orthogonal') === 'orthogonal',
          )
        : (active.edge.routing?.waypoints ?? []).map((old, index) =>
            index === active.index ? point : old,
          );
    if (!next) return;
    active.next = next;
    setPreview(next);
  };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setPreview(null);
    setControlRoute(null);
    if (active.next) commit(active.edge, active.next);
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const edge = useWorkspaceStore.getState().processModel.edges[id];
    const points = edge?.routing?.waypoints ?? [];
    if (!edge || !points[index]) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      commit(
        edge,
        points.filter((_, at) => at !== index),
      );
      return;
    }
    const shifts: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const shift = shifts[event.key];
    if (!shift) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = event.shiftKey ? 10 : 1;
    commit(
      edge,
      points.map((point, at) =>
        at === index
          ? { x: point.x + shift.x * scale, y: point.y + shift.y * scale }
          : point,
      ),
    );
  };
  const segmentKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    points: readonly Point[],
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    const edge = useWorkspaceStore.getState().processModel.edges[id];
    if (!direction || !edge || !points[index + 1]) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 10 : 1;
    const point = {
      x: (points[index].x + points[index + 1].x) / 2 + direction[0] * step,
      y: (points[index].y + points[index + 1].y) / 2 + direction[1] * step,
    };
    const bends = moveRouteSegment(
      points,
      index,
      point,
      (edge.routing?.style ?? 'orthogonal') === 'orthogonal',
    );
    if (bends) commit(edge, bends);
  };
  return { preview, controlRoute, begin, move, end, cancel, key, segmentKey };
}
