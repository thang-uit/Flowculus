'use client';

import {
  FloppyDisk,
  FolderOpen,
  PencilSimple,
  Plus,
  DotsThree,
} from '@phosphor-icons/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/cn';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { getDocumentCopy } from '@/lib/i18n/document-copy';
import { getMiningDataCopy } from '@/lib/i18n/mining-data-copy';
import {
  getWorkspaceDocuments,
  MAX_OPEN_DOCUMENTS,
} from '@/lib/documents/document-types';
import {
  createNewDocument,
  requestDocumentSave,
  requestDocumentClose,
} from '@/lib/documents/use-document-commands';
import { hasDeviceFile, supportsDeviceFiles } from '@/lib/documents/device-file';
import { useTabReorder } from '@/lib/documents/use-tab-reorder';
import { DocumentTabMenu } from './DocumentTabMenu';
import { ProcessDocumentTab } from './ProcessDocumentTab';
import { OpenProcessMenu } from './OpenProcessMenu';
import { Tooltip } from '@/components/ui/Tooltip';

import { documentSaveLabel } from '@/lib/documents/document-display';

export function DocumentTabs({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getDocumentCopy(locale);
  const mode = useWorkspaceStore((state) => state.mode);
  const miningCopy = getMiningDataCopy(locale);
  const state = useWorkspaceStore(
    useShallow((state) => ({
      documents: state.documents,
      activeDocumentId: state.activeDocumentId,
      processModel: state.processModel,
      analysisOptions: state.analysisOptions,
      drawioSource: state.drawioSource,
      history: state.history,
      canvasViewport: state.canvasViewport,
    })),
  );
  const setDialog = useWorkspaceStore((state) => state.setDocumentDialog);
  const switchDocument = useWorkspaceStore((state) => state.switchDocument);
  const draftStatus = useWorkspaceStore((state) => state.draftStatus);
  const documents = getWorkspaceDocuments(state);
  const current = documents.find((document) => document.id === state.activeDocumentId)!;
  const ref = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const pendingFocus = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [tabMenu, setTabMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const dismissMenu = useCallback(() => setTabMenu(null), []);
  const move = (id: string, index: number) => {
    const before = useWorkspaceStore.getState();
    const name = getWorkspaceDocuments(before).find((document) => document.id === id)
      ?.processModel.name;
    if (
      !name ||
      before.documents[index]?.id === id ||
      index < 0 ||
      index >= before.documents.length
    )
      return;
    const target = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []),
    ].find((tab) => tab.dataset.documentId === id);
    target?.focus();
    pendingFocus.current = id;
    before.reorderDocument(id, index);
    setAnnouncement(copy.moved(name, index + 1, before.documents.length));
  };
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const tab = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []),
    ].find((item) => item.dataset.documentId === id);
    tab?.focus();
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [state.documents]);
  const reorder = useTabReorder(
    ref,
    documents.map((document) => document.id),
    move,
  );
  const menuDocument = documents.find((document) => document.id === tabMenu?.id);
  useEffect(() => {
    const list = ref.current;
    const reveal = () =>
      list
        ?.querySelector('.document-tab-group[data-active="true"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    reveal();
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  }, [state.activeDocumentId]);
  const keyboard = (event: KeyboardEvent) => {
    if (
      !(event.target instanceof HTMLElement) ||
      event.target.getAttribute('role') !== 'tab'
    )
      return;
    const index = documents.findIndex(
      (document) => document.id === (event.target as HTMLElement).dataset.documentId,
    );
    if (
      event.altKey &&
      event.shiftKey &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      event.preventDefault();
      event.stopPropagation();
      const id = event.target.dataset.documentId;
      const focused = documents.findIndex((document) => document.id === id);
      if (id) move(id, focused + (event.key === 'ArrowLeft' ? -1 : 1));
      return;
    }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const target = event.target;
      const rect = target.getBoundingClientRect();
      setTabMenu({ id: target.dataset.documentId!, x: rect.left, y: rect.bottom });
      return;
    }
    let next = index;
    if (event.key === 'ArrowLeft')
      next = (index - 1 + documents.length) % documents.length;
    else if (event.key === 'ArrowRight') next = (index + 1) % documents.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = documents.length - 1;
    else if (event.key === 'Delete') {
      event.preventDefault();
      requestDocumentClose(documents[index]!.id);
      return;
    } else return;
    event.preventDefault();
    switchDocument(documents[next]!.id);
    ref.current
      ?.querySelector<HTMLButtonElement>(`[data-document-index="${next}"]`)
      ?.focus();
  };
  const browserLabel = {
    loading: copy.browserLoading,
    saving: copy.browserSaving,
    saved: copy.browserSaved,
    error: copy.browserError,
    conflict: copy.browserConflict,
  }[draftStatus];
  return (
    <div className="document-workspace-bar" data-testid="document-bar">
      <div className="document-tab-row" inert={draftStatus === 'loading'}>
        {mode === 'mining' ? (
          <Tooltip content={miningCopy.tabsHint}>
            <span className="hidden shrink-0 px-2 text-xs font-medium text-[var(--muted)] sm:inline">
              {miningCopy.modelTabs}
            </span>
          </Tooltip>
        ) : null}
        <Tooltip
          content={
            documents.length >= MAX_OPEN_DOCUMENTS ? copy.tabLimit : copy.newDocument
          }
        >
          <button
            type="button"
            className="focus-ring tb-btn tb-btn--idle"
            aria-label={copy.newDocument}
            disabled={documents.length >= MAX_OPEN_DOCUMENTS}
            onClick={createNewDocument}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip content={copy.open}>
          <button
            type="button"
            className="focus-ring tb-btn tb-btn--idle"
            aria-label={copy.open}
            onClick={onOpen}
          >
            <FolderOpen size={17} aria-hidden="true" />
          </button>
        </Tooltip>
        <div
          ref={ref}
          role="tablist"
          aria-label={copy.tabs}
          className="document-tab-list scrollbar-thin"
          onKeyDown={keyboard}
          aria-describedby={hintId}
          onPointerDown={reorder.onPointerDown}
          onClickCapture={reorder.onClickCapture}
        >
          {documents.map((document, index) => (
            <ProcessDocumentTab
              key={document.id}
              document={document}
              index={index}
              active={document.id === state.activeDocumentId}
              statusLabel={documentSaveLabel(document, copy)}
              copy={copy}
              onActivate={() => switchDocument(document.id)}
              onRename={() => setDialog({ kind: 'rename', id: document.id })}
              onClose={() => requestDocumentClose(document.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.currentTarget.focus();
                setTabMenu({ id: document.id, x: event.clientX, y: event.clientY });
              }}
            />
          ))}
        </div>
        <OpenProcessMenu
          label={copy.listTabs}
          documents={documents}
          activeId={state.activeDocumentId}
          onSelect={switchDocument}
        />
        <Tooltip content={copy.rename}>
          <button
            type="button"
            className="focus-ring tb-btn tb-btn--idle"
            aria-label={copy.rename}
            onClick={() => setDialog({ kind: 'rename', id: current.id })}
          >
            <PencilSimple size={15} aria-hidden="true" />
          </button>
        </Tooltip>
        <button
          type="button"
          className={cn(
            'focus-ring document-save',
            current.deviceStatus === 'saving' && 'opacity-60',
          )}
          aria-label={copy.save}
          disabled={current.deviceStatus === 'saving'}
          onClick={() => requestDocumentSave()}
        >
          <FloppyDisk size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{copy.save}</span>
        </button>
        <Tooltip content={copy.saveAs}>
          <button
            type="button"
            className="focus-ring tb-btn tb-btn--idle"
            aria-label={copy.saveAs}
            disabled={current.deviceStatus === 'saving'}
            onClick={() => requestDocumentSave(true)}
          >
            <DotsThree size={19} weight="bold" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <p id={hintId} className="sr-only">
        {copy.reorderHint}
      </p>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {tabMenu && menuDocument ? (
        <DocumentTabMenu
          document={menuDocument}
          index={documents.indexOf(menuDocument)}
          total={documents.length}
          point={tabMenu}
          copy={copy}
          onMove={(index) => move(menuDocument.id, index)}
          onRename={() => setDialog({ kind: 'rename', id: menuDocument.id })}
          onCloseTab={() => requestDocumentClose(menuDocument.id)}
          onDismiss={dismissMenu}
        />
      ) : null}
      <div className="document-state-row" role="status" aria-live="polite">
        <span
          className={
            draftStatus === 'error' || draftStatus === 'conflict'
              ? 'text-[var(--danger)]'
              : ''
          }
        >
          {browserLabel}
        </span>
        <span
          className={
            ['error', 'permission', 'conflict'].includes(current.deviceStatus)
              ? 'text-[var(--danger)]'
              : ''
          }
          title={current.deviceFileName ?? undefined}
        >
          {documentSaveLabel(current, copy)}
          {hasDeviceFile(current.id) && current.deviceFileName
            ? ` · ${copy.connected}: ${current.deviceFileName}`
            : ''}
          {['saved', 'opened'].includes(current.deviceStatus) &&
          !hasDeviceFile(current.id) &&
          supportsDeviceFiles()
            ? ` · ${copy.reconnect}`
            : ''}
        </span>
      </div>
    </div>
  );
}
