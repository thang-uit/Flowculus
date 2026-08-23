'use client';

import { CaretDown, FileArrowDown } from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { WorkspaceCopy } from '@/lib/i18n';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

export type WorkspaceExportFormat =
  'xml' | 'png' | 'svg' | 'jpg' | 'jpeg' | 'pdf' | 'json';

interface WorkspaceExportMenuProps {
  copy: WorkspaceCopy;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onExportCanvas: (format: WorkspaceExportFormat) => void;
  onExportAnalysisImage: (format: 'png' | 'jpeg') => void;
  onDownloadFlowculus: () => void;
  onDownloadCsv: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Export dropdown.
 *
 * Uses a React portal so the panel is appended to <body> and never clipped by
 * a scrollable/overflow ancestor (e.g. the commandbar that uses overflow-x:auto).
 * The panel is positioned with `position:fixed` anchored to the trigger button's
 * bounding rect, recalculated on every open.
 */
export function WorkspaceExportMenu({
  copy,
  onOpenFile,
  onSaveFile,
  onExportCanvas,
  onExportAnalysisImage,
  onDownloadFlowculus,
  onDownloadCsv,
  className,
  compact = false,
}: Readonly<WorkspaceExportMenuProps>) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /** Compute fixed position aligned to the right edge of the trigger button */
  const computePosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setPanelPos({
      top: r.bottom + 6,
      // align right edge of panel to right edge of button
      right: window.innerWidth - r.right,
    });
  };

  // Recalculate whenever open changes or window resizes
  useLayoutEffect(() => {
    if (open) computePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => computePosition();
    const onPointerDown = (e: PointerEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const invoke = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  const canvasExports: Array<[string, WorkspaceExportFormat]> = [
    [copy.exportDrawio, 'xml'],
    [copy.exportPng, 'png'],
    [copy.exportSvg, 'svg'],
    [copy.exportJpg, 'jpg'],
    [copy.exportJpeg, 'jpeg'],
    [copy.exportPdf, 'pdf'],
    [copy.exportJson, 'json'],
  ];

  const menuItemClass =
    'focus-ring flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[var(--muted-strong)] transition-colors duration-100 hover:bg-[var(--surface-soft)] hover:text-[var(--text)]';

  const sectionLabelClass =
    'px-2.5 pb-0.5 pt-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--muted)]';

  const panel = open ? (
    <div
      ref={panelRef}
      role="menu"
      aria-label={copy.exportFile}
      style={{
        position: 'fixed',
        top: panelPos.top,
        right: panelPos.right,
        zIndex: 9999,
        width: 220,
      }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-panel)]"
    >
      {/* Open / Save — mobile only */}
      <button
        role="menuitem"
        type="button"
        title={copy.openFile}
        onClick={() => invoke(onOpenFile)}
        className={cn(menuItemClass, 'md:hidden')}
      >
        {copy.openFile}
      </button>
      <button
        role="menuitem"
        type="button"
        title={copy.saveFile}
        onClick={() => invoke(onSaveFile)}
        className={cn(menuItemClass, 'md:hidden')}
      >
        {copy.saveFile}
      </button>
      <div className="my-1 border-t border-[var(--border)] md:hidden" />

      {/* Canvas exports */}
      <p className={sectionLabelClass}>Canvas</p>
      {canvasExports.map(([label, format]) => (
        <button
          role="menuitem"
          key={format}
          type="button"
          title={label}
          onClick={() => invoke(() => onExportCanvas(format))}
          className={menuItemClass}
        >
          {label}
        </button>
      ))}

      <div className="my-1 border-t border-[var(--border)]" />

      {/* Analysis report images */}
      <p className={sectionLabelClass}>Report</p>
      <button
        role="menuitem"
        type="button"
        title={copy.exportPngReport}
        onClick={() => invoke(() => onExportAnalysisImage('png'))}
        className={menuItemClass}
      >
        {copy.exportPngReport}
      </button>
      <button
        role="menuitem"
        type="button"
        title={copy.exportJpegReport}
        onClick={() => invoke(() => onExportAnalysisImage('jpeg'))}
        className={menuItemClass}
      >
        {copy.exportJpegReport}
      </button>

      <div className="my-1 border-t border-[var(--border)]" />

      {/* Flowculus data */}
      <p className={sectionLabelClass}>Data</p>
      <button
        role="menuitem"
        type="button"
        title={copy.exportFlowculus}
        onClick={() => invoke(onDownloadFlowculus)}
        className={menuItemClass}
      >
        {copy.exportFlowculus}
      </button>
      <button
        role="menuitem"
        type="button"
        title={copy.exportCsv}
        onClick={() => invoke(onDownloadCsv)}
        className={menuItemClass}
      >
        {copy.exportCsv}
      </button>
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
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'focus-ring flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium text-[var(--muted-strong)] transition-colors duration-120 hover:bg-[var(--surface-soft)] hover:text-[var(--text)] active:scale-[0.98]',
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

      {/* Portal: renders outside any overflow container */}
      {typeof document !== 'undefined' && createPortal(panel, document.body)}
    </div>
  );
}
