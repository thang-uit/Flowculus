'use client';

import { usePreferencesStore } from '@/lib/use-preferences-store';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAnalysisSnapshot, serializeFlowculusFile } from '@flowculus/file-formats';
import { checkSemanticGate } from '@flowculus/validation';

import { downloadTextFile } from '@/lib/browser-file-actions';
import { requiresAnalysisReport } from '@/lib/export-readiness';
import { exportFileName } from '@/lib/file-name';
import { getWorkspaceCopy } from '@/lib/i18n';
import { exportWorkspace, type WorkspaceExportFormat } from '@/lib/workspace-exports';
import { useWorkspaceStore, type SemanticGateReason } from '@/lib/workspace-store';

const STATUS_TIMEOUT_MS = 2600;

/**
 * The single entry point for export and share. Both pass the semantic gate:
 * when inferred semantics are still unconfirmed, nothing leaves the browser
 * and the gate dialog explains what to review.
 */
export function useWorkspaceActions() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatusMessage(null), STATUS_TIMEOUT_MS);
  }, []);

  const passGate = useCallback(
    (reason: SemanticGateReason) => {
      const state = useWorkspaceStore.getState();
      const gate = checkSemanticGate(state.processModel);
      if (gate.ok) return gate.model;
      state.setSemanticGateReason(reason);
      showStatus(copy.semantics.blockedStatus(gate.items.length));
      return null;
    },
    [copy.semantics, showStatus],
  );

  const runExport = useCallback(
    (format: WorkspaceExportFormat) => {
      const status = useWorkspaceStore.getState().analysisRuntimeStatus;
      const analysisReady = status === 'ready' || status === 'fallback';
      if (requiresAnalysisReport(format) && !analysisReady) {
        showStatus(copy.analysisExportWait);
        return;
      }
      const model = passGate('export');
      if (!model) return;
      // Open the print window inside the click so pop-up blockers allow it.
      const reportWindow = format === 'pdf' ? window.open('', '_blank') : null;
      const state = useWorkspaceStore.getState();
      void exportWorkspace(format, {
        model,
        report: state.analysisReport,
        analysisReady,
        analysisOptions: state.analysisOptions,
        drawioSource: state.drawioSource,
        copy,
        locale,
        reportWindow,
      })
        .then(() => showStatus(copy.localCopyExported))
        .catch((error: unknown) => {
          reportWindow?.close();
          console.error('Flowculus export failed', error);
          showStatus(copy.exportError);
        });
    },
    [copy, locale, passGate, showStatus],
  );

  const share = useCallback(async () => {
    const model = passGate('share');
    if (!model) return;
    try {
      const state = useWorkspaceStore.getState();
      const filename = exportFileName(model.name, 'model', 'flowculus.json');
      const source = serializeFlowculusFile({
        schemaVersion: 1,
        model,
        drawioXml: state.drawioSource?.xml,
        analysisOptions: state.analysisOptions,
        ...(state.analysisRuntimeStatus === 'ready' ||
        state.analysisRuntimeStatus === 'fallback'
          ? { analysis: createAnalysisSnapshot(state.analysisReport) }
          : {}),
      });
      const file = new File([source], filename, { type: 'application/json' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: model.name, text: copy.shareText, files: [file] });
        showStatus(copy.shareSheetOpened);
      } else {
        downloadTextFile(filename, source, 'application/json');
        showStatus(copy.localCopyExported);
      }
    } catch (error) {
      showStatus(
        error instanceof DOMException && error.name === 'AbortError'
          ? copy.shareCancelled
          : copy.fileError,
      );
    }
  }, [copy, passGate, showStatus]);

  return { runExport, share, statusMessage, showStatus };
}
