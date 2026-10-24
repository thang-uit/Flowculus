'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const DEFAULT_DOCK_HEIGHT = 380;
export const MIN_DOCK_HEIGHT = 176;
export const MAX_DOCK_HEIGHT = 680;

const clampDockHeight = (value: number): number => {
  if (typeof window === 'undefined') {
    return Math.min(MAX_DOCK_HEIGHT, Math.max(MIN_DOCK_HEIGHT, value));
  }
  const viewportLimit = Math.max(
    MIN_DOCK_HEIGHT,
    Math.min(MAX_DOCK_HEIGHT, window.innerHeight * 0.76),
  );
  return Math.round(Math.min(viewportLimit, Math.max(MIN_DOCK_HEIGHT, value)));
};

interface ResizeState {
  pointerId: number;
  startY: number;
  startHeight: number;
}

interface ResizeListeners {
  move: (event: PointerEvent) => void;
  end: (event: PointerEvent) => void;
}

/**
 * Pointer and keyboard resizing of the analysis dock. Drag frames write a CSS
 * variable directly (no React state per frame); the height is committed to
 * state once, when the gesture ends.
 */
export function useDockResize(open: boolean) {
  const [dockHeight, setDockHeight] = useState(DEFAULT_DOCK_HEIGHT);
  const dockRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const resizeListenersRef = useRef<ResizeListeners | null>(null);
  const writeDockHeight = useCallback((height: number) => {
    dockRef.current?.style.setProperty('--analysis-dock-height', `${height}px`);
  }, []);

  const finishResize = useCallback(
    (height: number) => {
      const nextHeight = clampDockHeight(height);
      resizeStateRef.current = null;
      setDockHeight(nextHeight);
      writeDockHeight(nextHeight);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      dockRef.current?.removeAttribute('data-resizing');
    },
    [writeDockHeight],
  );

  const removeResizeListeners = useCallback(() => {
    const listeners = resizeListenersRef.current;
    if (!listeners) return;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.end);
    window.removeEventListener('pointercancel', listeners.end);
    resizeListenersRef.current = null;
  }, []);

  useEffect(() => () => removeResizeListeners(), [removeResizeListeners]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !open) return;
    event.preventDefault();
    removeResizeListeners();
    const startY = event.clientY;
    const startHeight = panelRef.current?.getBoundingClientRect().height ?? dockHeight;
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startY,
      startHeight,
    };
    dockRef.current?.setAttribute('data-resizing', 'true');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state || moveEvent.pointerId !== state.pointerId) return;
      const delta = state.startY - moveEvent.clientY;
      const next = clampDockHeight(state.startHeight + delta);
      writeDockHeight(next);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state || upEvent.pointerId !== state.pointerId) return;
      removeResizeListeners();
      const delta = state.startY - upEvent.clientY;
      finishResize(state.startHeight + delta);
    };

    resizeListenersRef.current = { move: onPointerMove, end: onPointerUp };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  };

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const step = event.shiftKey ? 32 : 12;
    let nextHeight = dockHeight;
    if (event.key === 'ArrowUp') nextHeight += step;
    else if (event.key === 'ArrowDown') nextHeight -= step;
    else if (event.key === 'Home') nextHeight = MIN_DOCK_HEIGHT;
    else if (event.key === 'End') nextHeight = MAX_DOCK_HEIGHT;
    else return;
    event.preventDefault();
    const next = clampDockHeight(nextHeight);
    setDockHeight(next);
    writeDockHeight(next);
  };

  return { dockRef, panelRef, dockHeight, handleResizeStart, handleResizeKeyDown };
}
