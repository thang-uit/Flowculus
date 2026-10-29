'use client';

import { usePreferencesStore } from '@/lib/use-preferences-store';

import { useCallback, useState } from 'react';
import { createAnalysisSnapshot, serializeFlowculusFile } from '@flowculus/file-formats';
import { checkSemanticGate } from '@flowculus/validation';

import { downloadTextFile } from '@/lib/browser-file-actions';
import { commitPendingInput } from '@/lib/documents/pending-input';
import { ReportImageTooLargeError } from '@/lib/report-image-layout';
import { requiresAnalysisReport } from '@/lib/export-readiness';
import { exportFileName } from '@/lib/file-name';
import { getWorkspaceCopy } from '@/lib/i18n';
import { exportWorkspace, type WorkspaceExportFormat } from '@/lib/workspace-exports';
import { useWorkspaceStore, type SemanticGateReason } from '@/lib/workspace-store';

import { showNotice, type NoticeTone } from '@/lib/ui/notice-store';

/**
 * The single entry point for export and share. Both pass the semantic gate:
 * when inferred semantics are still unconfirmed, nothing leaves the browser
 * and the gate dialog explains what to review.
 */
export function useWorkspaceActions() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const [pendingExport, setPendingExport] = useState<{
    format: WorkspaceExportFormat;
    documentId: string;
    name: string;
  } | null>(null);
  const showStatus = useCallback(
    (message: string, tone: NoticeTone = 'info') => {
      if (usePreferencesStore.getState().locale === locale) showNotice(message, tone);
    },
    [locale],
  );

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

  const performExport = useCallback(
    (format: WorkspaceExportFormat, name?: string) => {
      const status = useWorkspaceStore.getState().analysisRuntimeStatus;
      const analysisReady = status === 'ready' || status === 'fallback';
      if (requiresAnalysisReport(format) && !analysisReady) {
        showStatus(copy.analysisExportWait);
        return;
      }
      if (name) {
        const state = useWorkspaceStore.getState();
        state.renameDocument(state.activeDocumentId, name);
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
        .then(() => showStatus(copy.localCopyExported, 'success'))
        .catch((error: unknown) => {
          reportWindow?.close();
          if (!(error instanceof ReportImageTooLargeError))
            console.error('Flowculus export failed', error);
          showStatus(
            error instanceof ReportImageTooLargeError
              ? copy.reportImageTooLarge
              : copy.exportError,
            'error',
          );
        });
    },
    [copy, locale, passGate, showStatus],
  );

  const share = useCallback(async () => {
    if (!commitPendingInput()) return;
    const model = passGate('share');
    if (!model) return;
    try {
      const state = useWorkspaceStore.getState();
      const filename = exportFileName(model.name, 'model', 'flowculus.json');
      const source = serializeFlowculusFile({
        schemaVersion: 1,
        model,
        drawioXml: state.drawioSource?.xml,
        drawioPageIndex: state.drawioSource?.pageIndex,
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
        showStatus(copy.localCopyExported, 'success');
      }
    } catch (error) {
      showStatus(
        error instanceof DOMException && error.name === 'AbortError'
          ? copy.shareCancelled
          : copy.fileError,
      );
    }
  }, [copy, passGate, showStatus]);

  const runExport = (format: WorkspaceExportFormat) => {
    if (!commitPendingInput()) return;
    const state = useWorkspaceStore.getState();
    setPendingExport({
      format,
      documentId: state.activeDocumentId,
      name: state.processModel.name,
    });
  };
  const confirmExport = (name: string) => {
    if (!pendingExport) return;
    const request = pendingExport;
    setPendingExport(null);
    if (useWorkspaceStore.getState().activeDocumentId !== request.documentId) return;
    performExport(request.format, name);
  };
  return {
    runExport,
    share,
    showStatus,
    pendingExport,
    confirmExport,
    cancelExport: () => setPendingExport(null),
  };
}
