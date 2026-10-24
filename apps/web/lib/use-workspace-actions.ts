'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkSemanticGate } from '@flowculus/validation';

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
  const locale = useWorkspaceStore((state) => state.locale);
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
      const model = passGate('export');
      if (!model) return;
      // Open the print window inside the click so pop-up blockers allow it.
      const reportWindow = format === 'pdf' ? window.open('', '_blank') : null;
      const state = useWorkspaceStore.getState();
      void exportWorkspace(format, {
        model,
        report: state.analysisReport,
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
          showStatus(copy.fileError);
        });
    },
    [copy, locale, passGate, showStatus],
  );

  const share = useCallback(async () => {
    const model = passGate('share');
    if (!model) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: model.name, text: copy.shareText });
        showStatus(copy.shareSheetOpened);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showStatus(copy.workspaceLinkCopied);
      }
    } catch {
      showStatus(copy.shareCancelled);
    }
  }, [copy, passGate, showStatus]);

  return { runExport, share, statusMessage, showStatus };
}
