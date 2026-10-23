'use client';

import {
  FileArrowDown,
  FileArrowUp,
  ShareNetwork,
  SidebarSimple,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { FlowculusLogo } from '@/components/branding/FlowculusLogo';
import { HeaderKpiBadge } from '@/components/header/HeaderKpiBadge';
import { ModeSwitch } from '@/components/header/ModeSwitch';
import { ImageReferencePanel } from '@/components/ImageReferencePanel';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkspaceExportMenu } from '@/components/WorkspaceExportMenu';
import { WorkspaceCanvasControls } from '@/components/WorkspaceToolbar';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { exportWorkspace, type WorkspaceExportFormat } from '@/lib/workspace-exports';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface WorkspaceHeaderProps {
  onImportFiles: (files: File[]) => Promise<void>;
}

export function WorkspaceHeader({ onImportFiles }: WorkspaceHeaderProps) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const mode = useWorkspaceStore((state) => state.mode);
  const inspectorOpen = useWorkspaceStore((state) => state.inspectorOpen);
  const toggleInspector = useWorkspaceStore((state) => state.toggleInspector);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    },
    [],
  );

  const showStatus = (message: string) => {
    setStatusMessage(message);
    if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2400);
  };

  const runExport = (format: WorkspaceExportFormat) => {
    // Open the print window inside the click so pop-up blockers allow it.
    const reportWindow = format === 'pdf' ? window.open('', '_blank') : null;
    const state = useWorkspaceStore.getState();
    void exportWorkspace(format, {
      model: state.processModel,
      report: state.analysisReport,
      analysisOptions: state.analysisOptions,
      drawioSource: state.drawioSource,
      copy,
      locale,
      reportWindow,
    })
      .then(() => showStatus(copy.localCopyExported))
      .catch(() => {
        reportWindow?.close();
        showStatus(copy.fileError);
      });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void onImportFiles(files)
      .then(() => showStatus(copy.fileReady))
      .catch((error: unknown) => {
        showStatus(
          error instanceof Error && error.message === 'file-too-large'
            ? copy.fileTooLarge
            : copy.fileError,
        );
      });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: useWorkspaceStore.getState().processModel.name,
          text: copy.shareText,
        });
        showStatus(copy.shareSheetOpened);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showStatus(copy.workspaceLinkCopied);
      }
    } catch {
      showStatus(copy.shareCancelled);
    }
  };

  const brand = (compact: boolean) => (
    <Tooltip content={copy.brandTooltip}>
      <Link
        href="/"
        aria-label={copy.brandTooltip}
        title={copy.brandTooltip}
        className="focus-ring group min-w-0 shrink-0 cursor-pointer select-none rounded-xl"
      >
        <FlowculusLogo compact={compact} className="shrink-0" />
      </Link>
    </Tooltip>
  );

  return (
    <header className="workspace-header relative flex h-12 min-h-12 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 sm:px-4">
      {/* Mobile */}
      <div className="flex w-full min-w-0 items-center justify-between gap-1.5 lg:hidden">
        <div className="flex min-w-0 items-center gap-1.5">
          {brand(true)}
          <ModeSwitch compact />
        </div>
        <div className="flex min-w-0 items-center gap-1">
          {mode === 'model' ? <HeaderKpiBadge compact /> : null}
          <LanguageToggle />
          <ThemeToggle />
          <WorkspaceExportMenu
            copy={copy}
            compact
            onOpenFile={() => fileInputRef.current?.click()}
            onExport={runExport}
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden w-full min-w-0 items-center justify-between gap-3 lg:flex">
        <div className="flex min-w-0 items-center gap-2.5">
          {brand(false)}
          <span className="tb-divider" aria-hidden="true" />
          <ModeSwitch />
          {mode === 'model' ? (
            <>
              <span className="tb-divider" aria-hidden="true" />
              <WorkspaceCanvasControls />
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {mode === 'model' ? (
            <>
              <HeaderKpiBadge />
              <span className="tb-divider" aria-hidden="true" />
            </>
          ) : null}
          <Tooltip content={copy.importHint}>
            <button
              type="button"
              aria-label={copy.openFile}
              title={copy.openFile}
              onClick={() => fileInputRef.current?.click()}
              className="focus-ring tb-btn tb-btn--idle"
            >
              <FileArrowUp size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={copy.saveFile}>
            <button
              type="button"
              aria-label={copy.saveFile}
              title={copy.saveFile}
              onClick={() => runExport('drawio')}
              className="focus-ring tb-btn tb-btn--idle"
            >
              <FileArrowDown size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={copy.shareFile}>
            <button
              type="button"
              aria-label={copy.shareFile}
              title={copy.shareFile}
              onClick={() => void handleShare()}
              className="focus-ring tb-btn tb-btn--idle hidden xl:inline-flex"
            >
              <ShareNetwork size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <span className="hidden xl:inline-flex">
            <ImageReferencePanel />
          </span>
          <WorkspaceExportMenu
            copy={copy}
            onOpenFile={() => fileInputRef.current?.click()}
            onExport={runExport}
          />
          <span className="tb-divider" aria-hidden="true" />
          <LanguageToggle />
          <ThemeToggle />
          {mode === 'model' ? (
            <>
              <span className="tb-divider" aria-hidden="true" />
              <Tooltip content={copy.toggleInspector}>
                <button
                  type="button"
                  aria-label={copy.toggleInspector}
                  title={copy.toggleInspector}
                  aria-pressed={inspectorOpen}
                  onClick={toggleInspector}
                  className={cn(
                    'focus-ring tb-btn',
                    inspectorOpen ? 'tb-btn--active' : 'tb-btn--idle',
                  )}
                >
                  <SidebarSimple
                    size={15}
                    weight={inspectorOpen ? 'bold' : 'regular'}
                    aria-hidden="true"
                  />
                </button>
              </Tooltip>
            </>
          ) : null}
        </div>
      </div>

      {statusMessage ? (
        <p
          role="status"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)] shadow-[var(--shadow-soft)]"
        >
          {statusMessage}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".flowculus.json,.drawio,.xml,.json,.csv,.tsv,.xes"
        multiple
        className="sr-only"
        aria-label={copy.openFile}
        onChange={handleFileChange}
      />
    </header>
  );
}
