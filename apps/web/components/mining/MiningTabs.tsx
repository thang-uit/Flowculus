'use client';

import { FileCsv, FolderOpen, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTabReorder } from '@/lib/documents/use-tab-reorder';
import { AppButton } from '@/components/ui/AppButton';
import { AppDialog } from '@/components/ui/AppDialog';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getMiningTabsCopy } from '@/lib/i18n/mining-tabs-copy';
import { miningTabs, useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function MiningTabs({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const workspaceCopy = getWorkspaceCopy(locale);
  const copy = getMiningTabsCopy(locale);
  const state = useMiningStore();
  const listRef = useRef<HTMLDivElement>(null);
  const tabs = miningTabs(state);
  const move = (id: string, index: number) =>
    useMiningStore.getState().reorderTab(id, index);
  const reorder = useTabReorder(
    listRef,
    tabs.map((tab) => tab.id),
    move,
  );
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [state.activeTabId]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !(event.target instanceof HTMLElement) ||
      event.target.getAttribute('role') !== 'tab'
    )
      return;
    const targetId = event.target.getAttribute('data-document-id');
    const index = tabs.findIndex((tab) => tab.id === targetId);
    if (index < 0) return;
    if (event.key === 'Delete') {
      event.preventDefault();
      setClosingId(tabs[index].id);
      return;
    }
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowLeft'
            ? (index - 1 + tabs.length) % tabs.length
            : event.key === 'ArrowRight'
              ? (index + 1) % tabs.length
              : null;
    if (next == null) return;
    event.preventDefault();
    if (event.altKey && event.shiftKey) move(tabs[index].id, next);
    else state.switchTab(tabs[next].id);
    listRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-document-id="${event.altKey && event.shiftKey ? tabs[index].id : tabs[next].id}"]`,
      )
      ?.focus();
  };
  const [closingId, setClosingId] = useState<string | null>(null);
  const closing = tabs.find((tab) => tab.id === closingId);
  const label = (tab: (typeof tabs)[number]) =>
    tab.replay?.kind === 'file'
      ? tab.replay.fileName
      : tab.replay?.kind === 'preset'
        ? workspaceCopy.miningPresets[tab.replay.presetId].name
        : copy.empty;

  return (
    <div className="document-workspace-bar" data-testid="mining-tab-bar">
      <div
        className="document-tab-row"
        inert={!state.storageHydrated || state.storageStatus === 'conflict'}
      >
        <button
          type="button"
          className="focus-ring tb-btn tb-btn--idle"
          aria-label={copy.open}
          title={copy.open}
          onClick={onOpen}
        >
          <FolderOpen size={17} aria-hidden="true" />
        </button>
        <div
          role="tablist"
          ref={listRef}
          onKeyDown={keyboard}
          onPointerDown={reorder.onPointerDown}
          onClickCapture={reorder.onClickCapture}
          aria-label={copy.tabs}
          className="document-tab-list scrollbar-thin"
        >
          {tabs.length ? (
            tabs.map((tab) => {
              const active = tab.id === state.activeTabId;
              const name = label(tab);
              return (
                <div
                  key={tab.id}
                  className="document-tab-group"
                  data-active={active}
                  data-tab-id={tab.id}
                >
                  <button
                    type="button"
                    role="tab"
                    tabIndex={active ? 0 : -1}
                    data-document-id={tab.id}
                    id={`mining-log-tab-${tab.id}`}
                    aria-controls={active ? `mining-panel-${tab.id}` : undefined}
                    aria-selected={active}
                    aria-label={name}
                    title={name}
                    className="focus-ring document-tab"
                    onClick={() => state.switchTab(tab.id)}
                  >
                    <FileCsv
                      size={15}
                      weight={active ? 'bold' : 'regular'}
                      className="document-tab-icon"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate">{name}</span>
                    {tab.status === 'loading' ? (
                      <span aria-label={copy.restoring}>…</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="focus-ring document-close"
                    aria-label={copy.close(name)}
                    title={copy.close(name)}
                    onClick={() => setClosingId(tab.id)}
                  >
                    <X size={14} weight="bold" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          ) : (
            <span className="px-3 py-2 text-xs text-[var(--muted)]">{copy.empty}</span>
          )}
        </div>
        <span
          className="hidden min-w-0 flex-1 truncate px-2 text-[11px] text-[var(--muted)] lg:inline"
          title={copy.hint}
        >
          {copy.hint}
        </span>
      </div>
      <div className="document-state-row">
        <span>
          {state.storageStatus === 'loading'
            ? copy.restoring
            : state.storageStatus === 'error'
              ? copy.storageError
              : state.storageStatus === 'conflict'
                ? copy.conflict
                : state.storageStatus === 'saving'
                  ? copy.saving
                  : copy.saved}
        </span>
        {state.storageStatus === 'error' && !state.storageHydrated ? (
          <button
            type="button"
            className="focus-ring rounded px-2 underline underline-offset-4"
            onClick={state.retryStorage}
          >
            {copy.retryStorage}
          </button>
        ) : null}
        <span>
          {state.status === 'loading'
            ? copy.restoring
            : state.status === 'error'
              ? state.error
              : ''}
        </span>
      </div>
      {closing ? (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) setClosingId(null);
          }}
          title={copy.closeTitle}
          description={copy.closeHint(label(closing))}
          closeLabel={copy.cancel}
        >
          <div className="mt-5 flex justify-end gap-2">
            <AppButton type="button" onClick={() => setClosingId(null)}>
              {copy.cancel}
            </AppButton>
            <AppButton
              type="button"
              variant="danger"
              onClick={() => {
                state.closeTab(closing.id);
                setClosingId(null);
              }}
            >
              {copy.confirmClose}
            </AppButton>
          </div>
        </AppDialog>
      ) : null}
    </div>
  );
}
