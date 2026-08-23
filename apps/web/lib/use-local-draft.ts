'use client';

import { useEffect, useRef } from 'react';

import { loadLocalDraft, saveLocalDraft } from '@/lib/local-draft';
import { useWorkspaceStore } from '@/lib/workspace-store';
import type { DrawioCanvasHandle } from '@/components/DrawioCanvas';

const SAVE_DEBOUNCE_MS = 650;

/**
 * Restores one browser-local workspace and persists changes without putting
 * serialization or storage work on draw.io's pointer/drag path.
 */
export function useLocalDraft(canvasRef: React.RefObject<DrawioCanvasHandle | null>) {
  const processModel = useWorkspaceStore((state) => state.processModel);
  const analysisOptions = useWorkspaceStore((state) => state.analysisOptions);
  const currentXml = useWorkspaceStore((state) => state.currentXml);
  const modelName = useWorkspaceStore((state) => state.modelName);
  const setProcessModel = useWorkspaceStore((state) => state.setProcessModel);
  const setCurrentXml = useWorkspaceStore((state) => state.setCurrentXml);
  const setModelName = useWorkspaceStore((state) => state.setModelName);
  const setAnalysisOptions = useWorkspaceStore((state) => state.setAnalysisOptions);
  const setDraftStatus = useWorkspaceStore((state) => state.setDraftStatus);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDraftStatus('loading');

    void loadLocalDraft()
      .then((draft) => {
        if (cancelled) return;
        if (draft) {
          setProcessModel(draft.model);
          if (draft.analysisOptions) setAnalysisOptions(draft.analysisOptions);
          setCurrentXml(draft.drawioXml);
          setModelName(draft.modelName);
          canvasRef.current?.load(draft.drawioXml);
        }
        hydratedRef.current = true;
        setDraftStatus(draft ? 'saved' : 'saved');
      })
      .catch(() => {
        if (cancelled) return;
        hydratedRef.current = true;
        setDraftStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // A workspace owns one draft restore operation for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !currentXml) return;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    setDraftStatus('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveLocalDraft({
        model: processModel,
        drawioXml: currentXml,
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
  }, [analysisOptions, currentXml, modelName, processModel, setDraftStatus]);
}
