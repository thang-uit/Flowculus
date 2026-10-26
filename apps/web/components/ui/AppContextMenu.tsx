'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MenuSurface, type AppMenuSection } from './MenuSurface';

export function AppContextMenu({
  point,
  label,
  sections,
  onClose,
}: Readonly<{
  point: { x: number; y: number };
  label: string;
  sections: readonly AppMenuSection[];
  onClose: () => void;
}>) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState({ left: point.x, top: point.y });
  useLayoutEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : document.querySelector<HTMLElement>('.flow-canvas');
    const rect = panel.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        left: Math.max(8, Math.min(point.x, window.innerWidth - rect.width - 8)),
        top: Math.max(8, Math.min(point.y, window.innerHeight - rect.height - 8)),
      });
    panel.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, [point.x, point.y]);
  useEffect(() => {
    const outside = (event: Event) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target))
        onClose();
    };
    const resize = () => onClose();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      window.removeEventListener('resize', resize);
    };
  }, [onClose]);
  const restore = () => {
    opener.current?.focus();
    onClose();
  };
  return createPortal(
    <MenuSurface
      ref={panel}
      aria-label={label}
      sections={sections}
      onSelect={(action) => {
        restore();
        action.onSelect?.();
      }}
      style={{
        position: 'fixed',
        width: 240,
        ...position,
        maxHeight: 'calc(100dvh - 16px)',
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          restore();
        } else if (event.key === 'Tab') {
          restore();
        }
      }}
    />,
    document.body,
  );
}
