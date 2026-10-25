'use client';

import type { KeyboardEvent, PointerEvent } from 'react';

import type { MiningPanel } from '@/lib/use-mining-panel-resize';

export function MiningPanelResizeHandle({
  panel,
  label,
  value,
  max,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onKeyDown,
}: Readonly<{
  panel: MiningPanel;
  label: string;
  value: number;
  max: number;
  onPointerDown: (panel: MiningPanel, event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (panel: MiningPanel, event: KeyboardEvent<HTMLDivElement>) => void;
}>) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={panel === 'source' ? 240 : 280}
      aria-valuemax={max}
      data-mining-resizer={panel}
      onPointerDown={(event) => onPointerDown(panel, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onKeyDown={(event) => onKeyDown(panel, event)}
      className="mining-resizer focus-ring hidden lg:block"
    />
  );
}
