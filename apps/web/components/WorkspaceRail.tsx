'use client';

import type { ComponentType } from 'react';
import {
  Asterisk,
  ArrowsClockwise,
  Broadcast,
  CaretLeft,
  CaretRight,
  Circle,
  CircleDashed,
  Database,
  Note,
  Plus,
  PlayCircle,
  Square,
  Stack,
  Shapes,
  X,
} from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import type { SemanticShapeTool } from '@/lib/shape-tools';
import { cn } from '@/lib/cn';

type PaletteIcon = ComponentType<IconProps>;
interface PaletteItem {
  id: SemanticShapeTool;
  label: string;
  hint: string;
  icon: PaletteIcon;
}

function ShapePaletteButton({
  item,
  active,
  compact = false,
  collapsed = false,
  onSelect,
  addShapeLabel,
  onDragStart,
  onDragEnd,
}: Readonly<{
  item: PaletteItem;
  active: boolean;
  compact?: boolean;
  collapsed?: boolean;
  onSelect: () => void;
  addShapeLabel: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}>) {
  const Icon = item.icon;
  return (
    <Tooltip content={`${item.label} / ${item.hint}`}>
      <button
        type="button"
        onClick={onSelect}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', item.id);
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
        aria-pressed={active}
        aria-label={`${addShapeLabel}: ${item.label}`}
        title={`${addShapeLabel}: ${item.label}`}
        className={cn(
          'focus-ring group cursor-pointer transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px',
          collapsed
            ? 'flex size-10 shrink-0 items-center justify-center rounded-lg border'
            : compact
              ? 'flex min-w-[76px] shrink-0 flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center'
              : 'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left',
          active
            ? 'border-[color-mix(in_srgb,var(--accent)_60%,var(--border))] bg-[var(--accent-soft)] shadow-[var(--shadow-soft)]'
            : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-raised)]',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border',
            collapsed ? 'size-8' : compact ? 'size-7' : 'size-8',
            active
              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted-strong)] group-hover:text-[var(--text)]',
          )}
        >
          <Icon
            size={collapsed || compact ? 15 : 17}
            weight={active ? 'bold' : 'regular'}
            aria-hidden="true"
          />
        </span>
        {!collapsed ? (
          <span className={cn('min-w-0', compact && 'w-full')}>
            <span
              className={cn(
                'block text-[12px] font-medium text-[var(--text)]',
                compact ? 'truncate text-[10px]' : 'truncate',
              )}
            >
              {item.label}
            </span>
            {!compact ? (
              <span className="mt-0.5 block truncate text-[10px] text-[var(--muted)]">
                {item.hint}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

export function WorkspaceRail({
  onInsertShape,
  onDragShapeStart,
  onDragShapeEnd,
  onOpenNativeLibrary,
}: Readonly<{
  onInsertShape?: (tool: SemanticShapeTool, label: string) => void;
  onDragShapeStart?: (tool: SemanticShapeTool, label: string) => void;
  onDragShapeEnd?: () => void;
  onOpenNativeLibrary?: () => void;
}>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const activeTool = useWorkspaceStore((state) => state.activeTool);
  const setActiveTool = useWorkspaceStore((state) => state.setActiveTool);
  const paletteOpen = useWorkspaceStore((state) => state.paletteOpen);
  const togglePalette = useWorkspaceStore((state) => state.togglePalette);
  const items: PaletteItem[] = [
    { id: 'start', label: copy.entryPoint, hint: copy.startEventHint, icon: PlayCircle },
    { id: 'task', label: copy.workActivity, hint: copy.taskActivityHint, icon: Square },
    { id: 'xor', label: copy.xorGateway, hint: copy.onePath, icon: X },
    { id: 'and', label: copy.andGateway, hint: copy.parallelPaths, icon: Plus },
    { id: 'or', label: copy.orGateway, hint: copy.inclusivePaths, icon: Circle },
    {
      id: 'eventBased',
      label: copy.eventBasedGateway,
      hint: copy.eventChoice,
      icon: Broadcast,
    },
    {
      id: 'complex',
      label: copy.complexGateway,
      hint: copy.complexChoice,
      icon: Asterisk,
    },
    { id: 'end', label: copy.exitPoint, hint: copy.endEventHint, icon: Circle },
    {
      id: 'event',
      label: copy.intermediateEvent,
      hint: copy.intermediateEventHint,
      icon: CircleDashed,
    },
    { id: 'subprocess', label: copy.subprocess, hint: copy.subprocessHint, icon: Stack },
    { id: 'data', label: copy.dataObject, hint: copy.dataObjectHint, icon: Database },
    { id: 'annotation', label: copy.annotation, hint: copy.annotationHint, icon: Note },
    {
      id: 'rework',
      label: copy.repeatBlock,
      hint: copy.reworkHint,
      icon: ArrowsClockwise,
    },
  ];

  const handleSelect = (item: PaletteItem) => {
    setActiveTool(item.id);
    onInsertShape?.(item.id, item.label);
  };

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-[220ms] ease-out motion-reduce:transition-none lg:flex',
          paletteOpen ? 'w-[228px]' : 'w-[60px]',
        )}
      >
        <div
          className={cn(
            'border-b border-[var(--border)]',
            paletteOpen ? 'px-4 py-4' : 'p-2',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              paletteOpen ? 'justify-between gap-3' : 'justify-center',
            )}
          >
            {paletteOpen ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {copy.shapes}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {copy.shapesDescription}
                </p>
              </div>
            ) : null}
            <Tooltip content={paletteOpen ? copy.collapsePalette : copy.expandPalette}>
              <button
                type="button"
                onClick={togglePalette}
                aria-label={paletteOpen ? copy.collapsePalette : copy.expandPalette}
                title={paletteOpen ? copy.collapsePalette : copy.expandPalette}
                className="focus-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-strong)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] active:scale-[0.97]"
              >
                {paletteOpen ? (
                  <CaretLeft size={15} aria-hidden="true" />
                ) : (
                  <CaretRight size={15} aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
        <nav
          aria-label={copy.processShapes}
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin',
            paletteOpen ? 'space-y-1 p-3' : 'space-y-1.5 p-2',
          )}
        >
          {items.map((item) => (
            <ShapePaletteButton
              key={item.id}
              item={item}
              active={activeTool === item.id}
              collapsed={!paletteOpen}
              onSelect={() => handleSelect(item)}
              addShapeLabel={copy.addShape}
              onDragStart={() => onDragShapeStart?.(item.id, item.label)}
              onDragEnd={onDragShapeEnd}
            />
          ))}
        </nav>
        <div
          className={cn(
            'border-t border-[var(--border)]',
            paletteOpen ? 'px-3 py-3' : 'p-2',
          )}
        >
          <Tooltip content={copy.shapeLibrary}>
            <button
              type="button"
              onClick={onOpenNativeLibrary}
              title={copy.shapeLibrary}
              aria-label={copy.shapeLibrary}
              className={cn(
                'focus-ring flex w-full cursor-pointer items-center rounded-lg py-1.5 text-[11px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]',
                paletteOpen ? 'gap-2 px-2 text-left' : 'justify-center px-0',
              )}
            >
              <Shapes size={15} aria-hidden="true" />
              {paletteOpen ? <span>{copy.canvasLibraryReady}</span> : null}
            </button>
          </Tooltip>
        </div>
      </aside>
      <nav
        aria-label={copy.processShapes}
        aria-hidden={!paletteOpen}
        inert={!paletteOpen}
        className={cn(
          'mobile-shape-palette shrink-0 gap-1 overflow-x-auto bg-[var(--surface)] scrollbar-thin lg:hidden',
          paletteOpen
            ? 'max-h-28 translate-y-0 border-b border-[var(--border)] py-2 opacity-100'
            : 'pointer-events-none max-h-0 -translate-y-1 border-b-0 py-0 opacity-0',
        )}
      >
        {items.map((item) => (
          <ShapePaletteButton
            key={item.id}
            item={item}
            compact
            active={activeTool === item.id}
            onSelect={() => handleSelect(item)}
            addShapeLabel={copy.addShape}
            onDragStart={() => onDragShapeStart?.(item.id, item.label)}
            onDragEnd={onDragShapeEnd}
          />
        ))}
      </nav>
    </>
  );
}
