'use client';

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent,
  type RefObject,
} from 'react';

interface Gesture {
  id: string;
  pointerId: number;
  touch: boolean;
  startX: number;
  x: number;
  startY: number;
  initialScroll: number;
  scrolling: boolean;
  dragging: boolean;
  target: number;
  items: Array<{ id: string; left: number; width: number; element: HTMLElement }>;
}
const START_DISTANCE = 6;
const HOLD_MS = 280;
const EDGE_ZONE = 32;
const SCROLL_STEP = 12;

/** Keep pointer frames out of the store; commit one ordered move on release. */
export function useTabReorder(
  listRef: RefObject<HTMLDivElement | null>,
  ids: readonly string[],
  onMove: (id: string, index: number) => void,
) {
  const gesture = useRef<Gesture | null>(null),
    hold = useRef<ReturnType<typeof setTimeout> | null>(null),
    frame = useRef(0),
    suppressClick = useRef(false);
  const armRef = useRef<(detail: Gesture) => void>(() => undefined);
  const moveRef = useRef(onMove);
  useEffect(() => {
    moveRef.current = onMove;
  }, [onMove]);
  const finishRef = useRef<(commit: boolean) => void>(() => undefined);
  const signature = ids.join('|');
  useEffect(() => {
    finishRef.current(false);
  }, [signature]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const clearHold = () => {
      if (hold.current !== null) clearTimeout(hold.current);
      hold.current = null;
    };
    const paint = () => {
      frame.current = 0;
      const current = gesture.current;
      if (!current?.dragging) return;
      const rect = list.getBoundingClientRect();
      const speed =
        current.x < rect.left + EDGE_ZONE
          ? -SCROLL_STEP
          : current.x > rect.right - EDGE_ZONE
            ? SCROLL_STEP
            : 0;
      if (speed) list.scrollLeft += speed;
      const delta = current.x - current.startX + list.scrollLeft - current.initialScroll;
      const source = current.items.findIndex((item) => item.id === current.id),
        dragged = current.items[source];
      const centre = dragged.left + dragged.width / 2 + delta;
      const others = current.items.filter((item) => item.id !== current.id);
      current.target = others.filter(
        (item) => centre > item.left + item.width / 2,
      ).length;
      const gap =
        current.items.length > 1
          ? Math.max(
              0,
              current.items[1].left - current.items[0].left - current.items[0].width,
            )
          : 8;
      current.items.forEach((item, index) => {
        const offset =
          index === source
            ? delta
            : source < current.target && index > source && index <= current.target
              ? -(dragged.width + gap)
              : source > current.target && index >= current.target && index < source
                ? dragged.width + gap
                : 0;
        item.element.style.transform = `translateX(${offset}px)`;
      });
      if (speed) frame.current = requestAnimationFrame(paint);
    };
    const startDrag = () => {
      const current = gesture.current;
      if (!current) return;
      clearHold();
      current.dragging = true;
      list.dataset.reordering = 'true';
      const item = current.items.find((item) => item.id === current.id);
      if (item) item.element.dataset.dragging = 'true';
      list.setPointerCapture(current.pointerId);
      frame.current = requestAnimationFrame(paint);
    };
    const finish = (commit: boolean) => {
      clearHold();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      const current = gesture.current;
      gesture.current = null;
      if (!current) return;
      if (list.hasPointerCapture(current.pointerId))
        list.releasePointerCapture(current.pointerId);
      delete list.dataset.reordering;
      current.items.forEach((item) => {
        item.element.style.transform = '';
        delete item.element.dataset.dragging;
      });
      if (current.dragging || current.scrolling) {
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      if (commit && current.dragging) moveRef.current(current.id, current.target);
    };
    finishRef.current = finish;
    const pointerMove = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.x = event.clientX;
      if (!current.dragging) {
        if (
          current.touch &&
          Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >
            START_DISTANCE
        ) {
          clearHold();
          current.scrolling = true;
          list.scrollLeft = current.initialScroll + current.startX - event.clientX;
          return;
        }
        if (!current.touch && Math.abs(event.clientX - current.startX) > START_DISTANCE)
          startDrag();
      }
      if (current.dragging) {
        event.preventDefault();
        if (!frame.current) frame.current = requestAnimationFrame(paint);
      }
    };
    const pointerUp = (event: PointerEvent) => {
      if (gesture.current?.pointerId !== event.pointerId) return;
      gesture.current.x = event.clientX;
      const rect = list.getBoundingClientRect();
      const valid =
        event.clientY >= rect.top - 24 &&
        event.clientY <= rect.bottom + 24 &&
        event.clientX >= 0 &&
        event.clientX <= window.innerWidth;
      if (gesture.current.dragging && valid) {
        cancelAnimationFrame(frame.current);
        paint();
      }
      finish(valid);
    };
    const cancel = () => finish(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', cancel);
    list.addEventListener('lostpointercapture', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    window.addEventListener('keydown', key, true);
    document.addEventListener('visibilitychange', hidden);
    armRef.current = (detail) => {
      gesture.current = detail;
      if (detail.touch) hold.current = setTimeout(startDrag, HOLD_MS);
    };
    return () => {
      finish(false);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', cancel);
      list.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
      window.removeEventListener('keydown', key, true);
      document.removeEventListener('visibilitychange', hidden);
      armRef.current = () => undefined;
    };
  }, [listRef]);
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !event.isPrimary || gesture.current) return;
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[role="tab"]')
          : null;
      const list = listRef.current;
      if (!button || !list || ids.length < 2) return;
      const id = button.dataset.documentId;
      if (!id) return;
      const items = [...list.querySelectorAll<HTMLElement>('[data-tab-id]')].map(
        (element) => ({
          id: element.dataset.tabId!,
          left: element.getBoundingClientRect().left,
          width: element.getBoundingClientRect().width,
          element,
        }),
      );
      armRef.current({
        id,
        pointerId: event.pointerId,
        touch: event.pointerType !== 'mouse',
        startX: event.clientX,
        x: event.clientX,
        startY: event.clientY,
        initialScroll: list.scrollLeft,
        scrolling: false,
        dragging: false,
        target: items.findIndex((item) => item.id === id),
        items,
      } satisfies Gesture);
    },
    onClickCapture: (event: MouseEvent) => {
      if (suppressClick.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    },
    cancel: () => finishRef.current(false),
  };
}
