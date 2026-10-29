'use client';

import { PaletteToggle, PALETTE_IDS } from '@/components/palette/PaletteToggle';

import { ShapePaletteGlyph } from '@/components/palette/ShapePaletteGlyph';
import { Tooltip } from '@/components/ui/Tooltip';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { SHAPE_DRAG_MIME, type PaletteTool } from '@/lib/shape-tools';
import { useCanvasCommands } from '@/lib/use-canvas-commands';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

interface PaletteItem {
  id: PaletteTool;
  label: string;
  hint: string;
}

function ShapePaletteButton({
  item,
  compact = false,
  collapsed = false,
  onSelect,
  addShapeLabel,
}: Readonly<{
  item: PaletteItem;
  compact?: boolean;
  collapsed?: boolean;
  onSelect: () => void;
  addShapeLabel: string;
}>) {
  return (
    <Tooltip content={`${item.label} / ${item.hint}`}>
      <button
        type="button"
        onClick={onSelect}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(SHAPE_DRAG_MIME, item.id);
          event.dataTransfer.effectAllowed = 'copy';
        }}
        aria-label={`${addShapeLabel}: ${item.label}`}
        title={`${addShapeLabel}: ${item.label}`}
        className={cn(
          'focus-ring group cursor-pointer transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px',
          collapsed
            ? 'flex size-11 shrink-0 items-center justify-center rounded-lg border'
            : compact
              ? 'flex min-w-[76px] shrink-0 flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center'
              : 'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left',
          'cursor-grab border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-raised)] active:cursor-grabbing',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border',
            collapsed ? 'size-8' : compact ? 'size-7' : 'size-8',
            'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted-strong)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent-strong)]',
          )}
        >
          <ShapePaletteGlyph tool={item.id} />
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
              <span className="mt-0.5 block text-[10px] leading-4 text-[var(--muted)]">
                {item.hint}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

export function WorkspaceRail() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const collaboration = getCollaborationCopy(locale);
  const paletteOpen = useWorkspaceStore((state) => state.paletteOpen);
  const { insertShapeAtCentre } = useCanvasCommands();
  const items: PaletteItem[] = [
    { id: 'pool', label: collaboration.pool, hint: collaboration.poolHint },
    { id: 'lane', label: collaboration.lane, hint: collaboration.laneHint },
    { id: 'start', label: copy.entryPoint, hint: copy.startEventHint },
    { id: 'task', label: copy.workActivity, hint: copy.taskActivityHint },
    { id: 'xor', label: copy.xorGateway, hint: copy.onePath },
    { id: 'and', label: copy.andGateway, hint: copy.parallelPaths },
    { id: 'or', label: copy.orGateway, hint: copy.inclusivePaths },
    {
      id: 'eventBased',
      label: copy.eventBasedGateway,
      hint: copy.eventChoice,
    },
    {
      id: 'complex',
      label: copy.complexGateway,
      hint: copy.complexChoice,
    },
    { id: 'end', label: copy.exitPoint, hint: copy.endEventHint },
    {
      id: 'event',
      label: copy.intermediateEvent,
      hint: copy.intermediateEventHint,
    },
    { id: 'subprocess', label: copy.subprocess, hint: copy.subprocessHint },
    { id: 'data', label: copy.dataObject, hint: copy.dataObjectHint },
    { id: 'annotation', label: copy.annotation, hint: copy.annotationHint },
    {
      id: 'rework',
      label: copy.repeatBlock,
      hint: copy.reworkHint,
    },
  ];

  const handleSelect = (item: PaletteItem) =>
    insertShapeAtCentre(
      item.id,
      item.id === 'pool' || item.id === 'lane'
        ? collaboration[item.id]
        : copy.defaultNodeLabels[item.id],
    );

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
            paletteOpen ? 'px-4 py-3' : 'p-2',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              paletteOpen ? 'items-start justify-between gap-2' : 'justify-center',
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
            <PaletteToggle />
          </div>
        </div>
        <nav
          id={PALETTE_IDS.desktop}
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
              collapsed={!paletteOpen}
              onSelect={() => handleSelect(item)}
              addShapeLabel={copy.addShape}
            />
          ))}
        </nav>
        {paletteOpen ? (
          <p className="border-t border-[var(--border)] px-4 py-3 text-[10.5px] leading-4 text-[var(--muted)]">
            {copy.paletteDragHint}
          </p>
        ) : null}
      </aside>
      <nav
        id={PALETTE_IDS.mobile}
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
            onSelect={() => handleSelect(item)}
            addShapeLabel={copy.addShape}
          />
        ))}
      </nav>
    </>
  );
}
