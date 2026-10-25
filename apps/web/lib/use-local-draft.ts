'use client';

import { useEffect, useRef, useState } from 'react';

import { importDrawioXml } from '@flowculus/drawio-adapter';
import { withAutoLayout } from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';

import {
  checkpointLocalDraft,
  loadLocalDraft,
  saveLocalDraft,
  type LocalDraftSnapshot,
} from '@/lib/local-draft';
import { useWorkspaceStore } from '@/lib/workspace-store';

const SAVE_DEBOUNCE_MS = 650;

/** Drafts from the iframe era stored geometry only inside the editor XML. */
const restoreLegacyGeometry = async (
  draft: LocalDraftSnapshot,
): Promise<ProcessModel> => {
  if (Object.values(draft.model.nodes).every((node) => node.bounds) || !draft.drawioXml) {
    return withAutoLayout(draft.model);
  }
  try {
    const { model: legacy } = await importDrawioXml(draft.drawioXml);
    return withAutoLayout({
      ...draft.model,
      nodes: Object.fromEntries(
        Object.entries(draft.model.nodes).map(([id, node]) => [
          id,
          node.bounds ? node : { ...node, bounds: legacy.nodes[id]?.bounds },
        ]),
      ),
    });
  } catch {
    return withAutoLayout(draft.model);
  }
};

/**
 * Restores one browser-local workspace and persists committed changes after a
 * short debounce. Drag frames never reach this hook: the model only changes
 * once per gesture.
 */
export function useLocalDraft() {
  const processModel = useWorkspaceStore((state) => state.processModel);
  const analysisOptions = useWorkspaceStore((state) => state.analysisOptions);
  const drawioSource = useWorkspaceStore((state) => state.drawioSource);
  const modelName = useWorkspaceStore((state) => state.modelName);
  const setDraftStatus = useWorkspaceStore((state) => state.setDraftStatus);
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const latestSnapshotRef = useRef<LocalDraftSnapshot | null>(null);
  const saveVersionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const initial = useWorkspaceStore.getState();
    const workspaceUnchanged = () => {
      const current = useWorkspaceStore.getState();
      return (
        current.processModel === initial.processModel &&
        current.analysisOptions === initial.analysisOptions &&
        current.drawioSource === initial.drawioSource
      );
    };
    setDraftStatus('loading');

    void loadLocalDraft()
      .then(async (draft) => {
        if (cancelled) return;
        if (draft && workspaceUnchanged()) {
          const model = await restoreLegacyGeometry(draft);
          if (cancelled) return;
          if (workspaceUnchanged())
            useWorkspaceStore.getState().loadModel(model, {
              drawioSource: draft.drawioSource ?? null,
              analysisOptions: draft.analysisOptions ?? {},
              modelName: draft.modelName,
            });
        }
        hydratedRef.current = true;
        setHydrated(true);
        setDraftStatus('saved');
      })
      .catch(() => {
        if (cancelled) return;
        hydratedRef.current = true;
        setHydrated(true);
        setDraftStatus('error');
      });

    return () => {
      cancelled = true;
      // Client navigation to documentation may precede the debounced save.
      // Keep the newest model available when the editor mounts again.
      if (hydratedRef.current && latestSnapshotRef.current) {
        try {
          checkpointLocalDraft(latestSnapshotRef.current);
        } catch {
          // Existing IndexedDB snapshots remain the fallback if storage is full.
        }
      }
    };
  }, [setDraftStatus]);

  useEffect(() => {
    const checkpoint = () => {
      if (!hydratedRef.current || !latestSnapshotRef.current) return;
      try {
        checkpointLocalDraft(latestSnapshotRef.current);
      } catch {
        // The async IndexedDB save remains the primary path when quota is tight.
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') checkpoint();
    };
    window.addEventListener('pagehide', checkpoint);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', checkpoint);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const updatedAt = Math.max(
      Date.now(),
      (latestSnapshotRef.current?.updatedAt ?? 0) + 1,
    );
    latestSnapshotRef.current = {
      model: processModel,
      drawioSource,
      modelName,
      analysisOptions,
      updatedAt,
    };
    const version = ++saveVersionRef.current;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    setDraftStatus('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      const snapshot = latestSnapshotRef.current;
      if (!snapshot) return;
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => saveLocalDraft(snapshot));
      void saveQueueRef.current
        .then(() => {
          if (version === saveVersionRef.current) setDraftStatus('saved');
        })
        .catch(() => {
          if (version === saveVersionRef.current) setDraftStatus('error');
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [analysisOptions, drawioSource, hydrated, modelName, processModel, setDraftStatus]);
}
