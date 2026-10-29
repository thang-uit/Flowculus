'use client';

import { ImageSquare, ShareNetwork, SidebarSimple } from '@phosphor-icons/react';
import { useCallback, useRef, type ChangeEvent } from 'react';
import { ExportNameDialog } from '@/components/documents/ExportNameDialog';
import { DocumentTabs } from '@/components/documents/DocumentTabs';
import { MiningTabs } from '@/components/mining/MiningTabs';
import { DocumentDialog } from '@/components/documents/DocumentDialog';
import { useDocumentCommands } from '@/lib/documents/use-document-commands';

import { WorkspaceProjectMenu } from '@/components/header/WorkspaceProjectMenu';
import { HeaderKpiBadge } from '@/components/header/HeaderKpiBadge';
import { ModeSwitch } from '@/components/header/ModeSwitch';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkspaceExportMenu } from '@/components/WorkspaceExportMenu';
import { WorkspaceCanvasControls } from '@/components/WorkspaceToolbar';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { reportWorkspaceImport } from '@/lib/documents/import-feedback';
import { useWorkspaceActions } from '@/lib/use-workspace-actions';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { useDeviceOpen } from '@/lib/documents/use-device-open';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { getMiningTabsCopy } from '@/lib/i18n/mining-tabs-copy';

import type { WorkspaceImportSelection } from '@/lib/use-workspace-import';

interface WorkspaceHeaderProps {
  onImportFiles: (files: WorkspaceImportSelection) => Promise<boolean>;
}

export function WorkspaceHeader({ onImportFiles }: WorkspaceHeaderProps) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const restoringDrafts = useWorkspaceStore((state) => state.draftStatus === 'loading');
  const mode = useWorkspaceStore((state) => state.mode);
  const inspectorOpen = useWorkspaceStore((state) => state.inspectorOpen);
  const toggleInspector = useWorkspaceStore((state) => state.toggleInspector);
  const { runExport, share, pendingExport, confirmExport, cancelExport } =
    useWorkspaceActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const miningInputRef = useRef<HTMLInputElement>(null);
  const fallbackOpen = useCallback(() => fileInputRef.current?.click(), []);
  const openMiningFile = useCallback(() => miningInputRef.current?.click(), []);
  const openFile = useDeviceOpen(onImportFiles, fallbackOpen);
  useDocumentCommands(openFile, openMiningFile);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void reportWorkspaceImport(onImportFiles(files));
  };

  const brand = (compact: boolean) => <WorkspaceProjectMenu compact={compact} />;

  return (
    <>
      <header
        inert={mode === 'model' && restoringDrafts}
        className="workspace-header relative flex h-12 min-h-12 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 sm:px-4"
      >
        {/* Mobile */}
        <div className="flex w-full min-w-0 items-center justify-between gap-1.5 xl:hidden">
          <div className="flex min-w-0 items-center gap-1.5">
            {brand(true)}
            <ModeSwitch compact />
          </div>
          <div className="flex min-w-0 items-center gap-1">
            {mode === 'model' ? <HeaderKpiBadge compact /> : null}
            <LanguageToggle />
            <ThemeToggle />
            {mode === 'model' ? (
              <WorkspaceExportMenu
                copy={copy}
                compact
                onExport={runExport}
                onShare={() => void share()}
              />
            ) : null}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden w-full min-w-0 items-center justify-between gap-3 xl:flex">
          <div className="flex min-w-0 items-center gap-2.5">
            {brand(false)}
            <span className="tb-divider" aria-hidden="true" />
            <ModeSwitch />
            {mode === 'model' ? (
              <>
                <span
                  className="tb-divider hidden min-[1440px]:inline-flex"
                  aria-hidden="true"
                />
                <WorkspaceCanvasControls className="hidden min-[1440px]:flex" />
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
            {mode === 'model' ? (
              <>
                <Tooltip content={copy.shareFile}>
                  <button
                    type="button"
                    aria-label={copy.shareFile}
                    title={copy.shareFile}
                    onClick={() => void share()}
                    className="focus-ring tb-btn tb-btn--idle hidden xl:inline-flex"
                  >
                    <ShareNetwork size={15} aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip content={copy.openImage}>
                  <button
                    type="button"
                    aria-label={copy.openImage}
                    title={copy.openImage}
                    className="focus-ring tb-btn tb-btn--idle"
                    onClick={() => useImageReferenceStore.getState().setOpen(true)}
                  >
                    <ImageSquare size={15} aria-hidden="true" />
                  </button>
                </Tooltip>
                <WorkspaceExportMenu
                  copy={copy}
                  onExport={runExport}
                  onShare={() => void share()}
                />
              </>
            ) : null}
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
                    data-inspector-toggle="true"
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".flowculus.json,.bpmn,.drawio,.xml,.json,.csv,.tsv,.xes,.xlsx,.png,.jpg,.jpeg,.webp"
          multiple
          className="sr-only"
          aria-label={copy.openFile}
          onChange={handleFileChange}
        />
        <input
          ref={miningInputRef}
          type="file"
          accept=".csv,.tsv,.json,.xes,.xml,.txt,.xlsx"
          className="sr-only"
          aria-label={getMiningTabsCopy(locale).open}
          onChange={handleFileChange}
        />
      </header>
      {mode === 'model' ? (
        <DocumentTabs onOpen={openFile} />
      ) : (
        <MiningTabs onOpen={openMiningFile} />
      )}
      <DocumentDialog />
      {pendingExport ? (
        <ExportNameDialog
          key={pendingExport.documentId}
          name={pendingExport.name}
          onCancel={cancelExport}
          onExport={confirmExport}
        />
      ) : null}
    </>
  );
}
