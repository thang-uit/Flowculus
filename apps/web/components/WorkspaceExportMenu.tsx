'use client';

import { CaretDown, FileArrowDown } from '@phosphor-icons/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import type { WorkspaceCopy } from '@/lib/i18n';
import type { WorkspaceExportFormat } from '@/lib/workspace-exports';

interface WorkspaceExportMenuProps {
  copy: WorkspaceCopy;
  onOpenFile: () => void;
  onExport: (format: WorkspaceExportFormat) => void;
  onShare: () => void;
  className?: string;
  compact?: boolean;
}

interface MenuAction {
  key: string;
  label: string;
  run: () => void;
  /** Only shown where the header has no dedicated button. */
  compactOnly?: boolean;
}

const MENU_WIDTH = 228;

/**
 * Export menu with menu-button keyboard behaviour: arrow keys/Home/End move
 * between items, Enter/Space activate, Escape and Tab close and return focus
 * to the trigger. The panel is portalled so overflow containers cannot clip it.
 */
export function WorkspaceExportMenu({
  copy,
  onOpenFile,
  onExport,
  onShare,
  className,
  compact = false,
}: Readonly<WorkspaceExportMenuProps>) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const sections: Array<{ label: string; actions: MenuAction[] }> = [
    {
      label: copy.exportSectionFile,
      actions: [
        { key: 'open', label: copy.openFile, run: onOpenFile, compactOnly: true },
        { key: 'share', label: copy.shareFile, run: onShare },
      ],
    },
    {
      label: copy.exportSectionDiagram,
      actions: [
        { key: 'drawio', label: copy.exportDrawio, run: () => onExport('drawio') },
        { key: 'svg', label: copy.exportSvg, run: () => onExport('svg') },
        { key: 'png', label: copy.exportPng, run: () => onExport('png') },
        { key: 'jpeg', label: copy.exportJpeg, run: () => onExport('jpeg') },
      ],
    },
    {
      label: copy.exportSectionReport,
      actions: [
        { key: 'pdf', label: copy.exportPdf, run: () => onExport('pdf') },
        {
          key: 'report-png',
          label: copy.exportPngReport,
          run: () => onExport('report-png'),
        },
        {
          key: 'report-jpeg',
          label: copy.exportJpegReport,
          run: () => onExport('report-jpeg'),
        },
      ],
    },
    {
      label: copy.exportSectionData,
      actions: [
        {
          key: 'flowculus',
          label: copy.exportFlowculus,
          run: () => onExport('flowculus'),
        },
        { key: 'csv', label: copy.exportCsv, run: () => onExport('csv') },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      actions: section.actions.filter((action) => compact || !action.compactOnly),
    }))
    .filter((section) => section.actions.length > 0);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPanelPosition({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    panelRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target))
        return;
      close(false);
    };
    window.addEventListener('resize', computePosition);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('resize', computePosition);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [close, open]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) =>
      items[(next + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  const panel = open ? (
    <div
      ref={panelRef}
      role="menu"
      aria-label={copy.exportFile}
      aria-describedby="export-menu-hint"
      onKeyDown={handleMenuKeyDown}
      style={{
        position: 'fixed',
        top: panelPosition.top,
        right: panelPosition.right,
        width: MENU_WIDTH,
        maxWidth: 'calc(100vw - 16px)',
      }}
      className="z-[60] max-h-[calc(100dvh-72px)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-panel)]"
    >
      <span id="export-menu-hint" className="sr-only">
        {copy.resilience.menuHint}
      </span>
      {sections.map((section, index) => (
        <div key={section.label} role="group" aria-label={section.label}>
          {index > 0 ? (
            <div className="my-1 border-t border-[var(--border)]" role="separator" />
          ) : null}
          <p
            className="px-2.5 pb-0.5 pt-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--muted)]"
            aria-hidden="true"
          >
            {section.label}
          </p>
          {section.actions.map((action) => (
            <button
              role="menuitem"
              key={action.key}
              type="button"
              tabIndex={-1}
              onClick={() => {
                close(true);
                action.run();
              }}
              className="focus-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs text-[var(--muted-strong)] transition-colors duration-100 hover:bg-[var(--surface-soft)] hover:text-[var(--text)] focus-visible:bg-[var(--surface-soft)]"
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn('relative block shrink-0', className)}>
      <Tooltip content={copy.exportFile}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={copy.exportFile}
          aria-haspopup="menu"
          aria-expanded={open}
          title={copy.exportFile}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && !open) {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            'focus-ring flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium text-[var(--muted-strong)] transition-colors duration-150 hover:bg-[var(--surface-soft)] hover:text-[var(--text)] active:scale-[0.98]',
            compact ? 'tb-btn justify-center' : 'h-8 px-2.5',
            open && 'bg-[var(--surface-soft)] text-[var(--text)]',
          )}
        >
          <FileArrowDown size={15} aria-hidden="true" />
          {!compact ? <span className="hidden sm:inline">{copy.exportFile}</span> : null}
          <CaretDown
            size={12}
            aria-hidden="true"
            className={cn('transition-transform duration-150', open && 'rotate-180')}
          />
        </button>
      </Tooltip>
      {typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
}
