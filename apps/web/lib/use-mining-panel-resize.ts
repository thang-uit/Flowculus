'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

export type MiningPanel = 'source' | 'insights';

const HANDLE_WIDTH = 8;
const MIN_SOURCE = 240;
const MIN_MAP = 320;
const MIN_INSIGHTS = 280;
const DEFAULT_SOURCE = 288;
const DEFAULT_INSIGHTS = 340;

interface Widths {
  source: number;
  insights: number;
}

interface Drag {
  panel: MiningPanel;
  pointerId: number;
  startX: number;
  widths: Widths;
}

const clamp = (value: number, min: number, max: number) =>
  Math.round(Math.max(min, Math.min(max, value)));

/** Keeps the map usable while either side panel is resized. */
export function useMiningPanelResize() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const widthsRef = useRef<Widths>({
    source: DEFAULT_SOURCE,
    insights: DEFAULT_INSIGHTS,
  });
  const [widths, setWidths] = useState<Widths>({
    source: DEFAULT_SOURCE,
    insights: DEFAULT_INSIGHTS,
  });
  const [containerWidth, setContainerWidth] = useState(1024);

  const fit = useCallback((next: Widths): Widths => {
    const available = (workspaceRef.current?.clientWidth ?? 1024) - HANDLE_WIDTH * 2;
    const source = clamp(next.source, MIN_SOURCE, available - MIN_MAP - MIN_INSIGHTS);
    const insights = clamp(next.insights, MIN_INSIGHTS, available - source - MIN_MAP);
    return { source, insights };
  }, []);

  const write = useCallback((next: Widths) => {
    widthsRef.current = next;
    workspaceRef.current?.style.setProperty('--mining-source-width', `${next.source}px`);
    workspaceRef.current?.style.setProperty(
      '--mining-insights-width',
      `${next.insights}px`,
    );
    workspaceRef.current
      ?.querySelector('[data-mining-resizer="source"]')
      ?.setAttribute('aria-valuenow', String(next.source));
    workspaceRef.current
      ?.querySelector('[data-mining-resizer="insights"]')
      ?.setAttribute('aria-valuenow', String(next.insights));
  }, []);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (dragRef.current) return;
      // Side panels stack below lg; do not overwrite desktop preferences there.
      if (element.clientWidth < 1024) return;
      setContainerWidth(element.clientWidth);
      const next = fit(widthsRef.current);
      write(next);
      setWidths(next);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
  }, [fit, write]);

  const update = (panel: MiningPanel, desired: number) => {
    const current = widthsRef.current;
    const available = (workspaceRef.current?.clientWidth ?? 1024) - HANDLE_WIDTH * 2;
    const next =
      panel === 'source'
        ? {
            ...current,
            source: clamp(desired, MIN_SOURCE, available - current.insights - MIN_MAP),
          }
        : {
            ...current,
            insights: clamp(desired, MIN_INSIGHTS, available - current.source - MIN_MAP),
          };
    write(next);
    return next;
  };

  const onPointerDown = (panel: MiningPanel, event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      panel,
      pointerId: event.pointerId,
      startX: event.clientX,
      widths: { ...widthsRef.current },
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    update(
      drag.panel,
      drag.panel === 'source' ? drag.widths.source + delta : drag.widths.insights - delta,
    );
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    setWidths({ ...widthsRef.current });
  };

  const onKeyDown = (panel: MiningPanel, event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 12;
    const available = (workspaceRef.current?.clientWidth ?? 1024) - HANDLE_WIDTH * 2;
    const max =
      available -
      MIN_MAP -
      (panel === 'source' ? widthsRef.current.insights : widthsRef.current.source);
    const current = widthsRef.current[panel];
    let desired: number;
    if (event.key === 'Home') desired = panel === 'source' ? MIN_SOURCE : MIN_INSIGHTS;
    else if (event.key === 'End') desired = max;
    else if (event.key === 'ArrowLeft')
      desired = current + (panel === 'source' ? -step : step);
    else if (event.key === 'ArrowRight')
      desired = current + (panel === 'source' ? step : -step);
    else return;
    event.preventDefault();
    setWidths(update(panel, desired));
  };

  return {
    workspaceRef,
    widths,
    containerWidth,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onKeyDown,
  };
}
