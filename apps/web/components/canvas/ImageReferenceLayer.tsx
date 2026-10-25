/* eslint-disable @next/next/no-img-element -- local blob overlay has no network or image CDN */
'use client';

import { ViewportPortal, useReactFlow } from '@xyflow/react';
import { useRef, type PointerEvent } from 'react';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';

/** Image coordinates share the model's canvas coordinate space. */
export function ImageReferenceLayer() {
  const url = useImageReferenceStore((state) => state.url);
  const width = useImageReferenceStore((state) => state.width);
  const height = useImageReferenceStore((state) => state.height);
  const x = useImageReferenceStore((state) => state.x);
  const y = useImageReferenceStore((state) => state.y);
  const opacity = useImageReferenceStore((state) => state.opacity);
  const rotation = useImageReferenceStore((state) => state.rotation);
  const locked = useImageReferenceStore((state) => state.locked);
  const setPosition = useImageReferenceStore((state) => state.setPosition);
  const { screenToFlowPosition } = useReactFlow();
  const drag = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
  } | null>(null);
  if (!url) return null;
  const scale = Math.min(1, 1200 / width);
  const start = (event: PointerEvent<HTMLImageElement>) => {
    if (locked) return;
    event.stopPropagation();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    drag.current = {
      pointerId: event.pointerId,
      originX: x,
      originY: y,
      startX: point.x,
      startY: point.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLImageElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setPosition(
      current.originX + point.x - current.startX,
      current.originY + point.y - current.startY,
    );
  };
  return (
    <ViewportPortal>
      {/* The layer is intentionally noninteractive: nodes and connectors stay editable. */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        draggable={false}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        className="absolute max-w-none select-none"
        style={{
          left: x,
          top: y,
          width: width * scale,
          height: height * scale,
          opacity,
          transform: `rotate(${rotation}deg)`,
          pointerEvents: locked ? 'none' : 'auto',
          zIndex: 0,
          touchAction: 'none',
          cursor: locked ? 'default' : 'grab',
        }}
      />
    </ViewportPortal>
  );
}
