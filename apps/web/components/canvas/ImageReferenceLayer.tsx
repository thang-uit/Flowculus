/* eslint-disable @next/next/no-img-element -- local blob overlay has no network or image CDN */
'use client';

import { ViewportPortal, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';

interface ReferenceDrag {
  pointerId: number;
  element: HTMLImageElement;
  url: string;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
}

/** Preview pointer frames on the image; persist only a completed gesture. */
export function ImageReferenceLayer() {
  const image = useImageReferenceStore();
  const { screenToFlowPosition } = useReactFlow();
  const drag = useRef<ReferenceDrag | null>(null);
  const finish = useCallback((commit: boolean) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (current.element.hasPointerCapture(current.pointerId))
      current.element.releasePointerCapture(current.pointerId);
    const active = useImageReferenceStore.getState();
    if (active.url !== current.url) return;
    if (commit) active.setPosition(current.x, current.y);
    else {
      current.element.style.left = `${active.x}px`;
      current.element.style.top = `${active.y}px`;
    }
  }, []);
  useEffect(() => {
    const cancel = () => finish(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', key);
    return () => {
      cancel();
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', key);
    };
  }, [finish]);
  useEffect(() => {
    finish(false);
  }, [image.url, image.locked, finish]);
  if (!image.url) return null;
  const scale = Math.min(1, 1200 / image.width);
  const start = (event: PointerEvent<HTMLImageElement>) => {
    if (image.locked || drag.current || !event.isPrimary || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    drag.current = {
      pointerId: event.pointerId,
      element: event.currentTarget,
      url: image.url!,
      originX: image.x,
      originY: image.y,
      startX: point.x,
      startY: point.y,
      x: image.x,
      y: image.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLImageElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    current.x = current.originX + point.x - current.startX;
    current.y = current.originY + point.y - current.startY;
    current.element.style.left = `${current.x}px`;
    current.element.style.top = `${current.y}px`;
  };
  return (
    <ViewportPortal>
      <img
        key={image.url}
        src={image.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={(event) => {
          if (drag.current?.pointerId === event.pointerId) finish(true);
        }}
        onPointerCancel={(event) => {
          if (drag.current?.pointerId === event.pointerId) finish(false);
        }}
        onLostPointerCapture={() => finish(false)}
        className="absolute max-w-none select-none nodrag nopan"
        style={{
          left: image.x,
          top: image.y,
          width: image.width * scale,
          height: image.height * scale,
          opacity: image.opacity,
          transform: `rotate(${image.rotation}deg)`,
          pointerEvents: image.locked ? 'none' : 'auto',
          zIndex: 0,
          touchAction: 'none',
          cursor: image.locked ? 'default' : 'grab',
        }}
      />
    </ViewportPortal>
  );
}
