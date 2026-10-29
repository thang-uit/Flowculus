'use client';

import { useEffect } from 'react';
import { useMiningStore } from './mining-store';
import {
  acquireMiningStorage,
  checkpointMiningDraft,
  loadMiningDraft,
  saveMiningDraft,
} from './mining-draft-storage';
import { createMiningDraft, type MiningDraft } from './mining-draft-schema';

let saves: Promise<void> = Promise.resolve();

/** Only these fields belong to the user-editable Mining draft. */
export function hasMiningDraftChanged(
  state: ReturnType<typeof useMiningStore.getState>,
  previous: ReturnType<typeof useMiningStore.getState>,
): boolean {
  return (
    state.tabs !== previous.tabs ||
    state.activeTabId !== previous.activeTabId ||
    state.replay !== previous.replay ||
    state.pendingUpload !== previous.pendingUpload ||
    state.filter !== previous.filter ||
    state.timePolicy !== previous.timePolicy ||
    state.reference !== previous.reference ||
    state.edgeMetric !== previous.edgeMetric ||
    state.mapMode !== previous.mapMode ||
    state.insight !== previous.insight ||
    state.selectedVariantId !== previous.selectedVariantId
  );
}

/** Mining and BPMN use separate databases, writer locks and hydration lifecycles. */
export function useMiningDraft() {
  const attempt = useMiningStore((state) => state.storageAttempt);
  useEffect(() => {
    let disposed = false;
    let hydrated = false;
    let writable = false;
    let release: () => void = () => undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let revision = 0;
    let updatedAt = Date.now();
    let changedDuringHydration = false;
    const initial = useMiningStore.getState();
    const snapshot = () =>
      createMiningDraft(
        useMiningStore.getState(),
        (updatedAt = Math.max(Date.now(), updatedAt + 1)),
      );
    const enqueue = (draft: MiningDraft, ticket: number) => {
      saves = saves.catch(() => undefined).then(() => saveMiningDraft(draft));
      void saves.then(
        () => {
          if (!disposed && ticket === revision)
            useMiningStore.getState().setStorageStatus('saved');
        },
        () => {
          if (!disposed && ticket === revision)
            useMiningStore.getState().setStorageStatus('error');
        },
      );
    };
    const schedule = () => {
      if (!hydrated || !writable) return;
      const ticket = ++revision;
      clearTimeout(timer);
      useMiningStore.getState().setStorageStatus('saving');
      timer = setTimeout(() => enqueue(snapshot(), ticket), 650);
    };
    initial.setStorageStatus('loading');
    void acquireMiningStorage()
      .then(async (ownership) => {
        if (disposed) {
          ownership.release();
          return null;
        }
        writable = ownership.writable;
        release = ownership.release;
        return loadMiningDraft();
      })
      .then((draft) => {
        if (disposed) return;
        const current = useMiningStore.getState();
        // An import made during slow storage reads always wins over hydration.
        if (
          !changedDuringHydration &&
          draft &&
          current.tabs === initial.tabs &&
          current.replay === initial.replay &&
          current.pendingUpload === initial.pendingUpload
        )
          current.restoreTabs(draft.tabs, draft.activeTabId);
        if (draft) updatedAt = Math.max(updatedAt, draft.updatedAt);
        hydrated = true;
        useMiningStore.getState().setStorageHydrated(true);
        useMiningStore.getState().setStorageStatus(writable ? 'saved' : 'conflict');
        if (writable) schedule();
      })
      .catch(() => {
        if (!disposed) useMiningStore.getState().setStorageStatus('error');
      });
    const unsubscribe = useMiningStore.subscribe((state, previous) => {
      if (hasMiningDraftChanged(state, previous)) {
        if (!hydrated) changedDuringHydration = true;
        schedule();
      }
    });
    const checkpoint = () => {
      if (!hydrated || !writable) return;
      clearTimeout(timer);
      const draft = snapshot();
      try {
        checkpointMiningDraft(draft);
      } catch {
        useMiningStore.getState().setStorageStatus('error');
      }
      enqueue(draft, ++revision);
    };
    window.addEventListener('pagehide', checkpoint);
    return () => {
      checkpoint();
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('pagehide', checkpoint);
      void saves.then(release, release);
    };
  }, [attempt]);
}
