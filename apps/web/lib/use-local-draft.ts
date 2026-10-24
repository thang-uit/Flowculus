'use client';

import { useEffect, useRef } from 'react';

import { importDrawioXml } from '@flowculus/drawio-adapter';
import { withAutoLayout } from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';

import {
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
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDraftStatus('loading');

    void loadLocalDraft()
      .then(async (draft) => {
        if (cancelled) return;
        if (draft) {
          const model = await restoreLegacyGeometry(draft);
          if (cancelled) return;
          useWorkspaceStore.getState().loadModel(model, {
            drawioSource: draft.drawioSource ?? null,
            analysisOptions: draft.analysisOptions ?? {},
            modelName: draft.modelName,
          });
        }
        hydratedRef.current = true;
        setDraftStatus('saved');
      })
      .catch(() => {
        if (cancelled) return;
        hydratedRef.current = true;
        setDraftStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [setDraftStatus]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    setDraftStatus('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveLocalDraft({
        model: processModel,
        drawioSource,
        modelName,
        analysisOptions,
        updatedAt: Date.now(),
      })
        .then(() => setDraftStatus('saved'))
        .catch(() => setDraftStatus('error'));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [analysisOptions, drawioSource, modelName, processModel, setDraftStatus]);
}
